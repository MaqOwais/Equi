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
        Mood log        Activity log     Wave Graph
        Streak strip    Streak + 48h     Symptoms
        Suggestions     Custom prompts   AI insight
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
        Themes                          Settings / Donate
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
| [01](#screen-01--splash--onboarding) | Splash & Onboarding | Diagnosis, 10-pt mood intro, support network |
| [02](#screen-02--home-today-view) | Home (Today) | Cycle card, mood tap, sleep, streak, SOS |
| [03](#screen-03--journal) | Journal | Block editor, activity log, streak, 48hr edit |
| [04](#screen-04--cycle-tracker) | Cycle Tracker | 4 states, symptoms, 90-day wave, AI insight |
| [05](#screen-05--activities-explore) | Activities | All / Prescribed / Working for Me tabs |
| [06](#screen-06--activity-detail) | Activity Detail | In-app experience, past entries |
| [07](#screen-07--community) | Community | Channels, anonymous feed, pinned crisis line |
| [08](#screen-08--psychiatrists) | Psychiatrists | Map search, Equi Partner Network, book, share report |
| [09](#screen-09--ai-wellness-report) | AI Wellness Report | Sleep correlation, triggers, early warnings, PDF |
| [10](#screen-10--calendar) | Calendar | Unified day view — all data in one place |
| [11](#screen-11--crisis-mode) | Crisis Mode | Emergency contacts, crisis lines, grounding tools |
| [12](#screen-12--ambient-themes) | Ambient Themes | 6 scenes, adaptive mode, sound controls |
| [13](#screen-13--profile--you) | Profile / You | Wellness radar, stats, settings, donate |
| [14](#screen-14--daily-routine-builder) | Daily Routine Builder | Custom prompts, daily checklist, importance weights |
| [15](#screen-15--bipolar-workbook) | Bipolar Workbook | Structured prompts, guided reflection |
| [16](#screen-16--well-wisher--guardian-access) | Well-wisher & Guardian | Share journal/progress, parent account control |
| [17](#screen-17--psychiatrist-portal-activities-view) | Psychiatrist Portal | Activity Rx + dosage, phase restrictions, compliance tracking (web portal) |
| [18](#screen-18--relapse-signature-builder) | Relapse Signature Builder | Personalised manic + depressive warning signs, timing, priority ranking |
| [19](#screen-19--medication-adherence) | Medication Adherence | Daily check-in, side-effect log, adherence trend, psychiatrist share toggle |

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

**Slide 3 — How are you feeling right now?**
```
┌─────────────────────────────┐
│  ○  ○  ●  ○                 │
│                             │
│  How are you feeling        │
│  right now?                 │
│                             │
│  Tap the one that fits      │
│                             │
│   😔    😐    🙂    😊    ⚡ │
│  1–2   3–4   5–6   7–8  9–10│
│                             │
│  This is how you'll log     │
│  your mood every day —      │
│  quick, no judgment.        │
│                             │
│    ┌─────────────────────┐  │
│    │      Continue       │  │
│    └─────────────────────┘  │
└─────────────────────────────┘
```
> First use of the standardized 10-point scale. The emoji row is identical to what appears on the Home screen daily — users learn it once here.

**Slide 4 — Safety setup**
```
┌─────────────────────────────┐
│  ○  ○  ○  ●                 │
│                             │
│  Your support network       │
│  (all optional)             │
│                             │
│  ── EMERGENCY CONTACTS ──   │
│  Called when you tap SOS    │
│                             │
│  ┌─────────────────────────┐│
│  │  👤  Name               ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  📞  Phone number       ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Relationship         ▼ ││  ← Parent / Guardian /
│  └─────────────────────────┘│     Spouse / Sibling
│   [ + Add emergency contact]│
│                             │
│  ── SOCIAL CONTACTS ──      │
│  Reach out when you feel    │
│  lonely or stuck            │
│                             │
│  ┌─────────────────────────┐│
│  │  👤  Name               ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  📞  Phone number       ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │  Who are they?        ▼ ││  ← Friend / Coworker /
│  └─────────────────────────┘│     Support group /
│   [ + Add social contact ]  │     Therapist / Other
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
│  MEDICATION                 │
│  ┌───────────────────────┐  │
│  │  💊 Taken today?      │  │
│  │  [Taken] [Skip] [Part]│  │  ← one-tap check-in
│  └───────────────────────┘  │
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
│  🟢  🟢  🔵  🟣  🟢  🟢  ● │  ← streak dots
│                             │
│  🔥 6-day streak            │  ← streak counter
│                             │
│  TODAY — Sunday Mar 1       │
│  Cycle: Stable · Sleep: 7h  │
│  Mood: 7/10                 │
│                             │
│  DAILY PROMPTS              │  ← customizable (Screen 14)
│  ┌───────────────────────┐  │
│  │  What are you         │  │
│  │  grateful for today?  │  │
│  │  ─────────────────    │  │
│  │  Type here…           │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  One thing that felt  │  │
│  │  hard today?          │  │
│  │  ─────────────────    │  │
│  │  Type here…           │  │
│  └───────────────────────┘  │
│  [ + Add your own block ]   │  ← Notion '/' menu
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
│  │  📌  Life Event       │  │  ← new
│  │  🕐  Social Rhythm    │  │  ← new
│  └───────────────────────┘  │
│                             │
│  SOCIAL RHYTHM — Today      │  ← collapses if logged
│  ┌───────────────────────┐  │
│  │  Wake time      06:45 │  │  ← time fields
│  │  First contact  07:30 │  │
│  │  Work start     09:00 │  │
│  │  Dinner         ──:── │  │  ← not yet logged
│  │  Bedtime        ──:── │  │
│  │  Consistency: ████░░  │  │  ← 7-day rhythm score
│  └───────────────────────┘  │
│                             │
│  ACTIVITIES TODAY           │
│  ✅ Gratitude Jar           │
│  ✅ 54321 Grounding         │
│  ☐  Moonlight Winddown      │
│                             │
│  DAILY CHECKLIST            │  ← from Routine Builder
│  ✅ Morning walk            │
│  ✅ No phone before 9am     │
│  ☐  In bed by 11pm          │
│                             │
│  ⏱ Editable until           │
│  Mar 3, 11:59 PM (48h)      │  ← edit window notice
│                             │
│  PAST ENTRIES               │
│  ┌───────────────────────┐  │
│  │  Feb 28 · Depressive  │  │
│  │  "Today was heavy…"   │  │
│  │  🔵 mood 3/10  🔒 Locked│ │  ← locked after 48h
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  Feb 27 · Depressive  │  │
│  │  "Didn't get out of…" │  │
│  │  🔵 mood 2/10  🔒 Locked│ │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

> 48-hour edit window keeps journal data reliable for AI analysis while still allowing same-day corrections.

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
│  │       📌   ╰──╯  📌   │  │  ← life event markers
│  └───────────────────────┘  │
│  🔵 Mania  🟣 Depressive    │
│  🟢 Stable  📌 Life Event   │
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
<summary>View wireframe (3 tabs)</summary>

**Tab 1: All Activities** *(default)*
```
┌─────────────────────────────┐
│  Explore Activities    🔍   │
│                             │
│  ┌──────────┬──────────┬──┐ │
│  │   All    │Prescribed│✨│ │  ← tabs: All / Prescribed / Working
│  └──────────┴──────────┴──┘ │
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
│  │  15 min · Evening     │  │
│  │  Sleep-inducing music │  │
│  │  + body scan guide    │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  FORGIVENESS & RELEASE      │
│  ┌───────────────────────┐  │
│  │  🕊️  I Forgive Myself │  │
│  │  5 min · All phases   │  │
│  │  "I forgive myself    │  │
│  │  for…" guided prompts │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  STRUCTURED REFLECTION      │
│  ┌───────────────────────┐  │
│  │  📘  Bipolar Workbook │  │
│  │  Guided prompts for   │  │
│  │  understanding your   │  │
│  │  patterns & triggers  │  │
│  │               Open →  │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

---

**Tab 2: Prescribed** *(activities prescribed by your psychiatrist)*
```
┌─────────────────────────────┐
│  Explore Activities    🔍   │
│                             │
│  ┌──────────┬──────────┬──┐ │
│  │   All    │Prescribed│✨│ │
│  └──────────┴──────────┴──┘ │
│                             │
│  PRESCRIBED BY              │
│  Dr. Rachel Moore           │
│  Psychiatrist · Telehealth  │
│                             │
│  ┌───────────────────────┐  │
│  │  🌙  Moonlight        │  │
│  │      Winddown         │  │
│  │  ─────────────────    │  │
│  │  Dosage: 15 min       │  │
│  │  Frequency: Nightly   │  │
│  │  Goal: Regulate sleep │  │
│  │  onset before 11 PM   │  │
│  │                       │  │
│  │  Progress this week:  │  │
│  │  ████████░░  4 / 5    │  │
│  │                       │  │
│  │  [Start] [Mark done]  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🫁  Box Breathing    │  │
│  │  ─────────────────    │  │
│  │  Dosage: 5 min        │  │
│  │  Frequency: 2× daily  │  │
│  │  Goal: Reduce anxiety │  │
│  │  before high-stress   │  │
│  │  situations           │  │
│  │                       │  │
│  │  Progress this week:  │  │
│  │  ██████████  7 / 7    │  │  ← completed
│  │                       │  │
│  │  [Start] [Mark done]  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🕊️  I Forgive Myself │  │
│  │  ─────────────────    │  │
│  │  Dosage: 10 min       │  │
│  │  Frequency: 3× weekly │  │
│  │  Goal: Process shame  │  │
│  │  from past episodes   │  │
│  │                       │  │
│  │  Progress this week:  │  │
│  │  ████░░░░░░  2 / 3    │  │
│  │                       │  │
│  │  [Start] [Mark done]  │  │
│  └───────────────────────┘  │
│                             │
│  COMPLIANCE REPORT          │
│  Shared with Dr. Moore      │
│  Overall: 78% this week     │
│  [View full report]         │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```
> **Privacy:** The psychiatrist sees only activity names, prescribed dosage, and completion rate — no journal content or personal mood notes.

---

**Tab 3: Working for Me** *(activities you've found effective)*
```
┌─────────────────────────────┐
│  Explore Activities    🔍   │
│                             │
│  ┌──────────┬──────────┬──┐ │
│  │   All    │Prescribed│✨│ │
│  └──────────┴──────────┴──┘ │
│                             │
│  YOUR PERSONAL TOOLKIT      │
│  Activities you've bookmarked│
│  as helpful for you.        │
│                             │
│  ┌───────────────────────┐  │
│  │  🫙  Gratitude Jar    │  │
│  │  Saved Mar 1          │  │
│  │  "Helps on low days"  │  │  ← personal note (optional)
│  │  Completed 14 times   │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🌙  Moonlight        │  │
│  │      Winddown         │  │
│  │  Saved Feb 18         │  │
│  │  Completed 8 times    │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🖐  54321 Grounding  │  │
│  │  Saved Feb 5          │  │
│  │  Completed 22 times   │  │
│  │                 Try → │  │
│  └───────────────────────┘  │
│                             │
│  Nothing here yet?          │
│  Tap 🔖 on any activity     │
│  to save it here.           │
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
<summary>View wireframes (feed + post composer + moderation)</summary>

**Feed view**
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

**Post composer**
```
┌─────────────────────────────┐
│  ←  New Post                │
│                             │
│  Posting to: Wins This Week │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │  Share what's on      │  │
│  │  your mind…           │  │
│  │                       │  │
│  │                       │  │
│  │                       │  │
│  └───────────────────────┘  │
│  0 / 500 characters         │
│                             │
│  ─────────────────────────  │
│  COMMUNITY GUIDELINES       │
│  ┌───────────────────────┐  │
│  │  ✅ Share your own    │  │
│  │     experiences       │  │
│  │  ✅ Be kind & honest  │  │
│  │  ❌ No medication     │  │
│  │     dosage advice     │  │
│  │  ❌ No graphic self-  │  │
│  │     harm descriptions │  │
│  │  ❌ No "just think    │  │
│  │     positive" advice  │  │
│  │  ❌ No medical        │  │
│  │     diagnosis claims  │  │
│  └───────────────────────┘  │
│                             │
│  🤖 AI checks your post     │
│  before it goes live        │
│                             │
│   ┌─────────────────────┐   │
│   │    Post anonymously │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

**AI moderation — flagged state**
```
┌─────────────────────────────┐
│  ←  New Post                │
│                             │
│  ┌───────────────────────┐  │
│  │  "I've been taking    │  │
│  │  600mg instead of my  │  │
│  │  usual dose and it    │  │
│  │  feels better…"       │  │
│  └───────────────────────┘  │
│                             │
│  ╔═══════════════════════╗  │
│  ║  ⚠️  Heads up         ║  │  ← AI flag, not rejection
│  ║                       ║  │
│  ║  Your post mentions   ║  │
│  ║  medication dosages.  ║  │
│  ║  Sharing specific     ║  │
│  ║  amounts can be       ║  │
│  ║  harmful to others.   ║  │
│  ║                       ║  │
│  ║  Guideline:           ║  │
│  ║  No dosage advice     ║  │
│  ╚═══════════════════════╝  │
│                             │
│   ┌─────────────────────┐   │
│   │   Edit my post      │   │  ← primary
│   └─────────────────────┘   │
│                             │
│   Post anyway (human        │
│   moderator will review)    │  ← escape hatch
│                             │
│   Learn about guidelines    │
└─────────────────────────────┘
```

**AI moderation — clear state**
```
┌─────────────────────────────┐
│  ←  New Post                │
│                             │
│  ┌───────────────────────┐  │
│  │  "First time in 3     │  │
│  │  weeks I cooked a     │  │
│  │  real meal. Tiny win  │  │
│  │  but I'll take it."   │  │
│  └───────────────────────┘  │
│                             │
│  ✅ Looks good              │
│  Your post is ready to share│
│                             │
│   ┌─────────────────────┐   │
│   │   Post anonymously  │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

</details>

---

### Screen 08 — Psychiatrists

<details>
<summary>View wireframe (3 views)</summary>

**View 1: Nearby Search (map + list)**
```
┌─────────────────────────────┐
│  Find a Psychiatrist   🔍   │
│                             │
│  ┌─────────────────────────┐│
│  │  📍  Austin, TX   Change││  ← location bar
│  └─────────────────────────┘│
│                             │
│  ┌──────────────┬──────────┐│
│  │   Nearby     │ Partners ││  ← tabs
│  └──────────────┴──────────┘│
│                             │
│  ╔═════════════════════════╗ │
│  ║  [   MAP VIEW           ]║ │
│  ║  📍 Dr. Carter (1.8mi)  ║ │
│  ║  📍 Dr. Torres (3.2mi)  ║ │
│  ║  📍 Dr. Singh (5.1mi)   ║ │
│  ╚═════════════════════════╝ │
│  [List view ↕]              │
│                             │
│  FILTERS                    │
│  ┌──────────┐┌──────┐┌────┐ │
│  │ Bipolar  ││Tele- ││Ins.│ │
│  │ Spec.    ││health││ ✓  │ │
│  └──────────┘└──────┘└────┘ │
│                             │
│  4 available near you       │
│                             │
│  ┌───────────────────────┐  │
│  │  👨‍⚕️ Dr. James Carter  │  │
│  │  Bipolar & Mood Dis.  │  │
│  │  ★ 4.9 · 142 reviews  │  │
│  │  📍 Austin, TX · 1.8mi│  │
│  │  💻 Also telehealth   │  │
│  │  💰 $180/session      │  │
│  │  ✅ Accepts insurance  │  │
│  │  Next: Mon Mar 3, 10am│  │
│  │  [View Profile] [Book]│  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  👩‍⚕️ Dr. Rachel Moore  │  │
│  │  Psychiatry · Bipolar │  │
│  │  ★ 4.8 · 97 reviews   │  │
│  │  💻 Telehealth only   │  │
│  │  💰 $150/session      │  │
│  │  ✅ Accepts insurance  │  │
│  │  Next: Tue Mar 4, 3pm │  │
│  │  [View Profile] [Book]│  │
│  └───────────────────────┘  │
│                             │
│  MY APPOINTMENTS            │
│  ┌───────────────────────┐  │
│  │  Dr. James Carter     │  │
│  │  Mon Mar 3 · 10:00 AM │  │
│  │  In-person · Austin   │  │
│  │                       │  │
│  │  [Share my AI Report] │  │  ← pre-session feature
│  │  [Reschedule][Cancel] │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

---

**View 2: Equi Partner Network** *(Partners tab)*
```
┌─────────────────────────────┐
│  Find a Psychiatrist   🔍   │
│                             │
│  ┌─────────────────────────┐│
│  │  📍  Austin, TX   Change││
│  └─────────────────────────┘│
│                             │
│  ┌──────────────┬──────────┐│
│  │   Nearby     │ Partners ││  ← active tab
│  └──────────────┴──────────┘│
│                             │
│  ╔═════════════════════════╗ │
│  ║  🤝 Equi Partner Network║ │
│  ║                         ║ │
│  ║  These psychiatrists    ║ │
│  ║  have partnered with    ║ │
│  ║  Equi. They understand  ║ │
│  ║  the app's monitoring   ║ │
│  ║  approach and have      ║ │
│  ║  opted in to receive    ║ │
│  ║  patient reports and    ║ │
│  ║  prescribe activities.  ║ │
│  ╚═════════════════════════╝ │
│                             │
│  ┌───────────────────────┐  │
│  │  👩‍⚕️ Dr. Rachel Moore  │  │
│  │  🤝 Equi Partner       │  │  ← verified badge
│  │  Psychiatry · Bipolar │  │
│  │  ★ 4.8 · 97 reviews   │  │
│  │  💻 Telehealth only   │  │
│  │  💰 $150/session      │  │
│  │  ✅ Accepts insurance  │  │
│  │                       │  │
│  │  Response time: <4h   │  │  ← partner perk
│  │  Equi activity Rx: ✓  │  │  ← can prescribe activities
│  │  AI report aware: ✓   │  │  ← reads Equi reports
│  │                       │  │
│  │  [View Profile] [Book]│  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  👨‍⚕️ Dr. Marcus Webb   │  │
│  │  🤝 Equi Partner       │  │
│  │  Bipolar Specialist   │  │
│  │  ★ 4.7 · 63 reviews   │  │
│  │  📍 Houston, TX        │  │
│  │  💻 Also telehealth   │  │
│  │  💰 $165/session      │  │
│  │  ✅ Accepts insurance  │  │
│  │  Response time: <8h   │  │
│  │  Equi activity Rx: ✓  │  │
│  │  AI report aware: ✓   │  │
│  │  [View Profile] [Book]│  │
│  └───────────────────────┘  │
│                             │
│  Want to refer a doctor?    │
│  [Suggest a psychiatrist]   │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```
> **Partner program:** Psychiatrists apply to join the Equi network. Partners agree to: understand the app's monitoring data, use activity prescriptions, and maintain quality metrics tracked by Equi (response time, patient satisfaction, booking completion rate). Shown only when a patient consents to share data with their doctor.

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
│  SOCIAL RHYTHM              │
│  ┌───────────────────────┐  │
│  │  Consistency: 68%     │  │
│  │  ████████░░░░         │  │
│  │  Bedtime varied ±90m  │  │
│  │  this week — your     │  │
│  │  most irregular anchor│  │
│  └───────────────────────┘  │
│                             │
│  MEDICATION ADHERENCE       │
│  ┌───────────────────────┐  │
│  │  6 / 7 days taken     │  │
│  │  ██████████░  86%     │  │
│  │  Missed: Tue (forgot) │  │
│  └───────────────────────┘  │
│                             │
│  LIFE EVENTS THIS PERIOD    │
│  ┌───────────────────────┐  │
│  │  📌 Feb 15 — Work     │  │
│  │  change (stressful)   │  │
│  │                       │  │
│  │  Sleep irregularity   │  │
│  │  increased +2.1h the  │  │
│  │  following week       │  │
│  └───────────────────────┘  │
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
│  │  👤 Mom               │  │
│  │  +1 (555) 000-0001    │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  👤 Dad               │  │
│  │  +1 (555) 000-0002    │  │
│  │                [Call] │  │
│  └───────────────────────┘  │
│                             │
│  CRISIS LINES               │
│  ┌───────────────────────┐  │
│  │  🆘 988 Lifeline       │  │
│  │  Call or text 988     │  │
│  │  24/7 · Free          │  │
│  │                [Call] │  │
│  ├───────────────────────┤  │
│  │  💬 Crisis Text Line  │  │
│  │  Text HOME to 741741  │  │
│  │                 [Text]│  │
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
│  🔎  My Relapse Signatures  │  ← links to Screen 18
│  💊  Medication Adherence   │  ← links to Screen 19
│  💜  Support Equi (Donate)  │
│  📋  My diagnosis info      │
│  📤  Export my data         │
│  🔒  Privacy settings       │
│  ─────────────────────────  │
│                             │
│  Open source · US-focused   │
│  Donations fund access for  │
│  people who need it most    │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 14 — Daily Routine Builder

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Daily Routine Builder    │
│                             │
│  Customize what shows up    │
│  in your journal every day  │
│                             │
│  JOURNAL PROMPTS            │
│  ┌───────────────────────┐  │
│  │  ≡  What are you      │  │  ← drag to reorder
│  │     grateful for?     │  │
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  One thing that    │  │
│  │     felt hard today?  │  │
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  How did I take    │  │
│  │     care of myself?   │  │
│  │                  ✏️ 🗑│  │
│  └───────────────────────┘  │
│  [ + Add custom prompt ]    │
│                             │
│  DAILY CHECKLIST            │
│  Set your own daily habits  │
│                             │
│  ┌───────────────────────┐  │
│  │  ≡  Morning walk      │  │
│  │  Priority: ★★★☆☆     │  │  ← importance 1–5 stars
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  No phone before   │  │
│  │     9am               │  │
│  │  Priority: ★★★★☆     │  │
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  In bed by 11pm    │  │
│  │  Priority: ★★★★★     │  │
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  Small puzzle game │  │
│  │  Priority: ★★☆☆☆     │  │
│  │                  ✏️ 🗑│  │
│  └───────────────────────┘  │
│  [ + Add checklist item ]   │
│                             │
│  DAILY ANALYTICS WEIGHT     │
│  Higher priority items      │
│  count more toward your     │
│  daily progress score       │
│                             │
│  ┌───────────────────────┐  │
│  │  Today's score: 72%   │  │
│  │  ████████░░░░         │  │
│  │  3/4 items · weighted │  │
│  └───────────────────────┘  │
│                             │
│    [ Save Routine ]         │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

> Checklist completion feeds directly into the AI Wellness Report analytics and the unified calendar day view.

</details>

---

### Screen 15 — Bipolar Workbook

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Bipolar Workbook         │
│                             │
│  Structured prompts to      │
│  understand your patterns,  │
│  triggers, and strengths    │
│                             │
│  YOUR PROGRESS              │
│  ████████░░  8 / 12 prompts │
│                             │
│  CHAPTERS                   │
│                             │
│  ┌───────────────────────┐  │
│  │  ✅  1. Understanding │  │
│  │       My Cycles       │  │
│  │  4 prompts · Done     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  ✅  2. My Triggers   │  │
│  │  4 prompts · Done     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  ●   3. My Warning    │  │  ← in progress
│  │       Signs           │  │
│  │  4 prompts · 0/4 done │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  ○   4. My Strengths  │  │
│  │  4 prompts · Locked   │  │
│  └───────────────────────┘  │
│                             │
│  CURRENT PROMPT             │
│  Chapter 3 · Prompt 1 of 4  │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │  "What are the first  │  │
│  │  signs that tell you  │  │
│  │  a manic episode      │  │
│  │  might be starting?"  │  │
│  │                       │  │
│  │  ─────────────────    │  │
│  │  Write your answer…   │  │
│  │                       │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  [ Save & Next Prompt ]     │
│                             │
│  Share with my psychiatrist │
│  [ Export as PDF ]          │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

> Workbook responses are private by default. They can be included in the AI Wellness Report PDF shared with a psychiatrist.

</details>

---

### Screen 16 — Well-wisher & Guardian Access

<details>
<summary>View wireframe</summary>

**Tab 1 — Well-wishers (friends / support people)**
```
┌─────────────────────────────┐
│  ← My Support Network       │
│                             │
│  [Well-wishers] [Guardians] │  ← tab toggle
│                             │
│  WELL-WISHERS               │
│  People you choose to share │
│  your journey with          │
│                             │
│  ┌───────────────────────┐  │
│  │  👤 Alex (Friend)     │  │
│  │  Can see:             │  │
│  │  ✅ Mood summaries    │  │
│  │  ✅ Selected journal  │  │
│  │     entries           │  │
│  │  ☐  Full journal      │  │
│  │  ☐  Cycle data        │  │
│  │                 Edit  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  👤 Dr. Moore         │  │
│  │  (Therapist)          │  │
│  │  Can see:             │  │
│  │  ✅ Mood summaries    │  │
│  │  ✅ Cycle data        │  │
│  │  ✅ AI Report PDF     │  │
│  │  ☐  Full journal      │  │
│  │                 Edit  │  │
│  └───────────────────────┘  │
│                             │
│  [ + Add well-wisher ]      │
│                             │
│  SHARE A MOMENT             │
│  Send a specific entry or   │
│  feeling right now          │
│                             │
│  ┌───────────────────────┐  │
│  │  📤 Share today's     │  │
│  │     mood with…        │  │
│  │  ○ Alex               │  │
│  │  ○ Dr. Moore          │  │
│  │  [ Send ]             │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

**Tab 2 — Guardians (parents / caregivers)**
```
┌─────────────────────────────┐
│  ← My Support Network       │
│                             │
│  [Well-wishers] [Guardians] │
│                             │
│  GUARDIAN ACCESS            │
│  For parents or caregivers  │
│  managing high-risk states  │
│                             │
│  ┌───────────────────────┐  │
│  │  👤 Mom (Guardian)    │  │
│  │                       │  │
│  │  VIEW PERMISSIONS     │  │
│  │  ✅ Mood summaries    │  │
│  │  ✅ Cycle state       │  │
│  │  ✅ AI weekly report  │  │
│  │  ✅ Activity log      │  │
│  │  ☐  Journal entries   │  │
│  │                       │  │
│  │  MANAGEMENT LEVEL     │  │
│  │  ○ View only          │  │
│  │  ● Alert if high risk │  │  ← auto-notifies guardian
│  │  ○ Full account ctrl  │  │  ← guardian can act
│  │                 Edit  │  │
│  └───────────────────────┘  │
│                             │
│  HIGH RISK AUTO-ALERT       │
│  ┌───────────────────────┐  │
│  │  Notify guardian when:│  │
│  │  ☑ Mood < 2/10 for    │  │
│  │    2+ consecutive days│  │
│  │  ☑ SOS button tapped  │  │
│  │  ☑ No journal entry   │  │
│  │    for 3+ days        │  │
│  │  ☑ Manic symptoms     │  │
│  │    logged for 2+ days │  │
│  └───────────────────────┘  │
│                             │
│  FULL ACCOUNT CONTROL       │
│  ┌───────────────────────┐  │
│  │  ⚠️  When enabled,    │  │
│  │  guardian can:        │  │
│  │  · Book appointments  │  │
│  │  · Contact your doctor│  │
│  │  · Pause community    │  │
│  │    access             │  │
│  │  · Add crisis contacts│  │
│  │                       │  │
│  │  You can revoke this  │  │
│  │  access at any time   │  │
│  │  when you're stable.  │  │
│  └───────────────────────┘  │
│                             │
│  [ + Add guardian ]         │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

> Guardian "Full account control" is always revocable by the user and requires the user's initial consent to enable.

</details>

---

### Screen 17 — Psychiatrist Portal (Activities View)

<details>
<summary>View wireframe (psychiatrist-side)</summary>

> This is a **web-based portal** (not a mobile screen) for psychiatrists who are Equi Partners. Access is gated by the patient's explicit consent — patients control which psychiatrist can see their activity data.

**Patient Activity Dashboard — Dr. Rachel Moore's view**
```
┌─────────────────────────────────────────────────────┐
│  Equi  🤝 Partner Portal            Dr. Rachel Moore│
│  ─────────────────────────────────────────────────  │
│                                                     │
│  MY PATIENTS                                        │
│  ┌────────────────────────────┐                     │
│  │  Patient: Alex M.          │  ← patient alias    │
│  │  Shared: Activity data only│                     │
│  │  [View Activities] ───────→│                     │
│  └────────────────────────────┘                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Patient Activity Detail — Alex M.**
```
┌─────────────────────────────────────────────────────┐
│  ← Patients    Alex M. · Activity Overview          │
│                                                     │
│  WHAT ALEX HAS ACCESS TO SHARE WITH YOU             │
│  ┌───────────────────────────────────────────────┐  │
│  │  ✅ Activity names + completion rate           │  │
│  │  ✅ Prescribed dosage tracking                 │  │
│  │  ❌ Journal content  (not shared)              │  │
│  │  ❌ Mood logs  (not shared)                    │  │
│  │  ❌ AI wellness reports  (not shared)          │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  PRESCRIBED ACTIVITIES                              │
│  ┌───────────────────────────────────────────────┐  │
│  │  🌙 Moonlight Winddown                         │  │
│  │  Dosage: 15 min · Frequency: Nightly           │  │
│  │  Goal: Sleep regulation before 11 PM           │  │
│  │  Compliance this week: ████████░░  4/5 (80%)   │  │
│  │  Compliance last week: ██████░░░░  3/5 (60%)   │  │
│  │                                    [Edit] [Remove]│
│  ├───────────────────────────────────────────────┤  │
│  │  🫁 Box Breathing                              │  │
│  │  Dosage: 5 min · Frequency: 2× daily           │  │
│  │  Goal: Anxiety reduction                       │  │
│  │  Compliance this week: ██████████  14/14(100%) │  │
│  │                                    [Edit] [Remove]│
│  ├───────────────────────────────────────────────┤  │
│  │  🕊️ I Forgive Myself                           │  │
│  │  Dosage: 10 min · Frequency: 3× weekly         │  │
│  │  Goal: Processing shame from past episodes     │  │
│  │  Compliance this week: ████░░░░░░  2/3 (67%)   │  │
│  │                                    [Edit] [Remove]│
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [ + Prescribe New Activity ]                       │
│                                                     │
│  OVERALL COMPLIANCE — LAST 4 WEEKS                  │
│  Week 1:  ████████░░  78%                           │
│  Week 2:  ██████░░░░  61%                           │
│  Week 3:  █████████░  87%                           │
│  Week 4:  ████████░░  80%  (current)                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Prescribe New Activity — modal**
```
┌─────────────────────────────────────────────────────┐
│  Prescribe Activity for Alex M.                     │
│  ─────────────────────────────                      │
│                                                     │
│  Activity                                           │
│  ┌─────────────────────────────────────────┐        │
│  │  Search activities…            🔍        │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  Dosage (duration per session)                      │
│  ┌────────────────┐                                 │
│  │  15 min     ▼  │                                 │
│  └────────────────┘                                 │
│                                                     │
│  Frequency                                          │
│  ┌────────────────┐                                 │
│  │  Nightly    ▼  │                                 │
│  └────────────────┘                                 │
│  Options: Daily / 2× daily / 3× weekly /            │
│           Weekly / Nightly / Weekdays only           │
│                                                     │
│  Clinical goal (shown to patient)                   │
│  ┌─────────────────────────────────────────┐        │
│  │  e.g. Regulate sleep onset before 11 PM │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  Phase restrictions                                 │
│  ┌─────────────────────────────────────────┐        │
│  │  No restriction                      ▼  │        │
│  └─────────────────────────────────────────┘        │
│  Options: No restriction / Pause during manic       │
│           phase / Pause during depressive phase     │
│                                                     │
│  [ Cancel ]          [ Prescribe Activity ]         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

> **What the psychiatrist can NOT access:** journal entries, raw mood scores, personal notes, crisis history, community posts, or any data the patient hasn't explicitly shared. The portal is strictly limited to activity names, prescribed dosage, and completion compliance.

</details>

---

### Screen 18 — Relapse Signature Builder

<details>
<summary>View wireframe (2 sections: manic + depressive)</summary>

> Accessible from Profile / You (Screen 13) → "My Relapse Signatures". One-time guided setup, editable at any time. Responses feed the AI early-warning system in Screen 09.

**Manic Relapse Signature**
```
┌─────────────────────────────┐
│  ← My Relapse Signatures    │
│                             │
│  MANIC EPISODE              │
│  ─────────────────────────  │
│                             │
│  What are the first 1–3     │
│  things that happen when    │
│  you're heading toward      │
│  a manic episode?           │
│                             │
│  ┌───────────────────────┐  │
│  │  1. I stop needing    │  │
│  │     much sleep        │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  2. My thoughts start │  │
│  │     racing at night   │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  3. Type here…        │  │
│  └───────────────────────┘  │
│  [ + Add another sign ]     │
│                             │
│  COMMON EXAMPLES            │
│  Tap to add:                │
│  · Irritability             │
│  · Impulsive spending       │
│  · Talking faster than usual│
│  · Feeling invincible       │
│  · Less need for sleep      │
│                             │
│  How many days before a     │
│  full episode do you        │
│  usually notice these?      │
│                             │
│  ──────●────────────        │
│         7 days              │  ← slider: 1–14 days
│                             │
│  Who notices first?         │
│  ○ I notice first           │
│  ● Both at the same time    │
│  ○ People around me notice  │
│                             │
│  [ Save Manic Signature ]   │
└─────────────────────────────┘
```

**Depressive Relapse Signature**
```
┌─────────────────────────────┐
│  ← My Relapse Signatures    │
│                             │
│  DEPRESSIVE EPISODE         │
│  ─────────────────────────  │
│                             │
│  What are the first 1–3     │
│  things that happen when    │
│  you're heading toward      │
│  a depressive episode?      │
│                             │
│  ┌───────────────────────┐  │
│  │  1. I start           │  │
│  │     cancelling plans  │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  2. I sleep more than │  │
│  │     9 hours           │  │
│  └───────────────────────┘  │
│  [ + Add another sign ]     │
│                             │
│  COMMON EXAMPLES            │
│  Tap to add:                │
│  · Withdrawing from people  │
│  · Losing interest in things│
│  · Sleeping more than usual │
│  · Appetite changes         │
│  · Feeling slowed down      │
│                             │
│  How many days before a     │
│  full episode?              │
│  ──────────●────────        │
│              10 days        │
│                             │
│  [ Save Depressive Signature]│
│                             │
│  ─────────────────────────  │
│  ✅ AI MONITORING ACTIVE    │
│  Equi will cross-reference  │
│  your journal and cycle     │
│  logs against these signs.  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

### Screen 19 — Medication Adherence

<details>
<summary>View wireframe (daily log + history)</summary>

> Accessible from Profile / You (Screen 13) → "Medication Adherence", or via the daily check-in card on Home (Screen 02).

**Daily Log View**
```
┌─────────────────────────────┐
│  ← Medication Adherence     │
│                             │
│  TODAY — Sunday Mar 1       │
│                             │
│  ┌───────────────────────┐  │
│  │  💊 Medication check  │  │
│  │  ─────────────────    │  │
│  │  [ Taken ] [ Skipped ]│  │
│  │  [ Partial dose ]     │  │
│  └───────────────────────┘  │
│                             │
│  IF SKIPPED — why?          │
│  (optional)                 │
│  ┌───────────────────────┐  │
│  │  ○ Forgot             │  │
│  │  ○ Side effects       │  │
│  │  ○ Felt fine without  │  │
│  │  ○ Ran out            │  │
│  │  ○ Other              │  │
│  └───────────────────────┘  │
│                             │
│  SIDE EFFECTS TODAY         │
│  (optional — tap all that   │
│  apply)                     │
│  ┌───────────────────────┐  │
│  │  ☐  Fatigue           │  │
│  │  ☐  Weight changes    │  │
│  │  ☐  Tremor            │  │
│  │  ☐  Cognitive fog     │  │
│  │  ☐  Nausea            │  │
│  │  ☐  Other             │  │
│  └───────────────────────┘  │
│                             │
│    [ Save Today's Log ]     │
│                             │
│  ─────────────────────────  │
│  THIS WEEK                  │
│  M   T   W   T   F   S   S  │
│  ✅  ⬜  ✅  ✅  ✅  ✅  ● │
│  6 / 7 days · 86%           │
│                             │
│  ─────────────────────────  │
│  SHARE WITH PSYCHIATRIST    │
│  ┌───────────────────────┐  │
│  │  Dr. Rachel Moore     │  │
│  │  [ OFF ] Adherence    │  │  ← toggle off by default
│  │         data sharing  │  │
│  └───────────────────────┘  │
│  Medication data is the     │
│  most private field in Equi.│
│  Off by default.            │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

## AI Summarization Model

The weekly/monthly AI summaries require a language model capable of clinical-style reasoning over structured data (mood logs, journal text, cycle states, sleep, activities).

### Recommended: Open-Weight Models

| Model | Host | Why |
|---|---|---|
| **Llama 3.1 70B** | Groq API (free tier) | Fast inference, strong reasoning, no cost to start |
| **Mistral Large** | Mistral API | European data sovereignty, strong clinical text |
| **Gemma 2 27B** | Google Vertex / Ollama | Lightweight, can run on-device for privacy |
| **BioMistral 7B** | Self-hosted | Fine-tuned on biomedical text — best for clinical tone |

### Recommended Architecture

```
User data (mood, journal, sleep, cycle, activities)
        │
        ▼
  Structured prompt builder
  (assembles the week's data into a clean context)
        │
        ▼
  LLM (Llama 3.1 70B via Groq or self-hosted)
        │
        ▼
  Structured output:
  · Plain-language summary
  · Sleep correlation insight
  · Top mood triggers (from journal sentiment)
  · Early warning flags
  · Recommended activities for next week
        │
        ▼
  AI Wellness Report (Screen 09) + PDF export
```

### Why not a closed model?

For a health app handling sensitive mental health data, open-weight models hosted on your own infrastructure (or Groq's zero-retention API) are preferable — no user data is used for training, and compliance with HIPAA is more achievable.

---

## Community Moderation Model

Community posts pass through a **lightweight AI validator** before going live. It flags — not auto-rejects — posts that may violate guidelines, and always gives the user a path to edit or escalate to a human moderator.

### What it checks for

| Category | Example violation |
|---|---|
| Medication dosage advice | "I take 600mg instead of prescribed..." |
| Graphic self-harm descriptions | Detailed methods or physical descriptions |
| Romanticizing episodes | Glorifying mania as a superpower |
| Toxic positivity | "Just think positive and it'll go away" |
| Medical diagnosis claims | "You definitely have bipolar II based on..." |
| Harassment or judgment | Dismissing others' experiences |
| Promotional content | App/product links, solicitation |

### Recommended model

| Model | Why it fits |
|---|---|
| **Llama 3.2 3B** via Groq | Sub-100ms latency, free tier, small enough to run inline before post submission |
| **Perspective API** (Google) | Free, battle-tested toxicity + hate speech scoring, runs as a secondary pass |
| **Detoxify** (self-hosted) | Open-source Python library, zero API cost, handles harassment and identity attacks |

### Recommended architecture

```
User submits post
       │
       ▼
  Llama 3.2 3B  (Equi-specific guideline check)
  ─ Is it medication dosage advice?
  ─ Is it graphic self-harm content?
  ─ Is it medical diagnosis claims?
  ─ Is it toxic positivity?
       │
       ├── Clean → Perspective API (toxicity / hate speech pass)
       │                │
       │                ├── Clean → Post goes live instantly
       │                │
       │                └── Flagged → "Heads up" screen + edit option
       │
       └── Flagged → "Heads up" screen with specific guideline shown
                              │
                              ├── User edits → re-run check
                              │
                              └── User posts anyway → queued for
                                  human moderator review (not hidden)
```

> Posts are **never silently deleted**. Flagged-and-posted content is visible but marked for human review. The user always knows the status of their post.

---

## Design Principles

| # | Principle |
|---|---|
| 1 | Never use red except for genuine crisis/emergency UI |
| 2 | Mood states have colors — never labeled "bad" or "good" |
| 3 | Every screen reachable with one thumb (bottom nav + large tap targets) |
| 4 | Journal and cycle log entries are editable up to 48h — then locked for data integrity |
| 5 | Streaks celebrate consistency but never shame missing a day |
| 6 | All community posts anonymous by default — opt-in to add a display name |
| 7 | No algorithmic feed — community is strictly chronological |
| 8 | Psychiatrist and well-wisher data never shared without explicit one-time consent |
| 9 | Export always available — your data is yours |
| 10 | Offline-first — all core features work without internet |
| 11 | Guardian "full control" always revocable by the user when stable |
| 12 | All AI summaries run on zero-data-retention infrastructure (HIPAA path) |
