# Phase 4A — Sleep & Wearable Sync

Connects Equi to Apple HealthKit and Google Fit to pull nightly sleep data automatically. Also adds a manual sleep entry path for users without wearables. Sleep data feeds the Wellness Radar, the Cycle Tracker chart, and the AI report.

← [Phase 4 README](./README.md)

---

## Wearable Setup Screen

Entry point: `You → Settings → Wearable sync` (currently "Coming soon").

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Wearable Sync            │
│                             │
│  Connect a health platform  │
│  to auto-import sleep data. │
│                             │
│  ┌───────────────────────┐  │
│  │  🍎  Apple Health     │  │
│  │  Sleep · Steps · HRV  │  │
│  │                       │  │
│  │  [ Connect ]          │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🔵  Google Fit       │  │
│  │  Sleep · Steps        │  │
│  │                       │  │
│  │  [ Connect ]          │  │
│  └───────────────────────┘  │
│                             │
│  WHAT WE READ               │
│  ✓  Sleep duration          │
│  ✓  Sleep stages (if avail) │
│  ✓  Resting heart rate      │
│  ✗  Location (never)        │
│  ✗  Call / message logs     │
│                             │
│  All data stays on-device   │
│  and in your private        │
│  Supabase account.          │
│  Nothing is sent to Groq.   │
│                             │
│  ─────────────────────────  │
│  OR ENTER SLEEP MANUALLY    │
│                             │
│  Equi will ask you each     │
│  morning if no sync data    │
│  was found for last night.  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

**Connected state:**
```
┌─────────────────────────────┐
│  ← Wearable Sync            │
│                             │
│  ┌───────────────────────┐  │
│  │  🍎  Apple Health     │  │
│  │  ✅  Connected        │  │
│  │  Last sync: 2h ago    │  │
│  │                       │  │
│  │  [ Sync now ]  [ Disconnect ] │
│  └───────────────────────┘  │
│                             │
│  LAST 7 NIGHTS              │
│  ┌───────────────────────┐  │
│  │  M  T  W  T  F  S  S  │  │
│  │  7  6  8  5  7  9  7  │  ← hours
│  │  ●  ●  ●  ◐  ●  ●  ●  │  ← quality dots
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

## Sleep Detail Screen

Route: `/(tabs)/you/sleep-detail`
Entry: tap the sleep summary on the Wearable Setup screen or the sleep chip on Today.

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Sleep                    │
│                             │
│  LAST NIGHT                 │
│  ┌───────────────────────┐  │
│  │  🌙  7h 24m           │  │
│  │  Quality: ●●●●○  4/5  │  │
│  │                       │  │
│  │  Fell asleep  11:12pm │  │
│  │  Woke up       6:36am │  │
│  │                       │  │
│  │  Deep sleep    1h 40m │  │
│  │  REM           1h 55m │  │
│  │  Light         3h 49m │  │
│  └───────────────────────┘  │
│                             │
│  30-DAY AVERAGE             │
│  ┌───────────────────────┐  │
│  │  Avg duration:  6h 52m│  │
│  │  Avg quality:   3.4/5 │  │
│  │                       │  │
│  │  BY CYCLE STATE:      │  │
│  │  Stable    7h 10m ●●●●│  │
│  │  Depressive 5h 48m ●●○│  │
│  │  Manic     4h 20m ●○○ │  │
│  └───────────────────────┘  │
│                             │
│  30-DAY CHART               │
│  ┌───────────────────────┐  │
│  │ 9h│       ╭─╮         │  │
│  │ 7h│──╮──╯  ╰──╮──    │  │
│  │ 5h│  ╰─╮        ╰─╮  │  │
│  │ 3h│    ╰──────────╯  │  │
│  │   └───────────────────│  │
│  │   Mar 1           Mar 31│
│  └───────────────────────┘  │
│  🔵 Manic  🟣 Depressive    │
│  🟢 Stable                  │
│                             │
│  [ + Log last night manually]│
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

## Manual Sleep Entry (Morning Prompt)

If no wearable sync data is found for last night, the Today screen shows a sleep chip prompting manual entry.

<details>
<summary>View wireframe (morning prompt on Today screen)</summary>

```
┌─────────────────────────────┐
│  TODAY                      │
│  ┌───────────────────────┐  │
│  │  🌙  How did you sleep?│  │
│  │                       │  │
│  │  ○ Poorly  (< 5h)     │  │
│  │  ○ Light   (5–6h)     │  │
│  │  ● OK      (6–7h)     │  │
│  │  ○ Good    (7–8h)     │  │
│  │  ○ Great   (8h+)      │  │
│  │                       │  │
│  │  [ Save ]             │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

</details>

Maps to quality scores: Poorly=1, Light=2, OK=3, Good=4, Great=5.
Duration is inferred from quality bucket midpoint when no exact time is available.

---

## Data Model

### `sleep_logs` table

```sql
create type sleep_source as enum ('manual', 'healthkit', 'google_fit');

create table sleep_logs (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  date            date not null,
  duration_minutes int,                     -- total sleep duration
  quality_score   int check (quality_score between 1 and 5),
  source          sleep_source default 'manual',
  bedtime         time,                     -- local time the user fell asleep
  wake_time       time,                     -- local time the user woke
  deep_minutes    int,                      -- from wearable stages (nullable)
  rem_minutes     int,                      -- from wearable stages (nullable)
  awakenings      int,                      -- number of wake events (nullable)
  raw_healthkit   jsonb,                    -- raw HealthKit payload (never sent to AI)
  created_at      timestamptz default now(),
  unique (user_id, date)
);

alter table sleep_logs enable row level security;
create policy "Users own their sleep logs"
  on sleep_logs for all using (auth.uid() = user_id);
```

### `wearable_connections` table

```sql
create type wearable_provider as enum ('healthkit', 'google_fit');

create table wearable_connections (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  provider         wearable_provider not null,
  access_token     text,                    -- encrypted at rest via Supabase Vault
  refresh_token    text,
  token_expires_at timestamptz,
  connected_at     timestamptz default now(),
  last_synced_at   timestamptz,
  unique (user_id, provider)
);

alter table wearable_connections enable row level security;
create policy "Users own their wearable connections"
  on wearable_connections for all using (auth.uid() = user_id);
```

---

## Implementation Notes

### HealthKit (iOS)

**Required package:**
```bash
npx expo install expo-health
```

**`app.json` plugin:**
```json
{
  "plugins": [
    ["expo-health", {
      "NSHealthShareUsageDescription": "Equi reads sleep data to correlate with your mood and cycle state.",
      "NSHealthUpdateUsageDescription": "Equi does not write health data."
    }]
  ]
}
```

**Permission request + sync flow (`lib/healthkit.ts`):**
```ts
import * as Health from 'expo-health';

export async function requestSleepPermissions() {
  return Health.requestAuthorizationAsync({
    read: [Health.HealthDataType.SleepAnalysis],
    write: [],
  });
}

export async function fetchLastNightSleep(): Promise<SleepSample | null> {
  const end = new Date();
  const start = new Date(end);
  start.setHours(start.getHours() - 14);  // look back 14h to catch late risers

  const samples = await Health.querySleepSamplesAsync({ startDate: start, endDate: end });
  // aggregate InBed + Asleep stages → total duration, quality estimate
  return aggregateSamples(samples);
}
```

**Important:** Only `SleepAnalysis` is requested. Never `HeartRate`, `StepCount`, or any other type unless explicitly added to the "WHAT WE READ" list and privacy policy.

### Google Fit (Android)

**Required package:**
```bash
npx expo install expo-google-fit
# or use the Google Fit REST API via OAuth2 — preferred for Expo Go compatibility
```

**OAuth2 flow:**
1. User taps "Connect Google Fit" → opens browser via `expo-web-browser`
2. After OAuth, store tokens encrypted in `wearable_connections`
3. Background sync via Supabase Edge Function `sync-google-fit` — triggered nightly via pg_cron

### Background Sync Strategy

| Platform | Strategy |
|---|---|
| iOS | `expo-background-fetch` task — runs when app is backgrounded. Pulls HealthKit data from last sync. |
| Android | Supabase Edge Function `sync-google-fit` runs via pg_cron at 06:00 user local time |
| Both | On app foreground: check if today's `sleep_log` row exists; if not, attempt sync |

### Stores

**`stores/sleep.ts`** — new Zustand store:
- `lastNight: SleepLog | null` — loaded on app foreground
- `history: SleepLog[]` — 30-day history loaded lazily
- `load(userId)` — fetches from `sleep_logs`
- `logManual(userId, quality, duration?)` — upsert manual entry
- `syncFromHealthKit(userId)` — calls `lib/healthkit.ts`, upserts result

### Wellness Radar update

In `you/index.tsx`, replace:
```ts
sleep: 0,  // Sleep — from sleep_logs (Phase 4)
```
with:
```ts
sleep: Math.min(100, Math.round((avgSleepHours / 8) * 100)),
```
where `avgSleepHours` is the 30-day average from `sleep_logs`.

---

## Checklist

- [ ] `sleep_logs` + `wearable_connections` tables created in Supabase
- [ ] `expo-health` installed and `app.json` plugin configured
- [ ] `lib/healthkit.ts` — permission request + sleep fetch
- [ ] `stores/sleep.ts` — load, manual log, HealthKit sync
- [ ] `app/(tabs)/you/wearable-setup.tsx` — connect / disconnect / sync status
- [ ] `app/(tabs)/you/sleep-detail.tsx` — 30-day chart + stage breakdown
- [ ] Today screen — morning sleep prompt if no log found
- [ ] Wellness Radar sleep axis filled
- [ ] Cycle Tracker — sleep mini-chart below 90-day wave
