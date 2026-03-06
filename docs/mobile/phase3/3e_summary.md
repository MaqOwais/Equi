# 3E Implementation Summary — AI, Insights & Safety

**Status:** ✅ Complete
**Migration:** `mobile/supabase/migrations/3e_ai_safety.sql`

---

## What Was Built

### Files Created
| File | Description |
|---|---|
| `lib/groq.ts` | Groq API client (`callGroq`), `buildReportMessages`, `ReportData` type |
| `stores/ai.ts` | `loadLatest`, `generate` — collects 7-day data, calls Groq, parses JSON, upserts |
| `stores/crisis.ts` | Minimal Zustand store: `visible`, `open()`, `close()` |
| `components/ui/CrisisOverlay.tsx` | Full-screen Modal: Contacts tab, 5-4-3-2-1 grounding, breathing animation |
| `app/(tabs)/you/ai-report.tsx` | AI Wellness Report screen — collapsible sections, cycle day dots, empty state |
| `app/(tabs)/you/relapse-signature.tsx` | Relapse Signature Builder — manic/depressive tabs, 3-step builder |

### Files Modified
| File | Change |
|---|---|
| `app/_layout.tsx` | Added `<CrisisOverlay />` render at root (outside Stack) |
| `app/(tabs)/index.tsx` | Imported `useCrisisStore`; SOS button wired to `crisis.open` |
| `app/(tabs)/you/index.tsx` | Full rewrite: Wellness Radar (SVG hexagon), stats row, AI & Insights section, medication toggle, Social section links |

---

## SQL Schema Added

```sql
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  period_start date not null,
  period_end date not null,
  report_json jsonb not null,
  model_used text,
  generated_at timestamptz default now()
);

create table relapse_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  episode_type text not null,   -- 'manic' | 'depressive'
  warning_signs text[] not null default '{}',
  days_before_episode int default 7,
  who_notices_first text default 'self',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, episode_type)
);

-- emergency_contacts already created in 3A — no duplicate
```

---

## Groq Integration

- **Model:** `llama-3.1-70b-versatile` via `https://api.groq.com/openai/v1`
- **Zero retention:** All requests sent with `store: false`
- **Data sent to Groq:** Mood scores, cycle states, activity names, check-in booleans, medication status. **Raw journal text is never sent.**
- **System prompt rules:** No diagnoses, no medication advice, no causal language (correlation only), structured JSON output enforced.
- **API key:** `EXPO_PUBLIC_GROQ_API_KEY` in `mobile/.env.local`

### `ReportJSON` shape (stored in `ai_reports.report_json`):
```ts
{
  summary: string;
  cycle_overview: { days: { date: string; state: string }[]; insight: string };
  early_warning_flags: string[];
  top_mood_triggers: string[];
  activities_completed: string[];
  sleep_correlation: string | null;
  medication_adherence: string | null;
  substances: string | null;
  nutrition_mood: string | null;
}
```

---

## CrisisOverlay Architecture

- Rendered at root layout level (not as a route) so it is always accessible regardless of navigation state.
- `useCrisisStore` (`visible`, `open`, `close`) controls visibility.
- Three tabs: **Contacts** (emergency contacts from Supabase, cached in AsyncStorage for offline use), **5-4-3-2-1 Grounding** (step-through component), **Breathing** (4s inhale / 4s hold / 4s exhale animated circle).
- Emergency contacts loaded from `AsyncStorage` first (instant, works offline), then refreshed from Supabase on open.
- **Red call buttons** — the only use of red in the app. Permitted by Design Rule #1 exception for crisis UI.
- Crisis lines hardcoded (988, Crisis Text Line 741741, NAMI 1-800-950-6264) — not from database.

---

## Wellness Radar (Hexagon Chart)

Built with `react-native-svg` in `you/index.tsx`. 6 axes: Mood, Sleep, Activity, Social, Mindful, Journal.

- Scores calculated from 30-day Supabase data via `Promise.all` on screen load.
- Sleep and Social axes return `0` in Phase 3E — unlocked in Phase 4A and 4B respectively.
- Hexagon math: `angle = (π/3)*i − π/2`, data point = `center + (score/100) * R * [cos, sin]`.

---

## Key Decisions Made During Implementation

- **Relapse signature timing** — Custom 14-pip visual slider (1–14 days) built without any slider library. Each pip is a `TouchableOpacity` to avoid `@react-native-community/slider` dependency.
- **AI report collapsible sections** — `ReportSection` component uses local `open` state (open by default). Each section independently collapsible.
- **AI error handling** — If Groq returns non-parseable JSON, `store.error` is set and displayed inline. The generate button re-enables for retry.
- **Early warning flags** — Highlighted in gold (`#C9A84C`) with a disclaimer: "Based on your personal relapse signatures — informational only."

---

## Bugs Fixed

- **`'CrisisOverlay' is declared but its value is never read` (TS 6133)** — Imported in `_layout.tsx` but not rendered initially. Fixed by adding `<CrisisOverlay />` to the JSX return after the `<Stack>`.

---

## Deviations from Design Doc

- PDF export button in AI Report is a visible stub (`TouchableOpacity` with no `onPress`) — full PDF generation requires the Edge Function built in Phase 4D.
- `nutrition_mood` field in `ReportJSON` populated by AI but nutritional data is only included in the prompt if ≥ 3 days of nutrition logs exist in the period.
- Community AI moderation Edge Function deferred to Phase 4E.
