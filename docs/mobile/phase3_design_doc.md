# Phase 3 — Core Features: Design Document

**Status:** Planned
**Depends on:** Phase 2 complete (Expo SDK 55, NativeWind, Supabase client, 5-tab shell)
**Goal:** A fully functional v1 app covering all 20 screens. Every screen in the tab shell works end-to-end with real Supabase data. AI features connect to Groq. No feature flags — everything ships or is cut.

---

## Table of Contents

1. [Guiding Principles](#1-guiding-principles)
2. [Build Order](#2-build-order)
3. [Supabase Schema — Full Phase 3](#3-supabase-schema--full-phase-3)
4. [Zustand Stores](#4-zustand-stores)
5. [Component Library](#5-component-library)
6. [Auth Flow & Root Guard](#6-auth-flow--root-guard)
7. [Screen Specs](#7-screen-specs)
   - [01 Onboarding](#01-onboarding)
   - [02 Home / Today](#02-home--today)
   - [03 Journal](#03-journal)
   - [04 Cycle Tracker](#04-cycle-tracker)
   - [05–06 Activities & Detail](#0506-activities--detail)
   - [07 Community](#07-community)
   - [08 Psychiatrists](#08-psychiatrists)
   - [09 AI Wellness Report](#09-ai-wellness-report)
   - [11 Crisis Mode](#11-crisis-mode)
   - [13 Profile & Settings](#13-profile--settings)
   - [14 Daily Routine Builder](#14-daily-routine-builder)
   - [15 Bipolar Workbook](#15-bipolar-workbook)
   - [16 Support Network](#16-support-network)
   - [19 Medication Adherence](#19-medication-adherence)
   - [20 Nutrition Detail](#20-nutrition-detail)
8. [AI Integration (Groq)](#8-ai-integration-groq)
9. [Access Control Layer](#9-access-control-layer)
10. [Safety Systems](#10-safety-systems)
11. [Offline Strategy](#11-offline-strategy)
12. [Phase 4 Handoff Contracts](#12-phase-4-handoff-contracts)

---

## 1. Guiding Principles

These rules apply to every line of Phase 3 code:

| Rule | Implication |
|---|---|
| Never use red except crisis UI | All error states use charcoal/mauve tones |
| Mood states have colours, never labels like "bad" | Use sage/sky/mauve/sand everywhere — no "bad day" text |
| No streaks that punish missing days | Show consistency, not chains. Never show a broken streak |
| All community posts anonymous by default | No display name ever shown in community unless user explicitly opts in |
| No algorithmic feed | Community feeds are strictly chronological — no ranking, no boosting |
| Psychiatrist data never shared without consent | Medication, substance, journal data off by default even for linked doctors |
| Offline-first core features | Mood log, journal, cycle tap, medication — all work offline, sync when online |
| Data always exportable and deletable | Every table must support `DELETE WHERE user_id = auth.uid()` and export |
| Never calorie-focused | Nutrition screen shows food quality categories only — no calorie counters |
| Zero AI data retention | All Groq calls use the zero-retention API; no user data persisted on Groq's servers |

---

## 2. Build Order

Phase 3 ships in four sequential milestones. Each milestone must be fully working before the next begins.

### Milestone A — Daily Core Loop (Weeks 1–3)

The minimum viable app. Gets users into a daily habit.

| Screen | Why first |
|---|---|
| Auth (Sign up / Sign in / Onboarding) | Gate to everything else |
| Home / Today | First thing users see every day |
| Cycle Tracker | Core clinical data input |
| Journal | Pairs with cycle data; block editor is the most complex component |
| Medication Adherence | Conditionally visible from Home; data needed by AI Report |

### Milestone B — Engagement Layer (Weeks 4–5)

Turns the app from a log into an experience.

| Screen | Why second |
|---|---|
| Activities + Detail | Content that brings users back daily |
| Profile & Settings | Required for notification prefs, relapse signatures, theming |
| Crisis Mode | Safety — must ship before any community or social feature |
| Daily Routine Builder | Depends on Journal social rhythm data being in place |

### Milestone C — Social & Intelligence (Weeks 6–8)

Connects the app to other humans and to AI.

| Screen | Why third |
|---|---|
| AI Wellness Report | Requires A's data to be meaningful |
| Community | Needs moderation pipeline ready before launch |
| Support Network | Depends on auth + profile being stable |
| Psychiatrists | Requires Activity data + AI Report for sharing |

### Milestone D — Depth Features (Weeks 9–10)

Full-featured but lower daily-use frequency.

| Screen | Why last |
|---|---|
| Bipolar Workbook | Depends on Activities + Cycle Tracker being stable |
| Nutrition Detail | Depends on AI Report section + Journal block |
| Relapse Signature Builder | Accessible from Profile, feeds into AI Report |

---

## 3. Supabase Schema — Full Phase 3

All tables use UUID primary keys, `user_id uuid references auth.users on delete cascade`, and RLS (`auth.uid() = user_id`). Migrations are applied in the Supabase SQL editor per milestone.

### Enums (already created in Phase 2)

```sql
create type cycle_state as enum ('stable', 'manic', 'depressive', 'mixed');
```

### New enums

```sql
create type medication_status as enum ('taken', 'skipped', 'partial');
create type companion_role as enum ('well_wisher', 'guardian');
create type guardian_level as enum ('view_only', 'alert_on_risk', 'full_control');
create type activity_tab as enum ('all', 'prescribed', 'working_for_me');
create type post_reaction as enum ('i_relate', 'thank_you_for_sharing');
```

---

### Milestone A Tables

#### `profiles` (extends Phase 2 baseline)

```sql
alter table profiles add column if not exists
  diagnosis text,                        -- 'bipolar_1' | 'bipolar_2' | 'cyclothymia' | 'unsure'
  track_medication boolean default false,
  user_role text default 'patient',      -- 'patient' | 'companion'
  timezone text default 'UTC';
```

#### `cycle_logs`

```sql
create table cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  state cycle_state not null,
  intensity smallint check (intensity between 1 and 10),
  symptoms text[],                       -- e.g. ['racing_thoughts', 'low_energy']
  notes text,
  created_at timestamptz default now(),
  unique (user_id, logged_at)            -- one log per day
);

alter table cycle_logs enable row level security;
create policy "own cycle logs" on cycle_logs
  using (auth.uid() = user_id);
```

#### `mood_logs`

```sql
create table mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  score smallint not null check (score between 1 and 10),
  cycle_state cycle_state,               -- snapshotted at log time
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);

alter table mood_logs enable row level security;
create policy "own mood logs" on mood_logs
  using (auth.uid() = user_id);
```

#### `journal_entries`

```sql
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  entry_date date not null default current_date,
  blocks jsonb not null default '[]',    -- Lexical editor serialised state
  cycle_state cycle_state,               -- snapshotted at write time
  mood_score smallint,                   -- snapshotted at write time
  sleep_hours numeric(3,1),
  sleep_quality smallint,
  locked boolean default false,          -- true after 48h edit window closes
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);

alter table journal_entries enable row level security;
create policy "own journal" on journal_entries
  using (auth.uid() = user_id);
```

#### `daily_checkins`

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
create policy "own checkins" on daily_checkins
  using (auth.uid() = user_id);
```

#### `medication_logs`

```sql
create table medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  status medication_status not null,
  skip_reason text,                      -- 'forgot' | 'side_effects' | 'felt_fine' | 'ran_out' | 'other'
  side_effects text[],                   -- ['fatigue', 'weight_changes', 'tremor', 'cognitive_fog', 'nausea', 'other']
  share_with_psychiatrist boolean default false,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

alter table medication_logs enable row level security;
create policy "own medication logs" on medication_logs
  using (auth.uid() = user_id);
```

---

### Milestone B Tables

#### `activities`

```sql
create table activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes smallint,
  category text,                         -- 'grounding' | 'self_esteem' | 'sleep' | 'forgiveness' | 'reflection'
  compatible_states cycle_state[],       -- phases this activity is recommended in
  restricted_states cycle_state[],       -- phases this activity is hidden from recommendations
  is_workbook boolean default false,     -- true = Bipolar Workbook entry point
  illustration_url text,
  evidence_label text,                   -- honest label e.g. "Supported by IPSRT research"
  created_at timestamptz default now()
);
-- No RLS — activities table is global, read-only for patients
```

#### `activity_completions`

```sql
create table activity_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  activity_id uuid references activities,
  completed_at timestamptz default now(),
  cycle_state cycle_state,              -- snapshotted at completion time
  notes text,
  bookmarked boolean default false
);

alter table activity_completions enable row level security;
create policy "own completions" on activity_completions
  using (auth.uid() = user_id);
```

#### `prescribed_activities`

```sql
create table prescribed_activities (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  psychiatrist_id uuid,                  -- from psychiatrists table (Phase 4 fully)
  activity_id uuid references activities,
  dosage_per_week smallint,
  goal text,
  prescribed_at timestamptz default now(),
  active boolean default true
);

alter table prescribed_activities enable row level security;
create policy "patient sees own" on prescribed_activities
  using (auth.uid() = patient_id);
```

#### `social_rhythm_logs`

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
  stressor text,                         -- optional free text: what disrupted rhythm
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

alter table social_rhythm_logs enable row level security;
create policy "own rhythm" on social_rhythm_logs
  using (auth.uid() = user_id);
```

#### `relapse_signatures`

```sql
create table relapse_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  episode_type text not null,            -- 'manic' | 'depressive'
  warning_signs text[],                  -- 1–3 personal early warning signs
  days_before smallint,                  -- timing slider 1–14
  noticed_by text,                       -- 'me' | 'both' | 'people_around_me'
  created_at timestamptz default now(),
  unique (user_id, episode_type)         -- one signature per episode type
);

alter table relapse_signatures enable row level security;
create policy "own signatures" on relapse_signatures
  using (auth.uid() = user_id);
```

#### `sleep_logs`

```sql
create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  sleep_date date not null,              -- the night of (e.g. night before waking)
  hours_slept numeric(3,1),
  quality_percent smallint check (quality_percent between 0 and 100),
  source text default 'manual',          -- 'manual' | 'healthkit' | 'google_fit'
  created_at timestamptz default now(),
  unique (user_id, sleep_date)
);

alter table sleep_logs enable row level security;
create policy "own sleep" on sleep_logs
  using (auth.uid() = user_id);
```

#### `routine_anchors`

```sql
create table routine_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  anchor_name text not null,             -- 'wake' | 'first_meal' | 'first_contact' | etc.
  target_time time,
  enabled boolean default true,
  created_at timestamptz default now()
);

alter table routine_anchors enable row level security;
create policy "own anchors" on routine_anchors
  using (auth.uid() = user_id);
```

---

### Milestone C Tables

#### `ai_reports`

```sql
create table ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  report_type text not null,             -- 'weekly' | 'monthly'
  period_start date not null,
  period_end date not null,
  report_json jsonb not null,            -- structured output from Groq
  pdf_url text,                          -- generated PDF stored in Supabase Storage
  created_at timestamptz default now()
);

alter table ai_reports enable row level security;
create policy "own reports" on ai_reports
  using (auth.uid() = user_id);
```

#### `community_posts`

```sql
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users on delete cascade,
  channel text not null,                 -- 'wins_this_week' | 'depressive_days' | 'mania_stories' | 'medication_talk' | 'caregiver_corner'
  body text not null,
  moderation_status text default 'pending', -- 'approved' | 'flagged' | 'removed'
  moderation_reason text,
  created_at timestamptz default now()
);

alter table community_posts enable row level security;
-- Authors can see their own + all approved posts
create policy "read community" on community_posts for select
  using (moderation_status = 'approved' or author_id = auth.uid());
create policy "insert own" on community_posts for insert
  with check (author_id = auth.uid());
```

#### `community_reactions`

```sql
create table community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts on delete cascade,
  user_id uuid references auth.users on delete cascade,
  reaction post_reaction not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)              -- one reaction per user per post
);

alter table community_reactions enable row level security;
create policy "own reactions" on community_reactions
  using (auth.uid() = user_id);
```

#### `companions`

```sql
create table companions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  companion_id uuid references auth.users,
  role companion_role not null,
  guardian_level guardian_level,         -- only used when role = 'guardian'
  status text default 'pending',         -- 'pending' | 'accepted' | 'rejected'
  -- Per-person sharing toggles
  share_mood_summaries boolean default false,
  share_cycle_data boolean default false,
  share_ai_report boolean default false,
  share_medication boolean default false, -- off by default even for guardians
  -- Journal entries shared selectively via companion_journal_shares
  created_at timestamptz default now(),
  unique (patient_id, companion_id)
);

alter table companions enable row level security;
create policy "patient sees their companions" on companions
  using (auth.uid() = patient_id);
create policy "companion sees their link" on companions
  using (auth.uid() = companion_id);
```

#### `companion_journal_shares`

```sql
create table companion_journal_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  companion_id uuid references auth.users,
  journal_entry_id uuid references journal_entries on delete cascade,
  shared_at timestamptz default now()
);

alter table companion_journal_shares enable row level security;
create policy "patient controls shares" on companion_journal_shares
  using (auth.uid() = patient_id);
create policy "companion can read shared" on companion_journal_shares for select
  using (auth.uid() = companion_id);
```

---

### Milestone D Tables

#### `workbook_responses`

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
create policy "own workbook" on workbook_responses
  using (auth.uid() = user_id);
```

#### `nutrition_logs`

```sql
create table nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  categories jsonb not null default '{}', -- { "anti_inflammatory": 2, "whole_grains": 1, ... }
  eating_window_start time,
  eating_window_end time,
  hydration_glasses smallint,
  gut_health_note text,
  input_method text,                      -- 'manual' | 'photo' | 'barcode' | 'voice' | 'healthkit'
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

alter table nutrition_logs enable row level security;
create policy "own nutrition" on nutrition_logs
  using (auth.uid() = user_id);
```

#### `life_events`

```sql
create table life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_date date not null,
  title text not null,
  category text,                          -- 'travel' | 'relationship' | 'work' | 'health' | 'loss' | 'other'
  created_at timestamptz default now()
);

alter table life_events enable row level security;
create policy "own life events" on life_events
  using (auth.uid() = user_id);
```

---

## 4. Zustand Stores

All stores live in `mobile/stores/`. Each file exports one store. Stores hydrate from Supabase on app launch and write-through on every mutation.

### `stores/auth.ts`

```ts
interface AuthStore {
  session: Session | null;
  profile: Profile | null;
  setSession: (s: Session | null) => void;
  setProfile: (p: Profile) => void;
  signOut: () => Promise<void>;
}
```

### `stores/today.ts`

```ts
interface TodayStore {
  date: string;                // ISO date, today's
  cycleLog: CycleLog | null;
  moodLog: MoodLog | null;
  checkin: DailyCheckin | null;
  sleepLog: SleepLog | null;
  medicationLog: MedicationLog | null;
  // Actions
  logCycleState: (state: CycleState, intensity: number, symptoms: string[]) => Promise<void>;
  logMood: (score: number) => Promise<void>;
  logCheckin: (alcohol: boolean, cannabis: boolean) => Promise<void>;
  logMedication: (status: MedicationStatus, reason?: string, sideEffects?: string[]) => Promise<void>;
}
```

### `stores/journal.ts`

```ts
interface JournalStore {
  entries: Map<string, JournalEntry>; // keyed by ISO date
  loadEntry: (date: string) => Promise<void>;
  saveEntry: (date: string, blocks: LexicalState) => Promise<void>;
  // 48h lock check
  isLocked: (entry: JournalEntry) => boolean;
}
```

### `stores/cycle.ts`

```ts
interface CycleStore {
  logs: CycleLog[];             // last 90 days
  currentState: CycleState;
  load90Days: () => Promise<void>;
  lifeEvents: LifeEvent[];
  loadLifeEvents: () => Promise<void>;
}
```

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

### `stores/community.ts`

```ts
interface CommunityStore {
  channel: string;
  posts: CommunityPost[];
  loadChannel: (channel: string) => Promise<void>;
  post: (body: string) => Promise<void>;
  react: (postId: string, reaction: PostReaction) => Promise<void>;
}
```

### `stores/ai.ts`

```ts
interface AIStore {
  latestReport: AIReport | null;
  loading: boolean;
  generate: () => Promise<void>;        // calls Groq, writes to ai_reports table
  exportPDF: (reportId: string) => Promise<string>; // returns URL
}
```

---

## 5. Component Library

Lives in `mobile/components/ui/`. All components are pure presentational — no Supabase calls. Data passed via props. Every component uses NativeWind `className` only (no inline styles).

### Core primitives

| Component | Props | Notes |
|---|---|---|
| `Button` | `label`, `variant` (primary/ghost/danger), `onPress`, `loading` | Primary = sage fill; danger = used only in crisis UI |
| `Card` | `children`, `className?` | Surface background, rounded-2xl, shadow-sm |
| `Badge` | `label`, `color` | Pill for cycle state labels |
| `CycleStateDot` | `state: CycleState`, `size?` | Filled circle in the right colour |
| `MoodScale` | `value`, `onChange` | 10-pt emoji tap row — same component used in Onboarding + Home + Journal |
| `SectionHeader` | `title`, `action?` | Used at top of every Home card |
| `EmptyState` | `icon`, `message`, `action?` | Consistent empty placeholder |

### Feature components

| Component | Used in |
|---|---|
| `CycleWaveGraph` | Cycle Tracker — 90-day wave |
| `WellnessRadar` | Profile — hexagon chart |
| `ActivityCard` | Activities list |
| `SleepDots` | Home — week-at-a-glance sleep row |
| `MedicationStatusRow` | Home daily check-ins + Medication screen |
| `JournalBlockEditor` | Journal — Lexical-based block editor |
| `CrisisOverlay` | Crisis Mode — full-screen modal |
| `SocialRhythmRow` | Journal / Routine Builder — 6 anchor time pickers |
| `CompanionCard` | Support Network — per-companion card with toggles |
| `ReportSection` | AI Report — collapsible section with icon |
| `NutritionCategoryPicker` | Nutrition Detail — 11-category grid |

---

## 6. Auth Flow & Root Guard

### Root `_layout.tsx` — auth guard

The root layout listens to `supabase.auth.onAuthStateChange`. On every mount and state change:

```
no session       →  redirect to /(auth)/sign-in
has session      →
  profile.onboarding_complete = false  →  redirect to /(auth)/onboarding
  profile.onboarding_complete = true   →  show (tabs)
```

All redirects use `router.replace()` — never `router.push()`, so the user can't back-navigate into auth screens.

### Auth screens in `app/(auth)/`

```
(auth)/
├── sign-in.tsx         — email + password, link to sign-up
├── sign-up.tsx         — email + password + display name
├── forgot-password.tsx — sends reset email via Supabase
└── onboarding.tsx      — multi-step wizard (see Screen 01 below)
```

The `(auth)/_layout.tsx` is a bare `Stack` with no header — already set up in Phase 2.

---

## 7. Screen Specs

---

### 01 Onboarding

**File:** `app/(auth)/onboarding.tsx`
**State:** local `useState` for step index; submits to Supabase only on final step

#### Patient path — 5 slides

| Slide | Content | Data written |
|---|---|---|
| 1 | Pick diagnosis: Bipolar I / II / Cyclothymia / Not sure (4 tappable cards) | `profiles.diagnosis` |
| 2 | Mood intro: "This is how you'll log mood" — static display of 10-pt emoji scale, no input | — |
| 3 | Quick intro to the app's 5 tabs — one-line each | — |
| 4 | "Do you take medication?" Yes / No. If Yes: "Track it in the app?" Yes / No | `profiles.track_medication` |
| 5 | Safety setup: add emergency contacts (name + phone, at least 1 required) + social contacts (optional) | `emergency_contacts` table (see Crisis Mode) |

Last slide has "Let's go →" button → sets `profiles.onboarding_complete = true` → root guard redirects to `(tabs)`.

#### Companion path — 3 slides

| Slide | Content | Data written |
|---|---|---|
| 1 | "Who are you supporting?" + relationship picker (Partner / Parent / Sibling / Friend / Other) | `profiles.companion_for`, `profiles.companion_relationship` |
| 2 | Education slide: "Here's what companions can see" — static read-only list | — |
| 3 | Send connection request: search by email or copy a link | `companions` row with `status = 'pending'` |

Companion lands on a minimal home screen showing `status = 'pending'` until the patient accepts.

#### UX rules
- Progress dots at top (not a bar — no punishing "you're only 20% done")
- Back arrow always visible — users can go back any step
- Skip available on slides 2, 3 only — slides 1, 4, 5 are required

---

### 02 Home / Today

**File:** `app/(tabs)/index.tsx`
**Store:** `today`

#### Layout (top to bottom)

```
┌─────────────────────────────────────────────────┐
│  [date]          Good morning, [name]            │
│                                                  │
│  ┌── TODAY ────────────────────────────────────┐ │
│  │  ● Stable              How are you feeling? │ │
│  │  😔 😐 🙂 😊 ⚡ 😔 😐 🙂 😊 ⚡           │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌── DAILY CHECK-INS ──────────────────────────┐ │
│  │  💊 Medication    [Taken] [Skip] [Partial]  │ │
│  │  🍺 Substances   [Alcohol ☐] [Cannabis ☐]  │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌── TODAY'S SUGGESTIONS ──────────────────────┐ │
│  │  [Activity Card]   [Activity Card]          │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌── SLEEP ────────────────────────────────────┐ │
│  │  7.5h · 82% quality   🟢🔵🟣⬜🟢🟢🟣     │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │              SOS                           │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

#### Behaviour details

- **TODAY card:** Cycle state dot colour matches `profiles.current_cycle_state`. Mood tap is a single tap — no confirmation needed. On tap, mood score saved and dot animates.
- **Medication row:** hidden if `profiles.track_medication = false`. `Taken` saves immediately; `Skip` opens a bottom sheet with skip reason picker; `Partial` opens the same sheet.
- **TODAY'S SUGGESTIONS:** queries `activities` where `compatible_states @> ARRAY[current_cycle_state]` AND `restricted_states` does not contain current state. Filter by time-of-day (morning = grounding, evening = sleep). Show max 2.
- **Sleep dots:** coloured by cycle state that night (sage/sky/mauve/sand). Grey = no data. Pulled from `sleep_logs` for last 7 days.
- **SOS button:** always fixed at bottom. `position: absolute` relative to the SafeAreaView, always visible regardless of scroll position. On tap: opens `CrisisOverlay` as a full-screen modal.
- **Core minimum:** 4 taps to complete (cycle state → mood → medication → substance). Journal and activities are optional.

---

### 03 Journal

**File:** `app/(tabs)/journal.tsx`
**Store:** `journal`

#### Layout

Full-screen block editor for today's entry. If no entry exists, shows a gentle empty state with a prompt based on current cycle state.

**Block types:**

| Block | Icon | Notes |
|---|---|---|
| Text | T | Default — rich text paragraph |
| Checklist | ☐ | Task-style list |
| Mood scale | 😊 | Embeds the `MoodScale` component mid-journal |
| Image | 🖼 | Camera or photo library |
| Life Event | 📌 | Creates a `life_events` row; appears as a marker on the cycle wave graph |
| Social Rhythm | 🕐 | Opens the 6-anchor time picker; writes `social_rhythm_logs` row |
| Nutrition | 🥗 | Opens the `NutritionCategoryPicker`; writes `nutrition_logs` row |

**48-hour edit window:** `isLocked()` returns `true` when `entry.created_at < now() - 48h`. Locked entries show in read-only mode with a "Locked" banner at top. Users can still read; the block editor is non-interactive.

**Auto-tagging:** When saving, the app snaps `cycle_state`, `mood_score`, `sleep_hours`, `sleep_quality` from today's store into the journal entry row — these are used by the AI report for correlation analysis.

**Past entries:** Accessible by swiping left (previous day) or via a small calendar pill at the top. Past entries within 48h are editable; older are locked.

---

### 04 Cycle Tracker

**File:** `app/(tabs)/tracker.tsx`
**Store:** `cycle`

#### Layout

```
┌─────────────────────────────────────────────────┐
│  Cycle Tracker                                   │
│                                                  │
│  [ Stable ] [ Manic ] [ Depressive ] [ Mixed ]  │ ← 4-state toggle row
│                                                  │
│  Intensity: ——●——————  6/10                     │ ← slider
│                                                  │
│  Symptoms                                        │
│  ☐ Low energy   ☐ Racing thoughts               │
│  ☐ Irritability ☐ Sleep changes                 │
│  ☐ Isolation    ☐ Overspending                  │
│  + Add custom symptom                            │
│                                                  │
│  ┌─ 90-Day Wave ─────────────────────────────┐  │
│  │  (CycleWaveGraph component)               │  │
│  │  📌 markers for life events               │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  💡 AI Insight: "You've been stable 4 days."    │
│                                                  │
│              [ Save Today's Log ]               │
└─────────────────────────────────────────────────┘
```

#### Behaviour details

- **State toggle:** Tapping a state changes the active colour immediately (optimistic UI). States: sage (stable), sky (manic), mauve (depressive), sand (mixed). Never labelled "good" or "bad".
- **Intensity slider:** 1–10. Visual fill colour matches the selected cycle state.
- **Symptoms:** Two sections — "Depressive symptoms" and "Manic symptoms" — expand/collapse. Tapping "+" opens a text input to add a custom symptom saved to the user's personal symptom list.
- **90-Day Wave Graph:** `CycleWaveGraph` renders a continuous area chart with colour segments per state. X-axis = last 90 days. 📌 pins pulled from `life_events` table.
- **AI Insight card:** Simple static text from the latest weekly report's cycle summary. Not a live Groq call — just the cached insight from `ai_reports`.
- **Save:** Upserts into `cycle_logs`. Also updates `profiles.current_cycle_state`. On success, `today` store refreshes.

#### Relapse Signature Builder

Accessible from `Profile → My Relapse Signatures`. Not on the Tracker screen itself.

**File:** `app/(tabs)/you/relapse-signature.tsx`

Two separate signature builders — one for manic, one for depressive:
1. "What are your 1–3 personal early warning signs?" — free text inputs
2. "How far before an episode do you notice these?" — slider 1–14 days
3. "Who notices first?" — "Me" / "Both" / "People around me"

Data written to `relapse_signatures`. The AI report cross-references current cycle + journal entries against these signatures and flags matches in the "Early Warning" section.

---

### 05/06 Activities & Detail

**Files:** `app/(tabs)/activities.tsx`, `app/activity/[id].tsx`
**Store:** `activities`

#### Tab layout (3 tabs within the screen)

**All tab:** Grid or list of activity cards. Filtered by current cycle state from `profiles.current_cycle_state`. Grouped by category (Grounding, Self-Esteem, Sleep, Forgiveness, Reflection). A `CycleStatePill` at the top shows the active filter.

**Prescribed tab:** Activities linked via `prescribed_activities`. Each card shows: activity name, prescribed dosage ("3×/week"), psychiatrist's goal text, weekly compliance bar (completions this week / prescribed dosage).

**Working for Me tab:** Activities the user has bookmarked (from `activity_completions` where `bookmarked = true`). Shows completion count and personal notes.

#### Phase gating

The following activities are **removed from recommendations** (not hidden globally — still findable in "All") when `current_cycle_state = 'manic'`:
- Gratitude Jar
- Compliment Diary
- Proud Dandelion

This is enforced by the `restricted_states` column on the `activities` table.

#### Activity Detail screen `app/activity/[id].tsx`

```
┌─────────────────────────────────────────────────┐
│  ← Back                            🔖 Bookmark  │
│                                                  │
│  [Illustration]                                  │
│                                                  │
│  Gratitude Jar                    15 min         │
│  [Stable] [Depressive]  ← compatibility chips   │
│                                                  │
│  What it does...                                 │
│  [Body text from activities.description]         │
│                                                  │
│  Evidence: Supported by positive psychology...  │
│                                                  │
│  ┌── In-App Experience ──────────────────────┐  │
│  │  [Activity-specific UI — text inputs,     │  │
│  │   guided prompts, etc.]                   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Past completions (last 3)                       │
│  • 3 days ago — "Felt much calmer after"        │
│                                                  │
│           [ Mark Complete ]                     │
└─────────────────────────────────────────────────┘
```

"Mark Complete" writes to `activity_completions` with current cycle state snapshotted.

#### Bipolar Workbook entry point

In the "All" tab, a special card under "Structured Reflection" says "Bipolar Workbook". Tapping it opens `app/workbook.tsx` (Screen 15) rather than the activity detail screen.

---

### 07 Community

**File:** `app/community/index.tsx` (accessible from a nav button in Profile or Activities)
**Store:** `community`

#### Layout

```
┌─────────────────────────────────────────────────┐
│  🆘 Crisis line always pinned here              │ ← always visible, non-dismissible
│                                                  │
│  [ Wins ] [ Depressive ] [ Mania ] [ Meds ] ... │ ← channel tabs
│                                                  │
│  ┌── Post ────────────────────────────────────┐ │
│  │  "Had my first 5-day stable run this       │ │
│  │   month. Small wins matter."               │ │
│  │                               💜 I relate  │ │
│  │                         🙏 Thank you       │ │
│  └────────────────────────────────────────────┘ │
│  [More posts in chronological order...]          │
│                                                  │
│                   [+ Post]                      │ ← FAB
└─────────────────────────────────────────────────┘
```

#### AI moderation pipeline

Every post goes through two layers **before** it becomes visible:

1. **Perspective API** — scores toxicity, identity attacks, insults, threat. If any score > 0.7 → flagged.
2. **Llama 3.2 3B via Groq** — evaluates context, nuance, and bipolar-specific crisis signals (e.g. "I want to stop existing" treated differently than generic negativity).

Moderation outcomes:
- **Approved:** post becomes visible
- **Flagged:** post held; user shown: "We'd like you to review this before posting" with specific guidance and an edit path. Never silently removed.
- **Removed:** only for clear TOS violations; user is told why with appeal path

Crisis hotline pinned at top of every channel at all times — non-dismissible.

#### Feed rules
- Chronological only — no algorithm, no ranking, no promoted posts
- No likes — only `i_relate` and `thank_you_for_sharing` reactions
- All posts show anonymous author — no username, no avatar
- User can delete their own posts at any time

---

### 08 Psychiatrists

**File:** `app/psychiatrists/index.tsx`

Phase 3 scope is **patient-facing only**. The psychiatrist web portal is a separate Phase 4 deliverable.

#### Layout

Two views: Map and List (toggle).

**List view card:**
- Name, credentials, specialisation
- "Equi Partner" badge if partner
- Distance / telehealth available
- Insurance accepted
- Booking CTA

**Connecting to a psychiatrist:**
1. Patient taps "Connect" on a psychiatrist's profile
2. Default share = activity completion data only (no medication, no journal, no mood scores)
3. A `companions` row is created with `role = 'guardian'` (psychiatrist subtype) and `share_medication = false` by default
4. Patient can change sharing from the Support Network screen at any time

**Pre-appointment:** One-tap "Share AI Report" button on the psychiatrist's profile page. Uses the latest `ai_reports` PDF URL.

---

### 09 AI Wellness Report

**File:** `app/(tabs)/you/ai-report.tsx`
**Store:** `ai`

#### Generation

Reports are generated:
- Automatically every Sunday (background task via Supabase Edge Function cron)
- On demand via "Generate Now" button in the screen

The app collects the last 7 days of data from:
- `mood_logs`
- `cycle_logs`
- `journal_entries` (blocks — for sentiment, not verbatim text)
- `sleep_logs`
- `activity_completions`
- `daily_checkins` (substance data)
- `medication_logs` (if sharing enabled)
- `nutrition_logs` (if ≥3 days of data)
- `social_rhythm_logs`
- `relapse_signatures` (for early warning comparison)
- `life_events`

This data is serialised into a structured prompt and sent to Llama 3.1 70B via Groq's zero-retention API.

#### Report sections

| Section | Shown when |
|---|---|
| AI Summary (2–3 sentences) | Always |
| Cycle Overview (M/T/W dots per day) | Always |
| Sleep Correlation | Always if sleep data exists |
| Activities Completed | Always |
| Top Mood Triggers (AI-inferred) | Always |
| Social Rhythm Consistency % | Always if ≥3 social rhythm logs |
| Medication Adherence | Only if `track_medication = true` |
| Substances | Always if checkin data exists |
| Nutrition & Mood | Only if ≥3 days of `nutrition_logs` |
| Life Events | Only if `life_events` exist in period |
| Early Warning Flags | Only if relapse signatures are set up |

#### PDF export

Supabase Edge Function generates a PDF from the `report_json` and stores it in `ai_reports.pdf_url` (Supabase Storage bucket). The "Export PDF" button opens the native share sheet.

---

### 11 Crisis Mode

**File:** `components/ui/CrisisOverlay.tsx` (a full-screen modal, not a route)
Triggered by the SOS button on Home.

#### Layout (full-screen, dark surface, no navigation chrome)

```
┌─────────────────────────────────────────────────┐
│                   ✕ Close                        │
│                                                  │
│       You are not alone.                        │
│                                                  │
│  CALL SOMEONE YOU TRUST                          │
│  ┌───────────────────────────────────────────┐  │
│  │  [Name] — [Phone] — [Call button]         │  │
│  │  [Name] — [Phone] — [Call button]         │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  NATIONAL CRISIS LINES                           │
│  ┌───────────────────────────────────────────┐  │
│  │  📞 988 Suicide & Crisis Lifeline         │  │
│  │  💬 Crisis Text Line — Text HOME to 741741│  │
│  │  📞 NAMI Helpline — 1-800-950-6264        │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  GROUNDING TOOLS                                 │
│  ┌── 54321 Grounding ────────────────────────┐  │
│  │  [Guided 54321 sensory exercise]          │  │
│  └───────────────────────────────────────────┘  │
│  ┌── 1-Minute Breathing ─────────────────────┐  │
│  │  [Animated breathing guide]               │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Design rules:**
- Red is acceptable here (Design Rule #1 exception) — use it for the "Call" buttons and the screen header tint
- Close button is visible but not prominent — we want users to use the tools, not dismiss
- Emergency contacts pulled from a separate `emergency_contacts` table (written during Onboarding Slide 5)
- `Linking.openURL('tel:...')` for call buttons; `Linking.openURL('sms:...')` for Crisis Text Line

#### `emergency_contacts` table

```sql
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  phone text not null,
  contact_type text default 'emergency',  -- 'emergency' | 'social'
  created_at timestamptz default now()
);

alter table emergency_contacts enable row level security;
create policy "own contacts" on emergency_contacts
  using (auth.uid() = user_id);
```

---

### 13 Profile & Settings

**File:** `app/(tabs)/you.tsx` (root), sub-screens in `app/(tabs)/you/`

#### Root screen layout

```
┌─────────────────────────────────────────────────┐
│  [Initials Avatar — anonymous]  Member since ... │
│                                                  │
│  142 days tracked · 38 activities · 89 stable   │
│                                                  │
│  [WellnessRadar hexagon — 6 dimensions]         │
│                                                  │
│  SETTINGS                                        │
│  ─────────────────────────────────────────────  │
│  🔔 Notifications          →                    │
│  ⌚ Wearable Sync           →                    │
│  🆘 Emergency Contacts     →                    │
│  🔑 My Relapse Signatures  →                    │
│  💊 Medication Tracking   [toggle]              │
│  🎨 Themes & Ambiance      →                    │
│  ❤️  Support Equi (Donate)  →                    │
│  📋 My Diagnosis Info      →                    │
│  📤 Export My Data         →                    │
│  🔒 Privacy Settings       →                    │
│  ─────────────────────────────────────────────  │
│  Sign Out                                        │
└─────────────────────────────────────────────────┘
```

#### `WellnessRadar`

Hexagon radar chart with 6 axes. Each score is a 0–100 computed from the last 30 days of data:

| Axis | Source |
|---|---|
| Mood | Average of `mood_logs.score` |
| Sleep | Average of `sleep_logs.quality_percent` |
| Activity | `activity_completions` count vs 30-day target |
| Social | `social_rhythm_logs` consistency score |
| Mindful | Activity completions in "grounding" category |
| Journal | Days with a `journal_entries` entry |

#### Themes & Ambiance sub-screen `app/(tabs)/you/themes.tsx`

6 ambient scenes: Beach, Mountains, Forest, Fireplace, Rain, Night Sky. Each scene has:
- A background image or looping video
- An ambient audio track (volume slider)
- Used as the background for the Journal screen (optional — user toggles)

User preference saved in `profiles.theme` (JSON column).

---

### 14 Daily Routine Builder

**File:** `app/(tabs)/you/routine.tsx`

Visual schedule of the 6 social rhythm anchors with their target times. User sets target times; the app compares with actual logged times from `social_rhythm_logs` to generate the Rhythm Consistency Score.

**Layout:** A timeline view (vertical) with each anchor as a row:

```
  06:30  Wake           ← target
  08:00  First Meal     ← target
  09:30  First Contact  ← target
  09:00  Work Start     ← target
  18:30  Dinner         ← target
  22:30  Bedtime        ← target
```

Each row has a time picker to set the target. The actual logged times for today appear alongside as a comparison dot if a `social_rhythm_logs` row exists for today.

---

### 15 Bipolar Workbook

**File:** `app/workbook.tsx`
**Entry point:** Activities → "Structured Reflection" card

#### 4 chapters

| Chapter | Title | 4 prompts (examples) |
|---|---|---|
| 1 | Understanding My Cycles | "What does a stable week feel like for me?", "How do I know when I'm shifting into a manic episode?", "What does depression feel like in my body?", "What triggers the shift between states for me?" |
| 2 | My Triggers | "What life events have preceded episodes in the past?", "What environments make me feel unstable?", "What relationships affect my mood most?", "What thought patterns appear before a shift?" |
| 3 | My Warning Signs | "What do others notice before I do?", "What physical sensations appear early?", "What behaviours change first?", "What internal experiences signal a shift?" |
| 4 | My Strengths | "What has helped me get through difficult episodes?", "Who in my life supports me well?", "What am I proud of in how I manage my condition?", "What would I tell someone newly diagnosed?" |

**Chapter locking:** Chapter 2 unlocks when all 4 prompts in Chapter 1 are answered. And so on. Progress bar shows `n/16 prompts`.

**Export:** "Export as PDF" button → calls Supabase Edge Function that generates a formatted PDF → opens native share sheet.

**Privacy:** Workbook responses are never sent to the AI report unless the user explicitly includes them. Not shared with companions or psychiatrists unless the user exports and shares manually.

---

### 16 Support Network

**File:** `app/(tabs)/you/support-network.tsx`

#### Patient view — 2 tabs

**Well-wishers tab:**

List of accepted companions with `role = 'well_wisher'`. Each companion card has per-person toggles:
- Mood summaries (daily mood score, not raw number — "Having a calm day")
- Cycle data (state only, no intensity)
- AI Report (full PDF share)
- Selected journal entries (opens a picker for user to select specific entries)

**Guardians tab:**

Companions with `role = 'guardian'`. In addition to well-wisher toggles, shows:
- Guardian level: `view_only` / `alert_on_risk` / `full_control`
- Alert triggers (auto-displayed, user can see what triggers alerts): mood <2 for 2+ days, SOS tapped, no journal for 3+ days, manic symptoms 2+ days

Guardian controls are **always user-revocable**. A "Revoke guardian access" button is never hidden.

#### Companion home view (same app, different route)

When `profiles.user_role = 'companion'` and companion link is accepted, the app's `(tabs)` shows a different home screen:

For well-wishers:
- Simplified mood status card ("Alex is having a calm day" — not clinical labels or raw scores)
- Shared journal entries (only those the patient selected)
- Reaction buttons: 💜 or 🙏 only — no free text reactions, no comment threads
- Quick check-in templates ("Thinking of you", "How are you doing?")

For guardians:
- Cycle state labels (actual clinical states shown, since guardians are higher trust)
- Medication status (only if patient enabled `share_medication`)
- Alert banner when high-risk triggers fire
- Patient can mute or remove any companion at any time with a single tap

---

### 19 Medication Adherence

**File:** `app/(tabs)/you/medication.tsx` (also surfaced in Home daily check-ins)

Conditionally visible — `profiles.track_medication` must be `true`. If false, the settings toggle in Profile shows an explanation and an "Enable" button. Data is retained when disabled.

#### Screen layout

```
┌─────────────────────────────────────────────────┐
│  Medication                                      │
│                                                  │
│  This week: ████████░░ 6/7 days · 86%           │
│                                                  │
│  Today                                           │
│  [ Taken ] [ Skipped ] [ Partial ]              │
│                                                  │
│  Side effects (optional)                         │
│  ☐ Fatigue   ☐ Weight changes   ☐ Tremor        │
│  ☐ Brain fog ☐ Nausea          ☐ Other          │
│                                                  │
│  Share with psychiatrist  [toggle — OFF]         │
│  ─────────────────────────────────────────────  │
│  Past logs (last 30 days)                        │
│  [Calendar heatmap view]                         │
└─────────────────────────────────────────────────┘
```

The `share_with_psychiatrist` toggle is OFF by default. Turning it on adds medication data to the AI report PDF shared with linked psychiatrists.

---

### 20 Nutrition Detail

**File:** `app/(tabs)/you/nutrition.tsx` (also accessible from Home and Journal block)

Never shows calories. 11 food quality categories:

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
| Alcohol | Tracked separately from substances |
| Hydration | Glasses of water |
| Lithium-interaction foods | Grapefruit, excessive sodium (only shown if `profiles.diagnosis` indicates lithium use) |

**Input methods:**
- One-tap from Home (tap a category chip — quick log)
- Photo snap (integrated with GPT-4o vision or Passio AI — Phase 4 if complex)
- Barcode scan (Open Food Facts Nova score → mapped to categories)
- Voice (Llama 3.1 transcription → category extraction)
- Apple HealthKit / Google Fit passthrough (Phase 4)

**Lithium note:** If the user's profile indicates they take lithium-class medication, gentle contextual notes appear when caffeine-heavy or sodium-heavy patterns are logged (e.g. "High caffeine can affect lithium levels — chat with your doctor if you've changed your intake").

---

## 8. AI Integration (Groq)

### Client setup

```ts
// lib/groq.ts
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function callGroq(messages: ChatMessage[], model = 'llama-3.1-70b-versatile') {
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });
  return response.json();
}
```

Add `EXPO_PUBLIC_GROQ_API_KEY` to `.env.local`.

### Models used

| Task | Model | Why |
|---|---|---|
| AI Wellness Report | `llama-3.1-70b-versatile` | Complex, structured analysis |
| Community moderation | `llama-3.2-3b-preview` | Fast, cheap, sufficient for content classification |
| Nutrition voice input | `llama-3.1-70b-versatile` | Needs context about food categories |

### Zero retention

All Groq API calls include `"store": false` (or use Groq's zero-retention API tier). No user data is persisted on Groq's infrastructure. Journal block content is summarised for sentiment only — raw journal text is never sent to Groq.

### Wellness Report prompt structure

```
You are a clinical wellness assistant for a bipolar disorder monitoring app.
Analyse the following anonymised health data and generate a structured weekly report.
Be warm, non-judgmental, and clinically careful.
Never diagnose. Never prescribe. Never claim causation.
Flag early warning patterns against the user's personal relapse signatures.

DATA:
[JSON of mood_logs, cycle_logs, sleep summary, activity completions,
 social_rhythm consistency, substance checkins, nutrition summary,
 relapse_signatures, life_events for the past 7 days]

RESPOND WITH JSON:
{
  "summary": "...",
  "cycle_overview": { "days": [...], "dominant_state": "..." },
  "sleep_correlation": "...",
  "top_mood_triggers": [...],
  "social_rhythm_score": 0-100,
  "early_warning_flags": [...],
  ...
}
```

---

## 9. Access Control Layer

Full detail: `docs/access/README.md`. Summary for implementation:

| Data | Default sharing | Override |
|---|---|---|
| Mood scores | Off for everyone | User toggles per companion |
| Cycle state | Off for companions, summary to guardians | User toggles |
| Journal entries | Never automatically shared | User selects specific entries per companion |
| Medication | Off by default — even for psychiatrists | Separate toggle in Medication screen |
| Substance | Off for companions, may be in AI report | User toggles |
| Activity names + compliance | Shared with linked psychiatrists | User can revoke psychiatrist connection |
| Activity personal notes | Never shared | Not shareable |
| AI Wellness Report | Off by default | User manually shares or auto-shares if toggle on |
| Workbook responses | Never shared | User exports PDF manually |
| Community posts | Anonymous to all users | Author can delete at any time |

**Implementation:** Every Supabase RLS policy enforces this at the database level. The UI toggles only update the `companions` table; they don't add/remove RLS policies at runtime. The RLS queries join `companions` to check permission flags.

---

## 10. Safety Systems

These are not opt-out features — they are built into every screen that could surface them.

### Mood rumination circuit
- Source: `mood_logs`
- Trigger: score ≤ 3/10 for 2 or more consecutive days
- Response: a gentle optional coping prompt appears on the Home screen ("It looks like you've had a few hard days. Would you like some grounding activities?")
- Hard limit: maximum 1 mood log per day (prevents compulsive checking)
- Never sends a push notification for this — in-app only, on next open

### Phase gating for activities
- Source: `profiles.current_cycle_state`
- Trigger: state = 'manic'
- Response: Gratitude Jar, Compliment Diary, Proud Dandelion removed from recommendations (they can amplify hypomanic patterns)
- These activities remain discoverable via "All" tab — the gating is recommendations only

### Guardian high-risk auto-alerts
- Source: `mood_logs`, `journal_entries`, `cycle_logs`, SOS button events
- Triggers (guardian must have `guardian_level = 'alert_on_risk'` or `full_control'`):
  - Mood ≤ 2/10 for 2+ consecutive days
  - SOS button tapped
  - No journal entry for 3+ days
  - Manic symptoms logged 2+ consecutive days
- Response: push notification to the guardian companion's device
- Patient sees a log of all alerts sent in the Support Network screen

### Evidence labelling
- All activity descriptions include an `evidence_label` sourced from the `activities` table
- No extrapolated claims about bipolar disorder
- Examples: "Supported by positive psychology research", "Based on IPSRT (Interpersonal Social Rhythm Therapy)", "Mindfulness — evidence mixed for bipolar; use with care during manic phases"

### Community moderation
- Two-layer pipeline (Perspective API + Llama 3.2 3B) as described in Screen 07
- Crisis resources pinned — non-dismissible
- Posts never silently removed; users always given an edit path

---

## 11. Offline Strategy

Core daily actions must work without network:

| Feature | Offline behaviour |
|---|---|
| Mood log | Saved to local queue (MMKV or AsyncStorage); synced on reconnect |
| Cycle log | Same |
| Daily check-in (medication, substance) | Same |
| Journal | Full offline editing; sync on reconnect; conflict resolution = last write wins (48h window is client-enforced) |
| Activity completion | Queued offline |
| Crisis Mode | Emergency contacts and crisis line numbers stored in local AsyncStorage on first load; overlay works fully offline |
| AI Wellness Report | Read-only offline (cached JSON); generation requires network |
| Community | Read-only offline from cached posts; posting requires network |

**Implementation:** Use a simple offline queue in Zustand (`pendingWrites: Action[]`). On `NetInfo.isConnected` change → flush queue. For the Crisis Mode specifically, seed local storage on every app open so it's always available.

---

## 12. Phase 4 Handoff Contracts

Phase 3 must leave clear extension points for Phase 4 (AI & Wearables) without breaking Phase 3 code.

| Phase 4 feature | Phase 3 contract |
|---|---|
| Apple HealthKit / Google Fit sleep sync | `sleep_logs.source` column accepts 'healthkit' / 'google_fit'; `SleepLog` type already defined; UI shows "Connected" state if source ≠ 'manual' |
| Unified Calendar (Screen 10) | All data tables have `date`/`logged_at` columns in ISO date format; a calendar view can query across all tables for a given date. No special migration needed. |
| Psychiatrist web portal | `prescribed_activities`, `companions`, and `ai_reports` tables already have `psychiatrist_id` foreign key stub; web portal reads these tables directly |
| Wearable activity tracking | `activity_completions.source` column (not yet in Phase 3 schema — add as nullable text column before Phase 4) |
| Advanced AI features | `ai_reports.report_json` is freeform JSONB — add new sections without migration |
| Nutrition photo/barcode (full) | `nutrition_logs.input_method` accepts 'photo' / 'barcode' already; Phase 4 wires up the AI backends |

---

## Appendix: File Structure for Phase 3

```
mobile/
├── app/
│   ├── _layout.tsx              # Updated: auth guard logic
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   ├── forgot-password.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Home / Today
│   │   ├── journal.tsx          # Journal + block editor
│   │   ├── tracker.tsx          # Cycle Tracker
│   │   ├── activities.tsx       # Activities (3-tab)
│   │   └── you/
│   │       ├── index.tsx        # Profile root
│   │       ├── ai-report.tsx
│   │       ├── medication.tsx
│   │       ├── nutrition.tsx
│   │       ├── support-network.tsx
│   │       ├── relapse-signature.tsx
│   │       ├── routine.tsx
│   │       └── themes.tsx
│   ├── activity/
│   │   └── [id].tsx             # Activity Detail
│   ├── community/
│   │   └── index.tsx
│   ├── psychiatrists/
│   │   └── index.tsx
│   └── workbook.tsx
├── components/ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── CycleStateDot.tsx
│   ├── MoodScale.tsx
│   ├── SectionHeader.tsx
│   ├── EmptyState.tsx
│   ├── CycleWaveGraph.tsx
│   ├── WellnessRadar.tsx
│   ├── ActivityCard.tsx
│   ├── SleepDots.tsx
│   ├── MedicationStatusRow.tsx
│   ├── JournalBlockEditor.tsx
│   ├── CrisisOverlay.tsx
│   ├── SocialRhythmRow.tsx
│   ├── CompanionCard.tsx
│   ├── ReportSection.tsx
│   └── NutritionCategoryPicker.tsx
├── stores/
│   ├── auth.ts
│   ├── today.ts
│   ├── journal.ts
│   ├── cycle.ts
│   ├── activities.ts
│   ├── community.ts
│   └── ai.ts
├── lib/
│   ├── supabase.ts              # Existing
│   └── groq.ts                 # New — Groq API client
├── types/
│   └── database.ts              # Updated with all Phase 3 tables
└── utils/
    ├── cycleColors.ts           # CycleState → colour mapping
    ├── moodEmoji.ts             # Score → emoji mapping
    ├── offlineQueue.ts          # Pending writes queue
    └── dateUtils.ts             # ISO date helpers (wraps date-fns)
```
