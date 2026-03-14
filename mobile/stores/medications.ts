import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { schedulePerMedicationReminders } from '../lib/notifications';
import type { Medication, UserSubstance } from '../types/database';

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface MedicationsStore {
  medications: Medication[];
  substances: UserSubstance[];
  isLoading: boolean;
  lastLoaded: number | null;

  load: (userId: string, force?: boolean) => Promise<void>;
  addMedication: (userId: string, med: Omit<Medication, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;

  addSubstance: (userId: string, sub: { name: string; category: string }) => Promise<void>;
  deleteSubstance: (id: string) => Promise<void>;
}

export const useMedicationsStore = create<MedicationsStore>((set, get) => ({
  medications: [],
  substances: [],
  isLoading: false,
  lastLoaded: null,

  load: async (userId, force = false) => {
    const { lastLoaded } = get();
    if (!force && lastLoaded && Date.now() - lastLoaded < 5 * 60 * 1000) return;
    set({ isLoading: true });
    const db = supabase as any;
    const [medsRes, subsRes] = await Promise.all([
      db.from('medications').select('*').eq('user_id', userId).eq('active', 1).order('created_at', { ascending: true }),
      db.from('user_substances').select('*').eq('user_id', userId).eq('active', 1).order('created_at', { ascending: true }),
    ]);
    set({
      medications: (medsRes.data ?? []) as Medication[],
      substances: (subsRes.data ?? []) as UserSubstance[],
      isLoading: false,
      lastLoaded: Date.now(),
    });
  },

  addMedication: async (userId, med) => {
    const id = randomId();
    const row = { id, user_id: userId, ...med, created_at: new Date().toISOString() };
    const db = supabase as any;
    await db.from('medications').insert(row);
    const newList = [...get().medications, row as Medication];
    set({ medications: newList, lastLoaded: null });
    await schedulePerMedicationReminders(newList).catch(() => {});
  },

  updateMedication: async (id, updates) => {
    const db = supabase as any;
    await db.from('medications').update(updates).eq('id', id);
    const newList = get().medications.map((m) => m.id === id ? { ...m, ...updates } : m);
    set({ medications: newList, lastLoaded: null });
    await schedulePerMedicationReminders(newList).catch(() => {});
  },

  deleteMedication: async (id) => {
    const db = supabase as any;
    await db.from('medications').update({ active: false }).eq('id', id);
    const newList = get().medications.filter((m) => m.id !== id);
    set({ medications: newList, lastLoaded: null });
    await schedulePerMedicationReminders(newList).catch(() => {});
  },

  addSubstance: async (userId, sub) => {
    const id = randomId();
    const row = { id, user_id: userId, ...sub, active: true, created_at: new Date().toISOString() };
    const db = supabase as any;
    await db.from('user_substances').insert(row);
    set({ substances: [...get().substances, row as UserSubstance], lastLoaded: null });
  },

  deleteSubstance: async (id) => {
    const db = supabase as any;
    await db.from('user_substances').update({ active: false }).eq('id', id);
    set({ substances: get().substances.filter((s) => s.id !== id), lastLoaded: null });
  },
}));
