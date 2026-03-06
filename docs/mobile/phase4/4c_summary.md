# 4C Implementation Summary — Smart Notifications

**Status:** ✅ Implemented
**Design doc:** [4c-notifications.md](./4c-notifications.md)

---

## What Was Built

Minimal, strictly opt-in push notifications. Every type is independently togglable. Daily reminders skip server-side if already logged. Event-triggered notifications (early warning, post-crisis) fire from the client.

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/4c_notifications.sql` | `notification_preferences` table (one row per user), idempotent RLS |
| `lib/notifications.ts` | Token registration, schedule/cancel per type, `applyNotificationPreferences` |
| `stores/notifications.ts` | Zustand: `load`, `save`, `registerToken` |
| `app/(tabs)/you/notifications.tsx` | Settings screen — 6 toggles, inline time pickers for reminders |
| `supabase/functions/check-and-send/index.ts` | Edge Function: skip-if-logged, sends Expo push to eligible users |

## Files Modified

| File | Change |
|---|---|
| `types/database.ts` | Added `NotificationPreferences` interface |
| `app/_layout.tsx` | `setNotificationHandler` (foreground display), tap-to-navigate listener, `registerToken` + `load` on session |
| `stores/crisis.ts` | Added `lastOpenedAt`; `open()` records timestamp + schedules post-crisis if pref on |
| `stores/ai.ts` | After report generation: `early_warning_flags.length >= 2` → `scheduleEarlyWarningNotification` |
| `app/(tabs)/index.tsx` | SOS button passes `post_crisis_enabled` pref to `crisis.open()` |
| `app/(tabs)/you/index.tsx` | Notifications menu item routes to `/(tabs)/you/notifications` |

---

## Notification Types

| Type | Default | Identifier | Trigger |
|---|---|---|---|
| Mood check-in | On | `mood-checkin` | Daily local, user-set time (20:00) |
| Medication | On | `medication-reminder` | Daily local, user-set time (08:00) |
| Weekly report | On | via Edge Function | pg_cron Sunday 10:00 AM |
| Early warning | On | `early-warning-{reportId}` | Immediate after AI report with ≥2 flags |
| Anchor nudges | Off | `anchor-{name}` | Daily local, 15 min before anchor target |
| Post-crisis | Off | `post-crisis-{ts}` | One-time, 24h after SOS opened |

**No sound on any notification.** No engagement-maximising pings.

---

## Key Decisions & Notes

- **Local vs push**: Mood, medication, anchor nudges are local — no server. Weekly report requires Expo push token. Early warning and post-crisis are local.
- **`applyNotificationPreferences`** reschedules everything on each `save()` — atomic and consistent.
- **`useNotificationsStore.getState()`** used in `stores/ai.ts` to read prefs outside React components (standard Zustand pattern).
- **Android channel** set during token registration for reliable delivery.
- **pg_cron setup** documented in Edge Function comments — run once after deploy.

---

## Schema

### `notification_preferences` (one row per user)
```sql
push_token text, push_token_updated_at,
checkin_enabled bool default true,  checkin_time time default '20:00',
medication_enabled bool default true, medication_time time default '08:00',
weekly_report_enabled bool default true,
early_warning_enabled bool default true,
anchor_nudges_enabled bool default false,
post_crisis_enabled bool default false
```

## Deployment Steps (Supabase)

1. Run `4c_notifications.sql` in SQL editor
2. `supabase functions deploy check-and-send`
3. Add pg_cron jobs (documented in Edge Function header)
