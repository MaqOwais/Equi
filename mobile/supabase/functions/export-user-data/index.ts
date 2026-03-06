/**
 * Supabase Edge Function: export-user-data
 *
 * GDPR / CCPA personal data export. Collects all data for the authenticated
 * user, serialises to JSON + CSV, packages as a ZIP, uploads to Supabase
 * Storage, and returns a 24-hour signed download URL.
 *
 * The signed URL is also stored in profiles.last_data_export_at so the user
 * can see when they last exported.
 *
 * Deploy:
 *   supabase functions deploy export-user-data
 *
 * Trigger: POST (no body required) with Authorization header.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')),
  ];
  return lines.join('\n');
}

// ── ZIP builder (pure Deno — no external dep needed for simple archives) ──────
// We bundle files as a multi-part JSON envelope to avoid needing jszip.
// The mobile app presents this as "Download your data" — the user gets a
// structured JSON file containing every sub-export keyed by filename.

interface DataPackage {
  exported_at: string;
  user_email: string;
  files: Record<string, string>; // filename → content (CSV or JSON string)
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !user) return new Response('Unauthorized', { status: 401 });

    const uid = user.id;

    // ── Fetch all user data in parallel ──────────────────────────────────────
    const [
      profileRes, moodRes, cycleRes, journalRes, medRes,
      sleepRes, rhythmRes, nutritionRes, actRes, reportsRes, sigRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('mood_logs').select('*').eq('user_id', uid).order('logged_at'),
      supabase.from('cycle_logs').select('*').eq('user_id', uid).order('logged_at'),
      supabase.from('journal_entries').select('*').eq('user_id', uid).order('entry_date'),
      supabase.from('medication_logs').select('*').eq('user_id', uid).order('log_date'),
      supabase.from('sleep_logs').select('*').eq('user_id', uid).order('date'),
      supabase.from('social_rhythm_logs').select('*').eq('user_id', uid).order('date'),
      supabase.from('nutrition_logs').select('*').eq('user_id', uid).order('log_date'),
      supabase.from('activity_completions')
        .select('*, activity:activities(title, category)')
        .eq('user_id', uid)
        .order('created_at'),
      supabase.from('ai_reports').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('relapse_signatures').select('*').eq('user_id', uid),
    ]);

    const README = `Equi — Personal Data Export
===========================
Exported: ${new Date().toISOString()}
User: ${user.email}

Files in this export:
  profile.json              — Account and preferences
  mood_logs.csv             — Daily mood scores (1–10)
  cycle_logs.csv            — Cycle state logs (stable/manic/depressive/mixed)
  journal_entries.csv       — Journal entries (full text, unredacted)
  medication_logs.csv       — Medication adherence logs
  sleep_logs.csv            — Sleep duration and quality logs
  social_rhythm_logs.csv    — IPSRT social rhythm scores
  nutrition_logs.csv        — Nutrition quality logs
  activity_completions.csv  — Completed activities
  ai_reports.json           — All AI-generated wellness reports
  relapse_signatures.json   — Personal early warning signatures

Data provenance:
  All data was entered by you or inferred from connected wearables.
  AI reports were generated using Groq (zero retention — data not stored by AI provider).
  Raw journal text was never sent to the AI.

Equi does not share your data with third parties without your explicit consent.
To request deletion: Settings → Privacy & data → Delete my account.
`;

    // Flatten activity completions for CSV
    const actRows = (actRes.data ?? []).map((r) => ({
      id: r.id,
      completed_at: r.completed_at,
      cycle_state: r.cycle_state,
      notes: r.notes,
      bookmarked: r.bookmarked,
      activity_title: (r.activity as { title?: string } | null)?.title ?? '',
      activity_category: (r.activity as { category?: string } | null)?.category ?? '',
    }));

    const pkg: DataPackage = {
      exported_at: new Date().toISOString(),
      user_email: user.email ?? '',
      files: {
        'README.txt': README,
        'profile.json': JSON.stringify(profileRes.data ?? {}, null, 2),
        'mood_logs.csv': rowsToCsv((moodRes.data ?? []) as Record<string, unknown>[]),
        'cycle_logs.csv': rowsToCsv((cycleRes.data ?? []) as Record<string, unknown>[]),
        'journal_entries.csv': rowsToCsv((journalRes.data ?? []) as Record<string, unknown>[]),
        'medication_logs.csv': rowsToCsv((medRes.data ?? []) as Record<string, unknown>[]),
        'sleep_logs.csv': rowsToCsv((sleepRes.data ?? []) as Record<string, unknown>[]),
        'social_rhythm_logs.csv': rowsToCsv((rhythmRes.data ?? []) as Record<string, unknown>[]),
        'nutrition_logs.csv': rowsToCsv((nutritionRes.data ?? []) as Record<string, unknown>[]),
        'activity_completions.csv': rowsToCsv(actRows as Record<string, unknown>[]),
        'ai_reports.json': JSON.stringify(reportsRes.data ?? [], null, 2),
        'relapse_signatures.json': JSON.stringify(sigRes.data ?? [], null, 2),
      },
    };

    const pkgBytes = new TextEncoder().encode(JSON.stringify(pkg, null, 2));

    // Upload to Storage: exports/{user_id}/export-{date}.json
    const dateStr = new Date().toISOString().split('T')[0];
    const storagePath = `${uid}/export-${dateStr}.json`;

    const { error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(storagePath, pkgBytes, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    // 24h signed URL
    const { data: signedData, error: signErr } = await supabase.storage
      .from('reports')
      .createSignedUrl(storagePath, 86400);

    if (signErr || !signedData) throw new Error('Failed to create signed URL');

    // Stamp export timestamp on profile
    await supabase
      .from('profiles')
      .update({ last_data_export_at: new Date().toISOString() })
      .eq('id', uid);

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, expires_at: new Date(Date.now() + 86400_000).toISOString() }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
