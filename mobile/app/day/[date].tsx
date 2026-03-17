import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCalendarStore } from '../../stores/calendar';
import { useAuthStore } from '../../stores/auth';
import { useTasksStore, type EnergyLevel } from '../../stores/tasks';
import { useCycleStore } from '../../stores/cycle';
import { callGroq } from '../../lib/groq';
import { supabase } from '../../lib/supabase';
import type { DayData } from '../../stores/calendar';
import type { WorkbookResponse } from '../../types/database';
import type { SubLog } from '../../stores/substanceLogs';
import { fmtTime } from '../../utils/timestamps';

const SUB_ICONS: Record<string, string> = {
  alcohol: '🍷', cannabis: '🌿', stimulant: '⚡', opioid: '💊', other: '🫙',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<string, string> = {
  stable:     '#A8C5A0',
  manic:      '#89B4CC',
  depressive: '#C4A0B0',
  mixed:      '#E8DCC8',
};

const NUTRITION_LABELS: Record<string, { label: string; icon: string }> = {
  anti_inflammatory: { label: 'Anti-inflammatory',  icon: '🫐' },
  whole_grains:      { label: 'Whole Grains',        icon: '🌾' },
  lean_protein:      { label: 'Lean Protein',        icon: '🥚' },
  healthy_fats:      { label: 'Healthy Fats',        icon: '🥑' },
  fermented:         { label: 'Fermented / Gut',     icon: '🥛' },
  caffeine:          { label: 'Caffeine',             icon: '☕' },
  ultra_processed:   { label: 'Ultra-Processed',     icon: '🍟' },
  sugar_heavy:       { label: 'Sugar-Heavy',         icon: '🍬' },
  alcohol:           { label: 'Alcohol (diet log)',  icon: '🍷' },
  hydration:         { label: 'Hydration',           icon: '💧' },
  lithium_interaction: { label: 'Lithium-Watch',     icon: '⚠️' },
};


function formatFullDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getWeekStart(date: string) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getTime() + diff * 86400000).toISOString().split('T')[0];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const user = session?.user;
  const { days, isLoading, loadMonth, buildWeekPrompt, year, month, setMonth } = useCalendarStore();

  const tasksStore = useTasksStore();
  const cycleStore = useCycleStore();
  const [taskInput, setTaskInput] = useState('');
  const [taskEnergy, setTaskEnergy] = useState<EnergyLevel>('medium');
  const [taskInputVisible, setTaskInputVisible] = useState(false);

  const [journalExpanded, setJournalExpanded] = useState(false);
  const [workbookEntries, setWorkbookEntries] = useState<WorkbookResponse[]>([]);
  const [userMeds, setUserMeds] = useState<{ name: string; dosage: string | null }[]>([]);
  const [userSubstances, setUserSubstances] = useState<{ id: string; name: string; category: string }[]>([]);
  const [substanceLogs, setSubstanceLogs] = useState<Record<string, SubLog>>({});
  const [detailData, setDetailData] = useState<{
    activities: { title: string; completed_at: string }[];
    journalCreatedAt: string | null;
    sleepLoggedAt: string | null;
    nutritionLoggedAt: string | null;
    medLoggedAt: string | null;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Ensure the right month is loaded
  useEffect(() => {
    if (!date || !user?.id) return;
    const [y, m] = date.split('-').map(Number);
    if (y !== year || m !== month) setMonth(y, m);
  }, [date]);

  useEffect(() => {
    if (user?.id) loadMonth(user.id);
  }, [year, month, user?.id]);

  useEffect(() => {
    if (date && user?.id) {
      tasksStore.loadDate(user.id, date);
      cycleStore.loadDay(user.id, date);
    }
  }, [date, user?.id]);

  async function addTask() {
    if (!date || !user?.id || !taskInput.trim()) return;
    await tasksStore.addTask(user.id, taskInput.trim(), date, taskEnergy);
    setTaskInput('');
    setTaskInputVisible(false);
    setTaskEnergy('medium');
  }

  // Fetch workbook entries and timestamped detail data
  useEffect(() => {
    if (!date || !user?.id) return;
    const db = supabase as any;
    // Workbook entries
    db.from('workbook_responses').select('*').eq('user_id', user.id).eq('entry_date', date)
      .order('created_at', { ascending: true })
      .then(({ data: rows }: { data: WorkbookResponse[] | null }) => {
        if (rows) setWorkbookEntries(rows);
      });
    // Fetch user's active medications for per-med display
    db.from('medications').select('name, dosage').eq('user_id', user.id).eq('active', true)
      .then(({ data: meds }: { data: { name: string; dosage: string | null }[] | null }) => {
        if (meds) setUserMeds(meds);
      });
    // Fetch user's tracked substances + their logs for this date
    db.from('user_substances').select('id, name, category').eq('user_id', user.id).eq('active', true)
      .then(({ data: subs }: { data: { id: string; name: string; category: string }[] | null }) => {
        if (subs) setUserSubstances(subs);
      });
    AsyncStorage.getItem(`equi_sub_logs_${user.id}_${date}`).then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean | SubLog>;
      const logs: Record<string, SubLog> = {};
      for (const [id, val] of Object.entries(parsed)) {
        logs[id] = typeof val === 'boolean' ? { used: val, amount: 1 } : val;
      }
      setSubstanceLogs(logs);
    });
    // Timestamped details
    Promise.all([
      db.from('activity_completions').select('completed_at, activity:activities(title)')
        .eq('user_id', user.id)
        .gte('completed_at', date + 'T00:00:00').lte('completed_at', date + 'T23:59:59')
        .order('completed_at', { ascending: true }),
      db.from('journal_entries').select('created_at').eq('user_id', user.id).eq('entry_date', date).single(),
      db.from('sleep_logs').select('created_at').eq('user_id', user.id).eq('date', date).single(),
      db.from('nutrition_logs').select('updated_at').eq('user_id', user.id).eq('log_date', date).single(),
      db.from('medication_logs').select('created_at').eq('user_id', user.id).eq('log_date', date).single(),
    ]).then(([acts, jour, slp, nut, med]: any[]) => {
      setDetailData({
        activities: (acts.data ?? []).map((r: any) => ({
          title: r.activity?.title ?? 'Activity',
          completed_at: r.completed_at,
        })),
        journalCreatedAt: jour.data?.created_at ?? null,
        sleepLoggedAt: slp.data?.created_at ?? null,
        nutritionLoggedAt: nut.data?.updated_at ?? null,
        medLoggedAt: med.data?.created_at ?? null,
      });
    });
  }, [date, user?.id]);

  const data: DayData | null = date ? (days[date] ?? null) : null;
  const cycleColor = data?.cycleState ? CYCLE_COLORS[data.cycleState] : '#A8C5A0';

  async function handleAiSummary() {
    if (!date) return;
    const prompt = buildWeekPrompt(getWeekStart(date));
    setAiLoading(true);
    setAiError(null);
    setAiText(null);
    setShowAiModal(true);
    try {
      const result = await callGroq([
        {
          role: 'system',
          content:
            'You are a warm, supportive clinical wellness assistant for a bipolar disorder monitoring app. Be non-judgmental, careful, and concise. Never diagnose.',
        },
        { role: 'user', content: prompt },
      ]);
      setAiText(result);
    } catch (e: any) {
      setAiError(e.message ?? 'Something went wrong');
    }
    setAiLoading(false);
  }

  // Early return — TypeScript narrows `data` to DayData after this point
  if (isLoading || !data) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[s.header, { borderBottomColor: '#A8C5A044' }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#A8C5A0" />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.headerDate}>{date ? formatFullDate(date) : '—'}</Text>
          </View>
        </View>
        <View style={s.loadingBox}>
          <ActivityIndicator color="#A8C5A0" size="large" />
          <Text style={s.loadingText}>Loading day…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: cycleColor + '44' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={cycleColor} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerDate}>{date ? formatFullDate(date) : '—'}</Text>
          {data.cycleState && (
            <View style={[s.cycleChip, { backgroundColor: cycleColor + '22', borderColor: cycleColor + '55' }]}>
              <View style={[s.cycleDot, { backgroundColor: cycleColor }]} />
              <Text style={[s.cycleChipText, { color: cycleColor }]}>
                {data.cycleState} · {data.cycleIntensity ?? '—'}/10
              </Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Cycle (multi-entry timeline) ── */}
          {(cycleStore.dayEntries.length > 0 || data.cycleState) && (
            <SectionCard title="Cycle State" icon="pulse-outline" color={cycleColor}>
              {cycleStore.dayEntries.length > 0 ? (
                // Full timestamped timeline from Supabase
                cycleStore.dayEntries.map((entry, i) => (
                  <View key={entry.id}>
                    {i > 0 && <View style={s.entryDivider} />}
                    <View style={s.entryRow}>
                      <Text style={s.entryTime}>{fmtTime(entry.timestamp)}</Text>
                      <View style={[s.entryDot, { backgroundColor: CYCLE_COLORS[entry.state] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.entryState, { color: CYCLE_COLORS[entry.state] }]}>
                          {entry.state.charAt(0).toUpperCase() + entry.state.slice(1)} · {entry.intensity}/10
                        </Text>
                        {entry.symptoms.length > 0 && (
                          <Text style={s.entrySub}>{entry.symptoms.join(', ')}</Text>
                        )}
                        {entry.notes && (
                          <Text style={s.entryNotes}>{entry.notes}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                // Fallback to calendar store data (offline / before Supabase loads)
                <>
                  <DataRow label="Cycle state" value={data.cycleState!} capitalize />
                  <DataRow label="Intensity" value={`${data.cycleIntensity ?? '—'} / 10`} />
                  {data.cycleSymptoms.length > 0 && (
                    <DataRow label="Symptoms" value={data.cycleSymptoms.join(', ')} />
                  )}
                  {data.cycleNotes && (
                    <DataRow label="Notes" value={data.cycleNotes} />
                  )}
                </>
              )}
            </SectionCard>
          )}
          {/* ── Mood score (optional, only if logged) ── */}
          {data.moodScore !== null && (
            <SectionCard title="Mood" icon="happy-outline" color="#C9A84C">
              <DataRow label="Mood score" value={`${data.moodScore} / 10`} accent="#C9A84C" />
            </SectionCard>
          )}

          {/* ── Sleep ── */}
          {data.sleepDuration !== null && (
            <SectionCard title="Sleep" icon="moon-outline" color="#89B4CC">
              <DataRow label="Duration" value={`${(data.sleepDuration / 60).toFixed(1)} hours`} />
              {data.sleepQuality !== null && (
                <DataRow label="Quality" value={`${data.sleepQuality} / 10`} />
              )}
              {detailData?.sleepLoggedAt && (
                <DataRow label="Logged at" value={fmtTime(detailData.sleepLoggedAt)} />
              )}
            </SectionCard>
          )}

          {/* ── Medication ── */}
          {data.medicationStatus && (
            <SectionCard title="Medication" icon="medkit-outline" color="#C4A0B0">
              {userMeds.length > 0 ? (
                userMeds.map((med, i) => {
                  const taken = data.medicationStatus === 'taken';
                  const skipped = data.medicationStatus === 'skipped';
                  const statusColor = taken ? '#A8C5A0' : skipped ? '#C4A0B0' : '#C9A84C';
                  const statusIcon = taken ? '✓' : skipped ? '✗' : '~';
                  return (
                    <View key={i} style={s.medRow}>
                      <View style={[s.medBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
                        <Text style={[s.medBadgeText, { color: statusColor }]}>{statusIcon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.medName}>{med.name}</Text>
                        {med.dosage ? <Text style={s.medDosage}>{med.dosage}</Text> : null}
                      </View>
                    </View>
                  );
                })
              ) : (
                <DataRow label="Status" value={data.medicationStatus} capitalize
                  accent={data.medicationStatus === 'taken' ? '#A8C5A0' : data.medicationStatus === 'skipped' ? '#C4A0B0' : undefined}
                />
              )}
              {data.medicationSkipReason && (
                <DataRow label="Skip reason" value={data.medicationSkipReason} />
              )}
              {detailData?.medLoggedAt && (
                <DataRow label="Logged at" value={fmtTime(detailData.medLoggedAt)} />
              )}
            </SectionCard>
          )}

          {/* ── Activities ── */}
          {data.activityNames.length > 0 && (
            <SectionCard title="Activities" icon="leaf-outline" color="#A8C5A0">
              {(detailData?.activities.length ? detailData.activities : data.activityNames.map((title) => ({ title, completed_at: '' }))).map((act, i) => (
                <View key={i} style={s.activityRow}>
                  <View style={[s.activityBullet, { backgroundColor: '#A8C5A022' }]}>
                    <Text style={s.activityBulletText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityName}>{act.title}</Text>
                    {act.completed_at ? (
                      <Text style={s.activityTime}>Completed at {fmtTime(act.completed_at)}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* ── Journal ── */}
          {data.hasJournal && data.journalText && (
            <SectionCard title="Journal" icon="book-outline" color="#89B4CC"
              badge="Private · not shared with AI"
            >
              {detailData?.journalCreatedAt && (
                <Text style={s.taskCompletedAt}>Written at {fmtTime(detailData.journalCreatedAt)}</Text>
              )}
              <Text style={s.journalBody}>
                {journalExpanded || data.journalText.length <= 300
                  ? data.journalText
                  : data.journalText.slice(0, 300) + '…'}
              </Text>
              {data.journalText.length > 300 && (
                <TouchableOpacity
                  onPress={() => setJournalExpanded((e) => !e)}
                  style={s.expandBtn}
                >
                  <Text style={s.expandBtnText}>
                    {journalExpanded ? 'Show less' : 'Read full entry'}
                  </Text>
                  <Ionicons
                    name={journalExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13} color="#89B4CC"
                  />
                </TouchableOpacity>
              )}
            </SectionCard>
          )}

          {/* ── Workbook ── */}
          {workbookEntries.length > 0 && (
            <SectionCard title="Workbook" icon="book-outline" color="#C9A84C"
              badge="Private · not shared with AI"
            >
              {workbookEntries.map((e) => {
                const chapterTitles = ['Understanding My Cycles', 'My Triggers', 'My Warning Signs', 'My Strengths'];
                const prompts = [
                  ['What does a stable week feel like for me?', 'How do I know when I am shifting into a high period?', 'What does a low period feel like in my body?', 'What tends to trigger shifts for me?'],
                  ['What life events have come before episodes in the past?', 'What environments tend to destabilise me?', 'What relationships affect my mood most?', 'What thought patterns appear before a shift?'],
                  ['What do people close to me notice before I do?', 'What physical sensations appear early in a shift?', 'What behaviours change first when I am shifting?', 'What internal experiences signal a shift is coming?'],
                  ['What has helped me through difficult episodes before?', 'Who supports me well, and how?', 'What am I proud of in how I manage my condition?', 'What would I tell someone newly diagnosed?'],
                ];
                const chapterIdx = e.chapter - 1;
                const prompt = prompts[chapterIdx]?.[e.prompt_index] ?? '';
                return (
                  <View key={e.id} style={s.workbookEntry}>
                    <Text style={s.workbookChapter}>{chapterTitles[chapterIdx] ?? `Chapter ${e.chapter}`}</Text>
                    {e.created_at && (
                      <Text style={s.taskCompletedAt}>Written at {fmtTime(e.created_at)}</Text>
                    )}
                    <Text style={[s.workbookPrompt, { marginTop: 4 }]}>{prompt}</Text>
                    <Text style={s.workbookResponse}>{e.response}</Text>
                  </View>
                );
              })}
            </SectionCard>
          )}

          {/* ── Nutrition ── */}
          {data.nutritionCategories &&
            Object.values(data.nutritionCategories).some((v) => v > 0) && (
            <SectionCard title="Nutrition" icon="nutrition-outline" color="#C9A84C">
              {detailData?.nutritionLoggedAt && (
                <Text style={s.taskCompletedAt}>Last updated at {fmtTime(detailData.nutritionLoggedAt)}</Text>
              )}
              {Object.entries(data.nutritionCategories)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => {
                  const meta = NUTRITION_LABELS[key];
                  return (
                    <View key={key} style={s.nutritionRow}>
                      <Text style={s.nutritionIcon}>{meta?.icon ?? '🍽️'}</Text>
                      <Text style={s.nutritionLabel}>{meta?.label ?? key}</Text>
                      <View style={s.servingChip}>
                        <Text style={s.servingText}>{count}×</Text>
                      </View>
                    </View>
                  );
                })}
            </SectionCard>
          )}

          {/* ── Substances ── */}
          {(() => {
            // Per-substance detail from AsyncStorage (more accurate than daily_checkins booleans)
            const usedSubs = userSubstances.filter((s) => substanceLogs[s.id]?.used);
            // Fall back to daily_checkins booleans if no per-substance data loaded yet
            const showFallback = usedSubs.length === 0 && (data.alcohol || data.cannabis);
            if (usedSubs.length === 0 && !showFallback) return null;
            return (
              <SectionCard title="Substances" icon="alert-circle-outline" color="#D4826A">
                {usedSubs.length > 0 ? (
                  usedSubs.map((sub) => {
                    const log = substanceLogs[sub.id];
                    const amount = log?.amount ?? 1;
                    return (
                      <View key={sub.id} style={s.substanceRow}>
                        <View style={[s.substanceBadge, { backgroundColor: '#D4826A22', borderColor: '#D4826A55' }]}>
                          <Text style={s.substanceBadgeText}>{SUB_ICONS[sub.category] ?? '🫙'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.substanceName, { color: '#D4826A', fontWeight: '600' }]}>{sub.name}</Text>
                          <Text style={s.substanceAmount}>{amount} {amount === 1 ? 'time' : 'times'}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  // Fallback: only know alcohol/cannabis were used but not which specific ones
                  <>
                    {data.alcohol && (
                      <View style={s.substanceRow}>
                        <View style={[s.substanceBadge, { backgroundColor: '#D4826A22', borderColor: '#D4826A55' }]}>
                          <Text style={s.substanceBadgeText}>🍷</Text>
                        </View>
                        <Text style={[s.substanceName, { color: '#D4826A', fontWeight: '600' }]}>Alcohol consumed</Text>
                      </View>
                    )}
                    {data.cannabis && (
                      <View style={s.substanceRow}>
                        <View style={[s.substanceBadge, { backgroundColor: '#D4826A22', borderColor: '#D4826A55' }]}>
                          <Text style={s.substanceBadgeText}>🌿</Text>
                        </View>
                        <Text style={[s.substanceName, { color: '#D4826A', fontWeight: '600' }]}>Cannabis consumed</Text>
                      </View>
                    )}
                  </>
                )}
              </SectionCard>
            );
          })()}

          {/* ── Social Rhythm ── */}
          {data.socialRhythmScore !== null && (
            <SectionCard title="Social Rhythm" icon="people-outline" color="#C4A0B0">
              <DataRow label="Score" value={`${data.socialRhythmScore} / 10`} />
              {data.socialAnchorsHit !== null && data.socialAnchorsTotal !== null && (
                <DataRow
                  label="Anchors completed"
                  value={`${data.socialAnchorsHit} of ${data.socialAnchorsTotal}`}
                />
              )}
            </SectionCard>
          )}

          {/* Empty state */}
          {!data.cycleState && data.moodScore === null && !data.hasJournal &&
            data.sleepDuration === null && !data.medicationStatus &&
            data.activityNames.length === 0 && !data.nutritionCategories &&
            data.alcohol === null && data.socialRhythmScore === null && (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🌿</Text>
              <Text style={s.emptyTitle}>Nothing logged yet</Text>
              <Text style={s.emptySubtitle}>
                Data from your journal, tracker, activities, and nutrition will appear here.
              </Text>
            </View>
          )}

          {/* ── Tasks ── */}
          {(() => {
            const dayTasks = tasksStore.byDate[date ?? ''] ?? [];
            const ENERGY_COLORS: Record<EnergyLevel, string> = {
              low: '#A8C5A0', medium: '#89B4CC', high: '#C4A0B0',
            };
            return (
              <View style={s.taskSection}>
                <View style={s.taskSectionHeader}>
                  <View style={s.taskSectionTitle}>
                    <Ionicons name="checkbox-outline" size={16} color={cycleColor} style={{ marginRight: 6 }} />
                    <Text style={[s.taskHeading, { color: cycleColor }]}>TASKS</Text>
                    {dayTasks.length > 0 && (
                      <Text style={s.taskHeadingCount}>
                        {dayTasks.filter((t) => t.completed_at !== null).length}/{dayTasks.length}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[s.taskAddBtn, { backgroundColor: cycleColor + '22', borderColor: cycleColor + '55' }]}
                    onPress={() => setTaskInputVisible((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.taskAddBtnText, { color: cycleColor }]}>{taskInputVisible ? '✕ Cancel' : '+ Add task'}</Text>
                  </TouchableOpacity>
                </View>

                {taskInputVisible && (
                  <View style={[s.taskInputCard, { borderColor: cycleColor + '40' }]}>
                    <TextInput
                      style={s.taskInputField}
                      placeholder="Task name…"
                      placeholderTextColor="#3D393560"
                      value={taskInput}
                      onChangeText={setTaskInput}
                      onSubmitEditing={addTask}
                      returnKeyType="done"
                      autoFocus
                    />
                    <View style={s.taskEnergyRow}>
                      {(['low', 'medium', 'high'] as EnergyLevel[]).map((lvl) => (
                        <TouchableOpacity
                          key={lvl}
                          style={[s.taskEnergyBtn,
                            taskEnergy === lvl && { backgroundColor: ENERGY_COLORS[lvl] + '22', borderColor: ENERGY_COLORS[lvl] }
                          ]}
                          onPress={() => setTaskEnergy(lvl)}
                          activeOpacity={0.7}
                        >
                          <View style={[s.taskEnergyDot, { backgroundColor: ENERGY_COLORS[lvl] }]} />
                          <Text style={[s.taskEnergyLabel, { color: taskEnergy === lvl ? ENERGY_COLORS[lvl] : '#3D393566' }]}>{lvl}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[s.taskSaveBtn, { backgroundColor: cycleColor }]}
                        onPress={addTask}
                        activeOpacity={0.8}
                      >
                        <Text style={s.taskSaveBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {dayTasks.length > 0 ? (
                  <View style={s.taskList}>
                    {dayTasks.map((task, idx) => {
                      const done = task.completed_at !== null;
                      const ec = ENERGY_COLORS[task.energy_level];
                      return (
                        <View key={task.id}>
                          {idx > 0 && <View style={s.taskDivider} />}
                          <TouchableOpacity
                            style={s.taskRow}
                            onPress={() => date && tasksStore.toggleDone(task.id, date)}
                            activeOpacity={0.7}
                          >
                            <View style={[s.taskCheck, done ? { backgroundColor: ec, borderColor: ec } : { borderColor: ec + '88' }]}>
                              {done && <Text style={s.taskCheckMark}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.taskTitle, done && s.taskTitleDone]} numberOfLines={2}>{task.title}</Text>
                              {done && task.completed_at && (
                                <Text style={s.taskCompletedAt}>Done at {fmtTime(task.completed_at)}</Text>
                              )}
                            </View>
                            <View style={[s.taskEnergyPip, { backgroundColor: ec + '22', borderColor: ec + '55' }]}>
                              <Text style={[s.taskEnergyPipText, { color: ec }]}>{task.energy_level}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => date && tasksStore.deleteTask(task.id, date)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ paddingLeft: 8 }}
                            >
                              <Text style={s.taskDelete}>✕</Text>
                            </TouchableOpacity>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  !taskInputVisible && (
                    <TouchableOpacity
                      style={s.taskEmpty}
                      onPress={() => setTaskInputVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.taskEmptyText}>No tasks planned — tap to add one</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })()}

          {/* ── AI Week Summary ── */}
          <View style={s.aiSection}>
            <TouchableOpacity style={s.aiBtn} onPress={handleAiSummary}>
              <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
              <Text style={s.aiBtnText}>Ask AI about this week</Text>
            </TouchableOpacity>
            <Text style={s.aiNote}>
              Analyses the 7-day window around this date. Journal text is never included.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Modal */}
      <Modal visible={showAiModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Weekly AI Summary</Text>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Ionicons name="close" size={22} color="#3D3935" />
              </TouchableOpacity>
            </View>
            {aiLoading ? (
              <View style={s.aiLoadingBox}>
                <ActivityIndicator color="#A8C5A0" size="large" />
                <Text style={s.aiLoadingText}>Analysing your week…</Text>
              </View>
            ) : aiError ? (
              <Text style={s.aiErrorText}>{aiError}</Text>
            ) : (
              <ScrollView style={s.aiScroll} showsVerticalScrollIndicator={false}>
                <Text style={s.aiBodyText}>{aiText}</Text>
                <Text style={s.aiDisclaimer}>
                  AI-generated insights — not medical advice. Your data is not stored by the AI
                  model. Journal text is never shared.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title, icon, color, badge, children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[sc.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={sc.cardHeader}>
        <View style={[sc.iconBox, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={[sc.title, { color }]}>{title}</Text>
        {badge && <Text style={sc.badge}>{badge}</Text>}
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

function DataRow({
  label, value, capitalize, accent,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  accent?: string;
}) {
  return (
    <View style={sc.row}>
      <Text style={sc.rowLabel}>{label}</Text>
      <Text style={[sc.rowValue, capitalize && { textTransform: 'capitalize' }, accent && { color: accent }]}>
        {value}
      </Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBox: {
    width: 26, height: 26, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  badge: {
    marginLeft: 'auto',
    fontSize: 10,
    color: '#3D393555',
    fontStyle: 'italic',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#3D393566',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: '#3D3935',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F7F3EE',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  headerText: { flex: 1, gap: 6 },
  headerDate: {
    fontSize: 18, fontWeight: '700', color: '#3D3935', letterSpacing: -0.2,
  },
  cycleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  cycleDot: { width: 7, height: 7, borderRadius: 3.5 },
  cycleChipText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  loadingBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 14, color: '#3D393599', fontStyle: 'italic' },

  // Activities
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2,
  },
  activityBullet: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  activityBulletText: { fontSize: 11, fontWeight: '700', color: '#A8C5A0' },
  activityName: { fontSize: 14, color: '#3D3935', fontWeight: '500' },
  activityTime: { fontSize: 11, color: '#3D393555', marginTop: 1 },

  // Timestamps
  entryTimestamp: { fontSize: 11, color: '#3D393555', fontStyle: 'italic', marginBottom: 4 },

  // Journal
  journalBody: {
    fontSize: 14, color: '#3D3935', lineHeight: 22, fontStyle: 'italic',
  },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, alignSelf: 'flex-start',
  },
  expandBtnText: { fontSize: 12, color: '#89B4CC', fontWeight: '600' },

  // Workbook
  workbookEntry: {
    borderLeftWidth: 3, borderLeftColor: '#C9A84C',
    paddingLeft: 10, marginBottom: 12,
  },
  workbookChapter: { fontSize: 10, fontWeight: '700', color: '#C9A84C', letterSpacing: 0.5, marginBottom: 2 },
  workbookPrompt: { fontSize: 12, color: '#3D3935', opacity: 0.5, marginBottom: 4, lineHeight: 17 },
  workbookResponse: { fontSize: 14, color: '#3D3935', lineHeight: 21 },

  // Nutrition
  nutritionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3,
  },
  nutritionIcon: { fontSize: 17, width: 24 },
  nutritionLabel: { fontSize: 13, color: '#3D3935', flex: 1 },
  servingChip: {
    backgroundColor: '#C9A84C22', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  servingText: { fontSize: 12, fontWeight: '700', color: '#C9A84C' },

  // Empty state
  emptyBox: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#3D3935', marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13, color: '#3D393566', textAlign: 'center', lineHeight: 19,
  },

  // Task section
  taskSection: { marginHorizontal: 16, marginBottom: 10, marginTop: 4 },
  taskSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  taskSectionTitle: { flexDirection: 'row', alignItems: 'center' },
  taskHeading: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  taskHeadingCount: { fontSize: 11, fontWeight: '600', color: '#3D393555', marginLeft: 8 },
  taskAddBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5 },
  taskAddBtnText: { fontSize: 12, fontWeight: '700' },

  taskInputCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  taskInputField: { fontSize: 16, color: '#3D3935', paddingVertical: 4, marginBottom: 10 },
  taskEnergyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskEnergyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8' },
  taskEnergyDot: { width: 7, height: 7, borderRadius: 4 },
  taskEnergyLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  taskSaveBtn: { marginLeft: 'auto' as unknown as number, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  taskSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  taskList: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#F0EDE8', overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  taskDivider: { height: 1, backgroundColor: '#F0EDE8', marginLeft: 48 },
  taskCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  taskCheckMark: { fontSize: 12, color: '#FFFFFF', fontWeight: '800' },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  taskTitleDone: { textDecorationLine: 'line-through', opacity: 0.4 },
  taskCompletedAt: { fontSize: 10, color: '#3D393550', marginTop: 2 },
  taskEnergyPip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  taskEnergyPipText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  taskDelete: { fontSize: 13, color: '#3D393550' },
  taskEmpty: { backgroundColor: '#F7F3EE', borderRadius: 14, padding: 16, alignItems: 'center' },
  taskEmptyText: { fontSize: 13, color: '#3D393560', fontStyle: 'italic' },

  // Per-medication rows
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  medBadge: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  medBadgeText: { fontSize: 13, fontWeight: '800' },
  medName: { fontSize: 14, color: '#3D3935', fontWeight: '500' },
  medDosage: { fontSize: 11, color: '#3D393560', marginTop: 1 },

  // Substance rows
  substanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  substanceBadge: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  substanceBadgeText: { fontSize: 15 },
  substanceName: { fontSize: 14, color: '#3D393580' },
  substanceAmount: { fontSize: 11, color: '#D4826A', marginTop: 1, opacity: 0.8 },

  // Cycle entry timeline
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  entryTime: { fontSize: 11, color: '#3D393555', width: 64, marginTop: 2, fontVariant: ['tabular-nums'] },
  entryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  entryState: { fontSize: 14, fontWeight: '600' },
  entrySub: { fontSize: 12, color: '#3D393560', marginTop: 2 },
  entryNotes: { fontSize: 12, color: '#3D393555', marginTop: 2, fontStyle: 'italic' },
  entryDivider: { height: 1, backgroundColor: '#F0EDE8', marginVertical: 4 },

  // AI section
  aiSection: { marginHorizontal: 16, marginTop: 8, gap: 8 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#A8C5A0',
    borderRadius: 14, paddingVertical: 14,
  },
  aiBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  aiNote: {
    fontSize: 11, color: '#3D393566', textAlign: 'center', fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#00000044', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#3D3935' },
  aiLoadingBox: { alignItems: 'center', padding: 40, gap: 12 },
  aiLoadingText: { fontSize: 14, color: '#3D393599', fontStyle: 'italic' },
  aiErrorText: { color: '#CC5555', padding: 20, fontSize: 14 },
  aiScroll: { padding: 20 },
  aiBodyText: { fontSize: 15, color: '#3D3935', lineHeight: 24 },
  aiDisclaimer: {
    marginTop: 20, fontSize: 11, color: '#3D393566',
    fontStyle: 'italic', lineHeight: 16,
  },
});
