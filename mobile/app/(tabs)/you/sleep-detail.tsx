import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useAuthStore } from '../../../stores/auth';
import { useSleepStore } from '../../../stores/sleep';
import type { CycleState, SleepLog } from '../../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};

const QUALITY_LABELS = ['', 'Poorly', 'Light', 'OK', 'Good', 'Great'];
const QUALITY_COLORS = ['', '#C4A0B0', '#C4A0B0', '#E8DCC8', '#A8C5A0', '#89B4CC'];
const QUALITY_DOT = ['', '●', '●', '●', '●', '●'];

// ─── Sleep Bar Chart ──────────────────────────────────────────────────────────

function SleepBarChart({ logs }: { logs: SleepLog[] }) {
  const CHART_H = 80;
  const BAR_W = 8;
  const GAP = 4;
  const MAX_H = CHART_H - 16;
  const MAX_MINUTES = 600; // 10h ceiling
  const days = 30;
  const totalW = days * (BAR_W + GAP);

  // Build date → log map for the last 30 calendar days
  const logMap: Record<string, SleepLog> = {};
  logs.forEach((l) => { logMap[l.date] = l; });

  const bars: JSX.Element[] = [];
  const xLabels: JSX.Element[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    const log = logMap[key];
    const x = i * (BAR_W + GAP);

    const rawH = log?.duration_minutes
      ? Math.round((Math.min(log.duration_minutes, MAX_MINUTES) / MAX_MINUTES) * MAX_H)
      : 0;
    const barH = Math.max(rawH, log ? 4 : 2);
    const color = log?.quality_score ? QUALITY_COLORS[log.quality_score] : '#E0DDD8';
    const y = CHART_H - barH - 8;

    bars.push(
      <Rect key={key} x={x} y={y} width={BAR_W} height={barH} rx={2} fill={color} />,
    );

    // Label every 5th bar with abbreviated day
    if (i % 5 === 0) {
      xLabels.push(
        <SvgText
          key={`label-${key}`}
          x={x + BAR_W / 2}
          y={CHART_H}
          fontSize={8}
          fill="#3D3935"
          opacity={0.3}
          textAnchor="middle"
        >
          {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })}
        </SvgText>,
      );
    }
  }

  // Hour reference lines
  const hourLines = [4, 6, 8].map((h) => {
    const y = CHART_H - 8 - Math.round((h * 60 / MAX_MINUTES) * MAX_H);
    return (
      <Line key={h} x1={0} y1={y} x2={totalW} y2={y} stroke="#E0DDD8" strokeWidth={0.5} strokeDasharray="3,3" />
    );
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={CHART_H + 8}>
        {hourLines}
        {bars}
        {xLabels}
      </Svg>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SleepDetailScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const sleep = useSleepStore();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) sleep.load(userId);
  }, [userId]);

  const history = sleep.history;

  // 30-day averages
  const logsWithDuration = history.filter((l) => l.duration_minutes && l.duration_minutes > 0);
  const avgDuration = logsWithDuration.length
    ? Math.round(logsWithDuration.reduce((a, b) => a + (b.duration_minutes ?? 0), 0) / logsWithDuration.length)
    : null;
  const avgQuality = logsWithDuration.length
    ? logsWithDuration.reduce((a, b) => a + (b.quality_score ?? 0), 0) / logsWithDuration.length
    : null;

  function formatDuration(minutes: number | null): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // Last night
  const lastNight = history[0] ?? null;
  const isToday = lastNight?.date === new Date().toISOString().split('T')[0];
  const lastNightLabel = isToday ? 'Last night' : lastNight?.date
    ? new Date(lastNight.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Sleep</Text>

        {/* Last night */}
        {lastNight && (
          <>
            <Text style={s.sectionLabel}>{lastNightLabel?.toUpperCase() ?? 'LAST NIGHT'}</Text>
            <View style={s.lastNightCard}>
              <View style={s.lastNightTop}>
                <Text style={s.lastNightDuration}>{formatDuration(lastNight.duration_minutes)}</Text>
                {lastNight.quality_score !== null && (
                  <View style={[s.qualityBadge, { backgroundColor: QUALITY_COLORS[lastNight.quality_score] + '20' }]}>
                    <Text style={[s.qualityBadgeText, { color: QUALITY_COLORS[lastNight.quality_score] }]}>
                      {QUALITY_LABELS[lastNight.quality_score]}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.lastNightMeta}>
                {lastNight.bedtime && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Fell asleep</Text>
                    <Text style={s.metaValue}>{lastNight.bedtime.slice(0, 5)}</Text>
                  </View>
                )}
                {lastNight.wake_time && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Woke up</Text>
                    <Text style={s.metaValue}>{lastNight.wake_time.slice(0, 5)}</Text>
                  </View>
                )}
                {lastNight.deep_minutes !== null && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>Deep</Text>
                    <Text style={s.metaValue}>{formatDuration(lastNight.deep_minutes)}</Text>
                  </View>
                )}
                {lastNight.rem_minutes !== null && (
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>REM</Text>
                    <Text style={s.metaValue}>{formatDuration(lastNight.rem_minutes)}</Text>
                  </View>
                )}
              </View>

              <Text style={s.sourceLabel}>
                via {lastNight.source === 'healthkit' ? 'Apple Health'
                  : lastNight.source === 'google_fit' ? 'Google Fit'
                  : 'manual entry'}
              </Text>
            </View>
          </>
        )}

        {/* 30-day averages */}
        {logsWithDuration.length > 0 && (
          <>
            <Text style={s.sectionLabel}>30-DAY AVERAGE</Text>
            <View style={s.avgCard}>
              <View style={s.avgRow}>
                <View style={s.avgItem}>
                  <Text style={s.avgValue}>{formatDuration(avgDuration)}</Text>
                  <Text style={s.avgLabel}>avg duration</Text>
                </View>
                <View style={s.avgDivider} />
                <View style={s.avgItem}>
                  <Text style={s.avgValue}>{avgQuality ? avgQuality.toFixed(1) : '—'}/5</Text>
                  <Text style={s.avgLabel}>avg quality</Text>
                </View>
                <View style={s.avgDivider} />
                <View style={s.avgItem}>
                  <Text style={s.avgValue}>{logsWithDuration.length}</Text>
                  <Text style={s.avgLabel}>nights logged</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* 30-day chart */}
        <Text style={s.sectionLabel}>30-DAY CHART</Text>
        <View style={s.chartCard}>
          {history.length > 0 ? (
            <>
              <SleepBarChart logs={history} />
              <View style={s.chartLegend}>
                {['Great (8h+)', 'Good', 'OK', 'Poor (<6h)'].map((label, i) => (
                  <View key={label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: ['#89B4CC', '#A8C5A0', '#E8DCC8', '#C4A0B0'][i] }]} />
                    <Text style={s.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={s.emptyText}>No sleep data logged yet.</Text>
          )}
        </View>

        {/* Quality breakdown */}
        {logsWithDuration.length > 0 && (
          <>
            <Text style={s.sectionLabel}>QUALITY BREAKDOWN</Text>
            <View style={s.breakdownCard}>
              {([5, 4, 3, 2, 1] as const).map((score) => {
                const count = history.filter((l) => l.quality_score === score).length;
                const pct = logsWithDuration.length ? Math.round((count / logsWithDuration.length) * 100) : 0;
                return (
                  <View key={score} style={s.breakdownRow}>
                    <Text style={[s.breakdownLabel, { color: QUALITY_COLORS[score] }]}>
                      {QUALITY_LABELS[score]}
                    </Text>
                    <View style={s.breakdownBar}>
                      <View style={[s.breakdownFill, { width: `${pct}%`, backgroundColor: QUALITY_COLORS[score] + '60' }]} />
                    </View>
                    <Text style={s.breakdownCount}>{count}n</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Log manually */}
        <TouchableOpacity style={s.manualBtn} onPress={() => router.push('/(tabs)/you/wearable-setup')}>
          <Text style={s.manualBtnText}>Wearable sync settings</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  lastNightCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  lastNightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  lastNightDuration: { fontSize: 32, fontWeight: '700', color: '#3D3935', letterSpacing: -0.5 },
  qualityBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10 },
  qualityBadgeText: { fontSize: 13, fontWeight: '600' },
  lastNightMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 10 },
  metaItem: {},
  metaLabel: { fontSize: 11, color: '#3D3935', opacity: 0.35, marginBottom: 2 },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#3D3935' },
  sourceLabel: { fontSize: 11, color: '#3D3935', opacity: 0.25, fontStyle: 'italic' },

  avgCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  avgRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  avgItem: { alignItems: 'center' },
  avgValue: { fontSize: 20, fontWeight: '700', color: '#3D3935' },
  avgLabel: { fontSize: 11, color: '#3D3935', opacity: 0.35, marginTop: 3 },
  avgDivider: { width: 1, height: 30, backgroundColor: '#F0EDE8' },

  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#3D3935', opacity: 0.45 },
  emptyText: { fontSize: 13, color: '#3D3935', opacity: 0.35, textAlign: 'center', paddingVertical: 20 },

  breakdownCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    gap: 10,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownLabel: { fontSize: 12, fontWeight: '500', width: 48 },
  breakdownBar: { flex: 1, height: 6, backgroundColor: '#F0EDE8', borderRadius: 3, overflow: 'hidden' },
  breakdownFill: { height: 6, borderRadius: 3 },
  breakdownCount: { fontSize: 12, color: '#3D3935', opacity: 0.35, width: 28, textAlign: 'right' },

  manualBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A0', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 8,
  },
  manualBtnText: { fontSize: 14, color: '#A8C5A0', fontWeight: '600' },
});
