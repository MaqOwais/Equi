# Feature: Diet & Nutrition

Lightweight daily food quality tracking tied directly to mood variability analysis. Not a calorie counter — tracks anti-inflammatory vs. destabilizing food patterns, eating window timing, and medication-diet interactions. Designed around what the research actually shows moves the needle in bipolar disorder.

← [Design index](../wireframes.md)

Research basis → [docs/research/diet-nutrition.md](../../research/diet-nutrition.md)

---

## Core Design Principle

The Saunders et al. 2022 RCT (the only dietary intervention trial in BD using ecological momentary assessment) proved that diet reduces mood **variability** — not average scores. Clinical scales miss this. Equi's daily EMA-style tracking is exactly the right methodology to detect it. No existing mental health app captures this connection.

This feature is never about weight, calories, or perfection. It's about surfacing personal patterns the user might not see — that a caffeine-heavy Tuesday tends to precede a worse Wednesday, or that depressive stretches cluster after low-omega-3 weeks.

---

## 1. Daily Diet Check-in (Home screen — optional)

Added as a third row in the existing DAILY CHECK-INS card on Home. Appears below substance check-ins. Completely optional — if not tapped, nothing is logged for the day.

```
┌─────────────────────────────┐
│  Good morning, Owais  🌅    │
│  Sunday, March 1            │
│                             │
│  ┌───────────────────────┐  │
│  │  TODAY                │  │
│  │  ● Stable · Day 4     │  │
│  │  How are you feeling? │  │
│  │  😔  😐  🙂  😊  ⚡  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  DAILY CHECK-INS      │  │
│  │                       │  │
│  │  💊 Meds  [Taken][Skip]│ │
│  │  ─────────────────    │  │
│  │  🍷 Alcohol  [No][Yes]│  │
│  │  🌿 Cannabis [No][Yes]│  │
│  │  ─────────────────    │  │
│  │  🥗 Eating well?      │  │  ← NEW (optional row)
│  │  [Yes] [So-so] [Poor] │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

**Tapping "So-so" or "Poor"** expands an optional quick-select:
```
│  What was off today?        │
│  (tap all that apply)       │
│                             │
│  ☑ High sugar / junk        │
│  ☐ A lot of caffeine        │
│  ☐ Very salty food          │
│  ☐ Skipped meals            │
│  ☐ No omega-3 or greens     │
│                             │
│  [ Save ]   [ Skip ]        │
```

**Tapping "Yes"** logs a good nutrition day instantly — no extra steps.

---

## 2. Nutrition Detail Screen

Accessible from:
- Explore tab (alongside Activities, Psychiatrists, Community)
- Journal block menu (`/nutrition` block)
- The "Eating well?" check-in row (deep dive link)

```
┌─────────────────────────────┐
│  ← Today's Nutrition        │
│  Sunday, March 1            │
│                             │
│  Not a diet app.            │
│  Just patterns that affect  │
│  your mood.                 │
│                             │
│  ─────────────────────────  │
│  ANTI-INFLAMMATORY          │
│  Tap what you had today     │
│                             │
│  ┌───────────────────────┐  │
│  │  ☑ 🐟 Oily fish /     │  │  ← omega-3 (salmon, sardines,
│  │       walnuts         │  │       mackerel, flaxseed)
│  │  ☐ 🥬 Leafy greens    │  │  ← folate, magnesium
│  │  ☐ 🫐 Berries /       │  │  ← antioxidants
│  │       colourful veg   │  │
│  │  ☐ 🥑 Healthy fats    │  │  ← avocado, olive oil
│  │  ☐ 🌱 Fermented food  │  │  ← yogurt, kimchi, kefir
│  │  ☐ 🌾 Legumes / whole │  │  ← fibre → gut microbiome
│  │       grains          │  │
│  └───────────────────────┘  │
│                             │
│  ─────────────────────────  │
│  MAY DESTABILIZE            │
│  Tap what you had today     │
│                             │
│  ┌───────────────────────┐  │
│  │  ☐ ☕ Caffeine (3+    │  │  ← lowers lithium levels;
│  │       cups)           │  │       disrupts sleep
│  │  ☐ 🍭 High sugar /   │  │  ← glucose spikes → mood
│  │       sweets          │  │       instability
│  │  ☐ 🍔 Ultra-processed │  │  ← drives IL-6/CRP
│  │  ☐ 🧂 Very salty food │  │  ← lithium interaction
│  │  ☐ 🍺 Alcohol         │  │  ← already tracked in
│  │       (heavy)         │  │       check-ins
│  └───────────────────────┘  │
│                             │
│  ─────────────────────────  │
│  EATING WINDOW              │
│                             │
│  First meal today           │
│  ┌──────────────────────┐   │
│  │  8:30 AM          ▼  │   │  ← feeds into Social Rhythm
│  └──────────────────────┘   │
│                             │
│  Last meal today            │
│  ┌──────────────────────┐   │
│  │  7:00 PM          ▼  │   │
│  └──────────────────────┘   │
│                             │
│  Eating window: 10.5 hours  │  ← calculated
│                             │
│  ─────────────────────────  │
│  HYDRATION                  │
│  (important if on lithium)  │
│                             │
│  💧 Water intake today      │
│  [Low]  [Okay]  [Good]      │
│                             │
│  ─────────────────────────  │
│  GUT HEALTH THIS WEEK       │
│  ┌───────────────────────┐  │
│  │  🌱 Fermented: 3 days │  │
│  │  🌾 High fibre: 5 days│  │
│  │  Overall: Good 🟢     │  │
│  └───────────────────────┘  │
│                             │
│  [ Save today's nutrition ] │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

---

## 3. AI Wellness Report Integration

The weekly report gains a **NUTRITION & MOOD** section between Substances and Life Events:

```
│  NUTRITION & MOOD           │
│  ┌───────────────────────┐  │
│  │  Anti-inflammatory    │  │
│  │  days: 4 / 7   57%   │  │
│  │  ████████░░░░         │  │
│  │                       │  │
│  │  💡 Your 3 depressive │  │
│  │  days this week all   │  │
│  │  followed days with   │  │
│  │  high sugar and low   │  │
│  │  omega-3 intake       │  │
│  │                       │  │
│  │  ⚠️ 4 days with 3+   │  │
│  │  cups caffeine — all  │  │
│  │  preceded worse sleep │  │
│  │  quality              │  │
│  └───────────────────────┘  │
```

The AI correlates nutrition entries against mood variability (not average scores) — matching the Saunders 2022 RCT methodology that proved dietary effects are visible in variability data before they show up in clinical scale averages.

---

## 4. Phase-Specific Dietary Nudges

When a user logs their cycle state, contextual food guidance surfaces on the Home screen as a small card below activity suggestions. Not prescriptive — brief and optional.

| Cycle State | Nudge |
|---|---|
| **Manic / Mixed** | "Reducing caffeine today can help protect your sleep. Your last 3 manic periods were preceded by 3+ cups/day." |
| **Depressive** | "Omega-3 foods (salmon, walnuts) are linked to reduced mood variability in clinical research. Even one serving matters." |
| **Stable** | "A Mediterranean-style day today (fish, leafy greens, olive oil, legumes) supports your gut microbiome — which talks directly to your mood system." |

Nudges only appear once per phase, not daily. They are dismissible. They never appear during a crisis state.

---

## 5. Medication-Diet Safety Alerts (Lithium patients)

If the patient has indicated they take lithium (set in Profile → My diagnosis info / medication type), certain food logs trigger a gentle contextual note — never a red alert, never alarming:

| Log Entry | Note Shown |
|---|---|
| 🧂 Very salty food | *"High-sodium days can shift lithium levels. Staying well-hydrated helps balance this."* |
| ☕ 3+ cups caffeine | *"Caffeine acts as a diuretic and can gradually lower lithium blood levels over time. Worth mentioning to your psychiatrist."* |
| 💧 Low hydration | *"Low hydration can concentrate lithium. Try to drink more today."* |

Notes appear once at the bottom of the Home screen. They never block interaction or repeat the same day.

---

## 6. Eating Window → Social Rhythm Integration

The Social Rhythm tracker currently captures **Dinner** as one of 5 anchors. Extend it with:

- **First meal time** (added to the Social Rhythm entry alongside Wake, First Contact, Work Start, Dinner, Bedtime)
- **Eating window** (calculated: last meal minus first meal) shown in the weekly Social Rhythm consistency score

This directly reflects the circadian research — the ISBD Task Force found circadian disruption in 10–80% of BD patients even during euthymic states, and meal timing is one of the most modifiable circadian anchors alongside sleep.

---

## 7. Nutrition History in Relapse Signatures

Users can add dietary patterns as personal relapse warning signs in the Relapse Signature Builder:

**Common examples to suggest:**
- "I stop eating regularly"
- "I start relying on caffeine to get through the day"
- "I stop cooking and eat mostly junk food"
- "I lose my appetite entirely"

These are added to the Relapse Signature "Common Examples" tap-to-add list alongside the existing signs (irritability, less need for sleep, etc.).

---

## Build Phases

**Phase 2 (current):**
- "Eating well?" row in DAILY CHECK-INS on Home (3-option tap + optional expand)
- Full Nutrition Detail screen
- Eating window capture feeding into Social Rhythm
- AI Wellness Report nutrition-mood correlation section

**Phase 3:**
- Lithium-diet safety nudges (requires medication type flag in Profile)
- Phase-specific dietary nudge cards on Home
- Gut health weekly summary

**Phase 4:**
- 90-day personal food-mood correlation visualisation
- Nutrition entries linkable to Relapse Signature Builder
- Dietary pattern as early warning signal in AI monitoring

---

---

## Input Methods — Beyond Manual Entry

The research on food tracking dropout is stark: **80–90% of calorie-tracking app users quit within 6 months**. The primary reasons are too much effort (38%), forgetting (42%), and negative emotional experience (29%). Equi's food tracking must avoid all three failure modes.

**Key insight:** Because Equi does NOT track calories or macros — only food *quality categories* (11 items total) — photo and voice recognition are far more tractable than in calorie apps. We only need to answer "was this oily fish or not?" not "how many grams of omega-3?"

### Method 1 — Photo Snap (primary non-manual method)

User photographs a meal. Vision AI identifies quality categories and pre-checks the relevant items on the anti-inflammatory / destabilizing checklist. User confirms or adjusts — no lookup, no typing.

```
┌─────────────────────────────┐
│  📷 Photo logged            │
│                             │
│  Looks like:                │
│  ✅ 🐟 Oily fish / walnuts  │  ← AI pre-checked
│  ✅ 🥬 Leafy greens         │  ← AI pre-checked
│  ☐  🌱 Fermented food       │
│                             │
│  Anything destabilizing?    │
│  ☐  ☕ Caffeine (3+ cups)   │
│                             │
│  [ Looks right — Save ]     │
│  [ Edit ]                   │
└─────────────────────────────┘
```

**Implementation:** Use GPT-4o vision API (cloud) or Passio AI SDK (on-device, ~500ms). Since we map to only 11 quality categories rather than 600+ nutrients, accuracy is significantly higher than calorie apps — identifying "oily fish" or "leafy greens" from a photo is a much simpler task than estimating 42g protein.

**Accuracy advantage:** Real-world food photo accuracy for calorie estimation is ~60–75%. For binary quality-category classification ("is this an oily fish dish?"), accuracy is substantially higher (>85%) and confirmation UX catches the rest.

### Method 2 — Barcode Scan (packaged food)

For packaged foods, scan barcode → Open Food Facts API lookup → **Nova classification** automatically flags ultra-processed (Nova 4) foods. No calorie data shown.

```
┌─────────────────────────────┐
│  📦 Scanned: Oreo Cookies   │
│                             │
│  Ultra-processed food       │
│  (Nova 4)                   │
│                             │
│  ✅ 🍔 Ultra-processed      │  ← auto-checked
│                             │
│  [ Add to today ] [ Skip ]  │
└─────────────────────────────┘
```

**Why Open Food Facts:** Free, open-source, 3M+ products globally, already contains Nova classification for ~2M products. No API cost. Fresh/whole foods won't have barcodes — this method is only for packaged items.

### Method 3 — Voice / Conversational Entry

User says or types a natural description: "I had salmon with broccoli and olive oil." The LLM (same Llama 3.1 70B pipeline used for AI Wellness Report) maps this to quality categories and presents pre-checked items for confirmation.

Since we map to 11 categories, an LLM can do this with near-perfect accuracy — far more reliably than converting free text to nutritional values.

```
User: "I had salmon with broccoli and some olive oil"
         ↓
🐟 Oily fish ✅   🥬 Leafy greens ✅   🥑 Healthy fats ✅
         ↓
[ Confirm — Save ]  [ Edit ]
```

### Method 4 — Apple Health / HealthKit Passthrough (iOS)

If the user already uses another food app (Cronometer, MyFitnessPal, Lifesum), allow HealthKit data passthrough to auto-populate:

- **Eating window:** first/last meal timestamp from HealthKit nutrition logs → auto-fills eating window pickers. No duplicate logging.
- **Dietary energy (proxy):** Not shown as a number — only used as a signal for whether a full meal was logged (to infer a "nutrition logged" day for the weekly streak).

No manual entry required if the user already tracks elsewhere.

---

### Input Method by Friction Level

| Method | Friction | Best for |
|---|---|---|
| One-tap "Eating well?" [Yes/So-so/Poor] | Lowest (3 options) | Daily minimum — most days |
| Photo snap | Low (take photo → confirm) | Meals at home or restaurants |
| Voice entry | Low (say what you ate → confirm) | Hands-free, on the go |
| Barcode scan | Low (scan → confirm) | Packaged / branded foods |
| Manual checklist | Medium (tap items) | When no photo is convenient |
| HealthKit passthrough | Zero (automatic) | Users already tracking elsewhere |

**The 3-option "Eating well?" row remains the daily baseline.** Photo/voice/barcode are enhancements for users who want deeper correlation data.

---

## What This Feature Is Not

- Not a calorie counter. No macros, no grams, no numbers.
- Not a weight tracker (weight is tracked separately in the metabolic context of medication side effects, if at all).
- Not prescriptive. No "you should eat X." Only personal pattern reflection.
- Not daily-mandatory. The 4-tap daily minimum does not change. Nutrition tracking is always optional depth.
