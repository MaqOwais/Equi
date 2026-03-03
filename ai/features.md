# AI Features — How AI is Applied in Equi

Every AI-powered capability in the app, what it analyses, what it produces, and which model handles it.

---

## 1. AI Wellness Report

**Screen:** 09 — AI Wellness Report

The weekly and monthly wellness report is the primary AI output visible to users and shareable with psychiatrists.

**What it analyses:**
- Sleep score trends (from Apple HealthKit / Google Fit)
- Cycle state history (mania / depressive / mixed / stable)
- Journal entry sentiment and emotional tone
- Activity completion rates and phase alignment
- Heart rate and HRV trends from wearables
- Medication adherence log
- Social rhythm consistency score (IPSRT anchor regularity)
- Life events logged in the reporting period

**What it produces:**
- Narrative summary of the reporting period
- Correlation findings: *"Sleep dropped below 5h three nights before your last depressive entry"*
- Social rhythm irregularity flags
- Medication adherence patterns and their temporal relationship to mood shifts
- Life event impact analysis
- Early warning section (cross-referenced against Relapse Signature)
- Exportable PDF for psychiatrist appointments

**Model:** Llama 3.1 70B via Groq (zero retention)
**Fallback:** BioMistral 7B via Ollama (self-hosted)

**Data flow:**

```
User data (Supabase) → Aggregation layer (Edge Function)
  → Structured context payload (no raw journal text unless opted in)
  → Groq API (Llama 3.1 70B) → Report JSON
  → Rendered in-app + PDF export
```

**Privacy note:** Raw journal text is not included in the AI payload by default. The aggregation layer converts journal entries into anonymised sentiment scores and keyword tags before sending. Users can opt in to include full journal content for richer analysis — this is a one-time, reversible consent.

---

## 2. Early Warning Detection

**Screen:** 09 — AI Wellness Report (Early Warning section), Push notifications

The AI cross-references live user data against their personal Relapse Signature (built in Screen 18) and established clinical prodromal markers.

**Inputs:**
- Relapse Signature: user's own documented early warning signs (e.g. "I stop texting friends", "I start waking at 4am")
- Sleep trend changes
- Cycle state shifts
- Journal tone drift
- Social rhythm irregularity
- Life events logged

**Output:**
- In-report early warning flag with matched evidence
- Optional push notification: *"Your sleep pattern this week matches what you described as an early manic sign. Review your Relapse Signature."*

**Model:** Llama 3.1 70B
**Pattern matching logic:** Prompt includes the user's Relapse Signature verbatim alongside recent aggregated data. The model identifies which signatures are currently active or trending.

---

## 3. Community Post Moderation

**Screen:** 07 — Community

Every community post passes through a two-stage AI moderation pipeline before going live. The AI **flags, never silently removes**. Users always see what was flagged and have a clear path to edit or escalate to a human moderator.

**Stage 1 — Toxicity Scoring:**
- Perspective API scores for: toxicity, severe toxicity, identity attack, insult, threat, sexually explicit
- Detoxify (self-hosted) scores as a secondary classifier
- If either score exceeds threshold → moves to Stage 2

**Stage 2 — Contextual Moderation:**
- Llama 3.2 3B evaluates flagged post in context of Equi's community guidelines
- Determines: clear violation / borderline / false positive
- Generates a plain-language explanation of the flag for the user

**Outcomes:**
- **Clear violation:** post held, user shown specific guideline + edit option + human escalation path
- **Borderline:** post held, user shown soft flag + option to confirm and publish or edit
- **False positive:** post published, flag discarded

**No silent removal.** Users are always informed and always have agency.

**Data flow:**

```
Post text → Perspective API (toxicity scores)
           → Detoxify (secondary scores)
  If flagged → Groq API (Llama 3.2 3B) → moderation decision + reason
  → User notification with explanation
  → Human moderator queue (for escalations)
```

---

## 4. Social Rhythm Consistency Scoring

**Screen:** 03 — Journal (Social Rhythm card), 09 — AI Wellness Report

Based on IPSRT (Interpersonal and Social Rhythm Therapy). Users log five daily anchor times: wake, first social contact, work start, dinner, bedtime.

**Scoring logic (rule-based, no LLM required):**
- Calculates standard deviation of each anchor across the past 7 days
- Weights each anchor by clinical importance (wake time and sleep time carry highest weight)
- Produces a 0–100 Rhythm Consistency Score
- Flags when score drops below threshold or trends downward over multiple weeks

**AI role:** The Rhythm Consistency Score is included as a structured field in the Wellness Report payload. Llama 3.1 70B interprets the score in context with other data and surfaces narrative insights: *"Your rhythm score dropped from 78 to 42 this week, coinciding with the travel event you logged on Thursday."*

---

## 5. Life Events Correlation

**Screen:** 03 — Journal (Life Event block), 04 — Cycle Tracker (wave markers), 09 — AI Wellness Report

Life events (travel, relationship changes, work changes, grief, positive disruptions) are logged as a dedicated block type in the Journal and appear as markers on the 90-day wave graph.

**AI role:** Llama 3.1 70B includes life event data in the Wellness Report context and surfaces temporal correlations: *"You logged a job change on Feb 15. Sleep irregularity increased the following week. Your last manic episode began 8 days after that."*

The model does not make causal claims — it surfaces correlations for the user and psychiatrist to interpret.

---

## 6. Journal Sentiment Analysis

**Screen:** 03 — Journal, 09 — AI Wellness Report

Journal entries are processed through a sentiment pipeline before being included in the Wellness Report.

**Pipeline:**
1. Entry text → tokenised and scored for emotional valence (positive / neutral / negative), arousal, and dominant emotion category
2. Output: per-entry sentiment score + keyword tags
3. Aggregated across reporting period into a trend

**What is sent to the LLM:** Aggregated sentiment trends and keyword frequency — not raw text (unless user opts in).

**Output in report:** Journal tone section describing emotional arc of the reporting period and flagging notable shifts.

---

## 7. Medication Adherence Analytics

**Screen:** 19 — Medication Adherence, 09 — AI Wellness Report

Users log daily: Taken / Skipped / Partial. Optional side effect and reason fields on missed doses.

**AI role:**
- Adherence rate is calculated rule-based (no LLM)
- The Wellness Report includes adherence trend as a structured input
- Llama 3.1 70B surfaces correlations between adherence gaps and mood episode onset in the report narrative
- Side effect logs are included as structured tags (not free text) to protect privacy

**Sharing:** Medication adherence data is shared with the psychiatrist only with explicit, per-person, revocable consent. This is the most strictly controlled data field in the app.
