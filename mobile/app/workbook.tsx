import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../lib/supabase';
import type { WorkbookResponse } from '../types/database';

// ─── Content ──────────────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    title: 'Understanding My Cycles',
    icon: '🌊',
    description: 'Learn to recognise the texture of each mood state in your own life — before symptoms escalate.',
    prompts: [
      'What does a stable week feel like for me?',
      'How do I know when I am shifting into a high period?',
      'What does a low period feel like in my body?',
      'What tends to trigger shifts for me?',
    ],
  },
  {
    title: 'My Triggers',
    icon: '🌿',
    description: 'Map the events, environments, and thought patterns that tend to precede mood shifts.',
    prompts: [
      'What life events have come before episodes in the past?',
      'What environments tend to destabilise me?',
      'What relationships affect my mood most?',
      'What thought patterns appear before a shift?',
    ],
  },
  {
    title: 'My Warning Signs',
    icon: '🔔',
    description: 'Build an early-warning system based on what you — and those close to you — have observed.',
    prompts: [
      'What do people close to me notice before I do?',
      'What physical sensations appear early in a shift?',
      'What behaviours change first when I am shifting?',
      'What internal experiences signal a shift is coming?',
    ],
  },
  {
    title: 'My Strengths',
    icon: '✨',
    description: 'Identify the resources, relationships, and hard-won wisdom that have carried you through.',
    prompts: [
      'What has helped me through difficult episodes before?',
      'Who supports me well, and how?',
      'What am I proud of in how I manage my condition?',
      'What would I tell someone newly diagnosed?',
    ],
  },
];

const SAGE = '#A8C5A0';
const CHARCOAL = '#3D3935';
const SURFACE = '#F7F3EE';
const SAND = '#E8DCC8';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkbookScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [responses, setResponses] = useState<WorkbookResponse[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (userId) loadResponses();
  }, [userId]);

  async function loadResponses() {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from('workbook_responses')
      .select('*')
      .eq('user_id', userId);
    if (data) setResponses(data as WorkbookResponse[]);
  }

  function getSaved(chapter: number, pi: number): string {
    return responses.find((r) => r.chapter === chapter + 1 && r.prompt_index === pi)?.response ?? '';
  }

  function getValue(chapter: number, pi: number): string {
    const key = `${chapter}-${pi}`;
    return drafts[key] !== undefined ? drafts[key] : getSaved(chapter, pi);
  }

  function handleChange(chapter: number, pi: number, text: string) {
    const key = `${chapter}-${pi}`;
    setDrafts((d) => ({ ...d, [key]: text }));
    setSaveState((s) => ({ ...s, [key]: 'idle' }));

    // Debounce autosave — 1.5 s after user stops typing
    clearTimeout(saveTimers.current[key]);
    if (text.trim()) {
      saveTimers.current[key] = setTimeout(() => save(chapter, pi, text), 1500);
    }
  }

  async function save(chapter: number, pi: number, text: string) {
    if (!userId || !text.trim()) return;
    const key = `${chapter}-${pi}`;
    setSaveState((s) => ({ ...s, [key]: 'saving' }));

    const { data } = await (supabase as any)
      .from('workbook_responses')
      .upsert({
        user_id: userId,
        chapter: chapter + 1,
        prompt_index: pi,
        response: text.trim(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (data) {
      setResponses((prev) => {
        const without = prev.filter(
          (r) => !(r.chapter === chapter + 1 && r.prompt_index === pi),
        );
        return [...without, data as WorkbookResponse];
      });
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    }
    setSaveState((s) => ({ ...s, [key]: 'saved' }));
  }

  function chapterCount(ci: number): number {
    return responses.filter((r) => r.chapter === ci + 1).length;
  }
  function isUnlocked(ci: number): boolean {
    return ci === 0 || chapterCount(ci - 1) >= 4;
  }
  function isChapterComplete(ci: number): boolean {
    return chapterCount(ci) >= 4;
  }

  const totalAnswered = responses.length;
  const progressPct = (totalAnswered / 16) * 100;

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.privacyBadge}>
            <Text style={s.privacyBadgeText}>🔒 Private</Text>
          </View>
        </View>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Text style={s.title}>Bipolar Workbook</Text>
        <Text style={s.subtitle}>CBT & psychoeducation · 4 chapters · 16 prompts</Text>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={s.progressLabel}>{totalAnswered} / 16</Text>
        </View>

        {/* Chapter progress dots */}
        <View style={s.chapterDotsRow}>
          {CHAPTERS.map((ch, ci) => {
            const count = chapterCount(ci);
            const complete = count >= 4;
            const unlocked = isUnlocked(ci);
            return (
              <TouchableOpacity
                key={ci}
                style={[s.chapterDotBlock, activeChapter === ci && s.chapterDotBlockActive]}
                onPress={() => unlocked && setActiveChapter(ci)}
                disabled={!unlocked}
                activeOpacity={0.7}
              >
                <Text style={[s.chapterDotIcon, !unlocked && { opacity: 0.3 }]}>
                  {!unlocked ? '🔒' : complete ? '✓' : ch.icon}
                </Text>
                <Text style={[s.chapterDotLabel, activeChapter === ci && { color: SAGE, fontWeight: '700' }, !unlocked && { opacity: 0.3 }]} numberOfLines={1}>
                  {ch.title.split(' ').slice(0, 2).join(' ')}
                </Text>
                <View style={s.chapterMiniDots}>
                  {[0,1,2,3].map((pi) => (
                    <View
                      key={pi}
                      style={[s.miniDot, count > pi && { backgroundColor: SAGE }]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Active chapter ───────────────────────────────────────────────── */}
        <View style={s.chapterCard}>
          <View style={s.chapterHeader}>
            <Text style={s.chapterIcon}>{CHAPTERS[activeChapter].icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.chapterNum}>Chapter {activeChapter + 1}</Text>
              <Text style={s.chapterTitle}>{CHAPTERS[activeChapter].title}</Text>
            </View>
            {isChapterComplete(activeChapter) && (
              <View style={s.completeBadge}>
                <Text style={s.completeBadgeText}>Complete ✓</Text>
              </View>
            )}
          </View>
          <Text style={s.chapterDesc}>{CHAPTERS[activeChapter].description}</Text>
        </View>

        {/* Locked state */}
        {!isUnlocked(activeChapter) ? (
          <View style={s.lockedCard}>
            <Text style={s.lockedIcon}>🔒</Text>
            <Text style={s.lockedTitle}>Chapter Locked</Text>
            <Text style={s.lockedDesc}>
              Answer all {4 - chapterCount(activeChapter - 1)} remaining prompts in Chapter {activeChapter}{' '}
              to unlock this chapter.
            </Text>
            <TouchableOpacity
              style={s.lockedBtn}
              onPress={() => setActiveChapter(activeChapter - 1)}
              activeOpacity={0.7}
            >
              <Text style={s.lockedBtnText}>Go to Chapter {activeChapter} →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {CHAPTERS[activeChapter].prompts.map((prompt, pi) => {
              const key = `${activeChapter}-${pi}`;
              const value = getValue(activeChapter, pi);
              const state = saveState[key] ?? 'idle';
              const isSaved = responses.some(
                (r) => r.chapter === activeChapter + 1 && r.prompt_index === pi,
              );
              const isDirty = drafts[key] !== undefined;

              return (
                <View key={pi} style={s.promptCard}>
                  <View style={[s.promptAccent, isSaved && !isDirty && { backgroundColor: SAGE }]} />
                  <View style={s.promptBody}>
                    <View style={s.promptLabelRow}>
                      <Text style={s.promptLabel}>PROMPT {pi + 1} OF 4</Text>
                      <SaveIndicator state={state} isSaved={isSaved} isDirty={isDirty} />
                    </View>
                    <Text style={s.promptText}>{prompt}</Text>
                    <TextInput
                      style={s.input}
                      value={value}
                      onChangeText={(t) => handleChange(activeChapter, pi, t)}
                      placeholder="Write your response…"
                      placeholderTextColor={CHARCOAL + '30'}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              );
            })}

            {/* Chapter complete card */}
            {isChapterComplete(activeChapter) && activeChapter < 3 && (
              <TouchableOpacity
                style={s.nextChapterCard}
                onPress={() => setActiveChapter(activeChapter + 1)}
                activeOpacity={0.8}
              >
                <Text style={s.nextChapterLabel}>Chapter {activeChapter + 1} complete ✓</Text>
                <Text style={s.nextChapterTitle}>
                  Next: {CHAPTERS[activeChapter + 1].icon} {CHAPTERS[activeChapter + 1].title}
                </Text>
                <Text style={s.nextChapterArrow}>Continue →</Text>
              </TouchableOpacity>
            )}

            {isChapterComplete(activeChapter) && activeChapter === 3 && (
              <View style={s.finishedCard}>
                <Text style={s.finishedEmoji}>🌿</Text>
                <Text style={s.finishedTitle}>Workbook Complete</Text>
                <Text style={s.finishedDesc}>
                  You have answered all 16 prompts. This is valuable self-knowledge — revisit any
                  chapter any time as your understanding grows.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Privacy note */}
        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            Your responses are private and never sent to the AI report, companions, or psychiatrists
            unless you choose to export and share the PDF yourself.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({
  state, isSaved, isDirty,
}: { state: 'idle' | 'saving' | 'saved'; isSaved: boolean; isDirty: boolean }) {
  if (state === 'saving') return <Text style={si.saving}>Saving…</Text>;
  if (isSaved && !isDirty) return <Text style={si.saved}>✓ Saved</Text>;
  return null;
}
const si = StyleSheet.create({
  saving: { fontSize: 11, color: CHARCOAL, opacity: 0.35 },
  saved: { fontSize: 11, color: SAGE, fontWeight: '600' },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  // Nav
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 8 },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backText: { fontSize: 15, color: SAGE, fontWeight: '600' },
  privacyBadge: { backgroundColor: SURFACE, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  privacyBadgeText: { fontSize: 11, color: CHARCOAL, opacity: 0.5, fontWeight: '600' },

  // Header
  title: { fontSize: 26, fontWeight: '700', color: CHARCOAL, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 12, color: CHARCOAL, opacity: 0.4, marginBottom: 20 },

  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: SURFACE },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: SAGE },
  progressLabel: { fontSize: 12, fontWeight: '700', color: SAGE, minWidth: 36, textAlign: 'right' },

  // Chapter dot nav
  chapterDotsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chapterDotBlock: {
    flex: 1, alignItems: 'center', padding: 10, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1.5, borderColor: 'transparent',
  },
  chapterDotBlockActive: { borderColor: SAGE, backgroundColor: SAGE + '0F' },
  chapterDotIcon: { fontSize: 18, marginBottom: 4 },
  chapterDotLabel: { fontSize: 10, color: CHARCOAL, opacity: 0.5, textAlign: 'center', marginBottom: 6 },
  chapterMiniDots: { flexDirection: 'row', gap: 3 },
  miniDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0DDD8' },

  // Chapter card
  chapterCard: {
    backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  chapterHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  chapterIcon: { fontSize: 24 },
  chapterNum: { fontSize: 11, fontWeight: '700', color: SAGE, letterSpacing: 0.5, marginBottom: 2 },
  chapterTitle: { fontSize: 16, fontWeight: '700', color: CHARCOAL },
  completeBadge: { backgroundColor: SAGE + '22', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  completeBadgeText: { fontSize: 11, color: SAGE, fontWeight: '700' },
  chapterDesc: { fontSize: 13, color: CHARCOAL, opacity: 0.55, lineHeight: 19 },

  // Locked
  lockedCard: {
    backgroundColor: SURFACE, borderRadius: 16, padding: 28,
    alignItems: 'center', marginBottom: 16,
  },
  lockedIcon: { fontSize: 32, marginBottom: 12 },
  lockedTitle: { fontSize: 16, fontWeight: '700', color: CHARCOAL, marginBottom: 8 },
  lockedDesc: { fontSize: 13, color: CHARCOAL, opacity: 0.45, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  lockedBtn: { backgroundColor: SAGE, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  lockedBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Prompt card
  promptCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    shadowColor: CHARCOAL, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  promptAccent: { width: 4, backgroundColor: '#E0DDD8' },
  promptBody: { flex: 1, padding: 14 },
  promptLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  promptLabel: { fontSize: 10, fontWeight: '700', color: SAGE, letterSpacing: 0.8 },
  promptText: { fontSize: 15, fontWeight: '600', color: CHARCOAL, lineHeight: 21, marginBottom: 10 },
  input: {
    backgroundColor: SURFACE, borderRadius: 10, padding: 12,
    minHeight: 90, fontSize: 14, color: CHARCOAL, lineHeight: 20,
  },

  // Next chapter / finished
  nextChapterCard: {
    backgroundColor: SAGE + '15', borderRadius: 14, padding: 18,
    borderWidth: 1.5, borderColor: SAGE + '44', marginBottom: 12,
  },
  nextChapterLabel: { fontSize: 11, fontWeight: '700', color: SAGE, marginBottom: 6 },
  nextChapterTitle: { fontSize: 15, fontWeight: '700', color: CHARCOAL, marginBottom: 8 },
  nextChapterArrow: { fontSize: 13, color: SAGE, fontWeight: '600' },

  finishedCard: {
    backgroundColor: SAND + '66', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 12,
  },
  finishedEmoji: { fontSize: 36, marginBottom: 12 },
  finishedTitle: { fontSize: 17, fontWeight: '700', color: CHARCOAL, marginBottom: 8 },
  finishedDesc: { fontSize: 13, color: CHARCOAL, opacity: 0.55, textAlign: 'center', lineHeight: 19 },

  // Privacy
  privacyNote: { backgroundColor: SURFACE, borderRadius: 12, padding: 14, marginTop: 4 },
  privacyText: { fontSize: 11, color: CHARCOAL, opacity: 0.38, lineHeight: 17 },
});
