# Equi — Design Index

← [Project README](../../README.md)

---

## Navigation Map

```
                        ┌─────────┐
                        │  Equi   │
                        └────┬────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          [Home]         [Journal]       [Cycle]
        Today View      Block Editor     Tracker
        Mood log        Activity log     Wave Graph
        Activity hist.  Custom prompts   Symptoms
        Suggestions     Social Rhythm    AI insight
              │              │               │
              └──────────────┼───────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
          [Explore]                       [You]
        Activities                      Profile
        Moonlight sleep                 Stats / Radar
        Forgiveness                     Routine Builder
        Bipolar Workbook                Well-wisher ctrl
        Psychiatrists                   Guardian access
        Community                       Relapse Signatures
                                        Ambient Themes
                                        Settings / Donate
              │
              └─── [Crisis Mode]  (always one tap away)
```

---

## Color System

| Swatch | Name | Hex | Represents |
|:---:|---|---|---|
| 🟩 | Sage Green | `#A8C5A0` | Stable / calm states |
| 🟦 | Sky Blue | `#89B4CC` | Manic / elevated states |
| 🟪 | Dusty Mauve | `#C4A0B0` | Depressive / low states |
| 🟨 | Warm Sand | `#E8DCC8` | Neutral backgrounds |
| ⬜ | Soft White | `#F7F3EE` | Cards / surfaces |
| ⬛ | Charcoal | `#3D3935` | Primary text |
| 🟧 | Muted Gold | `#C9A84C` | Achievements / rewards |

> Mood states have their own colors — none are labeled "bad" or "good."

---

## Features

| Feature | What it covers |
|---|---|
| [Onboarding](features/onboarding.md) | Splash, role selection, patient slides (diagnosis, mood, medication, safety), companion onboarding |
| [Home](features/home.md) | Today view — cycle state, mood tap, medication + substance check-ins, sleep, suggestions, SOS |
| [Journal](features/journal.md) | Block editor, daily prompts, social rhythm, activity log, 48h edit window; Daily Routine Builder |
| [Cycle Tracking](features/cycle-tracking.md) | Cycle state logging, symptoms, 90-day wave, AI insight; Relapse Signature Builder |
| [Activities](features/activities.md) | Library (All / Prescribed / Working for Me tabs), Activity Detail, prescribed compliance tracking |
| [Community](features/community.md) | Anonymous feed, channels, post composer, AI moderation model |
| [Psychiatrists](features/psychiatrists.md) | Find & book psychiatrists, Equi Partner Network, Partner Portal (web — activity Rx + compliance) |
| [AI Wellness Report](features/ai-wellness-report.md) | Weekly AI summary, sleep correlation, triggers, early warnings, PDF export; AI model architecture |
| [Crisis Mode](features/crisis-mode.md) | Emergency contacts, crisis lines, quick grounding — always one tap away |
| [Profile & Settings](features/profile.md) | Stats, wellness radar, settings list, Themes & Ambiance, Calendar (Phase 4 deferred) |
| [Support Network](features/support-network.md) | Well-wisher & guardian access controls; companion app (friend view, guardian view, messaging) |
| [Medication](features/medication.md) | Daily adherence log, skip reasons, side effects, conditional visibility, psychiatrist sharing toggle |
| [Workbook](features/workbook.md) | Bipolar Workbook — 4 chapters, sequential prompts, PDF export |

---

## Access Control

Separate from wireframes — who can see what, by role.

| Doc | Role |
|---|---|
| [access/README.md](../access/README.md) | Master comparison table (all roles × all data types) |
| [access/user.md](../access/user.md) | Patient — full access |
| [access/psychiatrist.md](../access/psychiatrist.md) | Psychiatrist — activity compliance only |
| [access/well-wisher.md](../access/well-wisher.md) | Well-wisher — mood summaries, selected journal, AI report |
| [access/guardian.md](../access/guardian.md) | Guardian — well-wisher + alerts + crisis account management |
| [access/friend.md](../access/friend.md) | Friend — simplified mood only, no clinical labels |

---

## Design Principles

| # | Principle |
|---|---|
| 1 | Never use red except for genuine crisis/emergency UI |
| 2 | Mood states have colors — never labeled "bad" or "good" |
| 3 | Every screen reachable with one thumb (bottom nav + large tap targets) |
| 4 | Journal and cycle log entries are editable up to 48h — then locked for data integrity |
| 5 | Activity history celebrates returning — missing a day never removes past entries or punishes the user |
| 6 | All community posts anonymous by default — opt-in to add a display name |
| 7 | No algorithmic feed — community is strictly chronological |
| 8 | Psychiatrist and well-wisher data never shared without explicit one-time consent |
| 9 | Export always available — your data is yours |
| 10 | Offline-first — all core features work without internet |
| 11 | Guardian "full control" always revocable by the user when stable |
| 12 | All AI summaries run on zero-data-retention infrastructure (HIPAA path) |
| 13 | Two-layer interaction: core daily minimum is 4 taps (cycle state, mood, medication, substance) — journaling, activities, and community are always optional depth |
