# 4B Implementation Summary — Social Rhythm & IPSRT

**Status:** ✅ Implemented
**Design doc:** [4b-social-rhythm.md](./4b-social-rhythm.md)

---

## What Was Built

Phase 4B closes the IPSRT loop: users can log when they actually hit their daily routine anchors, a Social Rhythm Score (0–100) is calculated from those logs, and a 30-day history screen shows trends + per-anchor breakdowns. The Wellness Radar social axis is now real data.

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/4b_social_rhythm.sql` | `routine_anchor_logs` + `social_rhythm_logs` tables, idempotent RLS |
| `utils/socialRhythm.ts` | `calculateRhythmScore`, `timeDeltaMinutes`, `scoreColor`, `nowHHMM` |
| `stores/socialRhythm.ts` | Zustand: `load`, `logAnchor`, `inferFromSleep` |
| `app/(tabs)/you/social-rhythm.tsx` | History screen — score card, 30-day bar chart, anchor breakdown, IPSRT education |

## Files Modified

| File | Change |
|---|---|
| `types/database.ts` | Added `AnchorDetailEntry`, `RoutineAnchorLog`, `SocialRhythmLog` |
| `app/(tabs)/you/routine.tsx` | Log button + actual-time inline picker per anchor |
| `app/(tabs)/index.tsx` | Rhythm chip in Daily Check-ins (anchors hit / total + mini progress bar) |
| `app/(tabs)/you/index.tsx` | Social axis uses 30-day avg rhythm score; Social Rhythm History menu item; updated radar note |

---

## Score Algorithm

```
For each anchor with a target_time set:
  logged within ±30 min → 1.0 pt  (full)
  logged within ±60 min → 0.5 pts (partial)
  not logged / >60 min  → 0 pts

Score = (total points / anchors with target) × 100  [0–100]
```

Calculation in `utils/socialRhythm.ts`. After each `logAnchor`, score is upserted into `social_rhythm_logs`.

**Colour:** ≥80% sage, 50–79% sand, <50% mauve.

---

## Key Decisions & Notes

- **Midnight crossing**: `timeDeltaMinutes` uses `Math.min(diff, 1440 - diff)` — so 23:45 vs 00:05 = 20 min, not 23h 40m.
- **HealthKit inference**: `inferFromSleep(userId, anchors, wakeTime, bedtime)` auto-logs the `wake` and `bedtime` anchors after a sleep sync, but only if they haven't been manually logged today.
- **Rhythm chip hidden** when `todayAnchorsTotal === 0` — new users without anchors configured don't see an empty widget on Today screen.
- **Chart coloured by score range** (not cycle state) — cycle-state join deferred to Phase 4E.
- **Trend** = last 7-day avg vs prior 7-day avg; ±5% threshold for Improving / Declining / Stable.

---

## Schema

### `routine_anchor_logs`
```sql
user_id, anchor_id → routine_anchors, date, actual_time time, source text
UNIQUE (user_id, anchor_id, date)
```

### `social_rhythm_logs`
```sql
user_id, date, score int CHECK (0–100),
anchors_hit, anchors_partial, anchors_total,
anchor_detail jsonb  -- [{ anchor_id, anchor_name, target, actual, delta_minutes }]
UNIQUE (user_id, date)
```
