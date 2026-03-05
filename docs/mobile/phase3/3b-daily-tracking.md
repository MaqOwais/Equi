# 3B — Daily Tracking

**Goal:** The core daily habit loop. A user can open the app, complete their day in 4 taps (cycle state → mood → medication → substance check-in), and write a journal entry. All data persists offline and syncs on reconnect.

---

## Screens

- `app/(tabs)/index.tsx` — Home / Today
- `app/(tabs)/tracker.tsx` — Cycle Tracker
- `app/(tabs)/journal.tsx` — Journal
- `app/(tabs)/you/medication.tsx` — Medication Adherence (also surfaced inline on Home)

---

## Supabase Schema

### `cycle_logs`

```sql
create table cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  state cycle_state not null,
  intensity smallint check (intensity between 1 and 10),
  symptoms text[],
  notes text,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);
alter table cycle_logs enable row level security;
create policy "own cycle logs" on cycle_logs using (auth.uid() = user_id);
```

### `mood_logs`

```sql
create table mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  score smallint not null check (score between 1 and 10),
  cycle_state cycle_state,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);
alter table mood_logs enable row level security;
create policy "own mood logs" on mood_logs using (auth.uid() = user_id);
```

### `journal_entries`

```sql
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  entry_date date not null default current_date,
  blocks jsonb not null default '[]',  -- Lexical editor serialised state
  cycle_state cycle_state,             -- snapshotted at write time
  mood_score smallint,
  sleep_hours numeric(3,1),
  sleep_quality smallint,
  locked boolean default false,        -- true after 48h edit window
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);
alter table journal_entries enable row level security;
create policy "own journal" on journal_entries using (auth.uid() = user_id);
```

### `daily_checkins`

```sql
create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  checkin_date date not null default current_date,
  alcohol boolean,
  cannabis boolean,
  created_at timestamptz default now(),
  unique (user_id, checkin_date)
);
alter table daily_checkins enable row level security;
create policy "own checkins" on daily_checkins using (auth.uid() = user_id);
```

### `medication_logs`

```sql
create type medication_status as enum ('taken', 'skipped', 'partial');

create table medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  status medication_status not null,
  skip_reason text,         -- 'forgot' | 'side_effects' | 'felt_fine' | 'ran_out' | 'other'
  side_effects text[],      -- ['fatigue', 'weight_changes', 'tremor', 'cognitive_fog', 'nausea', 'other']
  share_with_psychiatrist boolean default false,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
alter table medication_logs enable row level security;
create policy "own medication logs" on medication_logs using (auth.uid() = user_id);
```

### `sleep_logs`

```sql
create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  sleep_date date not null,
  hours_slept numeric(3,1),
  quality_percent smallint check (quality_percent between 0 and 100),
  source text default 'manual',   -- 'manual' | 'healthkit' | 'google_fit'
  created_at timestamptz default now(),
  unique (user_id, sleep_date)
);
alter table sleep_logs enable row level security;
create policy "own sleep" on sleep_logs using (auth.uid() = user_id);
```

### `life_events`

```sql
create table life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_date date not null,
  title text not null,
  category text,  -- 'travel' | 'relationship' | 'work' | 'health' | 'loss' | 'other'
  created_at timestamptz default now()
);
alter table life_events enable row level security;
create policy "own life events" on life_events using (auth.uid() = user_id);
```

### `social_rhythm_logs`

```sql
create table social_rhythm_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  wake_time time,
  first_meal_time time,
  first_contact_time time,
  work_start_time time,
  dinner_time time,
  bedtime time,
  stressor text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
alter table social_rhythm_logs enable row level security;
create policy "own rhythm" on social_rhythm_logs using (auth.uid() = user_id);
```

---

## Zustand Stores

### `stores/today.ts`

```ts
interface TodayStore {
  date: string;                    // ISO date, today
  cycleLog: CycleLog | null;
  moodLog: MoodLog | null;
  checkin: DailyCheckin | null;
  sleepLog: SleepLog | null;
  medicationLog: MedicationLog | null;
  logCycleState: (state: CycleState, intensity: number, symptoms: string[]) => Promise<void>;
  logMood: (score: number) => Promise<void>;
  logCheckin: (alcohol: boolean, cannabis: boolean) => Promise<void>;
  logMedication: (status: MedicationStatus, reason?: string, sideEffects?: string[]) => Promise<void>;
}
```

### `stores/journal.ts`

```ts
interface JournalStore {
  entries: Map<string, JournalEntry>;   // keyed by ISO date
  loadEntry: (date: string) => Promise<void>;
  saveEntry: (date: string, blocks: LexicalState) => Promise<void>;
  isLocked: (entry: JournalEntry) => boolean;  // true when created_at < now() - 48h
}
```

### `stores/cycle.ts`

```ts
interface CycleStore {
  logs: CycleLog[];              // last 90 days
  currentState: CycleState;
  load90Days: () => Promise<void>;
  lifeEvents: LifeEvent[];
  loadLifeEvents: () => Promise<void>;
}
```

---

## Screen Specs

### Home / Today (`app/(tabs)/index.tsx`)

```
┌──────────────────────────────────────────┐
│  Thu 5 Mar          Good morning, Alex   │
│                                          │
│  ┌── TODAY ───────────────────────────┐  │
│  │  ● Stable    How are you feeling?  │  │
│  │  😔 😐 🙂 😊 ⚡ 😔 😐 🙂 😊 ⚡  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌── DAILY CHECK-INS ─────────────────┐  │
│  │  💊 Medication  [Taken][Skip][Part]│  │
│  │  🍺 Substances  [Alcohol] [Cannabis│  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌── TODAY'S SUGGESTIONS ─────────────┐  │
│  │  [ActivityCard]   [ActivityCard]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌── SLEEP ───────────────────────────┐  │
│  │  7.5h · 82%   🟢🔵🟣⬜🟢🟢🟣    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌──────── SOS ───────────────────────┐  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**TODAY card:**
- Cycle state dot colour = `profiles.current_cycle_state` mapped via `CycleColors`
- Mood tap is a single tap — saves immediately, no confirmation. `MoodScale` component (10-pt emoji row)
- Max 1 mood log per day — if already logged, shows logged score as selected state (non-interactive until tomorrow)

**DAILY CHECK-INS card:**
- Medication row hidden if `profiles.track_medication = false`
- `Taken` → saves `medication_logs` with status 'taken' immediately
- `Skip` → opens bottom sheet with skip reason picker (Forgot / Side effects / Felt fine / Ran out / Other)
- `Partial` → same bottom sheet
- Substance toggles: simple yes/no checkboxes, save on toggle

**TODAY'S SUGGESTIONS:**
- Query: `activities WHERE compatible_states @> ARRAY[current_cycle_state] AND NOT (restricted_states @> ARRAY[current_cycle_state])`
- Filter by time-of-day: morning (before noon) → grounding; evening (after 6pm) → sleep. Otherwise: category = any
- Show max 2 cards. Uses `ActivityCard` component.

**SLEEP row:**
- `SleepDots` component: 7 dots, one per day, colour = cycle state that night
- Grey dot = no sleep data for that day
- Tapping the row opens `app/(tabs)/you/sleep-log.tsx` (manual entry) or shows a "Connect wearable" CTA in Phase 4

**SOS button:**
- `position: absolute`, bottom of SafeAreaView, always visible regardless of scroll
- Tap → opens `CrisisOverlay` (full-screen modal, defined in 3E)
- Background colour: surface (#F7F3EE). Text/icon: charcoal. **No red** — the crisis screen itself uses red

**Safety: Mood rumination circuit**
- If `mood_logs.score ≤ 3` for 2+ consecutive days: a gentle prompt card appears above the SOS button
- "It looks like you've had a few hard days. Would you like some grounding activities?"
- Non-dismissible for the session; disappears next day if mood improves
- Never sends a push notification — in-app only

---

### Cycle Tracker (`app/(tabs)/tracker.tsx`)

```
┌──────────────────────────────────────────┐
│  Cycle Tracker                           │
│                                          │
│  [Stable][Manic][Depressive][Mixed]      │ ← 4-state toggle
│                                          │
│  Intensity ——●——————  6                 │ ← slider 1–10
│                                          │
│  DEPRESSIVE SYMPTOMS                     │
│  ☐ Low energy   ☐ Isolation             │
│  ☐ Hopelessness ☐ Sleep changes         │
│                                          │
│  MANIC SYMPTOMS                          │
│  ☐ Racing thoughts  ☐ Overspending      │
│  ☐ Irritability     ☐ Reduced sleep     │
│  + Add custom symptom                    │
│                                          │
│  ── 90-Day Wave ─────────────────────── │
│  [CycleWaveGraph — colour segments]      │
│  📌 Life event markers                  │
│                                          │
│  💡 "You've been stable 4 days."        │
│                                          │
│         [ Save Today's Log ]            │
└──────────────────────────────────────────┘
```

**State toggle:** Tap changes active fill immediately (optimistic UI). Colours: sage (stable), sky (manic), mauve (depressive), sand (mixed). No "good/bad" labels ever.

**Intensity slider:** Fill colour matches selected state. Default: 5.

**Symptom checklist:** Pre-populated lists. "Add custom" → text input → saved to user's own symptom list (local, not a table — stored as array in `profiles.custom_symptoms jsonb`).

**90-Day Wave Graph (`CycleWaveGraph`):**
- Continuous area chart, X = last 90 days, Y = intensity
- Colour segments match cycle state per day
- 📌 markers from `life_events` table — tap to see event title

**AI Insight card:** Static cached text from latest `ai_reports.report_json.cycle_overview.insight`. No live Groq call here.

**Save:** Upserts `cycle_logs`. Updates `profiles.current_cycle_state`. Refreshes `today` store.

---

### Journal (`app/(tabs)/journal.tsx`)

Full-screen Lexical block editor. One entry per calendar day.

**Block types:**

| Block | Icon | Data |
|---|---|---|
| Text | T | Rich text paragraphs |
| Checklist | ☐ | Task-style list |
| Mood scale | 😊 | Embeds `MoodScale` mid-entry |
| Image | 🖼 | Camera or photo library |
| Life Event | 📌 | Creates `life_events` row; appears as marker on wave graph |
| Social Rhythm | 🕐 | Opens `SocialRhythmRow` time picker → writes `social_rhythm_logs` |
| Nutrition | 🥗 | Opens `NutritionCategoryPicker` → writes `nutrition_logs` (detailed in 3C) |

**48h edit window:** `isLocked()` = `entry.created_at < Date.now() - 48 * 3600 * 1000`. Locked entries render read-only with a "Locked" banner. Locking is enforced client-side; the `locked` column is set by a Supabase Edge Function cron (runs nightly, sets `locked = true` where `created_at < now() - 48h`).

**Auto-tagging:** On save, snap `cycle_state`, `mood_score`, `sleep_hours`, `sleep_quality` from the `today` store into the journal entry row. Used by AI report for correlation.

**Navigation:** Swipe left/right to navigate between days. Calendar pill at top for date jumping.

**Empty state:** When no entry exists for today, show a gentle prompt based on `current_cycle_state`:
- Stable: "How's your day going?"
- Manic: "Take a moment to reflect."
- Depressive: "You don't need to write much — even a few words is enough."

**Lexical editor note:** `@lexical/react` is the recommended block editor library for React. It works on React Native via `react-native-webview` embedding a web-based Lexical instance (or using a React Native-compatible rich text library like `react-native-pell-rich-editor` as fallback if Lexical web embed is too heavy).

---

### Medication Adherence (`app/(tabs)/you/medication.tsx`)

Only rendered when `profiles.track_medication = true`. If false, show explanation card with "Enable" toggle.

```
┌──────────────────────────────────────────┐
│  Medication                              │
│                                          │
│  This week: ████████░░  6/7 · 86%       │
│                                          │
│  Today                                   │
│  [ Taken ]  [ Skipped ]  [ Partial ]    │
│                                          │
│  Side effects (optional)                 │
│  ☐ Fatigue       ☐ Weight changes       │
│  ☐ Tremor        ☐ Brain fog            │
│  ☐ Nausea        ☐ Other               │
│                                          │
│  Share with psychiatrist  [toggle — OFF] │
│                                          │
│  Past 30 days ──────────────────────    │
│  [Calendar heatmap — taken/skip/partial] │
└──────────────────────────────────────────┘
```

**Share toggle:** OFF by default. Turning it on flags this user's medication data as visible in the AI Report PDF shared with linked psychiatrists. The toggle state is stored in `medication_logs.share_with_psychiatrist` (per-day log) AND `profiles.share_medication_default` (default for new days).

**Data retention:** Data is retained when tracking is disabled — re-enabling shows all previous logs.

---

## Offline Behaviour

| Action | Offline |
|---|---|
| Mood log | Queued in `offlineQueue`, synced on reconnect |
| Cycle log | Queued |
| Daily check-in | Queued |
| Medication log | Queued |
| Journal entry | Full offline editing; `updated_at` used for conflict resolution (last write wins) |
| Sleep entry | Queued |
| Life event (from Journal block) | Queued |
| Social rhythm (from Journal block) | Queued |
