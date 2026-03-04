# Feature: AI Wellness Report

Weekly AI-generated summary covering mood, sleep, activities, substances, and social rhythm. Shareable as a PDF with psychiatrists and well-wishers. Powered by an open-weight LLM on zero-data-retention infrastructure.

← [Design index](../wireframes.md)

---

## Weekly Report Screen

<details>
<summary>View wireframe</summary>

```
┌─────────────────────────────┐
│  ← Weekly Report   Share ↗  │
│  Feb 24 — Mar 1, 2026       │
│                             │
│  ┌───────────────────────┐  │
│  │  AI SUMMARY           │  │
│  │  ─────────────────    │  │
│  │  This was a mixed     │  │
│  │  week. You started    │  │
│  │  in a depressive      │  │
│  │  episode (Feb 24–27)  │  │
│  │  and transitioned to  │  │
│  │  stable by Feb 28.    │  │
│  │  Sleep improved on    │  │
│  │  transition day.      │  │
│  └───────────────────────┘  │
│                             │
│  CYCLE OVERVIEW             │
│  M   T   W   T   F   S   S  │
│  ↓   ↓   ↓   ↓   =   =   = │
│  ──────────●────────────    │  ← transition point
│                             │
│  SLEEP CORRELATION          │
│  ┌───────────────────────┐  │
│  │  Depressive days: 5.1h│  │
│  │  Stable days:     7.4h│  │
│  │                       │  │
│  │  💡 Sleep improved    │  │
│  │  2.3h before mood     │  │
│  │  lifted               │  │
│  └───────────────────────┘  │
│                             │
│  ACTIVITIES COMPLETED       │
│  ██████░░░░  6 / 10 planned │
│                             │
│  TOP MOOD TRIGGERS          │
│  ✅  Exercise     → +mood   │
│  ✅  Sleep >7h    → +mood   │
│  ⚠️   Isolation   → -mood   │
│                             │
│  SOCIAL RHYTHM              │
│  ┌───────────────────────┐  │
│  │  Consistency: 68%     │  │
│  │  ████████░░░░         │  │
│  │  Bedtime varied ±90m  │  │
│  │  this week — your     │  │
│  │  most irregular anchor│  │
│  └───────────────────────┘  │
│                             │
│  MEDICATION ADHERENCE       │
│  ┌───────────────────────┐  │
│  │  6 / 7 days taken     │  │
│  │  ██████████░  86%     │  │
│  │  Missed: Tue (forgot) │  │
│  └───────────────────────┘  │
│                             │
│  SUBSTANCES THIS WEEK       │
│  ┌───────────────────────┐  │
│  │  🍷 Alcohol: 2 days   │  │
│  │  🌿 Cannabis: 0 days  │  │
│  │                       │  │
│  │  Alcohol noted on Fri │  │
│  │  — sleep quality lower│  │
│  │  the following night  │  │
│  └───────────────────────┘  │
│                             │
│  NUTRITION & MOOD           │  ← shown if ≥3 days of nutrition data
│  ┌───────────────────────┐  │
│  │  Anti-inflammatory    │  │
│  │  days: 4 / 7   57%   │  │
│  │  ████████░░░░         │  │
│  │                       │  │
│  │  💡 Your 3 low-mood   │  │
│  │  days all followed    │  │
│  │  days with high sugar │  │
│  │  and low omega-3      │  │
│  │                       │  │
│  │  ⚠️ 4 days with 3+   │  │
│  │  cups caffeine —      │  │
│  │  all preceded worse   │  │
│  │  sleep quality        │  │
│  └───────────────────────┘  │
│                             │
│  LIFE EVENTS THIS PERIOD    │
│  ┌───────────────────────┐  │
│  │  📌 Feb 15 — Work     │  │
│  │  change (stressful)   │  │
│  │                       │  │
│  │  Sleep irregularity   │  │
│  │  increased +2.1h the  │  │
│  │  following week       │  │
│  └───────────────────────┘  │
│                             │
│  EARLY WARNING              │
│  ┌───────────────────────┐  │
│  │  ⚠️ Sleep dropped     │  │
│  │  below 6h for 2 nights│  │
│  │  — this has preceded  │  │
│  │  low episodes before. │  │
│  └───────────────────────┘  │
│                             │
│  [ 📄 Export PDF for doctor]│
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

</details>

---

## AI Architecture

### Recommended models

| Model | Host | Why |
|---|---|---|
| **Llama 3.1 70B** | Groq API (free tier) | Fast inference, strong reasoning, no cost to start |
| **Mistral Large** | Mistral API | European data sovereignty, strong clinical text |
| **Gemma 2 27B** | Google Vertex / Ollama | Lightweight, can run on-device for privacy |
| **BioMistral 7B** | Self-hosted | Fine-tuned on biomedical text — best for clinical tone |

### Pipeline

```
User data (mood, journal, sleep, cycle, activities, substances, nutrition, social rhythm)
        │
        ▼
  Structured prompt builder
  (assembles the week's data into a clean context)
        │
        ▼
  LLM (Llama 3.1 70B via Groq or self-hosted)
        │
        ▼
  Structured output:
  · Plain-language summary
  · Sleep correlation insight
  · Top mood triggers (from journal sentiment)
  · Nutrition-mood correlations (variability, not averages)
  · Early warning flags
  · Recommended activities for next week
        │
        ▼
  AI Wellness Report screen + PDF export
```

### Why not a closed model?

For a health app handling sensitive mental health data, open-weight models hosted on zero-data-retention infrastructure (Groq or self-hosted) are preferable — no user data is used for training, and the HIPAA compliance path is clearer.

All AI summaries run on zero-data-retention infrastructure (Design Principle #12).
