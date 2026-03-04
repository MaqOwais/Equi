# Feature: Cycle Tracking

Daily cycle state logging with symptom tracking and 90-day wave visualization. Includes the Relapse Signature Builder — a one-time personalized setup that tells the AI what to watch for.

← [Design index](../wireframes.md)

---

## Cycle Tracker

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

## Relapse Signature Builder

One-time guided setup of personal early-warning signs for manic and depressive episodes. Responses feed the AI early-warning system in the weekly report. Accessible from Profile → "My Relapse Signatures".

<details>
<summary>View wireframes (manic + depressive)</summary>

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
│  · Drinking more caffeine   │
│  · Forgetting to eat        │
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
│  · Eating mostly junk food  │
│  · Relying on caffeine      │
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
