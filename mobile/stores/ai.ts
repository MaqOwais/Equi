import { create } from 'zustand';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { callGroq, buildReportMessages, buildMonthlyReportMessages } from '../lib/groq';
import { scheduleEarlyWarningNotification } from '../lib/notifications';
import { useNotificationsStore } from './notifications';
import type { ReportData, ChatMessage } from '../lib/groq';

export interface AIReport {
  id: string;
  user_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  report_json: ReportJSON;
  pdf_url: string | null;
  created_at: string;
}

export interface ReportJSON {
  summary: string;
  cycle_overview: {
    days: { date: string; state: string; intensity: number }[];
    dominant_state: string;
    insight: string;
  };
  sleep_correlation: string | null;
  social_rhythm: string | null;         // Phase 4E
  activities_completed: string[];
  activity_suggestions: string[];       // Phase 4E
  top_mood_triggers: string[];
  social_rhythm_score: number | null;
  medication_adherence: string | null;
  substances: string | null;
  nutrition_mood: string | null;
  life_events_noted: string[];
  early_warning_flags: string[];
  longest_stable_period?: string;       // monthly only
}

interface AIStore {
  latestReport: AIReport | null;
  latestMonthlyReport: AIReport | null;
  trackerInsight: string | null;
  isLoading: boolean;
  isGenerating: boolean;
  isGeneratingMonthly: boolean;
  isExporting: boolean;
  error: string | null;

  loadLatest: (userId: string) => Promise<void>;
  generate: (userId: string) => Promise<void>;
  generateMonthly: (userId: string) => Promise<void>;
  loadTrackerInsight: (userId: string) => Promise<void>;
  exportPdf: (userId: string, reportId: string) => Promise<string | null>;
  shareWithCompanion: (userId: string, reportId: string, companionId: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodDates(daysBack = 6): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

// Supabase typed client only covers profiles + emergency_contacts.
// All other tables use this escape hatch to avoid `never` type errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// Collect all data needed for an AI report over the given period.
// Never includes raw journal text.
async function collectReportData(
  userId: string,
  start: string,
  end: string,
): Promise<ReportData> {
  const { data: latestCycleRaw } = await db
    .from('cycle_logs').select('state').eq('user_id', userId)
    .order('logged_at', { ascending: false }).limit(1).maybeSingle();
  const currentState: string = (latestCycleRaw as { state?: string } | null)?.state ?? 'stable';

  const [moodRes, cycleRes, actRes, checkinRes, sigRes, sleepRes, socialRes, compatRes] =
    await Promise.all([
      db.from('mood_logs').select('logged_at, score').eq('user_id', userId)
        .gte('logged_at', start).lte('logged_at', end),
      db.from('cycle_logs').select('logged_at, state, intensity').eq('user_id', userId)
        .gte('logged_at', start).lte('logged_at', end),
      db.from('activity_completions').select('completed_at, activity:activities(title)')
        .eq('user_id', userId)
        .gte('completed_at', `${start}T00:00:00`).not('completed_at', 'is', null),
      db.from('daily_checkins').select('checkin_date, alcohol, cannabis')
        .eq('user_id', userId).gte('checkin_date', start).lte('checkin_date', end),
      db.from('relapse_signatures').select('episode_type, warning_signs, days_before')
        .eq('user_id', userId),
      db.from('sleep_logs').select('date, duration_minutes, quality_score')
        .eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('social_rhythm_logs').select('date, score, anchors_hit, anchors_total')
        .eq('user_id', userId).gte('date', start).lte('date', end),
      db.from('activities').select('title')
        .contains('compatible_states', [currentState]),
    ]) as { data: any[] | null }[];

  const mood: any[]    = moodRes.data ?? [];
  const cycle: any[]   = cycleRes.data ?? [];
  const acts: any[]    = actRes.data ?? [];
  const checkins: any[]= checkinRes.data ?? [];
  const sigs: any[]    = sigRes.data ?? [];
  const sleep: any[]   = sleepRes.data ?? [];
  const social: any[]  = socialRes.data ?? [];
  const compat: any[]  = compatRes.data ?? [];

  const completedTitles = acts
    .map((r) => (r.activity as { title?: string } | null)?.title)
    .filter((t): t is string => !!t);

  return {
    period: { start, end },
    mood: mood.map((r) => ({ date: r.logged_at, score: r.score })),
    cycle: cycle.map((r) => ({ date: r.logged_at, state: r.state, intensity: r.intensity })),
    activitiesCompleted: completedTitles,
    compatibleActivities: compat.map((a) => a.title).filter(Boolean),
    substanceDays: checkins.map((r) => ({ alcohol: r.alcohol ?? false, cannabis: r.cannabis ?? false })),
    relapseSignatures: sigs.reduce(
      (acc: ReportData['relapseSignatures'], r) => {
        const key = r.episode_type as 'manic' | 'depressive';
        return { ...acc, [key]: { warning_signs: r.warning_signs, days_before: r.days_before } };
      },
      {},
    ),
    sleepLogs: sleep.map((r) => ({ date: r.date, duration_minutes: r.duration_minutes, quality_score: r.quality_score })),
    socialRhythmLogs: social.map((r) => ({ date: r.date, score: r.score, anchors_hit: r.anchors_hit, anchors_total: r.anchors_total })),
  };
}

// Parse Groq JSON response, retrying once on failure.
// Returns a partial fallback report if both attempts fail.
async function parseGroqReport(messages: ChatMessage[]): Promise<ReportJSON> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGroq(messages);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]) as ReportJSON; } catch { /* try again */ }
    }
  }
  // Partial fallback — never show a blank report
  return {
    summary: 'Report partially generated — some sections could not be parsed.',
    cycle_overview: { days: [], dominant_state: 'unknown', insight: '' },
    sleep_correlation: null,
    social_rhythm: null,
    activities_completed: [],
    activity_suggestions: [],
    top_mood_triggers: [],
    social_rhythm_score: null,
    medication_adherence: null,
    substances: null,
    nutrition_mood: null,
    life_events_noted: [],
    early_warning_flags: [],
  };
}

// Rule-based tracker insight — no Groq call, runs fully offline.
function buildTrackerInsight(
  cycleLogs: { logged_at: string; state: string }[],
): string {
  if (cycleLogs.length === 0) return 'Log your cycle state to see insights here.';

  const sorted = [...cycleLogs].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const currentState = sorted[sorted.length - 1].state;

  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].state === currentState) streak++;
    else break;
  }

  let transitions = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].state !== sorted[i - 1].state) transitions++;
  }

  const stateLabel: Record<string, string> = {
    stable: 'stable', manic: 'elevated', depressive: 'low', mixed: 'mixed',
  };
  const label = stateLabel[currentState] ?? currentState;
  const s = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

  if (streak >= 7) {
    return `You've been ${label} for ${s(streak, 'day')} — your longest recent stretch.`;
  }
  if (transitions === 0) {
    return `Your mood state has been consistent across the last ${s(sorted.length, 'day')}.`;
  }
  if (transitions >= 4) {
    return `You've had ${s(transitions, 'state change')} in 14 days — worth mentioning to your psychiatrist.`;
  }
  return `You've been ${label} for ${s(streak, 'day')}, with ${s(transitions, 'transition')} in the last 14 days.`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAIStore = create<AIStore>((set) => ({
  latestReport: null,
  latestMonthlyReport: null,
  trackerInsight: null,
  isLoading: false,
  isGenerating: false,
  isGeneratingMonthly: false,
  isExporting: false,
  error: null,

  loadLatest: async (userId) => {
    set({ isLoading: true, error: null });
    const [weeklyRes, monthlyRes] = await Promise.all([
      db.from('ai_reports').select('*').eq('user_id', userId)
        .eq('report_type', 'weekly').order('created_at', { ascending: false })
        .limit(1).maybeSingle(),
      db.from('ai_reports').select('*').eq('user_id', userId)
        .eq('report_type', 'monthly').order('created_at', { ascending: false })
        .limit(1).maybeSingle(),
    ]) as [{ data: AIReport | null }, { data: AIReport | null }];
    set({
      latestReport: weeklyRes.data,
      latestMonthlyReport: monthlyRes.data,
      isLoading: false,
    });
  },

  generate: async (userId) => {
    set({ isGenerating: true, error: null });
    const { start, end } = periodDates(6);
    try {
      const reportData = await collectReportData(userId, start, end);
      const messages = buildReportMessages(reportData);
      const reportJson = await parseGroqReport(messages);

      const { data: saved } = await db
        .from('ai_reports')
        .insert({ user_id: userId, report_type: 'weekly', period_start: start, period_end: end, report_json: reportJson })
        .select().single();

      const savedReport = saved as AIReport;
      set({ latestReport: savedReport, isGenerating: false });

      const notifPrefs = useNotificationsStore.getState().prefs;
      if (notifPrefs?.early_warning_enabled && reportJson.early_warning_flags.length >= 2) {
        scheduleEarlyWarningNotification(savedReport.id).catch(() => {});
      }
    } catch (err: unknown) {
      set({ isGenerating: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  // ── 30-day monthly report ─────────────────────────────────────────────────
  generateMonthly: async (userId) => {
    set({ isGeneratingMonthly: true, error: null });
    const { start, end } = periodDates(29);
    try {
      const reportData = await collectReportData(userId, start, end);
      const messages = buildMonthlyReportMessages(reportData);
      const reportJson = await parseGroqReport(messages);

      const { data: saved } = await db
        .from('ai_reports')
        .insert({ user_id: userId, report_type: 'monthly', period_start: start, period_end: end, report_json: reportJson })
        .select().single();

      set({ latestMonthlyReport: saved as AIReport, isGeneratingMonthly: false });
    } catch (err: unknown) {
      set({ isGeneratingMonthly: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  // ── Tracker insight (rule-based, offline-safe) ───────────────────────────
  loadTrackerInsight: async (userId) => {
    const { start } = periodDates(13); // last 14 days
    const { data } = await db
      .from('cycle_logs').select('logged_at, state')
      .eq('user_id', userId).gte('logged_at', start)
      .order('logged_at', { ascending: true });
    set({ trackerInsight: buildTrackerInsight((data as any[] | null) ?? []) });
  },

  // ── Export PDF ─────────────────────────────────────────────────────────────
  // Calls generate-report-pdf Edge Function → downloads PDF → opens share sheet.
  // Returns the signed URL on success so ExportSheet can also offer copy-link.
  exportPdf: async (userId, reportId) => {
    set({ isExporting: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-report-pdf`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ report_id: reportId }),
      });

      if (!res.ok) throw new Error(`PDF generation failed: ${res.statusText}`);
      const { url } = await res.json() as { url: string; expires_at: string };

      // Download to a local cache file so expo-sharing can access it
      const localPath = `${FileSystem.cacheDirectory}equi-report-${reportId.slice(0, 8)}.pdf`;
      await FileSystem.downloadAsync(url, localPath);

      set({ isExporting: false });
      await Sharing.shareAsync(localPath, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      return url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      set({ isExporting: false, error: msg });
      return null;
    }
  },

  // ── Share with companion ───────────────────────────────────────────────────
  // Generates a 7-day signed URL and records the share in report_shares.
  shareWithCompanion: async (userId, reportId, companionId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-report-pdf`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ report_id: reportId, share_ttl_seconds: 604800 }), // 7 days
      });

      if (!res.ok) return;
      const { url, expires_at } = await res.json() as { url: string; expires_at: string };

      await db.from('report_shares').insert({
        report_id: reportId,
        user_id: userId,
        companion_id: companionId,
        share_url: url,
        expires_at,
      });
    } catch {
      // Silent — companion sharing is best-effort
    }
  },
}));
