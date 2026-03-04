# Feature: Community

Anonymous peer support space with topic channels and chronological feed. Posts pass through an AI moderation layer before going live — flagging, not silently rejecting.

← [Design index](../wireframes.md)

---

## Community Feed & Posting

<details>
<summary>View wireframes (feed + composer + moderation states)</summary>

**Feed view**
```
┌─────────────────────────────┐
│  Community              ✏️  │
│                             │
│  CHANNELS                   │
│  ┌───────────────────────┐  │
│  │  🏆  Wins This Week   │▶ │
│  ├───────────────────────┤  │
│  │  🌊  Depressive Days  │▶ │
│  ├───────────────────────┤  │
│  │  ⚡  Mania Stories    │▶ │
│  ├───────────────────────┤  │
│  │  💊  Medication Talk  │▶ │
│  ├───────────────────────┤  │
│  │  👨‍👩‍👧  Caregiver Corner │▶ │
│  └───────────────────────┘  │
│                             │
│  RECENT POSTS               │
│                             │
│  ┌───────────────────────┐  │
│  │  🌸 Anonymous · 2h    │  │
│  │                       │  │
│  │  "First time in 3     │  │
│  │  weeks I cooked a     │  │
│  │  real meal. Tiny win  │  │
│  │  but I'll take it."   │  │
│  │                       │  │
│  │  🤝 I relate (47)     │  │  ← no likes
│  │  🙏 Thank you (23)    │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🌿 Anonymous · 5h    │  │
│  │                       │  │
│  │  "How did you all     │  │
│  │  recognize your first │  │
│  │  manic episode?..."   │  │
│  │                       │  │
│  │  🤝 I relate (31)     │  │
│  │  💬 12 replies        │  │
│  └───────────────────────┘  │
│                             │
│  📌 Always pinned:          │
│  📞 Crisis lines · Help     │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

**Post composer**
```
┌─────────────────────────────┐
│  ←  New Post                │
│                             │
│  Posting to: Wins This Week │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │  Share what's on      │  │
│  │  your mind…           │  │
│  │                       │  │
│  └───────────────────────┘  │
│  0 / 500 characters         │
│                             │
│  COMMUNITY GUIDELINES       │
│  ┌───────────────────────┐  │
│  │  ✅ Share your own    │  │
│  │     experiences       │  │
│  │  ✅ Be kind & honest  │  │
│  │  ❌ No medication     │  │
│  │     dosage advice     │  │
│  │  ❌ No graphic self-  │  │
│  │     harm descriptions │  │
│  │  ❌ No "just think    │  │
│  │     positive" advice  │  │
│  │  ❌ No medical        │  │
│  │     diagnosis claims  │  │
│  └───────────────────────┘  │
│                             │
│  🤖 AI checks your post     │
│  before it goes live        │
│                             │
│   ┌─────────────────────┐   │
│   │    Post anonymously │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

**AI moderation — flagged state**
```
┌─────────────────────────────┐
│  ←  New Post                │
│                             │
│  ┌───────────────────────┐  │
│  │  "I've been taking    │  │
│  │  600mg instead of my  │  │
│  │  usual dose and it    │  │
│  │  feels better…"       │  │
│  └───────────────────────┘  │
│                             │
│  ╔═══════════════════════╗  │
│  ║  ⚠️  Heads up         ║  │  ← AI flag, not rejection
│  ║                       ║  │
│  ║  Your post mentions   ║  │
│  ║  medication dosages.  ║  │
│  ║  Sharing specific     ║  │
│  ║  amounts can be       ║  │
│  ║  harmful to others.   ║  │
│  ║                       ║  │
│  ║  Guideline:           ║  │
│  ║  No dosage advice     ║  │
│  ╚═══════════════════════╝  │
│                             │
│   ┌─────────────────────┐   │
│   │   Edit my post      │   │  ← primary
│   └─────────────────────┘   │
│                             │
│   Post anyway (human        │
│   moderator will review)    │  ← escape hatch
│                             │
│   Learn about guidelines    │
└─────────────────────────────┘
```

**AI moderation — clear state**
```
┌─────────────────────────────┐
│  ←  New Post                │
│                             │
│  ┌───────────────────────┐  │
│  │  "First time in 3     │  │
│  │  weeks I cooked a     │  │
│  │  real meal. Tiny win  │  │
│  │  but I'll take it."   │  │
│  └───────────────────────┘  │
│                             │
│  ✅ Looks good              │
│  Your post is ready to share│
│                             │
│   ┌─────────────────────┐   │
│   │   Post anonymously  │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

</details>

---

## AI Moderation Model

Posts pass through a two-stage AI pipeline before going live.

### What it checks for

| Category | Example violation |
|---|---|
| Medication dosage advice | "I take 600mg instead of prescribed..." |
| Graphic self-harm descriptions | Detailed methods or physical descriptions |
| Romanticizing episodes | Glorifying mania as a superpower |
| Toxic positivity | "Just think positive and it'll go away" |
| Medical diagnosis claims | "You definitely have bipolar II based on..." |
| Harassment or judgment | Dismissing others' experiences |
| Promotional content | App/product links, solicitation |

### Recommended models

| Model | Why it fits |
|---|---|
| **Llama 3.2 3B** via Groq | Sub-100ms latency, free tier, small enough to run inline before post submission |
| **Perspective API** (Google) | Free, battle-tested toxicity + hate speech scoring, secondary pass |
| **Detoxify** (self-hosted) | Open-source Python library, handles harassment and identity attacks |

### Architecture

```
User submits post
       │
       ▼
  Llama 3.2 3B  (Equi-specific guideline check)
  ─ Is it medication dosage advice?
  ─ Is it graphic self-harm content?
  ─ Is it medical diagnosis claims?
  ─ Is it toxic positivity?
       │
       ├── Clean → Perspective API (toxicity / hate speech pass)
       │                │
       │                ├── Clean → Post goes live instantly
       │                │
       │                └── Flagged → "Heads up" screen + edit option
       │
       └── Flagged → "Heads up" screen with specific guideline shown
                              │
                              ├── User edits → re-run check
                              │
                              └── User posts anyway → queued for
                                  human moderator review (not hidden)
```

> Posts are **never silently deleted**. Flagged-and-posted content is visible but marked for human review. The user always knows the status of their post.

---

## Design Notes

**No algorithmic feed** — community is strictly chronological within each channel.

**All posts anonymous by default** — opt-in to add a display name.

**Reactions only** — "🤝 I relate" and "🙏 Thank you" instead of likes. No free-text reactions on other people's posts to avoid adding pressure.

**Crisis line always pinned** at the bottom of every channel feed.
