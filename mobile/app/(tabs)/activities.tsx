import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useActivitiesStore } from '../../stores/activities';
import { useAIStore } from '../../stores/ai';
import type { Activity, ActivityCompletion, CycleState } from '../../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};
const CATEGORY_LABELS: Record<string, string> = {
  grounding: 'Grounding', self_esteem: 'Self-Esteem',
  sleep: 'Sleep', forgiveness: 'Forgiveness', reflection: 'Reflection',
};

type Tab = 'all' | 'prescribed' | 'bookmarked';

// ─── Activity Card ─────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  completionCount,
  isBookmarked,
  lastNote,
  onPress,
}: {
  activity: Activity;
  completionCount?: number;
  isBookmarked?: boolean;
  lastNote?: string | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{activity.title}</Text>
          {activity.duration_minutes && (
            <Text style={s.cardMeta}>{activity.duration_minutes} min</Text>
          )}
        </View>
        {isBookmarked && <Text style={s.bookmarkIcon}>🔖</Text>}
      </View>

      {activity.description ? (
        <Text style={s.cardDesc} numberOfLines={2}>{activity.description}</Text>
      ) : null}

      <View style={s.cardFooter}>
        {activity.evidence_label ? (
          <Text style={s.evidenceTag}>{activity.evidence_label}</Text>
        ) : null}
        {completionCount != null && completionCount > 0 && (
          <Text style={s.completionCount}>{completionCount}× done</Text>
        )}
      </View>

      {lastNote ? (
        <Text style={s.lastNote} numberOfLines={1}>"{lastNote}"</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
  const { session } = useAuthStore();
  const today = useTodayStore();
  const store = useActivitiesStore();
  const router = useRouter();
  const userId = session?.user.id;

  const aiStore = useAIStore();

  const [tab, setTab] = useState<Tab>('all');
  const [filterActive, setFilterActive] = useState(true);

  const cycleState: CycleState = today.cycleState ?? 'stable';
  const accentColor = CYCLE_COLORS[cycleState];

  useEffect(() => {
    if (userId) {
      store.load(userId);
      aiStore.loadLatest(userId);
    }
  }, [userId]);

  // ── Derived lists ────────────────────────────────────────────────────────────

  const completionCountMap: Record<string, number> = {};
  const lastNoteMap: Record<string, string | null> = {};
  const bookmarkedIds = new Set<string>();

  store.completions.forEach((c: ActivityCompletion) => {
    if (c.completed_at) {
      completionCountMap[c.activity_id] = (completionCountMap[c.activity_id] ?? 0) + 1;
    }
    if (c.notes) lastNoteMap[c.activity_id] = c.notes;
    if (c.bookmarked) bookmarkedIds.add(c.activity_id);
  });

  const allActivities = store.all.filter((a) => !a.is_workbook_entry || tab === 'all');

  const filteredAll = filterActive
    ? allActivities.filter(
        (a) =>
          a.compatible_states?.includes(cycleState) &&
          !a.restricted_states?.includes(cycleState),
      )
    : allActivities;

  // Group by category
  const grouped: Record<string, Activity[]> = {};
  filteredAll.forEach((a) => {
    const cat = a.category ?? 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const bookmarkedActivities = store.completions
    .filter((c: ActivityCompletion) => c.bookmarked && c.activity)
    .map((c: ActivityCompletion) => ({ completion: c, activity: c.activity! }));

  const navigateToActivity = (activity: Activity) => {
    if (activity.is_workbook_entry) {
      router.push('/workbook');
    } else {
      router.push(`/activity/${activity.id}`);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Activities</Text>
        <View style={[s.cyclePill, { backgroundColor: accentColor + '30' }]}>
          <View style={[s.cycleDot, { backgroundColor: accentColor }]} />
          <Text style={[s.cycleLabel, { color: accentColor }]}>{CYCLE_LABELS[cycleState]}</Text>
        </View>
      </View>

      {/* Inner tabs */}
      <View style={s.tabs}>
        {(['all', 'prescribed', 'bookmarked'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'all' ? 'All' : t === 'prescribed' ? 'Prescribed' : 'Working for Me'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {store.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={accentColor} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── ALL TAB ──────────────────────────────────────────────────────── */}
          {tab === 'all' && (
            <>
              {/* Suggested for this week — from latest AI report */}
              {(() => {
                const suggestions = aiStore.latestReport?.report_json?.activity_suggestions ?? [];
                if (suggestions.length === 0) return null;
                const suggestedActivities = suggestions
                  .map((name) => store.all.find((a) => a.title === name))
                  .filter((a): a is Activity => !!a);
                if (suggestedActivities.length === 0) return null;
                return (
                  <View style={s.suggestedSection}>
                    <Text style={s.sectionLabel}>SUGGESTED FOR THIS WEEK</Text>
                    <Text style={s.suggestedSub}>Based on your recent data</Text>
                    {suggestedActivities.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={s.suggestedCard}
                        onPress={() => navigateToActivity(a)}
                        activeOpacity={0.75}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.suggestedTitle}>{a.title}</Text>
                          {a.duration_minutes && (
                            <Text style={s.suggestedMeta}>{a.duration_minutes} min{a.category ? ` · ${CATEGORY_LABELS[a.category] ?? a.category}` : ''}</Text>
                          )}
                        </View>
                        <Text style={[s.suggestedBadge, { color: accentColor }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              <TouchableOpacity
                style={s.filterRow}
                onPress={() => setFilterActive((v) => !v)}
              >
                <View style={[s.filterDot, filterActive && { backgroundColor: accentColor }]} />
                <Text style={s.filterText}>
                  {filterActive
                    ? `Filtered for ${CYCLE_LABELS[cycleState]}`
                    : 'Showing all activities'}
                </Text>
                <Text style={[s.filterToggle, { color: accentColor }]}>
                  {filterActive ? 'Show all' : 'Filter'}
                </Text>
              </TouchableOpacity>

              {Object.entries(grouped).map(([cat, items]) => (
                <View key={cat}>
                  <Text style={s.sectionLabel}>{CATEGORY_LABELS[cat] ?? cat.toUpperCase()}</Text>
                  {items.map((a) => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      completionCount={completionCountMap[a.id]}
                      isBookmarked={bookmarkedIds.has(a.id)}
                      lastNote={lastNoteMap[a.id]}
                      onPress={() => navigateToActivity(a)}
                    />
                  ))}
                </View>
              ))}

              {filteredAll.length === 0 && (
                <View style={s.empty}>
                  <Text style={s.emptyText}>No activities match your current phase.</Text>
                  <TouchableOpacity onPress={() => setFilterActive(false)}>
                    <Text style={[s.emptyLink, { color: accentColor }]}>Show all activities</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── PRESCRIBED TAB ───────────────────────────────────────────────── */}
          {tab === 'prescribed' && (
            <>
              {store.prescribed.length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyText}>No prescribed activities yet.</Text>
                  <Text style={s.emptySubText}>
                    Connect with a psychiatrist to receive personalised activity prescriptions.
                  </Text>
                </View>
              ) : (
                store.prescribed.map((p) => p.activity && (
                  <View key={p.id} style={s.prescribedCard}>
                    <ActivityCard
                      activity={p.activity}
                      completionCount={completionCountMap[p.activity_id]}
                      onPress={() => navigateToActivity(p.activity!)}
                    />
                    <View style={s.prescribedMeta}>
                      {p.goal && <Text style={s.prescribedGoal}>Goal: {p.goal}</Text>}
                      <View style={s.complianceRow}>
                        <Text style={s.complianceText}>
                          {p.completions_this_week ?? 0}/{p.dosage_per_week ?? '?'}× this week
                        </Text>
                        <View style={s.complianceBar}>
                          <View
                            style={[
                              s.complianceFill,
                              {
                                backgroundColor: accentColor,
                                width: `${Math.min(100, ((p.completions_this_week ?? 0) / (p.dosage_per_week ?? 1)) * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ── WORKING FOR ME TAB ───────────────────────────────────────────── */}
          {tab === 'bookmarked' && (
            <>
              {bookmarkedActivities.length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyText}>No bookmarked activities yet.</Text>
                  <Text style={s.emptySubText}>
                    Tap 🔖 on any activity to save it here.
                  </Text>
                </View>
              ) : (
                bookmarkedActivities.map(({ completion, activity }) => (
                  <ActivityCard
                    key={completion.id}
                    activity={activity}
                    completionCount={completionCountMap[activity.id]}
                    isBookmarked
                    lastNote={lastNoteMap[activity.id]}
                    onPress={() => navigateToActivity(activity)}
                  />
                ))
              )}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3EE' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3 },
  cyclePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20,
  },
  cycleDot: { width: 7, height: 7, borderRadius: 4 },
  cycleLabel: { fontSize: 12, fontWeight: '600' },

  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
    paddingHorizontal: 18,
  },
  tab: { paddingVertical: 10, marginRight: 20 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#A8C5A0' },
  tabText: { fontSize: 13, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  tabTextActive: { opacity: 1, fontWeight: '700', color: '#3D3935' },

  scroll: { paddingHorizontal: 18, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, marginBottom: 8,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0DDD8' },
  filterText: { flex: 1, fontSize: 12, color: '#3D3935', opacity: 0.5 },
  filterToggle: { fontSize: 12, fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#3D3935', opacity: 0.35,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#3D3935' },
  cardMeta: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  bookmarkIcon: { fontSize: 16, marginLeft: 6 },
  cardDesc: { fontSize: 13, color: '#3D3935', opacity: 0.55, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  evidenceTag: { fontSize: 11, color: '#A8C5A0', fontWeight: '500' },
  completionCount: { fontSize: 11, color: '#3D3935', opacity: 0.35 },
  lastNote: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 6, fontStyle: 'italic' },

  prescribedCard: { marginBottom: 8 },
  prescribedMeta: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: -8 },
  prescribedGoal: { fontSize: 12, color: '#3D3935', opacity: 0.55, marginBottom: 8 },
  complianceRow: { gap: 6 },
  complianceText: { fontSize: 11, color: '#3D3935', opacity: 0.4 },
  complianceBar: { height: 4, backgroundColor: '#F0EDE8', borderRadius: 2 },
  complianceFill: { height: 4, borderRadius: 2 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#3D3935', opacity: 0.35, marginBottom: 8 },
  emptySubText: { fontSize: 12, color: '#3D3935', opacity: 0.3, textAlign: 'center', lineHeight: 18 },
  emptyLink: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  suggestedSection: { marginBottom: 8 },
  suggestedSub: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginBottom: 8, marginTop: -6 },
  suggestedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#3D3935', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    borderLeftWidth: 3, borderLeftColor: '#A8C5A0',
  },
  suggestedTitle: { fontSize: 15, fontWeight: '600', color: '#3D3935' },
  suggestedMeta: { fontSize: 12, color: '#3D3935', opacity: 0.4, marginTop: 2 },
  suggestedBadge: { fontSize: 20, opacity: 0.5 },
});
