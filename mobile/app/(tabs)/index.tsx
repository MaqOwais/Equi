import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useCrisisStore } from '../../stores/crisis';
import { useSleepStore } from '../../stores/sleep';
import { useSocialRhythmStore } from '../../stores/socialRhythm';
import { useNotificationsStore } from '../../stores/notifications';
import { useJournalStore } from '../../stores/journal';
import { useAIStore } from '../../stores/ai';
import { useCycleStore, type CycleLogEntry } from '../../stores/cycle';
import { useRouter } from 'expo-router';
import type { CycleState, MedicationStatus } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJIS = ['😔', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '✨'];

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};
const CYCLE_TIPS: Record<CycleState, { icon: string; title: string; body: string }> = {
  stable: {
    icon: '🌿',
    title: 'Protect your rhythm',
    body: "Stable phases are your foundation. Consistent sleep, meals, and routines are your best medicine right now.",
  },
  manic: {
    icon: '🧊',
    title: 'Slow down gently',
    body: "You may feel energised \u2014 that's okay. Try to stick to your usual sleep time and avoid big decisions today.",
  },
  depressive: {
    icon: '☀️',
    title: 'One small thing',
    body: "You don't need to do everything. Just one gentle movement \u2014 a short walk, stretching, or stepping outside.",
  },
  mixed: {
    icon: '🌊',
    title: 'Be extra gentle today',
    body: "Mixed states can feel unpredictable. Prioritise safety and reach out to someone you trust if needed.",
  },
};

// State-matched quick activities (hardcoded shortcuts — no store needed)
const QUICK_ACTS: Record<CycleState, { icon: string; title: string; dur: string }[]> = {
  stable:     [{ icon: '📋', title: 'Values Check-In', dur: '15 min' }, { icon: '🙏', title: 'Gratitude Jar', dur: '10 min' }],
  manic:      [{ icon: '🌬️', title: 'Box Breathing', dur: '5 min' },   { icon: '💧', title: 'Cold Water Reset', dur: '2 min' }],
  depressive: [{ icon: '🌊', title: '5-4-3-2-1 Grounding', dur: '5 min' }, { icon: '🫁', title: 'Body Scan', dur: '10 min' }],
  mixed:      [{ icon: '🌬️', title: 'Box Breathing', dur: '5 min' },   { icon: '🌊', title: '5-4-3-2-1 Grounding', dur: '5 min' }],
};

const SKIP_REASONS = ['Forgot', 'Side effects', 'Felt fine', 'Ran out', 'Other'];
const SLEEP_OPTIONS = [
  { label: 'Poor',  sub: '< 5h', score: 1 },
  { label: 'Light', sub: '5–6h', score: 2 },
  { label: 'OK',    sub: '6–7h', score: 3 },
  { label: 'Good',  sub: '7–8h', score: 4 },
  { label: 'Great', sub: '8h+',  score: 5 },
];

const EXPLORE_LINKS: { icon: string; label: string; sub: string; route: string }[] = [
  { icon: '🌿', label: 'Activities',    sub: 'Matched to state',    route: '/(tabs)/activities' },
  { icon: '💬', label: 'Community',     sub: 'Share a win',         route: '/community' },
  { icon: '🧠', label: 'AI Report',     sub: 'Weekly insights',     route: '/(tabs)/you/ai-report' },
  { icon: '📋', label: 'Workbook',      sub: 'Bipolar exercises',   route: '/workbook' },
  { icon: '🩺', label: 'Psychiatrists', sub: 'Find & book',         route: '/psychiatrists' },
  { icon: '📊', label: '90-Day Cycle',  sub: 'View patterns',       route: '/(tabs)/tracker' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Dynamic logic ────────────────────────────────────────────────────────────

type HeroAction = {
  icon: string; title: string; sub: string;
  color: string; route?: string; action?: 'mood' | 'sleep' | 'cycle';
};

function computeHero(opts: {
  hour: number; moodLogged: boolean; sleepLogged: boolean;
  cycleLogged: boolean; journalDone: boolean; medLogged: boolean;
  trackMed: boolean; state: CycleState;
}): HeroAction {
  const { hour, moodLogged, sleepLogged, cycleLogged, journalDone, medLogged, trackMed, state } = opts;

  if (hour < 11 && !sleepLogged)
    return { icon: '🌙', title: 'How did you sleep?', sub: 'Log last night in under 5 seconds', color: '#89B4CC', action: 'sleep' };
  if (!moodLogged)
    return { icon: '💭', title: 'What\'s your mood right now?', sub: 'Tap once — saved instantly', color: CYCLE_COLORS[state], action: 'mood' };
  if (trackMed && !medLogged && hour >= 8 && hour < 22)
    return { icon: '💊', title: 'Medication check', sub: 'Did you take today\'s medication?', color: '#C9A84C', route: '/(tabs)/index' };
  if (!cycleLogged)
    return { icon: '🔄', title: 'Update your cycle state', sub: 'How is your mood episode today?', color: CYCLE_COLORS[state], action: 'cycle' };
  if (hour >= 18 && !journalDone)
    return { icon: '✏️', title: 'Evening reflection', sub: 'A few words about your day', color: '#A8C5A0', route: '/(tabs)/journal' };
  if (state === 'manic')
    return { icon: '🌬️', title: 'Box Breathing — 5 min', sub: 'Calm your nervous system right now', color: '#89B4CC', route: '/(tabs)/activities' };
  if (state === 'depressive')
    return { icon: '🌊', title: 'Grounding exercise', sub: '5 senses, 5 minutes — you\'ve got this', color: '#C4A0B0', route: '/(tabs)/activities' };

  return { icon: '✅', title: 'All checked in', sub: 'Great work today — you\'re on top of it', color: '#A8C5A0' };
}

type PulseInsight = { icon: string; text: string; color: string } | null;

function computePatternPulse(logs: CycleLogEntry[]): PulseInsight {
  if (logs.length < 3) return null;
  const recent = logs.slice(-30);
  const last7 = logs.slice(-7);

  // Stable streak
  const rev = [...recent].reverse();
  let stableStreak = 0;
  for (const log of rev) {
    if (log.state === 'stable') stableStreak++;
    else break;
  }
  if (stableStreak >= 4)
    return { icon: '🌿', text: `Stable for ${stableStreak} days — your rhythm is working`, color: '#A8C5A0' };

  // State shift in last 2 logged days
  if (recent.length >= 2) {
    const prev = recent[recent.length - 2];
    const curr = recent[recent.length - 1];
    if (prev.state !== curr.state) {
      if (curr.state === 'stable')   return { icon: '✨', text: 'Shifted to stable — a positive sign worth noting', color: '#A8C5A0' };
      if (curr.state === 'manic')    return { icon: '🌊', text: 'Elevated state detected — grounding activities are ready for you', color: '#89B4CC' };
      if (curr.state === 'depressive') return { icon: '☀️', text: 'Low state today — one gentle thing is enough', color: '#C4A0B0' };
      if (curr.state === 'mixed')    return { icon: '🫁', text: 'Mixed state — prioritise sleep and stay close to your routine', color: '#E8DCC8' };
    }
  }

  // Intensity trend over last 7 days
  if (last7.length >= 5) {
    const a1 = last7.slice(0, 3).reduce((s, l) => s + l.intensity, 0) / 3;
    const a2 = last7.slice(-3).reduce((s, l) => s + l.intensity, 0) / 3;
    if (a2 < a1 - 1.5) return { icon: '📉', text: 'Intensity has been easing this week — keep going', color: '#A8C5A0' };
    if (a2 > a1 + 1.5) return { icon: '⚠️', text: 'Intensity building this week — check in with yourself', color: '#C9A84C' };
  }

  // Logging consistency
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (recent.find((l) => l.date === localIso(d))) streak++;
    else break;
  }
  if (streak >= 5)
    return { icon: '🏅', text: `Logged ${streak} days in a row — self-awareness is your superpower`, color: '#C9A84C' };

  return null;
}

// Build last-7-days state map for sparkline
function buildWeekMap(logs: CycleLogEntry[]): (CycleState | null)[] {
  const map: Record<string, CycleState> = {};
  logs.forEach((l) => { map[l.date] = l.state; });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return map[localIso(d)] ?? null;
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { session, profile } = useAuthStore();
  const today = useTodayStore();
  const crisis = useCrisisStore();
  const sleep = useSleepStore();
  const rhythm = useSocialRhythmStore();
  const notifs = useNotificationsStore();
  const journal = useJournalStore();
  const ai = useAIStore();
  const cycle = useCycleStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [skipSheetVisible, setSkipSheetVisible] = useState(false);
  const [pendingMedStatus, setPendingMedStatus] = useState<MedicationStatus | null>(null);
  const [selectedSkipReason, setSelectedSkipReason] = useState<string | null>(null);
  const [heroScrollRef, setHeroScrollRef] = useState<string | null>(null);

  const todayDate = isoToday();

  useEffect(() => {
    if (userId) {
      today.load(userId);
      sleep.load(userId);
      rhythm.load(userId);
      journal.loadEntry(userId, todayDate);
      ai.loadTrackerInsight(userId);
      cycle.load90Days(userId);
    }
  }, [userId]);

  function handleMoodTap(score: number) {
    if (today.moodScore !== null || !userId) return;
    today.logMood(userId, score);
  }

  function handleCycleTap(state: CycleState) {
    if (!userId) return;
    today.logCycle(userId, state, today.cycleIntensity ?? 5, today.cycleSymptoms ?? []);
  }

  function handleMedTap(status: MedicationStatus) {
    if (!userId) return;
    if (status === 'taken') {
      today.logMedication(userId, 'taken');
    } else {
      setPendingMedStatus(status);
      setSkipSheetVisible(true);
    }
  }

  function confirmSkip() {
    if (!userId || !pendingMedStatus) return;
    today.logMedication(userId, pendingMedStatus, selectedSkipReason ?? undefined);
    setSkipSheetVisible(false);
    setPendingMedStatus(null);
    setSelectedSkipReason(null);
  }

  function toggleSubstance(type: 'alcohol' | 'cannabis') {
    if (!userId) return;
    const alcohol = type === 'alcohol' ? !(today.alcohol ?? false) : (today.alcohol ?? false);
    const cannabis = type === 'cannabis' ? !(today.cannabis ?? false) : (today.cannabis ?? false);
    today.logCheckin(userId, alcohol, cannabis);
  }

  const cycleState: CycleState = today.cycleState ?? profile?.current_cycle_state ?? 'stable';
  const cycleColor = CYCLE_COLORS[cycleState];
  const tip = CYCLE_TIPS[cycleState];
  const trackMedication = profile?.track_medication ?? false;
  const showRuminationPrompt = today.moodScore !== null && today.moodScore <= 3;
  const showSleepPrompt = sleep.todayLog === null && new Date().getHours() < 14;

  const todayJournal = journal.entries[todayDate];
  const journalWordCount = todayJournal ? wordCount(todayJournal.text) : 0;

  // Completion chips
  const checks = [
    { label: 'Mood',    done: today.moodScore !== null },
    { label: 'Sleep',   done: sleep.todayLog !== null },
    { label: 'Meds',    done: today.medicationStatus !== null, hidden: !trackMedication },
    { label: 'Cycle',   done: today.cycleState !== null },
    { label: 'Journal', done: journalWordCount > 0 },
    { label: 'Subs',    done: today.alcohol !== null || today.cannabis !== null },
  ].filter((c) => !c.hidden);

  const doneCount = checks.filter((c) => c.done).length;

  // Dynamic computations
  const hour = new Date().getHours();
  const hero = computeHero({
    hour, state: cycleState,
    moodLogged: today.moodScore !== null,
    sleepLogged: sleep.todayLog !== null,
    cycleLogged: today.cycleState !== null,
    journalDone: journalWordCount > 0,
    medLogged: today.medicationStatus !== null,
    trackMed: trackMedication,
  });
  const pulse = computePatternPulse(cycle.logs);
  const weekMap = buildWeekMap(cycle.logs);
  const quickActs = QUICK_ACTS[cycleState];
  const allDone = hero.icon === '✅';

  function handleHeroPress() {
    if (hero.route) { router.push(hero.route as never); return; }
    // inline actions handled by the existing sections — hero scrolls down to them
    // (no-op for inline actions, user scrolls naturally)
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── State Header ─────────────────────────────────────────────────── */}
        <View style={[s.header, { backgroundColor: cycleColor + '28' }]}>
          <View style={s.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerGreeting}>{greeting()}</Text>
              <Text style={s.headerDate}>{formatDate()}</Text>
            </View>
            <View style={[s.stateBadge, { backgroundColor: cycleColor + '33', borderColor: cycleColor + '88' }]}>
              <View style={[s.stateDot, { backgroundColor: cycleColor }]} />
              <Text style={[s.stateLabel, { color: cycleColor }]}>{CYCLE_LABELS[cycleState]}</Text>
            </View>
          </View>

          {/* 7-day sparkline */}
          <View style={s.sparklineRow}>
            {weekMap.map((state, i) => {
              const isToday = i === 6;
              const col = state ? CYCLE_COLORS[state] : '#3D393318';
              return (
                <View key={i} style={[s.sparkDot, { backgroundColor: col }, isToday && s.sparkDotToday]} />
              );
            })}
            <Text style={s.sparkLabel}>7-day history</Text>
          </View>

          {/* Completion chips */}
          <View style={s.completionRow}>
            {checks.map((c) => (
              <View
                key={c.label}
                style={[s.checkChip, c.done && { backgroundColor: cycleColor + '33', borderColor: cycleColor + '66' }]}
              >
                <View style={[s.checkDot, { backgroundColor: c.done ? cycleColor : '#3D393530' }]} />
                <Text style={[s.checkLabel, c.done && { color: cycleColor, opacity: 1 }]}>{c.label}</Text>
              </View>
            ))}
            <Text style={s.checkCount}>{doneCount}/{checks.length}</Text>
          </View>
        </View>

        <View style={s.content}>

          {/* ── Smart Hero Card ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.heroCard, { borderLeftColor: hero.color, backgroundColor: hero.color + (allDone ? '18' : '10') }]}
            onPress={handleHeroPress}
            activeOpacity={hero.route ? 0.75 : 1}
          >
            <Text style={s.heroIcon}>{hero.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroTitle, { color: hero.color === '#E8DCC8' ? '#A09060' : hero.color }]}>
                {hero.title}
              </Text>
              <Text style={s.heroSub}>{hero.sub}</Text>
            </View>
            {hero.route && <Text style={[s.heroArrow, { color: hero.color }]}>›</Text>}
          </TouchableOpacity>

          {/* ── Pattern Pulse ─────────────────────────────────────────────────── */}
          {pulse && (
            <View style={[s.pulseCard, { borderColor: pulse.color + '44', backgroundColor: pulse.color + '0C' }]}>
              <Text style={s.pulseIcon}>{pulse.icon}</Text>
              <Text style={[s.pulseText, { color: pulse.color === '#E8DCC8' ? '#A09060' : pulse.color }]}>
                {pulse.text}
              </Text>
            </View>
          )}

          {/* ── Mood ─────────────────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>MOOD</Text>
          <View style={s.card}>
            {today.moodScore !== null ? (
              <View style={s.moodLogged}>
                <Text style={s.moodLoggedEmoji}>{MOOD_EMOJIS[today.moodScore - 1]}</Text>
                <View>
                  <Text style={s.moodLoggedTitle}>Mood logged</Text>
                  <Text style={s.moodLoggedSub}>{today.moodScore} / 10 · Tap tomorrow to update</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={s.cardPrompt}>How are you feeling right now?</Text>
                <View style={s.moodRow}>
                  {MOOD_EMOJIS.map((emoji, i) => {
                    const score = i + 1;
                    return (
                      <TouchableOpacity key={score} onPress={() => handleMoodTap(score)} style={s.moodItem} activeOpacity={0.6}>
                        <Text style={s.moodEmoji}>{emoji}</Text>
                        {(score === 1 || score === 5 || score === 10) && (
                          <Text style={s.moodTick}>{score}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.tapHint}>Tap once — saved instantly</Text>
              </>
            )}
          </View>

          {/* Rumination prompt */}
          {showRuminationPrompt && (
            <TouchableOpacity
              style={[s.card, s.ruminationCard]}
              onPress={() => router.push('/(tabs)/activities')}
              activeOpacity={0.8}
            >
              <Text style={s.ruminationIcon}>🫂</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.ruminationTitle}>Difficult stretch?</Text>
                <Text style={s.ruminationBody}>Some grounding activities are ready for you →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Cycle State ───────────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>CYCLE STATE</Text>
          <View style={s.card}>
            {today.cycleState !== null ? (
              <View style={s.cycleLogged}>
                <View style={[s.cycleLoggedDot, { backgroundColor: CYCLE_COLORS[today.cycleState] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cycleLoggedTitle}>{CYCLE_LABELS[today.cycleState]} today</Text>
                  <Text style={s.cycleLoggedSub}>Tap a state to update</Text>
                </View>
              </View>
            ) : (
              <Text style={s.cardPrompt}>How is your mood episode today?</Text>
            )}
            <View style={s.cycleRow}>
              {(['stable', 'manic', 'depressive', 'mixed'] as CycleState[]).map((state) => {
                const active = today.cycleState === state;
                const col = CYCLE_COLORS[state];
                return (
                  <TouchableOpacity
                    key={state}
                    style={[s.cycleBtn, { borderColor: active ? col : col + '55', backgroundColor: active ? col + '22' : col + '0A' }]}
                    onPress={() => handleCycleTap(state)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.cycleBtnDot, { backgroundColor: col }]} />
                    <Text style={[s.cycleBtnText, { color: active ? col : '#3D3935', opacity: active ? 1 : 0.6, fontWeight: active ? '700' : '500' }]}>
                      {CYCLE_LABELS[state]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Journal ───────────────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>JOURNAL</Text>
          <TouchableOpacity
            style={[s.card, s.journalCard]}
            onPress={() => router.push('/(tabs)/journal')}
            activeOpacity={0.8}
          >
            {journalWordCount > 0 ? (
              <>
                <View style={s.journalLogged}>
                  <Text style={s.journalLoggedIcon}>📖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.journalLoggedTitle}>Entry written</Text>
                    <Text style={s.journalLoggedSub}>{journalWordCount} words · Tap to read or edit</Text>
                  </View>
                  <Text style={s.journalChevron}>›</Text>
                </View>
                {todayJournal?.text ? (
                  <Text style={s.journalPreview} numberOfLines={2}>{todayJournal.text}</Text>
                ) : null}
              </>
            ) : (
              <View style={s.journalEmpty}>
                <Text style={s.journalEmptyIcon}>✏️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.journalEmptyTitle}>Write today's entry</Text>
                  <Text style={s.journalEmptySub}>Private · Locked after 48h · Never shared</Text>
                </View>
                <Text style={s.journalChevron}>›</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Sleep ────────────────────────────────────────────────────────── */}
          {(showSleepPrompt || sleep.todayLog !== null) && (
            <Text style={s.sectionLabel}>SLEEP</Text>
          )}
          {showSleepPrompt && (
            <View style={s.card}>
              <Text style={s.cardPrompt}>🌙  How did you sleep last night?</Text>
              <View style={s.sleepRow}>
                {SLEEP_OPTIONS.map((opt) => {
                  const logged = sleep.todayLog?.quality_score === opt.score;
                  return (
                    <TouchableOpacity
                      key={opt.score}
                      style={[s.sleepBtn, logged && { borderColor: '#89B4CC', backgroundColor: '#89B4CC15' }]}
                      onPress={() => userId && sleep.logManual(userId, opt.score)}
                      disabled={sleep.todayLog !== null}
                    >
                      <Text style={[s.sleepBtnLabel, logged && { color: '#89B4CC', opacity: 1, fontWeight: '700' }]}>{opt.label}</Text>
                      <Text style={[s.sleepBtnSub, logged && { color: '#89B4CC', opacity: 0.7 }]}>{opt.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          {sleep.todayLog !== null && (
            <View style={[s.card, s.sleepLoggedCard]}>
              <Text style={s.sleepLoggedIcon}>🌙</Text>
              <View>
                <Text style={s.sleepLoggedLabel}>
                  {['', 'Poor', 'Light', 'OK', 'Good', 'Great'][sleep.todayLog.quality_score ?? 0]} sleep
                </Text>
                {sleep.todayLog.duration_minutes ? (
                  <Text style={s.sleepLoggedSub}>
                    {Math.floor(sleep.todayLog.duration_minutes / 60)}h {sleep.todayLog.duration_minutes % 60}m
                  </Text>
                ) : null}
              </View>
              <View style={[s.sleepQualBar, { marginLeft: 'auto' }]}>
                <View style={[s.sleepQualFill, { width: `${((sleep.todayLog.quality_score ?? 0) / 5) * 100}%` as unknown as number }]} />
              </View>
            </View>
          )}

          {/* ── Check-ins ────────────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>CHECK-INS</Text>
          <View style={s.card}>
            {trackMedication && (
              <View style={s.checkinBlock}>
                <Text style={s.checkinBlockLabel}>💊  Medication today</Text>
                <View style={s.medButtons}>
                  {(['taken', 'skipped', 'partial'] as MedicationStatus[]).map((status) => {
                    const active = today.medicationStatus === status;
                    const color = status === 'taken' ? '#A8C5A0' : status === 'skipped' ? '#C4A0B0' : '#C9A84C';
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[s.medBtn, active && { borderColor: color, backgroundColor: color + '18' }]}
                        onPress={() => handleMedTap(status)}
                      >
                        <Text style={[s.medBtnText, active && { color, opacity: 1, fontWeight: '700' }]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            <View style={[s.checkinBlock, trackMedication && s.checkinDivider]}>
              <Text style={s.checkinBlockLabel}>🍃  Substances today</Text>
              <View style={s.substanceRow}>
                {(['alcohol', 'cannabis'] as const).map((sub) => {
                  const active = today[sub] === true;
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[s.subBtn, active && { borderColor: '#C4A0B0', backgroundColor: '#C4A0B015' }]}
                      onPress={() => toggleSubstance(sub)}
                    >
                      <Text style={[s.subBtnText, active && { color: '#C4A0B0', opacity: 1, fontWeight: '600' }]}>
                        {sub === 'alcohol' ? '🍷' : '🌿'} {sub.charAt(0).toUpperCase() + sub.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {rhythm.todayAnchorsTotal > 0 && (
              <TouchableOpacity
                style={[s.checkinBlock, s.checkinDivider, s.rhythmRow]}
                onPress={() => router.push('/(tabs)/you/routine')}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={s.checkinBlockLabel}>🗓  Daily Routine</Text>
                  <Text style={s.rhythmSub}>{rhythm.todayAnchorsHit} of {rhythm.todayAnchorsTotal} anchors hit</Text>
                </View>
                <View style={s.rhythmRight}>
                  <View style={s.rhythmBarWrap}>
                    <View style={[s.rhythmFill, {
                      width: `${((rhythm.todayAnchorsHit / rhythm.todayAnchorsTotal) * 100)}%` as unknown as number,
                      backgroundColor: cycleColor,
                    }]} />
                  </View>
                  <Text style={s.rhythmChevron}>›</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Today's Focus ─────────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>TODAY'S FOCUS</Text>
          <View style={[s.tipCard, { borderLeftColor: cycleColor, backgroundColor: cycleColor + '12' }]}>
            <Text style={s.tipIcon}>{tip.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.tipTitle, { color: cycleColor === '#E8DCC8' ? '#A09060' : cycleColor }]}>{tip.title}</Text>
              <Text style={s.tipBody}>{tip.body}</Text>
            </View>
          </View>

          {/* ── Quick Activities ──────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>SUGGESTED FOR YOU</Text>
          <View style={s.quickActsRow}>
            {quickActs.map((act) => (
              <TouchableOpacity
                key={act.title}
                style={[s.quickActCard, { borderColor: cycleColor + '55' }]}
                onPress={() => router.push('/(tabs)/activities')}
                activeOpacity={0.75}
              >
                <Text style={s.quickActIcon}>{act.icon}</Text>
                <Text style={s.quickActTitle} numberOfLines={2}>{act.title}</Text>
                <View style={[s.quickActBadge, { backgroundColor: cycleColor + '22' }]}>
                  <Text style={[s.quickActDur, { color: cycleColor === '#E8DCC8' ? '#A09060' : cycleColor }]}>{act.dur}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── AI Insight ───────────────────────────────────────────────────── */}
          {ai.trackerInsight && (
            <>
              <Text style={s.sectionLabel}>AI INSIGHT</Text>
              <TouchableOpacity
                style={[s.insightCard, { borderColor: cycleColor + '55' }]}
                onPress={() => router.push('/(tabs)/you/ai-report')}
                activeOpacity={0.8}
              >
                <Text style={s.insightIcon}>✦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightText}>{ai.trackerInsight}</Text>
                  <Text style={s.insightLink}>See full report →</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* ── Explore ──────────────────────────────────────────────────────── */}
          <Text style={s.sectionLabel}>EXPLORE</Text>
          <View style={s.exploreGrid}>
            {EXPLORE_LINKS.map((link) => (
              <TouchableOpacity
                key={link.route}
                style={s.exploreCard}
                onPress={() => router.push(link.route as never)}
                activeOpacity={0.75}
              >
                <Text style={s.exploreIcon}>{link.icon}</Text>
                <Text style={s.exploreLabel}>{link.label}</Text>
                <Text style={s.exploreSub}>{link.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Crisis support ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={s.sosBtn}
            onPress={() => crisis.open(notifs.prefs?.post_crisis_enabled)}
            activeOpacity={0.8}
          >
            <Text style={s.sosBtnText}>🆘  Crisis Support</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Medication skip sheet */}
      <Modal visible={skipSheetVisible} transparent animationType="slide">
        <Pressable style={s.sheetBackdrop} onPress={() => setSkipSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Why did you skip?</Text>
            {SKIP_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.sheetOption, selectedSkipReason === r && s.sheetOptionActive]}
                onPress={() => setSelectedSkipReason(r)}
              >
                <Text style={[s.sheetOptionText, selectedSkipReason === r && s.sheetOptionTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.sheetConfirm, !selectedSkipReason && s.sheetConfirmDisabled]}
              onPress={confirmSkip}
              disabled={!selectedSkipReason}
            >
              <Text style={s.sheetConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  headerGreeting: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.5 },
  headerDate: { fontSize: 13, color: '#3D3935', opacity: 0.5, marginTop: 2 },

  stateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  stateLabel: { fontSize: 13, fontWeight: '600' },

  // 7-day sparkline
  sparklineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  sparkDot: { width: 20, height: 20, borderRadius: 10 },
  sparkDotToday: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF' },
  sparkLabel: { fontSize: 10, color: '#3D3935', opacity: 0.35, marginLeft: 4 },

  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  checkChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#3D393520', backgroundColor: '#3D393308',
  },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  checkLabel: { fontSize: 11, fontWeight: '500', color: '#3D3935', opacity: 0.4 },
  checkCount: { fontSize: 12, fontWeight: '700', color: '#3D3935', opacity: 0.35, marginLeft: 4 },

  content: { paddingHorizontal: 18, paddingTop: 8 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  cardPrompt: { fontSize: 14, color: '#3D3935', fontWeight: '500', marginBottom: 14, opacity: 0.75 },

  // Smart Hero Card
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderLeftWidth: 4,
  },
  heroIcon: { fontSize: 28 },
  heroTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  heroSub: { fontSize: 12, color: '#3D3935', opacity: 0.55 },
  heroArrow: { fontSize: 24, opacity: 0.6 },

  // Pattern Pulse
  pulseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14,
    borderWidth: 1.5,
  },
  pulseIcon: { fontSize: 18 },
  pulseText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // Mood
  moodLogged: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  moodLoggedEmoji: { fontSize: 36 },
  moodLoggedTitle: { fontSize: 15, fontWeight: '600', color: '#3D3935' },
  moodLoggedSub: { fontSize: 12, color: '#3D3935', opacity: 0.45, marginTop: 2 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  moodItem: { alignItems: 'center', padding: 2 },
  moodEmoji: { fontSize: 26 },
  moodTick: { fontSize: 9, color: '#3D393540', marginTop: 1 },
  tapHint: { fontSize: 11, color: '#3D3935', opacity: 0.3, textAlign: 'center', marginTop: 4 },

  // Rumination
  ruminationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#C4A0B010', borderColor: '#C4A0B040',
  },
  ruminationIcon: { fontSize: 24 },
  ruminationTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  ruminationBody: { fontSize: 12, color: '#3D3935', opacity: 0.55 },

  // Cycle state
  cycleLogged: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cycleLoggedDot: { width: 10, height: 10, borderRadius: 5 },
  cycleLoggedTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  cycleLoggedSub: { fontSize: 11, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  cycleBtnDot: { width: 8, height: 8, borderRadius: 4 },
  cycleBtnText: { fontSize: 11, fontWeight: '500' },

  // Journal
  journalCard: { padding: 0, overflow: 'hidden' },
  journalLogged: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 0 },
  journalLoggedIcon: { fontSize: 22 },
  journalLoggedTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  journalLoggedSub: { fontSize: 12, color: '#3D3935', opacity: 0.45, marginTop: 1 },
  journalChevron: { fontSize: 22, color: '#3D3935', opacity: 0.2 },
  journalPreview: {
    fontSize: 13, color: '#3D3935', opacity: 0.5, lineHeight: 19,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F0EDE8', marginTop: 12,
  },
  journalEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  journalEmptyIcon: { fontSize: 22 },
  journalEmptyTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  journalEmptySub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 1 },

  // Sleep
  sleepRow: { flexDirection: 'row', gap: 6 },
  sleepBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8', paddingVertical: 10, alignItems: 'center' },
  sleepBtnLabel: { fontSize: 12, fontWeight: '500', color: '#3D3935', opacity: 0.55 },
  sleepBtnSub: { fontSize: 10, color: '#3D3935', opacity: 0.3, marginTop: 2 },
  sleepLoggedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  sleepLoggedIcon: { fontSize: 22 },
  sleepLoggedLabel: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  sleepLoggedSub: { fontSize: 12, color: '#3D3935', opacity: 0.45, marginTop: 1 },
  sleepQualBar: { width: 48, height: 6, borderRadius: 3, backgroundColor: '#89B4CC22' },
  sleepQualFill: { height: 6, borderRadius: 3, backgroundColor: '#89B4CC' },

  // Check-ins
  checkinBlock: { paddingVertical: 12 },
  checkinDivider: { borderTopWidth: 1, borderTopColor: '#F0EDE8' },
  checkinBlockLabel: { fontSize: 13, fontWeight: '500', color: '#3D3935', marginBottom: 10, opacity: 0.75 },
  medButtons: { flexDirection: 'row', gap: 8 },
  medBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center' },
  medBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.45, fontWeight: '500' },
  substanceRow: { flexDirection: 'row', gap: 10 },
  subBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8' },
  subBtnText: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  rhythmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rhythmSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  rhythmRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rhythmBarWrap: { width: 56, height: 5, borderRadius: 3, backgroundColor: '#E0DDD8', overflow: 'hidden' },
  rhythmFill: { height: 5, borderRadius: 3 },
  rhythmChevron: { fontSize: 18, color: '#3D3935', opacity: 0.2 },

  // Today's Focus tip
  tipCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4,
  },
  tipIcon: { fontSize: 26, marginTop: 1 },
  tipTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  tipBody: { fontSize: 13, color: '#3D3935', opacity: 0.65, lineHeight: 19 },

  // Quick Activities
  quickActsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickActCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, alignItems: 'flex-start',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickActIcon: { fontSize: 22, marginBottom: 8 },
  quickActTitle: { fontSize: 13, fontWeight: '600', color: '#3D3935', marginBottom: 8, lineHeight: 17 },
  quickActBadge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  quickActDur: { fontSize: 11, fontWeight: '600' },

  // AI Insight
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  insightIcon: { fontSize: 18, color: '#C9A84C', marginTop: 1 },
  insightText: { fontSize: 14, color: '#3D3935', lineHeight: 20, opacity: 0.8, marginBottom: 6 },
  insightLink: { fontSize: 12, color: '#C9A84C', fontWeight: '600' },

  // Explore
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  exploreCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F0EDE8',
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  exploreIcon: { fontSize: 20, marginBottom: 6 },
  exploreLabel: { fontSize: 13, fontWeight: '600', color: '#3D3935', marginBottom: 2 },
  exploreSub: { fontSize: 11, color: '#3D3935', opacity: 0.4 },

  // Crisis
  sosBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3D393510', borderWidth: 1.5, borderColor: '#3D393520', marginBottom: 8,
  },
  sosBtnText: { fontSize: 14, fontWeight: '600', color: '#3D3935', opacity: 0.6 },

  // Med skip sheet
  sheetBackdrop: { flex: 1, backgroundColor: '#00000030', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 16 },
  sheetOption: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0DDD8', marginBottom: 8 },
  sheetOptionActive: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  sheetOptionText: { fontSize: 15, color: '#3D3935', opacity: 0.5 },
  sheetOptionTextActive: { color: '#3D3935', opacity: 1, fontWeight: '500' },
  sheetConfirm: { backgroundColor: '#A8C5A0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetConfirmDisabled: { opacity: 0.4 },
  sheetConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
