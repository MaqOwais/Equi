# Feature: Bipolar Workbook

Structured self-guided workbook with sequential prompts across 4 chapters — understanding cycles, triggers, warning signs, and strengths. Exportable as a PDF for psychiatrist sessions.

← [Design index](../wireframes.md)

---

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

</details>

---

## Design Notes

**Private by default.** Workbook responses are not shared with anyone unless the user explicitly exports them as a PDF and shares with their psychiatrist.

**Sequential chapters.** Each chapter unlocks after the previous one is completed — guides the user through a logical progression without overwhelming them.

**Exportable.** The "Export as PDF" button generates a formatted document the user can bring to a session or email to their psychiatrist.

**Accessible from Activities.** The Bipolar Workbook appears in the Activities library under "Structured Reflection" as a special card — it opens this workbook screen rather than an activity detail.
