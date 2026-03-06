import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/auth';
import { useAIStore } from '../../../stores/ai';
import { ExportSheet } from '../../../components/ui/ExportSheet';
import type { ReportJSON } from '../../../stores/ai';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_DOTS: Record<string, string> = {
  stable: '🟢', manic: '🔵', depressive: '🟣', mixed: '🟡',
};
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatPeriod(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const e = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
}

// ─── Report Section ───────────────────────────────────────────────────────────

function ReportSection({
  icon, title, children, highlight,
}: { icon: string; title: string; children: React.ReactNode; highlight?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={[rs.card, highlight && rs.cardHighlight]}>
      <TouchableOpacity style={rs.header} onPress={() => setOpen((v) => !v)}>
        <Text style={rs.icon}>{icon}</Text>
        <Text style={[rs.title, highlight && rs.titleHighlight]}>{title}</Text>
        <Text style={rs.chevron}>{open ? '▾' : '›'}</Text>
      </TouchableOpacity>
      {open && <View style={rs.body}>{children}</View>}
    </View>
  );
}

const rs = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 10,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHighlight: { borderWidth: 1.5, borderColor: '#C9A84C40' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon: { fontSize: 18, marginRight: 10 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#3D3935' },
  titleHighlight: { color: '#C9A84C' },
  chevron: { fontSize: 16, color: '#3D3935', opacity: 0.3 },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIReportScreen() {
  const { session } = useAuthStore();
  const store = useAIStore();
  const router = useRouter();
  const [showExport, setShowExport] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) store.loadLatest(userId);
  }, [userId]);

  async function handleGenerate() {
    if (!userId) return;
    await store.generate(userId);
  }

  const report = store.latestReport;
  const rj: ReportJSON | null = report?.report_json ?? null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>←  Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>AI Wellness Report</Text>

        {store.isLoading ? (
          <View style={s.center}><ActivityIndicator color="#A8C5A0" /></View>
        ) : !report || !rj ? (
          /* ── Empty state ── */
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No report yet</Text>
            <Text style={s.emptyBody}>
              Your first weekly report analyses the last 7 days of mood, cycle, activity,
              and substance data — with zero data retention on Groq's side.
            </Text>
            <TouchableOpacity
              style={[s.generateBtn, store.isGenerating && s.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={store.isGenerating}
            >
              {store.isGenerating ? (
                <>
                  <ActivityIndicator color="#F7F3EE" size="small" style={{ marginRight: 8 }} />
                  <Text style={s.generateBtnText}>Analysing your data…</Text>
                </>
              ) : (
                <Text style={s.generateBtnText}>Generate weekly report</Text>
              )}
            </TouchableOpacity>
            {store.error && (
              <Text style={s.errorText}>{store.error}</Text>
            )}
          </View>
        ) : (
          /* ── Report ── */
          <>
            <View style={s.periodRow}>
              <Text style={s.period}>
                {formatPeriod(report.period_start, report.period_end)}
              </Text>
              <TouchableOpacity style={s.exportBtn} onPress={() => setShowExport(true)}>
                <Text style={s.exportBtnText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <ReportSection icon="✨" title="Summary">
              <Text style={s.bodyText}>{rj.summary}</Text>
            </ReportSection>

            {/* Cycle overview */}
            <ReportSection icon="📊" title="Cycle Overview">
              <View style={s.dotsRow}>
                {rj.cycle_overview.days.map((d, i) => (
                  <View key={d.date} style={s.dayDot}>
                    <Text style={s.dayDotEmoji}>{CYCLE_DOTS[d.state] ?? '⚪'}</Text>
                    <Text style={s.dayLabel}>{DAY_LABELS[i % 7]}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.insightText}>{rj.cycle_overview.insight}</Text>
            </ReportSection>

            {/* Early warning flags — highlighted in gold */}
            {rj.early_warning_flags.length > 0 && (
              <ReportSection icon="⚠️" title="Early Warning Flags" highlight>
                <Text style={s.flagNote}>
                  Based on your personal relapse signatures — informational only.
                </Text>
                {rj.early_warning_flags.map((flag, i) => (
                  <Text key={i} style={s.flagItem}>·  {flag}</Text>
                ))}
              </ReportSection>
            )}

            {/* Mood triggers */}
            {rj.top_mood_triggers.length > 0 && (
              <ReportSection icon="🧭" title="Mood Patterns">
                <Text style={s.captionText}>Patterns noticed — not proven causes.</Text>
                {rj.top_mood_triggers.map((t, i) => (
                  <Text key={i} style={s.listItem}>·  {t}</Text>
                ))}
              </ReportSection>
            )}

            {/* Activities */}
            {rj.activities_completed.length > 0 && (
              <ReportSection icon="🌿" title="Activities Completed">
                {rj.activities_completed.map((a, i) => (
                  <Text key={i} style={s.listItem}>✓  {a}</Text>
                ))}
              </ReportSection>
            )}

            {/* Sleep */}
            {rj.sleep_correlation && (
              <ReportSection icon="😴" title="Sleep">
                <Text style={s.bodyText}>{rj.sleep_correlation}</Text>
              </ReportSection>
            )}

            {/* Substances */}
            {rj.substances && (
              <ReportSection icon="🍃" title="Substances">
                <Text style={s.bodyText}>{rj.substances}</Text>
              </ReportSection>
            )}

            {/* Medication */}
            {rj.medication_adherence && (
              <ReportSection icon="💊" title="Medication">
                <Text style={s.bodyText}>{rj.medication_adherence}</Text>
              </ReportSection>
            )}

            {/* Nutrition */}
            {rj.nutrition_mood && (
              <ReportSection icon="🥗" title="Nutrition & Mood">
                <Text style={s.bodyText}>{rj.nutrition_mood}</Text>
              </ReportSection>
            )}

            {/* Regenerate */}
            <TouchableOpacity
              style={[s.regenBtn, store.isGenerating && s.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={store.isGenerating}
            >
              <Text style={s.regenBtnText}>
                {store.isGenerating ? 'Generating…' : '↻  Generate new report'}
              </Text>
            </TouchableOpacity>
            {store.error && <Text style={s.errorText}>{store.error}</Text>}

            <View style={s.privacyNote}>
              <Text style={s.privacyText}>
                🔒  Zero data retention — Groq does not store your data. Raw journal text is never
                sent. All data is anonymised before analysis.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {report && userId && (
        <ExportSheet
          visible={showExport}
          onClose={() => setShowExport(false)}
          userId={userId}
          reportId={report.id}
          period={formatPeriod(report.period_start, report.period_end)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },
  center: { paddingVertical: 60, alignItems: 'center' },

  nav: { paddingVertical: 8 },
  backBtn: { paddingVertical: 8, paddingRight: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },

  title: { fontSize: 24, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3, marginBottom: 16 },

  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  period: { fontSize: 13, color: '#3D3935', opacity: 0.45, fontWeight: '500' },
  exportBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#A8C5A0' },
  exportBtnText: { fontSize: 12, color: '#A8C5A0', fontWeight: '600' },

  bodyText: { fontSize: 14, color: '#3D3935', opacity: 0.7, lineHeight: 21 },
  captionText: { fontSize: 12, color: '#3D3935', opacity: 0.35, marginBottom: 8, fontStyle: 'italic' },
  listItem: { fontSize: 14, color: '#3D3935', opacity: 0.65, marginBottom: 4, lineHeight: 20 },
  insightText: { fontSize: 13, color: '#3D3935', opacity: 0.55, marginTop: 10, lineHeight: 19, fontStyle: 'italic' },

  dotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { alignItems: 'center', gap: 4 },
  dayDotEmoji: { fontSize: 18 },
  dayLabel: { fontSize: 10, color: '#3D3935', opacity: 0.4 },

  flagNote: { fontSize: 12, color: '#C9A84C', opacity: 0.7, marginBottom: 8, fontStyle: 'italic' },
  flagItem: { fontSize: 14, color: '#C9A84C', marginBottom: 4, lineHeight: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#3D3935', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#3D3935', opacity: 0.45, lineHeight: 21, textAlign: 'center', marginBottom: 24 },

  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#A8C5A0', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: 15, fontWeight: '600', color: '#F7F3EE' },
  errorText: { fontSize: 13, color: '#C4A0B0', marginTop: 10, textAlign: 'center' },

  regenBtn: {
    borderWidth: 1.5, borderColor: '#A8C5A0', borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', marginBottom: 12, marginTop: 4,
  },
  regenBtnText: { fontSize: 13, color: '#A8C5A0', fontWeight: '600' },

  privacyNote: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 4 },
  privacyText: { fontSize: 12, color: '#3D3935', opacity: 0.4, lineHeight: 18 },
});
