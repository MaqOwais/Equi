import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Rect, Polyline } from 'react-native-svg';
import { useAuthStore } from '../../../stores/auth';
import { useSocialRhythmStore } from '../../../stores/socialRhythm';
import { scoreColor } from '../../../utils/socialRhythm';

// ─── Constants ────────────────────────────────────────────────────────────────

const ANCHOR_META: Record<string, { label: string; icon: string }> = {
  wake:          { label: 'Wake up',      icon: '🌅' },
  first_meal:    { label: 'First meal',   icon: '🍳' },
  first_contact: { label: 'First contact',icon: '👋' },
  work_start:    { label: 'Work start',   icon: '💼' },
  dinner:        { label: 'Dinner',       icon: '🍽' },
  bedtime:       { label: 'Bedtime',      icon: '🌙' },
};

// ─── 30-day Bar Chart ─────────────────────────────────────────────────────────

function RhythmChart({ history }: { history: { date: string; score: number | null }[] }) {
  const BAR_W = 7;
  const GAP = 3;
  const H = 60;
  const days = 30;
  const totalW = days * (BAR_W + GAP);

  const logMap: Record<string, number | null> = {};
  history.forEach((l) => { logMap[l.date] = l.score; });

  const bars: JSX.Element[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    const score = logMap[key] ?? null;
    const barH = score !== null ? Math.max(4, Math.round((score / 100) * (H - 4))) : 3;
    const color = score !== null ? scoreColor(score) : '#E0DDD8';
    const x = i * (BAR_W + GAP);
    bars.push(<Rect key={key} x={x} y={H - barH} width={BAR_W} height={barH} rx={2} fill={color} />);
  }

  // Reference line at 80%
  const refY = H - Math.round(0.8 * (H - 4));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW} height={H}>
        <Polyline
          points={`0,${refY} ${totalW},${refY}`}
          fill="none" stroke="#E0DDD8" strokeWidth={0.5} strokeDasharray="3,3"
        />
        {bars}
      </Svg>
    </ScrollView>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <View style={[badge.wrap, { borderColor: color }]}>
      <Text style={[badge.number, { color }]}>{score}</Text>
      <Text style={[badge.pct, { color }]}>%</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 2, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  number: { fontSize: 36, fontWeight: '800', lineHeight: 40 },
  pct: { fontSize: 18, fontWeight: '600', marginBottom: 4, marginLeft: 2 },
});

// ─── Anchor Breakdown Row ─────────────────────────────────────────────────────

function AnchorRow({ name, pct }: { name: string; pct: number }) {
  const meta = ANCHOR_META[name] ?? { label: name, icon: '●' };
  const color = scoreColor(pct);
  const filled = Math.round(pct / 20);  // 0–5 pips

  return (
    <View style={ab.row}>
      <Text style={ab.icon}>{meta.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={ab.label}>{meta.label}</Text>
      </View>
      <View style={ab.pips}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[ab.pip, { backgroundColor: i <= filled ? color : '#E0DDD8' }]} />
        ))}
      </View>
      <Text style={[ab.pct, { color }]}>{pct}%</Text>
    </View>
  );
}

const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  icon: { fontSize: 18, marginRight: 10, width: 24 },
  label: { fontSize: 14, color: '#3D3935', fontWeight: '500' },
  pips: { flexDirection: 'row', gap: 4, marginRight: 10 },
  pip: { width: 8, height: 8, borderRadius: 4 },
  pct: { fontSize: 13, fontWeight: '700', width: 38, textAlign: 'right' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialRhythmScreen() {
  const { session } = useAuthStore();
  const rhythm = useSocialRhythmStore();
  const router = useRouter();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) rhythm.load(userId);
  }, [userId]);

  // 30-day average score
  const avg30 = useMemo(() => {
    const scored = rhythm.history.filter((l) => l.score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, l) => s + (l.score ?? 0), 0) / scored.length);
  }, [rhythm.history]);

  // Trend: last 7 vs prior 7
  const trend = useMemo(() => {
    const scored = [...rhythm.history].reverse().filter((l) => l.score !== null);
    if (scored.length < 7) return null;
    const recent = scored.slice(-7).reduce((s, l) => s + (l.score ?? 0), 0) / 7;
    const prior = scored.slice(-14, -7).reduce((s, l) => s + (l.score ?? 0), 0) / Math.max(scored.slice(-14, -7).length, 1);
    const delta = recent - prior;
    if (delta > 5) return 'Improving ↑';
    if (delta < -5) return 'Declining ↓';
    return 'Stable →';
  }, [rhythm.history]);

  // Per-anchor hit rates from history
  const anchorStats = useMemo(() => {
    const totals: Record<string, { hits: number; days: number }> = {};
    for (const log of rhythm.history) {
      if (!log.anchor_detail) continue;
      for (const d of log.anchor_detail) {
        if (!totals[d.anchor_name]) totals[d.anchor_name] = { hits: 0, days: 0 };
        totals[d.anchor_name].days++;
        if (d.delta_minutes !== null && d.delta_minutes <= 30) totals[d.anchor_name].hits++;
      }
    }
    return Object.entries(totals)
      .map(([name, { hits, days }]) => ({ name, pct: Math.round((hits / days) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [rhythm.history]);

  // Lowest-scoring anchor (for the education card)
  const hardestAnchor = anchorStats.length ? anchorStats[anchorStats.length - 1] : null;

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>Social Rhythm</Text>
        <Text style={s.subtitle}>How consistently are you hitting your daily anchors?</Text>

        {/* Score card */}
        <Text style={s.sectionLabel}>30-DAY AVERAGE</Text>
        <View style={s.card}>
          {avg30 !== null ? (
            <View style={s.scoreRow}>
              <ScoreBadge score={avg30} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                {trend && <Text style={[s.trendText, { color: scoreColor(avg30) }]}>{trend}</Text>}
                <Text style={s.scoreDesc}>
                  {avg30 >= 80 ? 'Your routine is very consistent.' :
                   avg30 >= 50 ? 'Good consistency — keep building.' :
                   'Building rhythm takes time. Every anchor counts.'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.emptyText}>
              Log your daily anchors for 7 days to see your average.
            </Text>
          )}
        </View>

        {/* 30-day chart */}
        <Text style={s.sectionLabel}>30-DAY CHART</Text>
        <View style={s.card}>
          {rhythm.history.length > 0 ? (
            <>
              <RhythmChart history={rhythm.history} />
              <View style={s.legendRow}>
                {[['High (≥80%)', '#A8C5A0'], ['Medium', '#E8DCC8'], ['Low (<50%)', '#C4A0B0']].map(([label, color]) => (
                  <View key={label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: color }]} />
                    <Text style={s.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.chartHint}>Dashed line = 80% target</Text>
            </>
          ) : (
            <Text style={s.emptyText}>No history yet. Start logging anchors from Daily Routine.</Text>
          )}
        </View>

        {/* Anchor breakdown */}
        {anchorStats.length > 0 && (
          <>
            <Text style={s.sectionLabel}>ANCHOR BREAKDOWN</Text>
            <View style={s.card}>
              {anchorStats.map((a, i) => (
                <View key={a.name}>
                  {i > 0 && <View style={s.divider} />}
                  <AnchorRow name={a.name} pct={a.pct} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Log anchors CTA */}
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/(tabs)/you/routine')}>
          <Text style={s.ctaBtnText}>Log today's anchors  →</Text>
        </TouchableOpacity>

        {/* IPSRT education */}
        <Text style={s.sectionLabel}>ABOUT SOCIAL RHYTHM</Text>
        <View style={s.card}>
          <Text style={s.eduTitle}>Why rhythm matters</Text>
          <Text style={s.eduBody}>
            Regular daily routines are linked to fewer and shorter bipolar episodes.
            Social Rhythm Therapy (IPSRT) is one of the most evidence-based psychosocial
            treatments for bipolar disorder. — Frank et al. (2005)
          </Text>
        </View>
        <View style={s.card}>
          <Text style={s.eduTitle}>The 30-minute window</Text>
          <Text style={s.eduBody}>
            Logging an anchor within 30 minutes of your target earns a full point.
            Within 60 minutes earns half a point. The goal is trend awareness,
            not perfectionism — even small improvements matter.
          </Text>
        </View>
        {hardestAnchor && (
          <View style={s.card}>
            <Text style={s.eduTitle}>
              Your hardest anchor: {ANCHOR_META[hardestAnchor.name]?.label ?? hardestAnchor.name} ({hardestAnchor.pct}%)
            </Text>
            <Text style={s.eduBody}>
              Consistency here is tricky — that's normal. Try setting a gentle reminder
              5 minutes before your target time to make logging easier.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#3D3935', opacity: 0.45, lineHeight: 19, marginBottom: 20 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F0EDE8',
  },

  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  trendText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  scoreDesc: { fontSize: 13, color: '#3D3935', opacity: 0.5, lineHeight: 18 },

  legendRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#3D3935', opacity: 0.45 },
  chartHint: { fontSize: 11, color: '#3D3935', opacity: 0.25, marginTop: 6 },

  divider: { height: 1, backgroundColor: '#F0EDE8' },

  ctaBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A0', borderRadius: 14,
    paddingVertical: 13, alignItems: 'center', marginBottom: 16,
  },
  ctaBtnText: { fontSize: 14, fontWeight: '600', color: '#A8C5A0' },

  eduTitle: { fontSize: 14, fontWeight: '600', color: '#3D3935', marginBottom: 6 },
  eduBody: { fontSize: 13, color: '#3D3935', opacity: 0.5, lineHeight: 19 },

  emptyText: { fontSize: 13, color: '#3D3935', opacity: 0.35, lineHeight: 18 },
});
