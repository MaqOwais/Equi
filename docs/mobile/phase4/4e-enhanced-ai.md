# Phase 4E — Enhanced AI

Upgrades the AI layer in three dimensions: richer data (sleep + social rhythm now available from 4A/4B), longer time horizon (30-day analysis alongside the weekly report), and proactive outputs (cycle-aware activity recommendations). Also adds the community content moderation Edge Function that was deferred from Phase 3D.

← [Phase 4 README](./README.md)

---

## Upgraded Weekly Report

The weekly report prompt (in `lib/groq.ts`) gains two new data sections: sleep correlation and social rhythm. These were placeholders in Phase 3E — in Phase 4E they contain real numbers.

### New prompt data fields

```ts
interface ReportData {
  // Existing (Phase 3E)
  moodLogs:         { date: string; score: number }[];
  cycleLogs:        { date: string; state: string; intensity: number }[];
  checkins:         { date: string; alcohol: boolean; cannabis: boolean }[];
  medicationLogs:   { date: string; status: string; skip_reason?: string }[];
  activityNames:    string[];
  relapseSignature: { manic: string[]; depressive: string[] } | null;

  // New in Phase 4E
  sleepLogs: {
    date: string;
    duration_minutes: number;
    quality_score: number;
  }[];
  socialRhythmLogs: {
    date: string;
    score: number;
    anchors_hit: number;
    anchors_total: number;
  }[];
  nutritionLogs: {
    date: string;
    categories: Record<string, number>;  // category name → serving count
  }[];
}
```

### Updated system prompt additions

Appended to the existing system prompt in `lib/groq.ts`:

```
SLEEP CORRELATION RULES:
- Calculate average sleep duration on depressive days vs. stable days.
- If average sleep duration changed in the 48h before a cycle state transition, note it.
- Do not state causation — say "sleep improved before mood lifted", not "sleep caused the improvement".
- If no sleep data is available, omit this section entirely.

SOCIAL RHYTHM RULES:
- Report the 7-day average social rhythm score as a percentage.
- Identify the lowest-scoring anchor by name if anchor_detail is available.
- Note the direction (improving/declining) compared to the prior 7-day average if calculable.
- Do not recommend specific times — only describe what was observed.
```

### Updated `ReportJSON` type

```ts
export interface ReportJSON {
  // Existing
  summary:              string;
  cycle_overview:       { days: { date: string; state: string }[]; insight: string };
  early_warning_flags:  string[];
  top_mood_triggers:    string[];
  activities_completed: string[];
  medication_adherence: string | null;
  substances:           string | null;
  nutrition_mood:       string | null;

  // New in Phase 4E (nullable — omitted if data unavailable)
  sleep_correlation:    string | null;   // already in Phase 3E schema; now populated
  social_rhythm:        string | null;   // NEW
  activity_suggestions: string[];        // NEW — recommended activities for next 7 days
}
```

---

## 30-Day Pattern Report

A second, longer-horizon report type generated monthly (or on demand). Uses the same Groq pipeline but with a 30-day data window and a different system prompt focused on trend detection rather than weekly summary.

### New report type field

```sql
alter type (or add a check):
-- In ai_reports table, add:
report_type  text default 'weekly'  -- 'weekly' | 'monthly'
```

### Monthly prompt focus

- Longest stable period in the last 30 days.
- Average episode duration (manic, depressive) vs. user's lifetime average (if calculable).
- Whether social rhythm score is trending up or down over 4 weeks.
- Whether sleep duration correlates with cycle transitions over the month.
- Whether any activities are consistently associated with better mood days.
- Activities the user has not tried that are compatible with their current cycle state.

### UI placement

On the AI Wellness Report screen, add a "30-day view" toggle alongside the existing weekly report. Monthly reports are generated on demand (not scheduled) — the user taps "Generate monthly report".

<details>
<summary>View wireframe (report type toggle)</summary>

```
┌─────────────────────────────┐
│  AI Wellness Report         │
│                             │
│  ┌──────────┬─────────────┐ │
│  │  Weekly  │  30 Days ▸  │ │  ← toggle
│  └──────────┴─────────────┘ │
│                             │
│  Feb 24 – Mar 1, 2026       │
│  ...                        │
└─────────────────────────────┘
```

</details>

---

## AI Activity Recommendations

Each weekly report now includes an `activity_suggestions` array: 2–4 activity names from the Equi activities library that the AI recommends for the coming week, based on:

- Current cycle state
- Activities completed (or not) in the past 7 days
- Mood trajectory (improving/declining)

**Constraint in prompt:**
```
ACTIVITY SUGGESTION RULES:
- Only suggest activities from the provided compatible_activities list.
- Do not suggest activities marked as restricted for the user's current cycle state.
- Do not suggest activities the user completed 3+ times this week (avoid repetition).
- Suggest 2-4 activities. No more.
- Format: plain activity names only, no explanation in this field.
```

**UI:** A new "Suggested for this week" section at the top of the Activities tab — populated from the latest report's `activity_suggestions`. Tapping navigates to the activity detail screen.

<details>
<summary>View wireframe (Activities tab — suggested section)</summary>

```
┌─────────────────────────────┐
│  Activities                 │
│                             │
│  SUGGESTED FOR THIS WEEK    │
│  Based on your recent data  │
│  ┌───────────────────────┐  │
│  │  🌬  Box Breathing    │  │
│  │  5 min · Grounding    │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  🚶  Morning Walk     │  │
│  │  20 min · Movement    │  │
│  └───────────────────────┘  │
│                             │
│  ALL  │  PRESCRIBED  │  ★   │
│  ─────────────────────────  │
│  ...                        │
└─────────────────────────────┘
```

</details>

---

## Community Content Moderation

Deferred from Phase 3D. Added here because it requires an Edge Function and is a lower priority than wearable + sleep work.

**Architecture:**

```
User submits post
    │
    ▼
community_posts inserted with status='pending'
    │
    ▼
Supabase Edge Function: moderate-post
    ├── Step 1: Perspective API (Google)
    │   Attributes checked: TOXICITY, IDENTITY_ATTACK, INSULT, THREAT
    │   If any score > 0.85 → reject immediately (status='rejected')
    │   If any score 0.6–0.85 → escalate to LLM review
    │   If all scores < 0.6 → approve (status='approved')
    │
    └── Step 2: LLM review (escalated cases only)
        Model: llama-3.2-3b-preview via Groq (fast, cheap)
        System prompt: mental health community context + bipolar-aware guidelines
        If LLM flags → status='rejected'
        Else → status='approved'
    │
    ▼
status updated in community_posts
    │
    ▼
Approved → visible to all
Rejected → visible only to author (same as pending UX — no explicit rejection message)
```

**Edge Function trigger:** `on insert` on `community_posts` via Supabase Database Webhooks.

**`supabase/functions/moderate-post/index.ts`:**

```ts
Deno.serve(async (req) => {
  const { record } = await req.json();  // webhook payload
  const { id, content } = record;

  // Step 1: Perspective API
  const perspectiveRes = await fetch(
    `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        comment: { text: content },
        requestedAttributes: { TOXICITY: {}, IDENTITY_ATTACK: {}, THREAT: {} },
      }),
    }
  );
  const scores = await perspectiveRes.json();
  const maxScore = Math.max(...Object.values(scores.attributeScores)
    .map((a: any) => a.summaryScore.value));

  if (maxScore > 0.85) {
    await setStatus(id, 'rejected');
    return new Response('rejected');
  }

  if (maxScore < 0.6) {
    await setStatus(id, 'approved');
    return new Response('approved');
  }

  // Step 2: LLM escalation
  const llmVerdict = await callGroq([
    { role: 'system', content: MODERATION_SYSTEM_PROMPT },
    { role: 'user', content: `Review this post: "${content}"\nReply with only: APPROVE or REJECT` },
  ], 'llama-3.2-3b-preview');

  await setStatus(id, llmVerdict.trim() === 'APPROVE' ? 'approved' : 'rejected');
  return new Response(llmVerdict);
});
```

**Moderation system prompt (`MODERATION_SYSTEM_PROMPT`):**
```
You are a content moderator for a mental health community for people with bipolar disorder.
The community guidelines are:
- No advice to stop medication
- No glorification of self-harm
- No personally identifiable information about others
- No commercial promotion
- No diagnosis of others

Approve posts that discuss lived experience, ask for support, share coping strategies, or describe symptoms honestly.
Do not reject posts for being emotionally intense — people in crisis deserve a space to speak.
Reply with only: APPROVE or REJECT
```

---

## Inline Tracker Insight

A small AI insight chip below the 90-day cycle wave in the Tracker tab. Already shown in the `cycle-tracking.md` wireframe. Phase 4E wires this up.

**Logic (`stores/ai.ts`):**
```ts
async function generateTrackerInsight(userId: string): Promise<string> {
  // Pull last 14 days of cycle logs
  // Simple rule-based engine (no Groq call — offline-safe):
  //   "You've been stable for N days."
  //   "Your last [state] episode was X days — [shorter/longer] than your avg of Y."
  //   "You've had [N] transitions in the last 14 days."
  // Returns 1-2 sentence string
}
```

This is intentionally rule-based (not Groq) — it runs offline, has no latency, and cannot hallucinate. The insight refreshes when the tracker screen loads.

---

## Implementation Notes

### Prompt length management

With sleep + social data, the weekly report prompt grows. Monitor token usage — Llama 3.1 70B via Groq has a 32K context window, which is ample, but keep prompt + data under 6K tokens to leave room for the response.

If data volume grows (user has 90 days of logs), summarise older data:
- Sleep: include only last 7 days of nightly records; include 30-day averages as a single line.
- Social rhythm: same approach.
- Activities: include only activity names, not full metadata.

### Error handling in ai.ts

If the LLM response cannot be parsed as valid JSON:
1. Retry once with `temperature: 0.2` (more deterministic).
2. If retry fails, store raw text in `report_json.raw_fallback` and show a "Report partially generated" message.
3. Never show a blank or errored report — always show what was successfully parsed.

### Model upgrade path

Phase 4E ships with `llama-3.1-70b-versatile`. If a finer-tuned clinical model becomes available on Groq (e.g., BioMistral), it can be swapped by changing the model string in `lib/groq.ts` with no other changes required — the prompt is model-agnostic.

---

## Files to Update

| File | Change |
|---|---|
| `lib/groq.ts` | Add sleep + social fields to `ReportData`; extend system prompt; extend `ReportJSON` type |
| `stores/ai.ts` | Include `sleep_logs` + `social_rhythm_logs` in data collection; add `generateMonthlyReport`; add `generateTrackerInsight` |
| `stores/ai.ts` | `activity_suggestions` → write to a field accessible by Activities tab |
| `app/(tabs)/activities.tsx` | "Suggested for this week" section from `latestReport.activity_suggestions` |
| `app/(tabs)/you/ai-report.tsx` | Weekly/monthly toggle; social rhythm section (now real); sleep section (now real) |
| `app/(tabs)/tracker.tsx` | Inline insight chip below the wave chart |
| `supabase/functions/moderate-post/` | New Edge Function |
| `supabase/migrations/4e_*.sql` | `report_type` column on `ai_reports`; `moderate-post` webhook setup |

---

## Checklist

- [ ] `lib/groq.ts` — sleep + social data in prompt; extended `ReportJSON` type; 30-day system prompt variant
- [ ] `stores/ai.ts` — sleep + social data collection; monthly report; tracker insight; activity suggestions
- [ ] Activities tab — "Suggested for this week" section populated from latest report
- [ ] AI Report screen — weekly/monthly toggle; social rhythm + sleep sections now real
- [ ] Tracker tab — inline insight chip (rule-based, offline-safe)
- [ ] Edge Function `moderate-post` — Perspective API + Llama 3.2 3B pipeline
- [ ] Database Webhook wired to `moderate-post` on `community_posts` insert
- [ ] `supabase/migrations/4e_ai_enhanced.sql` — `report_type` column + webhook config
- [ ] Error handling in `stores/ai.ts` — retry + raw_fallback
