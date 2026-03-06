import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState } from '../types/database';

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

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: {},
  savingDate: null,

  loadEntry: async (userId, date) => {
    const { data } = await supabase
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
    // Optimistic update
    const existing = get().entries[date];
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

    await supabase.from('journal_entries').upsert({
      user_id: userId,
      entry_date: date,
      blocks: text,
      cycle_state: meta?.cycleState ?? existing?.cycleState ?? null,
      mood_score: meta?.moodScore ?? existing?.moodScore ?? null,
      updated_at: new Date().toISOString(),
    });

    set({ savingDate: null });
  },
}));
