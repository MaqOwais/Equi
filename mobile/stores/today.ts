import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState, MedicationStatus } from '../types/database';

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

interface TodayStore {
  date: string;
  moodScore: number | null;
  cycleState: CycleState | null;
  cycleIntensity: number | null;
  cycleSymptoms: string[];
  medicationStatus: MedicationStatus | null;
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
  alcohol: null,
  cannabis: null,
  isLoading: false,

  load: async (userId) => {
    const date = isoToday();
    set({ isLoading: true, date });

    const [mood, cycle, checkin, med] = await Promise.all([
      supabase.from('mood_logs').select('score').eq('user_id', userId).eq('logged_at', date).maybeSingle(),
      supabase.from('cycle_logs').select('state, intensity, symptoms').eq('user_id', userId).eq('logged_at', date).maybeSingle(),
      supabase.from('daily_checkins').select('alcohol, cannabis').eq('user_id', userId).eq('checkin_date', date).maybeSingle(),
      supabase.from('medication_logs').select('status').eq('user_id', userId).eq('log_date', date).maybeSingle(),
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
    await supabase.from('mood_logs').upsert({
      user_id: userId,
      logged_at: get().date,
      score,
      cycle_state: get().cycleState,
    });
  },

  logCycle: async (userId, state, intensity, symptoms, notes) => {
    set({ cycleState: state, cycleIntensity: intensity, cycleSymptoms: symptoms });
    await Promise.all([
      supabase.from('cycle_logs').upsert({
        user_id: userId,
        logged_at: get().date,
        state,
        intensity,
        symptoms,
        notes: notes ?? null,
      }),
      supabase.from('profiles').update({ current_cycle_state: state }).eq('id', userId),
    ]);
  },

  logCheckin: async (userId, alcohol, cannabis) => {
    set({ alcohol, cannabis });
    await supabase.from('daily_checkins').upsert({
      user_id: userId,
      checkin_date: get().date,
      alcohol,
      cannabis,
    });
  },

  logMedication: async (userId, status, skipReason, sideEffects) => {
    set({ medicationStatus: status });
    await supabase.from('medication_logs').upsert({
      user_id: userId,
      log_date: get().date,
      status,
      skip_reason: skipReason ?? null,
      side_effects: sideEffects ?? [],
    });
  },
}));
