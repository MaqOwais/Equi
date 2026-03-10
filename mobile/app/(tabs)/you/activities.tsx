import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, SectionList, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuthStore } from '../../../stores/auth';
import { useActivitiesStore } from '../../../stores/activities';
import type { Activity } from '../../../types/database';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// ─── Per-activity reminder storage ────────────────────────────────────────────

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

// ─── Notification scheduling ──────────────────────────────────────────────────

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
      content: {
        title,
        body: "Time for your wellbeing activity 🌿",
        sound: reminder.ring ? 'default' : false,
      },
      trigger: { type: 'daily', hour: h, minute: m, repeats: true },
    });
  } catch { /* silently ignore scheduling failures */ }
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  grounding:   { icon: '🌿', label: 'Grounding' },
  sleep:       { icon: '🌙', label: 'Sleep' },
  self_esteem: { icon: '⭐', label: 'Self-Esteem' },
  forgiveness: { icon: '🕊️', label: 'Forgiveness' },
  reflection:  { icon: '🪞', label: 'Reflection' },
  custom:      { icon: '✨', label: 'Custom' },
  other:       { icon: '🌀', label: 'Other' },
};

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Time picker modal ────────────────────────────────────────────────────────

function TimePickerModal({
  visible, value, onSave, onCancel,
}: {
  visible: boolean; value: string;
  onSave: (v: string) => void; onCancel: () => void;
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
      <View style={tp.overlay}>
        <View style={tp.sheet}>
          <Text style={tp.title}>Set reminder time</Text>
          <View style={tp.row}>
            <View style={tp.col}>
              <TouchableOpacity onPress={() => adj('h', 1)} style={tp.arrow}><Text style={tp.arrowTxt}>▲</Text></TouchableOpacity>
              <Text style={tp.val}>{String(h12).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => adj('h', -1)} style={tp.arrow}><Text style={tp.arrowTxt}>▼</Text></TouchableOpacity>
            </View>
            <Text style={tp.colon}>:</Text>
            <View style={tp.col}>
              <TouchableOpacity onPress={() => adj('m', 15)} style={tp.arrow}><Text style={tp.arrowTxt}>▲</Text></TouchableOpacity>
              <Text style={tp.val}>{String(m).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => adj('m', -15)} style={tp.arrow}><Text style={tp.arrowTxt}>▼</Text></TouchableOpacity>
            </View>
            <Text style={tp.period}>{period}</Text>
          </View>
          <View style={tp.btnRow}>
            <TouchableOpacity style={tp.cancelBtn} onPress={onCancel}>
              <Text style={tp.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tp.saveBtn} onPress={() => onSave(val)}>
              <Text style={tp.saveTxt}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tp = StyleSheet.create({
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

// ─── Activity card with inline reminder ───────────────────────────────────────

function ActivityCard({
  activity, reminder, onRemove, onReminderChange,
}: {
  activity: Activity;
  reminder: ActivityReminder;
  onRemove: () => void;
  onReminderChange: (r: ActivityReminder) => void;
}) {
  const meta = CATEGORY_META[activity.category ?? 'other'] ?? { icon: '🌀', label: '' };
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  function toggleEnabled(v: boolean) {
    onReminderChange({ ...reminder, enabled: v });
  }
  function toggleRing(v: boolean) {
    onReminderChange({ ...reminder, ring: v });
  }
  function setTime(t: string) {
    setTimePickerOpen(false);
    onReminderChange({ ...reminder, time: t, enabled: true });
  }

  return (
    <View style={ac.card}>
      {/* Top row */}
      <View style={ac.top}>
        <Text style={ac.icon}>{meta.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={ac.title}>{activity.title}</Text>
          {activity.description ? (
            <Text style={ac.desc} numberOfLines={1}>{activity.description}</Text>
          ) : null}
        </View>
        {activity.duration_minutes ? (
          <View style={ac.pill}><Text style={ac.pillTxt}>{activity.duration_minutes}m</Text></View>
        ) : null}
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={ac.deleteTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Reminder row */}
      <View style={ac.reminderRow}>
        <Switch
          value={reminder.enabled}
          onValueChange={toggleEnabled}
          trackColor={{ false: '#E0DDD8', true: '#A8C5A0' }}
          thumbColor="#FFFFFF"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity
          onPress={() => setTimePickerOpen(true)}
          style={[ac.timePill, !reminder.enabled && ac.timePillDisabled]}
          disabled={!reminder.enabled}
        >
          <Text style={[ac.timeTxt, !reminder.enabled && ac.timeTxtDisabled]}>
            ⏰ {fmt12(reminder.time)}
          </Text>
        </TouchableOpacity>
        <View style={ac.ringRow}>
          <Text style={[ac.ringTxt, !reminder.enabled && ac.timeTxtDisabled]}>🔔</Text>
          <Switch
            value={reminder.ring}
            onValueChange={toggleRing}
            disabled={!reminder.enabled}
            trackColor={{ false: '#E0DDD8', true: '#C4A0B0' }}
            thumbColor="#FFFFFF"
            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
          />
        </View>
      </View>

      <TimePickerModal
        visible={timePickerOpen}
        value={reminder.time}
        onSave={setTime}
        onCancel={() => setTimePickerOpen(false)}
      />
    </View>
  );
}

const ac = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  icon: { fontSize: 20, marginTop: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  desc: { fontSize: 12, color: '#3D3935', opacity: 0.45, lineHeight: 16 },
  pill: { backgroundColor: '#A8C5A015', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  pillTxt: { fontSize: 11, color: '#A8C5A0', fontWeight: '600' },
  deleteTxt: { fontSize: 14, color: '#3D393540', padding: 2 },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingTop: 10,
  },
  timePill: {
    backgroundColor: '#F7F3EE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  timePillDisabled: { opacity: 0.4 },
  timeTxt: { fontSize: 13, color: '#3D3935', fontWeight: '600' },
  timeTxtDisabled: { opacity: 0.4 },
  ringRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  ringTxt: { fontSize: 14 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyActivitiesScreen() {
  const { session } = useAuthStore();
  const store = useActivitiesStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [reminders, setReminders] = useState<RemindersMap>({});
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;
    store.load(userId);
    loadReminders(userId).then(setReminders);
  }, [userId]);

  const routineActivities: Activity[] = store.completions
    .filter((c) => c.bookmarked && c.completed_at === null && c.activity)
    .map((c) => c.activity as Activity)
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  const bookmarkedIds = new Set(
    store.completions.filter((c) => c.bookmarked && c.completed_at === null).map((c) => c.activity_id),
  );

  async function toggle(activityId: string) {
    if (!userId) return;
    await store.toggleBookmark(userId, activityId);
  }

  const handleReminderChange = useCallback(async (activityId: string, title: string, r: ActivityReminder) => {
    if (!userId) return;
    const updated = { ...reminders, [activityId]: r };
    setReminders(updated);
    await saveReminders(userId, updated);
    await scheduleActivityReminder(activityId, title, r);

    if (IS_EXPO_GO && r.enabled) {
      Alert.alert(
        'Saved',
        `Reminder set for ${fmt12(r.time)}. Notifications activate in a dev or production build.`,
      );
    }
  }, [userId, reminders]);

  const sections = Object.entries(
    store.all.reduce<Record<string, Activity[]>>((acc, a) => {
      const cat = a.category ?? 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {}),
  ).map(([title, data]) => ({ title, data }));

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPickerVisible(true)} style={s.addBtn}>
            <Text style={s.addTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>My Activities</Text>
        <Text style={s.subtitle}>
          Build your wellbeing routine. Each activity can have its own daily reminder time and ring setting.
        </Text>

        {routineActivities.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🌿</Text>
            <Text style={s.emptyTitle}>No routine activities yet</Text>
            <Text style={s.emptySub}>
              Tap "+ Add" to pick from the library and build your daily routine.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setPickerVisible(true)}>
              <Text style={s.emptyBtnTxt}>Browse activities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>MY ROUTINE</Text>
            {routineActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                reminder={reminders[activity.id] ?? DEFAULT_REMINDER}
                onRemove={() => toggle(activity.id)}
                onReminderChange={(r) => handleReminderChange(activity.id, activity.title, r)}
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Activity picker ── */}
      <Modal visible={pickerVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={pk.overlay}>
          <View style={pk.sheet}>
            <View style={pk.handle} />
            <View style={pk.header}>
              <Text style={pk.title}>Add to routine</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={pk.doneBtn}>
                <Text style={pk.doneTxt}>Done</Text>
              </TouchableOpacity>
            </View>

            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => {
                const meta = CATEGORY_META[title] ?? { icon: '🌀', label: title };
                return (
                  <Text style={pk.categoryLabel}>{meta.icon}  {meta.label.toUpperCase()}</Text>
                );
              }}
              renderItem={({ item }) => {
                const selected = bookmarkedIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={[pk.row, selected && pk.rowSelected]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[pk.rowTitle, selected && pk.rowTitleSelected]}>{item.title}</Text>
                      {item.duration_minutes ? (
                        <Text style={pk.rowSub}>{item.duration_minutes} min</Text>
                      ) : null}
                    </View>
                    <View style={[pk.check, selected && pk.checkSelected]}>
                      {selected && <Text style={pk.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  addBtn: { backgroundColor: '#A8C5A015', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addTxt: { fontSize: 14, color: '#A8C5A0', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 6 },
  emptySub: {
    fontSize: 13, color: '#3D3935', opacity: 0.4,
    textAlign: 'center', lineHeight: 19, paddingHorizontal: 20, marginBottom: 20,
  },
  emptyBtn: { backgroundColor: '#A8C5A0', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000050', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, maxHeight: '80%',
  },
  handle: { width: 36, height: 4, backgroundColor: '#E0DDD8', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#3D3935' },
  doneBtn: { backgroundColor: '#A8C5A015', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  doneTxt: { fontSize: 14, color: '#A8C5A0', fontWeight: '700' },
  categoryLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, marginTop: 16, marginBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F7F3EE', borderRadius: 12, padding: 12, marginBottom: 6,
  },
  rowSelected: { backgroundColor: '#A8C5A015', borderWidth: 1, borderColor: '#A8C5A040' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  rowTitleSelected: { color: '#5A9A52' },
  rowSub: { fontSize: 12, color: '#3D3935', opacity: 0.4 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkSelected: { backgroundColor: '#A8C5A0', borderColor: '#A8C5A0' },
  checkMark: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
});
