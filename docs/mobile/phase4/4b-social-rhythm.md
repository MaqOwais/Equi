# Phase 4B — Social Rhythm & IPSRT

Interpersonal and Social Rhythm Therapy (IPSRT) is one of the most evidence-based psychosocial treatments for bipolar disorder. Its core mechanism is stabilising daily routines and social rhythms — consistent wake times, meal times, and social contact times — to prevent episode destabilisation.

Equi already has the `routine_anchors` table and the Daily Routine Builder screen (Phase 3C). Phase 4B closes the loop: it records *whether the user actually hit their anchors each day*, calculates a daily social rhythm score, displays a history view, and feeds the score into the Wellness Radar and AI report.

← [Phase 4 README](./README.md)

---

## What is a Social Rhythm Score?

Each `routine_anchor` has a `target_time`. A score is calculated once per day:

```
For each anchor:
  If logged within ±30 minutes of target → full point (1.0)
  If logged within ±60 minutes of target → partial point (0.5)
  If not logged or outside ±60 min       → 0 points

Social Rhythm Score = (sum of points / number of anchors) × 100
```

Score range: 0–100. Displayed as a percentage and colour-coded:
- ≥ 80 → sage green
- 50–79 → warm sand
- < 50 → mauve

The score is intentionally forgiving — the goal is trend awareness, not perfectionism.

---

## Social Rhythm History Screen

Route: `/(tabs)/you/social-rhythm`
Entry: `You → Wellbeing Tools → Daily Routine → View History` or tapping the Social axis on the Wellness Radar.

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Social Rhythm            │
│                             │
│  YOUR RHYTHM SCORE          │
│  ┌───────────────────────┐  │
│  │  30-day average       │  │
│  │                       │  │
│  │       72%             │  │
│  │  ████████████░░░      │  │
│  │                       │  │
│  │  Improving trend ↑    │  │
│  └───────────────────────┘  │
│                             │
│  30-DAY CHART               │
│  ┌───────────────────────┐  │
│  │100%│                  │  │
│  │ 75%│  ╭──╮  ╭────╮   │  │
│  │ 50%│╭╯  ╰──╯    ╰──  │  │
│  │ 25%│╯                 │  │
│  │    └──────────────────│  │
│  │    Mar 1         Mar 31│  │
│  └───────────────────────┘  │
│  Coloured by cycle state:   │
│  🟢 Stable  🔵 Manic  🟣 Low│
│                             │
│  ANCHOR BREAKDOWN           │
│  ┌───────────────────────┐  │
│  │  Wake up    ●●●●●  92%│  │
│  │  Breakfast  ●●●●○  78%│  │
│  │  Exercise   ●●○○○  44%│  │
│  │  Dinner     ●●●●○  81%│  │
│  │  Bedtime    ●●●●●  96%│  │
│  │  First social ●●●○○  63%│
│  └───────────────────────┘  │
│                             │
│  ABOUT SOCIAL RHYTHM        │
│  Regular daily routines are │
│  linked to fewer and shorter│
│  bipolar episodes (Frank    │
│  et al., 2005).             │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

## Daily Rhythm Log (Today Screen Update)

After a user logs their routine anchors (from the routine builder), the Today screen shows a rhythm chip for the day.

<details>
<summary>View wireframe (Today screen rhythm chip)</summary>

```
┌─────────────────────────────┐
│  DAILY CHECK-INS            │
│  ┌───────────────────────┐  │
│  │  🗓  Daily Routine    │  │
│  │  Today: 4 / 6 anchors │  │
│  │  ████████░░  67%      │  │
│  │  [ Log anchors ]      │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

</details>

---

## Anchor Logging Flow

The Daily Routine Builder (Phase 3C) lets users set target times. Phase 4B adds the ability to log actual times each day. This can be:

1. **Active logging** — user taps "Log Now" on a routine anchor card (timestamps the action).
2. **Manual time entry** — user enters the actual time after the fact.
3. **Wearable inference** — if HealthKit is connected:
   - Wake time → inferred from `SleepAnalysis` wake event.
   - Bedtime → inferred from `SleepAnalysis` sleep onset.

<details>
<summary>View wireframe (anchor logging sheet)</summary>

```
┌─────────────────────────────┐
│  Log Anchor: Bedtime        │
│                             │
│  Target:  10:30 PM          │
│                             │
│  ○  Log now  (11:02 PM)     │
│  ●  Enter a time:           │
│     ┌──────────────────┐    │
│     │   10 : 45  PM    │    │
│     └──────────────────┘    │
│                             │
│  [ Save ]                   │
└─────────────────────────────┘
```

</details>

---

## IPSRT Educational Content

Shown on the Social Rhythm History screen beneath the score — brief, non-prescriptive. References cited.

Content cards:
- **Why rhythm matters** — Frank et al. (2005) on social rhythm therapy and bipolar stability.
- **The 30-minute window** — research context for the ±30min threshold.
- **The hardest anchor** — dynamically shows the user's lowest-scoring anchor with a gentle tip.

These are static text cards, not AI-generated, to ensure accuracy.

---

## Data Model

### `social_rhythm_logs` table

```sql
create table social_rhythm_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  date             date not null,
  score            int check (score between 0 and 100),     -- daily aggregate score
  anchors_hit      int,                                      -- count of anchors within ±30min
  anchors_partial  int,                                      -- count within ±60min
  anchors_total    int,                                      -- total anchors configured
  anchor_detail    jsonb,     -- per-anchor: { anchor_id, target, actual, delta_minutes }
  created_at       timestamptz default now(),
  unique (user_id, date)
);

alter table social_rhythm_logs enable row level security;
create policy "Users own their rhythm logs"
  on social_rhythm_logs for all using (auth.uid() = user_id);
```

### `routine_anchor_logs` table

Individual actual-time records per anchor per day (source for score calculation).

```sql
create table routine_anchor_logs (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  anchor_id   uuid references routine_anchors on delete cascade not null,
  date        date not null,
  actual_time time not null,
  source      text default 'manual',   -- 'manual' | 'healthkit' | 'auto_log_now'
  created_at  timestamptz default now(),
  unique (user_id, anchor_id, date)
);

alter table routine_anchor_logs enable row level security;
create policy "Users own their anchor logs"
  on routine_anchor_logs for all using (auth.uid() = user_id);
```

Score calculation happens client-side after logs are saved, then upserted into `social_rhythm_logs`.

---

## Implementation Notes

### Score Calculation (`utils/socialRhythm.ts`)

```ts
export function calculateRhythmScore(
  anchors: RoutineAnchor[],
  logs: RoutineAnchorLog[],
): number {
  if (!anchors.length) return 0;

  const logMap = new Map(logs.map((l) => [l.anchor_id, l.actual_time]));
  let total = 0;

  for (const anchor of anchors) {
    const actual = logMap.get(anchor.id);
    if (!actual) continue;

    const delta = Math.abs(timeDeltaMinutes(anchor.target_time, actual));
    if (delta <= 30)      total += 1.0;
    else if (delta <= 60) total += 0.5;
  }

  return Math.round((total / anchors.length) * 100);
}
```

### Stores

**`stores/socialRhythm.ts`** — new Zustand store:
- `todayScore: number | null`
- `history: SocialRhythmLog[]` — 30-day history
- `load(userId)` — fetch history
- `logAnchor(userId, anchorId, actualTime)` — upserts `routine_anchor_logs`, recalculates + upserts `social_rhythm_logs`
- `inferFromSleep(userId, wakeTime, sleepOnset)` — auto-log wake/bedtime anchors from HealthKit data

### Wellness Radar update

In `you/index.tsx`, replace:
```ts
social: 0,  // Social rhythm — from social_rhythm_logs (Phase 4)
```
with:
```ts
social: Math.round(avgRhythmScore),  // 30-day average from social_rhythm_logs
```

---

## Checklist

- [ ] `social_rhythm_logs` + `routine_anchor_logs` tables created in Supabase
- [ ] `utils/socialRhythm.ts` — score calculation function with tests
- [ ] `stores/socialRhythm.ts` — load, logAnchor, inferFromSleep
- [ ] `app/(tabs)/you/social-rhythm.tsx` — history chart + anchor breakdown + IPSRT education cards
- [ ] Today screen — rhythm chip in Daily Check-ins card
- [ ] Routine screen (Phase 3C) — add "Log actual time" per anchor
- [ ] HealthKit inference — auto-log wake/bedtime anchors after sleep sync
- [ ] Wellness Radar social axis filled
- [ ] AI report — `social_rhythm` section now uses real data
