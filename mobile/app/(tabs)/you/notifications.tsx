import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications';
import type { NotificationPreferences } from '../../../types/database';

// ─── Inline time picker (reused from routine.tsx pattern) ─────────────────────

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

function NotifRow({
  icon, title, sub, enabled, onToggle, expandable, children,
}: {
  icon: string; title: string; sub: string;
  enabled: boolean; onToggle: (v: boolean) => void;
  expandable?: boolean; children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

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
      {enabled && expandable && (
        <TouchableOpacity
          style={nr.timeRow}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={nr.timeLabel}>Time</Text>
          <Text style={nr.timeChevron}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      )}
      {enabled && expandable && expanded && children}
    </View>
  );
}

const nr = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon: { fontSize: 20, marginRight: 12, width: 28 },
  title: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  sub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2, lineHeight: 16 },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  timeLabel: { fontSize: 14, color: '#3D3935', opacity: 0.5 },
  timeChevron: { fontSize: 12, color: '#3D3935', opacity: 0.3 },
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
        <Text style={s.subtitle}>All notifications are strictly opt-in and skip automatically if you've already logged.</Text>

        {/* Reminders */}
        <Text style={s.sectionLabel}>REMINDERS</Text>

        <NotifRow
          icon="😊" title="Mood check-in" sub="Daily reminder to log how you're feeling"
          enabled={p.checkin_enabled}
          onToggle={(v) => update({ checkin_enabled: v })}
          expandable
        >
          <View style={s.pickerWrap}>
            <TimePicker
              value={p.checkin_time}
              onChange={(t) => update({ checkin_time: t })}
            />
          </View>
        </NotifRow>

        <NotifRow
          icon="💊" title="Medication reminder" sub="Shown only if medication tracking is on"
          enabled={p.medication_enabled}
          onToggle={(v) => update({ medication_enabled: v })}
          expandable
        >
          <View style={s.pickerWrap}>
            <TimePicker
              value={p.medication_time}
              onChange={(t) => update({ medication_time: t })}
            />
          </View>
        </NotifRow>

        {/* Insights */}
        <Text style={s.sectionLabel}>INSIGHTS</Text>

        <NotifRow
          icon="📊" title="Weekly report ready" sub="Sunday 10:00 AM when your report is generated"
          enabled={p.weekly_report_enabled}
          onToggle={(v) => update({ weekly_report_enabled: v })}
        />

        <NotifRow
          icon="⚡" title="Early warnings" sub="When AI detects patterns matching your relapse signatures"
          enabled={p.early_warning_enabled}
          onToggle={(v) => update({ early_warning_enabled: v })}
        />

        {/* Routine */}
        <Text style={s.sectionLabel}>ROUTINE</Text>

        <NotifRow
          icon="🗓" title="Anchor nudges" sub="15 minutes before each of your routine anchor times"
          enabled={p.anchor_nudges_enabled}
          onToggle={(v) => update({ anchor_nudges_enabled: v })}
        />

        {/* Safety */}
        <Text style={s.sectionLabel}>SAFETY</Text>

        <NotifRow
          icon="🛟" title="Post-crisis check-in" sub="Check-in 24 hours after using the SOS button"
          enabled={p.post_crisis_enabled}
          onToggle={(v) => update({ post_crisis_enabled: v })}
        />

        <View style={s.noteCard}>
          <Text style={s.noteText}>
            Equi never sends engagement notifications or "you haven't opened the app" reminders.
            All notifications are skipped automatically if you've already logged for the day.
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

  pickerWrap: {
    borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingBottom: 8,
  },

  noteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4,
  },
  noteText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: '#3D3935', opacity: 0.4 },
});
