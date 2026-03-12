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
const DAY_SIZE = Math.floor((SCREEN_W - 32) / 7);

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
const DAY_LABELS = ['S','M','T','W','T','F','S'];

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
    // Load tasks for the visible month range
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
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

        {/* Month navigation */}
        <View style={[s.monthNav, theme.cardSurface]}>
          <TouchableOpacity onPress={prevMonth} style={[s.navBtn, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name="chevron-back" size={18} color={theme.accent} />
          </TouchableOpacity>
          <View style={s.monthTitleWrap}>
            <Text style={[s.monthTitle, { color: theme.textPrimary }]}>{MONTH_NAMES[month - 1]}</Text>
            <Text style={[s.monthYear, { color: theme.textSecondary }]}>{year}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={[s.navBtn, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name="chevron-forward" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={[s.dayLabels, { backgroundColor: theme.accentBg, borderRadius: 12, marginHorizontal: 16, marginBottom: 6 }]}>
          {DAY_LABELS.map((l, i) => (
            <Text key={i} style={[s.dayLabelText, { color: theme.accent }]}>{l}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color="#A8C5A0" />
        ) : (
          <View style={s.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={idx} style={s.emptyCell} />;
              const date = isoDate(year, month, day);
              const data = days[date];
              const cycleColor = data?.cycleState ? CYCLE_COLORS[data.cycleState] : null;
              const isToday = date === today;
              const hasData = !!(data?.cycleState || data?.hasJournal ||
                data?.activityNames?.length || data?.hasWorkbook);
              const dayTasks = tasksStore.byDate[date] ?? [];
              const tasksDone = dayTasks.filter((t) => t.completed_at !== null).length;
              const tasksTotal = dayTasks.length;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.dayCell,
                    hasData ? theme.cardSurface : s.dayCellEmpty,
                    cycleColor && { backgroundColor: cycleColor + '50', borderColor: cycleColor },
                    isToday && s.dayCellToday,
                  ]}
                  onPress={() => router.push(`/day/${date}`)}
                  activeOpacity={0.65}
                >
                  <Text style={[s.dayNum, isToday && s.dayNumToday, { color: theme.textPrimary }]}>{day}</Text>
                  {tasksTotal > 0 && (
                    <View style={[s.taskBadge, { backgroundColor: tasksDone === tasksTotal ? '#A8C5A030' : '#C9A84C22' }]}>
                      <Text style={[s.taskBadgeText, { color: tasksDone === tasksTotal ? '#A8C5A0' : '#C9A84C' }]}>
                        {tasksDone}/{tasksTotal}
                      </Text>
                    </View>
                  )}
                  <View style={s.dotRow}>
                    {data?.hasJournal && (
                      <View style={[s.dot, { backgroundColor: '#89B4CC' }]} />
                    )}
                    {data?.activityNames?.length > 0 && (
                      <View style={[s.dot, { backgroundColor: '#A8C5A0' }]} />
                    )}
                    {data?.medicationStatus === 'taken' && (
                      <View style={[s.dot, { backgroundColor: '#C4A0B0' }]} />
                    )}
                    {data?.hasWorkbook && (
                      <View style={[s.dot, { backgroundColor: '#C9A84C' }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tap hint */}
        <Text style={s.tapHint}>Tap any day to see the full daily view</Text>

        {/* Cycle legend */}
        <View style={[s.legendSection, theme.cardSurface]}>
          <Text style={[s.legendHeading, theme.sectionLabelStyle]}>Cycle State</Text>
          <View style={s.legendRow}>
            {Object.entries(CYCLE_COLORS).map(([state, color]) => (
              <View key={state} style={s.legendItem}>
                <View style={[s.legendSwatch, { backgroundColor: color }]} />
                <Text style={[s.legendText, { color: theme.textSecondary }]}>{state}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Dot legend */}
        <View style={[s.legendSection, theme.cardSurface]}>
          <Text style={[s.legendHeading, theme.sectionLabelStyle]}>Dots</Text>
          <View style={s.legendRow}>
            {[
              { color: '#89B4CC', label: 'Journal' },
              { color: '#A8C5A0', label: 'Activity' },
              { color: '#C4A0B0', label: 'Meds' },
              { color: '#C9A84C', label: 'Workbook' },
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

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1.5,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitleWrap: { alignItems: 'center' },
  monthTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  monthYear: { fontSize: 12, marginTop: 1 },

  dayLabels: { flexDirection: 'row', paddingHorizontal: 0, marginBottom: 4, paddingVertical: 6 },
  dayLabelText: {
    width: DAY_SIZE, textAlign: 'center',
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  emptyCell: { width: DAY_SIZE - 3, height: DAY_SIZE - 3, margin: 1.5 },
  dayCell: {
    width: DAY_SIZE - 3, height: DAY_SIZE - 3, margin: 1.5,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dayCellEmpty: {
    backgroundColor: 'transparent', borderColor: 'transparent',
    shadowOpacity: 0, elevation: 0,
  },
  dayCellToday: {
    borderColor: '#3D3935', borderWidth: 2,
  },
  dayNum: { fontSize: 13, fontWeight: '600' },
  dayNumToday: { fontWeight: '900' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  taskBadge: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 1 },
  taskBadgeText: { fontSize: 8, fontWeight: '800' },

  tapHint: {
    textAlign: 'center', fontSize: 11, color: '#3D393555',
    fontStyle: 'italic', marginTop: 14, marginBottom: 4,
  },

  legendSection: {
    marginHorizontal: 16, marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1.5,
    gap: 6,
  },
  legendHeading: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, textTransform: 'capitalize' },
});
