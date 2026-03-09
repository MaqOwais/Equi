import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line as SvgLine } from 'react-native-svg';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useCycleStore } from '../../stores/cycle';
import { useSleepStore } from '../../stores/sleep';
import { useAIStore } from '../../stores/ai';
import type { CycleState } from '../../types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── 90-day bar graph ─────────────────────────────────────────────────────────

function CycleGraph({ logs }: { logs: { date: string; state: CycleState; intensity: number }[] }) {
  const BAR_W = 7;
  const BAR_GAP = 3;
  const GRAPH_H = 60;
  const days = 90;
  const totalW = days * (BAR_W + BAR_GAP);

  // Build a map of date → log
  const logMap: Record<string, { state: CycleState; intensity: number }> = {};
  logs.forEach((l) => { logMap[l.date] = l; });

  const bars: JSX.Element[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = toLocalIso(d);
    const log = logMap[key];
    const h = log ? Math.max(8, (log.intensity / 10) * GRAPH_H) : 4;
    const color = log ? STATE_COLORS[log.state] : '#E0DDD8';
    const x = i * (BAR_W + BAR_GAP);
    bars.push(
      <Rect
        key={key}
        x={x}
        y={GRAPH_H - h}
        width={BAR_W}
        height={h}
        rx={2}
        fill={color}
      />,
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={GRAPH_H}>
        {bars}
      </Svg>
    </ScrollView>
  );
}

// ─── Sleep Mini-chart ─────────────────────────────────────────────────────────

const SLEEP_Q_COLORS = ['', '#C4A0B0', '#C4A0B0', '#E8DCC8', '#A8C5A0', '#89B4CC'];

function SleepMiniChart({ logs }: { logs: { date: string; duration_minutes: number | null; quality_score: number | null }[] }) {
  const BAR_W = 7;
  const GAP = 3;
  const CHART_H = 40;
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
    bars.push(
      <Rect key={key} x={x} y={CHART_H - barH} width={BAR_W} height={barH} rx={2} fill={color} />,
    );
  }

  // 7h reference line
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
  const ai = useAIStore();
  const userId = session?.user.id;

  const [selectedState, setSelectedState] = useState<CycleState>(
    today.cycleState ?? 'stable',
  );
  const [intensity, setIntensity] = useState<number>(today.cycleIntensity ?? 5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(today.cycleSymptoms ?? []);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userId) {
      cycle.load90Days(userId);
      sleep.load(userId);
      ai.loadTrackerInsight(userId);
    }
  }, [userId]);

  useEffect(() => {
    setSelectedState(today.cycleState ?? 'stable');
    setIntensity(today.cycleIntensity ?? 5);
    setSelectedSymptoms(today.cycleSymptoms ?? []);
  }, [today.cycleState, today.cycleIntensity]);

  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
    setSaved(false);
  }

  async function handleSave() {
    if (!userId) return;
    await today.logCycle(userId, selectedState, intensity, selectedSymptoms, notes);
    await cycle.load90Days(userId);
    setSaved(true);
  }

  const accentColor = STATE_COLORS[selectedState];

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Cycle Tracker</Text>
            <Text style={s.subtitle}>How have you been today?</Text>
          </View>
          <View style={[s.stateSummaryPill, { backgroundColor: accentColor + '22', borderColor: accentColor + '66' }]}>
            <View style={[s.stateSummaryDot, { backgroundColor: accentColor }]} />
            <Text style={[s.stateSummaryText, { color: accentColor }]}>{STATE_LABELS[selectedState]}</Text>
          </View>
        </View>

        {/* State selector */}
        <View style={s.stateRow}>
          {STATES.map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                s.stateBtn,
                selectedState === st && { backgroundColor: STATE_COLORS[st], borderColor: STATE_COLORS[st] },
              ]}
              onPress={() => { setSelectedState(st); setSaved(false); }}
            >
              <Text style={[s.stateBtnText, selectedState === st && s.stateBtnTextActive]}>
                {STATE_LABELS[st]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Intensity */}
        <Text style={s.sectionLabel}>INTENSITY</Text>
        {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
          <View key={ri} style={[s.intensityRow, ri > 0 && { marginTop: 8 }]}>
            {row.map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  s.intensityChip,
                  intensity === n && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
                onPress={() => { setIntensity(n); setSaved(false); }}
              >
                <Text style={[s.intensityText, intensity === n && s.intensityTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={s.intensityLabels}>
          <Text style={s.intensityLabelText}>Mild</Text>
          <Text style={s.intensityLabelText}>Intense</Text>
        </View>

        {/* Symptoms */}
        <Text style={s.sectionLabel}>SYMPTOMS</Text>
        <View style={s.symptomsGrid}>
          {SYMPTOMS[selectedState].map((sym) => {
            const active = selectedSymptoms.includes(sym);
            return (
              <TouchableOpacity
                key={sym}
                style={[s.symptomChip, active && { borderColor: accentColor, backgroundColor: accentColor + '18' }]}
                onPress={() => toggleSymptom(sym)}
              >
                <Text style={[s.symptomText, active && { color: '#3D3935', opacity: 1, fontWeight: '600' }]}>
                  {sym}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={s.sectionLabel}>NOTES  (optional)</Text>
        <TextInput
          style={s.notesInput}
          value={notes}
          onChangeText={(t) => { setNotes(t); setSaved(false); }}
          placeholder="Anything else on your mind today…"
          placeholderTextColor="#3D393540"
          multiline
          textAlignVertical="top"
        />

        {/* 90-day graph */}
        <Text style={s.sectionLabel}>LAST 90 DAYS</Text>
        <View style={s.graphCard}>
          <CycleGraph logs={cycle.logs} />
          <View style={s.graphLegend}>
            {STATES.map((st) => (
              <View key={st} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: STATE_COLORS[st] }]} />
                <Text style={s.legendText}>{STATE_LABELS[st]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AI insight chip — rule-based, offline-safe */}
        {ai.trackerInsight && (
          <View style={s.insightChip}>
            <Text style={s.insightIcon}>💡</Text>
            <Text style={s.insightText}>{ai.trackerInsight}</Text>
          </View>
        )}

        {/* Sleep mini-chart */}
        <Text style={s.sectionLabel}>SLEEP · LAST 30 DAYS</Text>
        <View style={s.graphCard}>
          {sleep.history.length > 0 ? (
            <>
              <SleepMiniChart logs={sleep.history} />
              <View style={s.graphLegend}>
                {(['Great', 'Good', 'OK', 'Poor'] as const).map((label, i) => (
                  <View key={label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: ['#89B4CC', '#A8C5A0', '#E8DCC8', '#C4A0B0'][i] }]} />
                    <Text style={s.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.sleepHint}>Dashed line = 7h target</Text>
            </>
          ) : (
            <Text style={s.sleepEmpty}>
              Log sleep on the Today tab each morning to see your trend here.
            </Text>
          )}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: accentColor }]}
          onPress={handleSave}
        >
          <Text style={s.saveBtnText}>
            {saved ? '✓  Saved' : "Save today's log"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20 },

  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 24,
  },
  stateSummaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  stateSummaryDot: { width: 7, height: 7, borderRadius: 3.5 },
  stateSummaryText: { fontSize: 12, fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#3D3935', opacity: 0.45 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 20,
  },

  // State selector
  stateRow: { flexDirection: 'row', gap: 8 },
  stateBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0DDD8', alignItems: 'center',
  },
  stateBtnText: { fontSize: 13, fontWeight: '500', color: '#3D3935', opacity: 0.5 },
  stateBtnTextActive: { color: '#FFFFFF', opacity: 1, fontWeight: '700' },

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
  intensityLabelText: { fontSize: 11, color: '#3D3935', opacity: 0.3 },

  // Symptoms
  symptomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  symptomText: { fontSize: 13, color: '#3D3935', opacity: 0.45 },

  // Notes
  notesInput: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 14, minHeight: 80, fontSize: 14,
    color: '#3D3935', lineHeight: 20,
  },

  // Graph
  graphCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },
  graphLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#3D3935', opacity: 0.5 },

  sleepHint: { fontSize: 11, color: '#3D3935', opacity: 0.25, marginTop: 8 },
  sleepEmpty: { fontSize: 13, color: '#3D3935', opacity: 0.35, lineHeight: 18 },

  // Save
  saveBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.2 },

  insightChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    marginTop: 8, marginBottom: 4,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  insightIcon: { fontSize: 14, lineHeight: 20 },
  insightText: { flex: 1, fontSize: 13, color: '#3D3935', opacity: 0.6, lineHeight: 19 },
});
