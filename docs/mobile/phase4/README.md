# Phase 4 — AI Enhancement & Wearable Integration

Phase 4 transforms Equi from a manual tracking app into a proactive health companion. It connects real-world physiological data (sleep, wearables) to the AI layer, adds smart notifications that respect the user's autonomy, enables clinical-grade PDF export, and upgrades the AI with longer-horizon pattern analysis.

Phase 3 must be fully complete before starting Phase 4. CocoaPods must be installed (`pod install` in `mobile/ios/`) before wearable APIs can be tested on device.

← [mobile/](../../)

---

## Sub-phases

| Phase | Name | Core Deliverable | Key Dependency |
|---|---|---|---|
| **4A** | Sleep & Wearable Sync | HealthKit + Google Fit + sleep_logs table | Native build (CocoaPods) |
| **4B** | Social Rhythm & IPSRT | Social rhythm score, full radar, IPSRT history view | 4A (sleep baseline) |
| **4C** | Smart Notifications | Expo Notifications + per-user preferences | 4A (so med/checkin reminders are accurate) |
| **4D** | PDF Export & Sharing | Edge Function → signed PDF URL, share with clinician | 4B (full report data) |
| **4E** | Enhanced AI | Sleep + social in prompts, 30-day analysis, activity recommendations | 4A + 4B |

---

## Goals

1. **Complete the Wellness Radar** — unlock the Sleep and Social axes that show `0` in Phase 3.
2. **Close the data loop** — wearable data feeds AI, AI feeds recommendations, recommendations feed back into cycle state awareness.
3. **Respect autonomy** — notifications are opt-in, time-controlled, and skipped when data is already logged.
4. **Clinical utility** — PDF export makes the AI report shareable with psychiatrists without manual screenshots.
5. **Zero new data retention risks** — Groq remains the AI backend with `store: false`; HealthKit/Fit tokens are stored encrypted in Supabase, never sent to Groq.

---

## New Tables Added in Phase 4

| Table | Phase | Purpose |
|---|---|---|
| `sleep_logs` | 4A | Nightly sleep records from manual entry or wearable |
| `wearable_connections` | 4A | OAuth tokens for HealthKit / Google Fit per user |
| `social_rhythm_logs` | 4B | Daily IPSRT anchor adherence scores |
| `notification_preferences` | 4C | Per-user notification type + timing config |

---

## New Screens Added in Phase 4

| Screen | Phase | Route |
|---|---|---|
| Wearable Setup | 4A | `/(tabs)/you/wearable-setup` |
| Sleep Detail | 4A | `/(tabs)/you/sleep-detail` |
| Social Rhythm History | 4B | `/(tabs)/you/social-rhythm` |
| Notification Settings | 4C | `/(tabs)/you/notifications` |

---

## Updated Screens in Phase 4

| Screen | What changes |
|---|---|
| **Home / Today** | Sleep quality chip (from last night's log); social rhythm streak |
| **Cycle Tracker** | Sleep mini-chart below 90-day wave |
| **AI Wellness Report** | Sleep correlation section becomes real data; social rhythm section unlocked |
| **You / Profile** | Wellness Radar Sleep + Social axes filled; Wearable sync status |
| **You / Settings** | Wearable connection card; Notification preferences entry point |

---

## Design Constraints (carry forward from Phase 1)

- **No red** except genuine crisis UI — wearable error states use `#C4A0B0` (mauve).
- **No streaks that punish** — wearable sync gaps are shown as empty, not as broken streaks.
- **Data always exportable** — wearable data included in the personal data export (Phase 4D).
- **Offline-first** — sleep logs can be entered manually if wearable sync fails.
- **Zero AI data retention** — HealthKit/Fit raw data is never sent to Groq; only derived signals (sleep duration, quality score) are included in the prompt.

---

## Detailed Documentation

- [4a-sleep-wearables.md](./4a-sleep-wearables.md) — HealthKit + Google Fit + manual sleep entry
- [4b-social-rhythm.md](./4b-social-rhythm.md) — IPSRT social rhythm score + history
- [4c-notifications.md](./4c-notifications.md) — Smart push notifications
- [4d-pdf-export.md](./4d-pdf-export.md) — PDF generation + clinical sharing
- [4e-enhanced-ai.md](./4e-enhanced-ai.md) — Upgraded AI prompts + longitudinal analysis
