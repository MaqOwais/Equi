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
  substanceDays: { alcohol: boolean; cannabis: boolean }[];
  medicationAdherence?: string[];   // only if user opted in
  nutritionDays?: number;           // days logged
  relapseSignatures?: {
    manic?: { warning_signs: string[]; days_before: number };
    depressive?: { warning_signs: string[]; days_before: number };
  };
}

const REPORT_SCHEMA = `{
  "summary": "string (2-3 warm, non-judgmental sentences)",
  "cycle_overview": {
    "days": [{ "date": "YYYY-MM-DD", "state": "stable|manic|depressive|mixed", "intensity": 0-10 }],
    "dominant_state": "string",
    "insight": "string"
  },
  "sleep_correlation": "string | null",
  "activities_completed": ["string"],
  "top_mood_triggers": ["string (inferred — never claimed as proven causes)"],
  "social_rhythm_score": null,
  "medication_adherence": "string | null",
  "substances": "string | null",
  "nutrition_mood": "string | null",
  "life_events_noted": [],
  "early_warning_flags": ["string (use gold/amber tone — informational, not alarming)"]
}`;

export function buildReportMessages(data: ReportData): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a clinical wellness assistant for a bipolar disorder monitoring app.
Analyse anonymised health data and generate a structured weekly report.
Rules:
- Be warm, non-judgmental, clinically careful.
- Never diagnose. Never prescribe. Never claim causation — only correlation or pattern.
- Early warning flags are informational — use cautious, supportive language.
- All users have a bipolar spectrum diagnosis. Do not question or re-diagnose.
- No user identifiers are included in this data — do not add any.
- Respond ONLY with valid JSON matching the schema provided. No markdown, no prose outside JSON.`,
    },
    {
      role: 'user',
      content: `DATA:\n${JSON.stringify(data, null, 2)}\n\nSCHEMA:\n${REPORT_SCHEMA}`,
    },
  ];
}
