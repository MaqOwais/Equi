import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { saveLocal } from '../lib/local-day-store';
import { fetchLastNightSleep, requestSleepPermissions } from '../lib/healthkit';
import type { SleepLog, WearableConnection, WearableProvider } from '../types/database';

const db = supabase as any;

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface SleepStore {
  todayLog: SleepLog | null;
  history: SleepLog[];
  wearableConnections: WearableConnection[];
  isLoading: boolean;
  isSyncing: boolean;
  lastLoaded: number | null;

  load: (userId: string, force?: boolean) => Promise<void>;
  logManual: (userId: string, qualityScore: number, durationMinutes?: number) => Promise<void>;
  syncFromHealthKit: (userId: string) => Promise<{ synced: boolean; message: string }>;
  setWearableConnection: (userId: string, provider: WearableProvider, connected: boolean) => Promise<void>;
  refreshConnections: (userId: string) => Promise<void>;
}

const QUALITY_DURATION: Record<number, number> = {
  1: 270, 2: 330, 3: 390, 4: 450, 5: 510,
};

export const useSleepStore = create<SleepStore>((set, get) => ({
  todayLog: null,
  history: [],
  wearableConnections: [],
  isLoading: false,
  isSyncing: false,
  lastLoaded: null,

  load: async (userId, force = false) => {
    const { lastLoaded } = get();
    if (!force && lastLoaded && Date.now() - lastLoaded < 5 * 60 * 1000) return;
    set({ isLoading: true });
    const today = isoToday();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

    const [todayRes, historyRes, connectionsRes] = await Promise.all([
      db.from('sleep_logs').select('*').eq('user_id', userId).eq('date', today).maybeSingle(),
      db.from('sleep_logs').select('*').eq('user_id', userId).gte('date', since).order('date', { ascending: false }),
      db.from('wearable_connections').select('*').eq('user_id', userId),
    ]);

    set({
      todayLog: (todayRes.data as SleepLog) ?? null,
      history: (historyRes.data as SleepLog[]) ?? [],
      wearableConnections: (connectionsRes.data as WearableConnection[]) ?? [],
      isLoading: false,
      lastLoaded: Date.now(),
    });
  },

  logManual: async (userId, qualityScore, durationMinutes) => {
    const date = isoToday();
    const duration = durationMinutes ?? QUALITY_DURATION[qualityScore];

    const row = {
      user_id: userId,
      date,
      quality_score: qualityScore,
      duration_minutes: duration,
      source: 'manual' as const,
    };

    // Optimistic update
    set((s) => ({
      todayLog: { ...row, id: 'optimistic', bedtime: null, wake_time: null,
        deep_minutes: null, rem_minutes: null, awakenings: null,
        raw_healthkit: null, created_at: new Date().toISOString() } as unknown as SleepLog,
      history: s.todayLog
        ? s.history.map((h) => (h.date === date ? { ...h, ...row } : h))
        : [{ ...row, id: 'optimistic', bedtime: null, wake_time: null,
          deep_minutes: null, rem_minutes: null, awakenings: null,
          raw_healthkit: null, created_at: new Date().toISOString() } as unknown as SleepLog,
          ...s.history],
    }));

    // Save locally — deferred Supabase sync
    await saveLocal(userId, date, {
      sleepQuality: qualityScore,
      sleepDuration: duration,
    });

    // Also write to Supabase (HealthKit sync depends on server data)
    const { data } = await db.from('sleep_logs').upsert(row, { onConflict: 'user_id,date' }).select().single();
    if (data) {
      set((s) => ({
        todayLog: data as SleepLog,
        history: s.history.map((h) => (h.date === date ? (data as SleepLog) : h)),
        lastLoaded: null,
      }));
    }
  },

  syncFromHealthKit: async (userId) => {
    set({ isSyncing: true });

    const hasPermission = await requestSleepPermissions();
    if (!hasPermission) {
      set({ isSyncing: false });
      return { synced: false, message: 'HealthKit permission not granted.' };
    }

    const sample = await fetchLastNightSleep();
    if (!sample) {
      set({ isSyncing: false });
      return { synced: false, message: 'No sleep data found for last night.' };
    }

    const existing = get().history.find((h) => h.date === sample.date);
    if (existing && existing.source !== 'manual') {
      set({ isSyncing: false });
      return { synced: false, message: 'Already synced for this date.' };
    }

    const row = {
      user_id: userId,
      date: sample.date,
      duration_minutes: sample.duration_minutes,
      quality_score: sample.quality_score,
      source: 'healthkit' as const,
      bedtime: sample.bedtime,
      wake_time: sample.wake_time,
      deep_minutes: sample.deep_minutes,
      rem_minutes: sample.rem_minutes,
      awakenings: sample.awakenings,
      raw_healthkit: sample.raw,
    };

    const { data } = await db.from('sleep_logs').upsert(row, { onConflict: 'user_id,date' }).select().single();

    await db.from('wearable_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'healthkit');

    // Save locally too
    await saveLocal(userId, sample.date, {
      sleepQuality: sample.quality_score,
      sleepDuration: sample.duration_minutes,
    });

    const isToday = sample.date === isoToday();
    set((s) => ({
      todayLog: isToday ? (data as SleepLog) : s.todayLog,
      history: s.history.some((h) => h.date === sample.date)
        ? s.history.map((h) => (h.date === sample.date ? (data as SleepLog) : h))
        : [(data as SleepLog), ...s.history],
      isSyncing: false,
    }));

    return { synced: true, message: `Synced ${sample.duration_minutes}m of sleep.` };
  },

  setWearableConnection: async (userId, provider, connected) => {
    if (connected) {
      await db.from('wearable_connections').upsert(
        { user_id: userId, provider, connected_at: new Date().toISOString() },
        { onConflict: 'user_id,provider' },
      );
    } else {
      await db.from('wearable_connections').delete().eq('user_id', userId).eq('provider', provider);
    }
    await get().refreshConnections(userId);
  },

  refreshConnections: async (userId) => {
    const { data } = await db.from('wearable_connections').select('*').eq('user_id', userId);
    set({ wearableConnections: (data as WearableConnection[]) ?? [] });
  },
}));
