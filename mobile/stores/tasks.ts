import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnergyLevel = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  energy_level: EnergyLevel;
  due_date: string;         // YYYY-MM-DD
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface TasksStore {
  // keyed by YYYY-MM-DD → Task[]
  byDate: Record<string, Task[]>;
  isLoading: boolean;

  loadDate:   (userId: string, date: string) => Promise<void>;
  loadRange:  (userId: string, from: string, to: string) => Promise<void>;
  addTask:    (userId: string, title: string, dueDate: string, energy?: EnergyLevel, notes?: string) => Promise<void>;
  toggleDone: (taskId: string, dueDate: string) => Promise<void>;
  deleteTask: (taskId: string, dueDate: string) => Promise<void>;
}

// ─── Local storage helpers ────────────────────────────────────────────────────

const localKey = (userId: string, date: string) => `equi_tasks_${userId}_${date}`;

async function saveLocalDate(userId: string, date: string, tasks: Task[]) {
  await AsyncStorage.setItem(localKey(userId, date), JSON.stringify(tasks));
}

async function getLocalDate(userId: string, date: string): Promise<Task[] | null> {
  const raw = await AsyncStorage.getItem(localKey(userId, date));
  return raw ? (JSON.parse(raw) as Task[]) : null;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTasksStore = create<TasksStore>((set, get) => ({
  byDate: {},
  isLoading: false,

  async loadDate(userId, date) {
    // 1. Serve from local cache immediately (no loading flicker)
    const cached = await getLocalDate(userId, date);
    if (cached) {
      set((s) => ({ byDate: { ...s.byDate, [date]: cached } }));
    } else {
      set({ isLoading: true });
    }

    // 2. Fetch from Supabase in the background
    const { data } = await (supabase as any)
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('due_date', date)
      .order('created_at', { ascending: true });

    if (data) {
      const tasks = data as Task[];
      set((s) => ({ byDate: { ...s.byDate, [date]: tasks }, isLoading: false }));
      await saveLocalDate(userId, date, tasks);
    } else {
      set({ isLoading: false });
    }
  },

  async loadRange(userId, from, to) {
    // 1. Try local cache for each date in range
    const { data } = await (supabase as any)
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', from)
      .lte('due_date', to)
      .order('created_at', { ascending: true });

    if (!data) return;

    // Group by date and persist each date locally
    const grouped: Record<string, Task[]> = {};
    for (const task of data as Task[]) {
      if (!grouped[task.due_date]) grouped[task.due_date] = [];
      grouped[task.due_date].push(task);
    }
    set((s) => ({ byDate: { ...s.byDate, ...grouped } }));

    // Save each date to AsyncStorage
    await Promise.all(
      Object.entries(grouped).map(([date, tasks]) => saveLocalDate(userId, date, tasks)),
    );
  },

  async addTask(userId, title, dueDate, energy = 'medium', notes) {
    // 1. Optimistic local task (with temp id so UI responds instantly)
    const tempId = `temp_${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      user_id: userId,
      title: title.trim(),
      energy_level: energy,
      due_date: dueDate,
      completed_at: null,
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    };
    const withOptimistic = [...(get().byDate[dueDate] ?? []), optimistic];
    set((s) => ({ byDate: { ...s.byDate, [dueDate]: withOptimistic } }));
    await saveLocalDate(userId, dueDate, withOptimistic);

    // 2. Persist to Supabase and replace temp task with real one
    const { data } = await (supabase as any)
      .from('tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        energy_level: energy,
        due_date: dueDate,
        completed_at: null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (data) {
      const updated = (get().byDate[dueDate] ?? []).map((t) =>
        t.id === tempId ? (data as Task) : t,
      );
      set((s) => ({ byDate: { ...s.byDate, [dueDate]: updated } }));
      await saveLocalDate(userId, dueDate, updated);
    }
  },

  async toggleDone(taskId, dueDate) {
    const tasks = get().byDate[dueDate] ?? [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const completedAt = task.completed_at ? null : new Date().toISOString();

    // Optimistic update → local cache → then Supabase
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed_at: completedAt } : t,
    );
    set((s) => ({ byDate: { ...s.byDate, [dueDate]: updated } }));
    await saveLocalDate(task.user_id, dueDate, updated);

    await (supabase as any)
      .from('tasks')
      .update({ completed_at: completedAt })
      .eq('id', taskId);
  },

  async deleteTask(taskId, dueDate) {
    const tasks = get().byDate[dueDate] ?? [];
    const task = tasks.find((t) => t.id === taskId);
    const updated = tasks.filter((t) => t.id !== taskId);

    // Optimistic remove → local cache → then Supabase
    set((s) => ({ byDate: { ...s.byDate, [dueDate]: updated } }));
    if (task) await saveLocalDate(task.user_id, dueDate, updated);

    // Don't try to delete temp tasks that never made it to Supabase
    if (!taskId.startsWith('temp_')) {
      await (supabase as any).from('tasks').delete().eq('id', taskId);
    }
  },
}));
