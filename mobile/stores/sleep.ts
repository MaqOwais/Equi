import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchLastNightSleep, requestSleepPermissions } from '../lib/healthkit';
import type { SleepLog, WearableConnection, WearableProvider } from '../types/database';

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

interface SleepStore {
  // Today's sleep log (may be null if not yet logged)
  todayLog: SleepLog | null;
  // 30-day history, newest first
  history: SleepLog[];
  // Wearable connection status
  wearableConnections: WearableConnection[];
  isLoading: boolean;
  isSyncing: boolean;

  load: (userId: string) => Promise<void>;
  logManual: (userId: string, qualityScore: number, durationMinutes?: number) => Promise<void>;
  syncFromHealthKit: (userId: string) => Promise<{ synced: boolean; message: string }>;
  setWearableConnection: (userId: string, provider: WearableProvider, connected: boolean) => Promise<void>;
  refreshConnections: (userId: string) => Promise<void>;
}

// Quality bucket → approximate duration midpoint in minutes
const QUALITY_DURATION: Record<number, number> = {
  1: 270,   // ~4.5h
  2: 330,   // ~5.5h
  3: 390,   // ~6.5h
  4: 450,   // ~7.5h
  5: 510,   // ~8.5h
};

export const useSleepStore = create<SleepStore>((set, get) => ({
  todayLog: null,
  history: [],
  wearableConnections: [],
  isLoading: false,
  isSyncing: false,

  load: async (userId) => {
    set({ isLoading: true });
    const today = isoToday();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];

    const [todayRes, historyRes, connectionsRes] = await Promise.all([
      supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since)
        .order('date', { ascending: false }),
      supabase
        .from('wearable_connections')
        .select('*')
        .eq('user_id', userId),
    ]);

    set({
      todayLog: (todayRes.data as SleepLog) ?? null,
      history: (historyRes.data as SleepLog[]) ?? [],
      wearableConnections: (connectionsRes.data as WearableConnection[]) ?? [],
      isLoading: false,
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
        raw_healthkit: null, created_at: new Date().toISOString() },
      history: s.todayLog
        ? s.history.map((h) => (h.date === date ? { ...h, ...row } : h))
        : [{ ...row, id: 'optimistic', bedtime: null, wake_time: null,
          deep_minutes: null, rem_minutes: null, awakenings: null,
          raw_healthkit: null, created_at: new Date().toISOString() },
          ...s.history],
    }));

    const { data } = await supabase
      .from('sleep_logs')
      .upsert(row, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (data) {
      set((s) => ({
        todayLog: data as SleepLog,
        history: s.history.map((h) => (h.date === date ? (data as SleepLog) : h)),
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

    // Don't overwrite a more precise source if already logged
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

    const { data } = await supabase
      .from('sleep_logs')
      .upsert(row, { onConflict: 'user_id,date' })
      .select()
      .single();

    // Update last_synced_at
    await supabase
      .from('wearable_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'healthkit');

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
      await supabase.from('wearable_connections').upsert(
        { user_id: userId, provider, connected_at: new Date().toISOString() },
        { onConflict: 'user_id,provider' },
      );
    } else {
      await supabase
        .from('wearable_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);
    }
    await get().refreshConnections(userId);
  },

  refreshConnections: async (userId) => {
    const { data } = await supabase
      .from('wearable_connections')
      .select('*')
      .eq('user_id', userId);
    set({ wearableConnections: (data as WearableConnection[]) ?? [] });
  },
}));
