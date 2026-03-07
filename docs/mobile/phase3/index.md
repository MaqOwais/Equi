# Phase 3 — Core Features

**Status:** ✅ Complete
**Depends on:** Phase 2 complete (Expo SDK 55, NativeWind, Supabase client, 5-tab shell)
**Goal:** A fully functional v1 app. Every screen works end-to-end with real Supabase data. AI connects to Groq. Nothing hidden behind flags.

---

## Sub-phases

| # | Name | Screens | Key output |
|---|---|---|---|
| [3A](./3a-auth-onboarding.md) | Auth & Onboarding | Sign-in, Sign-up, Onboarding wizard | Users can register, onboard, and be routed into the app |
| [3B](./3b-daily-tracking.md) | Daily Tracking | Home/Today, Cycle Tracker, Journal, Medication | The core daily habit loop — 4 taps to complete a day |
| [3C](./3c-activities-wellbeing.md) | Activities & Wellbeing | Activities, Activity Detail, Bipolar Workbook, Routine Builder, Nutrition | Content that brings users back + self-guided structured tools |
| [3D](./3d-social-community.md) | Social & Community | Community, Support Network, Psychiatrists | Connecting users to peers, supporters, and clinicians |
| [3E](./3e-ai-insights-safety.md) | AI, Insights & Safety | AI Wellness Report, Relapse Signatures, Profile & Settings, Crisis Mode | Intelligence layer, personalisation, and safety systems |

---

## Guiding Principles

Every line of Phase 3 code follows these rules:

| Rule | Implication |
|---|---|
| Never use red except crisis UI | All error states use charcoal/mauve tones |
| Mood states have colours, never labels like "bad" | Use sage/sky/mauve/sand — never "bad day" text |
| No streaks that punish missing days | Show consistency trends, not chains. No broken-streak UI |
| All community posts anonymous by default | No display name shown in community |
| No algorithmic feed | Community is strictly chronological |
| Psychiatrist data never shared without consent | Medication, substance, journal off by default even for linked doctors |
| Offline-first core features | Mood log, journal, cycle tap, medication all work offline |
| Data always exportable and deletable | Every table supports full user data export and deletion |
| Never calorie-focused | Nutrition shows food quality categories only |
| Zero AI data retention | All Groq calls use zero-retention API. Raw journal text never sent to Groq |

---

## Shared Architecture

### Auth Guard (root `_layout.tsx`)

```
No session           →  /(auth)/sign-in
Session exists:
  onboarding = false →  /(auth)/onboarding
  onboarding = true  →  /(tabs)
```

All redirects use `router.replace()` — never `router.push()`.

### Zustand Stores

| Store | Sub-phase | Purpose |
|---|---|---|
| `stores/auth.ts` | 3A | Session, profile, sign-out |
| `stores/today.ts` | 3B | Today's logs (mood, cycle, checkin, medication, sleep) |
| `stores/journal.ts` | 3B | Entry CRUD, 48h lock check |
| `stores/cycle.ts` | 3B | 90-day history, life events |
| `stores/activities.ts` | 3C | All/prescribed/bookmarked, completions |
| `stores/community.ts` | 3D | Channel posts, reactions |
| `stores/ai.ts` | 3E | Report generation, PDF export |

### Component Library (`components/ui/`)

| Component | Sub-phase | Used in |
|---|---|---|
| `Button` | 3A | All screens |
| `Card` | 3A | All screens |
| `Badge` | 3A | Cycle state labels |
| `CycleStateDot` | 3B | Home, Tracker, Profile |
| `MoodScale` | 3B | Onboarding, Home, Journal |
| `SectionHeader` | 3B | All Home cards |
| `EmptyState` | 3B | All data-dependent screens |
| `CycleWaveGraph` | 3B | Cycle Tracker |
| `SleepDots` | 3B | Home sleep row |
| `MedicationStatusRow` | 3B | Home, Medication screen |
| `JournalBlockEditor` | 3B | Journal |
| `SocialRhythmRow` | 3C | Journal block, Routine Builder |
| `ActivityCard` | 3C | Activities list |
| `NutritionCategoryPicker` | 3C | Nutrition Detail, Journal block |
| `CompanionCard` | 3D | Support Network |
| `CrisisOverlay` | 3E | SOS button (Home) |
| `WellnessRadar` | 3E | Profile |
| `ReportSection` | 3E | AI Wellness Report |

### Offline Queue

Core daily actions (mood, cycle, checkin, medication, journal) are saved locally first and synced on reconnect. Implementation: `utils/offlineQueue.ts` — a Zustand-persisted `pendingWrites` array flushed on `NetInfo.isConnected` change.

Crisis Mode emergency contacts are cached in AsyncStorage on every app open so the overlay works with zero network.

---

## Supabase Schema Overview

Full table definitions are in each sub-phase doc. Migration order matches build order.

| Sub-phase | Tables added |
|---|---|
| 3A | `profiles` (extended), `emergency_contacts` |
| 3B | `cycle_logs`, `mood_logs`, `journal_entries`, `daily_checkins`, `medication_logs`, `sleep_logs`, `life_events`, `social_rhythm_logs` |
| 3C | `activities`, `activity_completions`, `prescribed_activities`, `routine_anchors`, `nutrition_logs`, `workbook_responses` |
| 3D | `community_posts`, `community_reactions`, `companions`, `companion_journal_shares` |
| 3E | `ai_reports`, `relapse_signatures` |

---

## Phase 4 Handoff Contracts

Phase 3 must leave these extension points open:

| Phase 4 feature | Phase 3 contract |
|---|---|
| Apple HealthKit / Google Fit sleep | `sleep_logs.source` accepts 'healthkit' / 'google_fit' |
| Unified Calendar | All tables have `date`/`logged_at` in ISO date format |
| Psychiatrist web portal | `prescribed_activities` and `companions` have `psychiatrist_id` stub |
| Advanced nutrition AI | `nutrition_logs.input_method` accepts 'photo' / 'barcode' / 'voice' |
| Advanced AI features | `ai_reports.report_json` is freeform JSONB — add new sections without migration |
