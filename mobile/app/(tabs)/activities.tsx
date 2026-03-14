import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Pressable, TextInput, Dimensions, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useActivitiesStore } from '../../stores/activities';
import { useAIStore } from '../../stores/ai';
import { useAmbientTheme } from '../../stores/ambient';
import { supabase } from '../../lib/supabase';
import type { Activity, ActivityCompletion, CycleState } from '../../types/database';

// ─── Per-activity reminder storage (shared key with you/activities.tsx) ───────

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

interface ActivityReminder { time: string; ring: boolean; enabled: boolean; }
type RemindersMap = Record<string, ActivityReminder>;
const DEFAULT_REMINDER: ActivityReminder = { time: '15:00', ring: false, enabled: false };

function remindersKey(userId: string) { return `equi_activity_reminders_${userId}`; }

async function loadReminders(userId: string): Promise<RemindersMap> {
  try {
    const raw = await AsyncStorage.getItem(remindersKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveReminders(userId: string, map: RemindersMap): Promise<void> {
  await AsyncStorage.setItem(remindersKey(userId), JSON.stringify(map));
}

async function scheduleActivityReminder(activityId: string, title: string, reminder: ActivityReminder) {
  if (IS_EXPO_GO) return;
  const N = require('expo-notifications');
  const id = `activity-reminder-${activityId}`;
  await N.cancelScheduledNotificationAsync(id).catch(() => {});
  if (!reminder.enabled) return;
  const [h, m] = reminder.time.split(':').map(Number);
  try {
    await N.scheduleNotificationAsync({
      identifier: id,
      content: { title, body: 'Time for your wellbeing activity 🌿', sound: reminder.ring ? 'default' : false },
      trigger: { type: 'daily', hour: h, minute: m, repeats: true },
    });
  } catch { /* silently ignore */ }
}

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Time picker modal ────────────────────────────────────────────────────────

function TimePickerModal({ visible, value, onSave, onCancel }: {
  visible: boolean; value: string; onSave: (v: string) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [visible]);
  const [h, m] = val.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  function adj(field: 'h' | 'm', delta: number) {
    if (field === 'h') {
      const next = (h + delta + 24) % 24;
      setVal(`${String(next).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    } else {
      const next = (m + delta + 60) % 60;
      setVal(`${String(h).padStart(2, '0')}:${String(next).padStart(2, '0')}`);
    }
  }
  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen">
      <View style={tpm.overlay}>
        <View style={tpm.sheet}>
          <Text style={tpm.title}>Set reminder time</Text>
          <View style={tpm.row}>
            <View style={tpm.col}>
              <TouchableOpacity onPress={() => adj('h', 1)} style={tpm.arrow}><Text style={tpm.arrowTxt}>▲</Text></TouchableOpacity>
              <Text style={tpm.val}>{String(h12).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => adj('h', -1)} style={tpm.arrow}><Text style={tpm.arrowTxt}>▼</Text></TouchableOpacity>
            </View>
            <Text style={tpm.colon}>:</Text>
            <View style={tpm.col}>
              <TouchableOpacity onPress={() => adj('m', 15)} style={tpm.arrow}><Text style={tpm.arrowTxt}>▲</Text></TouchableOpacity>
              <Text style={tpm.val}>{String(m).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => adj('m', -15)} style={tpm.arrow}><Text style={tpm.arrowTxt}>▼</Text></TouchableOpacity>
            </View>
            <Text style={tpm.period}>{period}</Text>
          </View>
          <View style={tpm.btnRow}>
            <TouchableOpacity style={tpm.cancelBtn} onPress={onCancel}>
              <Text style={tpm.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tpm.saveBtn} onPress={() => onSave(val)}>
              <Text style={tpm.saveTxt}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tpm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000050', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: 260 },
  title: { fontSize: 16, fontWeight: '700', color: '#3D3935', textAlign: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  col: { alignItems: 'center', width: 52 },
  arrow: { padding: 8 },
  arrowTxt: { fontSize: 14, color: '#A8C5A0', fontWeight: '600' },
  val: { fontSize: 28, fontWeight: '700', color: '#3D3935' },
  colon: { fontSize: 28, fontWeight: '700', color: '#3D3935', marginHorizontal: 4, marginBottom: 4 },
  period: { fontSize: 15, fontWeight: '600', color: '#3D3935', opacity: 0.45, marginLeft: 10, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F0EDE8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#3D393580' },
  saveBtn: { flex: 1, backgroundColor: '#A8C5A0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};
const ALL_STATES: CycleState[] = ['stable', 'manic', 'depressive', 'mixed'];

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  grounding:   { icon: '🌊', label: 'Grounding' },
  sleep:       { icon: '🌙', label: 'Sleep' },
  self_esteem: { icon: '✨', label: 'Self-Esteem' },
  forgiveness: { icon: '🕊️', label: 'Forgiveness' },
  reflection:  { icon: '📖', label: 'Reflection' },
  custom:      { icon: '⭐', label: 'Your Activities' },
  other:       { icon: '🎯', label: 'Other' },
};

const DURATION_PRESETS = [5, 10, 15, 20, 30];

type Tab = 'all' | 'prescribed' | 'saved';
type FilterState = CycleState | 'all';

// ─── State dots (compatible states indicator) ─────────────────────────────────

function StateDots({ compatible, restricted }: { compatible: CycleState[]; restricted: CycleState[] }) {
  return (
    <View style={sd.row}>
      {ALL_STATES.map((st) => {
        const on = compatible?.includes(st) && !restricted?.includes(st);
        return (
          <View
            key={st}
            style={[sd.dot, { backgroundColor: on ? CYCLE_COLORS[st] : '#E0DDD820' }]}
          />
        );
      })}
    </View>
  );
}
const sd = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ─── Horizontal "For You" card ────────────────────────────────────────────────

function ForYouCard({
  activity, accentColor, completionCount, onPress, theme,
}: { activity: Activity; accentColor: string; completionCount: number; onPress: () => void; theme: ReturnType<typeof useAmbientTheme> }) {
  const meta = CATEGORY_META[activity.category ?? 'other'] ?? CATEGORY_META.other;
  return (
    <TouchableOpacity
      style={[fy.card, theme.cardSurface, { borderColor: accentColor + '55' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={fy.icon}>{meta.icon}</Text>
      <Text style={[fy.title, { color: theme.textPrimary }]} numberOfLines={2}>{activity.title}</Text>
      <Text style={[fy.meta, { color: theme.textSecondary }]}>
        {activity.duration_minutes ? `${activity.duration_minutes} min` : '—'}
        {activity.evidence_label ? `  ·  ${activity.evidence_label}` : ''}
      </Text>
      {completionCount > 0 && (
        <View style={[fy.countBadge, { backgroundColor: accentColor + '22' }]}>
          <Text style={[fy.countText, { color: accentColor }]}>{completionCount}× done</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
const CARD_W = Math.floor(SCREEN_W * 0.44);
const fy = StyleSheet.create({
  card: {
    width: CARD_W, borderRadius: 18, padding: 16,
    borderWidth: 1.5,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    marginRight: 12,
  },
  icon: { fontSize: 28, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 6 },
  meta: { fontSize: 11, marginBottom: 8 },
  countBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  countText: { fontSize: 11, fontWeight: '600' },
});

// ─── Main activity card ───────────────────────────────────────────────────────

function ActivityCard({
  activity, completionCount, isBookmarked, lastNote, accentColor, onPress, theme,
  reminder, onReminderChange,
}: {
  activity: Activity; completionCount: number; isBookmarked: boolean;
  lastNote: string | null; accentColor: string; onPress: () => void;
  theme: ReturnType<typeof useAmbientTheme>;
  reminder?: ActivityReminder; onReminderChange?: (r: ActivityReminder) => void;
}) {
  const meta = CATEGORY_META[activity.category ?? 'other'] ?? CATEGORY_META.other;
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  return (
    <TouchableOpacity style={[s.card, theme.cardSurface]} onPress={onPress} activeOpacity={0.78}>
      <View style={[s.cardAccent, { backgroundColor: accentColor }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardIcon}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { color: theme.textPrimary }]}>{activity.title}</Text>
            {activity.description ? (
              <Text style={[s.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>{activity.description}</Text>
            ) : null}
          </View>
          <View style={s.cardRight}>
            {isBookmarked && <Text style={s.bookmarkIcon}>🔖</Text>}
            {completionCount > 0 && (
              <Text style={[s.completionCount, { color: theme.textSecondary }]}>{completionCount}×</Text>
            )}
          </View>
        </View>

        {lastNote ? (
          <Text style={[s.lastNote, { color: theme.textSecondary }]} numberOfLines={1}>"{lastNote}"</Text>
        ) : null}

        <View style={s.cardFooter}>
          <View style={s.cardFooterLeft}>
            {activity.duration_minutes ? (
              <View style={s.durationPill}>
                <Text style={[s.durationText, { color: theme.textSecondary }]}>{activity.duration_minutes} min</Text>
              </View>
            ) : null}
            {activity.evidence_label ? (
              <Text style={s.evidenceTag}>{activity.evidence_label}</Text>
            ) : null}
          </View>
          <StateDots
            compatible={activity.compatible_states ?? []}
            restricted={activity.restricted_states ?? []}
          />
        </View>

        {/* Reminder row */}
        {reminder !== undefined && onReminderChange && (
          <View style={s.reminderRow}>
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => onReminderChange({ ...reminder, enabled: v })}
              trackColor={{ false: '#E0DDD8', true: '#A8C5A0' }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <TouchableOpacity
              onPress={() => setTimePickerOpen(true)}
              style={[s.timePill, !reminder.enabled && s.timePillDisabled]}
              disabled={!reminder.enabled}
            >
              <Text style={[s.timeTxt, { color: theme.textSecondary }, !reminder.enabled && s.timeTxtDisabled]}>
                ⏰ {fmt12(reminder.time)}
              </Text>
            </TouchableOpacity>
            <View style={s.ringRow}>
              <Text style={[s.ringTxt, !reminder.enabled && s.timeTxtDisabled]}>🔔</Text>
              <Switch
                value={reminder.ring}
                onValueChange={(v) => onReminderChange({ ...reminder, ring: v })}
                disabled={!reminder.enabled}
                trackColor={{ false: '#E0DDD8', true: '#C4A0B0' }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
              />
            </View>
          </View>
        )}
      </View>

      {reminder !== undefined && onReminderChange && (
        <TimePickerModal
          visible={timePickerOpen}
          value={reminder.time}
          onSave={(t) => { setTimePickerOpen(false); onReminderChange({ ...reminder, time: t, enabled: true }); }}
          onCancel={() => setTimePickerOpen(false)}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Create Activity Sheet ────────────────────────────────────────────────────

function CreateActivitySheet({
  visible, accentColor, onClose, onCreated, theme,
}: {
  visible: boolean; accentColor: string; onClose: () => void; onCreated: () => void;
  theme: ReturnType<typeof useAmbientTheme>;
}) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [selectedStates, setSelectedStates] = useState<CycleState[]>(['stable', 'manic', 'depressive', 'mixed']);
  const [saving, setSaving] = useState(false);

  function toggleState(st: CycleState) {
    setSelectedStates((prev) =>
      prev.includes(st) ? (prev.length > 1 ? prev.filter((s) => s !== st) : prev) : [...prev, st],
    );
  }

  function selectAll() {
    setSelectedStates(['stable', 'manic', 'depressive', 'mixed']);
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    const db = supabase as any;
    await db.from('activities').insert({
      title: title.trim(),
      description: desc.trim() || null,
      duration_minutes: duration,
      category: 'custom',
      compatible_states: selectedStates,
      restricted_states: [],
      is_workbook_entry: false,
      evidence_label: null,
    });
    setSaving(false);
    setTitle(''); setDesc(''); setDuration(null);
    setSelectedStates(['stable', 'manic', 'depressive', 'mixed']);
    onCreated();
  }

  const allSelected = selectedStates.length === 4;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cs.backdrop} onPress={onClose}>
        <Pressable style={[cs.sheet, { backgroundColor: theme.cardBgStrong }]} onPress={() => {}}>
          <View style={cs.handle} />
          <Text style={[cs.title, { color: theme.textPrimary }]}>Add Your Activity</Text>
          <Text style={[cs.subtitle, { color: theme.textSecondary }]}>Create a personal activity tailored to your needs</Text>

          <Text style={[cs.label, { color: theme.textSecondary }]}>Activity name *</Text>
          <TextInput
            style={[cs.input, { color: theme.textPrimary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Morning stretch, Breathing walk…"
            placeholderTextColor="#3D393540"
            maxLength={80}
          />

          <Text style={[cs.label, { color: theme.textSecondary }]}>Description (optional)</Text>
          <TextInput
            style={[cs.input, { minHeight: 60, color: theme.textPrimary }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="What does this activity involve?"
            placeholderTextColor="#3D393540"
            multiline
            textAlignVertical="top"
          />

          <Text style={[cs.label, { color: theme.textSecondary }]}>Duration</Text>
          <View style={cs.durationRow}>
            {DURATION_PRESETS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[cs.durationChip, duration === d && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => setDuration(duration === d ? null : d)}
              >
                <Text style={[cs.durationChipText, { color: theme.textSecondary }, duration === d && { color: '#FFFFFF', opacity: 1, fontWeight: '700' }]}>
                  {d} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={cs.statesHeader}>
            <Text style={[cs.label, { color: theme.textSecondary }]}>Works best for</Text>
            <TouchableOpacity onPress={selectAll}>
              <Text style={[cs.allBtn, { color: theme.textSecondary }, allSelected && { color: accentColor }]}>All moods</Text>
            </TouchableOpacity>
          </View>
          <View style={cs.statesRow}>
            {ALL_STATES.map((st) => {
              const active = selectedStates.includes(st);
              const col = CYCLE_COLORS[st];
              return (
                <TouchableOpacity
                  key={st}
                  style={[cs.stateChip, { borderColor: col + (active ? 'CC' : '44'), backgroundColor: active ? col + '22' : 'transparent' }]}
                  onPress={() => toggleState(st)}
                >
                  <View style={[cs.stateDot, { backgroundColor: col }]} />
                  <Text style={[cs.stateChipText, { color: active ? '#3D3935' : '#3D393560' }]}>
                    {CYCLE_LABELS[st]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[cs.createBtn, { backgroundColor: accentColor }, (!title.trim() || saving) && cs.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!title.trim() || saving}
          >
            <Text style={cs.createBtnText}>{saving ? 'Adding…' : 'Add Activity'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000040', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0DDD8', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#E0DDD8', borderRadius: 12,
    padding: 12, fontSize: 15, marginBottom: 16,
  },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  durationChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  durationChipText: { fontSize: 13, opacity: 0.5, fontWeight: '500' },
  statesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  allBtn: { fontSize: 13, fontWeight: '600', opacity: 0.4 },
  statesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  stateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5,
  },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  stateChipText: { fontSize: 13, fontWeight: '600' },
  createBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
  const { session } = useAuthStore();
  const today = useTodayStore();
  const store = useActivitiesStore();
  const aiStore = useAIStore();
  const theme = useAmbientTheme();
  const router = useRouter();
  const userId = session?.user.id;

  const [tab, setTab] = useState<Tab>('all');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [reminders, setReminders] = useState<RemindersMap>({});

  const cycleState: CycleState = today.cycleState ?? 'stable';
  const accentColor = CYCLE_COLORS[cycleState];

  useEffect(() => {
    if (userId) {
      store.load(userId);
      aiStore.loadLatest(userId);
      loadReminders(userId).then(setReminders);
    }
  }, [userId]);

  async function handleReminderChange(activityId: string, title: string, r: ActivityReminder) {
    if (!userId) return;
    const updated = { ...reminders, [activityId]: r };
    setReminders(updated);
    await saveReminders(userId, updated);
    await scheduleActivityReminder(activityId, title, r);
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const completionCountMap: Record<string, number> = {};
  const lastNoteMap: Record<string, string | null> = {};
  const bookmarkedIds = new Set<string>();

  store.completions.forEach((c: ActivityCompletion) => {
    if (c.completed_at) completionCountMap[c.activity_id] = (completionCountMap[c.activity_id] ?? 0) + 1;
    if (c.notes) lastNoteMap[c.activity_id] = c.notes;
    if (c.bookmarked) bookmarkedIds.add(c.activity_id);
  });

  const nonWorkbook = store.all.filter((a) => !a.is_workbook_entry);

  // "For You" — activities matching user's actual current state (top strip)
  const forYou = nonWorkbook.filter(
    (a) => a.compatible_states?.includes(cycleState) && !a.restricted_states?.includes(cycleState),
  );

  // Filter for main list
  const filtered = filterState === 'all'
    ? nonWorkbook
    : nonWorkbook.filter(
        (a) => a.compatible_states?.includes(filterState as CycleState) && !a.restricted_states?.includes(filterState as CycleState),
      );

  // Group by category
  const grouped: Record<string, Activity[]> = {};
  filtered.forEach((a) => {
    const cat = a.category ?? 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  // Bookmarked
  const savedActivities = store.completions
    .filter((c: ActivityCompletion) => c.bookmarked && c.activity)
    .map((c: ActivityCompletion) => ({ completion: c, activity: c.activity! }));

  function navToActivity(a: Activity) {
    if (a.is_workbook_entry) router.push('/workbook');
    else router.push(`/activity/${a.id}` as never);
  }

  // AI suggestions
  const aiSuggestions = (aiStore.latestReport?.report_json?.activity_suggestions ?? [])
    .map((name: string) => store.all.find((a) => a.title === name))
    .filter((a): a is Activity => !!a);

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: theme.cardBg }]}>
        <View>
          <Text style={[s.title, { color: theme.textPrimary }]}>Activities</Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}>Matched to your wellbeing</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.statePill, { backgroundColor: accentColor + '28', borderColor: accentColor + '66' }]}>
            <View style={[s.stateDot, { backgroundColor: accentColor }]} />
            <Text style={[s.stateText, { color: accentColor }]}>{CYCLE_LABELS[cycleState]}</Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: accentColor }]}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Text style={s.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <View style={s.tabs}>
        {([
          { id: 'all', label: 'All' },
          { id: 'prescribed', label: 'Prescribed' },
          { id: 'saved', label: '★ Saved' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[s.tab, tab === t.id && { borderBottomWidth: 2, borderBottomColor: accentColor }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[s.tabText, { color: theme.textSecondary }, tab === t.id && { opacity: 1, fontWeight: '700', color: theme.textPrimary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {store.isLoading ? (
        <View style={s.center}><ActivityIndicator color={accentColor} size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── ALL TAB ─────────────────────────────────────────────────────── */}
          {tab === 'all' && (
            <>
              {/* For You strip */}
              {forYou.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>FOR YOU</Text>
                    <Text style={[s.sectionSub, { color: theme.textSecondary }]}>Based on your {CYCLE_LABELS[cycleState].toLowerCase()} phase</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 18, paddingRight: 6, paddingBottom: 4 }}
                  >
                    {forYou.slice(0, 6).map((a) => (
                      <ForYouCard
                        key={a.id}
                        activity={a}
                        accentColor={accentColor}
                        completionCount={completionCountMap[a.id] ?? 0}
                        onPress={() => navToActivity(a)}
                        theme={theme}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* AI suggestions */}
              {aiSuggestions.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>✦ AI SUGGESTED</Text>
                    <Text style={[s.sectionSub, { color: theme.textSecondary }]}>From your weekly report</Text>
                  </View>
                  {aiSuggestions.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[s.suggestCard, theme.cardSurface, { borderLeftColor: accentColor }]}
                      onPress={() => navToActivity(a)}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.suggestTitle, { color: theme.textPrimary }]}>{a.title}</Text>
                      <Text style={[s.suggestMeta, { color: theme.textSecondary }]}>
                        {a.duration_minutes ? `${a.duration_minutes} min` : ''}
                        {a.category ? ` · ${CATEGORY_META[a.category]?.label ?? a.category}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* State filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterStrip}
                style={{ marginBottom: 4 }}
              >
                <TouchableOpacity
                  style={[s.filterChip, { backgroundColor: theme.cardBg }, filterState === 'all' && { backgroundColor: theme.accentBg, borderColor: theme.cardBorder }]}
                  onPress={() => setFilterState('all')}
                >
                  <Text style={[s.filterChipText, { color: theme.textSecondary }, filterState === 'all' && { opacity: 1, fontWeight: '700', color: theme.textPrimary }]}>
                    All
                  </Text>
                </TouchableOpacity>
                {ALL_STATES.map((st) => {
                  const col = CYCLE_COLORS[st];
                  const active = filterState === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[s.filterChip, { backgroundColor: theme.cardBg }, active && { backgroundColor: col + '22', borderColor: col }]}
                      onPress={() => setFilterState(st)}
                    >
                      <View style={[s.filterDot, { backgroundColor: col }]} />
                      <Text style={[s.filterChipText, { color: theme.textSecondary }, active && { color: col, opacity: 1, fontWeight: '700' }]}>
                        {CYCLE_LABELS[st]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Grouped categories */}
              {Object.entries(grouped).map(([cat, items]) => {
                const meta = CATEGORY_META[cat] ?? CATEGORY_META.other;
                return (
                  <View key={cat} style={s.section}>
                    <View style={s.categoryHeader}>
                      <Text style={s.categoryIcon}>{meta.icon}</Text>
                      <Text style={[s.categoryLabel, theme.sectionLabelStyle]}>{meta.label.toUpperCase()}</Text>
                    </View>
                    {items.map((a) => (
                      <ActivityCard
                        key={a.id}
                        activity={a}
                        completionCount={completionCountMap[a.id] ?? 0}
                        isBookmarked={bookmarkedIds.has(a.id)}
                        lastNote={lastNoteMap[a.id] ?? null}
                        accentColor={CYCLE_COLORS[a.compatible_states?.[0] ?? cycleState] ?? accentColor}
                        onPress={() => navToActivity(a)}
                        theme={theme}
                        reminder={reminders[a.id] ?? DEFAULT_REMINDER}
                        onReminderChange={(r) => handleReminderChange(a.id, a.title, r)}
                      />
                    ))}
                  </View>
                );
              })}

              {filtered.length === 0 && (
                <View style={s.emptyState}>
                  <Text style={s.emptyIcon}>🌱</Text>
                  <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>No activities for this filter</Text>
                  <TouchableOpacity onPress={() => setFilterState('all')}>
                    <Text style={[s.emptyLink, { color: accentColor }]}>Show all activities</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── PRESCRIBED TAB ──────────────────────────────────────────────── */}
          {tab === 'prescribed' && (
            store.prescribed.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>🩺</Text>
                <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>No prescribed activities yet</Text>
                <Text style={[s.emptyBody, { color: theme.textSecondary }]}>Connect with a psychiatrist to receive personalised activity prescriptions.</Text>
              </View>
            ) : (
              store.prescribed.map((p) => p.activity && (
                <View key={p.id} style={s.prescribedWrap}>
                  <ActivityCard
                    activity={p.activity}
                    completionCount={completionCountMap[p.activity_id] ?? 0}
                    isBookmarked={bookmarkedIds.has(p.activity_id)}
                    lastNote={lastNoteMap[p.activity_id] ?? null}
                    accentColor={accentColor}
                    onPress={() => navToActivity(p.activity!)}
                    theme={theme}
                  />
                  <View style={[s.prescribedMeta, theme.cardSurface]}>
                    {p.goal ? <Text style={[s.prescribedGoal, { color: theme.textSecondary }]}>Goal: {p.goal}</Text> : null}
                    <View style={s.compRow}>
                      <Text style={[s.compText, { color: theme.textSecondary }]}>{p.completions_this_week ?? 0}/{p.dosage_per_week ?? '?'}× this week</Text>
                      <View style={s.compBar}>
                        <View style={[s.compFill, {
                          backgroundColor: accentColor,
                          width: `${Math.min(100, ((p.completions_this_week ?? 0) / (p.dosage_per_week ?? 1)) * 100)}%` as any,
                        }]} />
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )
          )}

          {/* ── SAVED TAB ───────────────────────────────────────────────────── */}
          {tab === 'saved' && (
            savedActivities.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>🔖</Text>
                <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>Nothing saved yet</Text>
                <Text style={[s.emptyBody, { color: theme.textSecondary }]}>Bookmark activities that work for you — they'll appear here.</Text>
              </View>
            ) : (
              savedActivities.map(({ completion, activity }) => (
                <ActivityCard
                  key={completion.id}
                  activity={activity}
                  completionCount={completionCountMap[activity.id] ?? 0}
                  isBookmarked
                  lastNote={lastNoteMap[activity.id] ?? null}
                  accentColor={accentColor}
                  onPress={() => navToActivity(activity)}
                  theme={theme}
                  reminder={reminders[activity.id] ?? DEFAULT_REMINDER}
                  onReminderChange={(r) => handleReminderChange(activity.id, activity.title, r)}
                />
              ))
            )
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Create Activity Sheet ─────────────────────────────────────────── */}
      <CreateActivitySheet
        visible={showCreate}
        accentColor={accentColor}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); if (userId) store.load(userId); }}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  statePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  stateText: { fontSize: 12, fontWeight: '600' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 20, color: '#FFFFFF', lineHeight: 24, marginTop: -1 },

  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
    paddingHorizontal: 18,
  },
  tab: { paddingVertical: 10, marginRight: 20 },
  tabText: { fontSize: 13, opacity: 0.4, fontWeight: '500' },

  scroll: { paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 18, marginBottom: 10, marginTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sectionSub: { fontSize: 11, opacity: 0.85 },

  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, marginTop: 20, marginBottom: 10,
  },
  categoryIcon: { fontSize: 18 },
  categoryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },

  filterStrip: { paddingHorizontal: 18, paddingVertical: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  filterDot: { width: 7, height: 7, borderRadius: 3.5 },
  filterChipText: { fontSize: 13, opacity: 0.45, fontWeight: '500' },

  // Activity card
  card: {
    flexDirection: 'row', borderRadius: 20,
    marginHorizontal: 18, marginBottom: 14,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1.5, borderColor: '#F0EDE8', overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIcon: { fontSize: 20, marginTop: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardRight: { alignItems: 'flex-end', gap: 3, marginLeft: 4 },
  bookmarkIcon: { fontSize: 14 },
  completionCount: { fontSize: 11, fontWeight: '600' },
  lastNote: { fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  cardFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationPill: { backgroundColor: '#F0EDE8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  durationText: { fontSize: 11, fontWeight: '500' },
  evidenceTag: { fontSize: 11, color: '#A8C5A0', fontWeight: '500' },

  // Reminder row
  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F0EDE8', marginTop: 10, paddingTop: 10,
  },
  timePill: {
    backgroundColor: '#F7F3EE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  timePillDisabled: { opacity: 0.4 },
  timeTxt: { fontSize: 12, fontWeight: '600' },
  timeTxtDisabled: { opacity: 0.35 },
  ringRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  ringTxt: { fontSize: 14 },

  // AI suggested
  suggestCard: {
    borderRadius: 14, padding: 14,
    marginHorizontal: 18, marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  suggestTitle: { fontSize: 14, fontWeight: '600' },
  suggestMeta: { fontSize: 12, marginTop: 2 },

  // Prescribed
  prescribedWrap: { marginBottom: 4 },
  prescribedMeta: {
    marginHorizontal: 18, borderRadius: 12, padding: 12,
    marginTop: -4, borderWidth: 1, borderColor: '#F0EDE8',
  },
  prescribedGoal: { fontSize: 12, marginBottom: 8 },
  compRow: { gap: 6 },
  compText: { fontSize: 11 },
  compBar: { height: 4, backgroundColor: '#F0EDE8', borderRadius: 2, overflow: 'hidden' },
  compFill: { height: 4, borderRadius: 2 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyLink: { fontSize: 13, fontWeight: '600', marginTop: 8 },
});
