/**
 * HealthKit integration — Phase 4A.
 *
 * Guards all HealthKit calls behind:
 *   1. Platform.OS === 'ios'
 *   2. Dynamic require — expo-health is only available in native builds.
 *      In Expo Go / Android this file still imports safely; all functions
 *      return null / false gracefully.
 *
 * To enable after CocoaPods:
 *   npx expo install expo-health
 *   Add plugin to app.json (see docs/phase4/4a-sleep-wearables.md)
 *   cd ios && pod install
 */

import { Platform } from 'react-native';

export interface SleepSample {
  date: string;            // YYYY-MM-DD (night of)
  duration_minutes: number;
  quality_score: number;   // 1–5 estimated from duration
  bedtime: string | null;  // HH:MM:SS local
  wake_time: string | null;
  deep_minutes: number | null;
  rem_minutes: number | null;
  awakenings: number | null;
  raw: Record<string, unknown>;
}

// Estimate quality from duration buckets
function qualityFromDuration(minutes: number): number {
  if (minutes < 300) return 1;   // < 5h
  if (minutes < 360) return 2;   // 5–6h
  if (minutes < 420) return 3;   // 6–7h
  if (minutes < 480) return 4;   // 7–8h
  return 5;                       // 8h+
}

function toHHMM(d: Date): string {
  return d.toTimeString().slice(0, 8);  // HH:MM:SS
}

// Night-of date: if wake time is before noon → use previous calendar day
function nightOf(wakeDate: Date): string {
  const d = new Date(wakeDate);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Request HealthKit read permissions for sleep analysis.
 * Returns false in Expo Go / Android.
 */
export async function requestSleepPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    // Dynamic import — only resolves in native builds with expo-health installed
    const Health = await import('expo-health' as string);
    const { status } = await Health.requestAuthorizationAsync({
      read: [Health.HealthDataType.SleepAnalysis],
      write: [],
    });
    return status === 'authorized';
  } catch {
    // expo-health not installed (Expo Go) — graceful fallback
    return false;
  }
}

/**
 * Fetch last night's sleep from HealthKit.
 * Returns null in Expo Go / Android / no permission.
 */
export async function fetchLastNightSleep(): Promise<SleepSample | null> {
  if (Platform.OS !== 'ios') return null;

  try {
    const Health = await import('expo-health' as string);

    const end = new Date();
    const start = new Date(end);
    start.setHours(start.getHours() - 16);  // look back 16h to catch late risers

    const samples: any[] = await Health.querySleepSamplesAsync({
      startDate: start,
      endDate: end,
    });

    if (!samples.length) return null;

    // Sum all Asleep stages for total duration
    let totalMs = 0;
    let earliest: Date | null = null;
    let latest: Date | null = null;
    let deepMs = 0;
    let remMs = 0;
    let awakenings = 0;

    for (const s of samples) {
      const sStart = new Date(s.startDate);
      const sEnd = new Date(s.endDate);
      const durationMs = sEnd.getTime() - sStart.getTime();

      if (s.value === 'INBED') continue;  // skip InBed — count only sleep stages

      totalMs += durationMs;
      if (!earliest || sStart < earliest) earliest = sStart;
      if (!latest || sEnd > latest) latest = sEnd;

      if (s.value === 'DEEP') deepMs += durationMs;
      if (s.value === 'REM')  remMs  += durationMs;
      if (s.value === 'AWAKE') awakenings++;
    }

    if (totalMs < 60_000) return null;  // less than 1 minute — ignore

    const totalMinutes = Math.round(totalMs / 60_000);
    const wakeDate = latest ?? end;

    return {
      date:             nightOf(wakeDate),
      duration_minutes: totalMinutes,
      quality_score:    qualityFromDuration(totalMinutes),
      bedtime:          earliest ? toHHMM(earliest) : null,
      wake_time:        latest   ? toHHMM(latest)   : null,
      deep_minutes:     deepMs   ? Math.round(deepMs  / 60_000) : null,
      rem_minutes:      remMs    ? Math.round(remMs   / 60_000) : null,
      awakenings:       awakenings || null,
      raw:              { sampleCount: samples.length },
    };
  } catch {
    return null;
  }
}

/**
 * Check whether HealthKit is available on this device.
 * Returns false on Android and in Expo Go.
 */
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const Health = await import('expo-health' as string);
    return await Health.isAvailableAsync();
  } catch {
    return false;
  }
}
