import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCalendarStore } from '../../stores/calendar';
import { useAuthStore } from '../../stores/auth';
import { useAmbientTheme } from '../../stores/ambient';
import { useTasksStore } from '../../stores/tasks';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD = 16;
const DAY_GAP = 4;
const DAY_SIZE = Math.floor((SCREEN_W - GRID_PAD * 2 - DAY_GAP * 6) / 7);

const CYCLE_COLORS: Record<string, string> = {
  stable:     '#A8C5A0',
  manic:      '#89B4CC',
  depressive: '#C4A0B0',
  mixed:      '#E8DCC8',
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useAmbientTheme();
  const { session } = useAuthStore();
  const user = session?.user;
  const { year, month, days, isLoading, setMonth, loadMonth } = useCalendarStore();
  const tasksStore = useTasksStore();

  useEffect(() => {
    if (!user?.id) return;
    loadMonth(user.id);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    tasksStore.loadRange(user.id, from, to);
  }, [year, month, user?.id]);

  function prevMonth() {
    if (month === 1) setMonth(year - 1, 12);
    else setMonth(year, month - 1);
  }
  function nextMonth() {
    if (month === 12) setMonth(year + 1, 1);
    else setMonth(year, month + 1);
  }

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const lastDay = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Month navigation ─────────────────────────────────────────────── */}
        <View style={s.monthNav}>
          <TouchableOpacity
            onPress={prevMonth}
            style={[s.navBtn, { backgroundColor: theme.accent + '18' }]}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={18} color={theme.accent} />
          </TouchableOpacity>
          <View style={s.monthTitleWrap}>
            <Text style={[s.monthTitle, { color: theme.textPrimary }]}>{MONTH_NAMES[month - 1]}</Text>
            <Text style={[s.monthYear, { color: theme.textSecondary }]}>{year}</Text>
          </View>
          <TouchableOpacity
            onPress={nextMonth}
            style={[s.navBtn, { backgroundColor: theme.accent + '18' }]}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week labels ────────────────────────────────────────────── */}
        <View style={s.dayLabels}>
          {DAY_LABELS.map((l, i) => (
            <Text key={i} style={[s.dayLabelText, { color: theme.textSecondary }]}>{l}</Text>
          ))}
        </View>

        {/* ── Separator ────────────────────────────────────────────────────── */}
        <View style={[s.divider, { backgroundColor: theme.accent + '20' }]} />

        {/* ── Calendar grid ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={theme.accent} />
        ) : (
          <View style={s.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={idx} style={s.emptyCell} />;
              const date = isoDate(year, month, day);
              const data = days[date];
              const cycleColor = data?.cycleState ? CYCLE_COLORS[data.cycleState] : null;
              const isToday = date === today;
              const hasData = !!(data?.cycleState || data?.hasJournal ||
                data?.activityNames?.length || data?.hasWorkbook ||
                data?.medicationStatus || data?.alcohol || data?.cannabis);
              const dayTasks = tasksStore.byDate[date] ?? [];
              const tasksDone = dayTasks.filter((t) => t.completed_at !== null).length;
              const tasksTotal = dayTasks.length;
              const allDone = tasksTotal > 0 && tasksDone === tasksTotal;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.dayCell,
                    cycleColor
                      ? { backgroundColor: cycleColor + '22', borderColor: cycleColor + '50' }
                      : hasData
                        ? { backgroundColor: '#F7F3EE', borderColor: '#E8E4DF' }
                        : s.dayCellEmpty,
                    isToday && { borderColor: theme.accent, borderWidth: 2, shadowColor: theme.accent, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
                  ]}
                  onPress={() => router.push(`/day/${date}`)}
                  activeOpacity={0.65}
                >
                  {/* Cycle state — rounded square bar at top of cell */}
                  {cycleColor && (
                    <View style={[s.cycleBar, { backgroundColor: cycleColor }]} />
                  )}
                  <Text style={[
                    s.dayNum,
                    { color: isToday ? theme.accent : theme.textPrimary },
                    isToday && s.dayNumToday,
                  ]}>
                    {day}
                  </Text>

                  {tasksTotal > 0 && (
                    <View style={[s.taskBadge, { backgroundColor: allDone ? '#A8C5A028' : '#C9A84C20' }]}>
                      <Text style={[s.taskBadgeText, { color: allDone ? '#A8C5A0' : '#C9A84C' }]}>
                        {tasksDone}/{tasksTotal}
                      </Text>
                    </View>
                  )}

                  <View style={s.dotRow}>
                    {data?.hasJournal && <View style={[s.dot, { backgroundColor: '#89B4CC' }]} />}
                    {data?.activityNames?.length > 0 && <View style={[s.dot, { backgroundColor: '#A8C5A0' }]} />}
                    {data?.medicationStatus === 'taken'    && <View style={[s.dot, { backgroundColor: '#A8C5A0' }]} />}
                    {data?.medicationStatus === 'skipped'  && <View style={[s.dot, { backgroundColor: '#C4A0B0' }]} />}
                    {data?.medicationStatus === 'partial'  && <View style={[s.dot, { backgroundColor: '#C9A84C' }]} />}
                    {(data?.alcohol || data?.cannabis)     && <View style={[s.dot, { backgroundColor: '#D4826A' }]} />}
                    {data?.hasWorkbook && <View style={[s.dot, { backgroundColor: '#C9A84C' }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Tap hint ─────────────────────────────────────────────────────── */}
        <Text style={[s.tapHint, { color: theme.textSecondary }]}>Tap any day to view details</Text>

        {/* ── Legend ───────────────────────────────────────────────────────── */}
        <View style={s.legend}>
          <Text style={[s.legendHeading, { color: theme.textSecondary }]}>CYCLE STATE</Text>
          <View style={s.legendRow}>
            {Object.entries(CYCLE_COLORS).map(([state, color]) => (
              <View key={state} style={s.legendItem}>
                <View style={[s.legendSwatch, { backgroundColor: color }]} />
                <Text style={[s.legendText, { color: theme.textSecondary }]}>{state}</Text>
              </View>
            ))}
          </View>

          <View style={[s.legendDivider, { backgroundColor: theme.accent + '20' }]} />

          <Text style={[s.legendHeading, { color: theme.textSecondary }]}>ACTIVITY DOTS</Text>
          <View style={s.legendRow}>
            {[
              { color: '#89B4CC', label: 'Journal' },
              { color: '#A8C5A0', label: 'Activity / Meds taken' },
              { color: '#C4A0B0', label: 'Meds skipped' },
              { color: '#C9A84C', label: 'Partial / Workbook' },
              { color: '#D4826A', label: 'Substance' },
            ].map(({ color, label }) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={[s.legendText, { color: theme.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },

  // Header — no border box
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitleWrap: { alignItems: 'center' },
  monthTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  monthYear: { fontSize: 12, marginTop: 1, opacity: 0.6 },

  // Day labels — plain text row
  dayLabels: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PAD,
    paddingBottom: 8,
  },
  dayLabelText: {
    width: DAY_SIZE + DAY_GAP * (6 / 7),
    textAlign: 'center',
    fontSize: 10, fontWeight: '700', letterSpacing: 0.3,
    opacity: 0.5,
  },

  divider: { height: 1, marginHorizontal: 16, marginBottom: 10 },

  // Grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: GRID_PAD, gap: DAY_GAP,
  },
  emptyCell: { width: DAY_SIZE, height: DAY_SIZE + 8 },
  dayCell: {
    width: DAY_SIZE, height: DAY_SIZE + 8,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
    paddingVertical: 4,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent', borderColor: 'transparent',
  },
  dayNum: { fontSize: 14, fontWeight: '600' },
  dayNumToday: { fontWeight: '900' },
  cycleBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 4, borderTopLeftRadius: 13, borderTopRightRadius: 13,
  },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  taskBadge: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 0.5, marginTop: 1 },
  taskBadgeText: { fontSize: 7, fontWeight: '800' },

  // Tap hint
  tapHint: {
    textAlign: 'center', fontSize: 11,
    fontStyle: 'italic', marginTop: 16, marginBottom: 4, opacity: 0.4,
  },

  // Legend — no border box, just clean sections
  legend: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FAFAF8', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 10,
  },
  legendHeading: {
    fontSize: 10, fontWeight: '800',
    letterSpacing: 0.8, opacity: 0.4,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, textTransform: 'capitalize', opacity: 0.7 },
  legendDivider: { height: 1, marginVertical: 2 },
});
