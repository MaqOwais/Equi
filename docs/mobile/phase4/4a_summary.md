# 4A Implementation Summary — Sleep & Wearable Sync

**Status:** ✅ Complete
**Migration:** `mobile/supabase/migrations/4a_sleep_wearables.sql`

---

## What Was Built

### Files Created
| File | Description |
|---|---|
| `supabase/migrations/4a_sleep_wearables.sql` | `sleep_logs` + `wearable_connections` tables + enums (idempotent) |
| `lib/healthkit.ts` | HealthKit permissions + sleep fetch — graceful no-op in Expo Go / Android |
| `stores/sleep.ts` | `load`, `logManual`, `syncFromHealthKit`, `setWearableConnection`, `refreshConnections` |
| `app/(tabs)/you/wearable-setup.tsx` | Connect/disconnect/sync UI, last 7 nights list, "what we read" section |
| `app/(tabs)/you/sleep-detail.tsx` | 30-day SVG bar chart, averages, quality breakdown, source label |

### Files Modified
| File | Change |
|---|---|
| `types/database.ts` | Added `SleepLog`, `WearableConnection`, `SleepSource`, `WearableProvider` types |
| `app/(tabs)/index.tsx` | Sleep store import; morning sleep prompt card (before 14:00 if not logged); logged chip |
| `app/(tabs)/you/index.tsx` | Sleep store import + load call; Wellness Radar sleep axis unlocked; "Wearable" menu section |
| `app/(tabs)/tracker.tsx` | `SleepMiniChart` SVG component; sleep mini-chart below 90-day cycle graph |

---

## SQL Schema Added

```sql
create type sleep_source as enum ('manual', 'healthkit', 'google_fit');
create type wearable_provider as enum ('healthkit', 'google_fit');

create table sleep_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  date             date not null,
  duration_minutes int,
  quality_score    int check (quality_score between 1 and 5),
  source           sleep_source default 'manual',
  bedtime          time,
  wake_time        time,
  deep_minutes     int,
  rem_minutes      int,
  awakenings       int,
  raw_healthkit    jsonb,
  created_at       timestamptz default now(),
  unique (user_id, date)
);

create table wearable_connections (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  provider         wearable_provider not null,
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  connected_at     timestamptz default now(),
  last_synced_at   timestamptz,
  unique (user_id, provider)
);
```

**Note:** Migration made idempotent after first run returned `ERROR: 42P07: relation "sleep_logs" already exists`. Uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, and `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for enums.

---

## HealthKit Integration (`lib/healthkit.ts`)

- **Dynamic import guard** — `expo-health` is only available in native builds. The file uses `await import('expo-health' as string)` inside a `try/catch` so it imports safely in Expo Go without crashing.
- **Platform guard** — All functions return `false`/`null` immediately on `Platform.OS !== 'ios'`.
- **Sleep aggregation** — Sums all non-InBed stages for total duration. Identifies earliest sleep onset and latest wake time. Counts `AWAKE` stage occurrences as `awakenings`.
- **Night-of date** — If wake time is before noon, the date is assigned to the previous calendar day (handles overnight sleep correctly).
- **Quality from duration** — Estimated quality score (1–5) derived from duration bucket when no explicit quality signal is available from HealthKit.

---

## Wellness Radar — Sleep Axis Unlocked

`you/index.tsx` now calculates the sleep radar score from `sleep.history`:

```ts
sleep: (() => {
  const sleepLogs = sleep.history;
  if (!sleepLogs.length) return 0;
  const avg = sleepLogs.reduce((a, b) => a + (b.duration_minutes ?? 0), 0) / sleepLogs.length;
  return Math.min(100, Math.round((avg / 480) * 100)); // 8h = 100
})(),
```

---

## Sleep Prompt on Today Screen

- Shown only before 14:00 if `sleep.todayLog === null`.
- 5 options: Poorly / Light / OK / Good / Great (scores 1–5).
- After logging: collapses into a "Sleep logged · Good · 7h 30m" chip.
- Sky blue (`#89B4CC`) used as the sleep accent colour — distinct from the sage green used for mood/activity.

---

## SleepMiniChart on Tracker

- 30-day bar chart using `react-native-svg` `Rect` elements — one bar per calendar day.
- Bars coloured by quality score: poor = mauve, ok = sand, good = sage, great = sky.
- Dashed reference line at 7h mark using `SvgLine` with `strokeDasharray`.
- Empty state shows instructional text if no sleep data logged.

---

## Key Decisions Made During Implementation

- **Manual sleep entry uses quality buckets** — duration inferred from `QUALITY_DURATION` map (`{1: 270, 2: 330, 3: 390, 4: 450, 5: 510}` minutes). Keeps the entry experience to a single 5-option tap.
- **Don't overwrite higher-fidelity source** — `syncFromHealthKit` skips upsert if an existing log for the same date has `source !== 'manual'`, preventing a re-sync from downgrading a detailed wearable record to an estimated one.
- **Google Fit** — Connection card shown in UI but marked "Coming soon". OAuth flow deferred; infrastructure (table column) is ready.
- **`wearable_connections` stores token fields** — `access_token` / `refresh_token` columns exist but are not encrypted at the application layer in Phase 4A. Supabase Vault encryption deferred; tokens are not used yet (HealthKit doesn't use OAuth tokens).

---

## Deviations from Design Doc

- Background fetch (`expo-background-fetch`) not configured — HealthKit sync is foreground-only in Phase 4A (triggered manually via "Sync now" or on app foreground).
- `expo-health` package not yet installed — all HealthKit code is safely guarded and the UI degrades gracefully. Install when CocoaPods is available and native build is set up.
- Sleep detail screen links to wearable setup rather than a manual time entry sheet — manual entry simplified to the quality prompt on the Today screen.
