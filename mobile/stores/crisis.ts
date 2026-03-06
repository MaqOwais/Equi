import { create } from 'zustand';
import { schedulePostCrisisCheckin } from '../lib/notifications';

interface CrisisStore {
  visible: boolean;
  lastOpenedAt: number | null;   // Unix ms — used to schedule 24h check-in
  open: (postCrisisEnabled?: boolean) => void;
  close: () => void;
}

export const useCrisisStore = create<CrisisStore>((set) => ({
  visible: false,
  lastOpenedAt: null,

  open: (postCrisisEnabled = false) => {
    const now = Date.now();
    set({ visible: true, lastOpenedAt: now });
    if (postCrisisEnabled) {
      schedulePostCrisisCheckin(now).catch(() => {});
    }
  },

  close: () => set({ visible: false }),
}));
