# 3E — AI, Insights & Safety

**Goal:** The intelligence layer of the app. AI Wellness Reports synthesise all tracked data into actionable weekly insights. Relapse signatures personalise early-warning detection. Profile & Settings centralise user identity and preferences. Crisis Mode provides a life-saving overlay accessible from anywhere.

---

## Screens

- `app/(tabs)/you/ai-report.tsx` — AI Wellness Report
- `app/(tabs)/you/relapse-signature.tsx` — Relapse Signature Builder
- `app/(tabs)/you.tsx` + sub-screens — Profile & Settings
- `components/ui/CrisisOverlay.tsx` — Crisis Mode (full-screen modal, not a route)

---

## Supabase Schema

### `ai_reports`

```sql
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  report_type text not null,     -- 'weekly' | 'monthly'
  period_start date not null,
  period_end date not null,
  report_json jsonb not null,    -- structured Groq output
  pdf_url text,                  -- Supabase Storage URL
  created_at timestamptz default now()
);
alter table ai_reports enable row level security;
create policy "own reports" on ai_reports using (auth.uid() = user_id);
```

### `relapse_signatures`

```sql
create table relapse_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  episode_type text not null,     -- 'manic' | 'depressive'
  warning_signs text[],           -- 1–3 personal early warning signs
  days_before smallint,           -- timing slider 1–14
  noticed_by text,                -- 'me' | 'both' | 'people_around_me'
  created_at timestamptz default now(),
  unique (user_id, episode_type)
);
alter table relapse_signatures enable row level security;
create policy "own signatures" on relapse_signatures using (auth.uid() = user_id);
```

---

## Zustand Store

### `stores/ai.ts`

```ts
interface AIStore {
  latestReport: AIReport | null;
  loading: boolean;
  generate: () => Promise<void>;         // calls Groq, writes to ai_reports
  exportPDF: (reportId: string) => Promise<string>; // returns Storage URL
}
```

---

## AI Integration (Groq)

### Client (`lib/groq.ts`)

```ts
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function callGroq(
  messages: ChatMessage[],
  model = 'llama-3.1-70b-versatile'
) {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      store: false,   // zero data retention
    }),
  });
  return res.json();
}
```

Add `EXPO_PUBLIC_GROQ_API_KEY` to `mobile/.env.local`.

### Models used

| Task | Model | Reason |
|---|---|---|
| AI Wellness Report | `llama-3.1-70b-versatile` | Complex structured analysis |
| Community moderation | `llama-3.2-3b-preview` | Fast, cheap, sufficient for classification |
| Nutrition voice input (Phase 4) | `llama-3.1-70b-versatile` | Category extraction from free speech |

### Zero retention rules

- All Groq calls include `"store": false`
- Raw journal text is **never sent to Groq** — only derived signals (mood score, sentiment polarity, cycle state) are included
- Substance and medication data is only included if the user has enabled sharing with psychiatrist (double-opt-in)
- No user identifiers in any Groq prompt — all data is anonymised before transmission

---

## Screen Specs

### AI Wellness Report (`app/(tabs)/you/ai-report.tsx`)

#### Triggering a report

Reports are generated two ways:
1. **Automatic:** Supabase Edge Function cron runs every Sunday at 08:00 UTC per user's timezone. Writes to `ai_reports`.
2. **On demand:** User taps "Generate Now" — calls the same Edge Function via RPC.

#### Data collected for each report (last 7 days)

| Source table | Data used | Notes |
|---|---|---|
| `mood_logs` | Daily scores | Averaged + trend |
| `cycle_logs` | State per day, intensity | Dominant state, fluctuations |
| `journal_entries` | `mood_score`, `cycle_state`, `sleep_hours` | Snapshotted fields only — no raw text |
| `sleep_logs` | Hours + quality | Correlation with mood |
| `activity_completions` | Activity names + dates | No personal notes |
| `daily_checkins` | Alcohol, cannabis flags | Aggregated only |
| `medication_logs` | Status per day | Only if `share_with_psychiatrist = true` on logs |
| `nutrition_logs` | Category counts per day | Only if ≥3 days of data |
| `social_rhythm_logs` | Anchor times vs targets | Consistency score |
| `relapse_signatures` | Warning signs + timing | Cross-referenced against current data |
| `life_events` | Event titles + dates | Included as context |

#### Report sections

| Section | Shown when |
|---|---|
| AI Summary (2–3 sentences) | Always |
| Cycle Overview (per-day state dots) | Always |
| Sleep Correlation | Sleep data exists |
| Activities Completed | Always |
| Top Mood Triggers (AI-inferred) | Always |
| Social Rhythm Consistency % | ≥3 social rhythm logs |
| Medication Adherence | `track_medication = true` AND `share_with_psychiatrist` on ≥1 log |
| Substances | Check-in data exists |
| Nutrition & Mood | ≥3 days of nutrition logs |
| Life Events | Life events exist in the period |
| Early Warning Flags | Relapse signatures are set up |

#### Groq prompt structure

```
You are a clinical wellness assistant for a bipolar disorder monitoring app.
Analyse the following anonymised health data and generate a structured weekly report.
Be warm, non-judgmental, and clinically careful.
Never diagnose. Never prescribe. Never claim causation.
Cross-reference the user's relapse signatures against current patterns and flag matches clearly.

DATA:
[JSON of collected data — no raw text, no user identifiers]

RESPOND WITH JSON matching this schema:
{
  "summary": "string",
  "cycle_overview": {
    "days": [{ "date": "ISO", "state": "cycle_state", "intensity": 0-10 }],
    "dominant_state": "cycle_state",
    "insight": "string"
  },
  "sleep_correlation": "string | null",
  "activities_completed": ["string"],
  "top_mood_triggers": ["string"],
  "social_rhythm_score": 0-100,
  "medication_adherence": "string | null",
  "substances": "string | null",
  "nutrition_mood": "string | null",
  "life_events_noted": ["string"],
  "early_warning_flags": ["string"]
}
```

#### Screen layout

```
┌──────────────────────────────────────────┐
│  AI Wellness Report                      │
│  Week of Mar 3–9, 2026                   │
│                       [Export PDF]       │
│                                          │
│  ── Summary ──────────────────────────── │
│  "You had a mostly stable week with      │
│   two elevated days mid-week..."         │
│                                          │
│  ── Cycle Overview ───────────────────── │
│  Mon 🟢 Tue 🟢 Wed 🔵 Thu 🔵 Fri 🟢     │
│  Sat 🟢 Sun 🟢                           │
│                                          │
│  ── Sleep ────────────────────────────── │
│  [ReportSection — collapsible]           │
│                                          │
│  ── Activities ───────────────────────── │
│  [ReportSection — collapsible]           │
│                                          │
│  ── Early Warning Flags ─────────────── │
│  ⚠️ Racing thoughts appeared 2 days      │
│     before your last manic episode.      │
│     You logged them on Wed and Thu.      │
│                                          │
│  [More sections...]                      │
└──────────────────────────────────────────┘
```

Each section uses the `ReportSection` component (collapsible, with icon).

**Early Warning Flags** use amber/gold (`#C9A84C`) — never red. They are informational, not alarming.

**PDF export:** Edge Function generates a styled PDF from `report_json`, stores in Supabase Storage, writes URL to `ai_reports.pdf_url`. "Export PDF" opens the native share sheet.

---

### Relapse Signature Builder (`app/(tabs)/you/relapse-signature.tsx`)

One builder each for manic and depressive episode signatures. Accessible from Profile → "My Relapse Signatures".

**Step 1 — Warning signs:**
- "What are your personal early warning signs for a [manic/depressive] episode?"
- 1–3 text inputs (require at least 1)
- Examples shown as placeholder text: "I start sleeping less but feel fine", "I withdraw from everyone", "I start making big plans"

**Step 2 — Timing:**
- Slider: "How many days before a full episode do you typically notice these signs?"
- Range: 1–14 days
- Label updates as slider moves: "About 7 days before"

**Step 3 — Who notices:**
- Radio pick: "Me first" / "Both at the same time" / "People around me first"

**Save:** Upserts to `relapse_signatures`. The AI report's "Early Warning Flags" section cross-references the current week's data against these signatures.

---

### Profile & Settings (`app/(tabs)/you.tsx`)

**Root screen layout:**

```
┌──────────────────────────────────────────┐
│  [A]  Anonymous member                   │ ← initials avatar, no photo
│       Member since Jan 2026              │
│                                          │
│  142 days · 38 activities · 89 stable   │
│                                          │
│  [WellnessRadar hexagon chart]           │
│                                          │
│  SETTINGS                                │
│  🔔 Notifications              →        │
│  ⌚ Wearable Sync               →        │
│  🆘 Emergency Contacts         →        │
│  🔑 My Relapse Signatures      →        │
│  💊 Medication Tracking    [toggle]     │
│  🎨 Themes & Ambiance          →        │
│  ❤️  Support Equi (Donate)      →        │
│  📋 My Diagnosis Info          →        │
│  📤 Export My Data             →        │
│  🔒 Privacy Settings           →        │
│  ──────────────────────────────────     │
│  Sign Out                                │
└──────────────────────────────────────────┘
```

**WellnessRadar component:** Hexagon chart with 6 axes. Scores computed from last 30 days:

| Axis | Source | Formula |
|---|---|---|
| Mood | `mood_logs.score` | Average, normalised 0–100 |
| Sleep | `sleep_logs.quality_percent` | Average |
| Activity | `activity_completions` count | vs 30-day target (configurable) |
| Social | `social_rhythm_logs` consistency | Average variance from targets, inverted |
| Mindful | Grounding category completions | Count, capped at 100 |
| Journal | `journal_entries` count | Days logged / 30 |

**Stats row:** "142 days tracked" = rows in `mood_logs`. "38 activities" = `activity_completions` count. "89 stable" = days in `cycle_logs` where `state = 'stable'`.

**Medication Tracking toggle:** Inline toggle. Toggling off doesn't delete data — sets `profiles.track_medication = false`. Toggling on re-enables the medication rows in Home and the Medication screen.

#### Themes & Ambiance sub-screen (`app/(tabs)/you/themes.tsx`)

6 ambient scenes used as optional Journal screen backgrounds:

| Scene | Background | Audio |
|---|---|---|
| Beach | Looping image or video | Ocean waves |
| Mountains | Looping image | Wind, silence |
| Forest | Looping image | Birds, rustling |
| Fireplace | Looping video | Crackling fire |
| Rain | Looping image | Rain on glass |
| Night Sky | Looping image | Crickets, silence |

Each scene has a volume slider (0–100). Preference saved to `profiles.theme` (jsonb).

#### Export My Data

Generates a zip file containing:
- All `mood_logs`, `cycle_logs`, `journal_entries`, `activity_completions`, `medication_logs`, `nutrition_logs`, `social_rhythm_logs` as CSV
- All `ai_reports` as JSON
- All `workbook_responses` as plain text

Triggered via Supabase Edge Function → returns a download URL valid for 24h.

#### Privacy Settings sub-screen

- Analytics: OFF (no third-party analytics SDKs in the app)
- "Data retention" — link to privacy policy
- "Delete my account" — triggers Supabase `auth.admin.deleteUser` (or an Edge Function), cascades to all tables via FK constraints

---

### Crisis Mode (`components/ui/CrisisOverlay.tsx`)

A full-screen modal overlay — not a route. Triggered by the SOS button on Home. Must work fully offline (emergency contacts cached in AsyncStorage on every app open).

```
┌──────────────────────────────────────────┐
│                            ✕ Close       │
│                                          │
│      You are not alone.                  │
│                                          │
│  CALL SOMEONE YOU TRUST                  │
│  ┌────────────────────────────────────┐  │
│  │  Mum — +1 555 0100   [Call]       │  │
│  │  Dr Aisha — +1 555 0200 [Call]    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  NATIONAL CRISIS LINES                   │
│  📞 988 Suicide & Crisis Lifeline        │
│  💬 Crisis Text: text HOME to 741741     │
│  📞 NAMI Helpline: 1-800-950-6264        │
│                                          │
│  GROUNDING TOOLS                         │
│  ┌── 54321 Grounding ─────────────────┐  │
│  │  Name 5 things you can see...      │  │
│  │  [Guided step-through UI]          │  │
│  └────────────────────────────────────┘  │
│  ┌── 1-Minute Breathing ──────────────┐  │
│  │  [Animated breathing circle]       │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Design rules (exception to global rules):**
- Red IS acceptable here (Design Rule #1 exception)
- Use red for "Call" button backgrounds and the header accent
- Close button visible but not prominent — encourage tool use before dismissal

**Implementation:**
- `Linking.openURL('tel:+15550100')` for call buttons
- `Linking.openURL('sms:741741?body=HOME')` for Crisis Text Line
- Emergency contacts loaded from `emergency_contacts` table on app start, cached in AsyncStorage → overlay works offline
- 54321 Grounding: step-through component — tap to advance each sense (see / hear / feel / smell / taste)
- Breathing circle: animated expansion/contraction, 4s in / 4s hold / 4s out

**No analytics on this screen.** No logging of how many times SOS is pressed (privacy-critical). Guardian alert does fire for the `alert_on_risk` trigger (SOS tapped).

---

## Safety Systems (Platform-Wide)

These are built into the platform at the store/hook level, not just individual screens.

### Mood rumination circuit

- **Trigger:** `mood_logs.score ≤ 3` for 2+ consecutive days
- **Detection:** Run on each `logMood()` call in `stores/today.ts`
- **Response:** A gentle prompt card appears on Home above the SOS button — "It looks like you've had a few hard days. Would you like some grounding activities?"
- **Hard limits:** Max 1 mood log per day. Prompt shown once per triggering event (not on every open).
- **No push notification** — in-app only, on next app open

### Phase gating for activities

- **Trigger:** `profiles.current_cycle_state = 'manic'`
- **Response:** Gratitude Jar, Compliment Diary, Proud Dandelion removed from recommendations
- **Scope:** Recommendations only (Home suggestions + Activities "All" filtered view). Not blocked in search.
- **Implementation:** `restricted_states` column on `activities` table. Filter: `NOT (restricted_states @> ARRAY[current_cycle_state])`

### Guardian high-risk auto-alerts

Fires when a companion has `guardian_level = 'alert_on_risk'` or `'full_control'`:

| Trigger | Detection |
|---|---|
| Mood ≤ 2/10 for 2+ consecutive days | Checked in `logMood()` — if consecutive low days, Supabase Edge Function sends push to guardian |
| SOS button tapped | `CrisisOverlay` mount fires a silent Edge Function call |
| No journal entry for 3+ days | Nightly cron on Edge Function checks `journal_entries` |
| Manic symptoms logged 2+ consecutive days | Checked in `logCycleState()` when `state = 'manic'` |

Patient sees a full log of all alerts sent in the Support Network screen (timestamped list).

### Evidence labelling

All `activities.evidence_label` values are written honestly:
- "Supported by positive psychology research"
- "Based on IPSRT (Interpersonal Social Rhythm Therapy)"
- "Mindfulness — evidence mixed for bipolar; use with care during elevated phases"
- "Grounding technique — widely used in clinical practice"

No extrapolated bipolar claims. No "proven to treat" language.

### Community crisis moderation

- Two-layer pipeline: Perspective API + Llama 3.2 3B (detailed in 3D)
- Crisis hotline pinned at top of every channel — non-dismissible
- Users always get an edit path — posts are never silently removed

### Zero AI data retention

- All Groq API calls include `store: false`
- Raw journal text never transmitted
- No third-party analytics SDKs
- No user identifiers in AI prompts
