import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState } from '../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleLogEntry {
  id: string;
  date: string;        // YYYY-MM-DD — derived from timestamp
  timestamp: string;   // full ISO 8601 — exact moment logged
  state: CycleState;
  intensity: number;   // 1–10
  symptoms: string[];
  notes: string | null;
}

// Build a map of date → dominant entry (last logged entry per day, for charts)
export function buildDailyDominant(logs: CycleLogEntry[]): Record<string, CycleLogEntry> {
  const map: Record<string, CycleLogEntry> = {};
  // logs are ordered oldest-first → last write wins = most recent entry of each day
  logs.forEach((l) => { map[l.date] = l; });
  return map;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CycleStore {
  logs: CycleLogEntry[];        // last 90 days, ALL entries, oldest-first
  dayEntries: CycleLogEntry[];  // all entries for a specific loaded day
  currentState: CycleState;

  load90Days: (userId: string) => Promise<void>;
  loadDay:    (userId: string, date: string) => Promise<void>;
  addEntry:   (
    userId: string,
    state: CycleState,
    intensity: number,
    symptoms: string[],
    notes?: string,
  ) => Promise<CycleLogEntry | null>;
}

function toIsoDate(ts: string): string {
  // handles both 'YYYY-MM-DD' and full ISO timestamps
  return ts.substring(0, 10);
}

export const useCycleStore = create<CycleStore>((set, get) => ({
  logs: [],
  dayEntries: [],
  currentState: 'stable',

  load90Days: async (userId) => {
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;

    const { data } = await (supabase as any)
      .from('cycle_logs')
      .select('id, logged_at, state, intensity, symptoms, notes')
      .eq('user_id', userId)
      .gte('logged_at', fromStr)
      .order('logged_at', { ascending: true });

    const logs: CycleLogEntry[] = (data ?? []).map((r: any) => ({
      id: r.id as string,
      date: toIsoDate(r.logged_at as string),
      timestamp: r.logged_at as string,
      state: r.state as CycleState,
      intensity: (r.intensity as number) ?? 5,
      symptoms: (r.symptoms as string[]) ?? [],
      notes: (r.notes as string | null) ?? null,
    }));

    set({
      logs,
      currentState: logs.length > 0 ? logs[logs.length - 1].state : 'stable',
    });
  },

  loadDay: async (userId, date) => {
    // Clear stale entries immediately so the previous day's data never bleeds
    // into the new date while the async fetch is in-flight.
    set({ dayEntries: [] });

    // Convert the requested date's local midnight → UTC so the query matches
    // the user's local day, not UTC day. Without this, users in UTC+N timezones
    // see the wrong day's entries (e.g. PM entries from yesterday appear today).
    const dayStart = new Date(date + 'T00:00:00').toISOString();   // local midnight in UTC
    const dayEnd   = new Date(date + 'T23:59:59.999').toISOString(); // local day-end in UTC

    const { data } = await (supabase as any)
      .from('cycle_logs')
      .select('id, logged_at, state, intensity, symptoms, notes')
      .eq('user_id', userId)
      .gte('logged_at', dayStart)
      .lte('logged_at', dayEnd)
      .order('logged_at', { ascending: true });

    // Belt-and-suspenders: also filter client-side to the local day window
    const dayStartMs = new Date(date + 'T00:00:00').getTime();
    const dayEndMs   = new Date(date + 'T23:59:59.999').getTime();

    const dayEntries: CycleLogEntry[] = (data ?? [])
      .filter((r: any) => {
        const ts = new Date(r.logged_at as string).getTime();
        return ts >= dayStartMs && ts <= dayEndMs;
      })
      .map((r: any) => ({
        id: r.id as string,
        date,
        timestamp: r.logged_at as string,
        state: r.state as CycleState,
        intensity: (r.intensity as number) ?? 5,
        symptoms: (r.symptoms as string[]) ?? [],
        notes: (r.notes as string | null) ?? null,
      }));

    set({ dayEntries });
  },

  addEntry: async (userId, state, intensity, symptoms, notes) => {
    const now = new Date().toISOString();
    const date = toIsoDate(now);

    const { data } = await (supabase as any)
      .from('cycle_logs')
      .insert({
        user_id: userId,
        logged_at: now,
        state,
        intensity,
        symptoms,
        notes: notes ?? null,
      })
      .select('id, logged_at, state, intensity, symptoms, notes')
      .single();

    if (!data) return null;

    const entry: CycleLogEntry = {
      id: data.id,
      date,
      timestamp: data.logged_at,
      state: data.state as CycleState,
      intensity: (data.intensity as number) ?? 5,
      symptoms: (data.symptoms as string[]) ?? [],
      notes: (data.notes as string | null) ?? null,
    };

    set((s) => ({
      logs: [...s.logs, entry],
      // keep dayEntries consistent if it's the same date
      dayEntries: s.dayEntries.length > 0 && s.dayEntries[0]?.date === date
        ? [...s.dayEntries, entry]
        : s.dayEntries,
      currentState: state,
    }));

    return entry;
  },
}));
