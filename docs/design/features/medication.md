# Feature: Medication Adherence

Daily medication log with taken/skipped/partial tracking, optional skip reasons, side-effect logging, and a psychiatrist sharing toggle. Conditionally visible — only shown when medication tracking is enabled.

← [Design index](../wireframes.md)

---

## When It Appears

Medication tracking visibility is controlled in three ways:

1. **Onboarding (Slide 4):** Patient answers whether they take medication. If yes, they choose to track or not. If no, the section is hidden entirely.
2. **Profile Settings toggle:** The Medication Adherence entry in Profile shows `[ ON ]` or `[ OFF ]` inline. One tap re-enables without re-onboarding. All previously logged data is retained.
3. **Psychiatrist request:** The psychiatrist can send an in-app notification requesting the patient enable tracking. The patient decides — their response is not reported back to the portal.

When tracking is off, the medication row is removed from Home's DAILY CHECK-INS card, and the section is hidden from the AI Wellness Report.

---

## Medication Adherence Screen

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Medication Adherence     │
│                             │
│  [ ON ]  Track my meds      │  ← master toggle (tap to disable)
│  ─────────────────────────  │
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

## Privacy Notes

Medication adherence is the most sensitive data type in Equi. It is:
- **Off by default** for psychiatrist sharing
- **Never accessible** to well-wishers, guardians, or friends (psychiatrist only, and only when explicitly shared)
- **Retained** even when tracking is disabled — re-enabling makes previous logs visible again

See [docs/access/psychiatrist.md](../../access/psychiatrist.md) for the full access rules.
