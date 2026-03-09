import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState } from '../types/database';
import { saveLocal, getLocal } from '../lib/local-day-store';

export interface LocalJournalEntry {
  id?: string;
  date: string;
  text: string;
  cycleState: CycleState | null;
  moodScore: number | null;
  locked: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface JournalStore {
  entries: Record<string, LocalJournalEntry>;   // keyed by YYYY-MM-DD
  savingDate: string | null;

  loadEntry: (userId: string, date: string) => Promise<void>;
  saveEntry: (
    userId: string,
    date: string,
    text: string,
    meta?: { cycleState?: CycleState | null; moodScore?: number | null },
  ) => Promise<void>;
}

function isLocked(entry: { locked: boolean; createdAt?: string }): boolean {
  if (entry.locked) return true;
  if (!entry.createdAt) return false;
  return new Date(entry.createdAt).getTime() < Date.now() - 48 * 3600 * 1000;
}

const db = supabase as any;

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: {},
  savingDate: null,

  loadEntry: async (userId, date) => {
    // Check local first
    const local = await getLocal(userId, date);
    if (local?.journalText) {
      set((s) => ({
        entries: {
          ...s.entries,
          [date]: {
            date,
            text: local.journalText!,
            cycleState: (local.cycleState as CycleState) ?? null,
            moodScore: local.moodScore ?? null,
            locked: false,
          },
        },
      }));
      return;
    }

    // Fall back to Supabase
    const { data } = await db
      .from('journal_entries')
      .select('id, entry_date, blocks, cycle_state, mood_score, locked, created_at, updated_at')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .maybeSingle();

    if (data) {
      const entry: LocalJournalEntry = {
        id: data.id as string,
        date,
        text: typeof data.blocks === 'string' ? data.blocks : '',
        cycleState: (data.cycle_state as CycleState) ?? null,
        moodScore: (data.mood_score as number) ?? null,
        locked: isLocked({ locked: data.locked as boolean, createdAt: data.created_at as string }),
        createdAt: data.created_at as string,
        updatedAt: data.updated_at as string,
      };
      set((s) => ({ entries: { ...s.entries, [date]: entry } }));
    }
  },

  saveEntry: async (userId, date, text, meta) => {
    const existing = get().entries[date];
    // Optimistic UI update
    set((s) => ({
      savingDate: date,
      entries: {
        ...s.entries,
        [date]: {
          ...existing,
          date,
          text,
          cycleState: meta?.cycleState ?? existing?.cycleState ?? null,
          moodScore: meta?.moodScore ?? existing?.moodScore ?? null,
          locked: false,
          updatedAt: new Date().toISOString(),
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        },
      },
    }));

    // Save locally — Supabase sync deferred
    await saveLocal(userId, date, { journalText: text });

    set({ savingDate: null });
  },
}));
