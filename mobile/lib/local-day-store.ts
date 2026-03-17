/**
 * Offline-first local data layer.
 *
 * All daily health data is saved to AsyncStorage immediately.
 * Supabase sync runs at end of day (auto) or on user request (manual).
 *
 * Key pattern:   equi_local_day_{userId}_{YYYY-MM-DD}  → LocalDayData (JSON)
 * Pending list:  equi_pending_sync_{userId}              → string[] (dates)
 * Last sync:     equi_last_sync_{userId}                 → ISO timestamp
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocalActivityCompletion {
  activityId: string;
  name: string;
  completedAt: string; // ISO timestamp
}

export interface LocalDayData {
  date: string;
  userId: string;

  // Cycle
  cycleState?: string | null;
  cycleIntensity?: number | null;
  cycleSymptoms?: string[] | null;
  cycleNotes?: string | null;
  cycleTimestamp?: string | null; // ISO 8601 — when the entry was logged

  // Mood
  moodScore?: number | null;
  moodTimestamp?: string | null; // ISO 8601 — when mood was logged

  // Medication
  medicationStatus?: string | null;
  medicationSkipReason?: string | null;
  medicationSideEffects?: string[] | null;
  medTimestamp?: string | null; // ISO 8601 — when medication was logged

  // Substances
  alcohol?: boolean | null;
  cannabis?: boolean | null;
  checkinTimestamp?: string | null; // ISO 8601 — when substances were logged

  // Journal (full text — never sent to AI)
  journalText?: string | null;
  journalTimestamp?: string | null; // ISO 8601 — when journal was last saved

  // Nutrition
  nutritionCategories?: Record<string, number> | null;
  nutritionTimestamp?: string | null; // ISO 8601 — when nutrition was last updated

  // Sleep
  sleepQuality?: number | null;
  sleepDuration?: number | null; // minutes
  sleepTimestamp?: string | null; // ISO 8601 — when sleep was logged

  // Social Rhythm
  socialRhythmScore?: number | null;
  socialAnchorsHit?: number | null;
  socialAnchorsTotal?: number | null;
  socialRhythmTimestamp?: string | null; // ISO 8601 — when social rhythm was calculated

  // Activities
  activityCompletions?: LocalActivityCompletion[];
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const dayKey = (userId: string, date: string) => `equi_local_day_${userId}_${date}`;
const pendingKey = (userId: string) => `equi_pending_sync_${userId}`;
const lastSyncKey = (userId: string) => `equi_last_sync_${userId}`;

// ─── Read / Write ─────────────────────────────────────────────────────────────

export async function saveLocal(
  userId: string,
  date: string,
  partial: Omit<Partial<LocalDayData>, 'date' | 'userId'>,
): Promise<void> {
  const key = dayKey(userId, date);
  const raw = await AsyncStorage.getItem(key);
  const existing: LocalDayData = raw ? JSON.parse(raw) : { date, userId };
  await AsyncStorage.setItem(key, JSON.stringify({ ...existing, ...partial }));
  await _addPending(userId, date);
}

export async function getLocal(userId: string, date: string): Promise<LocalDayData | null> {
  const raw = await AsyncStorage.getItem(dayKey(userId, date));
  return raw ? JSON.parse(raw) : null;
}

// ─── Pending list ─────────────────────────────────────────────────────────────

async function _addPending(userId: string, date: string) {
  const key = pendingKey(userId);
  const raw = await AsyncStorage.getItem(key);
  const list: string[] = raw ? JSON.parse(raw) : [];
  if (!list.includes(date)) {
    list.push(date);
    await AsyncStorage.setItem(key, JSON.stringify(list));
  }
}

export async function getPendingDates(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(pendingKey(userId));
  return raw ? JSON.parse(raw) : [];
}

export async function getLastSyncTime(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(lastSyncKey(userId));
}

// ─── Sync single day ─────────────────────────────────────────────────────────

export async function syncDayToCloud(userId: string, date: string): Promise<void> {
  const local = await getLocal(userId, date);
  if (!local) return;

  const db = supabase as any;
  const writes: Promise<any>[] = [];

  if (local.cycleState !== undefined) {
    writes.push(
      db.from('cycle_logs').upsert({
        user_id: userId,
        logged_at: local.cycleTimestamp ?? date,
        state: local.cycleState,
        intensity: local.cycleIntensity ?? null,
        symptoms: local.cycleSymptoms ?? [],
        notes: local.cycleNotes ?? null,
      }),
    );
    if (local.cycleState) {
      writes.push(
        db.from('profiles').update({ current_cycle_state: local.cycleState }).eq('id', userId),
      );
    }
  }

  if (local.moodScore !== undefined && local.moodScore !== null) {
    writes.push(
      db.from('mood_logs').upsert({
        user_id: userId,
        logged_at: date,
        score: local.moodScore,
        cycle_state: local.cycleState ?? null,
      }),
    );
  }

  if (local.medicationStatus !== undefined) {
    writes.push(
      db.from('medication_logs').upsert({
        user_id: userId,
        log_date: date,
        status: local.medicationStatus,
        skip_reason: local.medicationSkipReason ?? null,
        side_effects: local.medicationSideEffects ?? [],
      }),
    );
  }

  if (local.alcohol !== undefined || local.cannabis !== undefined) {
    writes.push(
      db.from('daily_checkins').upsert({
        user_id: userId,
        checkin_date: date,
        alcohol: local.alcohol ?? false,
        cannabis: local.cannabis ?? false,
      }),
    );
  }

  if (local.journalText !== undefined && local.journalText !== null) {
    writes.push(
      db.from('journal_entries').upsert({
        user_id: userId,
        entry_date: date,
        blocks: local.journalText,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  if (local.nutritionCategories != null) {
    writes.push(
      db.from('nutrition_logs').upsert({
        user_id: userId,
        log_date: date,
        categories: local.nutritionCategories,
      }),
    );
  }

  if (local.sleepDuration != null) {
    writes.push(
      db.from('sleep_logs').upsert({
        user_id: userId,
        date,
        quality_score: local.sleepQuality ?? null,
        duration_minutes: local.sleepDuration,
      }),
    );
  }

  if (local.socialRhythmScore != null) {
    writes.push(
      db.from('social_rhythm_logs').upsert({
        user_id: userId,
        date,
        score: local.socialRhythmScore,
        anchors_hit: local.socialAnchorsHit ?? null,
        anchors_total: local.socialAnchorsTotal ?? null,
      }),
    );
  }

  for (const ac of local.activityCompletions ?? []) {
    writes.push(
      db.from('activity_completions').insert({
        user_id: userId,
        activity_id: ac.activityId,
        completed_at: ac.completedAt,
      }),
    );
  }

  await Promise.all(writes);

  // Remove from pending
  const key = pendingKey(userId);
  const raw = await AsyncStorage.getItem(key);
  const list: string[] = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(key, JSON.stringify(list.filter((d) => d !== date)));
}

// ─── Sync all pending ─────────────────────────────────────────────────────────

export async function syncAllPending(
  userId: string,
): Promise<{ synced: number; failed: string[] }> {
  const pending = await getPendingDates(userId);
  const failed: string[] = [];
  let synced = 0;

  for (const date of pending) {
    try {
      await syncDayToCloud(userId, date);
      synced++;
    } catch {
      failed.push(date);
    }
  }

  // Record last sync timestamp
  await AsyncStorage.setItem(lastSyncKey(userId), new Date().toISOString());
  return { synced, failed };
}

// ─── End-of-day auto-sync check ───────────────────────────────────────────────
// Call this on app foreground resume. If last sync was before today, auto-sync yesterday.

export async function maybeAutoSync(userId: string): Promise<void> {
  const lastSync = await getLastSyncTime(userId);
  if (!lastSync) return;

  const lastSyncDate = new Date(lastSync).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  if (lastSyncDate < today) {
    // It's a new day — sync yesterday's data automatically
    try {
      await syncAllPending(userId);
    } catch {
      // Silent fail — will retry next time
    }
  }
}
