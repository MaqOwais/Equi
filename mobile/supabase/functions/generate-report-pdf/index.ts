/**
 * Supabase Edge Function: generate-report-pdf
 *
 * Builds a clinical-quality PDF from an ai_reports row and uploads it to
 * Supabase Storage. Returns a signed URL for direct download or sharing.
 *
 * Deploy:
 *   supabase functions deploy generate-report-pdf
 *
 * Storage bucket setup (run once in Supabase dashboard):
 *   - Bucket name: reports
 *   - Public: false
 *   - File size limit: 10 MB
 *   - Allowed MIME types: application/pdf, application/zip
 *
 * Chromium note:
 *   This function uses puppeteer-core with @sparticuz/chromium.
 *   In Supabase Edge Functions (Deno), import via npm: specifier.
 *   The chromium binary is fetched on first run (~50 MB); subsequent
 *   invocations use the cached binary.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  report_id: string;
  share_ttl_seconds?: number; // default 3600 (1h for download, 604800 for 7-day share)
}

interface ReportJSON {
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

// ── HTML builder ──────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  stable:     '#A8C5A0',
  manic:      '#89B4CC',
  depressive: '#C4A0B0',
  mixed:      '#E8DCC8',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function buildReportHtml(
  rj: ReportJSON,
  periodStart: string,
  periodEnd: string,
  userName: string,
): string {
  const stateCell = (state: string, date: string) => {
    const color = STATE_COLORS[state] ?? '#E8DCC8';
    const d = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
    return `<td style="background:${color}20;border:1px solid ${color}40;padding:6px 4px;text-align:center;font-size:10px;font-weight:600;color:${color};border-radius:4px">${d}<br>${state}</td>`;
  };

  const warningSection = rj.early_warning_flags.length > 0 ? `
    <div class="section warning-section">
      <h3 class="section-title warning-title">⚠️ Early Warning Flags</h3>
      <p class="caption">Based on personal relapse signatures — informational only, not clinical diagnosis.</p>
      ${rj.early_warning_flags.map((f) => `<p class="flag-item">· ${f}</p>`).join('')}
    </div>` : '';

  const activitiesSection = rj.activities_completed.length > 0 ? `
    <div class="section">
      <h3 class="section-title">🌿 Activities Completed</h3>
      ${rj.activities_completed.map((a) => `<p class="list-item">✓ ${a}</p>`).join('')}
    </div>` : '';

  const triggersSection = rj.top_mood_triggers.length > 0 ? `
    <div class="section">
      <h3 class="section-title">🧭 Mood Patterns</h3>
      <p class="caption">Patterns noticed — not proven causes.</p>
      ${rj.top_mood_triggers.map((t) => `<p class="list-item">· ${t}</p>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #3D3935; background: #F7F3EE; padding: 0; }
  .page { max-width: 700px; margin: 0 auto; background: #FFFFFF; padding: 40px; }

  /* Cover */
  .cover { border-bottom: 2px solid #A8C5A020; padding-bottom: 28px; margin-bottom: 28px; }
  .logo { font-size: 28px; font-weight: 800; color: #A8C5A0; letter-spacing: -0.5px; }
  .cover-title { font-size: 22px; font-weight: 700; color: #3D3935; margin-top: 10px; }
  .cover-meta { font-size: 13px; color: #3D3935; opacity: 0.45; margin-top: 6px; }

  /* Sections */
  .section { background: #FFFFFF; border: 1px solid #F0EDE8; border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; }
  .warning-section { border-color: #C9A84C40; background: #C9A84C05; }
  .section-title { font-size: 14px; font-weight: 700; color: #3D3935; margin-bottom: 10px; }
  .warning-title { color: #C9A84C; }

  /* Text */
  .body-text { font-size: 13px; color: #3D3935; line-height: 1.6; opacity: 0.75; }
  .caption { font-size: 11px; color: #3D3935; opacity: 0.4; margin-bottom: 8px; font-style: italic; }
  .list-item { font-size: 13px; color: #3D3935; opacity: 0.65; margin-bottom: 4px; line-height: 1.5; }
  .flag-item { font-size: 13px; color: #C9A84C; margin-bottom: 4px; line-height: 1.5; }

  /* Cycle table */
  .cycle-table { width: 100%; border-collapse: separate; border-spacing: 3px; margin-bottom: 10px; }
  .insight-text { font-size: 12px; color: #3D3935; opacity: 0.5; font-style: italic; line-height: 1.5; }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #F0EDE8; }
  .footer-text { font-size: 10px; color: #3D3935; opacity: 0.3; line-height: 1.6; }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div class="logo">Equi</div>
    <div class="cover-title">AI Wellness Report — ${userName}</div>
    <div class="cover-meta">
      ${formatDate(periodStart)} – ${formatDate(periodEnd)} &nbsp;·&nbsp;
      Generated ${formatDate(new Date().toISOString())}
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <h3 class="section-title">✨ Summary</h3>
    <p class="body-text">${rj.summary}</p>
  </div>

  <!-- Cycle Overview -->
  <div class="section">
    <h3 class="section-title">📊 Cycle Overview</h3>
    <table class="cycle-table">
      <tr>${rj.cycle_overview.days.map((d) => stateCell(d.state, d.date)).join('')}</tr>
    </table>
    <p class="insight-text">${rj.cycle_overview.insight}</p>
  </div>

  ${warningSection}

  ${triggersSection}

  ${activitiesSection}

  ${rj.sleep_correlation ? `
  <div class="section">
    <h3 class="section-title">😴 Sleep</h3>
    <p class="body-text">${rj.sleep_correlation}</p>
  </div>` : ''}

  ${rj.substances ? `
  <div class="section">
    <h3 class="section-title">🍃 Substances</h3>
    <p class="body-text">${rj.substances}</p>
  </div>` : ''}

  ${rj.medication_adherence ? `
  <div class="section">
    <h3 class="section-title">💊 Medication</h3>
    <p class="body-text">${rj.medication_adherence}</p>
  </div>` : ''}

  ${rj.nutrition_mood ? `
  <div class="section">
    <h3 class="section-title">🥗 Nutrition & Mood</h3>
    <p class="body-text">${rj.nutrition_mood}</p>
  </div>` : ''}

  ${rj.social_rhythm_score !== null ? `
  <div class="section">
    <h3 class="section-title">🗓 Social Rhythm Score</h3>
    <p class="body-text">${rj.social_rhythm_score}% &nbsp;·&nbsp; Based on IPSRT anchor adherence.</p>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <p class="footer-text">
      Generated by Equi · Not a clinical diagnosis · For discussion with your healthcare provider only<br>
      Zero AI data retention — your data was not stored by the AI provider<br>
      Raw journal entries, community posts, and psychiatrist contact details are never included
    </p>
  </div>

</div>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller identity
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !user) return new Response('Unauthorized', { status: 401 });

    const { report_id, share_ttl_seconds = 3600 } = (await req.json()) as RequestBody;

    // Fetch report — verify ownership
    const { data: report, error: reportErr } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('id', report_id)
      .eq('user_id', user.id)
      .single();

    if (reportErr || !report) return new Response('Report not found', { status: 404 });

    // Fetch user's display name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const userName = profile?.display_name ?? user.email?.split('@')[0] ?? 'User';

    // Build HTML
    const html = buildReportHtml(
      report.report_json as ReportJSON,
      report.period_start,
      report.period_end,
      userName,
    );

    // Render PDF via Puppeteer + @sparticuz/chromium
    // Note: first invocation fetches Chromium binary (~50 MB); cached thereafter.
    // deno-lint-ignore no-explicit-any
    const chromium = (await import('npm:@sparticuz/chromium@123')) as any;
    // deno-lint-ignore no-explicit-any
    const puppeteer = (await import('npm:puppeteer-core@22')) as any;

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer: Uint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();

    // Upload to Storage: reports/{user_id}/{report_id}.pdf
    const storagePath = `${user.id}/${report_id}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    // Update ai_reports.pdf_url with a permanent path reference
    await supabase
      .from('ai_reports')
      .update({ pdf_url: storagePath })
      .eq('id', report_id);

    // Create signed URL
    const { data: signedData, error: signErr } = await supabase.storage
      .from('reports')
      .createSignedUrl(storagePath, share_ttl_seconds);

    if (signErr || !signedData) throw new Error('Failed to create signed URL');

    const expiresAt = new Date(Date.now() + share_ttl_seconds * 1000).toISOString();

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, expires_at: expiresAt }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
