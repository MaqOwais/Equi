import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Activity, ActivityCompletion, PrescribedActivity } from '../types/database';
import type { CycleState } from '../types/database';

interface ActivitiesStore {
  all: Activity[];
  prescribed: PrescribedActivity[];
  completions: ActivityCompletion[];
  isLoading: boolean;

  load: (userId: string) => Promise<void>;
  complete: (userId: string, activityId: string, cycleState: CycleState | null, notes?: string) => Promise<void>;
  toggleBookmark: (userId: string, activityId: string) => Promise<void>;
}

export const useActivitiesStore = create<ActivitiesStore>((set, get) => ({
  all: [],
  prescribed: [],
  completions: [],
  isLoading: false,

  load: async (userId) => {
    set({ isLoading: true });

    const [activitiesRes, completionsRes, prescribedRes] = await Promise.all([
      supabase.from('activities').select('*').order('category'),
      supabase
        .from('activity_completions')
        .select('*, activity:activities(*)')
        .eq('user_id', userId),
      supabase
        .from('prescribed_activities')
        .select('*, activity:activities(*)')
        .eq('patient_id', userId)
        .eq('active', true),
    ]);

    // Compute completions_this_week for each prescribed activity
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const completions = (completionsRes.data ?? []) as ActivityCompletion[];
    const prescribed = ((prescribedRes.data ?? []) as PrescribedActivity[]).map((p) => ({
      ...p,
      completions_this_week: completions.filter(
        (c) => c.activity_id === p.activity_id && c.completed_at && c.completed_at >= weekAgoISO,
      ).length,
    }));

    set({
      all: (activitiesRes.data ?? []) as Activity[],
      completions,
      prescribed,
      isLoading: false,
    });
  },

  complete: async (userId, activityId, cycleState, notes) => {
    const now = new Date().toISOString();
    const optimistic: ActivityCompletion = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      activity_id: activityId,
      completed_at: now,
      cycle_state: cycleState,
      notes: notes ?? null,
      bookmarked: false,
      created_at: now,
    };

    // Optimistic update
    set((s) => ({ completions: [...s.completions, optimistic] }));

    const { data } = await supabase
      .from('activity_completions')
      .insert({
        user_id: userId,
        activity_id: activityId,
        completed_at: now,
        cycle_state: cycleState,
        notes: notes ?? null,
      })
      .select('*, activity:activities(*)')
      .single();

    if (data) {
      set((s) => ({
        completions: s.completions
          .filter((c) => c.id !== optimistic.id)
          .concat(data as ActivityCompletion),
      }));
    }
  },

  toggleBookmark: async (userId, activityId) => {
    const existing = get().completions.find(
      (c) => c.activity_id === activityId && c.completed_at === null,
    );

    if (existing) {
      // Toggle bookmarked flag
      const newVal = !existing.bookmarked;
      set((s) => ({
        completions: s.completions.map((c) =>
          c.id === existing.id ? { ...c, bookmarked: newVal } : c,
        ),
      }));
      await supabase
        .from('activity_completions')
        .update({ bookmarked: newVal })
        .eq('id', existing.id);
    } else {
      // Create bookmark-only row
      const { data } = await supabase
        .from('activity_completions')
        .insert({ user_id: userId, activity_id: activityId, completed_at: null, bookmarked: true })
        .select('*, activity:activities(*)')
        .single();
      if (data) {
        set((s) => ({ completions: [...s.completions, data as ActivityCompletion] }));
      }
    }
  },
}));
