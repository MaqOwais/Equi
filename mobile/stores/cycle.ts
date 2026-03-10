import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState } from '../types/database';

export interface CycleLogEntry {
  date: string;        // YYYY-MM-DD
  state: CycleState;
  intensity: number;   // 1-10
}

interface CycleStore {
  logs: CycleLogEntry[];   // last 90 days, oldest first
  currentState: CycleState;
  load90Days: (userId: string) => Promise<void>;
}

export const useCycleStore = create<CycleStore>((set) => ({
  logs: [],
  currentState: 'stable',

  load90Days: async (userId) => {
    const from = new Date();
    from.setDate(from.getDate() - 90);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('cycle_logs')
      .select('logged_at, state, intensity')
      .eq('user_id', userId)
      .gte('logged_at', fromStr)
      .order('logged_at', { ascending: true });

    const logs: CycleLogEntry[] = (data ?? []).map((r) => ({
      date: r.logged_at as string,
      state: r.state as CycleState,
      intensity: (r.intensity as number) ?? 5,
    }));

    set({
      logs,
      currentState: logs.length > 0 ? logs[logs.length - 1].state : 'stable',
    });
  },
}));
