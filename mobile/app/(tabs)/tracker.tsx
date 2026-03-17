import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line as SvgLine, Rect } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useCycleStore, buildDailyDominant, type CycleLogEntry } from '../../stores/cycle';
import { useSleepStore } from '../../stores/sleep';
import { useMedicationsStore } from '../../stores/medications';
import { useSubstanceLogsStore } from '../../stores/substanceLogs';
import { useAmbientTheme } from '../../stores/ambient';
import { fmtTime } from '../../utils/timestamps';
import { getLocal, saveLocal } from '../../lib/local-day-store';
import { calcNutritionScore, CUSTOM_EMOJIS, CUSTOM_SUGGESTIONS, CATEGORY_WHY } from './you/nutrition';
import type { CycleState, MedicationStatus } from '../../types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type TrackerTab = 'cycle' | 'sleep' | 'food' | 'meds';

const DEFAULT_TAB_ORDER: TrackerTab[] = ['cycle', 'sleep', 'food', 'meds'];
const TAB_FULL_LABELS: Record<TrackerTab, string> = {
  cycle: '🔄 Mood Cycle', sleep: '🌙 Sleep', food: '🥗 Food', meds: '💊 Meds',
};
const TAB_SHORT_LABELS: Record<TrackerTab, string> = {
  cycle: '🔄 Cycle', sleep: '🌙 Sleep', food: '🥗 Food', meds: '💊 Meds',
};
const TAB_ORDER_KEY = 'equi_tracker_tab_order';

const STATES: CycleState[] = ['stable', 'manic', 'depressive', 'mixed'];
const STATE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const STATE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};
const SYMPTOMS: Record<CycleState, string[]> = {
  stable:     ['Regular sleep', 'Good energy', 'Clear thinking', 'Social connection'],
  manic:      ['Racing thoughts', 'Overspending', 'Irritability', 'Reduced sleep', 'Grandiosity', 'Risk-taking'],
  depressive: ['Low energy', 'Isolation', 'Hopelessness', 'Sleep changes', 'Poor concentration', 'Appetite changes'],
  mixed:      ['Agitation', 'Rapid mood shifts', 'Fatigue + irritability', 'Restlessness'],
};

const SLEEP_Q_LABELS = ['', 'Poor', 'OK', 'Good', 'Great', 'Excellent'];
const SLEEP_Q_COLORS = ['', '#C4A0B0', '#E8DCC8', '#A8C5A0', '#89B4CC', '#C9A84C'];

type NutrCat = { key: string; label: string; icon: string };
const NUTR_BENEFIT: NutrCat[] = [
  { key: 'anti_inflammatory', label: 'Anti-inflammatory', icon: '🫐' },
  { key: 'whole_grains',      label: 'Whole Grains',      icon: '🌾' },
  { key: 'lean_protein',      label: 'Lean Protein',      icon: '🥚' },
  { key: 'healthy_fats',      label: 'Healthy Fats',      icon: '🥑' },
  { key: 'fermented',         label: 'Fermented / Gut',   icon: '🥛' },
];
const NUTR_HARM: NutrCat[] = [
  { key: 'caffeine',        label: 'Caffeine',        icon: '☕' },
  { key: 'ultra_processed', label: 'Ultra-Processed', icon: '🍟' },
  { key: 'sugar_heavy',     label: 'Sugar-Heavy',     icon: '🍬' },
  { key: 'alcohol',         label: 'Alcohol',         icon: '🍷' },
];
const NUTR_OTHER: NutrCat[] = [
  { key: 'hydration', label: 'Hydration', icon: '💧' },
];
const nutrCustomKey = (uid: string) => `equi_nutrition_custom_${uid}`;

const SUB_ICONS: Record<string, string> = {
  alcohol: '🍷', cannabis: '🌿', stimulant: '⚡', opioid: '💊', other: '🫙',
};

const SKIP_REASONS = ['Forgot', 'Side effects', 'Felt fine', 'Ran out', 'Other'];

// ─── Interactive Cycle Bar Chart ───────────────────────────────────────────────

function CycleBarChart({
  logs, range, selectedDate, onSelectDate,
}: {
  logs: CycleLogEntry[];
  range: number;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const BAR_W = range <= 30 ? 9 : 6;
  const BAR_GAP = range <= 30 ? 4 : 3;
  const CHART_H = 56;

  const dailyMap = buildDailyDominant(logs);

  const bars: JSX.Element[] = [];
  for (let i = 0; i < range; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (range - 1 - i));
    const date = toLocalIso(d);
    const entry = dailyMap[date];
    const h = entry ? Math.max(6, (entry.intensity / 10) * CHART_H) : 3;
    const color = entry ? STATE_COLORS[entry.state] : '#E0DDD8';
    const isSelected = date === selectedDate;

    bars.push(
      <TouchableOpacity
        key={date}
        style={[ch.barWrap, { width: BAR_W, height: CHART_H }]}
        onPress={() => entry ? onSelectDate(isSelected ? null : date) : null}
        activeOpacity={entry ? 0.7 : 1}
      >
        <View
          style={[
            ch.bar,
            { width: BAR_W, height: h, backgroundColor: color, borderRadius: 2 },
            isSelected && { borderWidth: 1.5, borderColor: color, width: BAR_W + 2 },
          ]}
        />
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[ch.chartRow, { gap: BAR_GAP }]}>
        {bars}
      </View>
    </ScrollView>
  );
}

const ch = StyleSheet.create({
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 56 },
  barWrap:  { justifyContent: 'flex-end', alignItems: 'center' },
  bar:      {},
});

// ─── Sleep Chart (SVG) ────────────────────────────────────────────────────────

function SleepMiniChart({ logs }: { logs: { date: string; duration_minutes: number | null; quality_score: number | null }[] }) {
  const BAR_W = 9;
  const GAP = 4;
  const CHART_H = 44;
  const MAX_MINUTES = 600;
  const days = 30;
  const totalW = days * (BAR_W + GAP);

  const logMap: Record<string, typeof logs[0]> = {};
  logs.forEach((l) => { logMap[l.date] = l; });

  const bars: JSX.Element[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = toLocalIso(d);
    const log = logMap[key];
    const x = i * (BAR_W + GAP);
    const rawH = log?.duration_minutes
      ? Math.round((Math.min(log.duration_minutes, MAX_MINUTES) / MAX_MINUTES) * (CHART_H - 4))
      : 0;
    const barH = Math.max(rawH, log ? 3 : 2);
    const color = log?.quality_score ? SLEEP_Q_COLORS[log.quality_score] : '#E0DDD8';
    bars.push(<Rect key={key} x={x} y={CHART_H - barH} width={BAR_W} height={barH} rx={2} fill={color} />);
  }

  const refY = CHART_H - Math.round(((7 * 60) / MAX_MINUTES) * (CHART_H - 4));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={CHART_H}>
        <SvgLine x1={0} y1={refY} x2={totalW} y2={refY} stroke="#E0DDD8" strokeWidth={0.5} strokeDasharray="3,3" />
        {bars}
      </Svg>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrackerScreen() {
  const { session } = useAuthStore();
  const today = useTodayStore();
  const cycle = useCycleStore();
  const sleep = useSleepStore();
  const medsStore = useMedicationsStore();
  const subLogs = useSubstanceLogsStore();
  const router = useRouter();
  const theme = useAmbientTheme();
  const userId = session?.user.id;
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();

  const todayDate = isoToday();

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TrackerTab>('cycle');
  const [tabOrder, setTabOrder] = useState<TrackerTab[]>(DEFAULT_TAB_ORDER);
  const [reorderMode, setReorderMode] = useState(false);

  // Load saved tab order from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(TAB_ORDER_KEY).then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as TrackerTab[];
      if (parsed.length === 4 && DEFAULT_TAB_ORDER.every((t) => parsed.includes(t))) {
        setTabOrder(parsed);
      }
    });
  }, []);

  // Open to the requested tab when navigated via deep link (e.g. ?tab=meds)
  useEffect(() => {
    if (tabParam === 'meds' || tabParam === 'cycle' || tabParam === 'sleep' || tabParam === 'food') {
      setActiveTab(tabParam as TrackerTab);
    }
  }, [tabParam]);

  function moveTab(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= tabOrder.length) return;
    const next = [...tabOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    setTabOrder(next);
    AsyncStorage.setItem(TAB_ORDER_KEY, JSON.stringify(next));
  }

  // ── Cycle tab state ───────────────────────────────────────────────────────
  const [cycleState, setCycleStateLocal] = useState<CycleState>(today.cycleState ?? 'stable');
  const [intensity, setIntensity] = useState<number>(today.cycleIntensity ?? 5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(today.cycleSymptoms ?? []);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [cooldownSecsLeft, setCooldownSecsLeft] = useState(0);
  const [analyticsRange, setAnalyticsRange] = useState<30 | 90>(90);
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const [drillEntries, setDrillEntries] = useState<CycleLogEntry[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // ── Sleep tab state ───────────────────────────────────────────────────────
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepSaving, setSleepSaving] = useState(false);

  // ── Meds tab state ───────────────────────────────────────────────────────
  const [perMedStatus, setPerMedStatus] = useState<Record<string, MedicationStatus | null>>({});
  const [medLogging, setMedLogging] = useState(false);
  const [medLastLogged, setMedLastLogged] = useState<string | null>(null);
  const [skipSheetVisible, setSkipSheetVisible] = useState(false);
  const [pendingMedStatus, setPendingMedStatus] = useState<MedicationStatus | null>(null);
  const [selectedSkipReason, setSelectedSkipReason] = useState<string | null>(null);

  // ── Substances tab state ──────────────────────────────────────────────────
  const [subLogging, setSubLogging] = useState(false);
  const [subLastLogged, setSubLastLogged] = useState<string | null>(null);

  // ── Food tab state ────────────────────────────────────────────────────────
  const [nutritionCounts, setNutritionCounts]         = useState<Record<string, number>>({});
  const [nutritionTimer, setNutritionTimer]           = useState<ReturnType<typeof setTimeout> | null>(null);
  const [nutritionLogging, setNutritionLogging]       = useState(false);
  const [nutritionLastLogged, setNutritionLastLogged] = useState<string | null>(null);
  const [nutrCustomItems, setNutrCustomItems]           = useState<{ key: string; label: string; emoji: string }[]>([]);
  const [nutrModalVisible, setNutrModalVisible]         = useState(false);
  const [nutrNewLabel, setNutrNewLabel]                 = useState('');
  const [nutrSelectedEmoji, setNutrSelectedEmoji]       = useState('🍽️');
  const [nutritionNote, setNutritionNote]               = useState('');
  const [nutrOpenTip, setNutrOpenTip]                   = useState<string | null>(null);

  // ─── Load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    cycle.load90Days(userId);
    cycle.loadDay(userId, todayDate);
    sleep.load(userId);
    medsStore.load(userId);
    subLogs.load(userId, todayDate);
    // Load today's nutrition from local store
    getLocal(userId, todayDate).then((local) => {
      if (local?.nutritionCategories) setNutritionCounts(local.nutritionCategories);
      if (local?.nutritionTimestamp) {
        const d = new Date(local.nutritionTimestamp);
        setNutritionLastLogged(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      }
      if (local?.nutritionNotes) setNutritionNote(local.nutritionNotes);
    });
    AsyncStorage.getItem(nutrCustomKey(userId)).then((raw) => {
      if (raw) {
        const items = JSON.parse(raw) as { key: string; label: string; emoji?: string }[];
        setNutrCustomItems(items.map((c) => ({ ...c, emoji: c.emoji ?? '🍽️' })));
      }
    });
    // Load per-medication status from AsyncStorage
    AsyncStorage.getItem(`equi_per_med_status_${userId}_${todayDate}`).then((raw) => {
      if (raw) setPerMedStatus(JSON.parse(raw));
    });
  }, [userId]);

  // Sync cycle form with today store on first load
  useEffect(() => {
    setCycleStateLocal(today.cycleState ?? 'stable');
    setIntensity(today.cycleIntensity ?? 5);
    setSelectedSymptoms(today.cycleSymptoms ?? []);
  }, [today.cycleState, today.cycleIntensity]);

  // Pre-fill per-med status from global status when meds load and no per-med data saved
  useEffect(() => {
    if (!userId || medsStore.medications.length === 0 || !today.medicationStatus) return;
    const hasAny = medsStore.medications.some((m) => perMedStatus[m.id]);
    if (!hasAny) {
      const prefill: Record<string, MedicationStatus> = {};
      medsStore.medications.forEach((m) => { prefill[m.id] = today.medicationStatus!; });
      setPerMedStatus(prefill);
    }
  }, [medsStore.medications.length, today.medicationStatus]);

  // ─── Cycle handlers ─────────────────────────────────────────────────────
  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  const COOLDOWN_SECS = 10 * 60; // 10 minutes

  async function handleLogEntry() {
    if (!userId || cooldownSecsLeft > 0) return;
    setSaving(true);
    // Write new timestamped entry to Supabase
    await cycle.addEntry(userId, cycleState, intensity, selectedSymptoms, notes || undefined);
    // Keep today store in sync for home screen
    await today.logCycle(userId, cycleState, intensity, selectedSymptoms, notes || undefined);
    setNotes('');
    setSelectedSymptoms([]);
    const savedAt = new Date().toISOString();
    setLastSaved(savedAt);
    setSaving(false);

    // Start 10-minute cooldown
    setCooldownSecsLeft(COOLDOWN_SECS);
    const interval = setInterval(() => {
      setCooldownSecsLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleDrillDate(date: string | null) {
    setDrillDate(date);
    if (!date || !userId) { setDrillEntries([]); return; }
    setDrillLoading(true);
    await cycle.loadDay(userId, date);
    setDrillEntries(cycle.dayEntries);
    setDrillLoading(false);
    // Re-read after await (store may have updated)
  }

  // After loadDay resolves, update drillEntries from the store
  useEffect(() => {
    if (drillDate) setDrillEntries(cycle.dayEntries);
  }, [cycle.dayEntries, drillDate]);

  // ─── Sleep handlers ──────────────────────────────────────────────────────
  async function handleSaveSleep(q: number) {
    if (!userId) return;
    setSleepQuality(q);
    setSleepSaving(true);
    await sleep.logManual(userId, q);
    setSleepSaving(false);
  }

  // ─── Nutrition handlers ──────────────────────────────────────────────────
  function adjustNutrition(key: string, delta: 1 | -1) {
    if (!userId) return;
    const next = Math.max(0, (nutritionCounts[key] ?? 0) + delta);
    const updated = { ...nutritionCounts, [key]: next };
    setNutritionCounts(updated);
    if (nutritionTimer) clearTimeout(nutritionTimer);
    const t = setTimeout(async () => {
      await saveLocal(userId, todayDate, { nutritionCategories: updated, nutritionTimestamp: new Date().toISOString() });
    }, 600);
    setNutritionTimer(t);
  }

  async function handleNutritionLog() {
    if (!userId || nutritionLogging) return;
    if (nutritionTimer) clearTimeout(nutritionTimer);
    setNutritionLogging(true);
    const ts = new Date().toISOString();
    await saveLocal(userId, todayDate, { nutritionCategories: nutritionCounts, nutritionTimestamp: ts });
    const db = (await import('../../lib/supabase')).supabase as any;
    await db.from('nutrition_logs').upsert(
      { user_id: userId, log_date: todayDate, categories: nutritionCounts },
      { onConflict: 'user_id,log_date' },
    );
    setNutritionLastLogged(new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setNutritionLogging(false);
  }

  function addNutrCustomItem() {
    const label = nutrNewLabel.trim();
    if (!label || !userId) return;
    const key = `custom_${label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
    if (nutrCustomItems.some((c) => c.key === key)) {
      setNutrNewLabel(''); setNutrSelectedEmoji('🍽️'); setNutrModalVisible(false); return;
    }
    const updated = [...nutrCustomItems, { key, label, emoji: nutrSelectedEmoji }];
    setNutrCustomItems(updated);
    AsyncStorage.setItem(nutrCustomKey(userId), JSON.stringify(updated));
    setNutrNewLabel(''); setNutrSelectedEmoji('🍽️'); setNutrModalVisible(false);
  }

  function removeNutrCustomItem(key: string) {
    if (!userId) return;
    const updated = nutrCustomItems.filter((c) => c.key !== key);
    setNutrCustomItems(updated);
    AsyncStorage.setItem(nutrCustomKey(userId), JSON.stringify(updated));
    setNutritionCounts((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  // ─── Meds handlers ───────────────────────────────────────────────────────
  function handlePerMedTap(medId: string, status: MedicationStatus) {
    const updated = { ...perMedStatus, [medId]: perMedStatus[medId] === status ? null : status };
    setPerMedStatus(updated);
    if (userId) AsyncStorage.setItem(`equi_per_med_status_${userId}_${todayDate}`, JSON.stringify(updated));
  }

  async function handleLogMedications() {
    if (!userId || medLogging) return;
    const statuses = Object.values(perMedStatus).filter(Boolean) as MedicationStatus[];
    if (statuses.length === 0) return;
    // Compute aggregate status
    const allTaken   = statuses.every((s) => s === 'taken');
    const allSkipped = statuses.every((s) => s === 'skipped');
    const aggregate: MedicationStatus = allTaken ? 'taken' : allSkipped ? 'skipped' : 'partial';
    if (aggregate !== 'taken') {
      setPendingMedStatus(aggregate);
      setSelectedSkipReason(null);
      setSkipSheetVisible(true);
    } else {
      setMedLogging(true);
      await today.logMedication(userId, 'taken');
      setMedLastLogged(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setMedLogging(false);
    }
  }

  function confirmSkip() {
    if (!userId || !pendingMedStatus) return;
    today.logMedication(userId, pendingMedStatus, selectedSkipReason ?? undefined);
    setMedLastLogged(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setSkipSheetVisible(false);
    setPendingMedStatus(null);
    setSelectedSkipReason(null);
  }

  function syncSubsToCheckins(updatedLogs: typeof subLogs.logs) {
    if (!userId) return;
    const hasAlcohol  = medsStore.substances.some((s) => s.category === 'alcohol'  && updatedLogs[s.id]?.used);
    const hasCannabis = medsStore.substances.some((s) => s.category === 'cannabis' && updatedLogs[s.id]?.used);
    // Use logCheckin so checkinTimestamp is saved alongside alcohol/cannabis
    today.logCheckin(userId, hasAlcohol, hasCannabis);
  }

  async function handleSubToggle(substanceId: string) {
    if (!userId) return;
    await subLogs.toggle(userId, todayDate, substanceId);
    syncSubsToCheckins(useSubstanceLogsStore.getState().logs);
  }

  async function handleSubAmount(substanceId: string, delta: number) {
    if (!userId) return;
    await subLogs.setAmount(userId, todayDate, substanceId, delta);
    syncSubsToCheckins(useSubstanceLogsStore.getState().logs);
  }

  async function handleLogSubstances() {
    if (!userId || subLogging) return;
    const anyActive = medsStore.substances.some((s) => subLogs.logs[s.id]?.used);
    if (!anyActive) return;
    setSubLogging(true);
    const hasAlcohol  = medsStore.substances.some((s) => s.category === 'alcohol'  && subLogs.logs[s.id]?.used);
    const hasCannabis = medsStore.substances.some((s) => s.category === 'cannabis' && subLogs.logs[s.id]?.used);
    await today.logCheckin(userId, hasAlcohol, hasCannabis);
    setSubLastLogged(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setSubLogging(false);
  }

  const accentColor = STATE_COLORS[cycleState];
  const todayCycleEntries = cycle.dayEntries.filter((e) => e.date === todayDate);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>

      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: theme.cardBorder }]}>
        {tabOrder.map((id, idx) => (
          <TouchableOpacity
            key={id}
            style={[
              s.tabBtn,
              !reorderMode && activeTab === id && { borderBottomColor: accentColor, borderBottomWidth: 2 },
              reorderMode && { backgroundColor: accentColor + '10' },
            ]}
            onPress={() => { if (!reorderMode) setActiveTab(id); }}
            onLongPress={() => setReorderMode(true)}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            {reorderMode ? (
              <View style={s.tabReorderRow}>
                <TouchableOpacity
                  onPress={() => moveTab(idx, -1)}
                  disabled={idx === 0}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[s.tabArrow, idx === 0 && s.tabArrowDisabled]}>‹</Text>
                </TouchableOpacity>
                <Text style={[s.tabLabelShort, { color: accentColor }]} numberOfLines={1}>
                  {TAB_SHORT_LABELS[id]}
                </Text>
                <TouchableOpacity
                  onPress={() => moveTab(idx, 1)}
                  disabled={idx === tabOrder.length - 1}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[s.tabArrow, idx === tabOrder.length - 1 && s.tabArrowDisabled]}>›</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[s.tabLabel, { color: activeTab === id ? accentColor : theme.textSecondary }]}>
                {TAB_FULL_LABELS[id]}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      {/* Reorder hint / done button */}
      {reorderMode && (
        <View style={[s.reorderBanner, { backgroundColor: accentColor + '12', borderBottomColor: accentColor + '30' }]}>
          <Text style={[s.reorderHint, { color: accentColor }]}>Hold & use arrows to reorder tabs</Text>
          <TouchableOpacity onPress={() => setReorderMode(false)} style={[s.reorderDoneBtn, { backgroundColor: accentColor }]}>
            <Text style={s.reorderDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ══════════ CYCLE TAB ══════════ */}
        {activeTab === 'cycle' && (
          <>
            {/* State selector */}
            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>HOW ARE YOU RIGHT NOW?</Text>
            <View style={[s.stateRow, theme.cardSurface, { borderRadius: 16, padding: 10 }]}>
              {STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    s.stateBtn,
                    cycleState === st && { backgroundColor: STATE_COLORS[st], borderColor: STATE_COLORS[st] },
                  ]}
                  onPress={() => { setCycleStateLocal(st); setSelectedSymptoms([]); }}
                >
                  <Text style={[
                    s.stateBtnText, { color: theme.textSecondary, opacity: 1 },
                    cycleState === st && s.stateBtnActive,
                  ]}>
                    {STATE_LABELS[st]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Intensity */}
            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>INTENSITY</Text>
            {[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]].map((row, ri) => (
              <View key={ri} style={[s.intensityRow, ri > 0 && { marginTop: 8 }]}>
                {row.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      s.intensityChip,
                      intensity !== n && theme.cardSurface,
                      intensity === n && { backgroundColor: accentColor, borderColor: accentColor },
                    ]}
                    onPress={() => setIntensity(n)}
                  >
                    <Text style={[s.intensityText, { color: theme.textSecondary, opacity: 1 }, intensity === n && s.intensityTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={s.intensityLabels}>
              <Text style={[s.hintText, { color: theme.textSecondary }]}>Mild</Text>
              <Text style={[s.hintText, { color: theme.textSecondary }]}>Intense</Text>
            </View>

            {/* Symptoms */}
            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>SYMPTOMS</Text>
            <View style={s.chipsWrap}>
              {SYMPTOMS[cycleState].map((sym) => {
                const active = selectedSymptoms.includes(sym);
                return (
                  <TouchableOpacity
                    key={sym}
                    style={[s.symptomChip, active && { borderColor: accentColor, backgroundColor: accentColor + '18' }]}
                    onPress={() => toggleSymptom(sym)}
                  >
                    <Text style={[s.symptomText, { color: theme.textSecondary, opacity: 1 }, active && { color: theme.textPrimary, opacity: 1, fontWeight: '600' }]}>
                      {sym}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>NOTES  (optional)</Text>
            <TextInput
              style={[s.notesInput, { backgroundColor: '#FFFFFF', color: theme.textPrimary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything else right now…"
              placeholderTextColor="#3D393540"
              multiline
              textAlignVertical="top"
            />

            {/* Log Entry button */}
            <TouchableOpacity
              style={[s.logBtn, { backgroundColor: accentColor }, (saving || cooldownSecsLeft > 0) && s.logBtnDisabled]}
              onPress={handleLogEntry}
              disabled={saving || cooldownSecsLeft > 0}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={s.logBtnText}>
                    {cooldownSecsLeft > 0
                      ? `Wait ${Math.floor(cooldownSecsLeft / 60)}:${String(cooldownSecsLeft % 60).padStart(2, '0')}`
                      : lastSaved ? `+ Log Another Entry` : `+ Log Entry Now`}
                  </Text>
              }
            </TouchableOpacity>
            {lastSaved && cooldownSecsLeft > 0 && (
              <Text style={s.savedHint}>Logged at {fmtTime(lastSaved)} · next entry available after cooldown</Text>
            )}
            {lastSaved && cooldownSecsLeft === 0 && (
              <Text style={s.savedHint}>Last logged at {fmtTime(lastSaved)}</Text>
            )}

            {/* Today's entries */}
            {todayCycleEntries.length > 0 && (
              <>
                <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>TODAY'S ENTRIES</Text>
                <View style={[s.card, theme.cardSurface]}>
                  {todayCycleEntries.map((entry, i) => (
                    <View key={entry.id}>
                      {i > 0 && <View style={s.divider} />}
                      <View style={s.timelineRow}>
                        <Text style={s.timelineTime}>{fmtTime(entry.timestamp)}</Text>
                        <View style={[s.timelineDot, { backgroundColor: STATE_COLORS[entry.state] }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.timelineState, { color: STATE_COLORS[entry.state] }]}>
                            {STATE_LABELS[entry.state]} · {entry.intensity}/10
                          </Text>
                          {entry.symptoms.length > 0 && (
                            <Text style={s.timelineSub} numberOfLines={1}>{entry.symptoms.join(', ')}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Analytics */}
            <View style={s.analyticHeader}>
              <Text style={[s.sectionLabel, theme.sectionLabelStyle, { marginTop: 20, marginBottom: 0 }]}>HISTORY</Text>
              <View style={s.rangeToggle}>
                {([30, 90] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[s.rangeBtn, analyticsRange === r && { backgroundColor: accentColor }]}
                    onPress={() => { setAnalyticsRange(r); setDrillDate(null); }}
                  >
                    <Text style={[s.rangeBtnText, analyticsRange === r && { color: '#FFFFFF' }]}>{r}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[s.card, theme.cardSurface]}>
              <CycleBarChart
                logs={cycle.logs}
                range={analyticsRange}
                selectedDate={drillDate}
                onSelectDate={(date) => {
                  if (!userId) return;
                  if (date === drillDate) { setDrillDate(null); setDrillEntries([]); return; }
                  setDrillDate(date);
                  setDrillLoading(true);
                  cycle.loadDay(userId, date).then(() => setDrillLoading(false));
                }}
              />
              <View style={s.graphLegend}>
                {STATES.map((st) => (
                  <View key={st} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: STATE_COLORS[st] }]} />
                    <Text style={[s.legendText, { color: theme.textSecondary }]}>{STATE_LABELS[st]}</Text>
                  </View>
                ))}
              </View>
              <Text style={[s.hintText, { color: theme.textSecondary, marginTop: 8 }]}>
                Tap a bar to see that day's entries
              </Text>
            </View>

            {/* Drill-down intraday */}
            {drillDate && (
              <View style={[s.card, theme.cardSurface, { marginTop: 0 }]}>
                <Text style={[s.drillTitle, { color: theme.textPrimary }]}>
                  {new Date(drillDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>
                {drillLoading ? (
                  <ActivityIndicator color={accentColor} style={{ marginVertical: 12 }} />
                ) : drillEntries.length === 0 ? (
                  <Text style={[s.hintText, { color: theme.textSecondary }]}>No entries for this day</Text>
                ) : (
                  drillEntries.map((entry, i) => (
                    <View key={entry.id}>
                      {i > 0 && <View style={s.divider} />}
                      <View style={s.timelineRow}>
                        <Text style={s.timelineTime}>{fmtTime(entry.timestamp)}</Text>
                        <View style={[s.timelineDot, { backgroundColor: STATE_COLORS[entry.state] }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.timelineState, { color: STATE_COLORS[entry.state] }]}>
                            {STATE_LABELS[entry.state]} · {entry.intensity}/10
                          </Text>
                          {entry.symptoms.length > 0 && (
                            <Text style={s.timelineSub}>{entry.symptoms.join(', ')}</Text>
                          )}
                          {entry.notes && (
                            <Text style={s.timelineNotes}>{entry.notes}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}

        {/* ══════════ SLEEP TAB ══════════ */}
        {activeTab === 'sleep' && (
          <>
            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>LAST NIGHT</Text>
            {sleep.todayLog ? (
              <View style={[s.card, theme.cardSurface]}>
                <View style={s.sleepSummaryRow}>
                  <View style={s.sleepStat}>
                    <Text style={[s.sleepStatNum, { color: '#89B4CC' }]}>
                      {sleep.todayLog.duration_minutes ? fmtDuration(sleep.todayLog.duration_minutes) : '—'}
                    </Text>
                    <Text style={[s.sleepStatLabel, { color: theme.textSecondary }]}>Duration</Text>
                  </View>
                  <View style={s.sleepStatDivider} />
                  <View style={s.sleepStat}>
                    <Text style={[s.sleepStatNum, { color: sleep.todayLog.quality_score ? SLEEP_Q_COLORS[sleep.todayLog.quality_score] : '#E0DDD8' }]}>
                      {sleep.todayLog.quality_score ? SLEEP_Q_LABELS[sleep.todayLog.quality_score] : '—'}
                    </Text>
                    <Text style={[s.sleepStatLabel, { color: theme.textSecondary }]}>Quality</Text>
                  </View>
                  {sleep.todayLog.bedtime && (
                    <>
                      <View style={s.sleepStatDivider} />
                      <View style={s.sleepStat}>
                        <Text style={[s.sleepStatNum, { color: theme.textPrimary, fontSize: 15 }]}>
                          {sleep.todayLog.bedtime.substring(0, 5)}
                        </Text>
                        <Text style={[s.sleepStatLabel, { color: theme.textSecondary }]}>Bedtime</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <View style={[s.card, theme.cardSurface, s.emptyCard]}>
                <Text style={s.emptyIcon}>🌙</Text>
                <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No sleep logged yet</Text>
                <Text style={[s.emptyBody, { color: theme.textSecondary }]}>How did you sleep last night?</Text>
              </View>
            )}

            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>LOG SLEEP QUALITY</Text>
            <View style={[s.card, theme.cardSurface]}>
              <View style={s.sleepQRow}>
                {[1, 2, 3, 4, 5].map((q) => {
                  const isActive = sleepQuality === q || sleep.todayLog?.quality_score === q;
                  const color = SLEEP_Q_COLORS[q];
                  return (
                    <TouchableOpacity
                      key={q}
                      style={[s.sleepQBtn, isActive && { borderColor: color, backgroundColor: color + '22' }]}
                      onPress={() => handleSaveSleep(q)}
                      disabled={sleepSaving}
                    >
                      <Text style={[s.sleepQNum, isActive && { color }]}>{q}</Text>
                      <Text style={[s.sleepQLabel, isActive && { color }]}>{SLEEP_Q_LABELS[q]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {sleepSaving && <ActivityIndicator color="#89B4CC" style={{ marginTop: 8 }} />}
            </View>

            <TouchableOpacity
              style={[s.linkBtn, { borderColor: '#89B4CC' + '55' }]}
              onPress={() => router.push('/(tabs)/you/sleep-detail')}
              activeOpacity={0.7}
            >
              <Text style={[s.linkBtnText, { color: '#89B4CC' }]}>Full sleep log & detail →</Text>
            </TouchableOpacity>

            <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>LAST 30 DAYS</Text>
            <View style={[s.card, theme.cardSurface]}>
              {sleep.history.length > 0 ? (
                <>
                  <SleepMiniChart logs={sleep.history} />
                  <View style={s.graphLegend}>
                    {(['Excellent', 'Great', 'Good', 'OK', 'Poor'] as const).map((label, i) => (
                      <View key={label} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: ['#C9A84C', '#89B4CC', '#A8C5A0', '#E8DCC8', '#C4A0B0'][i] }]} />
                        <Text style={[s.legendText, { color: theme.textSecondary }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[s.hintText, { color: theme.textSecondary, marginTop: 8 }]}>Dashed line = 7h target</Text>
                </>
              ) : (
                <Text style={[s.hintText, { color: theme.textSecondary }]}>Log sleep each morning to see your trend.</Text>
              )}
            </View>
          </>
        )}

        {/* ══════════ FOOD TAB ══════════ */}
        {activeTab === 'food' && (() => {
          const totalLogged = Object.values(nutritionCounts).reduce((a, b) => a + b, 0);
          const score = calcNutritionScore(nutritionCounts);
          const scoreColor = totalLogged === 0 ? '#3D393540'
            : score >= 7 ? '#A8C5A0' : score >= 4 ? '#C9A84C' : '#C4A0B0';
          const scoreLabel = totalLogged === 0 ? 'Nothing logged'
            : score >= 7 ? 'Anti-inflammatory' : score >= 4 ? 'Mixed day' : 'Needs attention';

          const renderNutrRow = (cat: NutrCat) => {
            const count = nutritionCounts[cat.key] ?? 0;
            const tipOpen = nutrOpenTip === cat.key;
            const why = CATEGORY_WHY[cat.key];
            return (
              <View key={cat.key}>
                <View style={s.nutriRow}>
                  <Text style={s.nutriIcon}>{cat.icon}</Text>
                  <Text style={[s.nutriLabel, { color: theme.textPrimary, flex: 1 }]}>{cat.label}</Text>
                  {why && (
                    <TouchableOpacity
                      style={s.nutrInfoBtn}
                      onPress={() => setNutrOpenTip(tipOpen ? null : cat.key)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[s.nutrInfoBtnText, tipOpen && s.nutrInfoBtnOpen]}>ⓘ</Text>
                    </TouchableOpacity>
                  )}
                  <View style={s.nutriCounter}>
                    <TouchableOpacity style={s.counterBtn} onPress={() => adjustNutrition(cat.key, -1)} disabled={count === 0}>
                      <Text style={[s.counterBtnText, count === 0 && { opacity: 0.2 }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[s.counterVal, { color: theme.textPrimary }]}>{count}</Text>
                    <TouchableOpacity style={s.counterBtn} onPress={() => adjustNutrition(cat.key, 1)}>
                      <Text style={s.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {tipOpen && why && (
                  <View style={s.nutrTipPanel}>
                    <Text style={s.nutrTipText}>{why}</Text>
                  </View>
                )}
              </View>
            );
          };

          return (
            <>
              {/* Score card */}
              <View style={[s.nutrScoreCard, theme.cardSurface, { borderLeftColor: scoreColor }]}>
                <View style={s.nutrScoreLeft}>
                  <Text style={[s.nutrScoreNum, { color: scoreColor }]}>{totalLogged > 0 ? score : '–'}</Text>
                  <Text style={s.nutrScoreDenom}>/10</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.nutrScoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
                  <Text style={s.nutrScoreSub}>
                    {totalLogged > 0 ? 'Food quality score today' : 'Tap + to start logging'}
                  </Text>
                </View>
              </View>

              {/* Anti-inflammatory */}
              <Text style={[s.sectionLabel, theme.sectionLabelStyle, s.nutrSectionLabel]}>ANTI-INFLAMMATORY</Text>
              <View style={[s.card, theme.cardSurface]}>
                {NUTR_BENEFIT.map(renderNutrRow)}
              </View>

              {/* May destabilize */}
              <Text style={[s.sectionLabel, theme.sectionLabelStyle, s.nutrSectionLabel]}>MAY DESTABILIZE</Text>
              <View style={[s.card, theme.cardSurface]}>
                {NUTR_HARM.map(renderNutrRow)}
              </View>

              {/* Other */}
              <Text style={[s.sectionLabel, theme.sectionLabelStyle, s.nutrSectionLabel]}>OTHER</Text>
              <View style={[s.card, theme.cardSurface]}>
                {NUTR_OTHER.map(renderNutrRow)}
                {nutrCustomItems.map((cat) => {
                  const count = nutritionCounts[cat.key] ?? 0;
                  return (
                    <View key={cat.key} style={s.nutriRow}>
                      <Text style={s.nutriIcon}>{cat.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.nutriLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
                        <TouchableOpacity onPress={() => removeNutrCustomItem(cat.key)}>
                          <Text style={s.nutrRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={s.nutriCounter}>
                        <TouchableOpacity style={s.counterBtn} onPress={() => adjustNutrition(cat.key, -1)} disabled={count === 0}>
                          <Text style={[s.counterBtnText, count === 0 && { opacity: 0.2 }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[s.counterVal, { color: theme.textPrimary }]}>{count}</Text>
                        <TouchableOpacity style={s.counterBtn} onPress={() => adjustNutrition(cat.key, 1)}>
                          <Text style={s.counterBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Add custom food */}
              <TouchableOpacity
                style={s.nutrAddBtn}
                onPress={() => { setNutrNewLabel(''); setNutrSelectedEmoji('🍽️'); setNutrModalVisible(true); }}
                activeOpacity={0.7}
              >
                <Text style={s.nutrAddText}>+ Add food to track</Text>
              </TouchableOpacity>

              {/* Diet note */}
              <View style={[s.card, theme.cardSurface, { marginBottom: 4 }]}>
                <Text style={s.nutrNoteLabel}>DIET NOTE  (optional)</Text>
                <TextInput
                  style={[s.nutrNoteInput, { color: theme.textPrimary }]}
                  placeholder="Anything notable about today's food..."
                  placeholderTextColor="#3D393540"
                  value={nutritionNote}
                  onChangeText={(t) => {
                    setNutritionNote(t);
                    if (nutritionTimer) clearTimeout(nutritionTimer);
                    const tt = setTimeout(async () => {
                      if (!userId) return;
                      await saveLocal(userId, todayDate, { nutritionNotes: t || null });
                    }, 800);
                    setNutritionTimer(tt);
                  }}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  maxLength={300}
                />
              </View>

              {/* Log button */}
              <View style={s.medLogRow}>
                {nutritionLastLogged && (
                  <Text style={s.medLoggedAt}>Logged at {nutritionLastLogged}</Text>
                )}
                <TouchableOpacity
                  style={[s.medLogBtn, { backgroundColor: totalLogged > 0 ? '#A8C5A0' : '#E0DDD8' }]}
                  onPress={handleNutritionLog}
                  disabled={nutritionLogging || totalLogged === 0}
                  activeOpacity={0.8}
                >
                  {nutritionLogging
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={s.medLogBtnText}>
                        {nutritionLastLogged ? '↺  Update Log' : 'Save Nutrition Log'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          );
        })()}

        {/* ══════════ MEDS TAB ══════════ */}
        {activeTab === 'meds' && (
          <>
            {/* Medications — per-medication status */}
            {medsStore.medications.length > 0 && (
              <>
                <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>MEDICATIONS TODAY</Text>
                <View style={[s.card, theme.cardSurface]}>
                  {medsStore.medications.map((med, idx) => {
                    const medStatus = perMedStatus[med.id] ?? null;
                    return (
                      <View key={med.id}>
                        {idx > 0 && <View style={s.perMedDivider} />}
                        <View style={s.perMedRow}>
                          <View style={s.perMedInfo}>
                            <Text style={[s.perMedName, { color: theme.textPrimary }]}>{med.name}</Text>
                            {med.dosage ? <Text style={[s.perMedDosage, { color: theme.textSecondary }]}>{med.dosage}</Text> : null}
                          </View>
                          <View style={s.perMedBtns}>
                            {(['taken', 'skipped', 'partial'] as MedicationStatus[]).map((status) => {
                              const active = medStatus === status;
                              const color = status === 'taken' ? '#A8C5A0' : status === 'skipped' ? '#C4A0B0' : '#C9A84C';
                              return (
                                <TouchableOpacity
                                  key={status}
                                  style={[s.perMedBtn, active && { borderColor: color, backgroundColor: color + '18' }]}
                                  onPress={() => handlePerMedTap(med.id, status)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[s.perMedBtnText, { color: active ? color : theme.textSecondary }, active && { fontWeight: '700' }]}>
                                    {status === 'taken' ? '✓' : status === 'skipped' ? '✗' : '~'}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                        {/* Status label */}
                        {medStatus && (
                          <Text style={[s.perMedStatusLabel, {
                            color: medStatus === 'taken' ? '#A8C5A0' : medStatus === 'skipped' ? '#C4A0B0' : '#C9A84C',
                          }]}>
                            {medStatus === 'taken' ? 'Taken' : medStatus === 'skipped' ? 'Skipped' : 'Partial'}
                          </Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Log button */}
                  <View style={s.medLogRow}>
                    {medLastLogged && (
                      <Text style={s.medLoggedAt}>Logged at {medLastLogged}</Text>
                    )}
                    {today.medicationSkipReason && (
                      <Text style={[s.medLoggedAt, { fontStyle: 'italic' }]}>Reason: {today.medicationSkipReason}</Text>
                    )}
                    {(() => {
                      const anySet = Object.values(perMedStatus).some(Boolean);
                      return (
                        <TouchableOpacity
                          style={[s.medLogBtn, { backgroundColor: anySet ? '#C4A0B0' : '#E0DDD8' }]}
                          onPress={handleLogMedications}
                          disabled={medLogging || !anySet}
                          activeOpacity={0.8}
                        >
                          {medLogging
                            ? <ActivityIndicator color="#FFFFFF" size="small" />
                            : <Text style={s.medLogBtnText}>
                                {today.medicationStatus ? '↺ Update Log' : 'Log Medications'}
                              </Text>
                          }
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </View>
              </>
            )}

            {/* Substances */}
            {medsStore.substances.length > 0 && (
              <>
                <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>SUBSTANCES TODAY</Text>
                <View style={[s.card, theme.cardSurface]}>
                  <View style={s.subList}>
                    {medsStore.substances.map((sub, idx) => {
                      const log = subLogs.logs[sub.id];
                      const active = log?.used === true;
                      const amount = log?.amount ?? 1;
                      return (
                        <View key={sub.id}>
                          {idx > 0 && <View style={s.subDivider} />}
                          <View style={[s.subRow, active && { backgroundColor: '#C4A0B008' }]}>
                            <TouchableOpacity
                              style={s.subToggle}
                              onPress={() => handleSubToggle(sub.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={s.subChipIcon}>{SUB_ICONS[sub.category] ?? '🫙'}</Text>
                              <Text style={[s.subChipText, { color: theme.textPrimary }, active && { color: '#C4A0B0', fontWeight: '700' }]}>
                                {sub.name}
                              </Text>
                            </TouchableOpacity>
                            {active ? (
                              <View style={s.amountRow}>
                                <TouchableOpacity
                                  style={s.amountBtn}
                                  onPress={() => handleSubAmount(sub.id, -1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={s.amountBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={s.amountCount}>{amount}</Text>
                                <TouchableOpacity
                                  style={s.amountBtn}
                                  onPress={() => handleSubAmount(sub.id, 1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={s.amountBtnText}>+</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <Text style={s.subChipCheck}> </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Log button */}
                  <View style={s.medLogRow}>
                    {subLastLogged && (
                      <Text style={s.medLoggedAt}>Logged at {subLastLogged}</Text>
                    )}
                    {(() => {
                      const anyActive = medsStore.substances.some((s) => subLogs.logs[s.id]?.used);
                      return (
                        <TouchableOpacity
                          style={[s.medLogBtn, { backgroundColor: anyActive ? '#C4A0B0' : '#E0DDD8' }]}
                          onPress={handleLogSubstances}
                          disabled={subLogging || !anyActive}
                          activeOpacity={0.8}
                        >
                          {subLogging
                            ? <ActivityIndicator color="#FFFFFF" size="small" />
                            : <Text style={s.medLogBtnText}>
                                {today.alcohol !== null || today.cannabis !== null ? '↺ Update Log' : 'Log Substances'}
                              </Text>
                          }
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </View>
              </>
            )}

            {/* Empty state */}
            {medsStore.medications.length === 0 && medsStore.substances.length === 0 && (
              <View style={[s.card, theme.cardSurface, s.emptyCard]}>
                <Text style={s.emptyIcon}>💊</Text>
                <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>Nothing configured</Text>
                <Text style={[s.emptyBody, { color: theme.textSecondary }]}>
                  Add medications and substances to track them here.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.linkBtn, { borderColor: '#C4A0B055' }]}
              onPress={() => router.push('/(tabs)/you/medications')}
              activeOpacity={0.7}
            >
              <Text style={[s.linkBtnText, { color: '#C4A0B0' }]}>Manage medications →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.linkBtn, { borderColor: '#A8C5A055', marginTop: 8 }]}
              onPress={() => router.push('/(tabs)/you/substances')}
              activeOpacity={0.7}
            >
              <Text style={[s.linkBtnText, { color: '#A8C5A0' }]}>Manage substances →</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Med skip sheet ────────────────────────────────────────────── */}
      <Modal visible={skipSheetVisible} transparent animationType="slide">
        <Pressable style={s.sheetBackdrop} onPress={() => setSkipSheetVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>
              {pendingMedStatus === 'partial' ? 'What was partial?' : 'Why did you skip?'}
            </Text>
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

      {/* ── Nutrition custom food modal ── */}
      <Modal
        visible={nutrModalVisible} transparent animationType="fade"
        onRequestClose={() => { setNutrModalVisible(false); setNutrNewLabel(''); setNutrSelectedEmoji('🍽️'); }}
      >
        <Pressable
          style={s.nutrOverlay}
          onPress={() => { setNutrModalVisible(false); setNutrNewLabel(''); setNutrSelectedEmoji('🍽️'); }}
        >
          <Pressable style={s.nutrModalCard} onPress={() => {}}>
            <Text style={s.nutrModalTitle}>Add food to track</Text>

            {/* Quick suggestions */}
            <Text style={s.nutrModalSectionLabel}>QUICK ADD</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
              {CUSTOM_SUGGESTIONS.map((sg) => (
                <TouchableOpacity
                  key={sg.label}
                  style={[s.nutrSuggestChip, nutrNewLabel === sg.label && { backgroundColor: '#A8C5A022', borderColor: '#A8C5A0' }]}
                  onPress={() => { setNutrNewLabel(sg.label); setNutrSelectedEmoji(sg.emoji); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.nutrSuggestText}>{sg.emoji}  {sg.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name input */}
            <Text style={[s.nutrModalSectionLabel, { marginTop: 12 }]}>NAME</Text>
            <TextInput
              style={s.nutrModalInput}
              placeholder="Or type your own..."
              placeholderTextColor="#3D393550"
              value={nutrNewLabel}
              onChangeText={setNutrNewLabel}
              maxLength={40}
              onSubmitEditing={addNutrCustomItem}
              returnKeyType="done"
            />

            {/* Emoji picker */}
            <Text style={s.nutrModalSectionLabel}>EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 4, paddingRight: 4 }}>
              {CUSTOM_EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[s.nutrEmojiBtn, nutrSelectedEmoji === em && s.nutrEmojiBtnSelected]}
                  onPress={() => setNutrSelectedEmoji(em)}
                  activeOpacity={0.7}
                >
                  <Text style={s.nutrEmojiChar}>{em}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.nutrModalBtns}>
              <TouchableOpacity
                style={s.nutrModalCancel}
                onPress={() => { setNutrModalVisible(false); setNutrNewLabel(''); setNutrSelectedEmoji('🍽️'); }}
              >
                <Text style={s.nutrModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.nutrModalAdd, { backgroundColor: nutrNewLabel.trim() ? '#A8C5A0' : '#E0DDD8' }]}
                onPress={addNutrCustomItem}
                disabled={!nutrNewLabel.trim()}
              >
                <Text style={s.nutrModalAddText}>{nutrSelectedEmoji}  Add</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  tabLabelShort: { fontSize: 10, fontWeight: '700', flex: 1, textAlign: 'center' },
  tabReorderRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  tabArrow: { fontSize: 18, fontWeight: '700', color: '#3D3935', lineHeight: 22 },
  tabArrowDisabled: { opacity: 0.2 },
  reorderBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1,
  },
  reorderHint: { fontSize: 11, fontStyle: 'italic', opacity: 0.8 },
  reorderDoneBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  reorderDoneText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 20,
  },

  // Cards
  card: {
    borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1.5, borderColor: '#F0EDE8',
  },
  divider: { height: 1, backgroundColor: '#F0EDE8', marginVertical: 10 },

  // State selector
  stateRow: { flexDirection: 'row', gap: 8 },
  stateBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center',
  },
  stateBtnText: { fontSize: 13, fontWeight: '500' },
  stateBtnActive: { color: '#FFFFFF', opacity: 1, fontWeight: '700' },

  // Intensity
  intensityRow: { flexDirection: 'row', gap: 8 },
  intensityChip: {
    flex: 1, aspectRatio: 1, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8',
    alignItems: 'center', justifyContent: 'center',
  },
  intensityText: { fontSize: 14, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  intensityTextActive: { color: '#FFFFFF', opacity: 1, fontWeight: '700' },
  intensityLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },

  // Symptoms
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0DDD8',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  symptomText: { fontSize: 13, color: '#3D3935', opacity: 0.45 },

  // Notes
  notesInput: {
    borderRadius: 14, padding: 14, minHeight: 70, fontSize: 14,
    color: '#3D3935', lineHeight: 20, borderWidth: 1.5, borderColor: '#F0EDE8',
  },

  // Log button
  logBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    justifyContent: 'center', marginTop: 16,
  },
  logBtnDisabled: { opacity: 0.6 },
  logBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  savedHint: { fontSize: 12, color: '#3D393560', textAlign: 'center', marginTop: 6 },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  timelineTime: { fontSize: 12, color: '#3D393555', width: 60, marginTop: 2, fontVariant: ['tabular-nums'] },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  timelineState: { fontSize: 14, fontWeight: '600' },
  timelineSub: { fontSize: 12, color: '#3D393560', marginTop: 2 },
  timelineNotes: { fontSize: 12, color: '#3D393555', marginTop: 2, fontStyle: 'italic' },

  // Analytics
  analyticHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  rangeToggle: { flexDirection: 'row', gap: 4 },
  rangeBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: '#F0EDE8',
  },
  rangeBtnText: { fontSize: 12, fontWeight: '700', color: '#3D3935' },

  drillTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },

  // Graph legend
  graphLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, opacity: 0.6 },

  hintText: { fontSize: 11, opacity: 0.4 },

  // Sleep
  sleepSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  sleepStat: { alignItems: 'center', flex: 1 },
  sleepStatNum: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  sleepStatLabel: { fontSize: 11, opacity: 0.5, marginTop: 3 },
  sleepStatDivider: { width: 1, height: 40, backgroundColor: '#F0EDE8' },
  sleepQRow: { flexDirection: 'row', gap: 8 },
  sleepQBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center',
  },
  sleepQNum: { fontSize: 16, fontWeight: '700', color: '#3D3935', opacity: 0.5 },
  sleepQLabel: { fontSize: 9, fontWeight: '600', color: '#3D3935', opacity: 0.4, marginTop: 2 },

  // Food / nutrition
  nutrSectionLabel: { marginTop: 4 },
  nutrScoreCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 14, marginBottom: 4,
    borderLeftWidth: 4,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  nutrScoreLeft:  { flexDirection: 'row', alignItems: 'baseline', marginRight: 14 },
  nutrScoreNum:   { fontSize: 30, fontWeight: '700' },
  nutrScoreDenom: { fontSize: 14, color: '#3D393560', fontWeight: '500', marginLeft: 2 },
  nutrScoreLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  nutrScoreSub:   { fontSize: 11, color: '#3D3935', opacity: 0.45 },
  nutrRemoveText: { fontSize: 10, color: '#C4A0B0', marginTop: 2, fontWeight: '500' },
  nutrAddBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A040', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginBottom: 4,
  },
  nutrAddText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },
  // Nutrition modal
  nutrOverlay: {
    flex: 1, backgroundColor: '#00000040',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  nutrModalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
  },
  nutrModalTitle:      { fontSize: 17, fontWeight: '700', color: '#3D3935', marginBottom: 4 },
  nutrModalSub:        { fontSize: 12, color: '#3D3935', opacity: 0.45, marginBottom: 16, lineHeight: 18 },
  nutrModalInput: {
    borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#3D3935', marginBottom: 20,
  },
  nutrModalBtns:       { flexDirection: 'row', gap: 10 },
  nutrModalCancel:     { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#F7F3EE' },
  nutrModalCancelText: { fontSize: 14, fontWeight: '600', color: '#3D393580' },
  nutrModalAdd:        { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  nutrModalAddText:    { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  nutrModalSectionLabel: { fontSize: 10, fontWeight: '700', color: '#3D393566', letterSpacing: 1, marginBottom: 8 },
  nutrSuggestChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E8DCC8', backgroundColor: '#F7F3EE', marginRight: 8,
  },
  nutrSuggestText: { fontSize: 13, fontWeight: '500', color: '#3D3935' },
  nutrEmojiBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8DCC8',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  nutrEmojiBtnSelected: { borderColor: '#A8C5A0', backgroundColor: '#A8C5A015' },
  nutrEmojiChar: { fontSize: 20 },
  nutrInfoBtn:     { paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  nutrInfoBtnText: { fontSize: 14, color: '#3D393540', fontWeight: '500' },
  nutrInfoBtnOpen: { color: '#A8C5A0' },
  nutrTipPanel: {
    paddingHorizontal: 12, paddingBottom: 10, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
  },
  nutrTipText: { fontSize: 12, color: '#3D393599', lineHeight: 18 },
  nutrNoteLabel: { fontSize: 10, fontWeight: '700', color: '#3D393566', letterSpacing: 1, marginBottom: 8 },
  nutrNoteInput: {
    borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, minHeight: 72, textAlignVertical: 'top',
  },
  nutriRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  nutriIcon: { fontSize: 20, width: 28 },
  nutriLabel: { fontSize: 14, fontWeight: '500' },
  nutriCounter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#F0EDE8',
    alignItems: 'center', justifyContent: 'center',
  },
  counterBtnText: { fontSize: 18, fontWeight: '600', color: '#3D3935', lineHeight: 22 },
  counterVal: { fontSize: 15, fontWeight: '700', minWidth: 18, textAlign: 'center' },

  // Meds
  medNameRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  medName: { flex: 1, fontSize: 14, fontWeight: '500' },
  medBell: { fontSize: 14 },
  medBtnRow: { flexDirection: 'row', gap: 8 },
  medBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center',
  },
  medBtnText: { fontSize: 13, fontWeight: '500' },

  // Per-medication rows
  perMedDivider: { height: 1, backgroundColor: '#F0EDE8', marginVertical: 10 },
  perMedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perMedInfo: { flex: 1 },
  perMedName: { fontSize: 14, fontWeight: '600' },
  perMedDosage: { fontSize: 11, marginTop: 1, opacity: 0.6 },
  perMedBtns: { flexDirection: 'row', gap: 6 },
  perMedBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0DDD8',
    alignItems: 'center', justifyContent: 'center',
  },
  perMedBtnText: { fontSize: 16, fontWeight: '700' },
  perMedStatusLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, marginLeft: 2, letterSpacing: 0.4 },
  medLogRow: { marginTop: 16, gap: 6 },
  medLoggedAt: { fontSize: 11, color: '#3D393560', fontStyle: 'italic', textAlign: 'center' },
  medLogBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  medLogBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Skip sheet
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

  // Substances
  subList: { gap: 0 },
  subDivider: { height: 1, backgroundColor: '#F0EDE8' },
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 10, borderRadius: 10,
  },
  subToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  subChipIcon: { fontSize: 16 },
  subChipText: { fontSize: 14, fontWeight: '500' },
  subChipCheck: { fontSize: 11, color: '#C4A0B0', fontWeight: '700', width: 20 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  amountBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#C4A0B022', borderWidth: 1, borderColor: '#C4A0B055',
    alignItems: 'center', justifyContent: 'center',
  },
  amountBtnText: { fontSize: 16, fontWeight: '700', color: '#C4A0B0', lineHeight: 20 },
  amountCount: {
    fontSize: 14, fontWeight: '700', color: '#C4A0B0',
    minWidth: 28, textAlign: 'center',
  },

  // Link buttons
  linkBtn: {
    borderRadius: 12, borderWidth: 1.5, paddingVertical: 12,
    paddingHorizontal: 16, alignItems: 'center', marginBottom: 8,
  },
  linkBtnText: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyBody: { fontSize: 13, opacity: 0.4, textAlign: 'center', lineHeight: 18 },
});
