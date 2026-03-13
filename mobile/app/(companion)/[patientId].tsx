import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../lib/supabase';
import {
  abstractCycleLabel,
  abstractCycleColor,
} from '../../stores/companion';
import type { Companion, CycleState } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientData {
  companion:    Companion;
  patientName:  string | null;
  cycleState:   CycleState | null;
  // per-section data (null = not loaded / not shared)
  medsToday:    { taken: number; total: number } | null;
  sleepHours:   number | null;
  journalPrev:  string | null;  // first 200 chars of most recent entry
  aiSummary:    string | null;
  activitiesCount: number | null;
  nutritionScore:  number | null;
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon, title, children, color = '#A8C5A0',
}: {
  icon: string; title: string; children: React.ReactNode; color?: string;
}) {
  return (
    <View style={[s.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={s.cardHeader}>
        <Text style={s.cardIcon}>{icon}</Text>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompanionPatientView() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [data, setData]         = useState<PatientData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId && patientId) load();
  }, [userId, patientId]);

  async function load(isRefresh = false) {
    if (!userId || !patientId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);

    // 1. Load companion record (share_* flags)
    const { data: companionRow } = await supabase
      .from('companions')
      .select('*')
      .eq('companion_id', userId)
      .eq('patient_id', patientId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!companionRow) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const companion = companionRow as Companion;

    // 2. Load patient profile (always)
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, current_cycle_state')
      .eq('id', patientId)
      .maybeSingle();

    const today = new Date().toISOString().slice(0, 10);

    // 3–7. Load sections in parallel (only if shared)
    const [medsRes, sleepRes, journalRes, aiRes, activitiesRes] = await Promise.all([
      companion.share_medication
        ? supabase.from('medication_logs').select('status').eq('user_id', patientId).eq('log_date', today)
        : Promise.resolve({ data: null }),
      companion.share_sleep
        ? supabase.from('sleep_logs').select('duration_hours').eq('user_id', patientId).order('date', { ascending: false }).limit(1)
        : Promise.resolve({ data: null }),
      companion.share_journal
        ? supabase.from('journal_entries').select('blocks').eq('user_id', patientId).order('entry_date', { ascending: false }).limit(1)
        : Promise.resolve({ data: null }),
      companion.share_ai_report
        ? supabase.from('ai_reports').select('summary').eq('user_id', patientId).order('created_at', { ascending: false }).limit(1)
        : Promise.resolve({ data: null }),
      companion.share_activities
        ? supabase.from('activity_logs').select('id').eq('user_id', patientId).gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()).limit(20)
        : Promise.resolve({ data: null }),
    ]);

    // Parse medication adherence
    let medsToday = null;
    if (companion.share_medication && medsRes.data) {
      const logs = medsRes.data as { status: string }[];
      medsToday = {
        taken: logs.filter((l) => l.status === 'taken').length,
        total: logs.length,
      };
    }

    // Parse sleep
    let sleepHours = null;
    if (companion.share_sleep && sleepRes.data && (sleepRes.data as { duration_hours: number }[]).length > 0) {
      sleepHours = (sleepRes.data as { duration_hours: number }[])[0].duration_hours;
    }

    // Parse journal preview (strip to plain text preview)
    let journalPrev = null;
    if (companion.share_journal && journalRes.data && (journalRes.data as { blocks: string }[]).length > 0) {
      const raw = (journalRes.data as { blocks: string }[])[0].blocks ?? '';
      journalPrev = raw.replace(/<[^>]+>/g, '').slice(0, 200);
    }

    // Parse AI summary
    let aiSummary = null;
    if (companion.share_ai_report && aiRes.data && (aiRes.data as { summary: string }[]).length > 0) {
      aiSummary = (aiRes.data as { summary: string }[])[0].summary ?? null;
    }

    // Parse activity count
    let activitiesCount = null;
    if (companion.share_activities && activitiesRes.data) {
      activitiesCount = (activitiesRes.data as unknown[]).length;
    }

    setData({
      companion,
      patientName:  (profile as Record<string, unknown> | null)?.display_name as string ?? null,
      cycleState:   (profile as Record<string, unknown> | null)?.current_cycle_state as CycleState ?? null,
      medsToday,
      sleepHours,
      journalPrev,
      aiSummary,
      activitiesCount,
      nutritionScore: null, // future
    });

    setLoading(false);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ marginTop: 80 }} color="#A8C5A0" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={s.safe}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <View style={s.emptyState}>
          <Text style={s.emptyText}>Connection not found or no longer active.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { companion, patientName, cycleState, medsToday, sleepHours, journalPrev, aiSummary, activitiesCount } = data;
  const isWellWisher   = companion.role === 'well_wisher';
  const displayName    = patientName ?? 'Your person';
  const roleLabel      = isWellWisher ? 'Well-wisher' : 'Guardian';
  const roleBadgeColor = isWellWisher ? '#C9A84C' : '#A8C5A0';

  // Cycle display
  const cycleLabel = isWellWisher ? abstractCycleLabel(cycleState) : (cycleState ?? 'Unknown');
  const cycleColor = abstractCycleColor(cycleState);

  const hasAnyData = companion.share_cycle_data || companion.share_medication ||
    companion.share_sleep || companion.share_journal || companion.share_ai_report ||
    companion.share_activities;

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#A8C5A0" />}
      >
        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#A8C5A0" />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <View style={[s.roleBadge, { backgroundColor: roleBadgeColor + '20', borderColor: roleBadgeColor + '60' }]}>
            <Text style={[s.roleBadgeText, { color: roleBadgeColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Header */}
        <Text style={s.name}>{displayName}</Text>
        <Text style={s.subtitle}>Pull down to refresh · Read-only view</Text>

        {/* Cycle state — always shown if share_cycle_data */}
        {companion.share_cycle_data && (
          <View style={[s.cycleCard, { backgroundColor: cycleColor + '15', borderColor: cycleColor + '40' }]}>
            <View style={[s.cycleDot, { backgroundColor: cycleColor }]} />
            <View>
              <Text style={[s.cycleLabel, { color: cycleColor }]}>{cycleLabel}</Text>
              {!isWellWisher && cycleState && (
                <Text style={s.cycleSub}>Current cycle state</Text>
              )}
            </View>
          </View>
        )}

        {!hasAnyData && (
          <View style={s.noAccess}>
            <Ionicons name="lock-closed-outline" size={28} color="#E0DDD8" />
            <Text style={s.noAccessText}>
              {displayName} hasn't shared any sections yet.
            </Text>
          </View>
        )}

        {/* Medications */}
        {companion.share_medication && medsToday !== null && (
          <SectionCard icon="💊" title="Medications today" color="#89B4CC">
            {medsToday.total === 0 ? (
              <Text style={s.cardValue}>No medications scheduled</Text>
            ) : (
              <>
                <Text style={s.cardValue}>
                  {medsToday.taken} of {medsToday.total} taken
                </Text>
                <View style={s.adherenceBar}>
                  <View
                    style={[
                      s.adherenceFill,
                      { width: `${medsToday.total > 0 ? (medsToday.taken / medsToday.total) * 100 : 0}%` as `${number}%` },
                    ]}
                  />
                </View>
              </>
            )}
          </SectionCard>
        )}

        {/* Sleep */}
        {companion.share_sleep && (
          <SectionCard icon="🌙" title="Last night's sleep" color="#C4A0B0">
            {sleepHours !== null ? (
              <Text style={s.cardValue}>{sleepHours.toFixed(1)} hours</Text>
            ) : (
              <Text style={s.cardEmpty}>No sleep logged yet</Text>
            )}
          </SectionCard>
        )}

        {/* Activities */}
        {companion.share_activities && activitiesCount !== null && (
          <SectionCard icon="🏃" title="Activities this week" color="#A8C5A0">
            <Text style={s.cardValue}>{activitiesCount} completed</Text>
          </SectionCard>
        )}

        {/* AI Report */}
        {companion.share_ai_report && (
          <SectionCard icon="✦" title="AI wellness summary" color="#C9A84C">
            {aiSummary ? (
              <Text style={s.cardParagraph}>{aiSummary}</Text>
            ) : (
              <Text style={s.cardEmpty}>No report generated yet</Text>
            )}
          </SectionCard>
        )}

        {/* Journal — guardians only unless explicitly shared with well-wishers */}
        {companion.share_journal && (
          <SectionCard icon="📖" title="Recent journal entry" color="#89B4CC">
            {journalPrev ? (
              <>
                <Text style={s.cardParagraph} numberOfLines={4}>{journalPrev}</Text>
                <Text style={s.journalNote}>Read-only · private to you</Text>
              </>
            ) : (
              <Text style={s.cardEmpty}>No entries yet</Text>
            )}
          </SectionCard>
        )}

        {/* Privacy note */}
        <View style={s.privacyNote}>
          <Ionicons name="lock-closed-outline" size={12} color="#3D393560" />
          <Text style={s.privacyText}>
            You only see what {displayName} has chosen to share. This view is read-only.
            {isWellWisher && '\nClinical details are intentionally abstracted for your relationship.'}
          </Text>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FAFAF8' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  nav:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  backText:    { fontSize: 15, color: '#A8C5A0', fontWeight: '600' },
  roleBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  name:     { fontSize: 26, fontWeight: '800', color: '#3D3935', letterSpacing: -0.4, marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginBottom: 20 },

  cycleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  cycleDot:   { width: 12, height: 12, borderRadius: 6 },
  cycleLabel: { fontSize: 18, fontWeight: '700' },
  cycleSub:   { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingBottom: 8 },
  cardIcon:   { fontSize: 16 },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: '#3D3935', opacity: 0.6 },
  cardBody:   { paddingHorizontal: 14, paddingBottom: 14 },
  cardValue:  { fontSize: 22, fontWeight: '700', color: '#3D3935' },
  cardParagraph: { fontSize: 14, color: '#3D3935', opacity: 0.7, lineHeight: 21 },
  cardEmpty:  { fontSize: 14, color: '#3D3935', opacity: 0.3, fontStyle: 'italic' },

  adherenceBar: { height: 6, backgroundColor: '#F0EDE8', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  adherenceFill: { height: '100%', backgroundColor: '#A8C5A0', borderRadius: 3 },

  journalNote: { fontSize: 11, color: '#3D3935', opacity: 0.3, marginTop: 6, fontStyle: 'italic' },

  noAccess: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  noAccessText: { fontSize: 14, color: '#3D3935', opacity: 0.35, textAlign: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText:  { fontSize: 14, color: '#3D3935', opacity: 0.4, textAlign: 'center' },

  privacyNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginTop: 8, backgroundColor: '#F7F3EE', borderRadius: 12, padding: 12,
  },
  privacyText: { flex: 1, fontSize: 11, color: '#3D3935', opacity: 0.45, lineHeight: 17 },
});
