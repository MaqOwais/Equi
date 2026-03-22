/**
 * dev-mode.tsx — Developer panel (only visible when DEV_MODE = true).
 *
 * Lets developers override flags without changing real data, so they can
 * test both bipolar and general user paths on the same device/simulator.
 *
 * Guard: rendered from you/index.tsx only when DEV_MODE is true.
 */

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { useDevStore } from '../../../stores/dev';
import { isBipolar, diagnosisLabel, useBipolarFlag } from '../../../lib/bipolar-flag';
import type { Diagnosis } from '../../../types/database';

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALL_DIAGNOSES: Diagnosis[] = [
  'bipolar_1', 'bipolar_2', 'cyclothymia',
  'depression', 'anxiety', 'general', 'other', 'unsure',
];

/** Every place in the app that branches on the bipolar flag. */
const FLAG_IMPACT_MAP = [
  {
    screen: 'Home (index.tsx)',
    bipolar: 'Workbook → "Bipolar exercises" · Tracker → "90-Day Mood Cycle" · Activities → "Matched to state"',
    general: 'Workbook → "Wellness exercises" · Tracker → "90-Day Mood Chart" · Activities → "Matched to your mood"',
  },
  {
    screen: 'Workbook (workbook.tsx)',
    bipolar: '"Bipolar Workbook" — IPSRT, episode awareness, relapse signatures, lithium adherence',
    general: '"Wellness Workbook" — CBT/DBT framing, no bipolar terminology',
  },
  {
    screen: 'Activities (activities.tsx)',
    bipolar: 'Workbook sub: "Evidence-based exercises · CANMAT first-line" · Routine sub: "Social rhythm anchors · IPSRT-based"',
    general: 'Workbook sub: "Evidence-based exercises" · Routine sub: "Evidence-based routine building"',
  },
  {
    screen: 'Tracker symptoms (tracker.tsx)',
    bipolar: 'Manic: Grandiosity, Overspending · Depressive: Hopelessness, Isolation',
    general: 'Manic: Busy/fast mind, Increased activity · Depressive: Low mood, Withdrawal',
  },
  {
    screen: 'Nutrition (nutrition.tsx)',
    bipolar: 'Harm header: "MAY DESTABILIZE" · blurbs mention lithium & bipolar disorder',
    general: 'Harm header: "LIMIT OR WATCH" · blurbs use broad-population language',
  },
  {
    screen: 'Relapse Signatures (relapse-signature.tsx)',
    bipolar: 'Title: "Relapse Signatures" · Tabs: "Elevated/Manic" & "Low/Depressive"',
    general: 'Title: "Warning Signs" · Tabs: "High/Elevated" & "Low/Difficult"',
  },
  {
    screen: 'Medications (medications.tsx)',
    bipolar: 'Name placeholder: "e.g. Lithium, Quetiapine"',
    general: 'Name placeholder: "e.g. Sertraline, Fluoxetine"',
  },
  {
    screen: 'AI Report (groq.ts)',
    bipolar: 'System prompt: bipolar disorder monitoring, spectrum diagnosis, cycle states',
    general: 'System prompt: mental health & wellbeing, neutral language, no bipolar framing',
  },
  {
    screen: 'Activity evidence refs (evidence-refs.ts)',
    bipolar: 'MBCT for bipolar, IPSRT for routine, bipolar psychoeducation, shame/guilt after episodes',
    general: 'MBCT for general depression, general routine/circadian, broad psychoeducation',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={s.sectionLabel}>{text}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

function Chip({
  label, active, color = '#A8C5A0', onPress,
}: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[s.chip, active && { backgroundColor: color + '20', borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DevModeScreen() {
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const dev     = useDevStore();
  const activeBipolarFlag = useBipolarFlag();

  const realDiagnosis = profile?.diagnosis ?? null;
  const realBipolar   = isBipolar(realDiagnosis);

  // ── Active values (after overrides) ────────────────────────────────────────
  const activeDiagnosis = dev.diagnosisOverride ?? realDiagnosis;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>🛠 Developer Mode</Text>
          <Text style={s.subtitle}>Overrides reset when app restarts · never shown in prod</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Active flag status ─────────────────────────────────────────── */}
        <SectionLabel text="ACTIVE FLAG STATUS" />
        <View style={s.statusCard}>
          <Row>
            <Text style={s.statusKey}>BIPOLAR FLAG</Text>
            <View style={[s.badge, { backgroundColor: activeBipolarFlag ? '#89B4CC20' : '#A8C5A020' }]}>
              <Text style={[s.badgeText, { color: activeBipolarFlag ? '#89B4CC' : '#A8C5A0' }]}>
                {activeBipolarFlag ? 'TRUE  — bipolar path' : 'FALSE — general path'}
              </Text>
            </View>
          </Row>
          <View style={s.divider} />
          <Row>
            <Text style={s.statusKey}>DIAGNOSIS</Text>
            <Text style={s.statusVal}>
              {activeDiagnosis
                ? `${diagnosisLabel(activeDiagnosis as Diagnosis)}  (${activeDiagnosis})`
                : 'not set'}
            </Text>
          </Row>
          <View style={s.divider} />
          <Row>
            <Text style={s.statusKey}>OVERRIDE ACTIVE</Text>
            <Text style={[s.statusVal, {
              color: (dev.bipolarOverride !== null || dev.diagnosisOverride !== null)
                ? '#C9A84C' : '#A8C5A0',
            }]}>
              {(dev.bipolarOverride !== null || dev.diagnosisOverride !== null)
                ? 'YES — values below are simulated'
                : 'NO — using real profile data'}
            </Text>
          </Row>
          <View style={s.divider} />
          <Row>
            <Text style={s.statusKey}>REAL PROFILE</Text>
            <Text style={s.statusVal}>
              {realDiagnosis
                ? `${diagnosisLabel(realDiagnosis)} · bipolar=${String(realBipolar)}`
                : 'no profile / not logged in'}
            </Text>
          </Row>
        </View>

        {/* ── Bipolar flag override ──────────────────────────────────────── */}
        <SectionLabel text="BIPOLAR FLAG OVERRIDE" />
        <View style={s.card}>
          <Text style={s.cardNote}>
            Overrides what useBipolarFlag() returns across the entire app.
            Diagnosis override (below) also moves the flag if set.
          </Text>
          <View style={s.chipRow}>
            <Chip
              label="Auto (use real)"
              active={dev.bipolarOverride === null}
              onPress={() => dev.setBipolarOverride(null)}
            />
            <Chip
              label="Force Bipolar"
              active={dev.bipolarOverride === 'bipolar'}
              color="#89B4CC"
              onPress={() => dev.setBipolarOverride('bipolar')}
            />
            <Chip
              label="Force General"
              active={dev.bipolarOverride === 'general'}
              color="#A8C5A0"
              onPress={() => dev.setBipolarOverride('general')}
            />
          </View>
        </View>

        {/* ── Diagnosis override ─────────────────────────────────────────── */}
        <SectionLabel text="DIAGNOSIS OVERRIDE" />
        <View style={s.card}>
          <Text style={s.cardNote}>
            Simulates a different diagnosis. Also cascades to the bipolar flag
            unless the flag override above is set to Force Bipolar/General.
          </Text>

          <Text style={s.groupLabel}>─ Bipolar Spectrum</Text>
          <View style={s.chipRow}>
            {(['bipolar_1', 'bipolar_2', 'cyclothymia'] as Diagnosis[]).map((d) => (
              <Chip
                key={d}
                label={diagnosisLabel(d)}
                active={dev.diagnosisOverride === d}
                color="#89B4CC"
                onPress={() => {
                  dev.setDiagnosisOverride(dev.diagnosisOverride === d ? null : d);
                  // Cascade to flag override if not already overriding
                  if (dev.bipolarOverride === null) {
                    // Let it derive from diagnosis — no-op
                  }
                }}
              />
            ))}
          </View>

          <Text style={[s.groupLabel, { marginTop: 10 }]}>─ General Mental Health</Text>
          <View style={s.chipRow}>
            {(['depression', 'anxiety', 'general', 'other', 'unsure'] as Diagnosis[]).map((d) => (
              <Chip
                key={d}
                label={diagnosisLabel(d)}
                active={dev.diagnosisOverride === d}
                color="#A8C5A0"
                onPress={() => {
                  dev.setDiagnosisOverride(dev.diagnosisOverride === d ? null : d);
                }}
              />
            ))}
          </View>

          <TouchableOpacity
            style={s.clearBtn}
            onPress={() => dev.setDiagnosisOverride(null)}
          >
            <Text style={s.clearBtnText}>Clear diagnosis override</Text>
          </TouchableOpacity>
        </View>

        {/* ── Flag impact map ────────────────────────────────────────────── */}
        <SectionLabel text="WHAT CHANGES PER FLAG" />
        <View style={s.card}>
          <Text style={s.cardNote}>
            All screens that branch on the bipolar flag, and how they differ.
          </Text>
          {FLAG_IMPACT_MAP.map((item, i) => (
            <View key={item.screen}>
              {i > 0 && <View style={s.divider} />}
              <Text style={s.impactScreen}>{item.screen}</Text>
              <View style={s.impactRow}>
                <View style={[s.impactPill, { backgroundColor: '#89B4CC15' }]}>
                  <Text style={[s.impactPillLabel, { color: '#89B4CC' }]}>BIPOLAR</Text>
                  <Text style={s.impactText}>{item.bipolar}</Text>
                </View>
                <View style={[s.impactPill, { backgroundColor: '#A8C5A015', marginTop: 4 }]}>
                  <Text style={[s.impactPillLabel, { color: '#A8C5A0' }]}>GENERAL</Text>
                  <Text style={s.impactText}>{item.general}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Reset ─────────────────────────────────────────────────────── */}
        <TouchableOpacity style={s.resetBtn} onPress={dev.resetAll} activeOpacity={0.8}>
          <Text style={s.resetBtnText}>⟳  Reset all overrides</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingBottom: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#F7F3EE',
    borderBottomWidth: 1, borderBottomColor: '#EDE8E0',
  },
  backBtn:   { marginRight: 12, paddingVertical: 4 },
  backArrow: { fontSize: 28, color: '#3D3935', lineHeight: 32 },
  title:     { fontSize: 17, fontWeight: '700', color: '#3D3935' },
  subtitle:  { fontSize: 11, color: '#3D393580', marginTop: 2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', color: '#3D393580',
    marginTop: 20, marginBottom: 8,
  },

  // ── Status card ───────────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#EDE8E0',
    paddingHorizontal: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  statusKey: { fontSize: 11, fontWeight: '700', color: '#3D393560', letterSpacing: 0.5 },
  statusVal: { fontSize: 13, color: '#3D3935', flex: 1, textAlign: 'right' },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },

  // ── Generic card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#EDE8E0',
    padding: 16,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardNote: { fontSize: 12, color: '#3D393570', marginBottom: 12, lineHeight: 17 },
  groupLabel: { fontSize: 11, color: '#3D393555', marginBottom: 8, fontWeight: '600' },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: '#E0DDD8', backgroundColor: '#F7F3EE',
  },
  chipText: { fontSize: 13, color: '#3D393590' },

  // ── Clear button ──────────────────────────────────────────────────────────
  clearBtn: { marginTop: 14, alignSelf: 'flex-start' },
  clearBtnText: { fontSize: 12, color: '#3D393555', textDecorationLine: 'underline' },

  // ── Impact map ────────────────────────────────────────────────────────────
  impactScreen: {
    fontSize: 13, fontWeight: '600', color: '#3D3935',
    marginTop: 12, marginBottom: 6,
  },
  impactRow:      { gap: 4 },
  impactPill:     { borderRadius: 8, padding: 8 },
  impactPillLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  impactText:     { fontSize: 12, color: '#3D3935', lineHeight: 17 },

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetBtn: {
    marginTop: 24, backgroundColor: '#FFF5E6',
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#C9A84C40',
  },
  resetBtnText: { fontSize: 15, fontWeight: '600', color: '#C9A84C' },

  divider: { height: 1, backgroundColor: '#F0EDE8' },
});
