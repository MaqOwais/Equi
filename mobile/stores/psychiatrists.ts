/**
 * Psychiatrist store — Phase 5E.
 * Client-side search over a full directory load (MVP < 500 psychiatrists).
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Psychiatrist } from '../types/database';

interface Filters {
  telehealth: boolean;
  in_person: boolean;
  equi_partner: boolean;
  sliding_scale: boolean;
}

interface PsychiatristsStore {
  all: Psychiatrist[];
  isLoading: boolean;
  lastLoaded: number | null;
  filters: Filters;
  query: string;
  load: (force?: boolean) => Promise<void>;
  setQuery: (q: string) => void;
  setFilter: (key: keyof Filters, value: boolean) => void;
  filtered: () => Psychiatrist[];
}

const defaultFilters: Filters = {
  telehealth: false,
  in_person: false,
  equi_partner: false,
  sliding_scale: false,
};

export const usePsychiatristsStore = create<PsychiatristsStore>((set, get) => ({
  all: [],
  isLoading: false,
  lastLoaded: null,
  filters: defaultFilters,
  query: '',

  load: async (force = false) => {
    const { lastLoaded } = get();
    if (!force && lastLoaded && Date.now() - lastLoaded < 30 * 60 * 1000) return;
    set({ isLoading: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('psychiatrists_public')
      .select('*')
      .order('is_equi_partner', { ascending: false })
      .order('name');
    set({ all: (data ?? []) as Psychiatrist[], isLoading: false, lastLoaded: Date.now() });
  },

  setQuery: (query) => set({ query }),

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  filtered: () => {
    const { all, query, filters } = get();
    return all.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.location_city?.toLowerCase().includes(q) ||
        p.location_state?.toLowerCase().includes(q);
      const matchesTelehealth = !filters.telehealth || p.offers_telehealth;
      const matchesInPerson = !filters.in_person || p.offers_in_person;
      const matchesPartner = !filters.equi_partner || p.is_equi_partner;
      const matchesSliding = !filters.sliding_scale || p.sliding_scale;
      return matchesQuery && matchesTelehealth && matchesInPerson && matchesPartner && matchesSliding;
    });
  },
}));
