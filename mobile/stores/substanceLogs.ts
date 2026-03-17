import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubLog { used: boolean; amount: number }

function storageKey(userId: string, date: string) {
  return `equi_sub_logs_${userId}_${date}`;
}

interface SubstanceLogsStore {
  /** substanceId → { used, amount } */
  logs: Record<string, SubLog>;
  isLoaded: boolean;

  load:      (userId: string, date: string) => Promise<void>;
  toggle:    (userId: string, date: string, substanceId: string) => Promise<void>;
  setAmount: (userId: string, date: string, substanceId: string, delta: number) => Promise<void>;
}

export const useSubstanceLogsStore = create<SubstanceLogsStore>((set, get) => ({
  logs: {},
  isLoaded: false,

  async load(userId, date) {
    const raw = await AsyncStorage.getItem(storageKey(userId, date));
    if (!raw) { set({ logs: {}, isLoaded: true }); return; }
    const parsed = JSON.parse(raw) as Record<string, boolean | SubLog>;
    // Migrate old boolean format → { used, amount }
    const logs: Record<string, SubLog> = {};
    for (const [id, val] of Object.entries(parsed)) {
      if (typeof val === 'boolean') {
        logs[id] = { used: val, amount: 1 };
      } else {
        logs[id] = val;
      }
    }
    set({ logs, isLoaded: true });
  },

  async toggle(userId, date, substanceId) {
    const prev = get().logs[substanceId];
    const logs = {
      ...get().logs,
      [substanceId]: { used: !prev?.used, amount: prev?.amount ?? 1 },
    };
    set({ logs });
    await AsyncStorage.setItem(storageKey(userId, date), JSON.stringify(logs));
  },

  async setAmount(userId, date, substanceId, delta) {
    const prev = get().logs[substanceId] ?? { used: true, amount: 0 };
    const newAmount = Math.max(0, prev.amount + delta);
    const logs = {
      ...get().logs,
      [substanceId]: { used: newAmount > 0, amount: newAmount },
    };
    set({ logs });
    await AsyncStorage.setItem(storageKey(userId, date), JSON.stringify(logs));
  },
}));
