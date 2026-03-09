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
  const { session } = useAuthStore();
  const user = session?.user;
  const { year, month, days, isLoading, setMonth, loadMonth } = useCalendarStore();

  useEffect(() => {
    if (user?.id) loadMonth(user.id);
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
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Month navigation */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#3D3935" />
          </TouchableOpacity>
          <Text style={s.monthTitle}>{MONTH_NAMES[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#3D3935" />
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={s.dayLabels}>
          {DAY_LABELS.map((l, i) => (
            <Text key={i} style={s.dayLabelText}>{l}</Text>
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
              const hasData = !!(data?.cycleState || data?.moodScore !== undefined ||
                data?.hasJournal || data?.activityNames?.length);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.dayCell,
                    cycleColor && { backgroundColor: cycleColor + '44', borderColor: cycleColor + '88' },
                    isToday && s.dayCellToday,
                    !cycleColor && s.dayCellEmpty,
                  ]}
                  onPress={() => router.push(`/day/${date}`)}
                  activeOpacity={0.65}
                >
                  <Text style={[s.dayNum, isToday && s.dayNumToday]}>{day}</Text>
                  <View style={s.dotRow}>
                    {data?.moodScore !== null && data?.moodScore !== undefined && (
                      <View style={[s.dot, { backgroundColor: '#C9A84C' }]} />
                    )}
                    {data?.hasJournal && (
                      <View style={[s.dot, { backgroundColor: '#89B4CC' }]} />
                    )}
                    {data?.activityNames?.length > 0 && (
                      <View style={[s.dot, { backgroundColor: '#A8C5A0' }]} />
                    )}
                    {data?.medicationStatus === 'taken' && (
                      <View style={[s.dot, { backgroundColor: '#C4A0B0' }]} />
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
        <View style={s.legendSection}>
          <Text style={s.legendHeading}>Cycle State</Text>
          <View style={s.legendRow}>
            {Object.entries(CYCLE_COLORS).map(([state, color]) => (
              <View key={state} style={s.legendItem}>
                <View style={[s.legendSwatch, { backgroundColor: color }]} />
                <Text style={s.legendText}>{state}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Dot legend */}
        <View style={s.legendSection}>
          <Text style={s.legendHeading}>Dots</Text>
          <View style={s.legendRow}>
            {[
              { color: '#C9A84C', label: 'Mood' },
              { color: '#89B4CC', label: 'Journal' },
              { color: '#A8C5A0', label: 'Activity' },
              { color: '#C4A0B0', label: 'Meds' },
            ].map(({ color, label }) => (
              <View key={label} style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={s.legendText}>{label}</Text>
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F7F3EE', alignItems: 'center', justifyContent: 'center',
  },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#3D3935', letterSpacing: 0.2 },

  dayLabels: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  dayLabelText: {
    width: DAY_SIZE, textAlign: 'center',
    fontSize: 11, fontWeight: '600', color: '#3D393566', letterSpacing: 0.5,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  emptyCell: { width: DAY_SIZE - 2, height: DAY_SIZE - 2, margin: 1 },
  dayCell: {
    width: DAY_SIZE - 2, height: DAY_SIZE - 2, margin: 1,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  dayCellEmpty: {
    backgroundColor: '#F7F3EE', borderColor: 'transparent',
  },
  dayCellToday: {
    borderColor: '#3D3935', borderWidth: 2,
  },
  dayNum: { fontSize: 13, fontWeight: '500', color: '#3D3935' },
  dayNumToday: { fontWeight: '800' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  tapHint: {
    textAlign: 'center', fontSize: 11, color: '#3D393555',
    fontStyle: 'italic', marginTop: 12, marginBottom: 4,
  },

  legendSection: { paddingHorizontal: 16, paddingTop: 14, gap: 6 },
  legendHeading: {
    fontSize: 11, fontWeight: '700', color: '#3D393566',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#3D393588', textTransform: 'capitalize' },
});
