import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../lib/supabase';
import type { WorkbookResponse } from '../types/database';
import { parseSupabaseTs, fmtLocalTime, fmtTimestamp } from '../utils/timestamps';

// ─── Clinical Content ──────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: 'Understanding Your Bipolar Patterns',
    icon: '🌊',
    sectionHelp: 'Psychoeducation is one of the strongest evidence-based tools for bipolar disorder. Understanding your personal pattern of moods — their texture, timing, and rhythm — reduces fear, improves self-management, and helps you communicate your experience to others.',
    prompts: [
      {
        q: 'What does a stable period feel like for you?',
        sub: 'How does stability show up physically, emotionally, and in your relationships?',
        help: 'Establishing a clear picture of your baseline is foundational to self-monitoring. Research in psychoeducation for bipolar disorder shows that people who can clearly describe their stable state are significantly better at detecting early departures from it — the first step in preventing episodes from escalating.',
      },
      {
        q: 'Describe an elevated (hypomanic or manic) episode.',
        sub: 'What were the first signs you noticed, and how did the experience progress over time?',
        help: 'Recognising early warning signs is fundamental to episode prevention. Clinical research emphasises that identifying prodromal symptoms — the earliest changes before a full episode — allows for prompt intervention that can minimise episode intensity. Early intervention is particularly crucial as insight often diminishes once an episode fully develops.',
      },
      {
        q: 'Describe a depressive episode.',
        sub: 'What does low mood feel like in your body, your thoughts, and your daily life?',
        help: 'Depression in bipolar disorder has distinct features from unipolar depression, including a higher likelihood of hypersomnia, psychomotor changes, and mood reactivity. Mapping your personal depressive signature improves treatment response and helps you and your care team distinguish between depressive episodes and normal low mood.',
      },
      {
        q: 'How long do your episodes typically last, and how quickly do they shift?',
        sub: 'Are your cycles rapid, seasonal, or linked to particular life circumstances?',
        help: 'Episode duration and cycle frequency are clinically important variables that inform medication choices and behavioural interventions. Identifying your personal cycle pattern also helps set realistic expectations and reduces the distress of thinking each mood shift signals a new episode.',
      },
      {
        q: 'What patterns have you noticed about the timing or sequence of your mood states?',
        sub: 'For example: does depression tend to follow mania? Are certain seasons harder?',
        help: 'Pattern recognition is a core component of mood charting, one of the most evidence-supported self-management strategies for bipolar disorder. Seasonal patterns in particular respond well to targeted interventions such as light therapy or adjusted medication timing.',
      },
      {
        q: 'How has your experience of bipolar disorder changed over the years?',
        sub: 'Consider your earliest episodes versus now — what have you learned, and how has your relationship to the condition evolved?',
        help: 'Longitudinal self-reflection builds illness narrative, a therapeutic construct associated with greater acceptance, reduced stigma, and improved adherence. People who can tell a coherent story about their condition are more likely to engage proactively with treatment.',
      },
      {
        q: 'If you could explain your bipolar experience to someone who has never had it, what would you want them to understand?',
        sub: 'What do you wish more people knew — about the condition itself, or about what it is like from the inside?',
        help: 'Articulating your experience builds narrative identity, which narrative therapy research links to reduced shame and greater self-compassion. This reflection also prepares you for disclosure conversations with family, employers, or new relationships — which research shows are more positive when planned and intentional.',
      },
    ],
  },
  {
    title: 'Exploring Emotional Triggers',
    icon: '🌿',
    sectionHelp: 'Identifying triggers does not mean you can eliminate all risk — but it gives you a map. When you know which events, environments, thoughts, and relationships tend to precede episodes, you can prepare, adjust, and sometimes intervene before a shift escalates.',
    prompts: [
      {
        q: 'What life events have most reliably come before elevated episodes?',
        sub: 'Consider travel, deadlines, celebrations, conflict, new opportunities, reduced sleep, or substance use.',
        help: 'Goal attainment events — achievements, new relationships, exciting opportunities — are a well-documented trigger for hypomania and mania, alongside sleep loss and substance use. Identifying your specific high-risk events allows you to build a preparedness plan rather than being caught off-guard by predictable triggers.',
      },
      {
        q: 'What life events have most reliably come before depressive episodes?',
        sub: 'Consider loss, rejection, disappointment, isolation, prolonged stress, or the crash after an elevated period.',
        help: 'Post-manic depression — the depressive episode that often follows an elevated one — is one of the most common and least discussed patterns in bipolar disorder. Recognising this as a predictable phase rather than a separate failure can reduce self-blame and allow for proactive self-care during the anticipated transition.',
      },
      {
        q: 'Which environments tend to destabilise your mood?',
        sub: 'Think about busy social settings, isolation, specific workplaces, noise levels, light, or particular cities or homes.',
        help: 'Environmental triggers operate through sensory overload, circadian disruption, and social stress pathways. Identifying high-risk environments — and the specific features that make them risky — enables targeted environmental modifications. Even small changes (noise-cancelling headphones, blackout curtains, planned quiet time after busy events) can significantly reduce episode frequency.',
      },
      {
        q: 'Which relationships tend to affect your mood most strongly, and in what direction?',
        sub: 'Name the people who tend to stabilise you as well as those who tend to dysregulate you.',
        help: 'Expressed emotion (EE) research consistently shows that relationships characterised by high criticism, hostility, or emotional over-involvement increase relapse rates in mood disorders. Identifying both protective and destabilising relationships allows for strategic relationship management — including setting limits, preparing for high-EE interactions, and investing in stabilising connections.',
      },
      {
        q: 'What thought patterns or beliefs tend to appear before or during a mood shift?',
        sub: 'For example: "I don\'t need sleep tonight," "Nothing matters anyway," "I can handle everything," "No one understands me."',
        help: 'Cognitive early warning signs often precede behavioural and emotional changes. CBT for bipolar disorder specifically targets the identification of mood-congruent thinking (grandiosity in mania, hopelessness in depression) as an early intervention point. Catching the thought before it becomes a behaviour is one of the highest-leverage skills in the toolkit.',
      },
      {
        q: 'What role does sleep disruption play in triggering or worsening your episodes?',
        sub: 'Reflect on your personal relationship to sleep — both as a trigger and as an early warning sign.',
        help: 'Sleep disruption is both a trigger and a prodromal symptom of bipolar episodes, particularly mania. The biological relationship is bidirectional: sleep loss can induce mania, and emerging mania reduces the need for sleep. Sleep regularity — going to bed and waking at consistent times — is one of the most powerful and modifiable risk factors within your control.',
      },
      {
        q: 'Are there any triggers that surprise you — ones that seem small but have outsized effects?',
        sub: 'Sometimes a song, a smell, an anniversary, or a seemingly minor event carries unexpected emotional weight.',
        help: 'Idiosyncratic triggers — those specific to your history rather than universally recognised — are often overlooked in standard psychoeducation but are highly predictive for the individual. Identifying them, even when they seem disproportionate, honours the reality that your nervous system has learned specific threat and reward associations that are real and worth mapping.',
      },
    ],
  },
  {
    title: 'Cultivating Healthy Routines',
    icon: '☀️',
    sectionHelp: 'Social Rhythm Therapy (SRT) — the evidence base behind routine for bipolar disorder — shows that stabilising daily rhythms (sleep/wake times, meals, social contact) directly stabilises mood. Routine is not a cage; it is the scaffold that creates freedom.',
    prompts: [
      {
        q: 'What does your current morning routine look like?',
        sub: 'How does the shape of your morning affect your mood for the rest of the day?',
        help: 'Morning light exposure, consistent wake time, and a structured first hour are among the most evidence-supported circadian stabilisers for bipolar disorder. Social Rhythm Therapy specifically uses morning routine as an anchor point because the wake time sets the tone for the entire daily rhythm, including melatonin onset that evening.',
      },
      {
        q: 'How consistent is your sleep schedule?',
        sub: 'What happens to your mood when sleep is disrupted — and what gets in the way of maintaining a regular schedule?',
        help: 'Sleep regularity — maintaining consistent sleep and wake times, even on weekends — has been shown to reduce episode frequency independent of sleep duration. Irregular sleep schedules disrupt circadian rhythms, which are inherently dysregulated in bipolar disorder. Even a 30-minute shift in sleep timing can affect mood the following day.',
      },
      {
        q: 'What daily anchors most reliably support your stability?',
        sub: 'Consider meals, exercise, medication timing, social contact, and work or creative rhythms.',
        help: 'In Social Rhythm Therapy, "social zeitgebers" (time-givers) are the daily social cues — meals, exercise, contact with others — that synchronise your internal biological clock. Identifying your most powerful anchor events and protecting them during high-risk periods is a core SRT strategy with strong clinical trial evidence for relapse prevention.',
      },
      {
        q: 'What routines tend to break down first when your mood is shifting?',
        sub: 'When you notice yourself stopping or changing a particular habit, what does that usually signal?',
        help: 'Routine breakdown is both a consequence and a cause of mood instability — and an early warning sign. Identifying which routines collapse first (e.g., skipping meals, stopping exercise, staying up later) gives you a personalised behavioural early-warning system that is often more detectable than internal mood shifts.',
      },
      {
        q: 'What does a day look like when you are truly taking good care of yourself?',
        sub: 'Describe your ideal day honestly — and name the real barriers that make it hard to sustain.',
        help: 'Behavioural activation research shows that identifying specific positive activities — not just abstract goals — and protecting them during low periods significantly reduces depressive episode duration. The barriers you identify are equally important: addressing them practically is more effective than relying on motivation alone.',
      },
      {
        q: 'How does your relationship with physical movement and your body affect your mood?',
        sub: 'What forms of movement help you, and what gets in the way of accessing them?',
        help: 'Moderate aerobic exercise has robust evidence as a mood stabiliser in bipolar disorder, comparable in effect size to some medications for depression. It also improves sleep quality, reduces anxiety, and supports circadian rhythm regulation. The key is finding movement that feels sustainable across mood states — not just when motivation is high.',
      },
      {
        q: 'What is one small, realistic change to your daily routine that would most support your wellbeing right now?',
        sub: 'Resist the urge to overhaul everything. What is one concrete thing you could do differently tomorrow?',
        help: 'Implementation intention research — "I will do X at time Y in context Z" — shows that specific, small commitments are far more likely to become habits than broad resolutions. Behavioural change in bipolar disorder is most effective when it starts with the minimum viable change rather than a comprehensive plan that collapses under the weight of a mood shift.',
      },
    ],
  },
  {
    title: 'Strengthening Emotional Regulation',
    icon: '🧘',
    sectionHelp: 'Emotional regulation skills from DBT and CBT give you a toolkit for working with intense emotions without acting on them impulsively or suppressing them entirely. These skills are most effective when practised during stable periods so they are available when you need them most.',
    prompts: [
      {
        q: 'What emotions are hardest for you to tolerate?',
        sub: 'What do you tend to do when those emotions become overwhelming?',
        help: 'Emotional dysregulation is a core feature of bipolar disorder, present even between episodes. DBT was developed specifically for severe emotional dysregulation and has strong evidence for reducing impulsive behaviours and improving distress tolerance. Naming your specific intolerable emotions is the first step in choosing targeted regulation strategies.',
      },
      {
        q: 'What does it feel like in your body when you are becoming emotionally dysregulated?',
        sub: 'What physical sensations appear before you are fully in the grip of an overwhelming emotion?',
        help: 'Somatic early warning signs — chest tightness, jaw clenching, restlessness, heat — are often detectable before conscious awareness of emotional dysregulation. Body-based awareness is a foundational skill in both DBT and somatic approaches to emotion regulation. Learning to read your body\'s signals creates a larger window for choosing a response rather than reacting automatically.',
      },
      {
        q: 'Which grounding techniques have worked for you in moments of high emotion or dissociation?',
        sub: 'Consider breath work, cold water, movement, sensory anchoring (5-4-3-2-1), music, prayer, or meditation.',
        help: 'Grounding techniques work by activating the parasympathetic nervous system and redirecting attention to present-moment sensory experience, interrupting the escalation cycle. Research on distress tolerance shows that having a personalised toolkit — rather than a generic list — dramatically increases the likelihood of actually using a technique during a crisis.',
      },
      {
        q: 'How do you tend to treat yourself when you make mistakes or experience setbacks?',
        sub: 'Is your inner voice more like a harsh critic, or more like a wise and compassionate friend?',
        help: 'Self-compassion — treating yourself with the same kindness you would offer a close friend in difficulty — is strongly associated with psychological resilience and reduced depression severity. Research by Kristin Neff and colleagues shows that self-compassion does not reduce motivation or accountability; it actually increases them by removing the paralysing effect of shame.',
      },
      {
        q: 'What beliefs about emotions do you hold that might make them harder to process?',
        sub: 'For example: "I shouldn\'t feel this way," "Strong people don\'t cry," or "My feelings are dangerous."',
        help: 'Emotion beliefs — often inherited from family, culture, or past experiences of having emotions dismissed or punished — directly affect how we respond to emotional experience. CBT identifies these as "secondary emotions" (feeling shame about feeling sad, for example) that amplify distress beyond the original feeling. Identifying and gently questioning these beliefs is a high-leverage therapeutic move.',
      },
      {
        q: 'Describe a time you managed a difficult emotion skilfully.',
        sub: 'What were the conditions that made it possible? What did you actually do?',
        help: 'Identifying personal evidence of emotional competence counteracts the narrative that you are "bad at emotions" — a common and damaging self-belief in people with mood disorders. Solution-focused therapy uses this technique ("exception finding") to build on existing strengths rather than cataloguing deficits. Your past successes are more instructive than any generic technique list.',
      },
      {
        q: 'What would it mean for you to "ride the wave" of an emotion without acting on it or suppressing it?',
        sub: 'What gets in the way of letting an emotion rise, peak, and naturally fall without intervening?',
        help: 'Emotion surfing — allowing an emotion to complete its natural arc rather than cutting it short through suppression or amplifying it through rumination — is a core mindfulness-based skill. Research shows that emotions, when not fed by thought or behaviour, typically peak and begin to subside within 60–90 seconds. The problem is rarely the emotion itself; it is our response to the emotion.',
      },
    ],
  },
  {
    title: 'Building Supportive Connections',
    icon: '🤝',
    sectionHelp: 'Isolation is both a symptom and a risk factor for bipolar episodes. Research consistently shows that social support — when it is the right kind — is one of the strongest protective factors. This section helps you map, deepen, and communicate your support needs honestly.',
    prompts: [
      {
        q: 'Who in your life knows about your bipolar diagnosis?',
        sub: 'How did you decide to tell them — and what was that experience like?',
        help: 'Strategic disclosure — sharing your diagnosis with people who need to know, in a way you feel in control of — is associated with reduced shame and better support outcomes. Research on mental health disclosure shows that planned disclosure (choosing when, what, and to whom) is far more positive in its effects than disclosure during a crisis or by accident.',
      },
      {
        q: 'Who are the people who most reliably support you?',
        sub: 'What does good support from them actually look like — specifically?',
        help: 'Perceived social support — the sense that others are available and responsive — is one of the strongest protective factors against relapse in mood disorders. Importantly, "support" is not generic: what helps you may be very different from what helps someone else. Making your support needs explicit (to yourself and others) dramatically increases the chance of receiving the kind of support that actually works.',
      },
      {
        q: 'Are there relationships in your life that tend to dysregulate or exhaust you?',
        sub: 'You don\'t have to eliminate them — but how do you currently manage their impact on your mood?',
        help: 'High expressed emotion (EE) — criticism, hostility, or emotional over-involvement from close others — is one of the most replicated predictors of relapse across mood and psychotic disorders. Naming the impact of difficult relationships is not about blame; it is about making informed choices about how much contact to have, how to prepare for interactions, and what limits to set.',
      },
      {
        q: 'What do you wish the people closest to you understood about your experience of bipolar disorder?',
        sub: 'Consider writing this as a letter — one you may or may not choose to share.',
        help: 'Unexpressed needs in close relationships accumulate as resentment and emotional distance, both of which worsen mental health outcomes. Family psychoeducation research shows that when loved ones understand the nature and experience of bipolar disorder, relationship quality improves and relapse rates decrease significantly. This reflection is the beginning of that communication.',
      },
      {
        q: 'How do you tend to communicate your needs when you are struggling?',
        sub: 'What gets in the way of asking for help — shame, not wanting to be a burden, uncertainty about what you need?',
        help: 'Help-seeking is a learned skill, not a personality trait. People with bipolar disorder often have complex relationships with help-seeking: sometimes seeking too much support during an episode, sometimes withdrawing completely during depression. Identifying your personal barriers to help-seeking is the first step in building more consistent access to support when you need it.',
      },
      {
        q: 'What does your support network look like right now — and where are the gaps?',
        sub: 'Consider close friends, family, professional support, peer support groups, and community connections.',
        help: 'Resilience research describes the importance of a diverse support network — not relying on one or two people for all your support needs. Peer support in particular (connection with others who have lived experience of mental illness) is increasingly recognised as having unique benefits that professional support cannot fully replicate, including reduced stigma and hope based on shared experience.',
      },
      {
        q: 'How has bipolar disorder affected your relationships?',
        sub: 'Include both the losses and what you have built or rebuilt in spite of the challenges.',
        help: 'Post-traumatic growth research documents that many people report meaningful relationship deepening following mental health crises — alongside the losses. Holding both realities honestly, rather than adopting either a purely negative or a purely positive narrative, is associated with greater psychological integration and realistic hope for the future.',
      },
    ],
  },
  {
    title: 'Crisis Prevention and Safety Planning',
    icon: '🔔',
    sectionHelp: 'A safety plan is a personalised, practical document you create during a stable period to guide your actions during a crisis. Research shows that having a written safety plan significantly reduces hospital admissions and helps people feel more in control of their care.',
    prompts: [
      {
        q: 'What are your personal early warning signs of an approaching crisis?',
        sub: 'The subtle shifts that others might not notice — but that you, on reflection, have come to recognise.',
        help: 'Recognising early warning signs is fundamental to episode prevention. Clinical research emphasises that identifying prodromal symptoms — the earliest changes before a full episode — allows for prompt intervention that can minimise episode intensity. Early intervention is particularly crucial as insight often diminishes once an episode fully develops.',
      },
      {
        q: 'What internal strategies have helped you de-escalate in a crisis moment?',
        sub: 'Things you can do on your own, without needing to contact anyone else.',
        help: 'Internal coping strategies are the first line of defence in a safety plan. Research on crisis intervention shows that having pre-committed, personally meaningful self-soothing strategies reduces both the duration and severity of crisis states. These need to be specific ("walk to the park for 20 minutes") rather than abstract ("go outside") to be effective under cognitive load.',
      },
      {
        q: 'Who would you contact first if you were in crisis?',
        sub: 'Do they know they are on your list — and have they agreed to this role?',
        help: 'The presence of a named contact person in a safety plan is strongly associated with better outcomes in mental health crises. The relationship must be genuine and pre-arranged: calling someone in crisis who is unprepared can itself become a destabilising experience. Having explicit conversations about this role during stable periods is an act of care for both you and the person you are asking.',
      },
      {
        q: 'What professional resources do you have access to?',
        sub: 'Psychiatrist, GP, crisis line, emergency department — and how would you access each one in a crisis?',
        help: 'Knowing the precise path to professional help before you need it removes a significant cognitive and practical barrier during a crisis. Research on help-seeking shows that during acute episodes, the ability to plan and sequence steps is significantly impaired. A written plan with names, numbers, and steps acts as cognitive scaffolding when your own cognitive resources are depleted.',
      },
      {
        q: 'What tends to make a crisis worse?',
        sub: 'And how might you reduce access to those things during high-risk periods?',
        help: 'Means restriction — reducing access to things that amplify a crisis — is one of the most evidence-supported safety strategies available. This includes substances, certain people, impulsive financial decisions, and, critically, means of self-harm. Identifying these in advance and making a specific plan to reduce access during high-risk periods is a concrete and effective intervention.',
      },
      {
        q: 'What helps you feel safe, grounded, or cared for when you are in crisis?',
        sub: 'A specific place, person, object, ritual, or experience — as concrete and personal as possible.',
        help: 'Safety and comfort during crisis are highly personal. Generic interventions are far less effective than personalised ones. Identifying your specific sources of safety — and making them as accessible as possible in advance (saving playlists, keeping an object nearby, knowing where to go) — makes them available when you most need them and are least able to search for them.',
      },
      {
        q: 'After previous difficult episodes, what do you wish had been done differently?',
        sub: 'By you, by those around you, or by the services you encountered.',
        help: 'Post-episode reflection — conducted during a stable period — is a powerful source of information for crisis planning. Research on psychiatric advance directives shows that preferences expressed in advance (about medication, hospitalisation, contact with family) are rarely captured but dramatically improve people\'s sense of control and dignity during future episodes. This reflection is the starting point.',
      },
    ],
  },
  {
    title: 'Long-Term Recovery and Meaningful Living',
    icon: '✨',
    sectionHelp: 'Recovery from bipolar disorder is not the absence of episodes — it is building a life that is meaningful, connected, and resilient despite them. This section draws on Positive Psychology and narrative therapy to help you connect with what matters most and build toward it.',
    prompts: [
      {
        q: 'What does "living well with bipolar disorder" mean to you?',
        sub: 'In your own words — not a clinical definition, but your personal vision of recovery.',
        help: 'Recovery-oriented approaches in mental health have shifted from symptom reduction as the sole goal to a broader vision of meaningful, self-directed living. Research by Andresen and colleagues identifies hope, identity, meaning, and responsibility as the four core processes of personal recovery — all of which are activated by articulating your own vision of what a good life looks like.',
      },
      {
        q: 'What strengths, skills, or qualities has navigating bipolar disorder developed in you?',
        sub: 'Empathy, self-awareness, resilience, creativity — name the ones that feel genuinely yours.',
        help: 'Post-traumatic growth research documents that many people with serious mental illness report gains in personal strength, appreciation for life, relating to others, and sense of spiritual or existential meaning alongside their struggles. Identifying these gains is not about minimising the real costs of the illness — it is about holding a fuller and more accurate picture of your experience.',
      },
      {
        q: 'What do you value most in life?',
        sub: 'How does your management of bipolar disorder support or conflict with those values?',
        help: 'Acceptance and Commitment Therapy (ACT) identifies values clarification as central to psychological flexibility and sustained behaviour change. When your management strategies are connected to your personal values — rather than external rules or fear — adherence becomes intrinsically motivated. Values-based living is associated with greater life satisfaction and reduced depression severity.',
      },
      {
        q: 'What goals or dreams feel most important to you right now?',
        sub: 'How does bipolar disorder interact with them — as a barrier, a complication, or sometimes an unlikely source of insight?',
        help: 'Goal setting with bipolar disorder requires nuance: goals that are overly ambitious may trigger hypomanic pursuit, while goals set too conservatively can confirm a limiting illness narrative. Research on functional recovery in bipolar disorder shows that people do best when goals are meaningful, realistic, and broken into steps that remain achievable across varying mood states.',
      },
      {
        q: 'What has bipolar disorder taken from you?',
        sub: 'And what grief or loss from the illness still feels unprocessed or unacknowledged?',
        help: 'Grief about the impact of bipolar disorder — lost relationships, interrupted careers, opportunities not taken, versions of yourself you mourn — is legitimate and clinically important. Unprocessed grief accumulates as chronic low-grade depression, shame, and bitterness. Naming loss explicitly is the first step in moving through it rather than around it.',
      },
      {
        q: 'What role does meaning, purpose, or spirituality play in your resilience and recovery?',
        sub: 'This might be religious, secular, relational, creative, or something harder to name.',
        help: 'Meaning and purpose are strongly associated with mental health resilience across cultures and conditions. Viktor Frankl\'s logotherapy, positive psychology research by Seligman and colleagues, and recovery-oriented mental health frameworks all converge on the finding that a sense of purpose is one of the most powerful buffers against despair — particularly relevant during depressive episodes.',
      },
      {
        q: 'Looking back from five years in the future, what do you hope to have built, healed, or understood?',
        sub: 'About yourself, your relationships, your life — and your relationship with bipolar disorder itself.',
        help: 'Prospective self-reflection — imagining your future self looking back — activates the prefrontal cortex\'s capacity for long-range planning and reduces the dominance of present-state mood on decision-making. This technique, used in motivational interviewing and future-self research, builds hope as a concrete cognitive skill rather than a passive wish.',
      },
    ],
  },
];

// ─── Appendix ─────────────────────────────────────────────────────────────────

const APPENDIX_ITEMS = [
  {
    title: '5-4-3-2-1 Grounding',
    icon: '🖐️',
    body: 'Name 5 things you can see · 4 things you can touch · 3 things you can hear · 2 things you can smell · 1 thing you can taste. This activates the parasympathetic nervous system and anchors you in the present moment.',
  },
  {
    title: 'Box Breathing',
    icon: '🫁',
    body: 'Inhale for 4 counts · Hold for 4 counts · Exhale for 4 counts · Hold for 4 counts. Repeat 4–6 cycles. Used by military, athletes, and therapists to rapidly reduce physiological arousal.',
  },
  {
    title: 'Early Warning Signs Checklist',
    icon: '🔍',
    body: 'Elevated: reduced need for sleep, racing thoughts, increased talkativeness, impulsivity, grandiosity, spending, hypersexuality, irritability.\n\nDepressed: sleeping too much or too little, losing interest in pleasurable things, withdrawing, slowed thinking, hopelessness, guilt, appetite changes, thoughts of death.',
  },
  {
    title: 'Crisis Plan Template',
    icon: '🛟',
    body: '1. My warning signs: [complete in Prompt 1 of Section 6]\n2. My coping strategies: [from Prompt 2]\n3. People I can call: [from Prompt 3]\n4. Professional contacts: [from Prompt 4]\n5. Things that make it worse (to avoid): [from Prompt 5]\n6. What helps me feel safe: [from Prompt 6]',
  },
  {
    title: 'The STOP Skill (DBT)',
    icon: '🛑',
    body: 'Stop — do not act on the urge.\nTake a step back — breathe, pause.\nObserve — what am I thinking and feeling? What is the situation?\nProceed mindfully — what would help, not harm, right now?\n\nUse this when emotion mind is pulling toward an impulsive action.',
  },
  {
    title: 'Opposite Action (DBT)',
    icon: '🔄',
    body: 'When an emotion is prompting an unhelpful action, try the opposite:\n· Shame → reach out instead of hiding\n· Fear → approach (gently) instead of avoiding\n· Depression → activate (one small step) instead of withdrawing\n· Anger → be kind instead of attacking\n\nThis works because action changes emotion — not just the reverse.',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const SAGE = '#A8C5A0';
const CHARCOAL = '#3D3935';
const SURFACE = '#F7F3EE';
const TOTAL_PROMPTS = SECTIONS.length * 7; // 49

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Entry history row ────────────────────────────────────────────────────────

function EntryHistory({ entries }: { entries: WorkbookResponse[] }) {
  if (entries.length === 0) return null;
  return (
    <View style={eh.wrap}>
      <Text style={eh.heading}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
      {entries.map((e) => (
        <View key={e.id} style={eh.entry}>
          <Text style={eh.timestamp}>{fmtTimestamp(e.created_at)}</Text>
          <Text style={eh.text}>{e.response}</Text>
        </View>
      ))}
    </View>
  );
}

const eh = StyleSheet.create({
  wrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingTop: 12 },
  heading: { fontSize: 10, fontWeight: '700', color: CHARCOAL, opacity: 0.3, letterSpacing: 0.8, marginBottom: 10 },
  entry: {
    backgroundColor: SURFACE, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: SAGE,
  },
  timestamp: { fontSize: 11, color: SAGE, fontWeight: '600', marginBottom: 4 },
  text: { fontSize: 13, color: CHARCOAL, lineHeight: 20, opacity: 0.85 },
});

// ─── Appendix card ────────────────────────────────────────────────────────────

function AppendixCard({ item }: { item: typeof APPENDIX_ITEMS[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={ap.card}
      onPress={() => setOpen((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={ap.row}>
        <Text style={ap.icon}>{item.icon}</Text>
        <Text style={ap.title}>{item.title}</Text>
        <Text style={ap.chevron}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && <Text style={ap.body}>{item.body}</Text>}
    </TouchableOpacity>
  );
}

const ap = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0EDE8',
    shadowColor: CHARCOAL, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    overflow: 'hidden', padding: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 18 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: CHARCOAL },
  chevron: { fontSize: 11, color: CHARCOAL, opacity: 0.35 },
  body: { marginTop: 12, fontSize: 13, color: CHARCOAL, lineHeight: 21, opacity: 0.7 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkbookScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const userId = session?.user.id;

  const [responses, setResponses] = useState<WorkbookResponse[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [showAppendix, setShowAppendix] = useState(false);
  // draft per prompt key `${section}-${pi}`
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [hintOpen, setHintOpen] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (userId) loadResponses();
  }, [userId]);

  async function loadResponses() {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from('workbook_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setResponses(data as WorkbookResponse[]);
  }

  // All entries for a specific section+prompt, newest first
  function getEntries(section: number, pi: number): WorkbookResponse[] {
    return responses
      .filter((r) => r.chapter === section + 1 && r.prompt_index === pi)
      .sort((a, b) => parseSupabaseTs(b.created_at).getTime() - parseSupabaseTs(a.created_at).getTime());
  }

  function getDraft(section: number, pi: number): string {
    return drafts[`${section}-${pi}`] ?? '';
  }

  async function addEntry(section: number, pi: number) {
    const key = `${section}-${pi}`;
    const text = getDraft(section, pi).trim();
    if (!userId || !text) return;

    setSaving((s) => ({ ...s, [key]: true }));

    const now = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from('workbook_responses')
      .insert({
        user_id: userId,
        chapter: section + 1,
        prompt_index: pi,
        response: text,
        entry_date: todayISO(),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (data) {
      setResponses((prev) => [data as WorkbookResponse, ...prev]);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    } else if (error) {
      // Unique constraint still active — fall back to upsert
      const { data: upserted } = await (supabase as any)
        .from('workbook_responses')
        .upsert({
          user_id: userId,
          chapter: section + 1,
          prompt_index: pi,
          response: text,
          entry_date: todayISO(),
          created_at: now,
          updated_at: now,
        }, { onConflict: 'user_id,chapter,prompt_index' })
        .select()
        .single();
      if (upserted) {
        setResponses((prev) => {
          const without = prev.filter(
            (r) => !(r.chapter === section + 1 && r.prompt_index === pi),
          );
          return [upserted as WorkbookResponse, ...without];
        });
        setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
      }
    }

    setSaving((s) => ({ ...s, [key]: false }));
  }

  // Progress: count distinct (chapter, prompt_index) pairs answered
  const answeredKeys = new Set(responses.map((r) => `${r.chapter}-${r.prompt_index}`));
  const totalAnswered = answeredKeys.size;
  const progressPct = Math.min((totalAnswered / TOTAL_PROMPTS) * 100, 100);

  function sectionAnswered(si: number): number {
    return [0, 1, 2, 3, 4, 5, 6].filter((pi) => answeredKeys.has(`${si + 1}-${pi}`)).length;
  }

  function switchSection(si: number) {
    setActiveSection(si);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const sec = SECTIONS[activeSection];

  return (
    <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.privacyBadge}>
            <Text style={s.privacyBadgeText}>🔒 Private</Text>
          </View>
        </View>

        {/* Header */}
        <Text style={s.title}>Bipolar Workbook</Text>
        <Text style={s.subtitle}>Evidence-based CBT & DBT · 7 sections · 49 prompts</Text>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={s.progressLabel}>{totalAnswered} / {TOTAL_PROMPTS}</Text>
        </View>

        {/* Section nav — horizontally scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sectionNavContent}
          style={s.sectionNav}
        >
          {SECTIONS.map((sec, si) => {
            const count = sectionAnswered(si);
            const complete = count >= 7;
            const active = activeSection === si;
            return (
              <TouchableOpacity
                key={si}
                style={[s.sectionTab, active && s.sectionTabActive]}
                onPress={() => switchSection(si)}
                activeOpacity={0.7}
              >
                <Text style={s.sectionTabIcon}>{complete ? '✓' : sec.icon}</Text>
                <Text style={[s.sectionTabLabel, active && { color: SAGE, fontWeight: '700', opacity: 1 }]} numberOfLines={2}>
                  {sec.title}
                </Text>
                {/* Mini progress dots */}
                <View style={s.miniDotRow}>
                  {[0, 1, 2, 3, 4, 5, 6].map((pi) => (
                    <View
                      key={pi}
                      style={[s.miniDot, answeredKeys.has(`${si + 1}-${pi}`) && { backgroundColor: SAGE }]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section header card */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>{sec.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionNum}>Section {activeSection + 1} of {SECTIONS.length}</Text>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>
            {sectionAnswered(activeSection) >= 7 && (
              <View style={s.completeBadge}>
                <Text style={s.completeBadgeText}>Complete ✓</Text>
              </View>
            )}
          </View>

          {/* Section overview */}
          <View style={s.howItHelpsBox}>
            <Text style={s.howItHelpsLabel}>ABOUT THIS SECTION</Text>
            <Text style={s.howItHelpsText}>{sec.sectionHelp}</Text>
          </View>
        </View>

        {/* Prompts */}
        {sec.prompts.map((prompt, pi) => {
          const key = `${activeSection}-${pi}`;
          const draft = getDraft(activeSection, pi);
          const entries = getEntries(activeSection, pi);
          const isSaving = saving[key] ?? false;
          const canAdd = draft.trim().length > 0 && !isSaving;

          return (
            <View key={pi} style={s.promptCard}>
              <View style={[s.promptAccent, entries.length > 0 && { backgroundColor: SAGE }]} />
              <View style={s.promptBody}>
                <View style={s.promptLabelRow}>
                  <Text style={s.promptLabel}>PROMPT {pi + 1} OF 7</Text>
                  {entries.length > 0 && (
                    <Text style={s.entryCount}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
                  )}
                </View>
                <Text style={s.promptText}>{prompt.q}</Text>
                <Text style={s.promptSub}>{prompt.sub}</Text>

                {/* How it helps — collapsible */}
                <TouchableOpacity
                  style={s.hintToggle}
                  onPress={() => setHintOpen((o) => ({ ...o, [key]: !o[key] }))}
                  activeOpacity={0.7}
                >
                  <Text style={s.hintToggleTxt}>💡 How it helps</Text>
                  <Text style={s.hintChevron}>{hintOpen[key] ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {hintOpen[key] && (
                  <Text style={s.promptHint}>{prompt.help}</Text>
                )}

                {/* New entry input */}
                <TextInput
                  ref={(r) => { inputRefs.current[key] = r; }}
                  style={s.input}
                  value={draft}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [key]: t }))}
                  placeholder={entries.length > 0 ? 'Add another reflection…' : 'Write your response…'}
                  placeholderTextColor={CHARCOAL + '30'}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[s.addBtn, !canAdd && s.addBtnDisabled]}
                  onPress={() => addEntry(activeSection, pi)}
                  disabled={!canAdd}
                  activeOpacity={0.7}
                >
                  <Text style={[s.addBtnTxt, !canAdd && s.addBtnTxtDisabled]}>
                    {isSaving ? 'Saving…' : '+ Add entry'}
                  </Text>
                </TouchableOpacity>

                {/* Past entries */}
                <EntryHistory entries={entries} />
              </View>
            </View>
          );
        })}

        {/* Next / Prev section navigation */}
        <View style={s.sectionNavBtns}>
          {activeSection > 0 && (
            <TouchableOpacity
              style={s.navBtn}
              onPress={() => switchSection(activeSection - 1)}
              activeOpacity={0.7}
            >
              <Text style={s.navBtnTxt}>← {SECTIONS[activeSection - 1].title.split(' ').slice(0, 2).join(' ')}</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {activeSection < SECTIONS.length - 1 && (
            <TouchableOpacity
              style={[s.navBtn, s.navBtnRight]}
              onPress={() => switchSection(activeSection + 1)}
              activeOpacity={0.7}
            >
              <Text style={s.navBtnTxt}>{SECTIONS[activeSection + 1].title.split(' ').slice(0, 2).join(' ')} →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Workbook complete */}
        {totalAnswered >= TOTAL_PROMPTS && (
          <View style={s.finishedCard}>
            <Text style={s.finishedEmoji}>🌿</Text>
            <Text style={s.finishedTitle}>Workbook Complete</Text>
            <Text style={s.finishedDesc}>
              You have answered all 49 prompts. This represents a remarkable act of self-knowledge.
              Keep adding reflections as your understanding grows — each entry is timestamped and private.
            </Text>
          </View>
        )}

        {/* ─── Appendix ─────────────────────────────────────── */}
        <TouchableOpacity
          style={s.appendixToggle}
          onPress={() => setShowAppendix((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={s.appendixToggleIcon}>📖</Text>
          <Text style={s.appendixToggleTitle}>Evidence-Based Techniques Reference</Text>
          <Text style={s.appendixChevron}>{showAppendix ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAppendix && (
          <View style={s.appendixWrap}>
            <Text style={s.appendixIntro}>
              These techniques are referenced throughout the workbook prompts.
              Practise them during stable periods so they are available when you need them most.
            </Text>
            {APPENDIX_ITEMS.map((item, i) => (
              <AppendixCard key={i} item={item} />
            ))}
          </View>
        )}

        {/* Privacy note */}
        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            Your responses are private and never shared with the AI report, companions, or psychiatrists
            unless you choose to export and share the PDF yourself.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 8 },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backText: { fontSize: 15, color: SAGE, fontWeight: '600' },
  privacyBadge: { backgroundColor: SURFACE, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  privacyBadgeText: { fontSize: 11, color: CHARCOAL, opacity: 0.5, fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '700', color: CHARCOAL, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 12, color: CHARCOAL, opacity: 0.4, marginBottom: 20 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: SURFACE },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: SAGE },
  progressLabel: { fontSize: 12, fontWeight: '700', color: SAGE, minWidth: 40, textAlign: 'right' },

  // Section nav (horizontal scroll)
  sectionNav: { marginBottom: 16, marginHorizontal: -20 },
  sectionNavContent: { paddingHorizontal: 20, gap: 8 },
  sectionTab: {
    width: 112, alignItems: 'center', padding: 10, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1.5, borderColor: 'transparent',
  },
  sectionTabActive: { borderColor: SAGE, backgroundColor: SAGE + '0F' },
  sectionTabIcon: { fontSize: 18, marginBottom: 4 },
  sectionTabLabel: { fontSize: 10, color: CHARCOAL, opacity: 0.5, textAlign: 'center', marginBottom: 6, lineHeight: 14 },
  miniDotRow: { flexDirection: 'row', gap: 3, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 72 },
  miniDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0DDD8' },

  // Section header card
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  sectionIcon: { fontSize: 24 },
  sectionNum: { fontSize: 11, fontWeight: '700', color: SAGE, letterSpacing: 0.5, marginBottom: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: CHARCOAL },
  completeBadge: { backgroundColor: SAGE + '22', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  completeBadgeText: { fontSize: 11, color: SAGE, fontWeight: '700' },

  // How it helps box
  howItHelpsBox: { backgroundColor: SAGE + '18', borderRadius: 10, padding: 12 },
  howItHelpsLabel: { fontSize: 9, fontWeight: '800', color: SAGE, letterSpacing: 1.2, marginBottom: 6 },
  howItHelpsText: { fontSize: 12, color: CHARCOAL, lineHeight: 18, opacity: 0.75 },

  // Prompt card
  promptCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    shadowColor: CHARCOAL, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  promptAccent: { width: 4, backgroundColor: '#E0DDD8' },
  promptBody: { flex: 1, padding: 14 },
  promptLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  promptLabel: { fontSize: 10, fontWeight: '700', color: SAGE, letterSpacing: 0.8 },
  entryCount: { fontSize: 10, fontWeight: '600', color: CHARCOAL, opacity: 0.35 },
  promptText: { fontSize: 15, fontWeight: '600', color: CHARCOAL, lineHeight: 21, marginBottom: 4 },
  promptSub: { fontSize: 13, color: CHARCOAL, opacity: 0.55, lineHeight: 18, marginBottom: 10 },
  hintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, alignSelf: 'flex-start' },
  hintToggleTxt: { fontSize: 11, fontWeight: '600', color: SAGE },
  hintChevron: { fontSize: 9, color: SAGE },
  promptHint: { fontSize: 12, color: CHARCOAL, opacity: 0.45, lineHeight: 17, marginBottom: 10, fontStyle: 'italic' },

  input: {
    backgroundColor: SURFACE, borderRadius: 10, padding: 12,
    minHeight: 80, fontSize: 14, color: CHARCOAL, lineHeight: 20,
  },
  addBtn: {
    alignSelf: 'flex-end', marginTop: 8,
    backgroundColor: SAGE, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnDisabled: { backgroundColor: '#E0DDD8' },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  addBtnTxtDisabled: { color: CHARCOAL + '60' },

  // Prev / Next section buttons
  sectionNavBtns: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  navBtn: {
    backgroundColor: SURFACE, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  navBtnRight: { alignItems: 'flex-end' },
  navBtnTxt: { fontSize: 12, fontWeight: '600', color: CHARCOAL, opacity: 0.55 },

  finishedCard: {
    backgroundColor: '#E8DCC866', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 12, marginTop: 4,
  },
  finishedEmoji: { fontSize: 36, marginBottom: 12 },
  finishedTitle: { fontSize: 17, fontWeight: '700', color: CHARCOAL, marginBottom: 8 },
  finishedDesc: { fontSize: 13, color: CHARCOAL, opacity: 0.55, textAlign: 'center', lineHeight: 19 },

  // Appendix
  appendixToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    marginBottom: 8,
  },
  appendixToggleIcon: { fontSize: 18 },
  appendixToggleTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: CHARCOAL },
  appendixChevron: { fontSize: 11, color: CHARCOAL, opacity: 0.35 },
  appendixWrap: { marginBottom: 16 },
  appendixIntro: { fontSize: 12, color: CHARCOAL, opacity: 0.5, lineHeight: 18, marginBottom: 12 },

  privacyNote: { backgroundColor: SURFACE, borderRadius: 12, padding: 14, marginTop: 4 },
  privacyText: { fontSize: 11, color: CHARCOAL, opacity: 0.38, lineHeight: 17 },
});
