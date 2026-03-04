# Feature: Psychiatrists

Two parts: a patient-facing directory for finding and booking psychiatrists, and a web-based portal for Equi Partner psychiatrists to view patient activity compliance and prescribe activities.

← [Design index](../wireframes.md)

---

## Find a Psychiatrist (Patient App)

<details>
<summary>View wireframes (Nearby + Partner Network)</summary>

**Nearby Search (map + list)**
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

**Equi Partner Network** *(Partners tab)*
```
┌─────────────────────────────┐
│  Find a Psychiatrist   🔍   │
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
> **Partner program:** Psychiatrists apply to join the Equi network. They agree to understand the app's monitoring data, use activity prescriptions, and maintain quality metrics (response time, patient satisfaction, booking completion rate).

</details>

---

## Psychiatrist Portal (Web — Partners only)

The web portal is only accessible to Equi Partners. Patients control which psychiatrist can see their data and what they can see.

<details>
<summary>View wireframes (dashboard + prescribe modal)</summary>

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
│  CLINICAL TOOLS                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  💊 Medication tracking  [ Not enabled ]       │  │
│  │  [ Request patient enables tracking ]          │  │
│  └───────────────────────────────────────────────┘  │
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

</details>

---

## What the Psychiatrist Can and Cannot Access

**Portal is strictly limited to:**
- Activity names + completion rate
- Prescribed dosage and frequency
- Compliance percentages per week

**The psychiatrist can NOT access:**
- Journal entries or personal notes
- Raw mood scores
- Crisis history or community posts
- Any data the patient hasn't explicitly shared

**Medication tracking request:** Clicking `[ Request patient enables tracking ]` sends an in-app notification to the patient. The patient's decision (enable / not now / don't ask again) is not reported back — the portal only shows whether tracking is currently on or off. The psychiatrist cannot enable it directly.

See [docs/access/psychiatrist.md](../../access/psychiatrist.md) for the full access table.
