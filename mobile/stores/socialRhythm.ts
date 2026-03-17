import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RoutineAnchor, RoutineAnchorLog, SocialRhythmLog } from '../types/database';
import { calculateRhythmScore } from '../utils/socialRhythm';
import { saveLocal } from '../lib/local-day-store';

const db = supabase as any;

interface SocialRhythmStore {
  todayScore: number | null;
  todayAnchorsHit: number;
  todayAnchorsTotal: number;
  todayAnchorLogs: RoutineAnchorLog[];
  history: SocialRhythmLog[];
  isLoading: boolean;

  load: (userId: string) => Promise<void>;
  logAnchor: (
    userId: string,
    anchor: RoutineAnchor,
    actualTime: string,
    source?: string,
  ) => Promise<void>;
  inferFromSleep: (
    userId: string,
    anchors: RoutineAnchor[],
    wakeTime: string | null,
    bedtime: string | null,
  ) => Promise<void>;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useSocialRhythmStore = create<SocialRhythmStore>((set, get) => ({
  todayScore: null,
  todayAnchorsHit: 0,
  todayAnchorsTotal: 0,
  todayAnchorLogs: [],
  history: [],
  isLoading: false,

  load: async (userId) => {
    set({ isLoading: true });
    const today = todayStr();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;

    const [historyRes, todayLogsRes, anchorsRes] = await Promise.all([
      db.from('social_rhythm_logs').select('*').eq('user_id', userId).gte('date', sinceStr).order('date', { ascending: false }),
      db.from('routine_anchor_logs').select('*').eq('user_id', userId).eq('date', today),
      db.from('routine_anchors').select('*').eq('user_id', userId),
    ]);

    const anchors = (anchorsRes.data ?? []) as RoutineAnchor[];
    const todayLogs = (todayLogsRes.data ?? []) as RoutineAnchorLog[];
    const { score, hit, total } = calculateRhythmScore(anchors, todayLogs);

    set({
      history: (historyRes.data ?? []) as SocialRhythmLog[],
      todayAnchorLogs: todayLogs,
      todayScore: todayLogs.length > 0 ? score : null,
      todayAnchorsHit: hit,
      todayAnchorsTotal: total,
      isLoading: false,
    });
  },

  logAnchor: async (userId, anchor, actualTime, source = 'manual') => {
    if (!anchor.target_time) return;
    const today = todayStr();
    const actualTimeFull = actualTime.length === 5 ? `${actualTime}:00` : actualTime;

    await db.from('routine_anchor_logs').upsert(
      { user_id: userId, anchor_id: anchor.id, date: today, actual_time: actualTimeFull, source },
      { onConflict: 'user_id,anchor_id,date' },
    );

    const [logsRes, anchorsRes] = await Promise.all([
      db.from('routine_anchor_logs').select('*').eq('user_id', userId).eq('date', today),
      db.from('routine_anchors').select('*').eq('user_id', userId),
    ]);

    const allLogs = (logsRes.data ?? []) as RoutineAnchorLog[];
    const allAnchors = (anchorsRes.data ?? []) as RoutineAnchor[];
    const { score, hit, partial, total, detail } = calculateRhythmScore(allAnchors, allLogs);

    await db.from('social_rhythm_logs').upsert(
      { user_id: userId, date: today, score, anchors_hit: hit, anchors_partial: partial, anchors_total: total, anchor_detail: detail },
      { onConflict: 'user_id,date' },
    );

    // Save score locally for calendar
    await saveLocal(userId, today, {
      socialRhythmScore: score,
      socialAnchorsHit: hit,
      socialAnchorsTotal: total,
      socialRhythmTimestamp: new Date().toISOString(),
    });

    set({ todayAnchorLogs: allLogs, todayScore: score, todayAnchorsHit: hit, todayAnchorsTotal: total });
  },

  inferFromSleep: async (userId, anchors, wakeTime, bedtime) => {
    if (!wakeTime && !bedtime) return;
    const wakeAnchor = anchors.find((a) => a.anchor_name === 'wake');
    const bedtimeAnchor = anchors.find((a) => a.anchor_name === 'bedtime');
    const toLog: { anchor: RoutineAnchor; time: string }[] = [];
    if (wakeTime && wakeAnchor) toLog.push({ anchor: wakeAnchor, time: wakeTime });
    if (bedtime && bedtimeAnchor) toLog.push({ anchor: bedtimeAnchor, time: bedtime });

    for (const { anchor, time } of toLog) {
      const existing = get().todayAnchorLogs.find((l) => l.anchor_id === anchor.id);
      if (!existing) {
        await get().logAnchor(userId, anchor, time, 'healthkit');
      }
    }
  },
}));
