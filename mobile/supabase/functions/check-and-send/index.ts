/**
 * Supabase Edge Function: check-and-send
 *
 * Called by pg_cron nightly. Sends push notifications to users who have not
 * yet logged for the day, respecting each user's notification_preferences.
 *
 * Deploy:
 *   supabase functions deploy check-and-send
 *
 * pg_cron setup (run once in Supabase SQL editor):
 *   select cron.schedule(
 *     'checkin-notif-20h',
 *     '0 20 * * *',
 *     $$select net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/check-and-send',
 *       headers := '{"Authorization": "Bearer <service_role_key>", "Content-Type": "application/json"}',
 *       body := '{"type": "checkin"}'
 *     )$$
 *   );
 *   -- Repeat for "medication" at '0 8 * * *'
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  type: 'checkin' | 'medication' | 'weekly_report';
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { type } = (await req.json()) as PushPayload;
  const today = new Date().toISOString().split('T')[0];

  // Fetch all users with push tokens and the relevant preference enabled
  const prefCol = type === 'checkin' ? 'checkin_enabled'
    : type === 'medication' ? 'medication_enabled'
    : 'weekly_report_enabled';

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, push_token')
    .eq(prefCol, true)
    .not('push_token', 'is', null);

  if (!prefs?.length) return new Response('ok', { status: 200 });

  // Filter out users who've already logged
  const userIds = prefs.map((p) => p.user_id);
  let alreadyLogged: string[] = [];

  if (type === 'checkin') {
    const { data } = await supabase
      .from('mood_logs')
      .select('user_id')
      .in('user_id', userIds)
      .eq('logged_at', today);
    alreadyLogged = (data ?? []).map((r) => r.user_id);
  } else if (type === 'medication') {
    const { data } = await supabase
      .from('medication_logs')
      .select('user_id')
      .in('user_id', userIds)
      .eq('log_date', today);
    alreadyLogged = (data ?? []).map((r) => r.user_id);
  }

  const toNotify = prefs.filter((p) => !alreadyLogged.includes(p.user_id));
  if (!toNotify.length) return new Response('ok — all already logged', { status: 200 });

  const MESSAGES: Record<string, { title: string; body: string }> = {
    checkin: {
      title: 'How are you feeling today?',
      body: 'Tap to log your mood — it takes 5 seconds.',
    },
    medication: {
      title: 'Medication reminder',
      body: 'Time to log your medication for today.',
    },
    weekly_report: {
      title: 'Your weekly report is ready',
      body: 'Tap to see your mood and cycle insights for the past week.',
    },
  };

  const msg = MESSAGES[type];
  const notifications = toNotify.map((p) => ({
    to: p.push_token,
    title: msg.title,
    body: msg.body,
    sound: null,
    data: { route: type === 'weekly_report' ? '/(tabs)/you/ai-report' : '/(tabs)' },
  }));

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(notifications),
  });

  return new Response(`Sent to ${toNotify.length} users`, { status: 200 });
});
