import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Pressable, TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../../stores/auth';
import { useSocialRhythmStore } from '../../../stores/socialRhythm';
import { usePinsStore } from '../../../stores/pins';
import { useAccessStore } from '../../../stores/access';
import { supabase } from '../../../lib/supabase';
import { nowHHMM } from '../../../utils/socialRhythm';
import type { RoutineAnchor } from '../../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

// Fixed anchors — never removable (medication removed from fixed; removable with guardian approval)
const FIXED_NAMES = new Set(['wake', 'bedtime']);

const DEFAULT_ANCHOR_DEFS: { name: string; label: string; icon: string; default: string }[] = [
  { name: 'wake',          label: 'Wake Up',       icon: '🌅', default: '07:00' },
  { name: 'medication',    label: 'Medication',    icon: '💊', default: '08:00' },
  { name: 'first_meal',    label: 'First Meal',    icon: '🍳', default: '08:30' },
  { name: 'first_contact', label: 'First Contact', icon: '👋', default: '09:00' },
  { name: 'work_start',    label: 'Work Start',    icon: '💼', default: '09:30' },
  { name: 'dinner',        label: 'Dinner',        icon: '🍽',  default: '19:00' },
  { name: 'bedtime',       label: 'Bedtime',       icon: '🌙', default: '23:00' },
];

const HIDDEN_KEY = 'equi_routine_hidden_anchors_v1';
const CUSTOM_KEY = 'equi_routine_custom_anchors_v1';

interface CustomAnchorDef { name: string; label: string; icon: string; default: string }

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

// ─── Add Anchor Sheet ─────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ['⏰', '🎯', '📚', '🏃', '🧘', '☕', '🌿', '💡', '🎵', '🚶', '🛁', '🌞'];

function AddAnchorSheet({
  visible, onClose, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (def: CustomAnchorDef) => void;
}) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('⏰');
  const [time, setTime] = useState('12:00');

  function handleAdd() {
    if (!label.trim()) return;
    const name = `custom_${label.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    onAdd({ name, label: label.trim(), icon, default: time });
    setLabel(''); setIcon('⏰'); setTime('12:00');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={aa.backdrop} onPress={onClose}>
        <Pressable style={aa.sheet} onPress={() => {}}>
          <View style={aa.handle} />
          <Text style={aa.title}>Add Anchor</Text>
          <Text style={aa.label}>Name</Text>
          <TextInput
            style={aa.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Afternoon walk, Meditation…"
            placeholderTextColor="#3D393540"
            maxLength={40}
          />
          <Text style={aa.label}>Icon</Text>
          <View style={aa.emojiRow}>
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[aa.emojiBtn, icon === e && aa.emojiBtnSelected]}
                onPress={() => setIcon(e)}
              >
                <Text style={aa.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={aa.label}>Default time</Text>
          <TimePicker value={time} onChange={setTime} />
          <TouchableOpacity
            style={[aa.addBtn, !label.trim() && aa.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!label.trim()}
          >
            <Text style={aa.addBtnText}>Add to Routine</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const aa = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000040', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0DDD8', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#3D3935', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#3D393570', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#E0DDD8', borderRadius: 12,
    padding: 12, fontSize: 15, color: '#3D3935', marginBottom: 16,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center', justifyContent: 'center' },
  emojiBtnSelected: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A020' },
  emojiText: { fontSize: 20 },
  addBtn: { backgroundColor: '#A8C5A0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoutineScreen() {
  const { session } = useAuthStore();
  const rhythm = useSocialRhythmStore();
  const pins = usePinsStore();
  const access = useAccessStore();
  const router = useRouter();
  const userId = session?.user.id;
  const hasGuardian = access.guardians.some((g) => g.status === 'accepted');

  const [anchors, setAnchors] = useState<RoutineAnchor[]>([]);
  const [editingAnchor, setEditingAnchor] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('08:00');
  const [saved, setSaved] = useState(false);

  // Anchor logging state
  const [loggingAnchor, setLoggingAnchor] = useState<string | null>(null);
  const [logTime, setLogTime] = useState('08:00');

  // Customization state
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(new Set());
  const [customDefs, setCustomDefs] = useState<CustomAnchorDef[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    pins.load();
    if (userId) {
      loadAnchors();
      rhythm.load(userId);
      access.load(userId);
    }
    loadCustomization();
  }, [userId]);

  async function loadCustomization() {
    try {
      const h = await AsyncStorage.getItem(HIDDEN_KEY);
      if (h) setHiddenNames(new Set(JSON.parse(h) as string[]));
      const c = await AsyncStorage.getItem(CUSTOM_KEY);
      if (c) setCustomDefs(JSON.parse(c) as CustomAnchorDef[]);
    } catch { /* ignore */ }
  }

  async function saveHidden(next: Set<string>) {
    setHiddenNames(next);
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
  }

  async function saveCustomDefs(next: CustomAnchorDef[]) {
    setCustomDefs(next);
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  }

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
    const existing = rhythm.todayAnchorLogs.find(
      (l) => anchors.find((a) => a.id === l.anchor_id)?.anchor_name === name,
    );
    setLogTime(existing?.actual_time?.slice(0, 5) ?? nowHHMM());
    setEditingAnchor(null);
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

  async function hideAnchor(name: string) {
    const next = new Set(hiddenNames);
    next.add(name);
    await saveHidden(next);
    // Also remove pin if exists
    pins.unpin(`anchor_${name}`);
  }

  async function handleAddAnchor(def: CustomAnchorDef) {
    const next = [...customDefs, def];
    await saveCustomDefs(next);
  }

  async function removeCustomAnchor(name: string) {
    const next = customDefs.filter((d) => d.name !== name);
    await saveCustomDefs(next);
    // Also delete from DB if it exists
    if (userId) {
      const anchor = getAnchor(name);
      if (anchor) {
        await supabase.from('routine_anchors').delete().eq('id', anchor.id);
        loadAnchors();
      }
    }
    pins.unpin(`anchor_${name}`);
  }

  // Build visible anchor list
  const allDefs = [
    ...DEFAULT_ANCHOR_DEFS.filter((d) => !hiddenNames.has(d.name)),
    ...customDefs,
  ];

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
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
          Set target times for your social rhythm anchors. Consistent daily timing
          supports mood stability.
        </Text>

        {/* Anchor rows */}
        {allDefs.map((a) => {
          const stored = getAnchor(a.name);
          const displayTime = stored?.target_time
            ? formatDisplay(stored.target_time.slice(0, 5))
            : 'Not set';
          const isEditing = editingAnchor === a.name;
          const isLogging = loggingAnchor === a.name;
          const loggedTime = getLoggedTime(a.name);
          const isFixed = FIXED_NAMES.has(a.name);

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

                {/* Hide/Remove button — not for fixed anchors */}
                {!isFixed && (
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => {
                      const isCustom = customDefs.some((d) => d.name === a.name);
                      const isMedication = a.name === 'medication';

                      if (isMedication && hasGuardian) {
                        Alert.alert(
                          'Guardian approval required',
                          'Removing the Medication anchor requires your guardian\'s approval. A request will be sent — the anchor stays visible until they approve.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Send request',
                              onPress: () => {
                                if (userId) {
                                  access.submitApprovalRequest({
                                    userId,
                                    requestType: 'medication_change',
                                    approverRole: 'guardian',
                                    approverCompanionId: access.guardians.find((g) => g.status === 'accepted')?.id ?? null,
                                    description: 'Remove Medication anchor from Daily Routine',
                                    oldValue: { medication_anchor: true },
                                    newValue: { medication_anchor: false },
                                  });
                                }
                                Alert.alert('Request sent', 'Your guardian has been notified. The Medication anchor will be removed once they approve.');
                              },
                            },
                          ],
                        );
                      } else {
                        Alert.alert(
                          `Remove "${a.label}"?`,
                          isCustom
                            ? 'This anchor will be permanently deleted from your routine.'
                            : 'This anchor will be hidden. You can restore it later.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: isCustom ? 'Delete' : 'Remove',
                              style: 'destructive',
                              onPress: () => {
                                if (isCustom) removeCustomAnchor(a.name);
                                else hideAnchor(a.name);
                              },
                            },
                          ],
                        );
                      }
                    }}
                  >
                    <Text style={s.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
                {isFixed && <View style={s.fixedTag}><Text style={s.fixedTagText}>fixed</Text></View>}
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

        {/* Hidden default anchors — restore option */}
        {hiddenNames.size > 0 && (
          <View style={s.restoreSection}>
            <Text style={s.restoreLabel}>HIDDEN ANCHORS</Text>
            {DEFAULT_ANCHOR_DEFS.filter((d) => hiddenNames.has(d.name) && !FIXED_NAMES.has(d.name)).map((a) => (
              <TouchableOpacity
                key={a.name}
                style={s.restoreRow}
                onPress={async () => {
                  const next = new Set(hiddenNames);
                  next.delete(a.name);
                  await saveHidden(next);
                }}
              >
                <Text style={s.restoreIcon}>{a.icon}</Text>
                <Text style={s.restoreText}>{a.label}</Text>
                <Text style={s.restoreAdd}>+ Restore</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add anchor button */}
        <TouchableOpacity style={s.addAnchorBtn} onPress={() => setShowAddSheet(true)}>
          <Text style={s.addAnchorText}>+ Add Anchor</Text>
        </TouchableOpacity>

        <View style={s.infoCard}>
          <Text style={s.infoText}>
            Based on IPSRT (Interpersonal and Social Rhythm Therapy) — an evidence-based approach
            for bipolar disorder that stabilises daily rhythms to help prevent mood episodes.{'\n'}
            Wake up, medication, and bedtime are fixed anchors and cannot be removed.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddAnchorSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddAnchor}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
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
  anchorRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  anchorIcon: { fontSize: 22 },
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
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  logBtn: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  logBtnDone: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A010' },
  logBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '600' },
  logBtnTextDone: { color: '#A8C5A0', opacity: 1 },

  logPickerHint: { fontSize: 12, color: '#3D3935', opacity: 0.4, textAlign: 'center', paddingTop: 8 },
  logBtnRow: { flexDirection: 'row', gap: 6 },

  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F0EDE8', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 12, color: '#3D393560', fontWeight: '600' },

  fixedTag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#F0EDE8',
  },
  fixedTagText: { fontSize: 10, color: '#3D393540', fontWeight: '600', textTransform: 'uppercase' },

  restoreSection: { marginTop: 8, marginBottom: 4 },
  restoreLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: '#3D393540', marginBottom: 8, textTransform: 'uppercase' },
  restoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7F3EE', borderRadius: 10, padding: 12, marginBottom: 6,
  },
  restoreIcon: { fontSize: 18 },
  restoreText: { flex: 1, fontSize: 14, color: '#3D393560' },
  restoreAdd: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },

  addAnchorBtn: {
    borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#A8C5A066',
    paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 12,
  },
  addAnchorText: { fontSize: 14, color: '#A8C5A0', fontWeight: '600' },

  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4 },
  infoText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
