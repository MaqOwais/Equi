import { create } from 'zustand';

interface CrisisStore {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useCrisisStore = create<CrisisStore>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
