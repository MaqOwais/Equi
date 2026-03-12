import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

function storageKey(userId: string, date: string) {
  return `equi_sub_logs_${userId}_${date}`;
}

interface SubstanceLogsStore {
  /** substanceId → true if used today */
  logs: Record<string, boolean>;
  isLoaded: boolean;

  load:   (userId: string, date: string) => Promise<void>;
  toggle: (userId: string, date: string, substanceId: string) => Promise<void>;
}

export const useSubstanceLogsStore = create<SubstanceLogsStore>((set, get) => ({
  logs: {},
  isLoaded: false,

  async load(userId, date) {
    const raw = await AsyncStorage.getItem(storageKey(userId, date));
    const logs = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    set({ logs, isLoaded: true });
  },

  async toggle(userId, date, substanceId) {
    const logs = { ...get().logs, [substanceId]: !get().logs[substanceId] };
    set({ logs });
    await AsyncStorage.setItem(storageKey(userId, date), JSON.stringify(logs));
  },
}));
