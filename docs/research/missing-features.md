# Evidence-Backed Features — Implementation Status

These features were identified through clinical research review as essential for bipolar monitoring. All four original missing features have been implemented. One additional feature (substance use monitoring) was added following the MinDag 2025 and Lindner Center research review.

---

## Status Summary

| Feature | Status |
|---|---|
| Social Rhythm Monitoring | ✅ Implemented — Screen 03 (Journal) + Screen 09 (AI Report) |
| Medication Adherence Tracking | ✅ Implemented — Screen 02 (Home) + Screen 19 |
| Personalized Relapse Signature Builder | ✅ Implemented — Screen 18, linked from Screen 13 |
| Life Events / Stressor Logging | ✅ Implemented — Screen 03 (Journal block), Screen 04 (wave markers) |
| Substance Use Monitoring | ✅ Added — Screen 02 (Home daily check-in) |

---

## 1. Social Rhythm Monitoring

**Evidence strength: Very Strong — landmark RCTs**

**What it is:** Interpersonal and Social Rhythm Therapy (IPSRT), developed by Ellen Frank at the University of Pittsburgh, has landmark RCT evidence published in *JAMA Psychiatry* and across a 2-year controlled trial. The core finding: **stabilising the timing of daily social routines directly reduces relapse in bipolar disorder.** Social rhythm disruption — caused by late nights, travel, life events, shift work, relationship breakdown — is a documented, direct trigger for both manic and depressive episodes.

**The five IPSRT daily rhythm anchors:**
1. Wake time
2. First contact with another person (in-person, phone, or text)
3. Start of work or daily activity
4. Dinner time
5. Bedtime (lights out)

Research shows that **irregularity in these five anchors predicts episode onset.** The app currently tracks sleep (one of the five) but misses the other four.

**What to add:**
- A daily "Social Rhythm" card in the Journal (Screen 03) or a dedicated section in the Routine Builder (Screen 14)
- Five time-stamp fields, completed each day
- A "Rhythm Consistency Score" visible in the AI Wellness Report (Screen 09) — flagging when irregularity is increasing
- Stressor logging linked to specific disruptions ("travel", "late social event", "work change") so the AI can correlate disruptions with upcoming mood changes

**Where in the app:** Screen 03 (Journal block type), Screen 09 (AI Report section), Screen 14 (Routine Builder preset)

### Key Citations
- IPSRT Efficacy Controlled Trial, *Annals of General Psychiatry*, 2020 — https://annals-general-psychiatry.biomedcentral.com/articles/10.1186/s12991-020-00266-7
- IPSRT 2-year Outcomes BD I, *JAMA Psychiatry* — https://jamanetwork.com/journals/jamapsychiatry/fullarticle/1108410
- Circadian Rhythms and Mood Episode Relapse, *Translational Psychiatry*, 2021 — https://www.nature.com/articles/s41398-021-01652-9

---

## 2. Medication Adherence Tracking

**Evidence strength: Very Strong — critical unmet need**

**What it is:** A review in *Therapeutic Advances in Psychopharmacology* (PMC6278745, 2018) found that **nearly 1 in 2 patients prescribed lithium or anticonvulsants for bipolar disorder are non-adherent.** Non-adherence is associated with significantly increased relapse, hospitalization, and suicide attempt risk.

The CANMAT 2023 Guidelines identify medication adherence as a primary treatment target. Yet only **1 in 3** bipolar monitoring apps include medication tracking alongside mood and sleep — this is one of the most-cited gaps in bipolar app reviews.

**What to add:**
- A daily medication check-in on the Home screen (Screen 02) or Journal (Screen 03): one-tap "Taken / Skipped / Partial"
- Optional side-effect log when skipped: reason (forgot, side effect, felt fine, ran out)
- Side-effect tracker: fatigue, weight changes, tremor, cognitive fog — mapped by day
- Medication adherence data feeds into the AI Wellness Report — correlating adherence patterns with mood episode onset
- Medication field in the Psychiatrist Portal (Screen 17) — optional patient-consented view

**Privacy note:** Medication data is especially sensitive. It should be the most granularly controlled data type in the sharing permissions (Screen 16).

### Key Citations
- Medication Nonadherence in BD, PMC 2018 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6278745/
- CANMAT 2023 Update — https://psychiatryonline.org/doi/full/10.1176/appi.focus.20230009

---

## 3. Personalized Relapse Signature Builder

**Evidence strength: Strong — Cochrane-reviewed**

**What it is:** Research (Cochrane review; *Advances in Psychiatric Treatment*) shows that prodromal symptoms occur **2–4 weeks before full recurrence** in most bipolar patients. Critically, **each person's warning signs are idiosyncratic** — what predicts a manic episode for one person may differ entirely from another.

Generic checklists (like the symptom checklist in Screen 04) list common symptoms but do not help users identify their own specific, personalized pattern. Studies show that training patients to recognise their own early warning signs reduces recurrence and hospitalizations.

A Cochrane review confirmed that early warning sign interventions reduce the number of manic episodes and hospitalizations when patients are trained to recognise their own unique prodromal pattern rather than a generic list.

**What to add:**
A one-time guided setup flow (accessible from Profile / You, Screen 13) where the user builds their personalised relapse signatures:

**Manic Relapse Signature:**
- "What are the first 1–3 things that happen when you start heading towards a manic episode?" (free text + common examples)
- "How many days before a full episode do you usually notice these?" (slider: 1–14 days)
- "Who else notices first — you or people around you?" (self / others / both)
- Priority ranking of their top warning signs

**Depressive Relapse Signature:**
- Same structure for depressive episode onset

**AI integration:** The cycle tracker (Screen 04) and journal sentiment analysis (Screen 09) should cross-reference against the user's personalised signatures. When pattern match detected → early warning card in AI Report + optional push notification.

**Where in the app:** New sub-screen accessible from Profile / You (Screen 13), referenced in the Bipolar Workbook Chapter 3 (Warning Signs), surfaced in AI Report (Screen 09)

### Key Citations
- Early Warning Signs Checklists, *Journal of Affective Disorders*, 2011 — https://www.sciencedirect.com/science/article/abs/pii/S0165032711001935
- Minimum Feature Set for BD Apps, PMC 2023 — https://pmc.ncbi.nlm.nih.gov/articles/PMC10290972/
- PolarUs App Protocol, *JMIR Research Protocols*, 2022 — https://www.researchprotocols.org/2022/8/e36213/

---

## 4. Life Events / Stressor Logging

**Evidence strength: Moderate–Strong**

**What it is:** The Malkoff-Schwartz et al. model (published in *American Journal of Psychiatry*) and IPSRT both document that **life events that disrupt social rhythms are direct episode triggers.** Examples: grief, relationship breakdown, travel across time zones, job loss, promotion, birth of a child, change in living situation.

Both positive AND negative life events can trigger episodes — especially manic episodes — by disrupting circadian rhythms and social routines. This makes a stressor log clinically distinct from a mood journal: it captures the *context* that explains why sleep or mood shifted.

**What to add:**
A life event block type in the Journal's '/' block menu (Screen 03):

```
📌  Life Event
    ○ Stressful event
    ○ Positive but disruptive
    ○ Loss / grief
    ○ Travel / time zone change
    ○ Routine change
    ○ Relationship change
    ○ Work change
    [Short note — optional]
```

Life events appear as markers on the 90-day wave graph (Screen 04) and in the AI Wellness Report (Screen 09), allowing correlation analysis: *"You logged a job change on Feb 15. Sleep irregularity increased the following week. Your last manic episode began 8 days after that."*

**Where in the app:** Screen 03 (Journal block type), Screen 04 (marker on 90-day wave), Screen 09 (AI Report correlation section)

### Key Citations
- IPSRT and Social Rhythm Disruption by Life Events — https://annals-general-psychiatry.biomedcentral.com/articles/10.1186/s12991-020-00266-7
- Psychological and Behavioural Interventions Targeting Sleep and Circadian Rhythms in BD, *Neuroscience & Biobehavioral Reviews*, 2022 — https://www.sciencedirect.com/science/article/abs/pii/S0149763421005509

---

## 5. Substance Use Monitoring *(Added post-research review)*

**Evidence strength: Moderate–Strong**

**What it is:** The MinDag 2025 study (Oslo) found that cannabis is the most common comorbid substance used by people with bipolar disorder, with alcohol a close second. The Lindner Center of HOPE clinical protocols flag alcohol and cannabis as the two substances most directly documented to destabilise mood cycles — degrading sleep architecture (a primary episode trigger), interacting with lithium and anticonvulsant metabolism, and amplifying both manic and depressive episodes.

Crucially, this is not a morality intervention. The framing must be non-judgmental — tracking without shame, pattern detection without blame.

**What was added:**
- A simple daily check-in on the Home screen (Screen 02): two taps — alcohol (yes/no) and cannabis (yes/no)
- No quantity tracking in the initial implementation — just presence/absence
- Substance use patterns feed into the AI Wellness Report alongside sleep and mood
- Can be shared with psychiatrist with explicit consent (same privacy model as medication data)

**Where in the app:** Screen 02 (Home daily check-in card), Screen 09 (AI Report correlation section)

### Key Citations
- MinDag 2025 — Oslo outpatient bipolar cohort, substance comorbidity findings
- Lindner Center of HOPE clinical protocols — substance use and mood stabiliser interactions

---

## Implementation Priority *(Updated — all core features implemented)*

| Feature | Priority | Complexity | Status |
|---|---|---|---|
| Medication adherence check-in | **Must have** | Low (daily tap) | ✅ Done |
| Life events block type in Journal | **Must have** | Low (new block) | ✅ Done |
| Social Rhythm 5-anchor card | **Should have** | Medium | ✅ Done |
| Personalized relapse signature builder | **Should have** | Medium | ✅ Done |
| Substance use daily check-in | **Must have** | Low (two taps) | ✅ Done |
| Social rhythm consistency in AI Report | **Nice to have** | High (AI integration) | Phase 3 |
| Life event markers on 90-day wave | **Nice to have** | Medium | Phase 3 |
