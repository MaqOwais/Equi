import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CycleState, MedicationStatus } from '../types/database';
import { getLocal } from '../lib/local-day-store';
import { blocksToPlainText } from '../lib/journal-blocks';

export interface DayData {
  date: string; // YYYY-MM-DD

  // Cycle
  cycleState: CycleState | null;
  cycleIntensity: number | null;
  cycleSymptoms: string[];
  cycleNotes: string | null;
  cycleTimestamp: string | null; // ISO 8601 — most recent entry's logged_at

  // Mood
  moodScore: number | null;

  // Sleep
  sleepQuality: number | null;
  sleepDuration: number | null; // minutes

  // Medication
  medicationStatus: MedicationStatus | null;
  medicationSkipReason: string | null;
  medTimestamp: string | null; // ISO 8601 — when medication was logged

  // Activities
  activityNames: string[];
  activityEntries: { name: string; completedAt: string }[]; // full entries with timestamps

  // Journal
  hasJournal: boolean;
  journalText: string | null; // full text — displayed locally to user, NOT sent to AI
  journalTimestamp: string | null; // ISO 8601 — when journal was last saved

  // Workbook
  hasWorkbook: boolean;
  workbookCount: number; // number of entries written on this date

  // Nutrition (category key → count)
  nutritionCategories: Record<string, number> | null;
  nutritionTimestamp: string | null; // ISO 8601 — when nutrition was last updated

  // Sleep
  sleepTimestamp: string | null; // ISO 8601 — when sleep was logged

  // Substances
  alcohol: boolean | null;
  cannabis: boolean | null;
  checkinTimestamp: string | null; // ISO 8601 — when substances were logged

  // Social Rhythm
  socialRhythmScore: number | null;
  socialAnchorsHit: number | null;
  socialAnchorsTotal: number | null;
  socialRhythmTimestamp: string | null; // ISO 8601 — when social rhythm was calculated
}

interface CalendarStore {
  year: number;
  month: number; // 1-12
  days: Record<string, DayData>; // keyed by YYYY-MM-DD
  isLoading: boolean;
  selectedDate: string | null;

  setMonth: (year: number, month: number) => void;
  setSelectedDate: (date: string | null) => void;
  loadMonth: (userId: string) => Promise<void>;
  buildWeekPrompt: (weekStart: string) => string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}


export const useCalendarStore = create<CalendarStore>((set, get) => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    days: {},
    isLoading: false,
    selectedDate: null,

    setMonth: (year, month) => {
      set({ year, month, days: {} });
    },

    setSelectedDate: (date) => set({ selectedDate: date }),

    loadMonth: async (userId) => {
      const { year, month } = get();
      const startDate = isoDate(year, month, 1);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = isoDate(year, month, lastDay);

      set({ isLoading: true });

      // ── Step 1: Build skeleton from local AsyncStorage (instant, offline-first) ──
      const days: Record<string, DayData> = {};
      for (let d = 1; d <= lastDay; d++) {
        const date = isoDate(year, month, d);
        const local = await getLocal(userId, date);
        days[date] = {
          date,
          cycleState: (local?.cycleState as CycleState) ?? null,
          cycleIntensity: local?.cycleIntensity ?? null,
          cycleSymptoms: local?.cycleSymptoms ?? [],
          cycleNotes: local?.cycleNotes ?? null,
          cycleTimestamp: local?.cycleTimestamp ?? null,
          moodScore: local?.moodScore ?? null,
          sleepQuality: local?.sleepQuality ?? null,
          sleepDuration: local?.sleepDuration ?? null,
          medicationStatus: (local?.medicationStatus as MedicationStatus) ?? null,
          medicationSkipReason: local?.medicationSkipReason ?? null,
          medTimestamp: local?.medTimestamp ?? null,
          activityNames: local?.activityCompletions?.map((c) => c.name) ?? [],
          activityEntries: local?.activityCompletions?.map((c) => ({ name: c.name, completedAt: c.completedAt })) ?? [],
          hasJournal: !!(local?.journalText),
          journalText: local?.journalText ? blocksToPlainText(local.journalText) : null,
          journalTimestamp: local?.journalTimestamp ?? null,
          nutritionCategories: local?.nutritionCategories ?? null,
          nutritionTimestamp: local?.nutritionTimestamp ?? null,
          sleepTimestamp: local?.sleepTimestamp ?? null,
          alcohol: local?.alcohol ?? null,
          cannabis: local?.cannabis ?? null,
          checkinTimestamp: local?.checkinTimestamp ?? null,
          socialRhythmScore: local?.socialRhythmScore ?? null,
          socialAnchorsHit: local?.socialAnchorsHit ?? null,
          socialAnchorsTotal: local?.socialAnchorsTotal ?? null,
          socialRhythmTimestamp: local?.socialRhythmTimestamp ?? null,
          hasWorkbook: false,
          workbookCount: 0,
        };
      }

      // Show local data immediately — don't wait for Supabase
      set({ days: { ...days }, isLoading: false });

      // ── Step 2: Fetch Supabase in background, merge (cloud fills in synced history) ──
      try {
        const db = supabase as any;

        const [cycleLogs, moodLogs, sleepLogs, medLogs, activityLogs,
               journalEntries, socialLogs, nutritionLogs, checkins, workbookLogs] = await Promise.all([
          db.from('cycle_logs').select('logged_at, state, intensity, symptoms, notes').eq('user_id', userId).gte('logged_at', startDate + 'T00:00:00').lte('logged_at', endDate + 'T23:59:59').order('logged_at', { ascending: true }),
          db.from('mood_logs').select('logged_at, score').eq('user_id', userId).gte('logged_at', startDate).lte('logged_at', endDate),
          db.from('sleep_logs').select('date, quality_score, duration_minutes').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
          db.from('medication_logs').select('log_date, status, skip_reason').eq('user_id', userId).gte('log_date', startDate).lte('log_date', endDate),
          db.from('activity_completions').select('completed_at, activity:activities(title)').eq('user_id', userId).gte('completed_at', startDate + 'T00:00:00').lte('completed_at', endDate + 'T23:59:59'),
          db.from('journal_entries').select('entry_date, blocks').eq('user_id', userId).gte('entry_date', startDate).lte('entry_date', endDate),
          db.from('social_rhythm_logs').select('date, score, anchors_hit, anchors_total, created_at').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
          db.from('nutrition_logs').select('log_date, categories').eq('user_id', userId).gte('log_date', startDate).lte('log_date', endDate),
          db.from('daily_checkins').select('checkin_date, alcohol, cannabis, created_at').eq('user_id', userId).gte('checkin_date', startDate).lte('checkin_date', endDate),
          db.from('workbook_responses').select('entry_date, created_at').eq('user_id', userId).gte('entry_date', startDate).lte('entry_date', endDate),
        ]);

        // Build Supabase maps
        // cycle_logs may have multiple entries per day — take the last one (highest timestamp)
        const cycleMap: Record<string, any> = {};
        (cycleLogs.data ?? []).forEach((r: any) => {
          const date = (r.logged_at as string).substring(0, 10);
          cycleMap[date] = r; // oldest-first → last write = most recent entry
        });
        const moodMap: Record<string, number> = {};
        (moodLogs.data ?? []).forEach((r: any) => { moodMap[r.logged_at] = r.score; });
        const sleepMap: Record<string, any> = {};
        (sleepLogs.data ?? []).forEach((r: any) => { sleepMap[r.date] = r; });
        const medMap: Record<string, any> = {};
        (medLogs.data ?? []).forEach((r: any) => { medMap[r.log_date] = r; });
        const activityMap: Record<string, string[]> = {};
        (activityLogs.data ?? []).forEach((r: any) => {
          const d = r.completed_at?.split('T')[0];
          if (d) { if (!activityMap[d]) activityMap[d] = []; activityMap[d].push(r.activity?.title ?? 'Activity'); }
        });
        const journalMap: Record<string, string> = {};
        (journalEntries.data ?? []).forEach((r: any) => {
          const text = blocksToPlainText(r.blocks);
          if (text.trim().length > 0) journalMap[r.entry_date] = text;
        });
        const socialMap: Record<string, any> = {};
        (socialLogs.data ?? []).forEach((r: any) => { socialMap[r.date] = r; });
        const nutritionMap: Record<string, any> = {};
        (nutritionLogs.data ?? []).forEach((r: any) => {
          if (r.categories && Object.keys(r.categories).length > 0) nutritionMap[r.log_date] = r.categories;
        });
        const checkinMap: Record<string, any> = {};
        (checkins.data ?? []).forEach((r: any) => { checkinMap[r.checkin_date] = r; });
        const workbookMap: Record<string, number> = {};
        (workbookLogs.data ?? []).forEach((r: any) => {
          const d = r.entry_date ?? r.created_at?.split('T')[0];
          if (d) workbookMap[d] = (workbookMap[d] ?? 0) + 1;
        });

        // Merge: local wins, Supabase fills gaps for days with no local data
        const merged: Record<string, DayData> = {};
        for (let d = 1; d <= lastDay; d++) {
          const date = isoDate(year, month, d);
          const loc = days[date]; // already has local data

          // Only use Supabase value if local has nothing for that field
          merged[date] = {
            date,
            cycleState: loc.cycleState ?? (cycleMap[date]?.state as CycleState) ?? null,
            cycleIntensity: loc.cycleIntensity ?? (cycleMap[date]?.intensity ?? null),
            cycleSymptoms: loc.cycleSymptoms.length > 0 ? loc.cycleSymptoms : (cycleMap[date]?.symptoms ?? []),
            cycleNotes: loc.cycleNotes ?? (cycleMap[date]?.notes ?? null),
            cycleTimestamp: loc.cycleTimestamp ?? (cycleMap[date]?.logged_at ?? null),
            moodScore: loc.moodScore ?? moodMap[date] ?? null,
            sleepQuality: loc.sleepQuality ?? sleepMap[date]?.quality_score ?? null,
            sleepDuration: loc.sleepDuration ?? sleepMap[date]?.duration_minutes ?? null,
            medicationStatus: loc.medicationStatus ?? (medMap[date]?.status as MedicationStatus) ?? null,
            medicationSkipReason: loc.medicationSkipReason ?? medMap[date]?.skip_reason ?? null,
            medTimestamp: loc.medTimestamp ?? null,
            activityNames: loc.activityNames.length > 0 ? loc.activityNames : (activityMap[date] ?? []),
            activityEntries: loc.activityEntries.length > 0
              ? loc.activityEntries
              : (activityLogs.data ?? [])
                  .filter((r: any) => r.completed_at?.startsWith(date))
                  .map((r: any) => ({ name: r.activity?.title ?? 'Activity', completedAt: r.completed_at })),
            hasJournal: loc.hasJournal || !!journalMap[date],
            journalText: loc.journalText ?? journalMap[date] ?? null,
            journalTimestamp: loc.journalTimestamp ?? null,
            nutritionCategories: loc.nutritionCategories ?? nutritionMap[date] ?? null,
            nutritionTimestamp: loc.nutritionTimestamp ?? null,
            sleepTimestamp: loc.sleepTimestamp ?? null,
            alcohol: loc.alcohol ?? checkinMap[date]?.alcohol ?? null,
            cannabis: loc.cannabis ?? checkinMap[date]?.cannabis ?? null,
            checkinTimestamp: loc.checkinTimestamp ?? checkinMap[date]?.created_at ?? null,
            socialRhythmScore: loc.socialRhythmScore ?? socialMap[date]?.score ?? null,
            socialAnchorsHit: loc.socialAnchorsHit ?? socialMap[date]?.anchors_hit ?? null,
            socialAnchorsTotal: loc.socialAnchorsTotal ?? socialMap[date]?.anchors_total ?? null,
            socialRhythmTimestamp: loc.socialRhythmTimestamp ?? socialMap[date]?.created_at ?? null,
            hasWorkbook: (workbookMap[date] ?? 0) > 0,
            workbookCount: workbookMap[date] ?? 0,
          };
        }

        set({ days: merged });
      } catch {
        // Supabase fetch failed — local data already displayed, silently ignore
      }
    },

    buildWeekPrompt: (weekStart: string) => {
      const { days } = get();
      const startMs = new Date(weekStart).getTime();
      const weekDays: DayData[] = [];
      for (let i = 0; i < 7; i++) {
        const dt = new Date(startMs + i * 86400000);
        const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        if (days[d]) weekDays.push(days[d]);
      }

      const lines = weekDays.map((d) => {
        const parts: string[] = [`${d.date}:`];
        if (d.cycleState) parts.push(`cycle=${d.cycleState}(${d.cycleIntensity ?? '?'}/10)`);
        if (d.cycleSymptoms.length > 0) parts.push(`symptoms=[${d.cycleSymptoms.join(',')}]`);
        if (d.moodScore !== null) parts.push(`mood=${d.moodScore}/10`);
        if (d.sleepQuality !== null) parts.push(`sleep_quality=${d.sleepQuality}/10`);
        if (d.sleepDuration !== null) parts.push(`sleep_hrs=${(d.sleepDuration / 60).toFixed(1)}`);
        if (d.medicationStatus) parts.push(`med=${d.medicationStatus}`);
        if (d.medicationSkipReason) parts.push(`med_skip_reason=${d.medicationSkipReason}`);
        if (d.activityNames.length > 0) parts.push(`activities=[${d.activityNames.join(',')}]`);
        if (d.hasJournal) parts.push(`journal=yes`); // NOTE: raw text is never sent
        if (d.alcohol !== null) parts.push(`alcohol=${d.alcohol}`);
        if (d.cannabis !== null) parts.push(`cannabis=${d.cannabis}`);
        if (d.socialRhythmScore !== null) {
          parts.push(`social_rhythm=${d.socialRhythmScore}/10`);
          if (d.socialAnchorsHit !== null && d.socialAnchorsTotal !== null) {
            parts.push(`anchors=${d.socialAnchorsHit}/${d.socialAnchorsTotal}`);
          }
        }
        if (d.nutritionCategories) {
          const nutParts = Object.entries(d.nutritionCategories)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${k}:${v}`)
            .join(',');
          if (nutParts) parts.push(`nutrition={${nutParts}}`);
        }
        return parts.join(' ');
      });

      return (
        `Week of ${weekStart} — anonymised health signals (no identifying info, no journal text):\n` +
        lines.join('\n') +
        `\n\nProvide a warm, supportive 3-5 sentence summary of this week's patterns. ` +
        `Note correlations between cycle state, sleep, mood, medication adherence, nutrition, and activities. ` +
        `Flag any early warning patterns gently. Be clinically careful — never diagnose. ` +
        `Use supportive, non-judgmental language.`
      );
    },
  };
});
