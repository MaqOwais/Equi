/**
 * Pinned items store.
 *
 * Users can pin individual activities, the Bipolar Workbook, individual
 * routine anchors, or the full Daily Routine to their home screen.
 * Pins appear in a "PINNED" section at the top of the home tab.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'equi_pinned_items_v1';

export type PinType = 'activity' | 'workbook' | 'routine' | 'routine_anchor';

export interface PinnedItem {
  id: string;          // unique: 'act_{activityId}', 'workbook', 'routine', 'anchor_{name}'
  type: PinType;
  label: string;
  icon: string;
  route: string;
  accentColor?: string; // optional cycle-phase accent
}

interface PinsStore {
  items: PinnedItem[];
  loaded: boolean;

  load: () => Promise<void>;
  pin: (item: PinnedItem) => Promise<void>;
  unpin: (id: string) => Promise<void>;
  isPinned: (id: string) => boolean;
}

async function persist(items: PinnedItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const usePinsStore = create<PinsStore>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const items: PinnedItem[] = raw ? JSON.parse(raw) : [];
      set({ items, loaded: true });
    } catch {
      set({ items: [], loaded: true });
    }
  },

  pin: async (item) => {
    const { items } = get();
    if (items.some((p) => p.id === item.id)) return; // already pinned
    const next = [...items, item];
    set({ items: next });
    await persist(next);
  },

  unpin: async (id) => {
    const next = get().items.filter((p) => p.id !== id);
    set({ items: next });
    await persist(next);
  },

  isPinned: (id) => get().items.some((p) => p.id === id),
}));
