import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { NotificationPreferences } from '../types/database';

// ─── Permission & Token ───────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Expo push tokens only work on real devices
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing !== 'granted'
    ? await Notifications.requestPermissionsAsync()
    : { status: existing };

  if (status !== 'granted') return null;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Equi',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A8C5A0',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

/** Parse 'HH:MM:SS' or 'HH:MM' into { hour, minute }. */
function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
}

export async function scheduleDailyCheckin(time: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('mood-checkin').catch(() => {});
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    identifier: 'mood-checkin',
    content: {
      title: 'How are you feeling today?',
      body: 'Tap to log your mood — it takes 5 seconds.',
      data: { route: '/(tabs)' },
      sound: false,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelDailyCheckin(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('mood-checkin').catch(() => {});
}

export async function scheduleMedicationReminder(time: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('medication-reminder').catch(() => {});
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    identifier: 'medication-reminder',
    content: {
      title: 'Medication reminder',
      body: 'Time to log your medication for today.',
      data: { route: '/(tabs)' },
      sound: false,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelMedicationReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('medication-reminder').catch(() => {});
}

export async function scheduleAnchorNudges(
  anchors: { anchor_name: string; target_time: string }[],
): Promise<void> {
  // Cancel all existing anchor nudges
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('anchor-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
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
    await Notifications.scheduleNotificationAsync({
      identifier: `anchor-${anchor.anchor_name}`,
      content: {
        title: `${label} in 15 minutes`,
        body: 'Tap to log when you actually do it.',
        data: { route: '/(tabs)/you/routine' },
        sound: false,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: nudgeHour, minute: nudgeMinute },
    });
  }
}

export async function cancelAnchorNudges(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('anchor-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }
}

export async function scheduleEarlyWarningNotification(reportId: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
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
  const id = `post-crisis-${crisisTimestamp}`;
  const fireAt = new Date(crisisTimestamp + 24 * 60 * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: 'How are you doing?',
      body: 'Yesterday was difficult. We\'re checking in. Tap to log today.',
      data: { route: '/(tabs)' },
      sound: false,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

// ─── Reschedule all from prefs ────────────────────────────────────────────────

export async function applyNotificationPreferences(
  prefs: NotificationPreferences,
  anchors: { anchor_name: string; target_time: string }[],
): Promise<void> {
  // Mood check-in
  if (prefs.checkin_enabled) {
    await scheduleDailyCheckin(prefs.checkin_time);
  } else {
    await cancelDailyCheckin();
  }

  // Medication
  if (prefs.medication_enabled) {
    await scheduleMedicationReminder(prefs.medication_time);
  } else {
    await cancelMedicationReminder();
  }

  // Anchor nudges
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
