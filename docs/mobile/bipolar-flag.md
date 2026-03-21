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

### 1. Home screen — `(tabs)/index.tsx`

```ts
const exploreLinks = bipolar ? EXPLORE_LINKS_BIPOLAR : EXPLORE_LINKS_GENERAL;
```

| Item | Bipolar | General |
|------|---------|---------|
| Workbook explore card sub | `Bipolar exercises` | `Wellness exercises` |
| Tracker explore card label | `90-Day Mood Cycle` | `90-Day Mood Chart` |
| Activities explore card sub | `Matched to state` | `Matched to your mood` |
| Cycle card empty prompt | `How is your mood today?` | `How is your mood today?` |

The "mood episode" phrasing has been removed from both the hero action card and the cycle section card — the prompt now reads **"How is your mood today?"** for all users.

---

### 2. Workbook — `app/workbook.tsx`

```ts
const sections     = bipolar ? SECTIONS_BIPOLAR : SECTIONS_GENERAL;
const workbookTitle = bipolar ? 'Bipolar Workbook' : 'Wellness Workbook';
const totalPrompts  = sections.length * 7;  // 49 for both
```

Both arrays have 7 sections × 7 prompts = 49 prompts. The `chapter`/`prompt_index` DB columns are identical — no migration needed if a user's diagnosis changes.

`SECTIONS_BIPOLAR` — bipolar-specific (IPSRT, episode awareness, relapse signatures, lithium adherence)
`SECTIONS_GENERAL` — adapted for general mental health (CBT/DBT framing, no bipolar terminology)

---

### 3. Activities — `(tabs)/activities.tsx`

**CATEGORY_META:** `workbook` label is `'Workbook'` (no longer `'Bipolar Workbook'`).

**PROGRAMS shortcut subtitles:**

| Shortcut | Bipolar | General |
|----------|---------|---------|
| Workbook sub | `Evidence-based exercises · CANMAT first-line` | `Evidence-based exercises` |
| Routine sub | `Social rhythm anchors · IPSRT-based` | `Evidence-based routine building` |

**Activity evidence refs** (`lib/evidence-refs.ts`):

```ts
getActivityRef(category, isBipolar)
```

Each of the 8 categories (`grounding`, `sleep`, `self_esteem`, `forgiveness`, `nutrition`, `physical`, `social`, `creative`) has a bipolar-specific ref and a `_general` variant. Used in `ActivityCard`.

---

### 4. Nutrition — `(tabs)/you/nutrition.tsx`

```ts
getCategoryWhy(key, bipolar)   // exported helper — use this everywhere
```

Two evidence blurb maps exist side-by-side:
- `CATEGORY_WHY` — bipolar-specific (references mood episodes, lithium, mood stabilisers)
- `CATEGORY_WHY_GENERAL` — same keys, broader-population evidence, no bipolar/lithium language

The section header also adapts:

| Section | Bipolar | General |
|---------|---------|---------|
| Harm category header | `MAY DESTABILIZE` | `LIMIT OR WATCH` |

`tracker.tsx` imports `getCategoryWhy` (not `CATEGORY_WHY` directly) for the same reason.

---

### 5. Cycle Tracker — `(tabs)/tracker.tsx`

```ts
const SYMPTOMS = bipolar ? SYMPTOMS_BIPOLAR : SYMPTOMS_GENERAL;
```

| State | Bipolar symptoms | General symptoms |
|-------|-----------------|-----------------|
| Elevated | Racing thoughts · **Overspending** · Irritability · Reduced sleep · **Grandiosity** · Risk-taking | Racing thoughts · Busy / fast mind · Irritability · Reduced sleep · Increased activity · Impulsive decisions |
| Low | Low energy · Isolation · **Hopelessness** · Sleep changes · Poor concentration · Appetite changes | Low energy · Withdrawal · Low mood · Sleep changes · Poor concentration · Appetite changes |
| Mixed | Agitation · Rapid mood shifts · Fatigue + irritability · Restlessness | *(same)* |
| Stable | Regular sleep · Good energy · Clear thinking · Social connection | *(same)* |

---

### 6. Relapse Signatures — `(tabs)/you/relapse-signature.tsx`

| Element | Bipolar | General |
|---------|---------|---------|
| Screen title | `Relapse Signatures` | `Warning Signs` |
| Tab labels | `Elevated / Manic` · `Low / Depressive` | `High / Elevated` · `Low / Difficult` |
| Step 1 description | `…high/manic episode` | `…high/elevated period` |
| Step 2 description | `…full episode` | `…full shift` |
| Privacy note | `Relapse signatures are…` | `Warning sign patterns are…` |

The `SignatureBuilder` sub-component receives `bipolar: boolean` as a prop.

---

### 7. Medications — `(tabs)/you/medications.tsx`

The medication name input placeholder adapts:

| Bipolar | General |
|---------|---------|
| `e.g. Lithium, Quetiapine` | `e.g. Sertraline, Fluoxetine` |

---

### 8. AI report — `lib/groq.ts`

```ts
buildReportMessages(data, bipolar)
buildMonthlyReportMessages(data, bipolar)
```

- `bipolar = true` → `BASE_SYSTEM_PROMPT_BIPOLAR` — references cycle states, manic/depressive phases, IPSRT
- `bipolar = false` → `BASE_SYSTEM_PROMPT_GENERAL` — neutral wellbeing language, no bipolar-specific framing

**Pass `useBipolarFlag()` from the calling screen when building report messages.**

---

## Adding a new branched feature

1. Import `useBipolarFlag` (React component) or `isBipolar` (pure utility).
2. Branch on the boolean — keep both paths in the same file unless the content is very large.
3. For activity evidence: add both a base key and a `_general` key in `ACTIVITY_REFS` in `evidence-refs.ts`.
4. For nutrition blurbs: add the key to both `CATEGORY_WHY` and `CATEGORY_WHY_GENERAL`, then call `getCategoryWhy(key, bipolar)` at the render site.
5. No DB changes required — the flag is derived from `profiles.diagnosis` which is already stored.

---

## What does NOT change based on the flag

- Cycle state tracking (`stable / manic / depressive / mixed`) — available to all users
- Social rhythm / routine anchors — available to all users
- Community, psychiatrists, nutrition logging — available to all users
- Crisis mode — available to all users
- Pin / home layout customisation — available to all users
- AI report screen UI — neutral language throughout

The flag gates **content framing only**: clinical terminology, section titles, evidence citations, AI prompt style, and symptom checklists.
