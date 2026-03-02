# Equi — Screen Wireframes

> All screens share a persistent bottom navigation: **Home · Journal · Cycle · Explore · You**
> Crisis mode is always accessible via the SOS button on the Home screen.

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
       Mood log        Calendar Arc     Wave Graph
       Suggestions     AI tags          Symptoms
             │              │               │
             └──────────────┼───────────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼                             ▼
         [Explore]                       [You]
       Activities                      Profile
       Psychiatrists                   Stats
       Community                       Settings
       Themes                          Donate
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

## Screens

### Screen Index

| # | Screen | Key Elements |
|---|---|---|
| [01](#screen-01--splash--onboarding) | Splash & Onboarding | Diagnosis, initial state, emergency contact |
| [02](#screen-02--home-today-view) | Home (Today) | Cycle card, mood tap, sleep, suggestions, SOS |
| [03](#screen-03--journal) | Journal | Notion-style blocks, calendar strip, past entries |
| [04](#screen-04--cycle-tracker) | Cycle Tracker | 4 states, symptoms, 90-day wave, AI insight |
| [05](#screen-05--activities-explore) | Activities | Phase filter, recommended, bookmarks |
| [06](#screen-06--activity-detail) | Activity Detail | In-app experience, past entries |
| [07](#screen-07--community) | Community | Channels, anonymous feed, pinned crisis line |
| [08](#screen-08--psychiatrists) | Psychiatrists | Browse, filter, book, share AI report |
| [09](#screen-09--ai-wellness-report) | AI Wellness Report | Sleep correlation, triggers, early warnings, PDF |
| [10](#screen-10--calendar) | Calendar | Unified day view — all data in one place |
| [11](#screen-11--crisis-mode) | Crisis Mode | Emergency contacts, crisis lines, grounding tools |
| [12](#screen-12--ambient-themes) | Ambient Themes | 6 scenes, adaptive mode, sound controls |
| [13](#screen-13--profile--you) | Profile / You | Wellness radar, stats, settings, donate |

---

### Screen 01 — Splash & Onboarding

<details>
<summary>View wireframes (4 slides)</summary>

**Splash**
```
┌─────────────────────────────┐
│                             │
│        🌊 (ocean wave)      │
│        gentle animation     │
│                             │
│           E Q U I           │
│    ─────────────────────    │
│    Finding your equilibrium │
│                             │
│    ┌─────────────────────┐  │
│    │     Get Started     │  │  ← Sage Green
│    └─────────────────────┘  │
│                             │
│     Already have account?   │
│           Sign in           │
│                             │
└─────────────────────────────┘
```

**Slide 1 — Who is Equi for?**
```
┌─────────────────────────────┐
│  ●  ○  ○  ○                 │  ← progress dots
│                             │
│        🧠  illustration     │
│                             │
│    Built for people living  │
│    with bipolar disorder    │
│                             │
│    Not just a wellness app. │
│    A companion that         │
│    understands your cycles. │
│                             │
│    ┌─────────────────────┐  │
│    │      Continue       │  │
│    └─────────────────────┘  │
└─────────────────────────────┘
```

**Slide 2 — Your diagnosis**
```
┌─────────────────────────────┐
│  ○  ●  ○  ○                 │
│                             │
│    What's your diagnosis?   │
│                             │
│  ┌─────────────────────────┐│
│  │  Bipolar I              ││  ← selectable chips
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Bipolar II             ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Cyclothymia            ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Not sure / exploring   ││
│  └─────────────────────────┘│
│                             │
│  This helps personalize     │
│  your experience            │
└─────────────────────────────┘
```

**Slide 3 — Current state**
```
┌─────────────────────────────┐
│  ○  ○  ●  ○                 │
│                             │
│  How are you feeling        │
│  right now, roughly?        │
│                             │
│   ╔═══╗    ╔═══╗    ╔═══╗   │
│   ║ ↑ ║    ║ ~ ║    ║ ↓ ║   │  ← tap to select
│   ╚═══╝    ╚═══╝    ╚═══╝   │
│   High     Stable    Low    │
│  [blue]   [green]  [mauve]  │
│                             │
│  No judgment — just a       │
│  starting point             │
└─────────────────────────────┘
```

**Slide 4 — Safety setup**
```
┌─────────────────────────────┐
│  ○  ○  ○  ●                 │
│                             │
│   Add an emergency          │
│   contact (optional)        │
│                             │
│  ┌─────────────────────────┐│
│  │  👤  Name               ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  📞  Phone number       ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Relationship         ▼ ││
│  └─────────────────────────┘│
│                             │
│   [ + Add another contact ] │
│                             │
│   ┌─────────────────────┐   │
│   │     Enter Equi      │   │
│   └─────────────────────┘   │
│         Skip for now        │
└─────────────────────────────┘
```

</details>

---

### Screen 02 — Home (Today View)

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  Good morning, Owais  🌅    │  ← personalized greeting
│  Sunday, March 1            │
│                             │
│  ┌───────────────────────┐  │
│  │  CURRENT CYCLE        │  │
│  │                       │  │
│  │   ● Stable            │  │  ← Sage Green dot
│  │   Day 4 of stability  │  │
│  │   ──────────────────  │  │
│  │   Last: Depressive    │  │
│  │   episode (6 days)    │  │
│  └───────────────────────┘  │
│                             │
│  HOW ARE YOU FEELING NOW?   │
│                             │
│  😔   😐   🙂   😊   ⚡    │  ← quick mood tap (1–5)
│ V.Low  Low  Okay Good  High │
│                             │
│  ─────────────────────────  │
│  TODAY'S SUGGESTIONS        │
│  Based on your stable day   │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │    🫙    │ │    🌸    │  │
│  │Gratitude │ │  Proud   │  │
│  │   Jar    │ │Dandelion │  │
│  │  5 min   │ │  7 min   │  │
│  └──────────┘ └──────────┘  │
│                             │
│  ─────────────────────────  │
│  THIS WEEK AT A GLANCE      │
│  M   T   W   T   F   S   S  │
│  🟢  🟢  🔵  🟢  🟢  ⬜  ● │  ← color per day
│                             │
│  ─────────────────────────  │
│  LAST NIGHT'S SLEEP         │
│  ┌───────────────────────┐  │
│  │  ⌚ Apple Watch  7h2m │  │
│  │  ████████░░  87%      │  │
│  └───────────────────────┘  │
│                             │
│  🆘  I'm not okay right now │  ← always visible
│                             │
│  🏠    📓    🌊    🎯    👤 │
│ Home  Jrnl  Cycle  Expl  You│
└─────────────────────────────┘
```

</details>

---

### Screen 03 — Journal

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Journal           🔍  ✏️ │
│                             │
│  ◀  March 2026  ▶           │
│  M   T   W   T   F   S   S  │
│  23  24  25  26  27  28   1 │
│                           ● │  ← today
│                             │
│  TODAY — Sunday Mar 1       │
│  Cycle: Stable · Sleep: 7h  │
│  Activities: 2 completed    │
│                             │
│  ┌───────────────────────┐  │
│  │  Today's Entry        │  │  ← title block
│  │  ─────────────────    │  │
│  │                       │  │
│  │  Type '/' for blocks… │  │  ← block trigger
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  BLOCK MENU  (on '/')       │
│  ┌───────────────────────┐  │
│  │  📝  Text             │  │
│  │  ✅  Checklist        │  │
│  │  😊  Mood Tag         │  │
│  │  🌊  Cycle Tag        │  │
│  │  🖼️  Image            │  │
│  │  💬  Quote            │  │
│  │  📊  Mood Scale (1–10)│  │
│  └───────────────────────┘  │
│                             │
│  PAST ENTRIES               │
│  ┌───────────────────────┐  │
│  │  Feb 28 · Depressive  │  │
│  │  "Today was heavy…"   │  │
│  │  🔵 mood 3/10         │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  Feb 27 · Depressive  │  │
│  │  "Didn't get out of…" │  │
│  │  🔵 mood 2/10         │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 04 — Cycle Tracker

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Cycle Tracker            │
│                             │
│  LOG TODAY'S STATE          │
│                             │
│  ┌──────┐┌──────┐┌──────┐┌──────┐│
│  │  ↑   ││  ~↑  ││  =   ││  ↓   ││
│  │ Manic││ Mixed││Stable││Depre.││
│  │      ││      ││  ●   ││      ││  ← selected
│  └──────┘└──────┘└──────┘└──────┘│
│  [blue] [purple][green] [mauve]  │
│                             │
│  HOW INTENSE?  (1–10)       │
│  ─────────●───────────      │  ← slider
│           5 / 10            │
│                             │
│  SYMPTOMS TODAY             │
│                             │
│  DEPRESSIVE                 │
│  ☑  Low energy              │
│  ☐  Sleeping too much       │
│  ☐  Hopelessness            │
│  ☐  Difficulty concentrating│
│  ☐  Social withdrawal       │
│  ☐  Appetite changes        │
│  [ + Add custom symptom ]   │
│                             │
│  MANIC                      │
│  ☐  Racing thoughts         │
│  ☐  Reduced need for sleep  │
│  ☐  Impulsive decisions     │
│  ☐  Elevated energy         │
│  ☐  Grandiosity             │
│                             │
│  ─────────────────────────  │
│  YOUR 90-DAY WAVE           │
│                             │
│  Dec      Jan      Feb  Mar │
│  ┌───────────────────────┐  │
│  │     ╭──╮              │  │  ← mania peak
│  │────╯  ╰────╮  ╭───────│  │  ← baseline
│  │            ╰──╯       │  │  ← depressive
│  └───────────────────────┘  │
│  🔵 Mania  🟣 Depressive    │
│  🟢 Stable                  │
│                             │
│  ─────────────────────────  │
│  AI INSIGHT                 │
│  ┌───────────────────────┐  │
│  │ 💡 You've been stable │  │
│  │ for 4 days. Your last │  │
│  │ depressive episode    │  │
│  │ was 6 days — shorter  │  │
│  │ than your avg of 9.   │  │
│  └───────────────────────┘  │
│                             │
│    [ Save Today's Log ]     │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 05 — Activities (Explore)

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  Explore Activities    🔍   │
│                             │
│  RECOMMENDED FOR YOU        │
│  Stable day · Morning       │
│                             │
│  ┌───────────────────────┐  │
│  │  🫙  Gratitude Jar    │  │
│  │  5 min · Mood boost   │  │
│  │  ★★★★★  12.4k done   │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  FILTER BY CYCLE PHASE      │
│  ┌────────┐┌────────┐┌────┐ │
│  │ Stable ││Depress.││Mani│ │
│  └────────┘└────────┘└────┘ │
│                             │
│  GROUNDING & CALM           │
│  ┌───────────────────────┐  │
│  │  🖐  54321 Grounding  │  │
│  │  5 min · All phases   │  │
│  │  Eases panic & racing │  │
│  │  thoughts             │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  🫁  Box Breathing    │  │
│  │  3 min · All phases   │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  SELF-ESTEEM                │
│  ┌───────────────────────┐  │
│  │  🌼  Proud Dandelion  │  │
│  │  7 min · Depressive   │  │
│  │  Celebrate small wins │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  📖  Compliment Diary │  │
│  │  5 min · All phases   │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  SLEEP & REST               │
│  ┌───────────────────────┐  │
│  │  🌙  Moonlight        │  │
│  │      Winddown         │  │
│  │  10 min · Evening     │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 06 — Activity Detail

<details>
<summary>View wireframe (example: Gratitude Jar)</summary>

```
┌─────────────────────────────┐
│  ←                  🔖 Save │
│                             │
│  ╔═════════════════════════╗ │
│  ║                         ║ │
│  ║      🫙 illustration    ║ │
│  ║       (animated jar)    ║ │
│  ║                         ║ │
│  ╚═════════════════════════╝ │
│                             │
│  Gratitude Jar              │
│  5 minutes · Mood & Mindset │
│                             │
│  Great for:                 │
│  🟢 Stable   🟣 Depressive  │
│                             │
│  Write 3 things you're      │
│  grateful for today.        │
│  Small or big — it counts.  │
│                             │
│  1. ┌─────────────────────┐ │
│     │ I'm grateful for…   │ │
│     └─────────────────────┘ │
│  2. ┌─────────────────────┐ │
│     │                     │ │
│     └─────────────────────┘ │
│  3. ┌─────────────────────┐ │
│     │                     │ │
│     └─────────────────────┘ │
│                             │
│  Add to jar 🫙              │
│                             │
│  PAST ENTRIES               │
│  Feb 28 · "my coffee, the   │
│  sunset, my sister's call"  │
│                             │
│   ┌─────────────────────┐   │
│   │    Start Activity   │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

</details>

---

### Screen 07 — Community

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  Community              ✏️  │
│                             │
│  CHANNELS                   │
│  ┌───────────────────────┐  │
│  │  🏆  Wins This Week   │▶ │
│  ├───────────────────────┤  │
│  │  🌊  Depressive Days  │▶ │
│  ├───────────────────────┤  │
│  │  ⚡  Mania Stories    │▶ │
│  ├───────────────────────┤  │
│  │  💊  Medication Talk  │▶ │
│  ├───────────────────────┤  │
│  │  👨‍👩‍👧  Caregiver Corner │▶ │
│  └───────────────────────┘  │
│                             │
│  RECENT POSTS               │
│                             │
│  ┌───────────────────────┐  │
│  │  🌸 Anonymous · 2h    │  │
│  │                       │  │
│  │  "First time in 3     │  │
│  │  weeks I cooked a     │  │
│  │  real meal. Tiny win  │  │
│  │  but I'll take it."   │  │
│  │                       │  │
│  │  🤝 I relate (47)     │  │  ← no likes
│  │  🙏 Thank you (23)    │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🌿 Anonymous · 5h    │  │
│  │                       │  │
│  │  "How did you all     │  │
│  │  recognize your first │  │
│  │  manic episode?..."   │  │
│  │                       │  │
│  │  🤝 I relate (31)     │  │
│  │  💬 12 replies        │  │
│  └───────────────────────┘  │
│                             │
│  📌 Always pinned:          │
│  📞 Crisis lines · Help     │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 08 — Psychiatrists

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Find Psychiatrist   🔍   │
│                             │
│  FILTERS                    │
│  ┌──────────┐┌──────┐┌────┐ │
│  │ Bipolar  ││Online││  ₨ │ │
│  │ Spec.    ││      ││Free│ │
│  └──────────┘└──────┘└────┘ │
│                             │
│  3 available near you       │
│                             │
│  ┌───────────────────────┐  │
│  │  👨‍⚕️ Dr. Sarah Ahmed   │  │
│  │  Bipolar & Mood Dis.  │  │
│  │  ★ 4.9 · 142 reviews  │  │
│  │                       │  │
│  │  📍 Lahore · 2.3km    │  │
│  │  💻 Also online       │  │
│  │  💰 PKR 2,000/session │  │
│  │                       │  │
│  │  Next: Mon Mar 3, 10am│  │
│  │  [View Profile] [Book]│  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  👩‍⚕️ Dr. Kamran Malik  │  │
│  │  Psychiatry · Bipolar │  │
│  │  ★ 4.7 · 89 reviews   │  │
│  │  💻 Online only       │  │
│  │  💰 PKR 1,500/session │  │
│  │  Next: Tue Mar 4, 3pm │  │
│  │  [View Profile] [Book]│  │
│  └───────────────────────┘  │
│                             │
│  MY APPOINTMENTS            │
│  ┌───────────────────────┐  │
│  │  Dr. Sarah Ahmed      │  │
│  │  Mon Mar 3 · 10:00 AM │  │
│  │  In-person · Lahore   │  │
│  │                       │  │
│  │  [Share my AI Report] │  │  ← pre-session feature
│  │  [Reschedule][Cancel] │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 09 — AI Wellness Report

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Weekly Report   Share ↗  │
│  Feb 24 — Mar 1, 2026       │
│                             │
│  ┌───────────────────────┐  │
│  │  AI SUMMARY           │  │
│  │  ─────────────────    │  │
│  │  This was a mixed     │  │
│  │  week. You started    │  │
│  │  in a depressive      │  │
│  │  episode (Feb 24–27)  │  │
│  │  and transitioned to  │  │
│  │  stable by Feb 28.    │  │
│  │  Sleep improved on    │  │
│  │  transition day.      │  │
│  └───────────────────────┘  │
│                             │
│  CYCLE OVERVIEW             │
│  M   T   W   T   F   S   S  │
│  ↓   ↓   ↓   ↓   =   =   = │
│  ──────────●────────────    │  ← transition point
│                             │
│  SLEEP CORRELATION          │
│  ┌───────────────────────┐  │
│  │  Depressive days: 5.1h│  │
│  │  Stable days:     7.4h│  │
│  │                       │  │
│  │  💡 Sleep improved    │  │
│  │  2.3h before mood     │  │
│  │  lifted               │  │
│  └───────────────────────┘  │
│                             │
│  ACTIVITIES COMPLETED       │
│  ██████░░░░  6 / 10 planned │
│                             │
│  TOP MOOD TRIGGERS          │
│  ✅  Exercise     → +mood   │
│  ✅  Sleep >7h    → +mood   │
│  ⚠️   Isolation   → -mood   │
│                             │
│  EARLY WARNING              │
│  ┌───────────────────────┐  │
│  │  ⚠️ Sleep dropped     │  │
│  │  below 6h for 2 nights│  │
│  │  — this has preceded  │  │
│  │  low episodes before. │  │
│  └───────────────────────┘  │
│                             │
│  [ 📄 Export PDF for doctor]│
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 10 — Calendar

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Calendar                 │
│                             │
│  ◀  March 2026  ▶           │
│  Mo  Tu  We  Th  Fr  Sa  Su │
│   2   3   4   5   6   7   8 │
│   9  10  11  12  13  14  15 │
│  16  17  18  19  20  21  22 │
│  23  24  25  26  27  28   ① │  ← today
│                             │
│  🟢 Stable  🔵 Manic        │
│  🟣 Depres. ⬜ No log       │
│                             │
│  ────── TAP A DAY ──────    │
│                             │
│  SUNDAY, MARCH 1            │
│  ┌───────────────────────┐  │
│  │  🌊  CYCLE            │  │
│  │  Stable · Intensity 4 │  │
│  ├───────────────────────┤  │
│  │  😊  MOOD             │  │
│  │  7/10 — "Feeling okay"│  │
│  ├───────────────────────┤  │
│  │  😴  SLEEP            │  │
│  │  7h 12m · 87% quality │  │
│  ├───────────────────────┤  │
│  │  🎯  ACTIVITIES       │  │
│  │  ✅ Gratitude Jar     │  │
│  │  ✅ 54321 Grounding   │  │
│  ├───────────────────────┤  │
│  │  📓  JOURNAL          │  │
│  │  "Today was quiet…"   │  │
│  │               Open →  │  │
│  ├───────────────────────┤  │
│  │  📅  APPOINTMENTS     │  │
│  │  None today           │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 11 — Crisis Mode

<details>
<summary>View wireframe</summary>

> Triggered by the "I'm not okay" button on Home, or a long-press anywhere in the app.

```
┌─────────────────────────────┐
│                             │
│  ╔═════════════════════════╗ │
│  ║                         ║ │
│  ║    You are not alone.   ║ │
│  ║                         ║ │
│  ║   Take a slow breath.   ║ │
│  ║   We're here with you.  ║ │
│  ║                         ║ │
│  ╚═════════════════════════╝ │
│                             │
│   ┌─────────────────────┐   │
│   │   📞 Call a Contact │   │  ← primary action
│   └─────────────────────┘   │
│                             │
│  YOUR CONTACTS              │
│  ┌───────────────────────┐  │
│  │  👤 Ammi (Mother)     │  │
│  │  +92 300 XXXXXXX      │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  👤 Abbu (Father)     │  │
│  │  +92 321 XXXXXXX      │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│                             │
│  CRISIS LINES               │
│  ┌───────────────────────┐  │
│  │  🆘 Umang Pakistan    │  │
│  │  0317-4288665         │  │
│  │  24/7 · Free          │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│                             │
│  QUICK GROUNDING            │
│  ┌───────────────────────┐  │
│  │  🖐  54321 Grounding  │  │
│  │  Start right now (5m) │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  🫁  1-Min Breathing  │  │
│  └───────────────────────┘  │
│                             │
│  ← Back to app              │
└─────────────────────────────┘
```

</details>

---

### Screen 12 — Ambient Themes

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Themes & Ambiance        │
│                             │
│  CHOOSE YOUR SCENE          │
│                             │
│  ┌──────────┐  ┌──────────┐ │
│  │    🌊    │  │    🏔️    │ │
│  │  BEACH   │  │ MOUNTAINS│ │
│  │  ● active│  │          │ │
│  └──────────┘  └──────────┘ │
│  ┌──────────┐  ┌──────────┐ │
│  │    🌲    │  │    🔥    │ │
│  │  FOREST  │  │FIREPLACE │ │
│  └──────────┘  └──────────┘ │
│  ┌──────────┐  ┌──────────┐ │
│  │    🌧️    │  │    🌌    │ │
│  │   RAIN   │  │NIGHT SKY │ │
│  └──────────┘  └──────────┘ │
│                             │
│  VOLUME                     │
│  🔊 ──────●──────────  80%  │
│                             │
│  ADAPTIVE MODE              │
│  ┌───────────────────────┐  │
│  │  🔄 Auto-shift scenes │  │
│  │     based on cycle    │  │  ← toggle
│  │  Depressive → Firepl. │  │
│  │  Manic → Rain / Forest│  │
│  │  Stable → Your choice │  │
│  └───────────────────────┘  │
│                             │
│  NOW PLAYING                │
│  🌊 Ocean waves — Beach     │
│  ▶ ──────────────────  🔇  │
│                             │
└─────────────────────────────┘
```

</details>

---

### Screen 13 — Profile / You

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  You                    ⚙️  │
│                             │
│  ┌───────────────────────┐  │
│  │      (initials)       │  │
│  │           O           │  │
│  │       Anonymous       │  │  ← private by default
│  │  Member since Jan 2026│  │
│  └───────────────────────┘  │
│                             │
│  ┌───────┐ ┌───────┐ ┌─────┐│
│  │  47   │ │  18   │ │  3  ││
│  │ days  │ │activ. │ │stble││
│  │tracked│ │ done  │ │ str ││
│  └───────┘ └───────┘ └─────┘│
│                             │
│  WELLNESS RADAR             │
│  ┌───────────────────────┐  │
│  │         Mood          │  │
│  │        /  |  \        │  │
│  │   Sleep     Activity  │  │  ← hexagon chart
│  │     |           |     │  │
│  │   Social    Mindful   │  │
│  │        \  |  /        │  │
│  │        Journal        │  │
│  └───────────────────────┘  │
│                             │
│  ─────────────────────────  │
│  🔔  Notifications          │
│  ⌚  Wearable sync          │
│  👥  Emergency contacts     │
│  💜  Support Equi (Donate)  │
│  📋  My diagnosis info      │
│  📤  Export my data         │
│  🔒  Privacy settings       │
│  ─────────────────────────  │
│                             │
│  Non-profit · Open source   │
│  All proceeds fund bipolar  │
│  disorder research & access │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

## Design Principles

| # | Principle |
|---|---|
| 1 | Never use red except for genuine crisis/emergency UI |
| 2 | Mood states have colors — never labeled "bad" or "good" |
| 3 | Every screen reachable with one thumb (bottom nav + large tap targets) |
| 4 | Journal and cycle log entries are editable up to 48h later |
| 5 | No streaks that punish missing days — Equi celebrates returning, not consistency |
| 6 | All community posts anonymous by default — opt-in to add a display name |
| 7 | No algorithmic feed — community is strictly chronological |
| 8 | Psychiatrist data never shared without explicit one-time consent per sharing |
| 9 | Export always available — your data is yours |
| 10 | Offline-first — all core features work without internet |
