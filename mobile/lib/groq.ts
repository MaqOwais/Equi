// ─── Groq API Client ──────────────────────────────────────────────────────────
// Zero data retention: store: false on every call.
// Raw journal text is NEVER sent — only derived signals.

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callGroq(
  messages: ChatMessage[],
  model: 'llama-3.1-70b-versatile' | 'llama-3.2-3b-preview' = 'llama-3.1-70b-versatile',
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_GROQ_API_KEY is not set');

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      store: false,   // zero data retention — Groq does not store this request
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Wellness Report Prompt ───────────────────────────────────────────────────

export interface ReportData {
  period: { start: string; end: string };
  mood: { date: string; score: number }[];
  cycle: { date: string; state: string; intensity: number }[];
  activitiesCompleted: string[];
  compatibleActivities?: string[];  // activity names compatible with current cycle state
  substanceDays: { alcohol: boolean; cannabis: boolean }[];
  medicationAdherence?: string[];
  nutritionDays?: number;         // days with ≥1 anti-inflammatory food logged
  destabilizingDays?: number;     // days with ≥1 destabilizing food or 3+ caffeine
  relapseSignatures?: {
    manic?: { warning_signs: string[]; days_before: number };
    depressive?: { warning_signs: string[]; days_before: number };
  };
  // Phase 4E — real wearable + social rhythm data
  sleepLogs?: { date: string; duration_minutes: number; quality_score: number }[];
  socialRhythmLogs?: { date: string; score: number; anchors_hit: number; anchors_total: number }[];
}

const BASE_SYSTEM_PROMPT = `You are a clinical wellness assistant for a bipolar disorder monitoring app.
Analyse anonymised health data and generate a structured report.
Rules:
- Be warm, non-judgmental, clinically careful.
- Never diagnose. Never prescribe. Never claim causation — only correlation or pattern.
- Early warning flags are informational — use cautious, supportive language.
- All users have a bipolar spectrum diagnosis. Do not question or re-diagnose.
- No user identifiers are included in this data — do not add any.
- Respond ONLY with valid JSON matching the schema provided. No markdown, no prose outside JSON.

SLEEP CORRELATION RULES:
- If sleep data is present, note patterns (e.g. sleep changed in 48h before a cycle transition).
- Do not state causation — say "sleep improved before mood lifted", not "sleep caused improvement".
- If no sleep data is available, set sleep_correlation to null.

SOCIAL RHYTHM RULES:
- If social rhythm data is present, report the 7-day average score as a percentage.
- Note direction (improving/declining) if enough data exists to compare periods.
- Do not recommend specific times — only describe what was observed.
- If no social rhythm data is available, set social_rhythm to null.

ACTIVITY SUGGESTION RULES:
- Only suggest activities from the provided compatible_activities list.
- Do not suggest activities the user completed 3+ times this period (avoid repetition).
- Suggest 2-4 activities. No more. Plain activity names only — no explanation in this field.
- If no compatible_activities list is provided, return an empty array.`;

const WEEKLY_SCHEMA = `{
  "summary": "string (2-3 warm, non-judgmental sentences)",
  "cycle_overview": {
    "days": [{ "date": "YYYY-MM-DD", "state": "stable|manic|depressive|mixed", "intensity": 0-10 }],
    "dominant_state": "string",
    "insight": "string"
  },
  "sleep_correlation": "string | null",
  "social_rhythm": "string | null",
  "activities_completed": ["string"],
  "activity_suggestions": ["string"],
  "top_mood_triggers": ["string (inferred — never claimed as proven causes)"],
  "social_rhythm_score": "number | null",
  "medication_adherence": "string | null",
  "substances": "string | null",
  "nutrition_mood": "string | null",
  "life_events_noted": [],
  "early_warning_flags": ["string (use gold/amber tone — informational, not alarming)"]
}`;

const MONTHLY_SCHEMA = `{
  "summary": "string (3-4 sentences covering the full 30-day arc)",
  "cycle_overview": {
    "days": [],
    "dominant_state": "string",
    "insight": "string (focus on month-level trends, not daily detail)"
  },
  "longest_stable_period": "string (e.g. '11 consecutive stable days from Feb 10')",
  "sleep_correlation": "string | null",
  "social_rhythm": "string | null",
  "activities_completed": ["string"],
  "activity_suggestions": ["string"],
  "top_mood_triggers": ["string"],
  "social_rhythm_score": "number | null",
  "medication_adherence": "string | null",
  "substances": "string | null",
  "nutrition_mood": "string | null",
  "life_events_noted": [],
  "early_warning_flags": ["string"]
}`;

const MONTHLY_EXTRA_RULES = `

MONTHLY REPORT FOCUS:
- Identify the longest stable period in the 30-day window and name the dates.
- Note whether social rhythm score is trending up or down across the 4 weeks.
- Identify activities consistently associated with better mood days.
- Keep cycle_overview.days as an empty array — focus on trends, not day-by-day detail.`;

export function buildReportMessages(data: ReportData): ChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM_PROMPT },
    { role: 'user', content: `DATA:\n${JSON.stringify(data, null, 2)}\n\nSCHEMA:\n${WEEKLY_SCHEMA}` },
  ];
}

export function buildMonthlyReportMessages(data: ReportData): ChatMessage[] {
  return [
    { role: 'system', content: BASE_SYSTEM_PROMPT + MONTHLY_EXTRA_RULES },
    { role: 'user', content: `DATA:\n${JSON.stringify(data, null, 2)}\n\nSCHEMA:\n${MONTHLY_SCHEMA}` },
  ];
}
