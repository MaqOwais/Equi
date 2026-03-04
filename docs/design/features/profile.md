# Feature: Profile & Settings

Personal stats, wellness radar, and entry point for all settings — notifications, wearable sync, emergency contacts, medication tracking, relapse signatures, themes, data export, and privacy. Includes the Themes & Ambiance sub-screen and the deferred Calendar view.

← [Design index](../wireframes.md)

---

## Profile / You

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
│  │tracked│ │ done  │ │ days││
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
│  🔎  My Relapse Signatures  │  ← links to Cycle Tracking feature
│  💊  Medication Adherence   │  ← enable/disable toggle + Medication feature
│  🌊  Themes & Ambiance      │  ← see sub-screen below
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

## Themes & Ambiance

Ambient soundscape selector accessible from Profile → "Themes & Ambiance". Theme choice is a personal preference — no cycle-state dependency.

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
│  NOW PLAYING                │
│  🌊 Ocean waves — Beach     │
│  ▶ ──────────────────  🔇  │
│                             │
└─────────────────────────────┘
```

</details>

---

## Medication Adherence entry

Tapping "Medication Adherence" in the settings list opens the Medication screen, which has a master `[ ON / OFF ]` toggle at the top. When tracking is off, the entry in Profile shows `[ OFF ]` inline — users can re-enable without going through onboarding again. All previously logged data is retained and becomes visible again when re-enabled.

---

## Calendar *(Phase 4 — Deferred)*

> Unified calendar view showing all logged data by day. Deferred until all core feature screens are stable, as aggregation only makes sense once the underlying data is reliable.

<details>
<summary>View wireframe (reference design)</summary>

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
