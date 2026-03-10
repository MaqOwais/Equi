import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications';
import type { NotificationPreferences } from '../../../types/database';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// ─── Expo Go banner ───────────────────────────────────────────────────────────

function ExpoGoBanner() {
  if (!IS_EXPO_GO) return null;
  return (
    <View style={banner.wrap}>
      <Text style={banner.icon}>📵</Text>
      <View style={{ flex: 1 }}>
        <Text style={banner.title}>Notifications disabled in Expo Go</Text>
        <Text style={banner.body}>
          Your preferences are saved and will activate in a dev or production build.
          Expo Go removed push notification support in SDK 53.
        </Text>
      </View>
    </View>
  );
}

const banner = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8E7', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  icon: { fontSize: 20, marginTop: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#3D3935', marginBottom: 3 },
  body: { fontSize: 12, color: '#3D3935', opacity: 0.55, lineHeight: 17 },
});

// ─── Inline time picker (12h) ─────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.slice(0, 5).split(':').map(Number);

  function adj(field: 'h' | 'm', delta: number) {
    if (field === 'h') {
      const next = (h + delta + 24) % 24;
      onChange(`${String(next).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    } else {
      const next = (m + delta + 60) % 60;
      onChange(`${String(h).padStart(2, '0')}:${String(next).padStart(2, '0')}:00`);
    }
  }

  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  return (
    <View style={tp.row}>
      <View style={tp.col}>
        <TouchableOpacity onPress={() => adj('h', 1)} style={tp.arrow}><Text style={tp.arrowText}>▲</Text></TouchableOpacity>
        <Text style={tp.value}>{String(h12).padStart(2, '0')}</Text>
        <TouchableOpacity onPress={() => adj('h', -1)} style={tp.arrow}><Text style={tp.arrowText}>▼</Text></TouchableOpacity>
      </View>
      <Text style={tp.colon}>:</Text>
      <View style={tp.col}>
        <TouchableOpacity onPress={() => adj('m', 15)} style={tp.arrow}><Text style={tp.arrowText}>▲</Text></TouchableOpacity>
        <Text style={tp.value}>{String(m).padStart(2, '0')}</Text>
        <TouchableOpacity onPress={() => adj('m', -15)} style={tp.arrow}><Text style={tp.arrowText}>▼</Text></TouchableOpacity>
      </View>
      <Text style={tp.period}>{period}</Text>
    </View>
  );
}

const tp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  col: { alignItems: 'center', width: 52 },
  arrow: { padding: 8 },
  arrowText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },
  value: { fontSize: 26, fontWeight: '700', color: '#3D3935' },
  colon: { fontSize: 26, fontWeight: '700', color: '#3D3935', marginHorizontal: 6, marginBottom: 4 },
  period: { fontSize: 16, fontWeight: '600', color: '#3D3935', opacity: 0.5, marginLeft: 8, marginTop: 2 },
});

// ─── Notification row ─────────────────────────────────────────────────────────

/**
 * expandable: shows time picker when enabled
 * ringKey: if provided, shows a ring sub-toggle when expanded
 */
function NotifRow({
  icon, title, sub, enabled, onToggle, timeValue, onTimeChange, ringEnabled, onRingToggle,
}: {
  icon: string; title: string; sub: string;
  enabled: boolean; onToggle: (v: boolean) => void;
  timeValue?: string; onTimeChange?: (t: string) => void;
  ringEnabled?: boolean; onRingToggle?: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasTime = !!timeValue && !!onTimeChange;

  return (
    <View style={nr.card}>
      <View style={nr.row}>
        <Text style={nr.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={nr.title}>{title}</Text>
          <Text style={nr.sub}>{sub}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: '#A8C5A0', false: '#E0DDD8' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {enabled && hasTime && (
        <TouchableOpacity style={nr.expandRow} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
          <Text style={nr.expandLabel}>Time</Text>
          <Text style={nr.expandChevron}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      )}

      {enabled && hasTime && expanded && (
        <>
          <View style={nr.pickerWrap}>
            <TimePicker value={timeValue!} onChange={onTimeChange!} />
          </View>
          {ringEnabled !== undefined && onRingToggle && (
            <View style={nr.ringRow}>
              <View>
                <Text style={nr.ringLabel}>🔔 Ring alarm</Text>
                <Text style={nr.ringSub}>Loud sound instead of silent vibration</Text>
              </View>
              <Switch
                value={ringEnabled}
                onValueChange={onRingToggle}
                trackColor={{ true: '#A8C5A0', false: '#E0DDD8' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const nr = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon: { fontSize: 20, marginRight: 12, width: 28 },
  title: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  sub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2, lineHeight: 16 },
  expandRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  expandLabel: { fontSize: 14, color: '#3D3935', opacity: 0.5 },
  expandChevron: { fontSize: 12, color: '#3D3935', opacity: 0.3 },
  pickerWrap: { borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingBottom: 8 },
  ringRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
    backgroundColor: '#F7F3EE',
  },
  ringLabel: { fontSize: 14, fontWeight: '500', color: '#3D3935' },
  ringSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { session } = useAuthStore();
  const notifs = useNotificationsStore();
  const router = useRouter();
  const userId = session?.user.id;

  const p = notifs.prefs;

  useEffect(() => {
    if (userId) notifs.load(userId);
  }, [userId]);

  function update(updates: Partial<NotificationPreferences>) {
    if (!userId) return;
    notifs.save(userId, updates);
  }

  async function sendTestNotification() {
    if (IS_EXPO_GO) {
      Alert.alert('Not available in Expo Go', 'Build a dev or production build to test notifications.');
      return;
    }
    try {
      const N = require('expo-notifications');
      await N.scheduleNotificationAsync({
        content: {
          title: '✅ Notifications are working',
          body: 'Your Equi reminders will fire at the times you set.',
          sound: true,
        },
        trigger: null, // immediate
      });
    } catch {
      Alert.alert('Error', 'Could not send test notification. Check device permissions.');
    }
  }

  if (!p) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>Loading preferences…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Notifications</Text>
        <Text style={s.subtitle}>
          All notifications are opt-in and skipped automatically if you've already logged.
          {'\n'}Ring mode plays an alarm sound — use for critical reminders like medications.
        </Text>

        <ExpoGoBanner />

        {!IS_EXPO_GO && (
          <TouchableOpacity style={s.testBtn} onPress={sendTestNotification} activeOpacity={0.7}>
            <Text style={s.testBtnTxt}>Send test notification</Text>
          </TouchableOpacity>
        )}

        {/* Daily reminders */}
        <Text style={s.sectionLabel}>DAILY REMINDERS</Text>

        <NotifRow
          icon="😊"
          title="Mood check-in"
          sub="Daily reminder to log how you're feeling"
          enabled={p.checkin_enabled}
          onToggle={(v) => update({ checkin_enabled: v })}
          timeValue={p.checkin_time}
          onTimeChange={(t) => update({ checkin_time: t })}
          ringEnabled={p.checkin_ring ?? false}
          onRingToggle={(v) => update({ checkin_ring: v })}
        />

        <NotifRow
          icon="📓"
          title="Journal prompt"
          sub="Evening reminder to reflect on your day"
          enabled={p.journal_enabled ?? false}
          onToggle={(v) => update({ journal_enabled: v })}
          timeValue={p.journal_time ?? '21:00:00'}
          onTimeChange={(t) => update({ journal_time: t })}
          ringEnabled={p.journal_ring ?? false}
          onRingToggle={(v) => update({ journal_ring: v })}
        />

        <NotifRow
          icon="🌙"
          title="Sleep log"
          sub="Morning reminder to log last night's sleep"
          enabled={p.sleep_log_enabled ?? false}
          onToggle={(v) => update({ sleep_log_enabled: v })}
          timeValue={p.sleep_log_time ?? '09:00:00'}
          onTimeChange={(t) => update({ sleep_log_time: t })}
          ringEnabled={p.sleep_log_ring ?? false}
          onRingToggle={(v) => update({ sleep_log_ring: v })}
        />

        <NotifRow
          icon="🌿"
          title="Activity reminder"
          sub="Nudge to try a wellbeing activity today"
          enabled={p.activity_reminder_enabled ?? false}
          onToggle={(v) => update({ activity_reminder_enabled: v })}
          timeValue={p.activity_reminder_time ?? '15:00:00'}
          onTimeChange={(t) => update({ activity_reminder_time: t })}
          ringEnabled={p.activity_reminder_ring ?? false}
          onRingToggle={(v) => update({ activity_reminder_ring: v })}
        />

        {/* Medication reminders — managed per-medication */}
        <Text style={s.sectionLabel}>MEDICATIONS</Text>
        <TouchableOpacity style={s.linkCard} onPress={() => router.push('/(tabs)/you/medications')} activeOpacity={0.7}>
          <Text style={s.linkIcon}>💊</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.linkTitle}>Per-medication reminders</Text>
            <Text style={s.linkSub}>Set times and ring mode for each medication individually</Text>
          </View>
          <Text style={s.linkChevron}>›</Text>
        </TouchableOpacity>

        {/* Insights */}
        <Text style={s.sectionLabel}>INSIGHTS</Text>

        <NotifRow
          icon="📊"
          title="Weekly report ready"
          sub="Sunday 10:00 AM when your report is generated"
          enabled={p.weekly_report_enabled}
          onToggle={(v) => update({ weekly_report_enabled: v })}
        />

        <NotifRow
          icon="⚡"
          title="Early warnings"
          sub="When AI detects patterns matching your relapse signatures"
          enabled={p.early_warning_enabled}
          onToggle={(v) => update({ early_warning_enabled: v })}
        />

        {/* Routine */}
        <Text style={s.sectionLabel}>ROUTINE</Text>

        <NotifRow
          icon="🗓"
          title="Anchor nudges"
          sub="15 minutes before each of your routine anchor times"
          enabled={p.anchor_nudges_enabled}
          onToggle={(v) => update({ anchor_nudges_enabled: v })}
          ringEnabled={p.anchor_nudges_ring ?? false}
          onRingToggle={(v) => update({ anchor_nudges_ring: v })}
        />

        {/* Safety */}
        <Text style={s.sectionLabel}>SAFETY</Text>

        <NotifRow
          icon="🛟"
          title="Post-crisis check-in"
          sub="Check-in 24 hours after using the SOS button"
          enabled={p.post_crisis_enabled}
          onToggle={(v) => update({ post_crisis_enabled: v })}
        />

        <View style={s.noteCard}>
          <Text style={s.noteText}>
            Equi never sends engagement or "you haven't opened the app" notifications.
            {'\n\n'}Ring alarms require notification permissions at the device level to sound. Go to device Settings › Notifications › Equi to confirm.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  linkCard: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  linkIcon: { fontSize: 20, marginRight: 12, width: 28 },
  linkTitle: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  linkSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  linkChevron: { fontSize: 20, color: '#3D3935', opacity: 0.2 },

  noteCard: {
    backgroundColor: '#F7F3EE', borderRadius: 12, padding: 14, marginTop: 4,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  noteText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },

  testBtn: {
    backgroundColor: '#A8C5A015', borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#A8C5A040',
  },
  testBtnTxt: { fontSize: 14, fontWeight: '600', color: '#A8C5A0' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: '#3D3935', opacity: 0.4 },
});
