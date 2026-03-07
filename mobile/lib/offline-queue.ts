/**
 * Offline write queue — Phase 5B.
 *
 * Core tracking writes (mood, cycle, journal) are queued locally when offline
 * and flushed on next connection restore.
 *
 * Wire flushQueue() to NetInfo in app/_layout.tsx:
 *   import NetInfo from '@react-native-community/netinfo'; (install when on dev client)
 *   NetInfo.addEventListener((state) => { if (state.isConnected) flushQueue(); });
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

interface QueuedWrite {
  id: string;
  table: string;
  row: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'equi_offline_queue';

export async function enqueue(table: string, row: Record<string, unknown>): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const existing: QueuedWrite[] = raw ? JSON.parse(raw) : [];
  existing.push({
    id: Math.random().toString(36).slice(2),
    table,
    row,
    timestamp: Date.now(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
}

export async function flushQueue(): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue: QueuedWrite[] = JSON.parse(raw);
  if (queue.length === 0) return;

  const failed: QueuedWrite[] = [];
  for (const item of queue) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(item.table).insert(item.row);
    if (error) failed.push(item);
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
}

export async function queueLength(): Promise<number> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return 0;
  return (JSON.parse(raw) as QueuedWrite[]).length;
}
