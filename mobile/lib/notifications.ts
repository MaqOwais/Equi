import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { NotificationPreferences } from '../types/database';

// expo-notifications push support was removed from Expo Go in SDK 53.
// The native module throws at initialisation time in Expo Go on Android.
// In Expo Go: all exported functions are silent no-ops.
// In dev builds and production: full functionality.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Lazy getter — only requires the native module when NOT in Expo Go,
// so Expo Go never initialises the module and never throws.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function N(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

// ─── Permission & Token ───────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (IS_EXPO_GO || !Device.isDevice) return null;

  const { status: existing } = await N().getPermissionsAsync();
  const { status } = existing !== 'granted'
    ? await N().requestPermissionsAsync()
    : { status: existing };

  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await N().setNotificationChannelAsync('default', {
      name: 'Equi',
      importance: N().AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A8C5A0',
    });
  }

  const token = (await N().getExpoPushTokenAsync()).data;
  return token;
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

/** Parse 'HH:MM:SS' or 'HH:MM' into { hour, minute }. */
function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
}

export async function scheduleDailyCheckin(time: string): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('mood-checkin').catch(() => {});
  const { hour, minute } = parseTime(time);
  await N().scheduleNotificationAsync({
    identifier: 'mood-checkin',
    content: {
      title: 'How are you feeling today?',
      body: 'Tap to log your mood — it takes 5 seconds.',
      data: { route: '/(tabs)' },
      sound: false,
    },
    trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelDailyCheckin(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('mood-checkin').catch(() => {});
}

export async function scheduleMedicationReminder(time: string): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('medication-reminder').catch(() => {});
  const { hour, minute } = parseTime(time);
  await N().scheduleNotificationAsync({
    identifier: 'medication-reminder',
    content: {
      title: 'Medication reminder',
      body: 'Time to log your medication for today.',
      data: { route: '/(tabs)' },
      sound: false,
    },
    trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelMedicationReminder(): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().cancelScheduledNotificationAsync('medication-reminder').catch(() => {});
}

export async function scheduleAnchorNudges(
  anchors: { anchor_name: string; target_time: string }[],
): Promise<void> {
  if (IS_EXPO_GO) return;
  const scheduled = await N().getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('anchor-')) {
      await N().cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }

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
      content: {
        title: `${label} in 15 minutes`,
        body: 'Tap to log when you actually do it.',
        data: { route: '/(tabs)/you/routine' },
        sound: false,
      },
      trigger: { type: N().SchedulableTriggerInputTypes.DAILY, hour: nudgeHour, minute: nudgeMinute },
    });
  }
}

export async function cancelAnchorNudges(): Promise<void> {
  if (IS_EXPO_GO) return;
  const scheduled = await N().getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('anchor-')) {
      await N().cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }
}

export async function scheduleEarlyWarningNotification(reportId: string): Promise<void> {
  if (IS_EXPO_GO) return;
  await N().scheduleNotificationAsync({
    identifier: `early-warning-${reportId}`,
    content: {
      title: 'Equi noticed something',
      body: 'Your recent patterns match some of your personal early warning signs. Tap to review.',
      data: { route: '/(tabs)/you/ai-report' },
      sound: false,
    },
    trigger: null,  // immediate
  });
}

export async function schedulePostCrisisCheckin(crisisTimestamp: number): Promise<void> {
  if (IS_EXPO_GO) return;
  const id = `post-crisis-${crisisTimestamp}`;
  const fireAt = new Date(crisisTimestamp + 24 * 60 * 60 * 1000);
  await N().scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'How are you doing?',
      body: 'Yesterday was difficult. We\'re checking in. Tap to log today.',
      data: { route: '/(tabs)' },
      sound: false,
    },
    trigger: { type: N().SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

// ─── Reschedule all from prefs ────────────────────────────────────────────────

export async function applyNotificationPreferences(
  prefs: NotificationPreferences,
  anchors: { anchor_name: string; target_time: string }[],
): Promise<void> {
  if (prefs.checkin_enabled) {
    await scheduleDailyCheckin(prefs.checkin_time);
  } else {
    await cancelDailyCheckin();
  }

  if (prefs.medication_enabled) {
    await scheduleMedicationReminder(prefs.medication_time);
  } else {
    await cancelMedicationReminder();
  }

  if (prefs.anchor_nudges_enabled) {
    await scheduleAnchorNudges(anchors);
  } else {
    await cancelAnchorNudges();
  }

  // Post-crisis and early warning are event-triggered, not scheduled here
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANCHOR_LABELS: Record<string, string> = {
  wake:          'Wake up',
  first_meal:    'First meal',
  first_contact: 'First contact',
  work_start:    'Work start',
  dinner:        'Dinner',
  bedtime:       'Bedtime',
};
