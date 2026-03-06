import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useCycleStore } from '../../stores/cycle';
import type { CycleState } from '../../types/database';

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
    const key = d.toISOString().split('T')[0];
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TrackerScreen() {
  const { session } = useAuthStore();
  const today = useTodayStore();
  const cycle = useCycleStore();
  const userId = session?.user.id;

  const [selectedState, setSelectedState] = useState<CycleState>(
    today.cycleState ?? 'stable',
  );
  const [intensity, setIntensity] = useState<number>(today.cycleIntensity ?? 5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(today.cycleSymptoms ?? []);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userId) cycle.load90Days(userId);
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
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={s.title}>Cycle Tracker</Text>
        <Text style={s.subtitle}>How have you been today?</Text>

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
        <View style={s.intensityRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
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
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 20 },

  title: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#3D3935', opacity: 0.45, marginBottom: 24 },

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
  stateBtnTextActive: { color: '#3D3935', opacity: 1, fontWeight: '700' },

  // Intensity
  intensityRow: { flexDirection: 'row', gap: 6 },
  intensityChip: {
    flex: 1, aspectRatio: 1, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E0DDD8',
    alignItems: 'center', justifyContent: 'center',
  },
  intensityText: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  intensityTextActive: { color: '#3D3935', opacity: 1, fontWeight: '700' },

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
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  graphLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#3D3935', opacity: 0.5 },

  // Save
  saveBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE', letterSpacing: 0.2 },
});
