import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useAuthStore } from '../../../stores/auth';
import { useSleepStore } from '../../../stores/sleep';
import { useSocialRhythmStore } from '../../../stores/socialRhythm';
import { supabase } from '../../../lib/supabase';
import type { Diagnosis } from '../../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAGNOSIS_LABELS: Record<Diagnosis, string> = {
  bipolar_1: 'Bipolar I',
  bipolar_2: 'Bipolar II',
  cyclothymia: 'Cyclothymia',
  unsure: 'Unsure / Exploring',
};

// ─── Wellness Radar ───────────────────────────────────────────────────────────

interface RadarScores {
  mood: number;       // 0–100
  activity: number;
  journal: number;
  mindful: number;
  social: number;
  sleep: number;
}

const AXES = ['Mood', 'Sleep', 'Activity', 'Social', 'Mindful', 'Journal'];

function hexPoint(cx: number, cy: number, r: number, i: number) {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function WellnessRadar({ scores }: { scores: RadarScores }) {
  const SIZE = 180;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 70;
  const vals = [scores.mood, scores.sleep, scores.activity, scores.social, scores.mindful, scores.journal];

  // Outer grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    AXES.map((_, i) => hexPoint(cx, cy, R * f, i))
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  // Data polygon
  const dataPoints = vals
    .map((v, i) => hexPoint(cx, cy, R * Math.min(v / 100, 1), i))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  // Axis lines + labels
  const axisLines = AXES.map((label, i) => {
    const outer = hexPoint(cx, cy, R, i);
    const labelPt = hexPoint(cx, cy, R + 16, i);
    return { outer, labelPt, label };
  });

  return (
    <View style={rdr.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Grid rings */}
        {rings.map((pts, ri) => (
          <Polygon key={ri} points={pts} fill="none" stroke="#E0DDD8" strokeWidth={0.8} />
        ))}
        {/* Axis lines */}
        {axisLines.map(({ outer }, i) => (
          <Line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#E0DDD8" strokeWidth={0.8} />
        ))}
        {/* Data polygon */}
        <Polygon points={dataPoints} fill="#A8C5A025" stroke="#A8C5A0" strokeWidth={1.5} />
        {/* Data dots */}
        {dataPoints.split(' ').map((pt, i) => {
          const [x, y] = pt.split(',').map(Number);
          return <Circle key={i} cx={x} cy={y} r={3} fill="#A8C5A0" />;
        })}
        {/* Axis labels */}
        {axisLines.map(({ labelPt, label }, i) => (
          <SvgText
            key={i}
            x={labelPt.x}
            y={labelPt.y + 4}
            fontSize={9}
            fill="#3D3935"
            opacity={0.45}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const rdr = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
});

// ─── Menu Item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon, label, sub, onPress, right,
}: { icon: string; label: string; sub?: string; onPress: () => void; right?: React.ReactNode }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.menuLabel}>{label}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      {right ?? <Text style={s.menuChevron}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function YouScreen() {
  const { session, profile, signOut, updateProfile } = useAuthStore();
  const router = useRouter();
  const sleep = useSleepStore();
  const rhythm = useSocialRhythmStore();
  const userId = session?.user.id;

  const [stats, setStats] = useState({ days: 0, activities: 0, stableDays: 0 });
  const [radarScores, setRadarScores] = useState<RadarScores>({
    mood: 0, activity: 0, journal: 0, mindful: 0, social: 0, sleep: 0,
  });
  const [trackMed, setTrackMed] = useState(profile?.track_medication ?? false);

  const displayName = profile?.display_name ?? session?.user.email?.split('@')[0] ?? 'You';
  const diagnosisLabel = profile?.diagnosis ? DIAGNOSIS_LABELS[profile.diagnosis] : null;

  useEffect(() => {
    if (userId) {
      loadStats();
      sleep.load(userId);
      rhythm.load(userId);
    }
  }, [userId]);

  useEffect(() => {
    setTrackMed(profile?.track_medication ?? false);
  }, [profile?.track_medication]);

  async function loadStats() {
    if (!userId) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split('T')[0];

    const [moodRes, actRes, stableRes, journalRes, groundingRes] = await Promise.all([
      supabase.from('mood_logs').select('score, logged_at').eq('user_id', userId).gte('logged_at', since),
      supabase.from('activity_completions').select('id').eq('user_id', userId).not('completed_at', 'is', null),
      supabase.from('cycle_logs').select('id').eq('user_id', userId).eq('state', 'stable'),
      supabase.from('journal_entries').select('id').eq('user_id', userId).gte('entry_date', since),
      supabase.from('activity_completions')
        .select('activity:activities(category)')
        .eq('user_id', userId)
        .not('completed_at', 'is', null),
    ]);

    const moodLogs = moodRes.data ?? [];
    const avgMood = moodLogs.length
      ? (moodLogs.reduce((a, b) => a + b.score, 0) / moodLogs.length) * 10
      : 0;

    const allActivities = actRes.data?.length ?? 0;
    const journalCount = journalRes.data?.length ?? 0;
    const groundingCount = (groundingRes.data ?? [])
      .filter((r) => (r.activity as { category?: string } | null)?.category === 'grounding').length;

    setStats({
      days: moodLogs.length,
      activities: allActivities,
      stableDays: stableRes.data?.length ?? 0,
    });
    setRadarScores({
      mood:     Math.round(avgMood),
      activity: Math.min(100, Math.round((allActivities / 30) * 100)),
      journal:  Math.round((journalCount / 30) * 100),
      mindful:  Math.min(100, groundingCount * 10),
      social:   (() => {
        const scored = rhythm.history.filter((l) => l.score !== null);
        if (!scored.length) return 0;
        return Math.round(scored.reduce((a, b) => a + (b.score ?? 0), 0) / scored.length);
      })(),
      sleep:    (() => {
        const sleepLogs = sleep.history;
        if (!sleepLogs.length) return 0;
        const avg = sleepLogs.reduce((a, b) => a + (b.duration_minutes ?? 0), 0) / sleepLogs.length;
        return Math.min(100, Math.round((avg / 480) * 100)); // 480min = 8h target
      })(),
    });
  }

  async function handleMedToggle(val: boolean) {
    setTrackMed(val);
    await supabase.from('profiles').update({ track_medication: val }).eq('id', userId);
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={s.avatar}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{displayName}</Text>
          {diagnosisLabel && <Text style={s.diagnosis}>{diagnosisLabel}</Text>}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'days tracked', value: stats.days },
            { label: 'activities', value: stats.activities },
            { label: 'stable days', value: stats.stableDays },
          ].map((stat) => (
            <View key={stat.label} style={s.statItem}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Wellness Radar */}
        <View style={s.radarCard}>
          <Text style={s.sectionLabel}>WELLNESS RADAR · 30 DAYS</Text>
          <WellnessRadar scores={radarScores} />
          <Text style={s.radarNote}>Sleep requires wearable sync · Social from rhythm logs</Text>
        </View>

        {/* AI & Insights */}
        <Text style={s.sectionLabel}>AI & INSIGHTS</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="🧠"
            label="AI Wellness Report"
            sub="Weekly analysis of your patterns"
            onPress={() => router.push('/(tabs)/you/ai-report')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="⚡"
            label="Relapse Signatures"
            sub="Personal early warning patterns"
            onPress={() => router.push('/(tabs)/you/relapse-signature')}
          />
        </View>

        {/* Wellbeing tools */}
        <Text style={s.sectionLabel}>WELLBEING TOOLS</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="🗓"
            label="Daily Routine"
            sub="IPSRT social rhythm anchors"
            onPress={() => router.push('/(tabs)/you/routine')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="📊"
            label="Social Rhythm History"
            sub={rhythm.history.length > 0
              ? (() => {
                  const scored = rhythm.history.filter((l) => l.score !== null);
                  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + (b.score ?? 0), 0) / scored.length) : 0;
                  return `30-day average: ${avg}%`;
                })()
              : 'Log anchors to see your trend'}
            onPress={() => router.push('/(tabs)/you/social-rhythm')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="🥗"
            label="Nutrition"
            sub="Food quality — no calorie tracking"
            onPress={() => router.push('/(tabs)/you/nutrition')}
          />
        </View>

        {/* Social */}
        <Text style={s.sectionLabel}>SOCIAL</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="🤝"
            label="Support Network"
            sub="Manage well-wishers & guardians"
            onPress={() => router.push('/(tabs)/you/support-network')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="💬"
            label="Community"
            sub="Anonymous peer support"
            onPress={() => router.push('/community')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="🩺"
            label="Psychiatrists"
            sub="Find & connect with clinicians"
            onPress={() => router.push('/psychiatrists')}
          />
        </View>

        {/* Settings */}
        <Text style={s.sectionLabel}>SETTINGS</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="💊"
            label="Medication tracking"
            sub={trackMed ? 'Enabled' : 'Disabled'}
            onPress={() => {}}
            right={
              <Switch
                value={trackMed}
                onValueChange={handleMedToggle}
                trackColor={{ true: '#A8C5A0' }}
              />
            }
          />
          <View style={s.divider} />
          <MenuItem
            icon="🔒"
            label="Privacy & data"
            sub="Export or delete your data"
            onPress={() => {}}
          />
          <View style={s.divider} />
          <MenuItem icon="🔔" label="Notifications" onPress={() => router.push('/(tabs)/you/notifications')} />
        </View>

        {/* Wearable */}
        <Text style={s.sectionLabel}>WEARABLE</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="⌚"
            label="Wearable sync"
            sub={sleep.wearableConnections.length > 0 ? 'Apple Health connected' : 'Apple Health · Google Fit'}
            onPress={() => router.push('/(tabs)/you/wearable-setup')}
          />
          <View style={s.divider} />
          <MenuItem
            icon="🌙"
            label="Sleep"
            sub={sleep.history.length > 0
              ? `${sleep.history.length} nights logged`
              : 'No data yet'}
            onPress={() => router.push('/(tabs)/you/sleep-detail')}
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  avatar: { alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#A8C5A030', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: '#A8C5A0' },
  name: { fontSize: 20, fontWeight: '700', color: '#3D3935', marginBottom: 4 },
  diagnosis: { fontSize: 13, color: '#3D3935', opacity: 0.4 },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#3D3935' },
  statLabel: { fontSize: 11, color: '#3D3935', opacity: 0.35, marginTop: 2 },

  radarCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  radarNote: { fontSize: 11, color: '#3D3935', opacity: 0.25, textAlign: 'center', marginTop: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4,
  },

  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#3D3935' },
  menuSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 1 },
  menuChevron: { fontSize: 20, color: '#3D3935', opacity: 0.2 },
  divider: { height: 1, backgroundColor: '#F0EDE8', marginLeft: 48 },

  signOutBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText: { fontSize: 14, color: '#3D3935', opacity: 0.35, fontWeight: '500' },
});
