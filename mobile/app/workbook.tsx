import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput,
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
    prompts: [
      'What does a stable week feel like for me?',
      'How do I know when I am shifting into a high period?',
      'What does a low period feel like in my body?',
      'What tends to trigger shifts for me?',
    ],
  },
  {
    title: 'My Triggers',
    prompts: [
      'What life events have come before episodes in the past?',
      'What environments tend to destabilise me?',
      'What relationships affect my mood most?',
      'What thought patterns appear before a shift?',
    ],
  },
  {
    title: 'My Warning Signs',
    prompts: [
      'What do people close to me notice before I do?',
      'What physical sensations appear early in a shift?',
      'What behaviours change first when I am shifting?',
      'What internal experiences signal a shift is coming?',
    ],
  },
  {
    title: 'My Strengths',
    prompts: [
      'What has helped me through difficult episodes before?',
      'Who supports me well, and how?',
      'What am I proud of in how I manage my condition?',
      'What would I tell someone newly diagnosed?',
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkbookScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [responses, setResponses] = useState<WorkbookResponse[]>([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (userId) loadResponses();
  }, [userId]);

  async function loadResponses() {
    if (!userId) return;
    const { data } = await supabase
      .from('workbook_responses')
      .select('*')
      .eq('user_id', userId);
    if (data) setResponses(data as WorkbookResponse[]);
  }

  function getResponse(chapter: number, promptIndex: number): string {
    const key = `${chapter}-${promptIndex}`;
    if (drafts[key] !== undefined) return drafts[key];
    return responses.find((r) => r.chapter === chapter + 1 && r.prompt_index === promptIndex)?.response ?? '';
  }

  function handleDraftChange(chapter: number, promptIndex: number, text: string) {
    const key = `${chapter}-${promptIndex}`;
    setDrafts((d) => ({ ...d, [key]: text }));
  }

  async function handleSavePrompt(chapter: number, promptIndex: number) {
    if (!userId) return;
    const key = `${chapter}-${promptIndex}`;
    const text = drafts[key];
    if (!text?.trim()) return;

    setSaving(key);
    const { data } = await supabase
      .from('workbook_responses')
      .upsert({
        user_id: userId,
        chapter: chapter + 1,
        prompt_index: promptIndex,
        response: text.trim(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (data) {
      setResponses((prev) => {
        const without = prev.filter(
          (r) => !(r.chapter === chapter + 1 && r.prompt_index === promptIndex),
        );
        return [...without, data as WorkbookResponse];
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
    }
    setSaving(null);
  }

  // Chapter lock logic: chapter N unlocks when all 4 prompts in chapter N-1 are answered
  function chapterAnsweredCount(chapter: number): number {
    return responses.filter((r) => r.chapter === chapter + 1).length;
  }
  function isChapterUnlocked(chapter: number): boolean {
    if (chapter === 0) return true;
    return chapterAnsweredCount(chapter - 1) >= 4;
  }

  const totalAnswered = responses.length;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Bipolar Workbook</Text>
        <Text style={s.subtitle}>
          {totalAnswered}/16 prompts answered
        </Text>

        {/* Progress dots */}
        <View style={s.progressRow}>
          {CHAPTERS.map((_, ci) => {
            const count = chapterAnsweredCount(ci);
            return (
              <View key={ci} style={s.chapterDots}>
                {[0, 1, 2, 3].map((pi) => (
                  <View
                    key={pi}
                    style={[
                      s.dot,
                      count > pi && s.dotFilled,
                    ]}
                  />
                ))}
              </View>
            );
          })}
        </View>

        {/* Chapter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chapterTabs}>
          {CHAPTERS.map((ch, ci) => {
            const unlocked = isChapterUnlocked(ci);
            return (
              <TouchableOpacity
                key={ci}
                style={[
                  s.chapterTab,
                  activeChapter === ci && s.chapterTabActive,
                  !unlocked && s.chapterTabLocked,
                ]}
                onPress={() => unlocked && setActiveChapter(ci)}
                disabled={!unlocked}
              >
                <Text style={[
                  s.chapterTabText,
                  activeChapter === ci && s.chapterTabTextActive,
                  !unlocked && s.chapterTabTextLocked,
                ]}>
                  {!unlocked ? `🔒  Ch. ${ci + 1}` : `Ch. ${ci + 1}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active chapter */}
        <View style={s.chapterContent}>
          <Text style={s.chapterTitle}>{CHAPTERS[activeChapter].title}</Text>

          {!isChapterUnlocked(activeChapter) ? (
            <View style={s.lockedState}>
              <Text style={s.lockedText}>
                Answer all {4 - chapterAnsweredCount(activeChapter - 1)} remaining prompts in
                Chapter {activeChapter} to unlock this chapter.
              </Text>
            </View>
          ) : (
            CHAPTERS[activeChapter].prompts.map((prompt, pi) => {
              const key = `${activeChapter}-${pi}`;
              const value = getResponse(activeChapter, pi);
              const isSaved = responses.some(
                (r) => r.chapter === activeChapter + 1 && r.prompt_index === pi,
              );
              const isDirty = drafts[key] !== undefined && drafts[key] !== (
                responses.find((r) => r.chapter === activeChapter + 1 && r.prompt_index === pi)?.response ?? ''
              );
              return (
                <View key={pi} style={s.promptBlock}>
                  <Text style={s.promptNumber}>Prompt {pi + 1}</Text>
                  <Text style={s.promptText}>{prompt}</Text>
                  <TextInput
                    style={s.responseInput}
                    value={value}
                    onChangeText={(text) => handleDraftChange(activeChapter, pi, text)}
                    placeholder="Write your response…"
                    placeholderTextColor="#3D393540"
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={s.promptFooter}>
                    {isSaved && !isDirty ? (
                      <Text style={s.savedTag}>✓ Saved</Text>
                    ) : (
                      <TouchableOpacity
                        style={[s.savePromptBtn, !value.trim() && s.savePromptBtnDisabled]}
                        onPress={() => handleSavePrompt(activeChapter, pi)}
                        disabled={!value.trim() || saving === key}
                      >
                        <Text style={s.savePromptBtnText}>
                          {saving === key ? 'Saving…' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            🔒  Your responses are private. They are never shared with the AI report, companions,
            or psychiatrists unless you export and share the PDF yourself.
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
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  nav: { paddingVertical: 8, marginBottom: 4 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.4, marginBottom: 16 },

  progressRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chapterDots: { flexDirection: 'row', gap: 4, flex: 1 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E0DDD8' },
  dotFilled: { backgroundColor: '#A8C5A0' },

  chapterTabs: { flexGrow: 0, marginBottom: 20 },
  chapterTab: {
    paddingVertical: 8, paddingHorizontal: 16, marginRight: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  chapterTabActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  chapterTabLocked: { borderColor: '#E0DDD8', opacity: 0.5 },
  chapterTabText: { fontSize: 13, color: '#3D3935', opacity: 0.5, fontWeight: '500' },
  chapterTabTextActive: { color: '#A8C5A0', opacity: 1, fontWeight: '700' },
  chapterTabTextLocked: { color: '#3D3935', opacity: 0.3 },

  chapterContent: { marginBottom: 20 },
  chapterTitle: { fontSize: 19, fontWeight: '700', color: '#3D3935', marginBottom: 16 },

  lockedState: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, alignItems: 'center',
  },
  lockedText: { fontSize: 14, color: '#3D3935', opacity: 0.4, textAlign: 'center', lineHeight: 20 },

  promptBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  promptNumber: { fontSize: 11, fontWeight: '700', color: '#A8C5A0', letterSpacing: 0.5, marginBottom: 6 },
  promptText: { fontSize: 15, fontWeight: '600', color: '#3D3935', lineHeight: 21, marginBottom: 12 },
  responseInput: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    minHeight: 80, fontSize: 14, color: '#3D3935', lineHeight: 20,
  },
  promptFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  savedTag: { fontSize: 12, color: '#A8C5A0', fontWeight: '600' },
  savePromptBtn: {
    backgroundColor: '#A8C5A0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16,
  },
  savePromptBtnDisabled: { opacity: 0.35 },
  savePromptBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  privacyNote: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  privacyText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
