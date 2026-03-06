# 4E Implementation Summary — Enhanced AI

**Status:** ✅ Implemented
**Design doc:** [4e-enhanced-ai.md](./4e-enhanced-ai.md)

---

## What Was Built

Phase 4E upgrades the AI layer across four dimensions:

1. **Richer weekly report** — sleep and social rhythm data (from Phase 4A/4B) are now passed to the Groq prompt. The AI produces real `sleep_correlation`, `social_rhythm`, and `activity_suggestions` fields.
2. **30-day monthly report** — second report type using a 30-day window and a trend-focused prompt. Adds `longest_stable_period`.
3. **AI activity recommendations** — compatible activities for the user's current cycle state are fed to the prompt; the AI returns 2–4 suggestions displayed in the Activities tab.
4. **Community content moderation** — Perspective API + LLM two-step pipeline for `community_posts`.
5. **Inline tracker insight** — rule-based (no Groq) insight chip below the 90-day cycle graph.

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/functions/moderate-post/index.ts` | Edge Function: Perspective API → Groq Llama 3.2 3B moderation pipeline |
| `supabase/migrations/4e_ai_enhanced.sql` | `report_type` check constraint (`weekly`\|`monthly`); webhook config notes |

## Files Modified

| File | Change |
|---|---|
| `lib/groq.ts` | Extended `ReportData` with `sleepLogs`, `socialRhythmLogs`, `compatibleActivities`; split into `WEEKLY_SCHEMA` + `MONTHLY_SCHEMA`; added `BASE_SYSTEM_PROMPT` with sleep/social/activity rules; added `buildMonthlyReportMessages()` |
| `stores/ai.ts` | Added `latestMonthlyReport`, `trackerInsight`, `isGeneratingMonthly`; extracted `collectReportData()` helper; added `generateMonthly()`, `loadTrackerInsight()`; retry + partial fallback in `parseGroqReport()` |
| `app/(tabs)/activities.tsx` | "Suggested for this week" section populated from `latestReport.activity_suggestions` |
| `app/(tabs)/you/ai-report.tsx` | Weekly/monthly toggle; `social_rhythm` section with progress bar; `activity_suggestions` section; `longest_stable_period` for monthly view |
| `app/(tabs)/tracker.tsx` | Inline insight chip below 90-day graph; calls `ai.loadTrackerInsight()` on mount |

---

## Architecture

### Weekly report data flow (Phase 4E additions)

```
generate(userId)
  → collectReportData(userId, start, end)
      → sleep_logs (last 7 days)
      → social_rhythm_logs (last 7 days)
      → activities filtered by compatible_states ⊇ [currentState]
  → buildReportMessages(reportData)
      → BASE_SYSTEM_PROMPT + sleep/social/activity rules
      → WEEKLY_SCHEMA with social_rhythm, activity_suggestions
  → callGroq(messages) → parseGroqReport() [retry on bad JSON]
  → insert ai_reports { report_type: 'weekly' }
```

### Monthly report

```
generateMonthly(userId)
  → same collectReportData() but daysBack=29
  → buildMonthlyReportMessages()
      → BASE_SYSTEM_PROMPT + MONTHLY_EXTRA_RULES
      → MONTHLY_SCHEMA (cycle_overview.days: [], adds longest_stable_period)
  → insert ai_reports { report_type: 'monthly' }
```

### Tracker insight (rule-based)

```
loadTrackerInsight(userId)
  → query cycle_logs last 14 days
  → buildTrackerInsight(logs) — pure function, no network call
      → streak of current state
      → transition count
      → returns 1–2 sentence string
  → set({ trackerInsight })
```

### Community moderation

```
community_posts INSERT
  → Database Webhook → moderate-post Edge Function
      → Perspective API: max score across TOXICITY, IDENTITY_ATTACK, INSULT, THREAT
          > 0.85 → rejected:toxicity
          < 0.60 → approved:perspective
          0.60–0.85 → Groq llama-3.2-3b-preview LLM review
              REJECT → rejected:llm_review
              APPROVE → approved:llm
      → UPDATE community_posts SET moderation_status
```

---

## Key design decisions

| Decision | Rationale |
|---|---|
| `db = supabase as any` escape hatch | `Database` type only covers `profiles` + `emergency_contacts`; rather than duplicate the full schema in `Database`, a single typed escape hatch keeps the query code readable |
| Retry on bad JSON (not temp=0.2) | `callGroq` doesn't expose temperature; a plain retry is sufficient — Groq rarely fails twice on the same prompt |
| Partial fallback report | Never show a blank report; a degraded result is better than an error screen |
| Rule-based tracker insight | Offline-safe, zero latency, zero hallucination risk; simple rules cover all meaningful patterns |
| Fail open in `moderate-post` | Missing credentials or network errors → `approved`; silencing users in a mental health context is worse than passing borderline content |
| LLM content truncated to 1000 chars | Prevents prompt injection via long posts; Perspective already scored the full text |

---

## `ReportJSON` additions (Phase 4E)

```ts
social_rhythm:        string | null;   // narrative from AI on 7-day average
activity_suggestions: string[];        // 2–4 activity names for the coming week
longest_stable_period?: string;        // monthly only
```

---

## Deployment checklist

1. Run `4e_ai_enhanced.sql` migration in Supabase SQL editor.
2. Deploy `moderate-post` Edge Function:
   ```bash
   supabase functions deploy moderate-post
   ```
3. Set Edge Function secrets:
   ```bash
   supabase secrets set PERSPECTIVE_API_KEY=your_key
   supabase secrets set GROQ_API_KEY=your_key
   ```
4. Create Database Webhook in Supabase dashboard:
   - Name: `moderate-post`
   - Table: `community_posts`
   - Events: `INSERT`
   - URL: `https://<project>.supabase.co/functions/v1/moderate-post`
   - HTTP method: POST

---

## Notes

- `PERSPECTIVE_API_KEY` is optional — if absent, all posts go straight to LLM review.
- `GROQ_API_KEY` is optional — if absent (and Perspective unavailable), posts are approved (fail open).
- Monthly reports are generated on demand only; no scheduled generation.
- The Activities tab reads `latestReport.activity_suggestions` — only the weekly report populates this field (monthly uses the same schema but `activity_suggestions` may differ).
