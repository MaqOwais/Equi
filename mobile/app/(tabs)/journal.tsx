import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useJournalStore } from '../../stores/journal';
import type { CycleState } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_PROMPTS: Record<CycleState, string> = {
  stable:     "How's your day going?",
  manic:      'Take a moment to reflect.',
  depressive: "You don't need to write much — even a few words is enough.",
  mixed:      "Whatever you're feeling right now is valid.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatHeader(d: Date) {
  const isToday = toIso(d) === toIso(new Date());
  if (isToday) return 'Today';
  const isYesterday = toIso(d) === toIso(addDays(new Date(), -1));
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatSubDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const { session } = useAuthStore();
  const today = useTodayStore();
  const journal = useJournalStore();
  const userId = session?.user.id;

  const [activeDate, setActiveDate] = useState(new Date());
  const activeDateKey = toIso(activeDate);
  const isToday = activeDateKey === toIso(new Date());

  const entry = journal.entries[activeDateKey];
  const [draft, setDraft] = useState(entry?.text ?? '');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = journal.savingDate === activeDateKey;

  // Load entry when date changes
  useEffect(() => {
    if (userId) journal.loadEntry(userId, activeDateKey);
  }, [userId, activeDateKey]);

  // Sync draft when entry loads from DB
  useEffect(() => {
    setDraft(entry?.text ?? '');
  }, [entry?.id]);

  // Auto-save debounced 1.5s
  const scheduleSave = useCallback(
    (text: string) => {
      if (!userId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        journal.saveEntry(userId, activeDateKey, text, {
          cycleState: today.cycleState,
          moodScore: today.moodScore ?? undefined,
        });
      }, 1500);
    },
    [userId, activeDateKey, today.cycleState, today.moodScore],
  );

  function handleTextChange(text: string) {
    setDraft(text);
    scheduleSave(text);
  }

  function navigateDate(dir: -1 | 1) {
    setActiveDate((d) => addDays(d, dir));
  }

  const cycleState: CycleState = today.cycleState ?? 'stable';
  const isLocked = entry?.locked ?? false;
  const isFuture = activeDate > new Date();

  const placeholder = CYCLE_PROMPTS[cycleState];

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Date navigation */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => navigateDate(-1)} style={s.navArrow}>
            <Text style={s.navArrowText}>←</Text>
          </TouchableOpacity>

          <View style={s.navCenter}>
            <Text style={s.navTitle}>{formatHeader(activeDate)}</Text>
            <Text style={s.navSub}>{formatSubDate(activeDate)}</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigateDate(1)}
            style={s.navArrow}
            disabled={isToday}
          >
            <Text style={[s.navArrowText, isToday && s.navArrowDisabled]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Status strip */}
        <View style={s.strip}>
          {isSaving ? (
            <Text style={s.savingText}>Saving…</Text>
          ) : entry?.updatedAt ? (
            <Text style={s.savedText}>Saved</Text>
          ) : null}

          {isLocked && (
            <View style={s.lockBadge}>
              <Text style={s.lockText}>🔒  Locked</Text>
            </View>
          )}
        </View>

        {/* Editor */}
        {isFuture ? (
          <View style={s.futureState}>
            <Text style={s.futureText}>No entries for future dates.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.editorScroll}
            keyboardShouldPersistTaps="handled"
          >
            {isLocked ? (
              <Text style={s.lockedText}>
                {entry?.text || 'No entry for this day.'}
              </Text>
            ) : (
              <TextInput
                style={s.editor}
                value={draft}
                onChangeText={handleTextChange}
                placeholder={placeholder}
                placeholderTextColor="#3D393540"
                multiline
                textAlignVertical="top"
                autoCorrect
                scrollEnabled={false}
              />
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  // Date nav
  nav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
  },
  navArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navArrowText: { fontSize: 20, color: '#A8C5A0', fontWeight: '600' },
  navArrowDisabled: { color: '#3D393530' },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', letterSpacing: -0.2 },
  navSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 1 },

  // Status strip
  strip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 18, paddingVertical: 6, minHeight: 28,
  },
  savingText: { fontSize: 12, color: '#3D3935', opacity: 0.35 },
  savedText: { fontSize: 12, color: '#A8C5A0', fontWeight: '500' },
  lockBadge: {
    backgroundColor: '#E8DCC880', borderRadius: 8,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  lockText: { fontSize: 11, color: '#3D3935', opacity: 0.5, fontWeight: '500' },

  // Editor
  editorScroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  editor: {
    flex: 1, fontSize: 16, color: '#3D3935',
    lineHeight: 26, minHeight: 400,
  },
  lockedText: { fontSize: 16, color: '#3D3935', lineHeight: 26, opacity: 0.7 },

  // Future state
  futureState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  futureText: { fontSize: 14, color: '#3D3935', opacity: 0.3 },
});
