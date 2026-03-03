# AI Architecture — Models, System Design & Deployment

---

## Models at a Glance

| Model | Provider | Use Case | Data Retention |
|---|---|---|---|
| **Llama 3.1 70B** | Groq API | Wellness reports, relapse pattern matching, journal sentiment | Zero retention |
| **Llama 3.2 3B** | Groq API | Community post pre-moderation | Zero retention |
| **BioMistral 7B** | Self-hosted (Ollama) | HIPAA-compliant fallback for all report generation | On-premise only |
| **Perspective API** | Google | Toxicity scoring for community posts | No PII sent |
| **Detoxify** | Self-hosted | Secondary toxicity classifier, offline fallback | On-premise only |

**Why Groq:** Groq's API offers a contractual zero-data-retention guarantee — no user data is logged, stored, or used for model training. This is the primary reason for choosing it over other inference providers during development.

**HIPAA path:** All Groq calls are replaced with self-hosted Ollama + BioMistral in production environments where full HIPAA compliance is required. No data leaves the server.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                           │
│              (React Native / Expo)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                               │
│         Postgres + Auth + Realtime + Edge Functions         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  User data   │  │ Aggregation  │  │  Report cache    │  │
│  │  (encrypted) │  │ Edge Function│  │  (TTL: 24h)      │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘  │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Groq API │  │ Groq API │  │ Persp.   │
        │ Llama    │  │ Llama    │  │ API      │
        │ 3.1 70B  │  │ 3.2 3B   │  │ (tox.)   │
        │ (reports)│  │ (mod.)   │  └──────────┘
        └──────────┘  └──────────┘
              │
              ▼ (HIPAA production fallback)
        ┌──────────────────────────┐
        │  Self-hosted Ollama      │
        │  BioMistral 7B           │
        │  + Detoxify              │
        └──────────────────────────┘
```

---

## Aggregation Layer

The aggregation Edge Function (Supabase) sits between user data and any AI call. Its job is to:

1. **Pull** all relevant user data for the reporting period from Postgres
2. **Anonymise** — convert raw journal text to sentiment scores and keyword tags; convert medication names to structured tags; strip all PII
3. **Structure** — assemble a typed JSON payload matching the prompt template schema
4. **Route** — send to Groq (dev) or self-hosted Ollama (production)
5. **Cache** — store the completed report in Supabase with a 24h TTL; re-generate on explicit user request

No raw journal text, medication names, or personal identifiers are ever included in the AI payload unless the user has explicitly opted in.

---

## Development vs Production

| Concern | Development | Production (HIPAA) |
|---|---|---|
| Report generation | Llama 3.1 70B via Groq | BioMistral 7B via Ollama (self-hosted) |
| Community moderation | Llama 3.2 3B via Groq | Self-hosted Llama 3.2 3B |
| Toxicity scoring | Perspective API + Detoxify | Detoxify only (fully self-hosted) |
| Data retention | Zero (Groq contractual) | Zero (no external calls) |
| Audit logging | Supabase logs | On-premise audit trail |

The switch from development to production is a single environment variable change — both paths share the same aggregation layer and prompt templates.

---

## Future AI Considerations

These are not committed features — they are research-backed directions that may be added as the clinical evidence base matures.

| Direction | Evidence basis | Notes |
|---|---|---|
| Passive wearable episode prediction | 83% accuracy for depressive episode prediction from HR + HRV (Jacobson et al., *Bipolar Disorders* 2019) | Requires sustained longitudinal data; add only after sufficient user data volume |
| Voice biomarker analysis | Vocal features predict mood episodes with moderate accuracy | High privacy risk — requires explicit opt-in and careful consent design |
| Fine-tuned bipolar-specific model | BioMistral shows strong performance on clinical NLP benchmarks | Evaluate after production data accumulation; never train on identifiable user data |
