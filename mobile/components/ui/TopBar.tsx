import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useNotificationsStore } from '../../stores/notifications';
import type { CycleState } from '../../types/database';

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};

export function TopBar() {
  const { profile } = useAuthStore();
  const today = useTodayStore();
  const notifs = useNotificationsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const cycleState: CycleState = today.cycleState ?? profile?.current_cycle_state ?? 'stable';
  const cycleColor = CYCLE_COLORS[cycleState];
  const initial = profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : '?';

  // Simple unread badge — true if notifications are enabled but no prefs loaded yet,
  // or if post_crisis check-in is pending (extend as needed)
  const hasUnread = notifs.prefs?.post_crisis_enabled && today.moodScore === null;

  return (
    <View style={[s.container, { paddingTop: insets.top + 4 }]}>

      {/* ── Left: App logo ─────────────────────────────────── */}
      <View style={s.logoWrap}>
        <View style={[s.logoMark, { backgroundColor: cycleColor }]}>
          <View style={s.logoInner} />
        </View>
        <Text style={s.logoText}>equi</Text>
      </View>

      {/* ── Right: Notifications + Profile ─────────────────── */}
      <View style={s.rightGroup}>

        {/* Notification bell */}
        <TouchableOpacity
          style={s.bellBtn}
          onPress={() => router.push('/(tabs)/you/notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#3D3935" />
          {hasUnread && <View style={[s.badge, { backgroundColor: cycleColor }]} />}
        </TouchableOpacity>

        {/* Profile avatar */}
        <TouchableOpacity
          style={[s.avatar, { backgroundColor: cycleColor }]}
          onPress={() => router.push('/(tabs)/you')}
          activeOpacity={0.8}
        >
          <Text style={s.avatarInitial}>{initial}</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },

  // Logo
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  logoInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  logoText: {
    fontSize: 20, fontWeight: '700', color: '#3D3935',
    letterSpacing: -0.5,
  },

  // Right group
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Bell
  bellBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },

  // Avatar
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
