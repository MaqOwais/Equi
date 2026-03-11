import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { useMedicationsStore } from '../../../stores/medications';
import type { SubstanceCategory, UserSubstance } from '../../../types/database';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { key: SubstanceCategory; label: string; icon: string }[] = [
  { key: 'alcohol',   label: 'Alcohol',    icon: '🍷' },
  { key: 'cannabis',  label: 'Cannabis',   icon: '🌿' },
  { key: 'stimulant', label: 'Stimulant',  icon: '⚡' },
  { key: 'opioid',    label: 'Opioid',     icon: '💊' },
  { key: 'other',     label: 'Other',      icon: '🫙' },
];

function catIcon(cat: string) {
  return CATEGORIES.find((c) => c.key === cat)?.icon ?? '🫙';
}
function catLabel(cat: string) {
  return CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
}

// ─── Add modal ────────────────────────────────────────────────────────────────

function AddModal({
  visible, onSave, onCancel,
}: {
  visible: boolean;
  onSave: (name: string, category: SubstanceCategory) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [cat, setCat] = useState<SubstanceCategory>('other');

  useEffect(() => {
    if (visible) { setName(''); setCat('other'); }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={am.overlay}>
        <View style={am.sheet}>
          <View style={am.handle} />
          <Text style={am.title}>Add substance</Text>
          <Text style={am.subtitle}>
            Track anything you consume — alcohol, cannabis, supplements, or anything else.
          </Text>

          <Text style={am.label}>Name</Text>
          <TextInput
            style={am.input}
            placeholder="e.g. Whiskey, THC gummies, Kratom"
            placeholderTextColor="#3D393540"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={am.label}>Category</Text>
          <View style={am.catGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={[am.catChip, cat === c.key && am.catChipActive]}
                onPress={() => setCat(c.key)}
              >
                <Text style={am.catIcon}>{c.icon}</Text>
                <Text style={[am.catLabel, cat === c.key && am.catLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={am.btnRow}>
            <TouchableOpacity style={am.cancelBtn} onPress={onCancel}>
              <Text style={am.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[am.saveBtn, !name.trim() && am.saveBtnDisabled]}
              onPress={() => name.trim() && onSave(name.trim(), cat)}
            >
              <Text style={am.saveTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000040', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  handle: { width: 36, height: 4, backgroundColor: '#E0DDD8', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#3D3935', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.4, lineHeight: 18, marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 12,
  },
  input: {
    backgroundColor: '#F7F3EE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#3D3935', borderWidth: 1, borderColor: '#E8DCC8',
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#F7F3EE', borderRadius: 20, borderWidth: 1, borderColor: '#E8DCC8', gap: 6,
  },
  catChipActive: { backgroundColor: '#A8C5A015', borderColor: '#A8C5A0' },
  catIcon: { fontSize: 15 },
  catLabel: { fontSize: 13, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  catLabelActive: { color: '#A8C5A0', opacity: 1, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#F0EDE8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: '#3D393580' },
  saveBtn: { flex: 2, backgroundColor: '#A8C5A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Substance row ────────────────────────────────────────────────────────────

function SubRow({ sub, onDelete }: { sub: UserSubstance; onDelete: () => void }) {
  return (
    <View style={sr.row}>
      <Text style={sr.icon}>{catIcon(sub.category)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={sr.name}>{sub.name}</Text>
        <Text style={sr.cat}>{catLabel(sub.category)}</Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={sr.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={sr.deleteTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#F0EDE8',
  },
  icon: { fontSize: 22, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600', color: '#3D3935' },
  cat: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginTop: 2 },
  deleteBtn: { padding: 6 },
  deleteTxt: { fontSize: 14, color: '#3D393540' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SubstancesScreen() {
  const { session } = useAuthStore();
  const store = useMedicationsStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (userId) store.load(userId);
  }, [userId]);

  async function handleAdd(name: string, category: SubstanceCategory) {
    if (!userId) return;
    setModalVisible(false);
    await store.addSubstance(userId, { name, category });
  }

  function handleDelete(sub: UserSubstance) {
    Alert.alert(
      `Remove ${sub.name}?`,
      'It will no longer appear in your daily check-ins.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => store.deleteSubstance(sub.id) },
      ],
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={s.addBtn}>
            <Text style={s.addTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Substances</Text>
        <Text style={s.subtitle}>
          Add substances you want to track in daily check-ins.
          Only what you add here will appear — add nothing to hide the section entirely.
        </Text>

        {store.substances.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🫙</Text>
            <Text style={s.emptyTitle}>Nothing tracked yet</Text>
            <Text style={s.emptySub}>
              If you don't add any substances, the substance section is hidden from your check-ins.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={s.emptyBtnTxt}>Add a substance</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>TRACKED SUBSTANCES</Text>
            {store.substances.map((sub) => (
              <SubRow key={sub.id} sub={sub} onDelete={() => handleDelete(sub)} />
            ))}
          </>
        )}

        <View style={s.noteCard}>
          <Text style={s.noteText}>
            All substance data is private, encrypted, and never shared with anyone — including your psychiatrist — without explicit consent.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddModal
        visible={modalVisible}
        onSave={handleAdd}
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
});
