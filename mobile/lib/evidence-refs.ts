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
// Each category has a bipolar-specific ref and a generic (_general) variant.
// Use getActivityRef(category, isBipolar) to pick the right one.

export const ACTIVITY_REFS: Record<string, {
  why: string;
  ref: EvidenceRef;
}> = {
  // ── Bipolar-specific ────────────────────────────────────────────────────────
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
  workbook: {
    why: 'Group psychoeducation produced 66% fewer manic episodes and 75% fewer depressive episodes at 5-year follow-up — the largest effect sizes in bipolar disorder research. It is a first-line adjunct treatment in CANMAT 2023 guidelines.',
    ref: {
      citation: 'Colom F & Vieta E et al. (2009). Group psychoeducation for stabilised bipolar disorders: 5-year outcome of a randomised clinical trial. British Journal of Psychiatry.',
      url: 'https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/group-psychoeducation-for-stabilised-bipolar-disorders-5year-outcome-of-a-randomised-clinical-trial/',
    },
  },
  routine: {
    why: 'Social rhythm regularity — consistent times for waking, eating, social contact, and sleep — is the single strongest behavioural predictor of episode prevention in bipolar disorder. IPSRT landmark RCTs show it extends time to next episode.',
    ref: {
      citation: 'Frank E et al. (2005). Two-year outcomes for interpersonal and social rhythm therapy in individuals with bipolar I disorder. Archives of General Psychiatry.',
      url: 'https://jamanetwork.com/journals/jamapsychiatry/fullarticle/208802',
    },
  },

  // ── Generic (non-bipolar) versions — same keys with _general suffix ──────────
  grounding_general: {
    why: 'Mindfulness-Based Cognitive Therapy (MBCT) is an evidence-based treatment that reduces depressive symptoms, anxiety, and stress across a wide range of mental health conditions. It teaches you to relate to difficult thoughts and feelings differently, reducing their impact.',
    ref: {
      citation: 'Kuyken W et al. (2016). Efficacy of mindfulness-based cognitive therapy in prevention of depressive relapse. JAMA Psychiatry.',
      url: 'https://jamanetwork.com/journals/jamapsychiatry/fullarticle/2517515',
    },
  },
  sleep_general: {
    why: 'Sleep disruption is one of the strongest predictors of mood deterioration across all mental health conditions. Good sleep hygiene — consistent bed and wake times, limited screens before bed, a wind-down routine — is among the most effective and accessible interventions for mental wellbeing.',
    ref: {
      citation: 'Scott AJ et al. (2021). Improving sleep quality leads to better mental health: a meta-analysis of randomised controlled trials. Sleep Medicine Reviews.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/34607008/',
    },
  },
  self_esteem_general: {
    why: 'Cognitive and skills-based interventions targeting self-worth are among the most effective active ingredients in psychological therapy. Building a stable sense of self reduces vulnerability to depression, anxiety, and interpersonal difficulties.',
    ref: {
      citation: 'Sowislo JF & Orth U. (2013). Does low self-esteem predict depression and anxiety? A meta-analysis of longitudinal studies. Psychological Bulletin.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/23163469/',
    },
  },
  forgiveness_general: {
    why: 'Structured self-forgiveness interventions reduce depression, anger, and distress — with evidence from 14 RCTs. Being able to move past self-blame is one of the most powerful factors in sustained mental wellbeing.',
    ref: {
      citation: 'Blackburn K et al. (2024). Psychological interventions to promote self-forgiveness: a systematic review. BMC Psychology.',
      url: 'https://link.springer.com/article/10.1186/s40359-024-01671-3',
    },
  },
  reflection_general: {
    why: 'Structured reflection and psychoeducation — understanding your patterns, triggers, and responses — improve self-management, reduce symptoms, and help you feel more in control of your mental health.',
    ref: {
      citation: 'Donker T et al. (2009). Psychoeducation for depression, anxiety and psychological distress: a meta-analysis. BMC Medicine.',
      url: 'https://bmcmedicine.biomedcentral.com/articles/10.1186/1741-7015-7-79',
    },
  },
  custom_general: {
    why: 'Behavioural Activation — scheduling meaningful, mood-lifting activities — is one of the most effective evidence-based treatments for depression and low mood. Personalised activity scheduling improves mood, energy, and motivation.',
    ref: {
      citation: 'Ekers D et al. (2014). Behavioural activation for depression: an update of meta-analysis of effectiveness and sub-group analysis. PLOS ONE.',
      url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0100100',
    },
  },
  other_general: {
    why: 'Behavioural Activation — scheduling meaningful, mood-lifting activities — is one of the most effective evidence-based treatments for depression and low mood. Personalised activity scheduling improves mood, energy, and motivation.',
    ref: {
      citation: 'Ekers D et al. (2014). Behavioural activation for depression: an update of meta-analysis of effectiveness and sub-group analysis. PLOS ONE.',
      url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0100100',
    },
  },
  workbook_general: {
    why: 'Psychoeducation — understanding your mental health patterns, triggers, and early warning signs — consistently improves outcomes across mood and anxiety disorders. A structured wellness workbook builds the self-awareness that is the foundation of lasting change.',
    ref: {
      citation: 'Donker T et al. (2009). Psychoeducation for depression, anxiety and psychological distress: a meta-analysis. BMC Medicine.',
      url: 'https://bmcmedicine.biomedcentral.com/articles/10.1186/1741-7015-7-79',
    },
  },
  routine_general: {
    why: 'Regular daily routines — consistent sleep/wake times, meals, exercise, and social contact — are among the strongest behavioural predictors of mood stability and resilience. Establishing healthy daily rhythms reduces vulnerability to stress, anxiety, and low mood.',
    ref: {
      citation: 'Serin Y & Acar Tek N. (2019). Effect of circadian rhythm on metabolic processes and the regulation of energy balance. Annals of Nutrition and Metabolism.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/31455770/',
    },
  },
};

/**
 * Returns the right evidence ref for a category based on the BIPOLAR flag.
 * Falls back to the bipolar version if no generic version exists.
 */
export function getActivityRef(
  category: string,
  bipolar: boolean,
): typeof ACTIVITY_REFS[string] | undefined {
  if (!bipolar) {
    const generic = ACTIVITY_REFS[`${category}_general`];
    if (generic) return generic;
  }
  return ACTIVITY_REFS[category];
}
