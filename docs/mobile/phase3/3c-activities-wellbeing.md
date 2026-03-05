# 3C — Activities & Wellbeing

**Goal:** Content and structured tools that give users reasons to return and grow. Covers the activity library, bipolar workbook, daily routine builder, and nutrition logging.

---

## Screens

- `app/(tabs)/activities.tsx` — Activities library (3 tabs)
- `app/activity/[id].tsx` — Activity Detail
- `app/workbook.tsx` — Bipolar Workbook
- `app/(tabs)/you/routine.tsx` — Daily Routine Builder
- `app/(tabs)/you/nutrition.tsx` — Nutrition Detail

---

## Supabase Schema

### `activities` (global — no RLS, read-only for all users)

```sql
create table activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes smallint,
  category text,               -- 'grounding' | 'self_esteem' | 'sleep' | 'forgiveness' | 'reflection'
  compatible_states cycle_state[],
  restricted_states cycle_state[],
  is_workbook_entry boolean default false,
  illustration_url text,
  evidence_label text,
  created_at timestamptz default now()
);
-- No RLS — global read-only content
```

Seed data at launch. The Bipolar Workbook entry-point card has `is_workbook_entry = true`.

**Phase gating seed — these 3 activities must have `restricted_states = ARRAY['manic'::cycle_state]`:**
- Gratitude Jar
- Compliment Diary
- Proud Dandelion

### `activity_completions`

```sql
create table activity_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  activity_id uuid references activities,
  completed_at timestamptz default now(),
  cycle_state cycle_state,
  notes text,
  bookmarked boolean default false
);
alter table activity_completions enable row level security;
create policy "own completions" on activity_completions using (auth.uid() = user_id);
```

### `prescribed_activities`

```sql
create table prescribed_activities (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  psychiatrist_id uuid,
  activity_id uuid references activities,
  dosage_per_week smallint,
  goal text,
  prescribed_at timestamptz default now(),
  active boolean default true
);
alter table prescribed_activities enable row level security;
create policy "patient sees own" on prescribed_activities using (auth.uid() = patient_id);
```

### `workbook_responses`

```sql
create table workbook_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  chapter smallint not null check (chapter between 1 and 4),
  prompt_index smallint not null check (prompt_index between 0 and 3),
  response text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, chapter, prompt_index)
);
alter table workbook_responses enable row level security;
create policy "own workbook" on workbook_responses using (auth.uid() = user_id);
```

### `routine_anchors`

```sql
create table routine_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  anchor_name text not null,  -- 'wake' | 'first_meal' | 'first_contact' | 'work_start' | 'dinner' | 'bedtime'
  target_time time,
  enabled boolean default true,
  created_at timestamptz default now()
);
alter table routine_anchors enable row level security;
create policy "own anchors" on routine_anchors using (auth.uid() = user_id);
```

### `nutrition_logs`

```sql
create table nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  categories jsonb not null default '{}',
  eating_window_start time,
  eating_window_end time,
  hydration_glasses smallint,
  gut_health_note text,
  input_method text,  -- 'manual' | 'photo' | 'barcode' | 'voice' | 'healthkit'
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
alter table nutrition_logs enable row level security;
create policy "own nutrition" on nutrition_logs using (auth.uid() = user_id);
```

---

## Zustand Store

### `stores/activities.ts`

```ts
interface ActivitiesStore {
  all: Activity[];
  prescribed: PrescribedActivity[];
  bookmarked: ActivityCompletion[];
  completions: ActivityCompletion[];
  load: () => Promise<void>;
  complete: (activityId: string, notes?: string) => Promise<void>;
  toggleBookmark: (activityId: string) => Promise<void>;
}
```

---

## Screen Specs

### Activities (`app/(tabs)/activities.tsx`)

Three tabs within the screen:

**All tab:**
- List/grid of `ActivityCard` components
- Filtered by default to `compatible_states @> ARRAY[current_cycle_state]` with a `CycleStatePill` at the top showing the active filter
- User can clear the filter to see all activities
- Grouped by category with sticky section headers
- **Phase gating:** activities in `restricted_states` for the current cycle state are removed from the filtered view (still discoverable when filter is cleared)

**Prescribed tab:**
- Activities from `prescribed_activities` joined with `activities`
- Each card shows: activity name, "3×/week" dosage, psychiatrist's goal text, weekly compliance bar (completions this week / dosage target)
- Empty state: "No prescribed activities yet. Connect with a psychiatrist to receive prescriptions."

**Working for Me tab:**
- `activity_completions WHERE bookmarked = true`
- Shows completion count and last personal note
- Empty state: "Bookmark activities by tapping 🔖 on any activity"

**Phase gating note:** Gratitude Jar, Compliment Diary, Proud Dandelion are removed from phase-filtered recommendations when `current_cycle_state = 'manic'`. They remain visible when the filter is cleared. This is not a block — it's a recommendation gate.

---

### Activity Detail (`app/activity/[id].tsx`)

```
┌──────────────────────────────────────────┐
│  ←                              🔖       │
│                                          │
│  [Illustration]                          │
│                                          │
│  Gratitude Jar              15 min       │
│  [Stable chip] [Depressive chip]         │
│                                          │
│  What it does...                         │
│  [description text]                      │
│                                          │
│  Evidence: Based on positive psychology  │
│                                          │
│  ── In-App Experience ────────────────── │
│  [Activity-specific guided UI]           │
│  (text inputs, prompts, countdowns, etc) │
│                                          │
│  Past completions                        │
│  • 3 days ago — "Felt calmer after"      │
│  • 1 week ago — no note                 │
│                                          │
│         [ Mark Complete ]               │
└──────────────────────────────────────────┘
```

**Bookmark (🔖):** Toggles `activity_completions.bookmarked`. If no completion exists, creates a row with `completed_at = null` (bookmarked but not yet completed).

**Mark Complete:** Upserts `activity_completions` with `completed_at = now()`, snaps `cycle_state`. Opens a bottom sheet for optional notes. Animates the button on success.

**Workbook card:** The Bipolar Workbook activity card (`is_workbook_entry = true`) navigates to `app/workbook.tsx` rather than `[id].tsx`.

---

### Bipolar Workbook (`app/workbook.tsx`)

4 sequential chapters, 4 prompts each. Next chapter unlocks when all 4 prompts in the previous are answered.

| Chapter | Title | Sample prompts |
|---|---|---|
| 1 | Understanding My Cycles | What does a stable week feel like? / How do I know when I'm shifting into mania? / What does depression feel like in my body? / What triggers shifts for me? |
| 2 | My Triggers | What life events have preceded episodes? / What environments destabilise me? / What relationships affect my mood most? / What thought patterns appear before a shift? |
| 3 | My Warning Signs | What do others notice before I do? / What physical sensations appear early? / What behaviours change first? / What internal experiences signal a shift? |
| 4 | My Strengths | What has helped me through difficult episodes? / Who supports me well? / What am I proud of in how I manage my condition? / What would I tell someone newly diagnosed? |

**Progress bar:** Shows `n/16 prompts`. Never says "n% complete" — progress dots per chapter are sufficient.

**Privacy:** Responses never sent to AI report, companions, or psychiatrists unless the user manually exports and shares the PDF.

**Export:** "Export as PDF" calls a Supabase Edge Function that assembles a formatted document and returns a download URL → native share sheet.

**Chapter locking UI:** Locked chapters show a subtle lock icon and a count of remaining prompts needed in the previous chapter. No dramatic "locked" animations.

---

### Daily Routine Builder (`app/(tabs)/you/routine.tsx`)

Visual schedule of the 6 IPSRT social rhythm anchors:

```
  06:30  ● Wake              actual: 06:45 (+15m)
  08:00  ● First Meal        actual: 08:00 (on time)
  09:30  ● First Contact     actual: — (not logged)
  09:00  ● Work Start        actual: 09:15 (+15m)
  18:30  ● Dinner            actual: 19:00 (+30m)
  22:30  ● Bedtime           actual: —  (not logged)
```

Each row: anchor name, target time (editable via time picker), today's actual logged time (from `social_rhythm_logs`), variance indicator (+/- minutes, or "—" if not logged).

**Rhythm Consistency Score:** Computed in the AI report (3E). Shown here as a simple weekly average variance. No gamification — just factual data.

**Save targets:** Upserts `routine_anchors` rows. Does not affect `social_rhythm_logs` (those are written from the Journal social rhythm block or a dedicated log row in the Routine screen).

---

### Nutrition Detail (`app/(tabs)/you/nutrition.tsx`)

Never shows calories. 11 food quality categories logged per day.

**11 categories:**

| Category | Examples |
|---|---|
| Anti-inflammatory | Berries, leafy greens, fatty fish, turmeric |
| Whole grains | Oats, brown rice, quinoa |
| Lean protein | Eggs, legumes, poultry |
| Healthy fats | Avocado, nuts, olive oil |
| Fermented / gut health | Yoghurt, kimchi, kefir |
| Caffeine | Coffee, tea, energy drinks |
| Ultra-processed | Packaged snacks, fast food |
| Sugar-heavy | Sweets, sugary drinks |
| Alcohol | Tracked separately from substance check-in |
| Hydration | Glasses of water (target: 8) |
| Lithium-interaction | Grapefruit, excessive sodium (shown only if lithium indicated in diagnosis) |

**Input methods (Phase 3):**
- Manual tap: `NutritionCategoryPicker` grid — tap a category to increment count
- One-tap from Home row (quick log)
- From Journal Nutrition block

**Input methods (Phase 4):**
- Photo snap (GPT-4o vision or Passio AI)
- Barcode scan (Open Food Facts Nova score → category mapping)
- Voice (Llama 3.1 transcription)
- Apple HealthKit / Google Fit passthrough

**Lithium note:** If `profiles.diagnosis` is `'bipolar_1'` or `'bipolar_2'` AND caffeine or sodium categories logged heavily (≥3 servings), show a gentle note: "High caffeine can affect lithium levels — chat with your doctor if your intake has changed recently." Never prescriptive.

**`NutritionCategoryPicker` component:** An 11-cell grid. Each cell shows the category icon, name, and current day's count with + / − buttons.

---

## Access Control

| Data | Default sharing |
|---|---|
| Activity completions (name + rate only) | Visible to linked psychiatrists via `prescribed_activities` |
| Activity personal notes | Never shared |
| Workbook responses | Never shared; user exports PDF manually |
| Nutrition logs | Not shared; included in AI report section if ≥3 days |
| Routine targets | Not shared |
