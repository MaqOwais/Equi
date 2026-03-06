# 4B Implementation Summary — Social Rhythm & IPSRT

**Status:** ⏳ Not yet implemented
**Design doc:** [4b-social-rhythm.md](./4b-social-rhythm.md)

---

This summary will be written after Phase 4B is built.

## Planned Deliverables

- `supabase/migrations/4b_social_rhythm.sql` — `social_rhythm_logs` + `routine_anchor_logs`
- `utils/socialRhythm.ts` — score calculation (±30/60min windows)
- `stores/socialRhythm.ts` — load, logAnchor, inferFromSleep
- `app/(tabs)/you/social-rhythm.tsx` — 30-day history chart + anchor breakdown + IPSRT education cards
- Today screen — rhythm chip in Daily Check-ins
- Routine screen — "Log actual time" per anchor
- Wellness Radar social axis unlocked
- AI report social rhythm section uses real data

See [4b-social-rhythm.md](./4b-social-rhythm.md) for full spec.
