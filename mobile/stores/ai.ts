import { create } from 'zustand';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { callGroq, buildReportMessages } from '../lib/groq';
import { scheduleEarlyWarningNotification } from '../lib/notifications';
import { useNotificationsStore } from './notifications';
import type { ReportData } from '../lib/groq';

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
  activities_completed: string[];
  top_mood_triggers: string[];
  social_rhythm_score: number | null;
  medication_adherence: string | null;
  substances: string | null;
  nutrition_mood: string | null;
  life_events_noted: string[];
  early_warning_flags: string[];
}

interface AIStore {
  latestReport: AIReport | null;
  isLoading: boolean;
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;

  loadLatest: (userId: string) => Promise<void>;
  generate: (userId: string) => Promise<void>;
  exportPdf: (userId: string, reportId: string) => Promise<string | null>;
  shareWithCompanion: (userId: string, reportId: string, companionId: string) => Promise<void>;
}

function periodDates(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export const useAIStore = create<AIStore>((set) => ({
  latestReport: null,
  isLoading: false,
  isGenerating: false,
  isExporting: false,
  error: null,

  loadLatest: async (userId) => {
    set({ isLoading: true, error: null });
    const { data } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    set({ latestReport: data as AIReport | null, isLoading: false });
  },

  generate: async (userId) => {
    set({ isGenerating: true, error: null });
    const { start, end } = periodDates();

    try {
      // Collect data — no raw journal text, no user identifiers
      const [moodRes, cycleRes, actRes, checkinRes, sigRes] = await Promise.all([
        supabase.from('mood_logs').select('logged_at, score').eq('user_id', userId)
          .gte('logged_at', start).lte('logged_at', end),
        supabase.from('cycle_logs').select('logged_at, state, intensity').eq('user_id', userId)
          .gte('logged_at', start).lte('logged_at', end),
        supabase.from('activity_completions').select('completed_at, activity:activities(title)')
          .eq('user_id', userId)
          .gte('completed_at', `${start}T00:00:00`).not('completed_at', 'is', null),
        supabase.from('daily_checkins').select('checkin_date, alcohol, cannabis')
          .eq('user_id', userId).gte('checkin_date', start).lte('checkin_date', end),
        supabase.from('relapse_signatures').select('episode_type, warning_signs, days_before')
          .eq('user_id', userId),
      ]);

      const reportData: ReportData = {
        period: { start, end },
        mood: (moodRes.data ?? []).map((r) => ({ date: r.logged_at, score: r.score })),
        cycle: (cycleRes.data ?? []).map((r) => ({
          date: r.logged_at, state: r.state, intensity: r.intensity,
        })),
        activitiesCompleted: (actRes.data ?? [])
          .map((r) => (r.activity as { title?: string } | null)?.title)
          .filter((t): t is string => !!t),
        substanceDays: (checkinRes.data ?? []).map((r) => ({
          alcohol: r.alcohol ?? false, cannabis: r.cannabis ?? false,
        })),
        relapseSignatures: (sigRes.data ?? []).reduce(
          (acc: ReportData['relapseSignatures'], r) => {
            const key = r.episode_type as 'manic' | 'depressive';
            return { ...acc, [key]: { warning_signs: r.warning_signs, days_before: r.days_before } };
          },
          {},
        ),
      };

      const messages = buildReportMessages(reportData);
      const raw = await callGroq(messages);

      // Parse JSON from Groq response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Groq returned invalid JSON');
      const reportJson: ReportJSON = JSON.parse(jsonMatch[0]);

      const { data: saved } = await supabase
        .from('ai_reports')
        .insert({
          user_id: userId,
          report_type: 'weekly',
          period_start: start,
          period_end: end,
          report_json: reportJson,
        })
        .select()
        .single();

      const savedReport = saved as AIReport;
      set({ latestReport: savedReport, isGenerating: false });

      // Trigger early warning notification if ≥2 flags detected and preference is on
      const notifPrefs = useNotificationsStore.getState().prefs;
      if (
        notifPrefs?.early_warning_enabled &&
        reportJson.early_warning_flags.length >= 2
      ) {
        scheduleEarlyWarningNotification(savedReport.id).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      set({ isGenerating: false, error: msg });
    }
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

      // Record in report_shares
      await supabase.from('report_shares').insert({
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
