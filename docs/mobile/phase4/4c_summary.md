# 4C Implementation Summary — Smart Notifications

**Status:** ⏳ Not yet implemented
**Design doc:** [4c-notifications.md](./4c-notifications.md)

---

This summary will be written after Phase 4C is built.

## Planned Deliverables

- `supabase/migrations/4c_notifications.sql` — `notification_preferences` table
- `lib/notifications.ts` — token registration, schedule daily, early warning, post-crisis
- `stores/notifications.ts` — load, save, registerToken
- `app/(tabs)/you/notifications.tsx` — settings screen with all toggles + time pickers
- `app/_layout.tsx` — notification handler + tap-to-navigate
- Supabase Edge Function `check-and-send` — skip-if-logged logic
- pg_cron jobs for nightly Edge Function calls
- CrisisOverlay — timestamp on open for post-crisis check-in trigger
- Early warning trigger in `stores/ai.ts` after report generation

See [4c-notifications.md](./4c-notifications.md) for full spec.
