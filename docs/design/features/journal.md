# Feature: Journal

Block-based daily journal with customizable prompts, activity log, social rhythm tracking, and a 48-hour edit window. The Daily Routine Builder (accessible from Profile) configures what appears here each day.

← [Design index](../wireframes.md)

---

## Journal Screen

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Journal           🔍  ✏️ │
│                             │
│  ◀  March 2026  ▶           │
│  M   T   W   T   F   S   S  │
│  23  24  25  26  27  28   1 │
│  🟢  🟢  🔵  🟣  🟢  🟢  ● │  ← entry history dots
│                             │
│  📊 6 entries this week     │  ← activity history counter
│                             │
│  TODAY — Sunday Mar 1       │
│  Cycle: Stable · Sleep: 7h  │
│  Mood: 7/10                 │
│                             │
│  DAILY PROMPTS              │  ← customizable (Routine Builder)
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
│  [ + Add your own block ]   │  ← tap '/' for block menu
│  > Text · Checklist         │  ← floating overlay, not a
│  > Mood Tag · Cycle Tag     │     persistent section
│  > Image · Quote            │
│  > Mood Scale · Life Event  │
│  > Social Rhythm            │
│                             │
│  SOCIAL RHYTHM              │  ← persistent daily card
│  ┌───────────────────────┐  │
│  │  🕐 Log today's       │  │  ← unlogged state
│  │     rhythm anchors →  │  │
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

</details>

---

## Design Notes

**48-hour edit window** keeps journal data reliable for AI analysis while still allowing same-day corrections.

**Social Rhythm card states:**
- *Unlogged* — shows "🕐 Log today's rhythm anchors →" (tap opens 5-field entry: Wake · First contact · Work start · Dinner · Bedtime)
- *Logged* — collapses to "✅ Rhythm logged · Consistency ████░░" with the 7-day consistency score inline

**Block menu** is a floating overlay — not a visible section. Appears when the user types `/` in the editor. Available blocks: Text · Checklist · Mood Tag · Cycle Tag · Image · Quote · Mood Scale · Life Event · Social Rhythm.

---

## Daily Routine Builder

Configures which prompts and checklist items appear in the journal every day. Accessible from Profile / You → "Routine Builder".

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
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  No phone before   │  │
│  │     9am               │  │
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  In bed by 11pm    │  │
│  │                  ✏️ 🗑│  │
│  ├───────────────────────┤  │
│  │  ≡  Small puzzle game │  │
│  │                  ✏️ 🗑│  │
│  └───────────────────────┘  │
│  [ + Add checklist item ]   │
│                             │
│  ┌───────────────────────┐  │
│  │  Today: 3 / 4 done    │  │
│  │  ████████████░░       │  │
│  └───────────────────────┘  │
│                             │
│    [ Save Routine ]         │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

> Checklist completion feeds directly into the AI Wellness Report analytics. Simple completion tracking — no weighted scoring.
