/**
 * moderate-post — Community Content Moderation Edge Function
 *
 * Triggered via Supabase Database Webhook on INSERT to community_posts.
 *
 * Pipeline:
 *   Step 1: Perspective API (Google) — fast, rule-based attribute scores
 *     score > 0.85  → reject immediately
 *     score < 0.60  → approve immediately
 *     score 0.60–0.85 → escalate to Step 2
 *
 *   Step 2: LLM review (llama-3.2-3b-preview via Groq — fast + cheap)
 *     APPROVE or REJECT based on community guidelines
 *
 * Setup:
 *   - PERSPECTIVE_API_KEY env var (Google Cloud Console → Perspective API)
 *   - GROQ_API_KEY env var
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars (auto-provided by Supabase)
 *   - Database Webhook: INSERT on community_posts → this function
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const PERSPECTIVE_BASE = 'https://commentanalyzer.googleapis.com/v1alpha1';

const MODERATION_SYSTEM_PROMPT = `You are a content moderator for a mental health community for people with bipolar disorder.

Community guidelines:
- No advice to stop or change medication
- No glorification of self-harm or suicide methods
- No personally identifiable information about others
- No commercial promotion or spam
- No diagnosing others

APPROVE posts that discuss lived experience, ask for support, share coping strategies, describe symptoms honestly, or express difficult emotions.
Do NOT reject posts for being emotionally intense — people in crisis deserve space to speak.

Reply with only: APPROVE or REJECT`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function perspectiveScore(content: string, apiKey: string): Promise<number> {
  const res = await fetch(
    `${PERSPECTIVE_BASE}/comments:analyze?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text: content },
        requestedAttributes: { TOXICITY: {}, IDENTITY_ATTACK: {}, THREAT: {}, INSULT: {} },
        languages: ['en'],
      }),
    },
  );
  if (!res.ok) return 0; // If Perspective is unavailable, pass to LLM
  const data = await res.json() as {
    attributeScores: Record<string, { summaryScore: { value: number } }>;
  };
  const scores = Object.values(data.attributeScores).map((a) => a.summaryScore.value);
  return Math.max(...scores);
}

async function llmVerdict(content: string, groqKey: string): Promise<'approved' | 'rejected'> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.2-3b-preview',
      messages: [
        { role: 'system', content: MODERATION_SYSTEM_PROMPT },
        { role: 'user', content: `Review this post: "${content.slice(0, 1000)}"\nReply with only: APPROVE or REJECT` },
      ],
      temperature: 0.1,
      max_tokens: 10,
      store: false,
    }),
  });
  if (!res.ok) return 'approved'; // Fail open — prefer false negative over silencing users
  const data = await res.json() as { choices: { message: { content: string } }[] };
  const verdict = data.choices?.[0]?.message?.content?.trim().toUpperCase() ?? '';
  return verdict === 'REJECT' ? 'rejected' : 'approved';
}

async function setStatus(
  supabase: ReturnType<typeof createClient>,
  postId: string,
  status: 'approved' | 'rejected',
  reason?: string,
) {
  await supabase
    .from('community_posts')
    .update({ moderation_status: status, ...(reason ? { moderation_reason: reason } : {}) })
    .eq('id', postId);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const perspectiveKey = Deno.env.get('PERSPECTIVE_API_KEY');
  const groqKey = Deno.env.get('GROQ_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: { record?: { id?: string; content?: string } };
  try {
    body = await req.json();
  } catch {
    return new Response('invalid payload', { status: 400 });
  }

  const { id, content } = body.record ?? {};
  if (!id || !content) return new Response('missing fields', { status: 400 });

  // ── Step 1: Perspective API ──────────────────────────────────────────────
  if (perspectiveKey) {
    const maxScore = await perspectiveScore(content, perspectiveKey);

    if (maxScore > 0.85) {
      await setStatus(supabase, id, 'rejected', 'toxicity');
      return new Response('rejected:toxicity', { status: 200 });
    }

    if (maxScore < 0.60) {
      await setStatus(supabase, id, 'approved');
      return new Response('approved:perspective', { status: 200 });
    }

    // 0.60–0.85: escalate to LLM
  }

  // ── Step 2: LLM review ───────────────────────────────────────────────────
  if (!groqKey) {
    // No Groq key — approve (fail open)
    await setStatus(supabase, id, 'approved');
    return new Response('approved:no_groq_key', { status: 200 });
  }

  const verdict = await llmVerdict(content, groqKey);
  await setStatus(supabase, id, verdict, verdict === 'rejected' ? 'llm_review' : undefined);
  return new Response(`${verdict}:llm`, { status: 200 });
});
