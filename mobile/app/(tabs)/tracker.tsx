import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line as SvgLine, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useCycleStore, buildDailyDominant, type CycleLogEntry } from '../../stores/cycle';
import { useSleepStore } from '../../stores/sleep';
import { useMedicationsStore } from '../../stores/medications';
import { useSubstanceLogsStore } from '../../stores/substanceLogs';
import { useAmbientTheme } from '../../stores/ambient';
import { fmtTime } from '../../utils/timestamps';
import { getLocal, saveLocal } from '../../lib/local-day-store';
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

const NUTRITION_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'anti_inflammatory', label: 'Anti-inflam.',  icon: '🫐' },
  { key: 'whole_grains',      label: 'Whole Grains',  icon: '🌾' },
  { key: 'lean_protein',      label: 'Lean Protein',  icon: '🥚' },
  { key: 'healthy_fats',      label: 'Healthy Fats',  icon: '🥑' },
  { key: 'fermented',         label: 'Fermented',     icon: '🥛' },
  { key: 'caffeine',          label: 'Caffeine',      icon: '☕' },
  { key: 'ultra_processed',   label: 'Processed',     icon: '🍟' },
  { key: 'sugar_heavy',       label: 'Sugar',         icon: '🍬' },
  { key: 'hydration',         label: 'Hydration',     icon: '💧' },
];

const SUB_ICONS: Record<string, string> = {
  alcohol: '🍷', cannabis: '🌿', stimulant: '⚡', opioid: '💊', other: '🫙',
};

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

  const todayDate = isoToday();

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TrackerTab>('cycle');

  // ── Cycle tab state ───────────────────────────────────────────────────────
  const [cycleState, setCycleStateLocal] = useState<CycleState>(today.cycleState ?? 'stable');
  const [intensity, setIntensity] = useState<number>(today.cycleIntensity ?? 5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(today.cycleSymptoms ?? []);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<30 | 90>(90);
  const [drillDate, setDrillDate] = useState<string | null>(null);
  const [drillEntries, setDrillEntries] = useState<CycleLogEntry[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // ── Sleep tab state ───────────────────────────────────────────────────────
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepSaving, setSleepSaving] = useState(false);

  // ── Meds tab state ───────────────────────────────────────────────────────
  const [skipReason, setSkipReason] = useState('');
  const [pendingMedStatus, setPendingMedStatus] = useState<MedicationStatus | null>(null);

  // ── Food tab state ────────────────────────────────────────────────────────
  const [nutritionCounts, setNutritionCounts] = useState<Record<string, number>>({});
  const [nutritionSaved, setNutritionSaved] = useState(false);
  const [nutritionTimer, setNutritionTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

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
    });
  }, [userId]);

  // Sync cycle form with today store on first load
  useEffect(() => {
    setCycleStateLocal(today.cycleState ?? 'stable');
    setIntensity(today.cycleIntensity ?? 5);
    setSelectedSymptoms(today.cycleSymptoms ?? []);
  }, [today.cycleState, today.cycleIntensity]);

  // ─── Cycle handlers ─────────────────────────────────────────────────────
  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleLogEntry() {
    if (!userId) return;
    setSaving(true);
    // Write new timestamped entry to Supabase
    await cycle.addEntry(userId, cycleState, intensity, selectedSymptoms, notes || undefined);
    // Keep today store in sync for home screen
    await today.logCycle(userId, cycleState, intensity, selectedSymptoms, notes || undefined);
    setNotes('');
    setLastSaved(new Date().toISOString());
    setSaving(false);
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
    setNutritionSaved(false);
    if (nutritionTimer) clearTimeout(nutritionTimer);
    const t = setTimeout(async () => {
      await saveLocal(userId, todayDate, { nutritionCategories: updated });
      setNutritionSaved(true);
    }, 600);
    setNutritionTimer(t);
  }

  // ─── Meds handlers ───────────────────────────────────────────────────────
  function handleMedTap(status: MedicationStatus) {
    if (!userId) return;
    if (status === 'skipped' || status === 'partial') {
      setPendingMedStatus(status);
      setSkipReason('');
    } else {
      today.logMedication(userId, status);
      setPendingMedStatus(null);
      setSkipReason('');
    }
  }

  function submitMedStatus() {
    if (!userId || !pendingMedStatus) return;
    today.logMedication(userId, pendingMedStatus, skipReason.trim() || undefined);
    setPendingMedStatus(null);
    setSkipReason('');
  }

  function handleSubToggle(substanceId: string) {
    if (!userId) return;
    subLogs.toggle(userId, todayDate, substanceId);
  }

  const accentColor = STATE_COLORS[cycleState];
  const todayCycleEntries = cycle.dayEntries.filter((e) => e.date === todayDate);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>

      {/* Tab bar */}
      <View style={[s.tabBar, { borderBottomColor: theme.cardBorder }]}>
        {(
          [
            { id: 'cycle', label: '🔄 Cycle' },
            { id: 'sleep', label: '🌙 Sleep' },
            { id: 'food',  label: '🥗 Food' },
            { id: 'meds',  label: '💊 Meds' },
          ] as { id: TrackerTab; label: string }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tabBtn, activeTab === tab.id && { borderBottomColor: accentColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, { color: activeTab === tab.id ? accentColor : theme.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
                  onPress={() => { setCycleStateLocal(st); }}
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
              style={[s.logBtn, { backgroundColor: accentColor }, saving && s.logBtnDisabled]}
              onPress={handleLogEntry}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={s.logBtnText}>
                    {lastSaved ? `+ Log Another Entry` : `+ Log Entry Now`}
                  </Text>
              }
            </TouchableOpacity>
            {lastSaved && (
              <Text style={s.savedHint}>Saved at {fmtTime(lastSaved)} · you can log again anytime</Text>
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
        {activeTab === 'food' && (
          <>
            <View style={s.foodHeader}>
              <Text style={[s.sectionLabel, theme.sectionLabelStyle, { marginTop: 0, marginBottom: 0 }]}>TODAY'S FOOD</Text>
              {nutritionSaved && <Text style={s.savedBadge}>✓ Saved</Text>}
            </View>
            <View style={[s.card, theme.cardSurface]}>
              {NUTRITION_CATEGORIES.map((cat) => {
                const count = nutritionCounts[cat.key] ?? 0;
                return (
                  <View key={cat.key} style={s.nutriRow}>
                    <Text style={s.nutriIcon}>{cat.icon}</Text>
                    <Text style={[s.nutriLabel, { color: theme.textPrimary, flex: 1 }]}>{cat.label}</Text>
                    <View style={s.nutriCounter}>
                      <TouchableOpacity
                        style={s.counterBtn}
                        onPress={() => adjustNutrition(cat.key, -1)}
                        disabled={count === 0}
                      >
                        <Text style={[s.counterBtnText, count === 0 && { opacity: 0.2 }]}>−</Text>
                      </TouchableOpacity>
                      <Text style={[s.counterVal, { color: theme.textPrimary }]}>{count}</Text>
                      <TouchableOpacity
                        style={s.counterBtn}
                        onPress={() => adjustNutrition(cat.key, 1)}
                      >
                        <Text style={s.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.linkBtn, { borderColor: '#C9A84C55' }]}
              onPress={() => router.push('/(tabs)/you/nutrition')}
              activeOpacity={0.7}
            >
              <Text style={[s.linkBtnText, { color: '#C9A84C' }]}>Full nutrition log with all categories →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ══════════ MEDS TAB ══════════ */}
        {activeTab === 'meds' && (
          <>
            {/* Medications */}
            {medsStore.medications.length > 0 && (
              <>
                <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>MEDICATIONS</Text>
                <View style={[s.card, theme.cardSurface]}>
                  {medsStore.medications.map((med) => (
                    <View key={med.id} style={s.medNameRow}>
                      <Text style={[s.medName, { color: theme.textPrimary }]}>
                        {med.name}{med.dosage ? ` · ${med.dosage}` : ''}
                      </Text>
                      {med.ring_enabled && <Text style={s.medBell}>🔔</Text>}
                    </View>
                  ))}
                  <View style={[s.medBtnRow, { marginTop: 12 }]}>
                    {(['taken', 'skipped', 'partial'] as MedicationStatus[]).map((status) => {
                      const active = today.medicationStatus === status;
                      const color = status === 'taken' ? '#A8C5A0' : status === 'skipped' ? '#C4A0B0' : '#C9A84C';
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[s.medBtn, active && { borderColor: color, backgroundColor: color + '18' }]}
                          onPress={() => handleMedTap(status)}
                        >
                          <Text style={[s.medBtnText, { color: theme.textSecondary, opacity: 1 }, active && { color, fontWeight: '700', opacity: 1 }]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Logged skip reason display */}
                  {!pendingMedStatus && today.medicationSkipReason && (today.medicationStatus === 'skipped' || today.medicationStatus === 'partial') && (
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
                      Reason: {today.medicationSkipReason}
                    </Text>
                  )}

                  {/* Skip reason input */}
                  {pendingMedStatus && (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      <Text style={[s.medName, { color: theme.textSecondary, fontSize: 12 }]}>
                        {pendingMedStatus === 'skipped' ? 'Why did you skip? (optional)' : 'What was partial? (optional)'}
                      </Text>
                      <TextInput
                        style={[s.skipInput, { color: theme.textPrimary, borderColor: pendingMedStatus === 'skipped' ? '#C4A0B055' : '#C9A84C55', backgroundColor: theme.cardBg }]}
                        placeholder="e.g. forgot, side effects, ran out..."
                        placeholderTextColor={theme.textSecondary}
                        value={skipReason}
                        onChangeText={setSkipReason}
                        maxLength={120}
                        returnKeyType="done"
                        onSubmitEditing={submitMedStatus}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[s.medBtn, { flex: 1, borderColor: pendingMedStatus === 'skipped' ? '#C4A0B0' : '#C9A84C', backgroundColor: (pendingMedStatus === 'skipped' ? '#C4A0B0' : '#C9A84C') + '18' }]}
                          onPress={submitMedStatus}
                        >
                          <Text style={[s.medBtnText, { color: pendingMedStatus === 'skipped' ? '#C4A0B0' : '#C9A84C', fontWeight: '700' }]}>
                            Confirm {pendingMedStatus === 'skipped' ? 'Skipped' : 'Partial'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.medBtn, { borderColor: '#E0DDD8' }]}
                          onPress={() => { setPendingMedStatus(null); setSkipReason(''); }}
                        >
                          <Text style={[s.medBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Substances */}
            {medsStore.substances.length > 0 && (
              <>
                <Text style={[s.sectionLabel, theme.sectionLabelStyle]}>SUBSTANCES TODAY</Text>
                <View style={[s.card, theme.cardSurface]}>
                  <View style={s.subGrid}>
                    {medsStore.substances.map((sub) => {
                      const active = subLogs.logs[sub.id] === true;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          style={[s.subChip, active && { borderColor: '#C4A0B0', backgroundColor: '#C4A0B015' }]}
                          onPress={() => handleSubToggle(sub.id)}
                        >
                          <Text style={s.subChipIcon}>{SUB_ICONS[sub.category] ?? '🫙'}</Text>
                          <Text style={[s.subChipText, { color: theme.textPrimary }, active && { color: '#C4A0B0', fontWeight: '700' }]}>
                            {sub.name}
                          </Text>
                          {active && <Text style={s.subChipCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
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
  foodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
  savedBadge: { fontSize: 11, color: '#A8C5A0', fontWeight: '700' },
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
  skipInput: {
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14,
  },

  // Substances
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  subChipIcon: { fontSize: 15 },
  subChipText: { fontSize: 13, fontWeight: '500' },
  subChipCheck: { fontSize: 11, color: '#C4A0B0', fontWeight: '700' },

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
