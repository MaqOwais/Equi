# Safety Flags — Documented Risks and Required Mitigations

These are clinically documented risks identified in peer-reviewed research that require specific design responses in Equi. Each flag includes the source evidence, the risk mechanism, and the required mitigation.

---

## Flag 1: Mood Monitoring Can Worsen Mood Through Rumination

**Severity: High — affects core functionality**

**Evidence:** A 2025 *JMIR Mental Health* systematic review and meta-analysis (e79500) of 77 studies found that **19% of studies reported adverse events from mood monitoring.** Specific adverse effects documented:

- Mood worsening (0.02 proportion of studies)
- Increased burden or stress (0.04)
- Self-harm incidents (0.05)
- Hospitalization (0.06)

Qualitative findings from multiple studies explained the mechanism: participants reported that "repeatedly inputting that their mood was poor caused distress", "becoming fixated on their mood being low undermined expectations of recovery in a distressing way", and mood check-ins "caused some individuals to ruminate more than they otherwise would."

**Risk mechanism:** Mood monitoring reflects low states back at the user without intervention. When the app becomes a mirror for suffering without offering an exit, it compounds the suffering.

**Required mitigations:**

1. **Low mood safety circuit:** When mood ≤ 3/10 is logged for 2+ consecutive days, the app should not simply display the data. Instead, after logging, surface an optional coping prompt: *"That sounds heavy. Would a quick grounding exercise help right now?"* with a one-tap route to 54321 grounding or 1-min breathing.

2. **No compulsive re-checking design:** The mood log UI should not be designed to encourage multiple check-ins per day. One log per day is clinically sufficient. Remove any "update your mood" nudge within the same calendar day.

3. **Reframing language in AI Report:** Instead of *"Your mood was low 5 of 7 days this week"* (reflects suffering back), use *"Sleep improved on your better days — here's what seemed to help"* (directs attention to change-points and protective factors).

4. **Positive data alongside negative:** The AI Report should surface what went well alongside what was hard. Research (positive psychology pilot RCT, PMC6486459) shows that attention to protective factors — even small ones — reduces rumination.

**Source:** JMIR Mental Health 2025 meta-analysis (e79500) — https://mental.jmir.org/2025/1/e79500

---

## Flag 2: Positive Affect Activities May Induce Hypomania in Susceptible Individuals

**Severity: Medium — affects Activities screen**

**Evidence:** A 2019 pilot RCT (*JAMA Psychiatry*-adjacent, PMC6486459) of structured positive psychology interventions in bipolar patients found no group-level mania induction, but **two individual participants showed elevated mania scores** following activities designed to amplify positive affect. The authors explicitly wrote: *"It will be important to monitor the potential effect of positive emotion regulation interventions in inducing mania in a larger sample."*

**Risk mechanism:** Activities that amplify positive emotions (gratitude, compliment diaries, pride-focused exercises) may tip susceptible individuals into hypomanic states by further elevating already-elevated affect. The pathway is plausible — mania is characterized by an exaggerated positive affect state — and the individual-level risk signal has been documented.

**Affected activities in Equi:**
- Gratitude Jar
- Compliment Diary
- Proud Dandelion

**Required mitigations:**

1. **Cycle-phase gating:** When the user's logged cycle state is Manic or Mixed, these activities should be removed from "Recommended for You" and de-prioritized in the All tab. They should not appear in the Prescribed tab during manic phases. This is consistent with the adapted BA protocol's anti-hypomania guardrail requirement.

2. **In-activity awareness note:** A brief, non-alarmist line inside each activity description: *"If you notice your energy or thoughts speeding up unexpectedly during this, it's okay to stop and come back another time."*

3. **Psychiatrist prescription portal — phase caution field:** Add a "Phase restrictions" dropdown to the "Prescribe New Activity" modal in Screen 17: `Pause during manic phase / Pause during depressive phase / No restriction`. This gives clinicians control over when each prescribed activity applies.

**Source:** Positive Psychology Intervention for BD Depression pilot RCT, PMC 2019 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6486459/

---

## Flag 3: Behavioral Activation Without Anti-Hypomania Guardrails

**Severity: Medium — affects prescribed activities**

**Evidence:** The validated adapted BA protocol for bipolar disorder (published PMC9599144, 2022) contains a critical modification absent in standard BA: explicit activity discrimination between those that promote **sustainable** positive states vs. those that risk triggering hypomania. The protocol built in contracting about hypomania warning signs from session one.

Generic "do more activities" prescription — even by a psychiatrist — without this framework is clinically incomplete for bipolar patients.

**Risk mechanism:** Increased activity during a subclinical manic prodrome can accelerate the escalation to a full manic episode. The biological pathway involves circadian rhythm disruption and HPA axis sensitisation.

**Required mitigations:**

1. **Phase caution field in Psychiatrist Portal (Screen 17):** Psychiatrists prescribing activities should be able to tag each prescription with phase restrictions. This should be a visible prompt during prescription, not an afterthought.

2. **Home screen activity suggestions:** The "Suggested for you" activity cards on the Home screen (Screen 02) should factor in the user's current cycle state. During manic/hypomanic phase: surface only calming, rhythm-stabilizing activities (body scan, breathing, gentle walks). During depressive phase: surface activation-oriented activities (Proud Dandelion, Gratitude Jar, outdoor activity). During stable: full library available.

3. **Activity onboarding note (first use):** When a user first opens the Activities tab, a one-time educational card: *"Different activities work differently depending on where you are in your cycle. Equi automatically adjusts recommendations to fit your current state."*

**Source:** Adapted BA for Bipolar Depression, PMC 2022 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9599144/

---

## Flag 4: Clinical Framing of Grounding Techniques and Mindfulness

**Severity: Low — affects labelling, not safety directly**

**Evidence:** 54321 grounding and box breathing have no published randomized controlled trials specific to bipolar disorder. Evidence comes entirely from anxiety and PTSD literature. MBCT (mindfulness-based cognitive therapy) has moderate evidence for bipolar depression and anxiety but specifically does **not** reduce mania symptoms (meta-analysis, PubMed 32480120, 2020).

**Risk mechanism:** If users are led to believe these techniques are clinically validated bipolar treatments and they don't work during a manic episode, it may undermine trust in the app and delay appropriate help-seeking.

**Required mitigations:**

1. **Activity descriptions — honest framing:**
   - 54321 Grounding: *"Good for anxiety, panic, and racing thoughts. Evidence drawn from anxiety research."*
   - Box Breathing: *"Helps calm the nervous system. Most effective for anxious or overwhelmed states."*
   - Body scan / Moonlight Winddown: *"Best during stable or depressive phases. If you're currently feeling elevated or manic, this may not feel helpful."*

2. **Do not label these as equivalent to evidence-based bipolar therapies.** Reserve higher-confidence language (e.g., "evidence-backed for bipolar") for features that have bipolar-specific RCT evidence: psychoeducation workbook, social rhythm tracking, sleep monitoring.

**Source:** MBCT for Bipolar meta-analysis, PubMed 2020 — https://pubmed.ncbi.nlm.nih.gov/32480120/

---

## Flag 5: Data Privacy and Stigma Risk

**Severity: High — affects trust and user safety**

**Evidence:** A 2021 *Journal of Affective Disorders* international survey (919 participants) found that 40.9% of reviewed apps with privacy policies disclosed user personal information to third parties. In a population dealing with stigma and potential employment or insurance consequences, this is a significant safety concern.

Research specifically found that bipolar patients make complex, deliberate decisions about self-disclosure (PMC8034868, 2021) and that a bipolar diagnosis was associated with being rated as "more dangerous" in experimental social settings. The disclosure risk is not theoretical — it has documented real-world consequences for users.

**Required mitigations:**

1. **Zero data retention on AI API calls:** Maintained — Groq's zero-retention API is the right choice. This must remain a non-negotiable technical requirement.

2. **Granular sharing permissions (Screen 16):** Already designed. Medication data, in particular, must be the most strictly controlled field — it should default to not shared and require explicit per-person activation.

3. **Privacy policy on first launch:** Plain-language, in-app summary of what is stored, where, and who can access it. Not a link to a legal document — an actual human-readable explanation.

4. **No third-party analytics SDKs:** Tools like Firebase Analytics, Facebook SDK, or similar that harvest behavioural data are incompatible with a mental health app for this population. Any analytics should be self-hosted or privacy-preserving (e.g., Plausible, PostHog self-hosted).

5. **Data deletion on request:** Already in design principles. Must be a genuine, immediate deletion — not a 30-day soft deletion.

**Source:** Privacy and Self-Disclosure in BD, PMC 2021 — https://pmc.ncbi.nlm.nih.gov/articles/PMC8034868/

---

## Summary Table

| Flag | Severity | Mitigation Status |
|---|---|---|
| Mood monitoring → rumination | High | Needs implementation: low-mood safety circuit, no multi-check-in design |
| Positive activities → hypomania induction | Medium | Needs implementation: cycle-phase gating, phase caution field in portal |
| Behavioral activation without guardrails | Medium | Needs implementation: phase-aware Home suggestions, portal field |
| Clinical framing of grounding / mindfulness | Low | Needs copy changes in activity descriptions |
| Data privacy and stigma risk | High | Partially addressed: needs privacy policy UX, no third-party analytics |
