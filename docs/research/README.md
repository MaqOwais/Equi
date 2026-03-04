# Equi — Research & Evidence Base

This directory documents the clinical research behind every feature in Equi. All findings are drawn from top-tier journals: **JAMA Psychiatry, Lancet Psychiatry, Bipolar Disorders, Journal of Affective Disorders, American Journal of Psychiatry, NEJM, JMIR Mental Health, BMC Psychiatry**.

---

## Files

| File | Contents |
|---|---|
| [evidence-review.md](evidence-review.md) | Full research review — what each feature is based on, study details, citations |
| [diet-nutrition.md](diet-nutrition.md) | Deep-dive research on diet and bipolar disorder — omega-3, ketogenic, Mediterranean, gut-brain axis, caffeine-lithium interactions, meal timing, metabolic syndrome |
| [missing-features.md](missing-features.md) | Evidence-backed features not yet in Equi that research says should be added |
| [safety-flags.md](safety-flags.md) | Documented clinical risks, contraindications, and required design mitigations |
| [competitors.md](competitors.md) | Competitor analysis and Equi's unique selling points |

---

## Quick Reference: Evidence Strength by Feature

| Feature | Verdict | Strength |
|---|---|---|
| Sleep monitoring | First-line biomarker — strongest single predictor of episode onset | ✅✅✅ Very Strong |
| Psychoeducation / Bipolar Workbook | First-line adjunct treatment in CANMAT 2023 guidelines | ✅✅✅ Very Strong |
| Crisis mode + digital safety planning | Digital safety plans reduce repeat crisis ED visits by 50% | ✅✅✅ Strong |
| Cycle / mood tracking | Validated by ISBD meta-analysis; adverse-event risk documented | ✅✅ Strong |
| Wearable integration (HR, sleep, HRV) | 83% accuracy for predicting depressive episodes; growing validation | ✅✅ Moderate–Strong |
| Well-wisher & Guardian access | Family Focused Therapy RCT shows caregiver involvement extends time to next episode | ✅✅ Moderate–Strong |
| Peer support / anonymous community | Consistent quality-of-life improvements; anonymity reduces stigma barriers | ✅✅ Moderate |
| Shame & forgiveness activities | Shame after manic episodes is a recognized clinical target; self-forgiveness RCTs show depression reduction | ✅✅ Moderate |
| Behavioral activation (prescribed activities) | Evidence-based but requires bipolar-specific anti-hypomania guardrails | ✅✅ Moderate (with caveats) |
| MBCT / mindfulness / body scan | Reduces bipolar depression and anxiety — does NOT help mania | ✅ Moderate (depression only) |
| Gratitude journaling / compliment diary | General benefit documented; individual hypomania induction risk flagged in pilot RCT | ✅ Weak–Moderate |
| Social rhythm monitoring | IPSRT landmark RCTs — one of the strongest behavioural targets in bipolar | ✅✅✅ Very Strong |
| Medication adherence tracking | ~50% non-adherence rate; only 1 in 3 apps include it; CANMAT 2023 primary target | ✅✅✅ Very Strong |
| Personalized relapse signature | Idiosyncratic prodromal signs occur 2–4 weeks before relapse; Cochrane-reviewed | ✅✅ Strong |
| Life events / stressor logging | IPSRT model; life-event social rhythm disruption is a direct episode trigger | ✅✅ Moderate–Strong |
| Substance use monitoring (alcohol / cannabis) | MinDag 2025 (Oslo): cannabis most common comorbid substance; alcohol destabilises mood cycles and degrades sleep. Lindner Center: substance use interferes directly with mood stabilisers | ✅✅ Moderate–Strong |
| **Diet & Nutrition tracking** | Saunders 2022 RCT: EMA-detected mood variability reduced by high omega-3/low omega-6 diet. Stanford 2024 ketogenic pilot: 69% of BD patients showed clinically meaningful improvement. Diet quality independently predicts treatment response (Jacka lab 2019). See [diet-nutrition.md](diet-nutrition.md) | ✅✅ Moderate–Strong |

---

## Safety Flags

Five clinically documented risks requiring specific design responses. Full details and required mitigations in [`safety-flags.md`](safety-flags.md).

| Flag | Severity | Status |
|---|---|---|
| Mood monitoring → rumination | High | Needs implementation: low-mood safety circuit, no multi-check-in design |
| Positive activities → hypomania induction | Medium | Needs implementation: cycle-phase gating, phase caution field in portal |
| Behavioral activation without anti-hypomania guardrails | Medium | Needs implementation: phase-aware Home suggestions, portal phase field |
| Clinical framing of grounding / mindfulness | Low | Needs copy changes in activity descriptions |
| Data privacy and stigma risk | High | Partially addressed: needs plain-language privacy UX, no third-party analytics |

---

## Key Clinical Guidelines Referenced

| Guideline | Relevance |
|---|---|
| **CANMAT and ISBD 2023 Guidelines for the Treatment of Bipolar Disorder** | Primary clinical authority; cited for psychoeducation, medication adherence, and behavioral interventions |
| **ISBD Big Data Task Force — Smartphone Interventions Meta-analysis** (*Bipolar Disorders*, 2022) | Primary authority for digital monitoring tools |
| **Stanley-Brown Safety Planning Intervention (SPI)** | Framework for the crisis mode screen design |
| **Interpersonal and Social Rhythm Therapy (IPSRT)** — Frank et al. | Landmark RCTs establishing social rhythm monitoring as first-line |
| **Barcelona Group Psychoeducation** — Colom & Vieta (*British Journal of Psychiatry*, 5-year RCT) | Primary authority for the Bipolar Workbook content |
| **Family Focused Therapy** — Miklowitz et al. (*JAMA Psychiatry*, 2020) | Basis for well-wisher and guardian access feature |
