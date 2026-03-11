import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../../../stores/auth';
import { useMedicationsStore } from '../../../stores/medications';
import type { Medication } from '../../../types/database';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

function ExpoGoBanner() {
  if (!IS_EXPO_GO) return null;
  return (
    <View style={egb.wrap}>
      <Text style={egb.icon}>📵</Text>
      <View style={{ flex: 1 }}>
        <Text style={egb.title}>Reminders won't fire in Expo Go</Text>
        <Text style={egb.body}>
          Times and ring settings are saved. Notifications will activate in a dev or production build.
        </Text>
      </View>
    </View>
  );
}

const egb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8E7', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  icon: { fontSize: 18, marginTop: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#3D3935', marginBottom: 2 },
  body: { fontSize: 12, color: '#3D3935', opacity: 0.55, lineHeight: 17 },
});

// ─── Time picker (12h) ────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  function adj(field: 'h' | 'm', delta: number) {
    if (field === 'h') {
      const next = (h + delta + 24) % 24;
      onChange(`${String(next).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    } else {
      const next = (m + delta + 60) % 60;
      onChange(`${String(h).padStart(2, '0')}:${String(next).padStart(2, '0')}`);
    }
  }

  return (
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
  );
}

const tp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  col: { alignItems: 'center', width: 48 },
  arrow: { padding: 6 },
  arrowTxt: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },
  val: { fontSize: 24, fontWeight: '700', color: '#3D3935' },
  colon: { fontSize: 24, fontWeight: '700', color: '#3D3935', marginHorizontal: 4, marginBottom: 4 },
  period: { fontSize: 15, fontWeight: '600', color: '#3D3935', opacity: 0.45, marginLeft: 8, marginTop: 2 },
});

// ─── Format time for display ──────────────────────────────────────────────────

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

interface MedForm {
  name: string;
  dosage: string;
  times: string[];
  ring_enabled: boolean;
}

const DEFAULT_FORM: MedForm = { name: '', dosage: '', times: ['08:00'], ring_enabled: false };

function MedModal({
  visible, initial, onSave, onCancel,
}: {
  visible: boolean;
  initial: MedForm;
  onSave: (f: MedForm) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MedForm>(initial);

  useEffect(() => { setForm(initial); }, [visible]);

  function addTime() { setForm((f) => ({ ...f, times: [...f.times, '12:00'] })); }
  function removeTime(i: number) {
    setForm((f) => ({ ...f, times: f.times.filter((_, idx) => idx !== i) }));
  }
  function updateTime(i: number, val: string) {
    setForm((f) => {
      const times = [...f.times];
      times[i] = val;
      return { ...f, times };
    });
  }

  const canSave = form.name.trim().length > 0 && form.times.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={md.overlay}>
        <View style={md.sheet}>
          <View style={md.handle} />
          <Text style={md.title}>{initial.name ? 'Edit medication' : 'Add medication'}</Text>

          {/* Name */}
          <Text style={md.label}>Medication name *</Text>
          <TextInput
            style={md.input}
            placeholder="e.g. Lithium, Quetiapine"
            placeholderTextColor="#3D393540"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          />

          {/* Dosage */}
          <Text style={md.label}>Dosage</Text>
          <TextInput
            style={md.input}
            placeholder="e.g. 300 mg, 50 mg twice"
            placeholderTextColor="#3D393540"
            value={form.dosage}
            onChangeText={(v) => setForm((f) => ({ ...f, dosage: v }))}
          />

          {/* Times */}
          <View style={md.timesHeader}>
            <Text style={md.label}>Intake times</Text>
            <TouchableOpacity onPress={addTime} style={md.addTimeBtn}>
              <Text style={md.addTimeTxt}>+ Add time</Text>
            </TouchableOpacity>
          </View>

          {form.times.map((t, i) => (
            <View key={i} style={md.timeRow}>
              <TimePicker value={t} onChange={(v) => updateTime(i, v)} />
              {form.times.length > 1 && (
                <TouchableOpacity onPress={() => removeTime(i)} style={md.removeTime}>
                  <Text style={md.removeTxt}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Ring toggle */}
          <View style={md.ringRow}>
            <View>
              <Text style={md.ringLabel}>🔔 Alarm ring</Text>
              <Text style={md.ringSub}>Sound alert (not just vibration)</Text>
            </View>
            <Switch
              value={form.ring_enabled}
              onValueChange={(v) => setForm((f) => ({ ...f, ring_enabled: v }))}
              trackColor={{ false: '#E0DDD8', true: '#A8C5A0' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Buttons */}
          <View style={md.btnRow}>
            <TouchableOpacity style={md.cancelBtn} onPress={onCancel}>
              <Text style={md.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[md.saveBtn, !canSave && md.saveBtnDisabled]}
              onPress={() => canSave && onSave(form)}
            >
              <Text style={md.saveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const md = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000040', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: '#E0DDD8', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#3D3935', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#3D3935', opacity: 0.45, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F7F3EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#3D3935', borderWidth: 1, borderColor: '#E8DCC8',
  },
  timesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  addTimeBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#A8C5A015', borderRadius: 8 },
  addTimeTxt: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7F3EE', borderRadius: 10, marginBottom: 8, paddingRight: 12 },
  removeTime: { padding: 8 },
  removeTxt: { fontSize: 13, color: '#3D393540' },
  ringRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, backgroundColor: '#F7F3EE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  ringLabel: { fontSize: 14, fontWeight: '500', color: '#3D3935' },
  ringSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#F0EDE8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: '#3D393580' },
  saveBtn: { flex: 2, backgroundColor: '#A8C5A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Medication card ──────────────────────────────────────────────────────────

function MedCard({ med, onEdit, onDelete }: {
  med: Medication;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={mc.card} onPress={onEdit} activeOpacity={0.7}>
      <View style={mc.top}>
        <View style={{ flex: 1 }}>
          <Text style={mc.name}>{med.name}</Text>
          {med.dosage ? <Text style={mc.dosage}>{med.dosage}</Text> : null}
        </View>
        {med.ring_enabled && <Text style={mc.ringIcon}>🔔</Text>}
        <TouchableOpacity onPress={onDelete} style={mc.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={mc.deleteTxt}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={mc.timeRow}>
        {med.times.map((t, i) => (
          <View key={i} style={mc.timePill}>
            <Text style={mc.timeText}>{fmt12(t)}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#3D3935' },
  dosage: { fontSize: 13, color: '#3D3935', opacity: 0.45, marginTop: 2 },
  ringIcon: { fontSize: 16, marginRight: 8, opacity: 0.7 },
  deleteBtn: { padding: 4 },
  deleteTxt: { fontSize: 14, color: '#3D393540' },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePill: { backgroundColor: '#A8C5A015', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  timeText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MedicationsScreen() {
  const { session } = useAuthStore();
  const store = useMedicationsStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  useEffect(() => {
    if (userId) store.load(userId);
  }, [userId]);

  function openAdd() {
    setEditingMed(null);
    setModalVisible(true);
  }

  function openEdit(med: Medication) {
    setEditingMed(med);
    setModalVisible(true);
  }

  async function handleSave(form: MedForm) {
    if (!userId) return;
    setModalVisible(false);
    if (editingMed) {
      await store.updateMedication(editingMed.id, {
        name: form.name,
        dosage: form.dosage || null,
        times: form.times,
        ring_enabled: form.ring_enabled,
      });
    } else {
      await store.addMedication(userId, {
        name: form.name,
        dosage: form.dosage || null,
        times: form.times,
        ring_enabled: form.ring_enabled,
        active: true,
      });
    }
  }

  function handleDelete(med: Medication) {
    Alert.alert(
      `Remove ${med.name}?`,
      'This will also cancel its reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => store.deleteMedication(med.id) },
      ],
    );
  }

  const initialForm: MedForm = editingMed
    ? { name: editingMed.name, dosage: editingMed.dosage ?? '', times: editingMed.times, ring_enabled: editingMed.ring_enabled }
    : DEFAULT_FORM;

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openAdd} style={s.addBtn}>
            <Text style={s.addTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Medications</Text>
        <Text style={s.subtitle}>
          Each medication can have multiple daily intake times with an optional alarm ring.
          Reminders are scheduled directly on your device — no data leaves the app.
        </Text>

        <ExpoGoBanner />

        {store.medications.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💊</Text>
            <Text style={s.emptyTitle}>No medications added</Text>
            <Text style={s.emptySub}>Tap "+ Add" to add your first medication and set intake times.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
              <Text style={s.emptyBtnTxt}>Add medication</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>YOUR MEDICATIONS</Text>
            {store.medications.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                onEdit={() => openEdit(med)}
                onDelete={() => handleDelete(med)}
              />
            ))}
          </>
        )}

        <View style={s.noteCard}>
          <Text style={s.noteText}>
            🔕 Ring mode plays a loud sound alarm. Standard mode vibrates only.
            {'\n'}Reminders are skipped if you have already logged medication for the day.
          </Text>
        </View>

        <TouchableOpacity style={s.notifLink} onPress={() => router.push('/(tabs)/you/notifications')} activeOpacity={0.7}>
          <Text style={s.notifLinkIcon}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.notifLinkTitle}>Notification Settings</Text>
            <Text style={s.notifLinkSub}>Manage check-in reminders, weekly report, early warnings and more</Text>
          </View>
          <Text style={s.notifLinkChevron}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <MedModal
        visible={modalVisible}
        initial={initialForm}
        onSave={handleSave}
        onCancel={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
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

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#3D3935', opacity: 0.4, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20, marginBottom: 20 },
  emptyBtn: { backgroundColor: '#A8C5A0', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  noteCard: {
    backgroundColor: '#F7F3EE', borderRadius: 12, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  noteText: { fontSize: 12, color: '#3D3935', opacity: 0.5, lineHeight: 18 },

  notifLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginTop: 10,
    borderWidth: 1, borderColor: '#F0EDE8',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  notifLinkIcon: { fontSize: 20 },
  notifLinkTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  notifLinkSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 16 },
  notifLinkChevron: { fontSize: 20, color: '#3D3935', opacity: 0.2 },
});
