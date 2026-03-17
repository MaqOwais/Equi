/**
 * Evidence references for Equi's in-app "Why it matters" tips.
 *
 * All URLs link to peer-reviewed journal articles from the research docs
 * at docs/research/. Only real, verified citations are included.
 */

export interface EvidenceRef {
  citation: string; // Author(s), year, journal
  url: string;      // Direct link to the paper (PubMed, PMC, or publisher)
}

// ─── Nutrition category references ───────────────────────────────────────────
// Keys match CATEGORY_WHY in app/(tabs)/you/nutrition.tsx

export const NUTRITION_REFS: Record<string, EvidenceRef> = {
  anti_inflammatory: {
    citation: 'Saunders EFH et al. (2022). Adjunctive dietary intervention for bipolar disorder: a high n-3 plus low n-6 diet. Bipolar Disorders.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9157563/',
  },
  whole_grains: {
    citation: 'Gabriel FC et al. (2022). Nutrition and bipolar disorder: a systematic review. Nutritional Neuroscience.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35608150/',
  },
  lean_protein: {
    citation: 'Pinto JV et al. (2025). From food to mood: psychological and psychiatric impact of diet in bipolar disorder. Nutrients.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41374018/',
  },
  healthy_fats: {
    citation: 'Saunders EFH et al. (2022). Adjunctive dietary intervention for bipolar disorder: a high n-3 plus low n-6 diet. Bipolar Disorders.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9157563/',
  },
  fermented: {
    citation: 'Rios AC et al. (2023). Microbiota-gut-brain axis mechanisms in the complex network of bipolar disorders. Molecular Psychiatry.',
    url: 'https://www.nature.com/articles/s41380-023-01964-w',
  },
  caffeine: {
    citation: 'Pinto JV et al. (2025). From food to mood: psychological and psychiatric impact of diet in bipolar disorder. Nutrients.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41374018/',
  },
  ultra_processed: {
    citation: 'Jacka FN et al. (2019). Diet quality and treatment outcome in bipolar disorder. Acta Psychiatrica Scandinavica.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31661974/',
  },
  sugar_heavy: {
    citation: 'Gabriel FC et al. (2022). Nutrition and bipolar disorder: a systematic review. Nutritional Neuroscience.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35608150/',
  },
  alcohol: {
    citation: 'Gabriel FC et al. (2022). Nutrition and bipolar disorder: a systematic review. Nutritional Neuroscience.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/35608150/',
  },
  hydration: {
    citation: 'Bioque M et al. (2019). Metabolic syndrome and bipolar disorder: what should psychiatrists know? CNS Drugs.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6493593/',
  },
  lithium_interaction: {
    citation: 'CANMAT & ISBD (2023). Guidelines for the management of patients with bipolar disorder. Canadian Journal of Psychiatry.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11058959/',
  },
};

// ─── Activity category references ─────────────────────────────────────────────
// Keys match CATEGORY_META in app/(tabs)/activities.tsx

export const ACTIVITY_REFS: Record<string, {
  why: string;
  ref: EvidenceRef;
}> = {
  grounding: {
    why: 'Mindfulness-Based Cognitive Therapy (MBCT) reduces depressive symptoms and anxiety in bipolar disorder. Most effective during stable or depressive phases — the evidence does not support it for active manic episodes.',
    ref: {
      citation: 'Sala R et al. (2020). Mindfulness-based cognitive therapy for bipolar disorder: a systematic review and meta-analysis. J Affect Disord.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/32480120/',
    },
  },
  sleep: {
    why: 'Sleep disruption is the most common prodrome of mania (70–80% of patients) and one of the strongest predictors of episode onset. Sleep hygiene activities directly target the most reliable early warning signal in bipolar disorder.',
    ref: {
      citation: 'Carr O et al. (2024). Causal dynamics of sleep, circadian rhythm, and mood symptoms in bipolar disorder. eBioMedicine (The Lancet).',
      url: 'https://www.thelancet.com/journals/ebiom/article/PIIS2352-3964(24)00129-4/fulltext',
    },
  },
  self_esteem: {
    why: 'Psychosocial interventions — including skills training and cognitive approaches targeting self-worth — are among the most evidenced active ingredients for preventing relapse across all phases of bipolar disorder.',
    ref: {
      citation: 'Miklowitz DJ et al. (2021). Psychosocial interventions for bipolar depression: a systematic review and component network meta-analysis. JAMA Psychiatry.',
      url: 'https://jamanetwork.com/journals/jamapsychiatry/fullarticle/2769566',
    },
  },
  forgiveness: {
    why: 'Shame and guilt after manic episodes are pervasive and reduce quality of life and treatment engagement in bipolar disorder. Structured self-forgiveness interventions reduce depression, anger, and distress — with evidence from 14 RCTs.',
    ref: {
      citation: 'Blackburn K et al. (2024). Psychological interventions to promote self-forgiveness: a systematic review. BMC Psychology.',
      url: 'https://link.springer.com/article/10.1186/s40359-024-01671-3',
    },
  },
  reflection: {
    why: 'Group psychoeducation combining structured reflection and illness insight produced 66% fewer manic episodes and 75% fewer depressive episodes at 5-year follow-up — among the largest effect sizes in psychiatric research.',
    ref: {
      citation: 'Colom F & Vieta E et al. (2009). Group psychoeducation for stabilised bipolar disorders: 5-year outcome of a randomised clinical trial. British Journal of Psychiatry.',
      url: 'https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/group-psychoeducation-for-stabilised-bipolar-disorders-5year-outcome-of-a-randomised-clinical-trial/',
    },
  },
  custom: {
    why: 'Behavioural Activation adapted for bipolar disorder — with anti-hypomania guardrails — is feasible and reduces depressive symptoms. Personalised activity scheduling is recommended by CANMAT 2023 as an evidence-based adjuvant therapy.',
    ref: {
      citation: 'Ayre K et al. (2022). Adapted behavioural activation for bipolar depression: a randomised multiple baseline case series. PMC.',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9599144/',
    },
  },
  other: {
    why: 'Behavioural Activation adapted for bipolar disorder — with anti-hypomania guardrails — is feasible and reduces depressive symptoms. Personalised activity scheduling is recommended by CANMAT 2023 as an evidence-based adjuvant therapy.',
    ref: {
      citation: 'Ayre K et al. (2022). Adapted behavioural activation for bipolar depression: a randomised multiple baseline case series. PMC.',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9599144/',
    },
  },
};
