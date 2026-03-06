import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useActivitiesStore } from '../../stores/activities';
import type { Activity, ActivityCompletion, CycleState } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const today = useTodayStore();
  const store = useActivitiesStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [noteSheetVisible, setNoteSheetVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [completed, setCompleted] = useState(false);

  const cycleState: CycleState = today.cycleState ?? 'stable';

  useEffect(() => {
    if (userId && store.all.length === 0) store.load(userId);
  }, [userId]);

  const activity: Activity | undefined = store.all.find((a) => a.id === id);
  const completions: ActivityCompletion[] = store.completions.filter(
    (c) => c.activity_id === id && c.completed_at !== null,
  );
  const isBookmarked = store.completions.some(
    (c) => c.activity_id === id && c.bookmarked,
  );

  if (!activity) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.emptyText}>Activity not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accentColor = CYCLE_COLORS[cycleState];

  async function handleBookmark() {
    if (!userId) return;
    await store.toggleBookmark(userId, activity!.id);
  }

  async function handleComplete() {
    if (!userId) return;
    await store.complete(userId, activity!.id, cycleState, noteText || undefined);
    setCompleted(true);
    setNoteSheetVisible(false);
    setNoteText('');
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav bar */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBookmark} style={s.bookmarkBtn}>
            <Text style={s.bookmarkBtnText}>{isBookmarked ? '🔖' : '🔖'}</Text>
            <Text style={[s.bookmarkLabel, isBookmarked && { color: accentColor }]}>
              {isBookmarked ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title block */}
        <View style={s.titleBlock}>
          <Text style={s.activityTitle}>{activity.title}</Text>
          <View style={s.metaRow}>
            {activity.duration_minutes && (
              <Text style={s.metaTag}>{activity.duration_minutes} min</Text>
            )}
            {activity.compatible_states?.map((st) => (
              <View key={st} style={[s.stateChip, { backgroundColor: CYCLE_COLORS[st] + '30' }]}>
                <Text style={[s.stateChipText, { color: CYCLE_COLORS[st] }]}>
                  {CYCLE_LABELS[st]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Description */}
        {activity.description ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>WHAT IT DOES</Text>
            <Text style={s.bodyText}>{activity.description}</Text>
          </View>
        ) : null}

        {/* Evidence */}
        {activity.evidence_label ? (
          <View style={s.evidenceRow}>
            <Text style={s.evidenceIcon}>📚</Text>
            <Text style={s.evidenceText}>{activity.evidence_label}</Text>
          </View>
        ) : null}

        {/* Past completions */}
        {completions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>PAST COMPLETIONS</Text>
            {completions.slice(0, 5).map((c) => (
              <View key={c.id} style={s.completionRow}>
                <Text style={s.completionDate}>
                  {c.completed_at ? formatRelative(c.completed_at) : '—'}
                </Text>
                {c.notes ? (
                  <Text style={s.completionNote}>"{c.notes}"</Text>
                ) : (
                  <Text style={s.completionNoNote}>No note</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mark Complete */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.completeBtn, { backgroundColor: completed ? '#A8C5A0' : accentColor }]}
          onPress={() => !completed && setNoteSheetVisible(true)}
          activeOpacity={completed ? 1 : 0.8}
        >
          <Text style={s.completeBtnText}>
            {completed ? '✓  Completed' : 'Mark Complete'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Note sheet */}
      <Modal visible={noteSheetVisible} transparent animationType="slide">
        <Pressable style={s.backdrop} onPress={() => setNoteSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>How did it go?</Text>
            <TextInput
              style={s.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note (optional)"
              placeholderTextColor="#3D393540"
              multiline
              autoFocus
            />
            <TouchableOpacity style={[s.sheetConfirm, { backgroundColor: accentColor }]} onPress={handleComplete}>
              <Text style={s.sheetConfirmText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#3D3935', opacity: 0.35 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  bookmarkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  bookmarkBtnText: { fontSize: 18 },
  bookmarkLabel: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '500' },

  titleBlock: { paddingVertical: 16 },
  activityTitle: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaTag: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginRight: 8 },
  stateChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  stateChipText: { fontSize: 12, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  bodyText: { fontSize: 15, color: '#3D3935', lineHeight: 23, opacity: 0.8 },

  evidenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 20,
  },
  evidenceIcon: { fontSize: 16 },
  evidenceText: { fontSize: 13, color: '#3D3935', opacity: 0.5, flex: 1 },

  completionRow: {
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
  },
  completionDate: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginBottom: 2 },
  completionNote: { fontSize: 14, color: '#3D3935', opacity: 0.7, fontStyle: 'italic' },
  completionNoNote: { fontSize: 13, color: '#3D3935', opacity: 0.25 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12,
    backgroundColor: '#F7F3EE',
  },
  completeBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  completeBtnText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE', letterSpacing: 0.2 },

  backdrop: { flex: 1, backgroundColor: '#00000030', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#F7F3EE', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 14 },
  noteInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    minHeight: 80, fontSize: 15, color: '#3D3935', lineHeight: 22, marginBottom: 14,
  },
  sheetConfirm: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetConfirmText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE' },
});
