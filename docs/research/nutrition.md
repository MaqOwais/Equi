# Research: Nutrition Apps — Competitive Analysis & Equi Improvement Roadmap

> Science basis → [docs/research/diet-nutrition.md](diet-nutrition.md) (bipolar-specific research, clinical evidence)
> Feature design → [docs/design/features/nutrition.md](../design/features/nutrition.md) (Equi design spec)
>
> **This document:** How other nutrition apps work, what they get right and wrong, and what Equi should build next in the nutrition tab.

← [Research index](README.md)

---

## The Core Problem with Every Existing Nutrition App

Every major nutrition app was designed for one of two goals: **weight loss** or **athletic performance**. They optimise for calorie deficit or macro splits. For bipolar disorder, neither of these is the relevant variable — what matters is **food quality, eating regularity, inflammatory load, and specific medication interactions**.

The result: a bipolar patient opening MyFitnessPal or Cronometer faces an interface built entirely around metrics (calories, protein grams, BMI trend) that are at best irrelevant and at worst harmful (calorie obsession can worsen anxiety and co-occurring eating issues, which are elevated in BD patients).

**No existing app is built for what the research says matters in BD.** That is Equi's opening.

---

## 1. Top Apps — Feature Breakdown

### MyFitnessPal
**Market position:** 200M+ users, dominant calorie tracker.

**Core features:**
- Barcode scanner → 14M+ food database
- Calorie + macro targets (calories, protein, carbs, fat, fiber)
- Meal diary: Breakfast / Lunch / Dinner / Snacks
- Water tracker (manual)
- Exercise logging (adjusts calorie allowance)
- Weekly nutrition reports and goal progress
- Recipe builder and restaurant menu search
- HealthKit / Google Fit integration

**What works:**
- Barcode scan is fast and accurate — the gold standard implementation
- Food database is the largest available (crowd-sourced + verified)
- Habit of logging is strong because the UX friction is low for regular users
- Progress graphs are motivating for weight-loss-oriented users

**What fails for mental health use:**
- Calorie counting creates obsessive loops — clinically documented as harmful for anyone with anxiety, disordered eating history, or body-image concerns. All three are elevated in BD patients.
- No meal timing data — eating window, circadian rhythm anchor missed entirely
- No food quality dimension — a packet of biscuits and a bowl of oats "count" equally if they have the same calories
- No inflammation index or quality score
- No mood correlation — the whole point from an EMA perspective
- Gamification punishes missed days (red streaks)
- Premium required for most useful features ($20/month)

**What Equi should borrow:** Barcode scan UX (scan → confirm in <5 seconds), food database approach for packaged items (Open Food Facts), water tracking simplicity (tap + / −).

---

### Cronometer
**Market position:** 5M+ users, "micronutrient tracker" — popular with health-focused power users.

**Core features:**
- Tracks 84 micronutrients (most complete of any app)
- NCCDB + USDA food databases
- Biometric logging (weight, blood pressure, glucose, sleep)
- Gold targets: RDA-based nutrient targets
- Detailed blood panel integration
- Oracle AI food recognition (photo)
- CSV export of all data

**What works:**
- The most scientifically rigorous nutrition app available
- Micronutrient tracking (B12, folate, magnesium, D, zinc) is directly relevant to BD
- CSV export respects data ownership
- Blood panel integration creates real context

**What fails for mental health use:**
- Interface is overwhelming — 84 nutrients shown in a scrolling table
- Designed for health-optimisation hobbyists, not people managing a mental health condition
- No mood or symptom connection
- Daily compliance rate is low — the cognitive load is high
- No social rhythm or circadian meal timing feature
- Magnesium, folate, B12 data is buried inside a nutrient table, not surfaced as meaningful

**What Equi should borrow:** The concept of tracking *specific micronutrients relevant to BD* (magnesium, omega-3, B12, folate, D) rather than generic macros. Not the UI — the insight about which nutrients matter.

---

### Noom
**Market position:** 50M+ users, "psychology-based weight loss program."

**Core features:**
- Color-coded food system: Green / Yellow / Red (calorie density proxy)
- Daily lessons on psychology and behavior change
- Personal coaching (human + AI)
- Meal logging tied to color system
- Weekly check-ins and goal review
- Group support

**What works:**
- Color-coding reduces cognitive load massively — "green / yellow / red" is actionable without numbers
- Behavior change emphasis is clinically sound (CBT principles)
- Coaching accountability creates retention
- The system is learnable in a day

**What fails for mental health use:**
- Color system is still a calorie proxy — Red foods are often nutrient-dense (avocado, nuts, oily fish) which are exactly the foods BD patients should eat more of. The system actively discourages anti-inflammatory foods.
- Weight loss framing is inappropriate for BD patients on mood stabilisers (which cause weight gain — the goal is metabolic health, not weight)
- Daily lessons are engagement-by-guilt: missing creates shame, which is harmful for depressive phases
- No medication interaction awareness at all

**What Equi should borrow:** Color-coding simplicity (without calorie proxying). The "Green / Amber / Red" framing maps well to Equi's anti-inflammatory vs. neutral vs. destabilizing food categories. Behavioral psychology framing over calorie framing.

---

### Lifesum
**Market position:** 50M+ users, aesthetically focused "healthy lifestyle" app.

**Core features:**
- Food diary with calorie + macro tracking
- Meal plans (Mediterranean, keto, high-protein, etc.)
- Water tracking
- Barcode scanner
- Life Score — aggregate health score based on logged behaviors
- Recipe library
- HealthKit integration

**What works:**
- Best UI aesthetics of any nutrition app — clean, calm, accessible
- Life Score concept: one aggregate number from multiple inputs creates a sense of daily progress without obsessing over individual metrics
- Meal plan approach reduces decision fatigue
- Mediterranean diet plan exists and is evidence-aligned

**What fails for mental health use:**
- Life Score is still a weight-loss metric underneath
- No mood logging or correlation
- Meal plan approach doesn't account for medication side effects (appetite changes from quetiapine / lithium)
- No circadian meal timing

**What Equi should borrow:** The **Life Score concept** — a single daily food quality score from multiple inputs (rather than calorie count). Also: the clean card-based UI for food entries, and the calm aesthetic. Lifesum proves you can make nutrition tracking feel supportive rather than punishing.

---

### Lose It!
**Market position:** 40M+ users, calorie-focused with AI features.

**Core features:**
- Snap It — photo recognition for food logging
- Barcode scan
- Calorie and macro diary
- Exercise tracker
- Budget: daily calorie "budget" mechanic
- Trends: weight, food, exercise over time

**What works:**
- Snap It photo recognition is fast and surprisingly accurate for common foods
- Budget metaphor makes calorie management feel financially intuitive

**What fails:** Same calorie-first, weight-loss framing as MyFitnessPal. Nothing relevant to mental health or mood.

**What Equi should borrow:** The photo snapping UX — specifically how it presents a photo result as a checklist to confirm rather than forcing the user to search manually.

---

### Nutrilio
**Market position:** Niche app, ~100K users, food-symptom correlation tracker.

**Core features:**
- Track food AND symptoms in one app
- Correlation view: "foods that preceded X symptom"
- Elimination diet support
- Not calorie-focused — symptom outcome–focused

**What works:**
- This is the only mainstream app that directly correlates food with symptoms
- Shows "after eating X, Y symptom was 40% more likely" — the Saunders 2022 EMA methodology in product form
- No calorie stigma — entirely symptom-oriented

**What fails:**
- Designed primarily for physical symptoms (IBS, migraines, allergies) — no bipolar-specific features
- UI is dated and cluttered
- Small food database
- No mood state framework (manic / depressive / stable)
- No medication awareness

**What Equi should borrow:** The food-symptom correlation view. This is the closest thing to what Equi's AI Wellness Report nutrition section should look like — but applied to mood variability rather than physical symptoms.

---

### Mealime / Whisk
**Market position:** Meal planning apps, not tracking apps.

**Core features (Mealime):**
- Personalized meal plan for the week
- Auto-generated shopping list
- Recipe library with dietary filters
- Cooking mode (step-by-step)

**What works:**
- Meal planning reduces the decision fatigue that is particularly taxing during depressive phases
- Shopping list generation means the friction of eating well starts at the store, not the meal

**What Equi should consider:** A "mood-supportive meal plan" feature for depressive phases — a gentle, 3-meal suggestion using BD-friendly foods (omega-3, folate, Mediterranean-style) that auto-generates a shopping list. Not mandatory — a "help me eat better this week" button.

---

## 2. Mental Health–Specific Nutrition Apps

Very few exist. The gap is clear.

**Bearable** — symptom and lifestyle tracker with food logging as one of many factors. Users can log foods and see correlations with mood/energy/sleep. Most similar to Equi's approach. Limitation: generic, not BD-specific, no clinical evidence grounding.

**MoodPath / MoodKit** — mood CBT apps with no nutrition component at all.

**Daylio** — mood journal with custom tags (users can create food tags) but no nutrition infrastructure.

**Cara Care** — gut-brain axis app for IBS/IBD, not mental health. But tracks fermented food intake and gut symptoms — closest thing to a gut-brain axis app for consumers. Excellent UX for tracking gut foods.

**MindDiet** — evidence-based MIND diet tracker (Mediterranean + DASH). Some overlap with BD dietary recommendations. Not BD-specific.

**The gap:** No app integrates bipolar cycle state + daily food quality + mood variability correlation + medication-diet interactions. Equi is the only one building this.

---

## 3. Common UX Patterns That Work (Across All Apps)

### Patterns to adopt

| Pattern | Why it works | How Equi applies it |
|---|---|---|
| Barcode scan | Near-zero friction for packaged foods | Auto-flag Nova 4 ultra-processed; no calorie data shown |
| Photo logging | Feels natural; faster than search | Pre-check anti-inflammatory categories; user confirms |
| Single daily score | Reduces cognitive load to one number | "Food Quality" 0–10 score from logged categories |
| Streak (non-punishing) | Motivates consistency | Show "logged X of last 7 days" — no red streaks |
| Pre-filled options for common meals | Reduces daily repetition | "Same as yesterday" option |
| Reminder + contextual timing | Catches logging at natural moments | Notify after meal times, not random times |
| Instant save / autosave | Removes commitment anxiety | Already implemented in Equi (1.2s debounce) |
| Progress vs. target rather than pass/fail | Less shame-inducing | "3 of 5 anti-inflammatory categories today" |

### Anti-patterns to avoid

| Anti-pattern | Why it fails | How it harms BD users specifically |
|---|---|---|
| Calorie counting | 80–90% 6-month dropout; causes obsessive loops | Co-occurring anxiety / disordered eating in BD; meds affect weight regardless |
| "Cheat day" language | Moralistic framing | Can worsen depressive guilt |
| Daily goal streaks with punishment | Shame when missed | Depressive phases make consistency impossible — punishing this is harmful |
| Detailed macro breakdown | Overwhelming | Cognitive load is higher in depressive phases |
| Weight as primary outcome | Wrong metric for BD | Mood stabilisers cause weight gain; tracking weight is demoralising |
| Rigid meal plans | Can't account for appetite disruption from meds | Quetiapine causes hunger spikes; lithium affects appetite |
| Hidden-sodium awareness lacking | Dangerous for lithium patients | Ultra-processed foods are the main hidden sodium source |

---

## 4. What Equi's Current Implementation Has

Current `you/nutrition.tsx`:

| Feature | Status |
|---|---|
| 11 food quality categories | ✅ Implemented |
| +/− serving counter per category | ✅ Implemented |
| Lithium-watch category (hidden for non-BD) | ✅ Implemented |
| Caffeine warning at 3+ cups (lithium users) | ✅ Implemented |
| Local-first save with Supabase sync | ✅ Implemented |
| Nutrition timestamp saved | ✅ Implemented (`nutritionTimestamp`) |
| Calendar integration | ✅ Via `nutritionCategories` in local store |
| Barcode scan | ❌ Not implemented |
| Photo logging | ❌ Not implemented |
| Voice entry | ❌ Not implemented |
| Eating window (first/last meal time) | ❌ Not implemented |
| Daily food quality score | ❌ Not calculated or shown |
| Mood correlation view | ❌ Not implemented |
| Phase-specific nudges | ❌ Not implemented |
| Gut health weekly summary | ❌ Not implemented |
| Hydration level (Low/Okay/Good) | ❌ Not implemented (only in design doc) |
| Quick "Eating well?" on Home screen | ❌ Not implemented |
| AI Wellness Report integration | ❌ Nutrition data not yet sent to AI prompt |
| Omega-3 specific sub-categories | ❌ Current `healthy_fats` is too broad |

---

## 5. Gap Analysis: Current Code vs. Design Doc

The design doc (`docs/design/features/nutrition.md`) specifies considerably more than what is implemented. The 11-category counter is Phase 1 — it works, saves, and syncs. What's missing:

**High impact, low complexity:**
1. **Daily food quality score** — compute from logged categories (`anti_inflammatory` + `whole_grains` + `lean_protein` + `healthy_fats` + `fermented` + `hydration` minus `ultra_processed` + `sugar_heavy` + `caffeine≥3` + `alcohol`) and show as a simple gauge on the nutrition screen. Already have all inputs.
2. **Hydration level selector** — replace raw counter with Low / Okay / Good (three-tap). More actionable; lithium interaction nudge triggers on "Low."
3. **Sodium warning** — if `ultra_processed ≥ 3` and user is on lithium, show "High-sodium day. Stay well-hydrated." (same as caffeine warning, already in code).
4. **AI report integration** — pass `nutritionCategories` into the Groq prompt alongside mood + sleep + activity data so it can surface food-mood correlations.

**Medium impact, medium complexity:**
5. **Eating window pickers** — add "First meal" and "Last meal" time pickers. Feeds into Social Rhythm score (first meal = one of the circadian anchors).
6. **Quick home-screen check-in** — "Eating well? [Yes] [So-so] [Poor]" row in DAILY CHECK-INS card. Maps to: Yes = logs a good day (auto-sets anti_inflammatory + whole_grains + lean_protein = 1 each), So-so = logs neutral, Poor = prompts "what was off?" quick-select.
7. **Phase-specific nudges** — one-line contextual card on Home based on current cycle state. Manic: caffeine reduction nudge. Depressive: omega-3 nudge. Stable: Mediterranean day suggestion.

**High impact, higher complexity:**
8. **Photo logging** — GPT-4o or Passio AI → pre-check anti-inflammatory categories for user to confirm.
9. **Barcode scan** → Open Food Facts → Nova classification → auto-check ultra-processed.
10. **Personal food-mood correlation** — 90-day view showing which food patterns preceded mood variability. Requires calendar data to be complete.

---

## 6. Prioritized Next Steps for Equi Nutrition Tab

### Tier 1 — Quick wins (no new screens, minimal code)

| Improvement | Files to touch | Effort |
|---|---|---|
| Daily food quality score (0–10) shown on nutrition screen | `you/nutrition.tsx` | Small |
| Sodium/hydration warning for lithium users (parity with caffeine warning) | `you/nutrition.tsx` | Tiny |
| Pass nutrition data into AI wellness report prompt | `you/ai-report.tsx`, AI prompt | Small |
| Hydration as Low/Okay/Good selector instead of raw counter | `you/nutrition.tsx` | Small |

### Tier 2 — Home screen integration

| Improvement | Files to touch | Effort |
|---|---|---|
| "Eating well?" quick check-in row on Home (3-tap) | `index.tsx`, `stores/today.ts` | Medium |
| Phase-specific dietary nudge card on Home | `index.tsx`, `stores/nutrition.ts` | Medium |

### Tier 3 — Deeper tracking

| Improvement | Files to touch | Effort |
|---|---|---|
| Eating window pickers → Social Rhythm integration | `you/nutrition.tsx`, `stores/socialRhythm.ts` | Medium |
| Barcode scan → Open Food Facts → Nova flag | `you/nutrition.tsx`, new `lib/openfoodfacts.ts` | Medium-Large |

### Tier 4 — Advanced (Phase 4/5 scope)

| Improvement | Files to touch | Effort |
|---|---|---|
| Photo logging via vision AI | `you/nutrition.tsx`, new `lib/food-vision.ts` | Large |
| 90-day food-mood correlation view | New screen, calendar store | Large |
| Relapse Signature Builder dietary patterns | `you/relapse-signature.tsx` | Medium |

---

## 7. The One Thing Every Other App Misses

Every app listed above measures food input. None of them measure the output that matters to this user population: **mood variability in the following 24–48 hours**.

Saunders 2022 showed that dietary effects on BD mood appear as reduced variability — not on the same day, but across consecutive days. A patient logging anti-inflammatory food on Monday doesn't feel better Monday. They have a smoother Tuesday and Wednesday.

The killer nutrition feature for Equi isn't a food diary. It's a **retrospective correlation surface** that tells the user: "On weeks when you had 4+ anti-inflammatory days, your mood variability was 35% lower than on weeks with fewer than 2." No other app can compute this because no other app has simultaneous daily mood EMA data at the granularity Equi collects.

This is the proof-of-concept that should drive Phase 4 nutrition development — not photo logging or barcodes (which are table-stakes from calorie apps), but the unique correlation output that is only possible because Equi collects mood and food together.

---

## Key References (App Research)

- MyFitnessPal: https://www.myfitnesspal.com
- Cronometer: https://cronometer.com
- Noom: https://www.noom.com
- Lifesum: https://lifesum.com
- Lose It!: https://www.loseit.com
- Nutrilio: https://nutrilio.app
- Cara Care: https://cara.care
- Open Food Facts (Nova classification): https://world.openfoodfacts.org/nova
- Passio AI SDK (on-device food recognition): https://www.passio.ai
- Saunders 2022 RCT (EMA + dietary intervention in BD): https://pmc.ncbi.nlm.nih.gov/articles/PMC9157563/
- Dropout in food tracking apps (80–90% at 6 months): Lieffers JR et al., *J Nutr Educ Behav* 2018
