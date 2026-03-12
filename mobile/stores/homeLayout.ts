import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Section registry ─────────────────────────────────────────────────────────

export type SectionId =
  | 'hero'
  | 'mood'
  | 'cycle'
  | 'journal'
  | 'tasks'
  | 'sleep'
  | 'checkins'
  | 'focus'
  | 'suggested'
  | 'ai_insight'
  | 'explore'
  | 'nutrition'
  | 'activities'
  | 'social'
  | 'wearable';

export const SECTION_META: Record<SectionId, { label: string; icon: string; desc: string }> = {
  hero:       { label: 'Daily Card',      icon: '⚡', desc: 'Smart tip based on your cycle state' },
  mood:       { label: 'Mood',            icon: '😊', desc: 'Log your daily mood score' },
  cycle:      { label: 'Cycle State',     icon: '🔄', desc: 'Log today\'s episode state' },
  journal:    { label: 'Journal',         icon: '📖', desc: 'Quick-jump to today\'s entry' },
  tasks:      { label: 'Tasks',           icon: '✅', desc: 'Your daily to-do list' },
  sleep:      { label: 'Sleep',           icon: '🌙', desc: 'Log last night\'s sleep' },
  checkins:   { label: 'Check-ins',       icon: '💊', desc: 'Medications, substances & routine' },
  focus:      { label: "Today's Focus",   icon: '🎯', desc: 'Cycle-aware wellbeing tip' },
  suggested:  { label: 'Suggested',       icon: '🌿', desc: 'Recommended activities for you' },
  ai_insight: { label: 'AI Insight',      icon: '✦', desc: 'Weekly AI pattern analysis' },
  explore:    { label: 'Explore',         icon: '🗺', desc: 'Quick links to all features' },
  nutrition:  { label: 'Nutrition',       icon: '🥗', desc: 'Log today\'s food quality' },
  activities: { label: 'Activities',      icon: '🏃', desc: 'Browse & complete activities' },
  social:     { label: 'Social',          icon: '💬', desc: 'Community & social rhythm score' },
  wearable:   { label: 'Wearable',        icon: '⌚', desc: 'Steps, heart rate & health data' },
};

// Sections shown by default on the home screen
export const DEFAULT_ORDER: SectionId[] = [
  'hero', 'mood', 'cycle', 'journal', 'tasks', 'sleep', 'checkins', 'focus', 'suggested', 'ai_insight', 'explore',
];

// All sections ever available (including those hidden by default)
export const ALL_SECTIONS: SectionId[] = [
  ...DEFAULT_ORDER, 'nutrition', 'activities', 'social', 'wearable',
];

const STORAGE_KEY = 'equi_home_layout_v2';

// ─── Store ────────────────────────────────────────────────────────────────────

interface HomeLayoutStore {
  order: SectionId[];   // only the VISIBLE sections, in display order
  isLoaded: boolean;

  load:     () => Promise<void>;
  moveUp:   (id: SectionId) => Promise<void>;
  moveDown: (id: SectionId) => Promise<void>;
  show:     (id: SectionId) => Promise<void>;
  hide:     (id: SectionId) => Promise<void>;
  reset:    () => Promise<void>;
}

async function persist(order: SectionId[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export const useHomeLayoutStore = create<HomeLayoutStore>((set, get) => ({
  order: DEFAULT_ORDER,
  isLoaded: false,

  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as SectionId[];
      // Keep only valid section IDs; newly added defaults don't auto-appear
      // (user opted out explicitly by not having them in their saved order)
      const valid = saved.filter((id) => ALL_SECTIONS.includes(id));
      set({ order: valid, isLoaded: true });
    } else {
      set({ isLoaded: true });
    }
  },

  async moveUp(id) {
    const order = [...get().order];
    const idx = order.indexOf(id);
    if (idx <= 0) return;
    [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    set({ order });
    await persist(order);
  },

  async moveDown(id) {
    const order = [...get().order];
    const idx = order.indexOf(id);
    if (idx < 0 || idx >= order.length - 1) return;
    [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
    set({ order });
    await persist(order);
  },

  async show(id) {
    if (get().order.includes(id)) return;
    const order = [...get().order, id];
    set({ order });
    await persist(order);
  },

  async hide(id) {
    const order = get().order.filter((s) => s !== id);
    set({ order });
    await persist(order);
  },

  async reset() {
    set({ order: DEFAULT_ORDER });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
