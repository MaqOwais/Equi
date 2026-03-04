# Feature: Home (Today View)

The daily entry point. Shows current cycle state, mood tap, medication and substance check-ins, sleep summary, activity suggestions, and the SOS button.

← [Design index](../wireframes.md)

---

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  Good morning, Owais  🌅    │  ← personalized greeting
│  Sunday, March 1            │
│                             │
│  ┌───────────────────────┐  │
│  │  TODAY                │  │
│  │                       │  │
│  │  ● Stable · Day 4     │  │  ← cycle state (Sage Green dot)
│  │  Last: Depressive 6d  │  │
│  │  ─────────────────    │  │
│  │  How are you feeling? │  │
│  │  😔  😐  🙂  😊  ⚡  │  │  ← mood tap (1–5 emoji)
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  DAILY CHECK-INS      │  │
│  │                       │  │
│  │  💊 Meds              │  │
│  │  [Taken] [Skip] [Part]│  │  ← one-tap
│  │  ─────────────────    │  │
│  │  🍷 Alcohol  [No][Yes]│  │
│  │  🌿 Cannabis [No][Yes]│  │
│  └───────────────────────┘  │
│                             │
│  TODAY'S SUGGESTIONS        │
│  Stable day · Morning       │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │    🫙    │ │    🌸    │  │
│  │Gratitude │ │  Proud   │  │
│  │   Jar    │ │Dandelion │  │
│  │  5 min   │ │  7 min   │  │
│  └──────────┘ └──────────┘  │
│                             │
│  ⌚ Last night  7h 2m · 87% │  ← compact sleep row
│  M   T   W   T   F   S   S  │  ← week at a glance
│  🟢  🟢  🔵  🟢  🟢  ⬜  ● │
│                             │
│  🆘  I'm not okay right now │  ← always visible
│                             │
│  🏠    📓    🌊    🎯    👤 │
│ Home  Jrnl  Cycle  Expl  You│
└─────────────────────────────┘
```

</details>

---

## Design Notes

**Simplified layout:** 9 separate elements merged into 6. TODAY card combines cycle state + mood tap (always contextual together). DAILY CHECK-INS combines medication + substance (same one-tap interaction pattern). Sleep and week dots are compact rows — no section headers.

**Medication conditional visibility:** The medication row in DAILY CHECK-INS only appears if medication tracking is enabled — set during onboarding (Slide 4), toggled in Profile Settings, or activated via a psychiatrist request. When off, the card shows substance check-ins only and is relabeled accordingly.

**Two-layer interaction:** Core daily minimum is 4 taps — cycle state (on Cycle screen), mood in TODAY, medication + substance in DAILY CHECK-INS. Journaling, activities, and community are always optional depth.

**SOS button** is always visible at the bottom of the Home screen. Tapping it launches Crisis Mode (full-screen overlay).
