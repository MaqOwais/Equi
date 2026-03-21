# Bipolar Flag — Architecture & Usage Guide

The **bipolar flag** is a single boolean that determines whether a user is on the **bipolar spectrum** (`true`) or is a **general mental health** user (`false`). All content branching in the app flows through this flag.

---

## Core utility — `mobile/lib/bipolar-flag.ts`

```ts
isBipolar(diagnosis)        // pure function — use outside React
useBipolarFlag()            // React hook — reads profile from auth store
diagnosisLabel(diagnosis)   // human-readable label for any Diagnosis value
```

**Bipolar diagnoses** (`isBipolar → true`): `bipolar_1`, `bipolar_2`, `cyclothymia`
**General diagnoses** (`isBipolar → false`): `depression`, `anxiety`, `general`, `other`, `unsure`, `null`

---

## Diagnosis type — `mobile/types/database.ts`

```ts
export type Diagnosis =
  | 'bipolar_1'
  | 'bipolar_2'
  | 'cyclothymia'
  | 'depression'
  | 'anxiety'
  | 'general'
  | 'other'
  | 'unsure';
```

Set during onboarding (`(onboarding)/diagnosis.tsx`) and stored in `profiles.diagnosis` in Supabase.
No DB migration needed — the column already accepts any string; the new values extend the TypeScript union only.

---

## Onboarding — `(onboarding)/diagnosis.tsx`

The picker is split into two labelled groups:

| Group | Options |
|-------|---------|
| **Bipolar Spectrum** | Bipolar I · Bipolar II · Cyclothymia |
| **General Mental Health** | Depression / Low mood · Anxiety · General wellness · Other / Prefer not to say · Still figuring it out |

---

## Where the flag is consumed

### 1. Workbook — `app/workbook.tsx`

```ts
const bipolar  = useBipolarFlag();
const sections = bipolar ? SECTIONS_BIPOLAR : SECTIONS_GENERAL;
const title    = bipolar ? 'Bipolar Workbook' : 'Wellness Workbook';
const total    = sections.length * 7;   // 49 for both
```

Both arrays have 7 sections × 7 prompts = 49 prompts. The `chapter`/`prompt_index` DB columns are identical — no migration needed if a user's diagnosis changes.

`SECTIONS_BIPOLAR` — content specific to bipolar disorder (IPSRT, episode awareness, relapse signatures, lithium adherence, etc.)
`SECTIONS_GENERAL` — adapted content for general mental health (CBT/DBT framing without bipolar-specific language)

### 2. Activity evidence refs — `lib/evidence-refs.ts`

```ts
getActivityRef(category, isBipolar)
```

Each of the 8 activity categories (`grounding`, `sleep`, `self_esteem`, `forgiveness`, `nutrition`, `physical`, `social`, `creative`) has:
- A **bipolar-specific** ref (e.g. MBCT for bipolar, IPSRT for social rhythm)
- A **`_general`** variant (same category, broader population evidence)

Used in `ActivityCard` inside `(tabs)/activities.tsx`.

### 3. Activity screen shortcuts — `(tabs)/activities.tsx`

The Workbook and Routine shortcut labels adapt:

| Shortcut | Bipolar label | General label |
|----------|--------------|---------------|
| Workbook sub | `Evidence-based exercises · CANMAT first-line` | `Evidence-based exercises` |
| Routine sub | `Social rhythm anchors · IPSRT-based` | `Evidence-based routine building` |

### 4. AI report — `lib/groq.ts`

```ts
buildReportMessages(data, bipolar)
buildMonthlyReportMessages(data, bipolar)
```

- `bipolar = true` → `BASE_SYSTEM_PROMPT_BIPOLAR` — references cycle states, manic/depressive phases, IPSRT
- `bipolar = false` → `BASE_SYSTEM_PROMPT_GENERAL` — neutral wellbeing language, no bipolar-specific framing

**Pass `useBipolarFlag()` from the calling screen when building report messages.**

---

## Adding a new branched feature

1. Import `useBipolarFlag` (component) or `isBipolar` (utility).
2. Branch on the boolean — keep both paths in the same file unless the content is very large.
3. If adding new activity evidence refs, add both a base key and a `_general` key to `ACTIVITY_REFS` in `evidence-refs.ts`.
4. No DB changes required — the flag is derived from `profiles.diagnosis` which is already stored.

---

## What does NOT change based on the flag

- Cycle state tracking (`stable / manic / depressive / mixed`) — available to all users
- Social rhythm / routine anchors — available to all users
- Community, psychiatrists, nutrition — available to all users
- Crisis mode — available to all users
- Pin / home layout — available to all users

The flag only gates **content framing** (clinical language, section titles, evidence citations, AI prompt style).
