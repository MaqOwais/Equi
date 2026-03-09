import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore } from '../../stores/calendar';
import { useAuthStore } from '../../stores/auth';
import { callGroq } from '../../lib/groq';
import type { DayData } from '../../stores/calendar';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<string, string> = {
  stable:     '#A8C5A0',
  manic:      '#89B4CC',
  depressive: '#C4A0B0',
  mixed:      '#E8DCC8',
};

const NUTRITION_LABELS: Record<string, { label: string; icon: string }> = {
  anti_inflammatory: { label: 'Anti-inflammatory',  icon: '🫐' },
  whole_grains:      { label: 'Whole Grains',        icon: '🌾' },
  lean_protein:      { label: 'Lean Protein',        icon: '🥚' },
  healthy_fats:      { label: 'Healthy Fats',        icon: '🥑' },
  fermented:         { label: 'Fermented / Gut',     icon: '🥛' },
  caffeine:          { label: 'Caffeine',             icon: '☕' },
  ultra_processed:   { label: 'Ultra-Processed',     icon: '🍟' },
  sugar_heavy:       { label: 'Sugar-Heavy',         icon: '🍬' },
  alcohol:           { label: 'Alcohol (diet log)',  icon: '🍷' },
  hydration:         { label: 'Hydration',           icon: '💧' },
  lithium_interaction: { label: 'Lithium-Watch',     icon: '⚠️' },
};

function formatFullDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getWeekStart(date: string) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getTime() + diff * 86400000).toISOString().split('T')[0];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const user = session?.user;
  const { days, isLoading, loadMonth, buildWeekPrompt, year, month, setMonth } = useCalendarStore();

  const [journalExpanded, setJournalExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Ensure the right month is loaded
  useEffect(() => {
    if (!date || !user?.id) return;
    const [y, m] = date.split('-').map(Number);
    if (y !== year || m !== month) setMonth(y, m);
  }, [date]);

  useEffect(() => {
    if (user?.id) loadMonth(user.id);
  }, [year, month, user?.id]);

  const data: DayData | null = date ? (days[date] ?? null) : null;
  const cycleColor = data?.cycleState ? CYCLE_COLORS[data.cycleState] : '#A8C5A0';

  async function handleAiSummary() {
    if (!date) return;
    const prompt = buildWeekPrompt(getWeekStart(date));
    setAiLoading(true);
    setAiError(null);
    setAiText(null);
    setShowAiModal(true);
    try {
      const result = await callGroq([
        {
          role: 'system',
          content:
            'You are a warm, supportive clinical wellness assistant for a bipolar disorder monitoring app. Be non-judgmental, careful, and concise. Never diagnose.',
        },
        { role: 'user', content: prompt },
      ]);
      setAiText(result);
    } catch (e: any) {
      setAiError(e.message ?? 'Something went wrong');
    }
    setAiLoading(false);
  }

  // Early return — TypeScript narrows `data` to DayData after this point
  if (isLoading || !data) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[s.header, { borderBottomColor: '#A8C5A044' }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#A8C5A0" />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.headerDate}>{date ? formatFullDate(date) : '—'}</Text>
          </View>
        </View>
        <View style={s.loadingBox}>
          <ActivityIndicator color="#A8C5A0" size="large" />
          <Text style={s.loadingText}>Loading day…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: cycleColor + '44' }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={cycleColor} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerDate}>{date ? formatFullDate(date) : '—'}</Text>
          {data.cycleState && (
            <View style={[s.cycleChip, { backgroundColor: cycleColor + '22', borderColor: cycleColor + '55' }]}>
              <View style={[s.cycleDot, { backgroundColor: cycleColor }]} />
              <Text style={[s.cycleChipText, { color: cycleColor }]}>
                {data.cycleState} · {data.cycleIntensity ?? '—'}/10
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Cycle & Mood ── */}
          {(data.cycleState || data.moodScore !== null) && (
            <SectionCard title="Mental State" icon="pulse-outline" color={cycleColor}>
              {data.cycleState && (
                <>
                  <DataRow label="Cycle state" value={data.cycleState} capitalize />
                  <DataRow label="Intensity" value={`${data.cycleIntensity ?? '—'} / 10`} />
                  {data.cycleSymptoms.length > 0 && (
                    <DataRow label="Symptoms" value={data.cycleSymptoms.join(', ')} />
                  )}
                  {data.cycleNotes && (
                    <DataRow label="Notes" value={data.cycleNotes} />
                  )}
                </>
              )}
              {data.moodScore !== null && (
                <DataRow label="Mood score" value={`${data.moodScore} / 10`} accent="#C9A84C" />
              )}
            </SectionCard>
          )}

          {/* ── Sleep ── */}
          {data.sleepDuration !== null && (
            <SectionCard title="Sleep" icon="moon-outline" color="#89B4CC">
              <DataRow label="Duration" value={`${(data.sleepDuration / 60).toFixed(1)} hours`} />
              {data.sleepQuality !== null && (
                <DataRow label="Quality" value={`${data.sleepQuality} / 10`} />
              )}
            </SectionCard>
          )}

          {/* ── Medication ── */}
          {data.medicationStatus && (
            <SectionCard title="Medication" icon="medkit-outline" color="#C4A0B0">
              <DataRow label="Status" value={data.medicationStatus} capitalize
                accent={data.medicationStatus === 'taken' ? '#A8C5A0' : data.medicationStatus === 'skipped' ? '#C4A0B0' : undefined}
              />
              {data.medicationSkipReason && (
                <DataRow label="Skip reason" value={data.medicationSkipReason} />
              )}
            </SectionCard>
          )}

          {/* ── Activities ── */}
          {data.activityNames.length > 0 && (
            <SectionCard title="Activities" icon="leaf-outline" color="#A8C5A0">
              {data.activityNames.map((name, i) => (
                <View key={i} style={s.activityRow}>
                  <View style={[s.activityBullet, { backgroundColor: '#A8C5A022' }]}>
                    <Text style={s.activityBulletText}>{i + 1}</Text>
                  </View>
                  <Text style={s.activityName}>{name}</Text>
                </View>
              ))}
            </SectionCard>
          )}

          {/* ── Journal ── */}
          {data.hasJournal && data.journalText && (
            <SectionCard title="Journal" icon="book-outline" color="#89B4CC"
              badge="Private · not shared with AI"
            >
              <Text style={s.journalBody}>
                {journalExpanded || data.journalText.length <= 300
                  ? data.journalText
                  : data.journalText.slice(0, 300) + '…'}
              </Text>
              {data.journalText.length > 300 && (
                <TouchableOpacity
                  onPress={() => setJournalExpanded((e) => !e)}
                  style={s.expandBtn}
                >
                  <Text style={s.expandBtnText}>
                    {journalExpanded ? 'Show less' : 'Read full entry'}
                  </Text>
                  <Ionicons
                    name={journalExpanded ? 'chevron-up' : 'chevron-down'}
                    size={13} color="#89B4CC"
                  />
                </TouchableOpacity>
              )}
            </SectionCard>
          )}

          {/* ── Nutrition ── */}
          {data.nutritionCategories &&
            Object.values(data.nutritionCategories).some((v) => v > 0) && (
            <SectionCard title="Nutrition" icon="nutrition-outline" color="#C9A84C">
              {Object.entries(data.nutritionCategories)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => {
                  const meta = NUTRITION_LABELS[key];
                  return (
                    <View key={key} style={s.nutritionRow}>
                      <Text style={s.nutritionIcon}>{meta?.icon ?? '🍽️'}</Text>
                      <Text style={s.nutritionLabel}>{meta?.label ?? key}</Text>
                      <View style={s.servingChip}>
                        <Text style={s.servingText}>{count}×</Text>
                      </View>
                    </View>
                  );
                })}
            </SectionCard>
          )}

          {/* ── Substances ── */}
          {(data.alcohol !== null || data.cannabis !== null) && (
            <SectionCard title="Substances" icon="alert-circle-outline" color="#E8B87A">
              {data.alcohol !== null && (
                <DataRow
                  label="Alcohol"
                  value={data.alcohol ? 'Yes' : 'No'}
                  accent={data.alcohol ? '#C4A0B0' : '#A8C5A0'}
                />
              )}
              {data.cannabis !== null && (
                <DataRow
                  label="Cannabis"
                  value={data.cannabis ? 'Yes' : 'No'}
                  accent={data.cannabis ? '#C4A0B0' : '#A8C5A0'}
                />
              )}
            </SectionCard>
          )}

          {/* ── Social Rhythm ── */}
          {data.socialRhythmScore !== null && (
            <SectionCard title="Social Rhythm" icon="people-outline" color="#C4A0B0">
              <DataRow label="Score" value={`${data.socialRhythmScore} / 10`} />
              {data.socialAnchorsHit !== null && data.socialAnchorsTotal !== null && (
                <DataRow
                  label="Anchors completed"
                  value={`${data.socialAnchorsHit} of ${data.socialAnchorsTotal}`}
                />
              )}
            </SectionCard>
          )}

          {/* Empty state */}
          {!data.cycleState && data.moodScore === null && !data.hasJournal &&
            data.sleepDuration === null && !data.medicationStatus &&
            data.activityNames.length === 0 && !data.nutritionCategories &&
            data.alcohol === null && data.socialRhythmScore === null && (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🌿</Text>
              <Text style={s.emptyTitle}>Nothing logged yet</Text>
              <Text style={s.emptySubtitle}>
                Data from your journal, tracker, activities, and nutrition will appear here.
              </Text>
            </View>
          )}

          {/* ── AI Week Summary ── */}
          <View style={s.aiSection}>
            <TouchableOpacity style={s.aiBtn} onPress={handleAiSummary}>
              <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
              <Text style={s.aiBtnText}>Ask AI about this week</Text>
            </TouchableOpacity>
            <Text style={s.aiNote}>
              Analyses the 7-day window around this date. Journal text is never included.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

      {/* AI Modal */}
      <Modal visible={showAiModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Weekly AI Summary</Text>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Ionicons name="close" size={22} color="#3D3935" />
              </TouchableOpacity>
            </View>
            {aiLoading ? (
              <View style={s.aiLoadingBox}>
                <ActivityIndicator color="#A8C5A0" size="large" />
                <Text style={s.aiLoadingText}>Analysing your week…</Text>
              </View>
            ) : aiError ? (
              <Text style={s.aiErrorText}>{aiError}</Text>
            ) : (
              <ScrollView style={s.aiScroll} showsVerticalScrollIndicator={false}>
                <Text style={s.aiBodyText}>{aiText}</Text>
                <Text style={s.aiDisclaimer}>
                  AI-generated insights — not medical advice. Your data is not stored by the AI
                  model. Journal text is never shared.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title, icon, color, badge, children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[sc.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={sc.cardHeader}>
        <View style={[sc.iconBox, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={[sc.title, { color }]}>{title}</Text>
        {badge && <Text style={sc.badge}>{badge}</Text>}
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

function DataRow({
  label, value, capitalize, accent,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  accent?: string;
}) {
  return (
    <View style={sc.row}>
      <Text style={sc.rowLabel}>{label}</Text>
      <Text style={[sc.rowValue, capitalize && { textTransform: 'capitalize' }, accent && { color: accent }]}>
        {value}
      </Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconBox: {
    width: 26, height: 26, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  badge: {
    marginLeft: 'auto',
    fontSize: 10,
    color: '#3D393555',
    fontStyle: 'italic',
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#3D393566',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: '#3D3935',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F7F3EE',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  headerText: { flex: 1, gap: 6 },
  headerDate: {
    fontSize: 18, fontWeight: '700', color: '#3D3935', letterSpacing: -0.2,
  },
  cycleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  cycleDot: { width: 7, height: 7, borderRadius: 3.5 },
  cycleChipText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  loadingBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 14, color: '#3D393599', fontStyle: 'italic' },

  // Activities
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2,
  },
  activityBullet: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  activityBulletText: { fontSize: 11, fontWeight: '700', color: '#A8C5A0' },
  activityName: { fontSize: 14, color: '#3D3935', fontWeight: '500', flex: 1 },

  // Journal
  journalBody: {
    fontSize: 14, color: '#3D3935', lineHeight: 22, fontStyle: 'italic',
  },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, alignSelf: 'flex-start',
  },
  expandBtnText: { fontSize: 12, color: '#89B4CC', fontWeight: '600' },

  // Nutrition
  nutritionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3,
  },
  nutritionIcon: { fontSize: 17, width: 24 },
  nutritionLabel: { fontSize: 13, color: '#3D3935', flex: 1 },
  servingChip: {
    backgroundColor: '#C9A84C22', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  servingText: { fontSize: 12, fontWeight: '700', color: '#C9A84C' },

  // Empty state
  emptyBox: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#3D3935', marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13, color: '#3D393566', textAlign: 'center', lineHeight: 19,
  },

  // AI section
  aiSection: { marginHorizontal: 16, marginTop: 8, gap: 8 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#A8C5A0',
    borderRadius: 14, paddingVertical: 14,
  },
  aiBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  aiNote: {
    fontSize: 11, color: '#3D393566', textAlign: 'center', fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#00000044', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#3D3935' },
  aiLoadingBox: { alignItems: 'center', padding: 40, gap: 12 },
  aiLoadingText: { fontSize: 14, color: '#3D393599', fontStyle: 'italic' },
  aiErrorText: { color: '#CC5555', padding: 20, fontSize: 14 },
  aiScroll: { padding: 20 },
  aiBodyText: { fontSize: 15, color: '#3D3935', lineHeight: 24 },
  aiDisclaimer: {
    marginTop: 20, fontSize: 11, color: '#3D393566',
    fontStyle: 'italic', lineHeight: 16,
  },
});
