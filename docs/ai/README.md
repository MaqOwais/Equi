# Equi — AI System Design

Equi uses open-source LLMs for two purposes: generating clinical wellness reports for users and their psychiatrists, and moderating the community feed. No user data is used for model training. No data is sold or shared with third parties.

---

## Files

| File | Contents |
|---|---|
| [features.md](features.md) | How AI is applied across each feature — inputs, outputs, models, data flow |
| [architecture.md](architecture.md) | System architecture diagram, models at a glance, aggregation layer, dev vs production |
| [privacy.md](privacy.md) | Privacy architecture, prompt templates, AI clinical boundaries |

---

## AI Stack at a Glance

| Model | Use Case |
|---|---|
| Llama 3.1 70B (Groq) | Wellness reports, early warning detection, journal sentiment, life event correlation |
| Llama 3.2 3B (Groq) | Community post pre-moderation |
| BioMistral 7B (Ollama, self-hosted) | HIPAA-compliant production fallback for all report generation |
| Perspective API | Toxicity scoring — stage 1 of community moderation |
| Detoxify (self-hosted) | Secondary toxicity classifier; offline fallback |

**Core principle:** All AI calls operate on aggregated, structured data — never raw journal text or personal identifiers. Groq's zero-retention API is used during development; the entire stack switches to self-hosted Ollama for HIPAA-compliant production.
