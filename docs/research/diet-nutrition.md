# Research: Diet & Nutrition in Bipolar Disorder

> **Verdict: Moderate-to-Strong and rapidly growing.** The most important finding for Equi is that dietary effects on bipolar disorder show up in mood *variability* — not in average clinical scale scores. Equi's daily EMA-style tracking is precisely the right methodology to detect this, matching the Saunders 2022 RCT design. No existing mental health app captures the food-mood connection at this granularity.

← [Research index](README.md) | Feature design → [docs/design/features/nutrition.md](../design/features/nutrition.md)

---

## Summary: Evidence Strength by Dietary Factor

| Dietary Factor | Evidence Level | Direction |
|---|---|---|
| Omega-3 — depressive phase | Moderate (multiple RCTs, mixed) | Modestly beneficial |
| Omega-3 — mood variability reduction | 1 high-quality RCT (Saunders 2022) | Significant reduction |
| Omega-3 — manic phase | Weak | No effect |
| Ketogenic diet | Pilot RCTs + case series (promising) | Strong pilot signal; RCT needed |
| Mediterranean dietary pattern | Observational + mechanistic | Protective; anti-inflammatory |
| Gut microbiome (observation) | Multiple systematic reviews | Consistent dysbiosis in BD |
| Probiotics (RCTs) | Small, mixed results | Inconclusive; one positive for mania |
| Magnesium | Very limited (1 small study) | Possibly beneficial |
| Vitamin D supplementation | Several studies; null in RCTs | No significant benefit despite high deficiency rates |
| Folate supplementation | Small trials | Possibly beneficial for depressive phase |
| Diet quality predicting treatment response | 1 RCT sub-study (Jacka lab 2019) | High diet quality = better response regardless of treatment |
| Metabolic syndrome risk | Strong meta-analytic evidence | BD patients at ~2× general population risk |
| Caffeine | Clinical + mechanistic | Destabilizing; lowers lithium levels |
| Alcohol | Epidemiological | Strongly destabilizing; interacts with mood stabilisers |
| Sugar / refined carbs | Mechanistic + observational | Blood glucose spikes → mood instability; drives inflammation |
| Ultra-processed foods | Mechanistic | Elevates CRP, IL-6, TNF-α — all elevated at baseline in BD |
| High-sodium diet | Pharmacological mechanism | Lithium reabsorption competition → toxicity risk |
| Meal timing / eating window | 1 ongoing trial | Under active investigation for circadian alignment |

---

## 1. Omega-3 Fatty Acids

### Why it matters for BD
Omega-3 polyunsaturated fatty acids (PUFAs), particularly EPA (eicosapentaenoic acid) and DHA (docosahexaenoic acid), are among the most studied nutritional interventions in bipolar disorder. The key finding: they reduce mood *variability* even when they don't move average clinical scale scores. This is mechanistically relevant because BD pathophysiology is characterised by instability of affective states, not just average elevation or depression.

### Key trials

**Saunders et al. (2022) — the most important dietary RCT for Equi**
- *"Adjunctive dietary intervention for bipolar disorder: a randomized, controlled, parallel-group, modified double-blinded trial of a high n-3 plus low n-6 diet"*
- *Bipolar Disorders*, 2022. Penn State University. DOI: 10.1111/bdi.13112
- Design: 48-week study. N=82 BD-I/II patients. High n-3 plus low n-6 diet (H3-L6) vs. control.
- Measurement method: **Twice-daily ecological momentary assessment (EMA)** over 12 weeks — the same daily tracking methodology Equi uses.
- **Key finding:** Variability in mood, energy, irritability, and pain was significantly reduced in the H3-L6 group. Mean clinical scale ratings did not significantly differ.
- **Implication for Equi:** The effect of diet on bipolar mood shows up in variability data — not averages. EMA is the correct tool. Clinical trials using weekly scales miss the signal entirely.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC9157563/

**Kesebir et al. (2023)**
- *"Omega-3 polyunsaturated fatty acids in the prevention of relapse in patients with stable bipolar disorder: A 6-month pilot randomized controlled trial"*
- *Psychiatry Research*, 2023
- Found significant prophylactic effect of n-3 PUFAs on bipolar depression recurrence at 6 months. Well-tolerated.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/38039650/

**Gholipour et al. (2025)**
- *"Supplementation of Omega-3 Increases Serum Levels of BDNF and Decreases Depression Status in Patients With Bipolar Disorder: A Randomized, Double-Blind, Placebo-Controlled Clinical Trial"*
- *Journal of Human Nutrition and Dietetics*, 2025. N=60 men with BD.
- 2g/day omega-3 for 2 months → significant decrease in Hamilton Depression scores + significant increase in BDNF.
- First RCT to mechanistically link omega-3 to BDNF elevation specifically in BD.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/40485144/

**Narrative Review (2025)**
- *"Omega-3 Fatty Acids for the Treatment of Bipolar Disorder Symptoms: A Narrative Review of the Current Clinical Evidence"*
- *Marine Drugs / MDPI*, 2025
- Conclusion: Evidence for depressive phase improvement is stronger than for manic phase. EPA-dominant formulations appear more effective than DHA-dominant.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC11857698/

### Sources of omega-3 to track in-app
Oily fish (salmon, sardines, mackerel, anchovies), walnuts, flaxseed, chia seeds, hemp seeds.

---

## 2. Ketogenic Diet

### Why it matters for BD
The ketogenic diet has a biologically plausible mechanism for bipolar disorder beyond weight loss: (1) ketosis mimics some effects of valproate (a standard mood stabiliser) by inhibiting histone deacetylases; (2) ketone bodies provide an alternative fuel for potentially mitochondrially-compromised neurons in BD; (3) ketogenic states reduce glutamate excitotoxicity.

### Key trials

**Sethi, Wakeham, Ketter et al. — Stanford (2024)**
- *"Ketogenic Diet Intervention on Metabolic and Psychiatric Health in Bipolar and Schizophrenia: A Pilot Trial"*
- *Psychiatry Research*, 2024. N=23 (BD + schizophrenia). 4-month intervention.
- **Psychiatric outcomes:** 31% average CGI improvement; 69% of BD participants showed clinically meaningful improvement (>1 CGI point).
- **Metabolic outcomes:** 12% decrease in weight, 36% reduction in visceral adipose tissue, 27% improvement in HOMA-IR, 25% decrease in triglycerides. Zero participants met metabolic syndrome criteria by end.
- **Secondary:** 17% increased life satisfaction, 19% enhanced sleep quality.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/38547601/

**UK Pilot Study (2023)**
- *"A pilot study of a ketogenic diet in bipolar disorder: clinical, metabolic and magnetic resonance spectroscopy findings"*
- *BJPsych Open*, 2023. N=26 euthymic BD-I patients.
- 91% achieved sustained ketosis; mean ketone level 1.3 mmol/L.
- Weight fell 4.2 kg, BMI fell 1.5, systolic BP fell 7.4 mmHg. Feasibility confirmed; full RCT recommended.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10594182/

**Case Series — Frontiers in Nutrition (2025)**
- Seven BD outpatients. Daily ketone levels positively correlated with self-rated mood and energy; inversely correlated with impulsivity and anxiety.
- https://www.frontiersin.org/articles/10.3389/fnut.2025.1635489/full

**Mechanistic Framework (2023)**
- *"Ketogenic-Mimicking Diet as a Therapeutic Modality for Bipolar Disorder: Biomechanistic Rationale and Protocol for a Pilot Clinical Trial"*
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10346691/

**University of Edinburgh** — Ongoing registered pilot RCT of ketogenic diet in BD.
- https://clinical-brain-sciences.ed.ac.uk/division-psychiatry/pilot-trial-ketogenic-diet-bipolar-disorder

---

## 3. Mediterranean Diet and Dietary Patterns

### Why it matters for BD
The Mediterranean diet is the most studied anti-inflammatory dietary pattern. BD patients have elevated baseline inflammatory markers (IL-6, TNF-α, CRP) across all mood states. The Mediterranean diet reduces exactly these markers — providing a mechanistic bridge even in the absence of BD-specific RCTs.

**Gabriel et al. (2022) — Systematic review**
- *"Nutrition and bipolar disorder: a systematic review"*
- *Nutritional Neuroscience*, 2022. University of São Paulo + Deakin University (Felice Jacka's Food and Mood Centre).
- Individuals with BD have higher rates of unhealthy lifestyles and elevated cardiometabolic risk. Dietary factors implicated in depression and anxiety also appear relevant to BD.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/35608150/

**MDPI Nutrients (2025)**
- *"From Food to Mood: Psychological and Psychiatric Impact of Diet in Bipolar Disorder"*
- Comprehensive review of biological mechanisms: gut-brain axis, neuroinflammation, oxidative stress, HPA dysregulation, neurotransmitter synthesis.
- Mediterranean diet associated with better mood stability, lower depression rates, improved cognition in BD.
- https://www.mdpi.com/2072-6643/17/23/3728 | PubMed: https://pubmed.ncbi.nlm.nih.gov/41374018/

**MDPI Life (2026)**
- *"Dietetic Prescriptions in Bipolar Disorder: Nutritional Strategies to Support Mood Stability and Reduce Relapse Risk"*
- Explicitly recommends (in order of evidence): Mediterranean diet, quality plant-based diets, ketogenic diets as adjunctive strategies in BD.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC12843453/

**SMILES Trial — Jacka et al. (2017, BMC Medicine)**
- *"A randomised controlled trial of dietary improvement for adults with major depression"*
- Though focused on MDD, this is the landmark trial of the entire nutritional psychiatry field. N=67, 12-week modified Mediterranean diet.
- Result: Cohen's d = -1.16. Remission in 32.3% diet group vs. 8% control. NNT = 4.1.
- Referenced in virtually every BD dietary intervention paper as the foundational proof-of-concept.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/28137247/

---

## 4. Gut-Brain Axis and Microbiome

### Why it matters for BD
BD patients consistently show reduced gut microbial diversity and lower abundance of Faecalibacterium (an anti-inflammatory butyrate producer). Diet is the single most modifiable factor affecting microbiome composition. Microbiome differences have been shown to correlate with clinical severity and treatment response — not just diagnostic status.

**Rios et al. (2023, Molecular Psychiatry)**
- *"Microbiota-gut-brain axis mechanisms in the complex network of bipolar disorders: potential clinical implications and translational opportunities"*
- One of the highest-impact psychiatric journals. Mechanisms: BD patients show reduced microbial diversity; shifts in taxa affect neuromodulation, endocrine function, and brain inflammation.
- Clinical implication: gut microbiome profiles may predict treatment response to psychotropic medications.
- https://www.nature.com/articles/s41380-023-01964-w

**Ng et al. (2022, Molecular Psychiatry) — Systematic review**
- *"A systematic review of gut microbiota composition in observational studies of major depressive disorder, bipolar disorder and schizophrenia"*
- BD-specific findings: increased Bacteroidetes, Proteobacteria, Actinobacteria; reduced Firmicutes and Faecalibacterium. Reduced Faecalibacterium negatively correlated with depression severity.
- https://www.nature.com/articles/s41380-022-01456-3

**First systematic review on gut-brain axis and BD treatment outcomes (2023)**
- Microbiology Society press release summarising research showing gut microbiome profiles more similar to healthy individuals predict better treatment response.
- https://microbiologysociety.org/news/press-releases/first-systematic-review-finds-gut-brain-axis-impacts-treatment-outcomes-in-bipolar-patients.html

**Painold et al. (2016)**
- One of the first studies showing microbiome differences correlate with *clinical severity* rather than just diagnosis.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC5336480/

### Probiotic RCTs
Two RCTs with conflicting results:

**Kouchaki et al. (2020)** — Null finding. 8 weeks of multi-strain probiotics in BD-I had non-significant effects on YMRS or HDRS.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC7193240/

**Guo et al. (2022, Frontiers in Pharmacology)** — Positive finding for mania specifically. N=80 first-episode BD patients. Probiotics adjunctive to psychotropics → significantly greater mania symptom reduction (OR=0.09, p=0.016 on YMRS).
- https://www.frontiersin.org/articles/10.3389/fphar.2022.829815/full

### What to track in-app
Fermented foods: yogurt, kefir, kimchi, sauerkraut, kombucha. High-fibre foods: legumes, whole grains, oats, vegetables. Both feed Faecalibacterium and butyrate-producing bacteria.

---

## 5. Inflammatory Markers and Diet

### Why it matters for BD
BD is increasingly understood as a neuroinflammatory disorder. IL-6 is the single most consistently elevated cytokine across all mood states in BD. Dietary patterns have well-documented effects on the same inflammatory markers — this is the mechanistic bridge between nutrition and bipolar mood.

**Translational Psychiatry (2024)**
- *"Inflammatory mediators in major depression and bipolar disorder"*
- Most consistent findings in BD: elevated IL-6, TNF-α, CRP, CCL3, CCL4, CCL5, CCL11, NLR.
- https://www.nature.com/articles/s41398-024-02921-z

**Meta-analysis on dietary patterns and inflammation (2022)**
- Mediterranean dietary patterns → significant reductions in CRP, IL-6, TNF-α.
- Western dietary patterns → significant increases in same markers.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC8803482/

**Diet quality predicts treatment response (Jacka lab 2019)**
- Sub-study of an RCT testing adjunctive N-acetylcysteine in BD.
- Finding: High diet quality, low dietary inflammation, and low BMI all predicted better treatment response *regardless of whether the patient received NAC or placebo*.
- Diet quality was an independent predictor of outcome — the single most clinically actionable finding for a food-tracking feature.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/31661974/

---

## 6. Metabolic Syndrome and Medication Weight Gain

### Why it matters for BD
Approximately 60% of BD patients on atypical antipsychotics (olanzapine, quetiapine, risperidone) develop metabolic issues — weight gain, insulin resistance, dyslipidaemia. Metabolic syndrome is ~2× more prevalent in BD than the general population. This is not only a health risk but a major driver of medication non-adherence. Diet is the first-line non-pharmacological intervention.

**Mayo Clinic Bipolar Disorder Biobank (2025)**
- *"Unhealthy diet quality as a clinical phenotype in bipolar disorder"*
- N=737 BD patients. Used REAP-S dietary assessment tool.
- Established "unhealthy diet quality" as a distinct clinical phenotype requiring targeted intervention — particularly in BD-I, early-onset, and male patients.
- ScienceDirect: https://www.sciencedirect.com/article/pii/S0165032725020749

**Bioque et al. (2019)**
- *"Metabolic Syndrome and Bipolar Disorder: What Should Psychiatrists Know?"*
- BD patients have 1.98× odds of metabolic syndrome vs. general population. Atypical antipsychotics (especially olanzapine, clozapine) are major contributors. Dietary interventions recommended.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC6493593/

**Frontiers in Endocrinology (2020)**
- Negative metabolic consequences affect up to 60% of patients on atypical antipsychotics. Dietary intervention is the most conservative first-line approach.
- https://www.frontiersin.org/articles/10.3389/fendo.2020.573473/full

---

## 7. Specific Nutrients

### Magnesium
- Acts as an NMDA receptor modulator and second-messenger regulator — shares some mechanisms with lithium.
- Chouinard et al. (1990): Magnesium supplementation had an effect size comparable to lithium in approximately half of rapid-cycling BD patients. Remains the most-cited magnesium/BD study.
- Deficiency appears common in BD; supplementation is clinically reasonable but lacks strong RCT support.
- **Food sources:** Leafy greens (spinach, kale), pumpkin seeds, almonds, dark chocolate, legumes, whole grains.

### Vitamin D
- Deficiency is almost 5× more common in BD patients than the general population.
- Despite epidemiological associations, RCTs of vitamin D supplementation have not significantly improved bipolar symptoms.
- Still important to track deficiency risk, particularly in patients with limited sun exposure.
- **Key reference:** Shaffer et al. (2018, *Scientific Reports*) — https://www.nature.com/articles/s41598-018-29141-y
- **MDPI Nutrients (2025):** *"Vitamin D, B9, and B12 Deficiencies as Key Drivers of Clinical Severity and Metabolic Comorbidities in Major Psychiatric Disorders"* — https://www.mdpi.com/2072-6643/17/7/1167

### Folate (B9)
- 22.6% of BD patients have folate deficiency in observational studies.
- Low dietary folic acid has been associated with subsequent depressive or manic episodes.
- Folate supplementation as adjunct to standard treatment appears superior to placebo for depressive symptoms in BD.
- **Food sources:** Leafy greens, lentils, chickpeas, asparagus, avocado, broccoli.

### B12
- Deficiency linked to clinical severity of major psychiatric disorders including BD.
- **Food sources:** Oily fish, meat, eggs, dairy, fortified foods.

---

## 8. Destabilizing Dietary Factors

### Caffeine
- BD patients self-report that caffeine "increased manic-ness" and worsened elevated mood states. (University of Exeter research programme)
- Disrupts sleep architecture — sleep disruption is the #1 prodrome of manic episodes in 70-80% of BD patients.
- **Critical lithium interaction:** Caffeine is a diuretic. Chronically high caffeine intake lowers lithium blood levels by increasing urinary output — reducing efficacy of the most established BD medication. Conversely, *stopping* caffeine abruptly can spike lithium levels (one case report documented ~50% lithium level rise after stopping 17 cups/day).
- References: Exeter — https://www.exeter.ac.uk/research/mooddisorders/research/past_projects/caffeine/ | Psychiatric Times — https://www.psychiatrictimes.com/view/an-extra-cup-caffeine-intake-and-symptoms-in-patients-with-bipolar-disorder

### Alcohol
- 40–70% of BD patients experience alcohol use disorder at some point — the highest comorbidity rate of any psychiatric condition.
- Acutely destabilises mood and negatively interacts with lithium and valproate.
- One of the strongest predictors of poor long-term BD outcomes: more hospitalisations, higher suicide rates, poorer medication adherence.
- Already tracked in Equi's daily substance check-in.

### Sugar and Refined Carbohydrates
- Blood glucose spikes from high-glycaemic foods can destabilise mood in BD patients.
- BD patients are already at elevated risk of type 2 diabetes and insulin resistance; high sugar intake exacerbates metabolic risk.
- Drives neuroinflammation via elevated CRP, IL-6, and TNF-α — all elevated at baseline in BD.

### High-Sodium Foods
- Sodium and lithium compete for reabsorption in the kidney tubules.
- Low-sodium diet → increased lithium reabsorption → lithium toxicity risk.
- Very high-sodium diet → decreased lithium reabsorption → lithium under-therapeutic.
- Ultra-processed foods are a major hidden source of sodium. Patients on lithium should maintain *consistent* (not low) sodium intake.

---

## 9. Meal Timing and Circadian Rhythm

### Why it matters for BD
Circadian rhythm disruption is estimated to affect 10–80% of BD patients — even during euthymic (stable) states. Irregular meal timing is a direct circadian disruptor. Social rhythm therapy (IPSRT), already in Equi, specifically targets scheduling regularity of daily activities including meal times.

**McCarthy et al. (2022, Bipolar Disorders) — ISBD Task Force**
- *"Neurobiological and behavioral mechanisms of circadian rhythm disruption in bipolar disorder: A critical multi-disciplinary literature review"*
- Chronodisruption in 10–80% of BD individuals. Rhythm irregularities persist in euthymic states and associate with disorder onset and severity.
- https://onlinelibrary.wiley.com/doi/10.1111/bdi.13165

**BMC Psychiatry (2024) — Ongoing trial**
- *"A pre-post trial to examine biological mechanisms of the effects of time-restricted eating on symptoms and quality of life in bipolar disorder"*
- Time-restricted eating (TRE) as an adjunct to BD care. Currently recruiting.
- https://link.springer.com/article/10.1186/s12888-024-06157-5

**Circadian and Microbiome Review (2023, PMC)**
- Aligning eating schedules with circadian rhythms modulates gut microbiome composition and psychiatric outcomes.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10146651/

---

## 10. Mendelian Randomization (Causal Evidence)

**Feng et al. (2024, Frontiers in Psychiatry)**
- *"Associations between dietary habits and bipolar disorder: a diet-wide Mendelian randomization study"*
- UK Biobank (N≈413,466) + Psychiatric Genomics Consortium data. Tested 28 dietary habits.
- Survived multiple-testing correction: non-oily fish intake and high-sugar baked goods positively associated with BD risk.
- **Important caveat:** Authors explicitly state findings "contradict conventional nutritional wisdom" and should be applied with caution. MR instruments have known limitations in diet-disease research.
- PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC11116565/

**Xu et al. (2023, Journal of Affective Disorders)**
- *"Causal relationships between dietary habits and five major mental disorders: A two-sample Mendelian randomization study"*
- Significant negative causal relationship between avoiding wheat products and all five major mental disorders studied including BD.
- PubMed: https://pubmed.ncbi.nlm.nih.gov/37598719/

---

## 11. Why EMA Is the Right Tool (Methodological Note)

The Saunders 2022 RCT is the methodological proof point for Equi's approach. The trial specifically chose **twice-daily EMA** as its primary outcome measure because weekly clinical scales (like the YMRS or HDRS) were insufficiently sensitive to capture dietary effects on mood variability. This is why:

- Diet reduces mood *fluctuation* — the unpredictable swings — rather than moving the average score down.
- Standard clinical scales average across time, obscuring intra-day and day-to-day variability.
- EMA captures variability directly: mood rating at 8am vs. 8pm, day-to-day consistency.

Equi's daily (and potentially twice-daily) mood check-ins are exactly this methodology. Combined with daily food quality logging, Equi can compute the same variability metrics and surface personal food-mood correlations that no clinical trial has ever been able to show individual patients — only group averages.

**This is the unique clinical value proposition of the nutrition feature.** Not "eat more fish" — but "here is what your own data shows about how what you eat affects your mood stability."

---

## Critical Gaps in the Research

1. No large-scale RCT has tested Mediterranean or anti-inflammatory diets specifically in BD (as opposed to unipolar depression). The SMILES trial evidence is routinely extrapolated.
2. All ketogenic diet trials in BD remain at pilot scale (N<30). A properly powered RCT is the essential next step.
3. Probiotic trials are underpowered and use heterogeneous strains.
4. Almost no research distinguishes dietary effects by mood phase (manic vs. depressive vs. euthymic) or by medication type (lithium, valproate, and antipsychotics each have different metabolic and dietary interaction profiles).
5. No existing mental health app integrates food quality tracking with mood variability at the EMA granularity shown to be necessary by Saunders 2022.

---

## Key References

| Study | Journal | Year | Link |
|---|---|---|---|
| Saunders et al. — high n-3/low n-6 RCT | *Bipolar Disorders* | 2022 | https://pmc.ncbi.nlm.nih.gov/articles/PMC9157563/ |
| Sethi et al. — Stanford ketogenic pilot | *Psychiatry Research* | 2024 | https://pubmed.ncbi.nlm.nih.gov/38547601/ |
| BJPsych Open — UK ketogenic pilot | *BJPsych Open* | 2023 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10594182/ |
| Gholipour et al. — omega-3 + BDNF RCT | *J Human Nutrition & Dietetics* | 2025 | https://pubmed.ncbi.nlm.nih.gov/40485144/ |
| Gabriel et al. — systematic review | *Nutritional Neuroscience* | 2022 | https://pubmed.ncbi.nlm.nih.gov/35608150/ |
| Rios et al. — gut-brain axis | *Molecular Psychiatry* | 2023 | https://www.nature.com/articles/s41380-023-01964-w |
| Ng et al. — microbiota systematic review | *Molecular Psychiatry* | 2022 | https://www.nature.com/articles/s41380-022-01456-3 |
| Guo et al. — probiotics + mania RCT | *Frontiers in Pharmacology* | 2022 | https://www.frontiersin.org/articles/10.3389/fphar.2022.829815/full |
| Jacka lab — diet quality predicts Tx response | *Nutritional Neuroscience* | 2019 | https://pubmed.ncbi.nlm.nih.gov/31661974/ |
| Mayo Clinic Biobank — diet quality phenotype | *J Affective Disorders* | 2025 | https://www.sciencedirect.com/article/pii/S0165032725020749 |
| MDPI — From Food to Mood review | *Nutrients* | 2025 | https://www.mdpi.com/2072-6643/17/23/3728 |
| MDPI — Dietetic prescriptions in BD | *Life* | 2026 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12843453/ |
| McCarthy et al. — ISBD circadian task force | *Bipolar Disorders* | 2022 | https://onlinelibrary.wiley.com/doi/10.1111/bdi.13165 |
| Feng et al. — Mendelian randomization | *Frontiers in Psychiatry* | 2024 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11116565/ |
| Bioque et al. — metabolic syndrome in BD | *PMC* | 2019 | https://pmc.ncbi.nlm.nih.gov/articles/PMC6493593/ |
| Omega-3 narrative review | *Marine Drugs* | 2025 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11857698/ |
| TRE trial in BD | *BMC Psychiatry* | 2024 | https://link.springer.com/article/10.1186/s12888-024-06157-5 |
| SMILES trial (MDD, foundational) | *BMC Medicine* | 2017 | https://pubmed.ncbi.nlm.nih.gov/28137247/ |
| Vitamin D, B9, B12 in psychiatric disorders | *Nutrients* | 2025 | https://www.mdpi.com/2072-6643/17/7/1167 |
| Translational Psychiatry — inflammation in BD | *Translational Psychiatry* | 2024 | https://www.nature.com/articles/s41398-024-02921-z |
