import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { useSocialRhythmStore } from '../../../stores/socialRhythm';
import { supabase } from '../../../lib/supabase';
import { nowHHMM } from '../../../utils/socialRhythm';
import type { RoutineAnchor } from '../../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const ANCHORS = [
  { name: 'wake',          label: 'Wake',          icon: '🌅', default: '07:00' },
  { name: 'first_meal',    label: 'First Meal',    icon: '🍳', default: '08:00' },
  { name: 'first_contact', label: 'First Contact', icon: '👋', default: '09:00' },
  { name: 'work_start',    label: 'Work Start',    icon: '💼', default: '09:30' },
  { name: 'dinner',        label: 'Dinner',        icon: '🍽',  default: '19:00' },
  { name: 'bedtime',       label: 'Bedtime',       icon: '🌙', default: '23:00' },
];

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Inline time picker ────────────────────────────────────────────────────────

function TimePicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':').map(Number);

  function adjustHour(delta: 1 | -1) {
    const next = (h + delta + 24) % 24;
    onChange(`${String(next).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  function adjustMinute(delta: 15 | -15) {
    const nextM = (m + delta + 60) % 60;
    onChange(`${String(h).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
  }

  return (
    <View style={tp.row}>
      <View style={tp.col}>
        <TouchableOpacity onPress={() => adjustHour(1)} style={tp.arrow}><Text style={tp.arrowText}>▲</Text></TouchableOpacity>
        <Text style={tp.value}>{String(h).padStart(2, '0')}</Text>
        <TouchableOpacity onPress={() => adjustHour(-1)} style={tp.arrow}><Text style={tp.arrowText}>▼</Text></TouchableOpacity>
      </View>
      <Text style={tp.colon}>:</Text>
      <View style={tp.col}>
        <TouchableOpacity onPress={() => adjustMinute(15)} style={tp.arrow}><Text style={tp.arrowText}>▲</Text></TouchableOpacity>
        <Text style={tp.value}>{String(m).padStart(2, '0')}</Text>
        <TouchableOpacity onPress={() => adjustMinute(-15)} style={tp.arrow}><Text style={tp.arrowText}>▼</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const tp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  col: { alignItems: 'center', width: 56 },
  arrow: { padding: 8 },
  arrowText: { fontSize: 14, color: '#A8C5A0', fontWeight: '600' },
  value: { fontSize: 28, fontWeight: '700', color: '#3D3935' },
  colon: { fontSize: 28, fontWeight: '700', color: '#3D3935', marginHorizontal: 8, marginTop: -4 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoutineScreen() {
  const { session } = useAuthStore();
  const rhythm = useSocialRhythmStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [anchors, setAnchors] = useState<RoutineAnchor[]>([]);
  const [editingAnchor, setEditingAnchor] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('08:00');
  const [saved, setSaved] = useState(false);

  // Anchor logging state (separate from target-time editing)
  const [loggingAnchor, setLoggingAnchor] = useState<string | null>(null);
  const [logTime, setLogTime] = useState('08:00');

  useEffect(() => {
    if (userId) {
      loadAnchors();
      rhythm.load(userId);
    }
  }, [userId]);

  async function loadAnchors() {
    if (!userId) return;
    const { data } = await supabase
      .from('routine_anchors')
      .select('*')
      .eq('user_id', userId);
    setAnchors((data ?? []) as RoutineAnchor[]);
  }

  function getAnchor(name: string): RoutineAnchor | undefined {
    return anchors.find((a) => a.anchor_name === name);
  }

  function startEdit(name: string, defaultTime: string) {
    const anchor = getAnchor(name);
    setEditingTime(anchor?.target_time?.slice(0, 5) ?? defaultTime);
    setEditingAnchor(name);
    setSaved(false);
  }

  async function confirmTime() {
    if (!userId || !editingAnchor) return;
    const timeStr = `${editingTime}:00`;
    const existing = getAnchor(editingAnchor);

    if (existing) {
      await supabase.from('routine_anchors').update({ target_time: timeStr }).eq('id', existing.id);
    } else {
      await supabase.from('routine_anchors').insert({
        user_id: userId, anchor_name: editingAnchor, target_time: timeStr,
      });
    }

    setEditingAnchor(null);
    setSaved(true);
    loadAnchors();
  }

  function startLog(name: string) {
    setLoggingAnchor(name);
    // Pre-fill with existing logged time or current time
    const existing = rhythm.todayAnchorLogs.find(
      (l) => anchors.find((a) => a.id === l.anchor_id)?.anchor_name === name,
    );
    setLogTime(existing?.actual_time?.slice(0, 5) ?? nowHHMM());
    setEditingAnchor(null); // close target-time panel if open
  }

  async function confirmLog() {
    if (!userId || !loggingAnchor) return;
    const anchor = getAnchor(loggingAnchor);
    if (!anchor) return;
    await rhythm.logAnchor(userId, anchor, logTime);
    setLoggingAnchor(null);
  }

  function getLoggedTime(anchorName: string): string | null {
    const anchor = getAnchor(anchorName);
    if (!anchor) return null;
    const log = rhythm.todayAnchorLogs.find((l) => l.anchor_id === anchor.id);
    return log?.actual_time?.slice(0, 5) ?? null;
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
          {saved && <Text style={s.savedTag}>Saved</Text>}
        </View>

        <Text style={s.title}>Daily Routine</Text>
        <Text style={s.subtitle}>
          Set target times for your 6 social rhythm anchors. Consistent daily timing
          supports mood stability.
        </Text>

        {/* Anchor rows */}
        {ANCHORS.map((a) => {
          const stored = getAnchor(a.name);
          const displayTime = stored?.target_time
            ? formatDisplay(stored.target_time.slice(0, 5))
            : 'Not set';
          const isEditing = editingAnchor === a.name;
          const isLogging = loggingAnchor === a.name;
          const loggedTime = getLoggedTime(a.name);

          return (
            <View key={a.name} style={s.anchorCard}>
              <View style={s.anchorRow}>
                <Text style={s.anchorIcon}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.anchorLabel}>{a.label}</Text>
                  <Text style={s.anchorTime}>
                    Target: {displayTime}
                    {loggedTime ? `  ·  Logged: ${formatDisplay(loggedTime)}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => isEditing ? setEditingAnchor(null) : startEdit(a.name, a.default)}
                >
                  <Text style={s.editBtnText}>{isEditing ? 'Cancel' : 'Set'}</Text>
                </TouchableOpacity>
                {stored && (
                  <TouchableOpacity
                    style={[s.logBtn, loggedTime && s.logBtnDone]}
                    onPress={() => isLogging ? setLoggingAnchor(null) : startLog(a.name)}
                  >
                    <Text style={[s.logBtnText, loggedTime && s.logBtnTextDone]}>
                      {isLogging ? 'Cancel' : loggedTime ? '✓' : 'Log'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing && (
                <View style={s.pickerContainer}>
                  <TimePicker value={editingTime} onChange={setEditingTime} />
                  <TouchableOpacity style={s.confirmBtn} onPress={confirmTime}>
                    <Text style={s.confirmBtnText}>Confirm  ✓</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isLogging && (
                <View style={s.pickerContainer}>
                  <Text style={s.logPickerHint}>Actual time today:</Text>
                  <TimePicker value={logTime} onChange={setLogTime} />
                  <View style={s.logBtnRow}>
                    <TouchableOpacity
                      style={[s.confirmBtn, { flex: 1, marginRight: 6 }]}
                      onPress={() => { setLogTime(nowHHMM()); }}
                    >
                      <Text style={s.confirmBtnText}>Now  ({formatDisplay(nowHHMM())})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.confirmBtn, { flex: 1 }]} onPress={confirmLog}>
                      <Text style={s.confirmBtnText}>Save  ✓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={s.infoCard}>
          <Text style={s.infoText}>
            Based on IPSRT (Interpersonal and Social Rhythm Therapy) — an evidence-based approach
            for bipolar disorder that stabilises daily rhythms to help prevent mood episodes.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  savedTag: { fontSize: 12, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 20 },

  anchorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8, overflow: 'hidden',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  anchorRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  anchorIcon: { fontSize: 22, marginRight: 12 },
  anchorLabel: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  anchorTime: { fontSize: 13, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  editBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#A8C5A0',
  },
  editBtnText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },

  pickerContainer: {
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
    paddingHorizontal: 14, paddingBottom: 14,
  },
  confirmBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#F7F3EE' },

  // Log button
  logBtn: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8', marginLeft: 6,
  },
  logBtnDone: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A010' },
  logBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '600' },
  logBtnTextDone: { color: '#A8C5A0', opacity: 1 },

  logPickerHint: { fontSize: 12, color: '#3D3935', opacity: 0.4, textAlign: 'center', paddingTop: 8 },
  logBtnRow: { flexDirection: 'row', gap: 6 },

  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 8 },
  infoText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
