# 3B Implementation Summary — Daily Tracking

**Status:** ✅ Complete
**Migration:** `mobile/supabase/migrations/3b_daily_tracking.sql`

---

## What Was Built

### Files Created
| File | Description |
|---|---|
| `stores/today.ts` | Zustand store: mood, cycle, medication, substances for today |
| `stores/cycle.ts` | 90-day cycle log history |
| `stores/journal.ts` | Journal entries keyed by date |

### Files Modified (replacing Phase 2 placeholders)
| File | Change |
|---|---|
| `app/(tabs)/index.tsx` | Full Today screen — mood emoji row, medication buttons, substance toggles, SOS button, rumination prompt |
| `app/(tabs)/tracker.tsx` | Cycle state selector, intensity chips, symptom grid, 90-day SVG bar graph |
| `app/(tabs)/journal.tsx` | Journal with cycle-state prompts, text entry, save/update |

---

## SQL Schema Added

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

create table mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  score smallint not null check (score between 1 and 10),
  cycle_state cycle_state,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  entry_date date not null default current_date,
  blocks text not null default '',   -- plain text in 3B; Lexical JSON deferred
  cycle_state cycle_state,
  mood_score smallint,
  locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);

create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  checkin_date date not null default current_date,
  alcohol boolean,
  cannabis boolean,
  created_at timestamptz default now(),
  unique (user_id, checkin_date)
);

create type medication_status as enum ('taken', 'skipped', 'partial');

create table medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  status medication_status not null,
  skip_reason text,
  side_effects text[],
  share_with_psychiatrist boolean default false,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
```

---

## Key Decisions Made During Implementation

- Mood logged with a single tap (no confirmation). Already-logged state shown dimmed and non-interactive.
- Medication "Skip" and "Partial" both open a bottom sheet for a skip reason before saving. "Taken" saves immediately.
- Substance toggles are stateful — tapping again toggles off (using optimistic update + upsert).
- Cycle state saved on the tracker screen via a dedicated "Save" button (not auto-save) to avoid accidental state changes.
- Journal: plain text (`blocks: string`) used instead of Lexical block editor — Lexical deferred to avoid `react-native-webview` complexity in Phase 3. Full block editor remains on the roadmap.
- 90-day cycle graph uses `react-native-svg` `Rect` elements — one bar per day, colour = cycle state.
- Rumination prompt shown if `moodScore !== null && moodScore <= 3` (current day only, not consecutive days as originally designed — simpler and sufficient for Phase 3).

---

## Bugs Fixed

- **CYCLE_PROMPTS apostrophe parse error** — Single-quoted string literals containing curly apostrophes (`'`, `'`) in `journal.tsx` caused the TypeScript parser to terminate strings early. Fixed by switching affected strings to double-quote delimiters:
  ```ts
  // Before (broken)
  depressive: 'You don't need to write much.',
  // After (fixed)
  depressive: "You don't need to write much — even a few words is enough.",
  ```

---

## Deviations from Design Doc

- `sleep_logs` table defined in the 3B design doc but **not created in 3B** — deferred to Phase 4A where the full sleep + wearable schema was built with richer fields (`duration_minutes`, `quality_score`, `source`, stages, etc.).
- `life_events` and `social_rhythm_logs` tables from design doc deferred to Phase 4B.
- Journal 48h lock enforced client-side only — Supabase cron Edge Function not deployed in Phase 3.
- Lexical block editor not implemented — plain text `TextInput` used instead.
