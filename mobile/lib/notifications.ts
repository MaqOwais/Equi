/**
 * notifications.ts — All local notification scheduling for Equi.
 *
 * Expo Go (SDK 53+): push notifications removed from Expo Go. All functions
 * are silent no-ops when IS_EXPO_GO is true, so the app never crashes.
 * Full functionality requires a dev build or production build.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { NotificationPreferences, Medication } from '../types/database';

// 'storeClient' = running inside the Expo Go app
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Lazy-require so Expo Go never initialises the native module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function N(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

// ─── Android channels ─────────────────────────────────────────────────────────
// Must be created before any notification is scheduled.
// Called at the start of every schedule function.

let _channelsReady = false;

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android' || _channelsReady) return;
  await N().setNotificationChannelAsync('equi-default', {
    name: 'Equi reminders',
    importance: N().AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A8C5A0',
    sound: null,
  });
  await N().setNotificationChannelAsync('equi-alarm', {
    name: 'Equi alarms (ring)',
    importance: N().AndroidImportance.HIGH,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: '#A8C5A0',
    sound: 'default',
  });
  _channelsReady = true;
}

// ─── Permission & push token ──────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (IS_EXPO_GO || !Device.isDevice) return null;

  const { status: existing } = await N().getPermissionsAsync();
  const { status } = existing !== 'granted'
    ? await N().requestPermissionsAsync()
    : { status: existing };

  if (status !== 'granted') return null;

  await ensureChannels();

  // projectId is required in SDK 50+ for Expo push tokens
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[Notifications] Missing EAS projectId — push token skipped');
    return null;
  }

  const token = (await N().getExpoPushTokenAsync({ projectId })).data as string;
  return token;
}

// ─── Content builder ──────────────────────────────────────────────────────────

function buildContent(title: string, body: string, route: string, ring: boolean) {
  return {
    title,
    body,
    data: { route },
    sound: ring,
    ...(Platform.OS === 'android'
      ? { channelId: ring ? 'equi-alarm' : 'equi-default' }
      : {}),
  };
}

// ─── Time parser ──────────────────────────────────────────────────────────────

function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: isNaN(h) ? 8 : h, minute: isNaN(m) ? 0 : m };
}

// ─── Mood check-in ────────────────────────────────────────────────────────────

export async function scheduleDailyCheckin(time: string, ring = false): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await N().cancelScheduledNotificationAsync('mood-checkin').catch(() => {});
  const { hour, minute } = parseTime(time);
  await N().scheduleNotificationAsync({
    identifier: 'mood-checkin',
    content: buildContent(
      'How are you feeling today?',
      'Tap to log your mood — it takes 5 seconds.',
      '/(tabs)',
      ring,
    ),
    trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelDailyCheckin(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('mood-checkin').catch(() => {});
}

// ─── Journal reminder ─────────────────────────────────────────────────────────

export async function scheduleJournalReminder(time: string, ring = false): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await N().cancelScheduledNotificationAsync('journal-reminder').catch(() => {});
  const { hour, minute } = parseTime(time);
  await N().scheduleNotificationAsync({
    identifier: 'journal-reminder',
    content: buildContent(
      'Time to journal',
      'Take a few minutes to reflect on your day.',
      '/(tabs)/journal',
      ring,
    ),
    trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelJournalReminder(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('journal-reminder').catch(() => {});
}

// ─── Sleep log reminder ───────────────────────────────────────────────────────

export async function scheduleSleepLogReminder(time: string, ring = false): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await N().cancelScheduledNotificationAsync('sleep-log').catch(() => {});
  const { hour, minute } = parseTime(time);
  await N().scheduleNotificationAsync({
    identifier: 'sleep-log',
    content: buildContent(
      'Good morning',
      "How did you sleep? Log last night's rest.",
      '/(tabs)',
      ring,
    ),
    trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelSleepLogReminder(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('sleep-log').catch(() => {});
}

// ─── Activity reminder ────────────────────────────────────────────────────────

export async function scheduleActivityReminder(time: string, ring = false): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await N().cancelScheduledNotificationAsync('activity-reminder').catch(() => {});
  const { hour, minute } = parseTime(time);
  await N().scheduleNotificationAsync({
    identifier: 'activity-reminder',
    content: buildContent(
      'Activity time',
      "Try a wellbeing activity matched to how you're feeling today.",
      '/(tabs)/activities',
      ring,
    ),
    trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelActivityReminder(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('activity-reminder').catch(() => {});
}

// ─── Weekly report ────────────────────────────────────────────────────────────

/** Fires every Sunday at 10:00 AM. */
export async function scheduleWeeklyReport(): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await N().cancelScheduledNotificationAsync('weekly-report').catch(() => {});
  await N().scheduleNotificationAsync({
    identifier: 'weekly-report',
    content: buildContent(
      'Your weekly report is ready',
      'See how your mood, sleep, and routine shaped your week.',
      '/(tabs)/you/ai-report',
      false,
    ),
    // WEEKLY trigger: Sunday (weekday 1 in expo-notifications) at 10:00
    trigger: { type: N().SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 10, minute: 0 },
  });
}

export async function cancelWeeklyReport(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('weekly-report').catch(() => {});
}

// ─── Anchor nudges ────────────────────────────────────────────────────────────

const ANCHOR_LABELS: Record<string, string> = {
  wake:          'Wake up',
  breakfast:     'Breakfast',
  lunch:         'Lunch',
  dinner:        'Dinner',
  bedtime:       'Bedtime',
  medication:    'Medication',
  first_meal:    'First meal',
  first_contact: 'First contact',
  work_start:    'Work start',
};

export async function scheduleAnchorNudges(
  anchors: { anchor_name: string; target_time: string }[],
  ring = false,
): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await cancelAnchorNudges();

  for (const anchor of anchors) {
    if (!anchor.target_time) continue;
    const { hour, minute } = parseTime(anchor.target_time);

    // Fire 15 minutes before target
    let nudgeMinute = minute - 15;
    let nudgeHour = hour;
    if (nudgeMinute < 0) { nudgeMinute += 60; nudgeHour = (nudgeHour - 1 + 24) % 24; }

    const label = ANCHOR_LABELS[anchor.anchor_name] ?? anchor.anchor_name;
    await N().scheduleNotificationAsync({
      identifier: `anchor-${anchor.anchor_name}`,
      content: buildContent(
        `${label} in 15 minutes`,
        'Tap to log when you actually do it.',
        '/(tabs)/you/routine',
        ring,
      ),
      trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour: nudgeHour, minute: nudgeMinute },
    });
  }
}

export async function cancelAnchorNudges(): Promise<void> {
  if (IS_EXPO_GO) return;
  const scheduled = await N().getAllScheduledNotificationsAsync() as { identifier: string }[];
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('anchor-'))
      .map((n) => N().cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

// ─── Per-medication reminders ─────────────────────────────────────────────────

export async function schedulePerMedicationReminders(medications: Medication[]): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await cancelAllMedicationReminders();

  const active = medications.filter((m) => m.active);
  for (const med of active) {
    for (let i = 0; i < med.times.length; i++) {
      const { hour, minute } = parseTime(med.times[i]);
      const label = `${med.name}${med.dosage ? ` · ${med.dosage}` : ''}`;
      await N().scheduleNotificationAsync({
        identifier: `med-${med.id}-${i}`,
        content: buildContent('💊 Medication reminder', `Time to take ${label}`, '/(tabs)', med.ring_enabled),
        trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    }
  }
}

export async function cancelAllMedicationReminders(): Promise<void> {
  if (IS_EXPO_GO) return;
  const scheduled = await N().getAllScheduledNotificationsAsync() as { identifier: string }[];
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('med-'))
      .map((n) => N().cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

// ─── Event-triggered (one-shot) notifications ─────────────────────────────────

export async function scheduleEarlyWarningNotification(reportId: string): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  await N().scheduleNotificationAsync({
    identifier: `early-warning-${reportId}`,
    content: buildContent(
      'Equi noticed something',
      'Your recent patterns match some of your personal early warning signs. Tap to review.',
      '/(tabs)/you/ai-report',
      false,
    ),
    trigger: null, // immediate
  });
}

export async function schedulePostCrisisCheckin(crisisTimestamp: number): Promise<void> {
  if (IS_EXPO_GO) return;
  await ensureChannels();
  const fireAt = new Date(crisisTimestamp + 24 * 60 * 60 * 1000);
  // Only schedule if the fire time is in the future
  if (fireAt.getTime() <= Date.now()) return;
  await N().scheduleNotificationAsync({
    identifier: `post-crisis-${crisisTimestamp}`,
    content: buildContent(
      'How are you doing?',
      "Yesterday was difficult. We're checking in. Tap to log today.",
      '/(tabs)',
      false,
    ),
    trigger: { type: N().SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

// ─── Apply all preferences at once ───────────────────────────────────────────
// Called on app startup (from notifications store load) and whenever prefs change.

export async function applyNotificationPreferences(
  prefs: NotificationPreferences,
  anchors: { anchor_name: string; target_time: string }[],
): Promise<void> {
  if (IS_EXPO_GO) return;

  await Promise.all([
    prefs.checkin_enabled
      ? scheduleDailyCheckin(prefs.checkin_time, prefs.checkin_ring ?? false)
      : cancelDailyCheckin(),

    prefs.journal_enabled
      ? scheduleJournalReminder(prefs.journal_time, prefs.journal_ring ?? false)
      : cancelJournalReminder(),

    (prefs.sleep_log_enabled ?? false)
      ? scheduleSleepLogReminder(prefs.sleep_log_time, prefs.sleep_log_ring ?? false)
      : cancelSleepLogReminder(),

    (prefs.activity_reminder_enabled ?? false)
      ? scheduleActivityReminder(prefs.activity_reminder_time, prefs.activity_reminder_ring ?? false)
      : cancelActivityReminder(),

    prefs.weekly_report_enabled
      ? scheduleWeeklyReport()
      : cancelWeeklyReport(),

    prefs.anchor_nudges_enabled
      ? scheduleAnchorNudges(anchors, prefs.anchor_nudges_ring ?? false)
      : cancelAnchorNudges(),
  ]);

  // Medication reminders managed separately via schedulePerMedicationReminders()
  // Post-crisis and early-warning are event-triggered, not scheduled here
}
