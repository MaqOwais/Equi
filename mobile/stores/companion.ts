import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Companion, CycleState } from '../types/database';

export type CompanionRole = 'guardian' | 'well_wisher';

export interface WatchedPatient {
  companion: Companion;       // has share_* flags + patient_id + role
  patientId: string;
  patientName: string | null;
  cycleState: CycleState | null;
}

interface CompanionStore {
  watching: WatchedPatient[];
  isLoading: boolean;
  lastLoaded: number | null;
  load: (userId: string, force?: boolean) => Promise<void>;
}

export const useCompanionStore = create<CompanionStore>((set, get) => ({
  watching:  [],
  isLoading: false,
  lastLoaded: null,

  async load(userId, force = false) {
    const { lastLoaded } = get();
    if (!force && lastLoaded && Date.now() - lastLoaded < 5 * 60 * 1000) return;
    set({ isLoading: true });

    // All patients this user is an accepted companion for
    const { data: connections } = await supabase
      .from('companions')
      .select('*')
      .eq('companion_id', userId)
      .eq('status', 'accepted')
      .order('created_at');

    if (!connections || connections.length === 0) {
      set({ watching: [], isLoading: false, lastLoaded: Date.now() });
      return;
    }

    const patientIds = (connections as Companion[]).map((c) => c.patient_id);

    // Fetch each profile individually — avoids .in()/.filter() which are
    // unreliable in this Supabase JS build on Hermes.
    const profileResults = await Promise.all(
      patientIds.map((id) =>
        supabase
          .from('profiles')
          .select('id, display_name, current_cycle_state')
          .eq('id', id)
          .maybeSingle(),
      ),
    );

    const profileMap = new Map(
      profileResults
        .map((r) => r.data as Record<string, unknown> | null)
        .filter(Boolean)
        .map((p) => [(p as Record<string, unknown>).id as string, p as Record<string, unknown>]),
    );

    const watching: WatchedPatient[] = (connections as Companion[]).map((companion) => {
      const profile = profileMap.get(companion.patient_id);
      return {
        companion,
        patientId:   companion.patient_id,
        patientName: (profile?.display_name as string) ?? null,
        cycleState:  (profile?.current_cycle_state as CycleState) ?? null,
      };
    });

    set({ watching, isLoading: false, lastLoaded: Date.now() });
  },
}));

// ─── Cycle state abstraction for well-wishers ─────────────────────────────────
// Well-wishers never see clinical terminology

export function abstractCycleLabel(state: CycleState | null): string {
  switch (state) {
    case 'stable':     return 'Doing well';
    case 'manic':      return 'Feeling elevated';
    case 'depressive': return 'Having a tough time';
    case 'mixed':      return 'Going through a complex phase';
    default:           return 'No update yet';
  }
}

export function abstractCycleColor(state: CycleState | null): string {
  switch (state) {
    case 'stable':     return '#A8C5A0';
    case 'manic':      return '#89B4CC';
    case 'depressive': return '#C4A0B0';
    case 'mixed':      return '#C9A84C';
    default:           return '#E0DDD8';
  }
}
