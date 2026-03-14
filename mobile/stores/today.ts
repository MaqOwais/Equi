import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState, MedicationStatus } from '../types/database';
import { saveLocal, getLocal } from '../lib/local-day-store';

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface TodayStore {
  date: string;
  moodScore: number | null;
  cycleState: CycleState | null;
  cycleIntensity: number | null;
  cycleSymptoms: string[];
  medicationStatus: MedicationStatus | null;
  medicationSkipReason: string | null;
  alcohol: boolean | null;
  cannabis: boolean | null;
  isLoading: boolean;

  load: (userId: string) => Promise<void>;
  logMood: (userId: string, score: number) => Promise<void>;
  logCycle: (
    userId: string,
    state: CycleState,
    intensity: number,
    symptoms: string[],
    notes?: string,
  ) => Promise<void>;
  logCheckin: (userId: string, alcohol: boolean, cannabis: boolean) => Promise<void>;
  logMedication: (
    userId: string,
    status: MedicationStatus,
    skipReason?: string,
    sideEffects?: string[],
  ) => Promise<void>;
}

export const useTodayStore = create<TodayStore>((set, get) => ({
  date: isoToday(),
  moodScore: null,
  cycleState: null,
  cycleIntensity: null,
  cycleSymptoms: [],
  medicationStatus: null,
  medicationSkipReason: null,
  alcohol: null,
  cannabis: null,
  isLoading: false,

  load: async (userId) => {
    const date = isoToday();
    set({ isLoading: true, date });

    // Local storage is the source of truth for today
    const local = await getLocal(userId, date);
    if (local) {
      set({
        moodScore: local.moodScore ?? null,
        cycleState: (local.cycleState as CycleState) ?? null,
        cycleIntensity: local.cycleIntensity ?? null,
        cycleSymptoms: local.cycleSymptoms ?? [],
        alcohol: local.alcohol ?? null,
        cannabis: local.cannabis ?? null,
        medicationStatus: (local.medicationStatus as MedicationStatus) ?? null,
        medicationSkipReason: local.medicationSkipReason ?? null,
        isLoading: false,
      });
      return;
    }

    // Nothing local yet — fall back to Supabase (e.g. first launch after reinstall)
    const db = supabase as any;
    const [mood, cycle, checkin, med] = await Promise.all([
      db.from('mood_logs').select('score').eq('user_id', userId).eq('logged_at', date).maybeSingle(),
      db.from('cycle_logs').select('state, intensity, symptoms').eq('user_id', userId).eq('logged_at', date).maybeSingle(),
      db.from('daily_checkins').select('alcohol, cannabis').eq('user_id', userId).eq('checkin_date', date).maybeSingle(),
      db.from('medication_logs').select('status').eq('user_id', userId).eq('log_date', date).maybeSingle(),
    ]);

    set({
      moodScore: mood.data?.score ?? null,
      cycleState: (cycle.data?.state as CycleState) ?? null,
      cycleIntensity: cycle.data?.intensity ?? null,
      cycleSymptoms: (cycle.data?.symptoms as string[]) ?? [],
      alcohol: checkin.data?.alcohol ?? null,
      cannabis: checkin.data?.cannabis ?? null,
      medicationStatus: (med.data?.status as MedicationStatus) ?? null,
      isLoading: false,
    });
  },

  logMood: async (userId, score) => {
    set({ moodScore: score });
    await saveLocal(userId, get().date, {
      moodScore: score,
      cycleState: get().cycleState,
    });
  },

  logCycle: async (userId, state, intensity, symptoms, notes) => {
    set({ cycleState: state, cycleIntensity: intensity, cycleSymptoms: symptoms });
    await saveLocal(userId, get().date, {
      cycleState: state,
      cycleIntensity: intensity,
      cycleSymptoms: symptoms,
      cycleNotes: notes ?? null,
    });
  },

  logCheckin: async (userId, alcohol, cannabis) => {
    set({ alcohol, cannabis });
    await saveLocal(userId, get().date, { alcohol, cannabis });
  },

  logMedication: async (userId, status, skipReason, sideEffects) => {
    set({ medicationStatus: status, medicationSkipReason: skipReason ?? null });
    await saveLocal(userId, get().date, {
      medicationStatus: status,
      medicationSkipReason: skipReason ?? null,
      medicationSideEffects: sideEffects ?? [],
    });
  },
}));
