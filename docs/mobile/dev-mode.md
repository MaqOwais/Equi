# Developer Mode — Guide

Developer Mode is a built-in panel for testing content branching without touching real user data or the database.

It is **only visible when `DEV_MODE = true`** in `mobile/constants/dev.ts`. When you flip that constant to `false` for a production build, the panel disappears entirely and all overrides are never evaluated.

---

## How to access it

1. Open the **You** tab.
2. Scroll to the bottom — below "Support Equi".
3. Tap **🛠 Developer Mode**.

The entry row also shows the current bipolar flag state at a glance, and turns gold when any override is active.

---

## What you can do in the panel

### 1. Active Flag Status

Read-only summary of the current state:

| Field | Meaning |
|-------|---------|
| BIPOLAR FLAG | The value `useBipolarFlag()` returns right now (true = bipolar path, false = general path) |
| DIAGNOSIS | Active diagnosis (real or overridden) |
| OVERRIDE ACTIVE | Whether any dev override is in effect |
| REAL PROFILE | The actual diagnosis stored in the DB for the signed-in user |

---

### 2. Bipolar Flag Override

Force the flag without changing the DB:

| Button | Behaviour |
|--------|-----------|
| **Auto (use real)** | `useBipolarFlag()` reads from the real profile |
| **Force Bipolar** | `useBipolarFlag()` always returns `true` — bipolar content path |
| **Force General** | `useBipolarFlag()` always returns `false` — general content path |

The override is **reactive** — every screen re-renders immediately when you tap.

---

### 3. Diagnosis Override

Simulates a different diagnosis value for any screen that reads `profile.diagnosis` directly. Useful for testing:

- Onboarding label display
- Medication placeholder text
- Any screen that calls `diagnosisLabel(profile.diagnosis)`

Selecting a bipolar-spectrum diagnosis (`bipolar_1`, `bipolar_2`, `cyclothymia`) will also move the bipolar flag to `true` — unless the flag override above is set to **Force General**.

Tap the same chip again to deselect (back to the real value).

---

### 4. Flag Impact Map

An inline reference showing every screen that branches on the bipolar flag and exactly what changes. Use this when testing to know what to look for.

---

### 5. Reset All Overrides

Clears all overrides back to null. The app then uses real profile data again.

> **Note:** Overrides are in-memory only (Zustand, no persistence). They reset to null automatically every time the app fully restarts.

---

## Architecture

### Guard — `constants/dev.ts`

```ts
export const DEV_MODE = true;   // ← flip to false before any production build
```

This is the single source of truth. The dev panel menu entry in `you/index.tsx` is wrapped in `{DEV_MODE && ...}`, so it tree-shakes cleanly in production.

---

### Store — `stores/dev.ts`

```ts
useDevStore()
  .bipolarOverride      // 'bipolar' | 'general' | null
  .diagnosisOverride    // Diagnosis | null
  .setBipolarOverride()
  .setDiagnosisOverride()
  .resetAll()
```

No AsyncStorage — intentionally volatile. Overrides should not survive a full restart.

---

### Hook — `lib/bipolar-flag.ts`

`useBipolarFlag()` checks the dev store **before** the real profile:

```ts
export function useBipolarFlag(): boolean {
  const profile     = useAuthStore((s) => s.profile);
  const devOverride = useDevStore((s) => s.bipolarOverride);

  if (DEV_MODE && devOverride !== null) {
    return devOverride === 'bipolar';
  }
  return isBipolar(profile?.diagnosis);
}
```

In production (`DEV_MODE = false`) the condition is never true, so the store read is still called but its value is never used — no behaviour change, negligible overhead.

---

## Content branches covered by the flag

| Screen | Bipolar | General |
|--------|---------|---------|
| **Home** | "Bipolar exercises" · "90-Day Mood Cycle" | "Wellness exercises" · "90-Day Mood Chart" |
| **Workbook** | "Bipolar Workbook" — IPSRT, episode awareness | "Wellness Workbook" — CBT/DBT framing |
| **Activities** | CANMAT / IPSRT-based subtitles | Plain "evidence-based" subtitles |
| **Tracker symptoms** | Grandiosity, Overspending, Hopelessness | Busy mind, Increased activity, Low mood |
| **Nutrition** | "MAY DESTABILIZE" · lithium language | "LIMIT OR WATCH" · broad-population language |
| **Relapse Signatures** | "Relapse Signatures" · "Elevated/Manic" | "Warning Signs" · "High/Elevated" |
| **Medications** | Placeholder: "e.g. Lithium, Quetiapine" | Placeholder: "e.g. Sertraline, Fluoxetine" |
| **AI Report prompt** | Spectrum diagnosis, cycle states | Neutral wellbeing language |
| **Activity evidence refs** | Bipolar-specific citations | General mental health citations |

---

## Adding a new branched feature

When you add a new bipolar/general branch:

1. Add a row to `FLAG_IMPACT_MAP` in `dev-mode.tsx` — so it shows up in the panel.
2. Write tests for both paths in `__tests__/bipolar-flag/bipolar-flag.test.ts`.
3. Update `docs/mobile/bipolar-flag.md` with the new consumption point.

---

## Production checklist

Before any production build:

- [ ] `constants/dev.ts` → set `DEV_MODE = false`
- [ ] Confirm the Developer Mode entry is invisible in the You tab
- [ ] Confirm `useBipolarFlag()` returns based on real profile only
