# 3C Implementation Summary — Activities & Wellbeing

**Status:** ✅ Complete
**Migration:** `mobile/supabase/migrations/3c_activities_wellbeing.sql`

---

## What Was Built

### Files Created
| File | Description |
|---|---|
| `stores/activities.ts` | Load activities + completions + prescribed; complete; toggleBookmark |
| `app/(tabs)/activities.tsx` | 3-tab activities screen (All / Prescribed / Working for Me) |
| `app/activity/[id].tsx` | Activity detail — bookmark, complete, note sheet, past completions |
| `app/workbook.tsx` | 4-chapter bipolar workbook with chapter locking |
| `app/(tabs)/you/_layout.tsx` | Stack layout for `you/` sub-screens |
| `app/(tabs)/you/index.tsx` | Profile screen (replaces you.tsx placeholder) |
| `app/(tabs)/you/routine.tsx` | Daily Routine Builder — 6 IPSRT anchors with custom time picker |
| `app/(tabs)/you/nutrition.tsx` | Nutrition log — 11 food categories with +/− counters, auto-save |

### Files Deleted
| File | Reason |
|---|---|
| `app/(tabs)/you.tsx` | Replaced by `you/` folder with Stack navigation |

---

## SQL Schema Added

```sql
create table activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes int,
  category text,   -- 'grounding' | 'movement' | 'social' | 'creative' | 'mindfulness' | 'workbook'
  compatible_states cycle_state[],
  restricted_states cycle_state[],
  is_workbook_entry boolean default false,
  illustration_url text,
  evidence_label text,
  created_at timestamptz default now()
);
-- No RLS — activities are global (read by all authenticated users)

create table activity_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  activity_id uuid references activities on delete cascade,
  completed_at timestamptz,
  cycle_state cycle_state,
  notes text,
  bookmarked boolean default false,
  created_at timestamptz default now()
);

create table prescribed_activities (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users on delete cascade,
  psychiatrist_id uuid,
  activity_id uuid references activities,
  dosage_per_week int,
  goal text,
  prescribed_at timestamptz default now(),
  active boolean default true
);

create table workbook_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  chapter int not null,
  prompt_index int not null,
  response text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, chapter, prompt_index)
);

create table routine_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  anchor_name text not null,
  target_time time,
  enabled boolean default true,
  created_at timestamptz default now()
);

create table nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  categories jsonb not null default '{}',
  eating_window_start time,
  eating_window_end time,
  hydration_glasses int,
  gut_health_note text,
  input_method text default 'manual',
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
```

**Seed data:** 12 activities inserted — including Box Breathing, Morning Walk, Gratitude Jar (restricted from manic state), Compliment Diary (restricted from manic), Cold Water Technique, Progressive Muscle Relaxation, and others.

---

## Key Decisions Made During Implementation

- **`you.tsx` → `you/` folder** — Expo Router does not allow a file and folder with the same name. `you.tsx` deleted via Bash before `you/` folder was created.
- **Custom time picker** — `@react-native-community/datetimepicker` was not installed. Built an inline `TimePicker` component using ▲/▼ `TouchableOpacity` buttons (hours 0–23, minutes in 15-min steps).
- **Workbook chapter locking** — A chapter is locked until all 4 prompts of the previous chapter are answered. Check is client-side using `workbook_responses` data.
- **Activities 3-tab layout** — Inner tab switching implemented with local state (`activeTab`), not Expo Router tabs, to avoid nested navigator complexity.
- **Nutrition auto-save** — Debounced 1.2 seconds after any +/− tap. Lithium interaction warning shown inline (not a modal) when `caffeine >= 3` and diagnosis is `bipolar_1` or `bipolar_2`.
- **Workbook navigates separately** — The Workbook card on the Activities tab uses `router.push('/workbook')` rather than `router.push('/activity/[id]')` since it has a fundamentally different UX.

---

## Deviations from Design Doc

- Activity illustrations (`illustration_url`) seeded as `null` — placeholder images not added in Phase 3.
- `prescribed_activities.psychiatrist_id` is nullable — actual psychiatrist connection not enforced until Phase 3D when the `psychiatrists` table was created.
- Nutrition: 11 categories implemented as defined; "gut health note" text field added but only shown as optional.
