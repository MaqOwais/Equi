<div align="center">

<br/>

```
  ███████╗ ██████╗ ██╗   ██╗██╗
  ██╔════╝██╔═══██╗██║   ██║██║
  █████╗  ██║   ██║██║   ██║██║
  ██╔══╝  ██║▄▄ ██║██║   ██║██║
  ███████╗╚██████╔╝╚██████╔╝██║
  ╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝
```

### *Finding your equilibrium.*

**A bipolar disorder companion app built with empathy, not just features.**

<br/>

![Status](https://img.shields.io/badge/status-in%20design-A8C5A0?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-89B4CC?style=for-the-badge)
![Non-Profit](https://img.shields.io/badge/model-non--profit-C9A84C?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-iOS%20%26%20Android-3D3935?style=for-the-badge)

<br/>

</div>

---

## What is Equi?

Equi is a **free, non-profit mental health companion** built specifically for people living with bipolar disorder. Unlike general wellness apps, every feature in Equi is designed around the reality of cycling between mania and depression — not just stress management or meditation.

> *"Not just a wellness app. A companion that actually understands your cycles."*

All revenue Equi generates goes back into the platform and bipolar disorder research. Donations are accepted and spending is transparent.

---

## Why Equi is different

| Feature | General Wellness Apps | **Equi** |
|---|---|---|
| Mood tracking | Generic 1–5 scale | Separate mania + depressive + mixed cycle tracking with symptom checklists |
| Journal | Basic text entry | Notion-style block editor, auto-tagged with cycle phase, sleep, and activities |
| AI insights | None or generic | Claude AI generates personalized weekly reports, early warning patterns, and shareable PDFs for your psychiatrist |
| Community | Upvotes, streaks, gamification | Anonymous, no likes — only "I relate" and "Thank you for sharing" |
| Crisis support | Hotline link buried in settings | One-tap SOS → calls your parents/contacts + grounding tools |
| Sleep & fitness | Manual entry | Syncs with Apple Watch, Apple Health, and Google Fit |
| Psychiatrist access | None | Book bipolar-specialist psychiatrists in-person or online, directly in the app |
| Business model | Subscription / ads | Non-profit. Donations accepted. Your data is never sold. |

---

## Core Features

<br/>

### 🌊 Cycle Tracker
Track mania, depressive, mixed, and stable states with daily symptom checklists and intensity ratings. Visualized as a 90-day wave graph. AI detects patterns — *"You've entered depressive episodes 3 days after sleep drops below 5h."*

### 📓 Notion-Style Journal
Block-based editor with text, checklists, mood scales, images, and cycle tags. Every entry is auto-tagged with your cycle phase, sleep score, and activities completed that day. View any day's full picture in the unified calendar.

### 🤖 AI Wellness Reports
Weekly and monthly AI-generated summaries correlating sleep, mood, journal tone, activity completion, and heart rate. Exported as a PDF to share directly with your psychiatrist before appointments.

### 🎯 Activity Library
18+ therapist-backed activities filtered by cycle phase — *"good for depressive days"*, *"good for stable days"*. Includes Gratitude Jar, 54321 Grounding, Proud Dandelion, Compliment Diary, Box Breathing, Moonlight Winddown, and more. Bookmark what works for you.

### 👥 Community
Anonymous posts, no algorithmic feed, no likes. Channels: *Wins This Week, Depressive Days, Mania Stories, Medication Talk, Caregiver Corner*. Crisis hotline always pinned at the top.

### 🏥 Psychiatrist Marketplace
Browse and book bipolar-specialist psychiatrists for in-person or online sessions. Share your AI wellness report before each appointment with one tap.

### 📅 Unified Calendar
Every data point — journal entry, mood log, cycle state, sleep score, activities, and appointments — visible on a single day view. Export supported.

### 🆘 Crisis Mode
One tap from anywhere in the app. Shows your saved emergency contacts (parents, family), local crisis lines, and immediate grounding tools (54321 Grounding, 1-Minute Breathing).

### 🌿 Ambient Themes
6 calming scenes: Beach, Mountains, Forest, Fireplace, Rain, Night Sky. Adaptive mode auto-shifts based on your current cycle state.

---

## Color System

The app's colors are tied to emotional states — no color is labeled "bad" or "good."

| Color | Hex | Meaning |
|---|---|---|
| ![](https://placehold.co/12x12/A8C5A0/A8C5A0.png) Sage Green | `#A8C5A0` | Stable / calm |
| ![](https://placehold.co/12x12/89B4CC/89B4CC.png) Sky Blue | `#89B4CC` | Manic / elevated |
| ![](https://placehold.co/12x12/C4A0B0/C4A0B0.png) Dusty Mauve | `#C4A0B0` | Depressive / low |
| ![](https://placehold.co/12x12/E8DCC8/E8DCC8.png) Warm Sand | `#E8DCC8` | Neutral backgrounds |
| ![](https://placehold.co/12x12/F7F3EE/F7F3EE.png) Soft White | `#F7F3EE` | Cards / surfaces |
| ![](https://placehold.co/12x12/3D3935/3D3935.png) Charcoal | `#3D3935` | Primary text |
| ![](https://placehold.co/12x12/C9A84C/C9A84C.png) Muted Gold | `#C9A84C` | Achievements / rewards |

---

## Screens

| # | Screen | Description |
|---|---|---|
| 01 | Splash & Onboarding | Diagnosis selector, initial cycle state, emergency contact setup |
| 02 | Home (Today) | Cycle status, quick mood log, wearable sleep, daily suggestions |
| 03 | Journal | Notion-style block editor with calendar archive |
| 04 | Cycle Tracker | 4-state toggle, symptom checklist, 90-day wave graph, AI insight |
| 05 | Activities | Filter by cycle phase, recommended for today, bookmarks |
| 06 | Activity Detail | In-app experience (e.g. Gratitude Jar inputs, past entries) |
| 07 | Community | Channels, anonymous feed, pinned crisis line |
| 08 | Psychiatrists | Browse, filter, book, share AI report pre-session |
| 09 | AI Wellness Report | Sleep correlations, journal sentiment, early warnings, PDF export |
| 10 | Unified Calendar | Full day view — everything in one place |
| 11 | Crisis Mode | Emergency contacts, crisis lines, grounding tools |
| 12 | Ambient Themes | 6 scenes, adaptive mode, sound controls |
| 13 | Profile & Settings | Wellness radar, stats, wearable sync, donation, data export |

> Full wireframes → [`design/wireframes.md`](design/wireframes.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo) |
| Backend & Database | Supabase (Postgres + Auth + Realtime) |
| AI Reports | Claude API (Anthropic) |
| Journal Editor | Lexical (Meta's block editor) |
| Wearable Sync | Apple HealthKit + Google Fit API |
| Payments & Donations | Stripe |
| Psychiatrist Booking | Custom scheduling (Calendly API) |

---

## Design Principles

1. Never use red except for genuine crisis/emergency UI
2. Mood states have colors — they are never labeled "bad" or "good"
3. No streaks that punish missing days — Equi celebrates returning, not consistency
4. All community posts are anonymous by default
5. No algorithmic feed — community is chronological only
6. Psychiatrist data is never shared without explicit one-time consent
7. Offline-first — core features work without internet
8. Your data is always exportable and deletable

---

## Non-Profit Mission

Equi is built as a **non-profit**. Whatever the app earns goes back into:
- Platform operations and development
- Bipolar disorder research partnerships
- Subsidized access for users who cannot afford mental health care

Donations are accepted in-app and on the website. A transparent spending dashboard shows exactly where every rupee/dollar goes.

Partners we aim to work with: [NAMI](https://nami.org), [DBSA](https://dbsalliance.org), local Pakistani mental health organizations.

---

## Project Status

```
Phase 1 — Design        ██████████  Done
Phase 2 — Tech Setup    ░░░░░░░░░░  Up next
Phase 3 — Core Features ░░░░░░░░░░  Planned
Phase 4 — AI & Wearable ░░░░░░░░░░  Planned
Phase 5 — Beta Launch   ░░░░░░░░░░  Planned
```

---

## Contributing

This is an open-source, non-profit project. If you have lived experience with bipolar disorder and want to shape what gets built, your voice matters most here.

Ways to contribute:
- Share feedback on features and design
- Contribute code (React Native, Node.js, AI integrations)
- Donate to support development
- Help moderate the community

---

<div align="center">

Built with care for the bipolar community.

*"Stability is not a destination. It's a practice."*

</div>
