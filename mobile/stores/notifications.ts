import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotifications,
  applyNotificationPreferences,
} from '../lib/notifications';
import type { NotificationPreferences } from '../types/database';

const DEFAULTS: Omit<NotificationPreferences, 'id' | 'user_id' | 'push_token' | 'push_token_updated_at' | 'updated_at'> = {
  checkin_enabled: true,
  checkin_time: '20:00:00',
  checkin_ring: false,
  journal_enabled: false,
  journal_time: '21:00:00',
  journal_ring: false,
  sleep_log_enabled: false,
  sleep_log_time: '09:00:00',
  sleep_log_ring: false,
  activity_reminder_enabled: false,
  activity_reminder_time: '15:00:00',
  activity_reminder_ring: false,
  weekly_report_enabled: true,
  early_warning_enabled: true,
  anchor_nudges_enabled: false,
  anchor_nudges_ring: false,
  post_crisis_enabled: false,
};

interface NotificationsStore {
  prefs: NotificationPreferences | null;
  isLoading: boolean;

  load: (userId: string) => Promise<void>;
  save: (userId: string, updates: Partial<NotificationPreferences>) => Promise<void>;
  registerToken: (userId: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  prefs: null,
  isLoading: false,

  load: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const prefs = data
      ? (data as NotificationPreferences)
      : await (async () => {
          const { data: created } = await supabase
            .from('notification_preferences')
            .insert({ user_id: userId, ...DEFAULTS })
            .select()
            .single();
          return created as NotificationPreferences | null;
        })();

    set({ prefs, isLoading: false });

    // Re-apply all scheduled notifications on every load (handles reinstall / data wipe)
    if (prefs) {
      const { data: anchorsData } = await supabase
        .from('routine_anchors')
        .select('anchor_name, target_time')
        .eq('user_id', userId)
        .not('target_time', 'is', null);
      const anchors = (anchorsData ?? []) as { anchor_name: string; target_time: string }[];
      applyNotificationPreferences(prefs, anchors).catch(() => {});
    }
  },

  save: async (userId, updates) => {
    const current = get().prefs;
    const merged = { ...(current ?? {}), ...updates } as NotificationPreferences;

    // Optimistic update
    set({ prefs: merged });

    await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    // Fetch user's anchors for nudge scheduling
    const { data: anchorsData } = await supabase
      .from('routine_anchors')
      .select('anchor_name, target_time')
      .eq('user_id', userId)
      .not('target_time', 'is', null);

    const anchors = (anchorsData ?? []) as { anchor_name: string; target_time: string }[];
    await applyNotificationPreferences(merged, anchors).catch(() => {});
  },

  registerToken: async (userId) => {
    const token = await registerForPushNotifications();
    if (!token) return;

    await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: userId, push_token: token, push_token_updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    set((s) => ({
      prefs: s.prefs ? { ...s.prefs, push_token: token } : s.prefs,
    }));
  },
}));
