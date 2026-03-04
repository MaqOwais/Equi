# Evidence Review — Equi Feature by Feature

> Sources: JAMA Psychiatry, Lancet Psychiatry, Bipolar Disorders journal, Journal of Affective Disorders (JAD), American Journal of Psychiatry (AJP), JMIR Mental Health, BMC Psychiatry, and related top-tier journals.

---

## 1. Mood & Cycle Tracking

**Verdict: Well-supported, with important adverse-effect caveats.**

Digital mood and cycle monitoring has a substantial and growing evidence base. The International Society for Bipolar Disorders (ISBD) Big Data Task Force published a systematic review and meta-analysis in *Bipolar Disorders* (September 2022; 24(6):580–614) concluding that digital tools show "promising results to augment early detection of symptoms and enhance BD treatment."

A systematic review by Ortiz et al. — *"Apps and gaps in bipolar disorder: a systematic review on electronic monitoring for episode prediction"* — published in *Journal of Affective Disorders* (December 2021; 295:1190–1200) included 62 studies with 2,325 BD patients and found that digital monitoring can meaningfully predict mood episodes.

The MoodSensing study (*Journal of Psychiatric Research*, 2024) applied deep learning to digital phenotyping data from bipolar patients, achieving a mean absolute error of just 0.84 on the Hamilton Depression Rating Scale — demonstrating that passive smartphone data can forecast clinical scores with clinically meaningful precision.

A scoping review in *JMIR Mental Health* (de Azevedo Cardoso et al., 2024) confirmed that digital phenotyping using portable devices can identify BD types, mood states, and symptom trajectories, but noted that most commercially available apps lack academic verification and clinical validation.

**Critical gap identified:** A systematic analysis of 100 top-returned bipolar disorder apps found that only one app's efficacy was supported in a peer-reviewed study, and 32 apps lacked any privacy policy (*International Journal of Bipolar Disorders*, 2020).

### Key Citations
- ISBD Meta-analysis, *Bipolar Disorders*, 2022 — https://onlinelibrary.wiley.com/doi/10.1111/bdi.13216
- Ortiz et al., *Journal of Affective Disorders*, 2021 — https://www.sciencedirect.com/science/article/abs/pii/S0165032721008570
- MoodSensing app, *Journal of Psychiatric Research*, 2024 — https://pubmed.ncbi.nlm.nih.gov/38401488/

---

## 2. Sleep Monitoring

**Verdict: Very strong — among the most important features in any bipolar app.**

Sleep disruption is one of the most robustly evidenced biomarkers in all of bipolar disorder research:

- Sleep disturbance is the **most common prodrome of mania** in 70–80% of patients, and among the most common prodromes of depression.
- A seminal review in the *British Journal of Psychiatry* documented that decreased need for sleep predicts manic or hypomanic episode onset the following day. The relationship is bidirectional: disrupted sleep triggers episodes AND early episodes disrupt sleep.
- Manic episodes are predicted by shortened total sleep time, reduced REM latency, and discontinuous sleep patterns.
- A 2024 review — *"Sleep and circadian disruption in bipolar disorders: From psychopathology to digital phenotyping in clinical practice"* (PMC, 2025) — confirmed that sleep disturbances persist across all phases of BD: manic, depressive, and euthymic.
- The BipoSense study (PMC12483305) followed patients for one year with daily sleep reporting and fortnightly clinical assessments, confirming sleep's discriminative power across prodromal stages.
- A *Lancet eBioMedicine* study (2024) using longitudinal wearable device data established "causal dynamics of sleep, circadian rhythm, and mood symptoms" in bipolar patients — validating passive monitoring as a mechanistic tool, not merely correlational.

**Design implication:** When sleep drops below the user's personal threshold for 2+ consecutive nights, the AI should surface an early warning — not just display the sleep data passively.

### Key Citations
- Sleep and Circadian Disruption in BD, PMC 2025 — https://pmc.ncbi.nlm.nih.gov/articles/PMC11804932/
- BipoSense longitudinal study, PMC 2025 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12483305/
- Causal Dynamics of Sleep and Mood, *Lancet eBioMedicine* 2024 — https://www.thelancet.com/journals/ebiom/article/PIIS2352-3964(24)00129-4/fulltext

---

## 3. Behavioral Activation (Prescribed Activities)

**Verdict: Supported for bipolar depression, but requires bipolar-adapted protocols.**

Behavioral Activation (BA) has a strong evidence base for unipolar depression. Researchers have adapted it for bipolar disorder with important modifications.

A key adaptation study — *"Adapted Behavioural Activation for Bipolar Depression: A Randomised Multiple Baseline Case Series"* (PMC9599144, 2022) — specifically adapted the COBRA BA protocol. The critical modification: activity scheduling must discriminate between activities that promote hypomanic or manic states and those that promote sustainable positive states. Rest-activity balance is explicitly addressed. Contracting about hypomania and mania warning signs was built into treatment from the start.

A proof-of-concept trial (*"Adjunctive Behavioral Activation for the Treatment of Bipolar Depression"*, PMC4855692) showed BA was feasible and produced meaningful symptom reduction in bipolar depression.

The CANMAT and ISBD 2023 Guidelines (PMC11058959) recommend CBT (of which BA is a component) as an evidence-based adjuvant therapy in all stages of bipolar disorder except acute mania.

The JAMA Psychiatry meta-analysis by Miklowitz et al. (February 2021; 78(2):141–150) found that skills training and behavioral components were among the active ingredients with consistent evidence of benefit across psychosocial interventions.

**Critical design constraint:** Prescribing activities without bipolar-specific anti-hypomania guardrails is a documented design flaw. The psychiatrist prescription portal should include a "Phase caution" field — flagging which activities should be paused or reduced during hypomanic phases.

### Key Citations
- Adapted BA for Bipolar Depression, PMC 2022 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9599144/
- CANMAT and ISBD 2023 Guidelines — https://pmc.ncbi.nlm.nih.gov/articles/PMC11058959/
- Miklowitz meta-analysis, *JAMA Psychiatry*, 2021 — https://jamanetwork.com/journals/jamapsychiatry/fullarticle/2769566

---

## 4. Mindfulness / MBCT / Body Scan / Breathing

**Verdict: MBCT has moderate evidence for bipolar depression and anxiety — NOT mania. 54321 grounding and box breathing have no bipolar-specific RCT evidence.**

**Mindfulness-Based Cognitive Therapy (MBCT):**

A systematic review and meta-analysis (PubMed 32480120, 2020) found MBCT produces within-group reductions in depression and anxiety compared to baseline. Critically: **symptoms of mania were not alleviated**. Improvements in depression held at 3-month follow-up but not 12 months.

A 2022 study in the *International Journal of Bipolar Disorders* found that MBCT reduced depressive rumination and negative self-referential processing specifically in bipolar patients — a proposed mechanism for its antidepressant effects.

A 2023 Frontiers in Psychiatry RCT found MBCT produced significant improvements in cognitive function and BDNF levels compared to psychoeducation alone in bipolar patients.

**54321 Grounding and Box Breathing:**

These techniques have **no published RCTs specific to bipolar disorder**. Clinical evidence comes entirely from anxiety and PTSD literature. Box breathing has physiological validation (Steffen et al., 2021 — documented beneficial effects of controlled breathing rates) but this is not bipolar-specific.

**Design implication:** Activities using mindfulness and body scan should carry a note: *"Best during stable or depressive phases. If you're feeling elevated or manic, this may not be the right fit right now."* The 54321 and box breathing activities should be labeled *"Good for anxiety and racing thoughts"* rather than marketed as clinically validated bipolar interventions.

### Key Citations
- MBCT for Bipolar meta-analysis, PubMed 2020 — https://pubmed.ncbi.nlm.nih.gov/32480120/
- MBCT reduces rumination in BD, *International Journal of Bipolar Disorders*, 2022 — https://journalbipolardisorders.springeropen.com/articles/10.1186/s40345-022-00269-1

---

## 5. Shame, Self-Stigma & Forgiveness Activities

**Verdict: Shame and self-stigma are well-documented clinical concerns in bipolar. Structured forgiveness has a general evidence base; bipolar-specific evidence is limited but the clinical rationale is strong.**

**Shame and guilt as documented clinical phenomena:**

A systematic review on stigma in bipolar disorder (PMC9941403, 2023, *Bipolar Disorders* journal) confirmed that self-stigma, shame, and embarrassment are pervasive and adversely affect quality of life and treatment engagement.

A *SpringerLink* book chapter (2024) — *"Working with Shame, Guilt, and Self-Stigma in Bipolar Disorder"* — explicitly states: *"Guilt and shame are particularly relevant in the treatment of patients with severe bipolar disorder, who may feel guilt and shame in relation to their behaviour during a manic episode."*

The OSSiBD programme is an eight-session small group intervention for self-stigma, shame, and embarrassment in bipolar disorder, combining CBT, psychoeducation, and narrative therapy, with published evidence of efficacy.

**Forgiveness interventions:**

A 2024 systematic review in *BMC Psychology* — *"Psychological interventions to promote self-forgiveness"* — identified 14 high-quality RCTs, finding that self-forgiveness interventions reduce depression, anger, hostility, and distress. Enright's process model (four phases: Uncovering, Decision, Work, Deepening) was the most studied structured approach.

A large RCT of REACH Forgiveness workbooks across five countries (4,598 participants) showed high effectiveness in a self-directed workbook format — directly analogous to an in-app exercise.

### Key Citations
- Stigma in BD systematic review, PMC 2023 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9941403/
- Self-forgiveness interventions systematic review, *BMC Psychology*, 2024 — https://link.springer.com/article/10.1186/s40359-024-01671-3

---

## 6. Psychoeducation / Bipolar Workbook

**Verdict: Among the strongest evidence bases for any bipolar intervention. First-line treatment in CANMAT 2023.**

**The Barcelona landmark trial** (Colom & Vieta, 2003 — original RCT; 5-year follow-up published in *British Journal of Psychiatry*): 120 bipolar I and II outpatients randomized to 21 sessions of group psychoeducation vs. 21 sessions of non-structured group meetings. The psychoeducation programme covered illness awareness, treatment adherence, early detection of prodromal symptoms, and lifestyle regularity. At 5-year follow-up, **psychoeducation patients suffered 66% fewer manic episodes and 75% fewer depressive episodes**. These are extraordinary effect sizes rarely seen in psychiatric research.

A CANMAT randomised controlled trial (*Journal of Clinical Psychiatry*, 2012; 204 participants) compared brief group psychoeducation vs. individual CBT. Both had similar outcomes, but psychoeducation cost $180 per subject vs. $1,200 for CBT.

A systematic review of 40 psychoeducation RCTs (PMC8717031, 2021) found psychoeducation was associated with reduced illness recurrences, decreased number and duration of hospitalizations, and increased time to illness relapse.

The CANMAT and ISBD 2023 Guidelines explicitly recommend: *"Ongoing psychoeducation and flexible, collaborative engagement with patients are recommended to optimize the acceptability of maintenance pharmacological treatment."*

**Core workbook content validated by research:**
1. Understanding illness and cycles
2. Identifying personal triggers
3. Recognizing early warning signs (prodromal symptoms)
4. Building on personal strengths and coping resources

### Key Citations
- Barcelona Group Psychoeducation 5-year RCT, *British Journal of Psychiatry* — https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/group-psychoeducation-for-stabilised-bipolar-disorders-5year-outcome-of-a-randomised-clinical-trial/
- Psychoeducation in BD systematic review, PMC 2021 — https://pmc.ncbi.nlm.nih.gov/articles/PMC8717031/
- CANMAT 2023 Update — https://psychiatryonline.org/doi/full/10.1176/appi.focus.20230009

---

## 7. Peer Support / Anonymous Community

**Verdict: Peer support shows consistent subjective benefits and some clinical improvements. High-quality RCT evidence for bipolar-specific online peer support is limited but positive.**

A major 2025 scoping review in *Bipolar Disorders* journal (Morton et al., Wiley, 2025; PMC11950716) identified 30 studies on peer support for bipolar disorder. Key findings:

- Greater attendance and involvement in peer support groups was associated with greater quality of life and well-being, and less functional impairment.
- 50% of studies reported on clinical outcomes including relapse rates and mood symptoms.
- Qualitative research and engagement rates suggest strong subjective appeal.

A study on the Depression and Bipolar Support Alliance (DBSA) (PMC6591033, 2019) found attending DBSA groups was associated with meaningful improvements in mental health outcomes and reduced healthcare utilization.

Privacy and stigma research (PMC8034868, 2021) found that bipolar patients' decisions about self-disclosure are complex — many hide aspects of their experience due to shame or fear of being seen as "dangerous." **Anonymous peer support directly addresses this barrier.**

**Design alignment:** The app's approach — anonymous by default, no likes, chronological feed, no algorithmic amplification — maps directly onto what research identifies as safe design for this population.

### Key Citations
- Peer Support for BD Scoping Review, *Bipolar Disorders*, 2025 — https://onlinelibrary.wiley.com/doi/10.1111/bdi.70006
- Privacy and Self-Disclosure in BD, PMC 2021 — https://pmc.ncbi.nlm.nih.gov/articles/PMC8034868/

---

## 8. Wearable / Physiological Data Integration

**Verdict: Clinically promising with growing validation. Consumer-grade devices have known limitations but are increasingly used in clinical research.**

A 2025 JMIR Mental Health systematic review (PMC11751658) reviewed studies using smartwatches in serious mental illness including bipolar disorder. Key finding: **lower HRV was found in the manic state compared to the euthymic state**, indicating that HRV collected by wrist-worn PPG sensors is a possible biomarker for bipolar mood states.

A 2025 JMIR Medical Informatics study on predicting mood symptoms in bipolar disorder from wearable data achieved **83% accuracy, 0.89 AUROC** for predicting depressive episodes using actigraphy, sleep hours, and heart rate from consumer devices mapped against clinical measures.

A 2024 Lancet eBioMedicine study used longitudinal wearable device data to establish "causal dynamics" of sleep and circadian rhythm on mood symptoms — a significant methodological advance beyond correlation.

A 2022 Journal of Affective Disorders study (APPLE cohort) found that daytime light exposure was positively associated with circadian activity rhythms in bipolar disorder, and nighttime light exposure negatively associated — suggesting that smartwatch light/activity data could serve as a circadian intervention target.

**Known limitations:** Consumer-grade PPG devices are less accurate than research-grade actigraphy during activity periods. Resting and sleep measurements are most reliable. Data should be presented as supplementary context rather than diagnostic.

### Key Citations
- Wearable Devices in Severe Mental Illness, JMIR Mental Health 2025 — https://mental.jmir.org/2025/1/e65143
- Wearable Mood Prediction in BD, JMIR Medical Informatics 2025 — https://medinform.jmir.org/2025/1/e66277
- Causal Dynamics of Sleep and Mood, Lancet eBioMedicine 2024 — https://www.thelancet.com/journals/ebiom/article/PIIS2352-3964(24)00129-4/fulltext

---

## 9. Crisis Intervention / Digital Safety Planning

**Verdict: Strongly evidence-supported. Digital safety planning is associated with meaningful reductions in repeat crisis presentations.**

A 2025 JMIR Mental Health quasi-experimental study (PMC12186861) found that **activating a digital safety plan reduced the likelihood of repeat suicide-related emergency department visits by 50%**.

A 2024 JMIR Mental Health systematic review — *"Translating Suicide Safety Planning Components Into the Design of mHealth App Features"* — found that core elements of the Stanley-Brown Safety Planning Intervention (SPI) can and should be translated into app features. These elements map directly onto Equi's crisis screen: identifying warning signs, internal coping strategies, social contacts for distraction, contacts for support, mental health professionals, and crisis lines.

**Bipolar-specific context:** Bipolar disorder carries significantly elevated suicide risk — lifetime risk of suicide attempt is 25–50%, substantially higher than the general population. This makes crisis features in a bipolar app not optional but clinically essential.

The Beyond Now app (Australia), used by over 50,000 people annually, represents one of the most evaluated digital safety planning tools and validates the general approach.

### Key Citations
- Digital Safety Plan Reduces ED Visits, JMIR Mental Health 2025 — https://mental.jmir.org/2025/1/e70253
- Translating Safety Planning to mHealth, JMIR Mental Health 2024 — https://mental.jmir.org/2024/1/e52763

---

## 10. Gratitude Journaling & Positive Psychology Activities

**Verdict: Limited bipolar-specific evidence. General mental health benefits documented. Risk of hypomania induction is plausible — requires monitoring.**

A systematic review and meta-analysis on journaling for mental illness (PMC8935176, 2022) found that 68% of journaling intervention outcomes were effective across conditions, and of four studies examining gratitude journaling specifically, three showed significant symptom improvements. Not bipolar-specific.

A **positive psychology pilot RCT for bipolar depression** (PMC6486459, 2019) tested structured positive psychology interventions (including gratitude-related exercises) in bipolar patients. Results showed improvements in well-being. Critical safety finding: the researchers could not detect significant differences in mania symptoms at the group level post-intervention, but **two individual participants showed elevated mania scores**. The authors explicitly noted: *"It will be important to monitor the potential effect of positive emotion regulation interventions in inducing mania in a larger sample."*

A follow-up development study (PMC6861691, 2019) found no significant group-level mania induction but again flagged individual-level risk and recommended ongoing monitoring.

**Design implication:** Gratitude Jar and Compliment Diary should be filtered out of the activity recommendations when the user's current cycle is manic or hypomanic. A subtle note in the activity description ("If you notice your mood elevating unexpectedly, it's okay to pause this activity") reduces risk without stigmatizing the activity.

### Key Citations
- Positive Psychology Intervention for BD Depression pilot RCT, PMC 2019 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6486459/
- Positive Emotion Regulation Intervention for BD I, PMC 2019 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6861691/

---

## 11. Well-wisher & Guardian Access

**Verdict: Supported. Family Focused Therapy RCTs show caregiver involvement significantly reduces relapse.**

Family Focused Therapy (FFT) — developed by Miklowitz et al. — has landmark RCT evidence. The JAMA Psychiatry 2020 RCT (PMC6990706) showed that involving caregivers in psychoeducation and early warning sign recognition produced significantly longer intervals to next mood episode in high-risk patients.

FFT components directly map onto the Guardian feature:
- Caregiver is educated about early warning signs → Guardian alert thresholds
- Family members are trained to recognise and respond to prodromal signs → Guardian notification system
- Family communication strategies are practised → Well-wisher "Share a moment" feature

**Design alignment:** The current implementation (granular per-person permissions, always revocable, user retains control) is clinically appropriate. The FFT literature does not support coercive caregiver control — it supports collaborative monitoring with patient agency. This is correctly reflected in the design.

### Key Citations
- FFT for High-Risk Youths, *JAMA Psychiatry*, 2020 — https://jamanetwork.com/journals/jamapsychiatry/fullarticle/2758325
- IPSRT 2-year Outcomes BD I, *JAMA Psychiatry* — https://jamanetwork.com/journals/jamapsychiatry/fullarticle/1108410

---

## 12. Diet & Nutrition Tracking

**Verdict: Moderate–Strong and growing. The most important finding is that dietary effects show up in mood *variability* — not in average scores — which is exactly what Equi's daily EMA-style tracking captures.**

> Full deep-dive research in [diet-nutrition.md](diet-nutrition.md). Summary of key findings below.

The foundational trial for this feature is Saunders et al. 2022 (*Bipolar Disorders*, Penn State). N=82 BD-I/II patients randomised to a high omega-3 / low omega-6 diet. Primary measurement: **twice-daily EMA** over 12 weeks — the same methodology Equi uses. Result: variability in mood, energy, irritability, and pain was significantly reduced in the intervention group; clinical scale averages were not significantly different. This proved that (a) diet meaningfully affects bipolar mood patterns and (b) EMA is the correct measurement tool — weekly clinical scales miss the signal entirely.

The Stanford ketogenic diet pilot (Sethi, Wakeham, Ketter et al., 2024, *Psychiatry Research*, N=23) showed 69% of BD participants had clinically meaningful CGI improvement; 31% average improvement across all participants. Metabolic outcomes were dramatic: zero participants met metabolic syndrome criteria by study end, down from a substantial proportion at baseline. This is clinically significant because ~60% of BD patients on antipsychotics develop metabolic syndrome.

The Jacka lab 2019 sub-study of an RCT found that diet quality independently predicted treatment response — high diet quality was associated with better outcomes regardless of whether the patient received active treatment or placebo. This is the most clinically actionable evidence for including nutrition tracking as a core feature.

**Gut-brain axis:** Multiple systematic reviews in *Molecular Psychiatry* (Rios 2023, Ng 2022) confirm BD patients consistently show reduced microbial diversity and lower Faecalibacterium (an anti-inflammatory butyrate producer). Diet is the #1 modifiable factor for microbiome. Probiotic RCTs are small and mixed — one positive signal for mania (Guo 2022).

**Caffeine-lithium interaction:** Caffeine is a diuretic that gradually lowers lithium blood levels by increasing urinary output — clinically documented and an underappreciated safety issue for approximately 30–40% of BD patients on lithium. Equi can surface this connection when users log high caffeine intake alongside their medication check-in.

**Meal timing:** The ISBD Task Force (McCarthy et al. 2022, *Bipolar Disorders*) found circadian disruption in 10–80% of BD patients even during euthymic states. Irregular meal timing is a direct circadian disruptor. Time-restricted eating in BD is currently in an ongoing pre-post trial (BMC Psychiatry 2024).

**Mayo Clinic Biobank 2025** (N=737 BD patients): "Unhealthy diet quality" is now established as a distinct clinical phenotype in BD-I requiring targeted intervention.

**Design implication:** This feature must not be a calorie tracker. The evidence supports tracking *food quality categories* and *eating patterns* (anti-inflammatory vs. pro-inflammatory foods, omega-3 intake, caffeine, sodium, meal timing) correlated over time against mood variability data. The goal is surfacing personal patterns — that depressive periods cluster after low-omega-3 weeks, or that high-caffeine days precede worse sleep — not telling users what to eat.

### Key Citations
- Saunders et al. — high n-3/low n-6 RCT, *Bipolar Disorders* 2022 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9157563/
- Sethi et al. — Stanford ketogenic pilot, *Psychiatry Research* 2024 — https://pubmed.ncbi.nlm.nih.gov/38547601/
- Jacka lab — diet quality predicts treatment response, 2019 — https://pubmed.ncbi.nlm.nih.gov/31661974/
- Rios et al. — gut-brain axis in BD, *Molecular Psychiatry* 2023 — https://www.nature.com/articles/s41380-023-01964-w
- MDPI — From Food to Mood review, *Nutrients* 2025 — https://www.mdpi.com/2072-6643/17/23/3728
- Mayo Clinic Biobank — diet quality phenotype in BD 2025 — https://www.sciencedirect.com/article/pii/S0165032725020749
- McCarthy et al. — ISBD circadian task force, *Bipolar Disorders* 2022 — https://onlinelibrary.wiley.com/doi/10.1111/bdi.13165
