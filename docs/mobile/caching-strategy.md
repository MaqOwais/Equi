# Equi — Caching & Storage Strategy

## Overview

The app uses three layers of caching, applied depending on how frequently data changes and how critical freshness is.

```
Layer 1: In-memory (Zustand store state)       — zero I/O, lost on app restart
Layer 2: AsyncStorage / local-day-store        — persists across restarts, no network
Layer 3: Supabase                              — source of truth, network required
```

Every store's `load()` checks the cheapest layer first and only falls through if needed.

---

## Store-by-Store Reference

### Stores with TTL-based caching (`lastLoaded`)

These stores add a `lastLoaded: number | null` timestamp to state. On each `load()` call, if less than the TTL has elapsed, the call returns immediately without any I/O.

All mutations that change data **invalidate the cache** by setting `lastLoaded: null`, so the next `load()` always re-fetches fresh data after a write.

| Store | TTL | Invalidated by | Notes |
|---|---|---|---|
| `medications.ts` | 5 min | `addMedication`, `updateMedication`, `deleteMedication`, `addSubstance`, `deleteSubstance` | Medications change monthly at most |
| `activities.ts` | 5 min | `complete` | Activity library never changes; completions written locally first |
| `companion.ts` | 5 min | — | Makes N+1 Supabase queries (one per watched patient); rarely changes |
| `sleep.ts` | 5 min | `logManual` | Invalidates on manual log so home screen reflects it immediately |
| `access.ts` | 5 min | — | Loads psychiatrist connection + all companion share settings |
| `psychiatrists.ts` | 30 min | — | Full directory; data changes rarely |

**Usage pattern:**
```typescript
// Normal load — skips if fresh
store.load(userId);

// Force refresh (e.g. after an external change or pull-to-refresh)
store.load(userId, true);
```

---

### Stores with local-first caching (AsyncStorage / local-day-store)

These stores read from `AsyncStorage` (via `local-day-store.ts`) before hitting Supabase. Data written by the user is saved locally first, making the app feel instant and work offline.

#### `today.ts`

```
load(userId)
  → getLocal(userId, today)       ← returns immediately if found
  → Supabase fallback             ← only on first launch or after reinstall
```

- All log actions (`logMood`, `logCycle`, `logCheckin`, `logMedication`) write to AsyncStorage synchronously.
- Supabase sync happens separately (deferred / background).
- **Never needs a staleness check** — local data for today is always the most recent user action.

#### `tasks.ts`

```
loadDate(userId, date)
  → getLocalDate(userId, date)    ← returns immediately if found
  → Supabase fallback             ← only for dates not yet cached locally

loadRange(userId, from, to)
  → getLocalDate per date         ← each date checked individually
  → Supabase fallback per missing date
```

- Optimistic updates: mutations update local state and AsyncStorage immediately, then sync to Supabase.

#### `journal.ts`

Three-layer hierarchy per date entry:

```
loadEntry(userId, date)
  → entries[date] in memory       ← returns immediately if already loaded this session
  → getLocal(userId, date)        ← AsyncStorage, returns if journalText exists
  → Supabase fallback             ← for older entries / after reinstall
```

- Once a date is loaded into the Zustand `entries` record, it stays for the session.
- `saveEntry` writes to AsyncStorage immediately (optimistic), Supabase sync deferred.

#### `activities.ts` (partial local)

- Completions are written to AsyncStorage in `complete()` for calendar display.
- The store-level `lastLoaded` TTL handles the full load cache (see above).

#### `sleep.ts` (partial local)

- `logManual` writes to AsyncStorage via `saveLocal` for deferred sync.
- The store-level `lastLoaded` TTL handles the full load cache.

---

### `homeLayout.ts` — AsyncStorage only (no Supabase)

```
load()
  → AsyncStorage.getItem(STORAGE_KEY)   ← user's saved section order
  → falls back to DEFAULT_ORDER
```

- `isLoaded: boolean` flag prevents redundant loads within a session.
- All mutations (moveUp, moveDown, show, hide, reset) write to AsyncStorage synchronously.
- **No Supabase involvement** — layout is purely local preference.

---

### Stores with no caching (intentional)

| Store | Reason |
|---|---|
| `notifications.ts` | Re-schedules all local notifications on every `load()` to handle reinstall/data wipe. Caching would prevent notification re-scheduling. |
| `community.ts` | Live social feed — must always be fresh. Uses cursor-based pagination (`loadMore`). |
| `ai.ts` | Reports are explicitly user-triggered, not polled. `loadLatest` is called once per session. |
| `auth.ts` | Session state managed by Supabase Auth listener, not polled. |
| `crisis.ts` | Safety-critical — always fetches current state. |

---

### Stores that are date/page keyed (effectively cached by structure)

| Store | Strategy |
|---|---|
| `journal.ts` | `entries` Record keyed by `YYYY-MM-DD` — loaded dates stay in memory |
| `tasks.ts` | `byDate` Record keyed by `YYYY-MM-DD` — loaded dates stay in memory |
| `calendar.ts` | Keyed by month string — each month loaded once per session |
| `substanceLogs.ts` | Per-date load — fetched once per date per session |
| `cycle.ts` | `load90Days` called once on tracker mount; `loadDay` per date |

---

## local-day-store.ts

Central AsyncStorage utility used by `today`, `tasks`, `journal`, `activities`, `sleep`.

```typescript
// Key format: equi_day_{userId}_{YYYY-MM-DD}
saveLocal(userId, date, partialData)   // merges into existing record
getLocal(userId, date)                 // returns full DayRecord or null
```

**Fields stored per day:**
```typescript
interface DayRecord {
  moodScore?: number;
  cycleState?: string;
  cycleIntensity?: number;
  cycleSymptoms?: string[];
  cycleNotes?: string | null;
  journalText?: string;
  alcohol?: boolean;
  cannabis?: boolean;
  medicationStatus?: string;
  medicationSkipReason?: string | null;
  medicationSideEffects?: string[];
  sleepQuality?: number;
  sleepDuration?: number;
  activityCompletions?: { activityId: string; name: string; completedAt: string }[];
}
```

---

## Rules for adding new stores

1. **Ask: does this data change in real time?**
   - Yes (community feed, live notifications) → no cache.
   - No (user preferences, static library, connections) → add `lastLoaded` TTL.

2. **Ask: is this data user-authored (entered on device)?**
   - Yes (journal, tasks, mood logs) → write to `local-day-store` first, sync to Supabase deferred.
   - No → use TTL cache or fetch directly.

3. **Ask: is this date-keyed?**
   - Yes → use a `Record<string, T>` in the store; loaded dates stay in memory automatically.
   - No → use `lastLoaded` TTL.

4. **Does the mutation need to invalidate the cache?**
   - Yes → set `lastLoaded: null` in the mutation's `set()` call.
   - The next `load()` will re-fetch fresh data from Supabase.

5. **Expose a `force` parameter** on all TTL-cached `load()` functions so screens can bypass the cache for pull-to-refresh or post-mutation reloads:
   ```typescript
   load: async (userId: string, force = false) => {
     const { lastLoaded } = get();
     if (!force && lastLoaded && Date.now() - lastLoaded < 5 * 60 * 1000) return;
     // ...fetch
   }
   ```

---

## TTL Reference

| TTL | Used for |
|---|---|
| In-memory (session) | Per-date records (journal, tasks, cycle, calendar) |
| 5 minutes | User-specific data that changes infrequently (medications, sleep, access, companion, activities) |
| 30 minutes | Shared/global data that rarely changes (psychiatrist directory) |
| No TTL | Live feeds, safety-critical, notification-scheduling stores |
