# Equi — Business Strategy & Growth Notes

> Research notes covering scaling, pricing, risk analysis, and product focus.
> Last updated: March 2026

---

## Table of Contents

1. [Scaling to 100k–1M Users](#1-scaling-to-100k1m-users)
2. [Pricing Strategy](#2-pricing-strategy)
3. [Risk & Failure Analysis](#3-risk--failure-analysis)
4. [Product Focus — Bipolar vs. Expansion](#4-product-focus--bipolar-vs-expansion)

---

## 1. Scaling to 100k–1M Users

### Current Stack Assessment

| Layer | Current | Problem at Scale |
|---|---|---|
| Backend | Supabase (shared infra) | Row limits, connection pooling |
| AI | Groq API | Cost per request, rate limits |
| Auth | Supabase Auth | Fine up to ~500k users |
| Storage | Supabase Postgres | Needs sharding/partitioning at 1M |
| Mobile | Expo Go / EAS | Need native builds |

---

### Technical Requirements by Tier

#### 100k Users — What Breaks First
- Supabase free/pro tier connection limits (~200 concurrent)
- No CDN for assets (audio, images)
- Single Postgres instance — slow queries as data grows
- No background job queue (notifications sent synchronously)

**What you need:**
- Upgrade to Supabase Pro + connection pooler (PgBouncer) — already built in
- Add Postgres indexes on every `user_id`, `date`, `logged_at` column
- CDN for ambient sound files (Cloudflare R2 or AWS S3 + CloudFront)
- Background job queue for notifications (Inngest, Trigger.dev, or Supabase Edge Functions + cron)
- Native builds (iOS + Android) — App Store presence required at this scale
- Crash-free rate target: >99.5%

#### 500k Users — Additional Requirements
- Read replicas on Supabase (available on Team plan) — route all SELECT queries to replica
- Partition large tables by `user_id` hash or `date` range — especially `cycle_logs`, `journal_entries`, `workbook_responses`
- Redis/Upstash cache for AI insights (don't re-run Groq for same user within 24h)
- Groq rate limit management — queue AI requests, return cached results
- Dedicated human moderation flow for community posts
- Dedicated on-call rotation for incidents
- HIPAA/SOC2 compliance review — mental health data triggers regulatory requirements in most markets

#### 1M Users — Architecture Changes Required
- Likely need to migrate off managed Supabase to self-hosted or dedicated Postgres cluster
- Microservices split for AI, notifications, community (currently all one Supabase project)
- Horizontal scaling of Edge Functions or move to dedicated compute (AWS/GCP)
- Data residency — EU users require data stored in EU (GDPR), healthcare data in some countries requires local storage
- Dedicated ML pipeline — Groq zero-retention is fine, but at 1M users consider fine-tuned models and own inference
- Full security audit — penetration testing, vulnerability disclosure program
- Multi-region deployment

---

### Infrastructure Cost Analysis

| Tier | Users | Supabase | Groq AI | CDN/Storage | Notifications | Monitoring | Total/mo |
|---|---|---|---|---|---|---|---|
| Now | <1k | $25 (Pro) | ~$5 | $0 | $0 | $0 | ~$30 |
| Early | 10k | $25 | ~$50 | $10 | $10 | $26 (Sentry) | ~$120 |
| Growth | 100k | $599 (Team) | ~$500 | $100 | $99 | $80 | ~$1,400 |
| Scale | 500k | $2,000+ | ~$2,500 | $500 | $400 | $200 | ~$6,000 |
| Large | 1M | $5,000–15,000 | ~$5,000 | $1,000 | $800 | $500 | ~$12–22k |

**Groq cost at 1M users:**
- 30% of users generate AI report weekly → ~300k reports/month
- Llama 3.1 70B: ~$0.59/M input tokens, ~$0.79/M output tokens
- ~2,000 tokens per report → ~$0.0016 per report
- 300k reports → ~$500/mo — very manageable

### People Costs

| Role | When Needed | Approx Salary |
|---|---|---|
| Backend engineer | 50k users | $120–160k |
| iOS/Android native dev | 100k users | $120–150k |
| Clinical advisor | Before App Store health category | $50–100k/yr |
| Trust & Safety / moderation | Community feature grows | $60–80k |
| DevOps/SRE | 500k users | $130–160k |
| Full security audit | Pre-1M | $20–50k one-time |

---

### Non-Technical Requirements

#### Regulatory (Mental Health = High Risk)
- **GDPR** — data export, deletion, consent records
- **HIPAA** — if accepting US users storing health data; Supabase has a HIPAA BAA on Enterprise tier (~$5k+/mo)
- **App Store Health category** — Apple requires privacy nutrition label and may require clinical review
- **No "medical device" claims** — cannot say the app "diagnoses" or "treats" bipolar disorder; current wording needs legal review before 100k users

#### Community Safety (Highest Liability Surface)
At scale the community feature becomes the highest-risk area:
- Suicidal content moderation (required by platforms)
- Crisis escalation protocol beyond the modal — real human handoff
- Mandatory reporting considerations in some jurisdictions

#### Immediate Actions (Free, High Value)
1. Add DB indexes on `user_id` and `date` columns across all tables
2. Run `EXPLAIN ANALYZE` on slowest queries
3. Enable Supabase Point-in-Time Recovery
4. Legal review of app copy — remove any diagnostic language
5. Use soft-delete (`deleted_at` column) instead of hard-delete everywhere — makes GDPR deletion auditable

---

## 2. Pricing Strategy

### Target User Profile
Bipolar disorder is a chronic, lifelong condition. Users:
- Use the app every day, not occasionally
- Have genuine willingness to pay (alternative = $200–400/session psychiatrist)
- But many are on disability income — hard paywall kills retention

### Recommended Model: Freemium + Annual Subscription

#### Free Tier (Always Free — Never Paywall Safety Features)
- Daily mood/cycle logging
- Journal (unlimited entries)
- Medication tracking
- Crisis mode
- Calendar view
- Basic tasks

#### Pro Tier — "Equi Plus"
- AI Wellness Reports (weekly + monthly)
- Bipolar Workbook (all chapters)
- Relapse Signature Builder
- Sleep + wearable integration
- Nutrition tracking
- Advanced calendar analytics
- Psychiatrist booking
- Data export (PDF)
- Ambient soundscapes

### Pricing

| Plan | Price | Notes |
|---|---|---|
| Free | $0 | Permanent |
| Monthly | $7.99/mo | For people wanting to try first |
| Annual | $49.99/yr ($4.17/mo) | ~48% discount — push this hard |
| Lifetime | $149 | One-time, early adopters only |

**Why these numbers:**
- $7.99 is the mental health app sweet spot (Calm = $14.99, Headspace = $12.99)
- $49.99/yr converts 3–4x better than monthly in health apps
- $149 lifetime — offer only in first 1–2 years to fund early growth

### Revenue Projections

Assumptions: 5% conversion free→paid, 70% choose annual

| Users | Paid Users | Monthly Revenue | Annual Revenue |
|---|---|---|---|
| 1,000 | 50 | ~$280 | ~$3,360 |
| 10,000 | 500 | ~$2,800 | ~$33,600 |
| 50,000 | 2,500 | ~$14,000 | ~$168,000 |
| 100,000 | 5,000 | ~$28,000 | ~$336,000 |
| 500,000 | 25,000 | ~$140,000 | ~$1.68M |
| 1,000,000 | 50,000 | ~$280,000 | ~$3.36M |

> Conversion can reach 8–12% with strong onboarding — doubles all figures above.

### Conversion Tactics (Ethical)

1. **Insight gate** — logging always free, but seeing patterns (AI report, 90-day chart) requires Pro. People log 2 weeks, get curious, then convert.
2. **7-day free trial** — no credit card. After 7 days they've built a habit. Trial→paid conversion: 40–60%.
3. **Annual price anchoring** — always show annual first, monthly second. "Save 48%" next to monthly price.
4. **Psychiatrist unlock** — "Your psychiatrist can view your data export" — Pro feature with genuine clinical value.
5. **Never show a paywall during a crisis.** Ever.

### Pricing Evolution by Stage

| Stage | Strategy |
|---|---|
| 0–10k users | Offer lifetime deal ($149) to fund early development |
| 10k–100k | Remove lifetime. Push annual. Add referral (1 month free per referral) |
| 100k–500k | Introduce Equi for Caregivers ($4.99/mo) — family/guardian access |
| 500k–1M | Introduce Equi Clinical ($29/mo) — psychiatrists monitoring multiple patients |
| 1M+ | Enterprise deals with hospitals, insurance companies, employee wellness programs |

### B2B Opportunity (Larger Than B2C at Scale)
- Insurance companies will pay per-member-per-month to reduce hospitalizations
- Employers with mental health benefits budgets (via platforms like Lyra Health)
- NHS / public health systems — pilot programs, then bulk licensing
- A single hospital system deal can be worth more than 10,000 individual subscriptions

**Implementation:** Use [RevenueCat](https://www.revenuecat.com) — handles App Store + Play Store subscriptions, free trials, analytics. Free until $2.5k MRR. ~1 day to integrate.

---

## 3. Risk & Failure Analysis

### Base Rate
~90% of health apps fail within 2 years. Mental health apps have the worst retention in the entire app industry:
- Day 1: ~40%
- Day 7: ~20%
- Day 30: **~4%**

Bipolar is harder than average — mood episodes disrupt the very routines the app depends on.

### Specific Risks for Equi

**No first-mover advantage**

| Competitor | Users | Funding | Focus |
|---|---|---|---|
| Bearable | 200k+ | Bootstrapped | Symptom + mood tracking |
| eMoods | 500k+ | Established | Bipolar specific |
| Daylio | 20M+ | Acquired | Mood journaling |
| Woebot | Millions | $90M raised | AI mental health |
| Moodfit | 100k+ | Funded | Bipolar/depression |

eMoods is the direct competitor — bipolar-specific, mood + medication + sleep tracking, established since 2012 with deep psychiatrist word-of-mouth.

**Other key risks:**
- **Retention** — chronic condition users drop off during episodes, exactly when they need it most
- **Clinical credibility** — psychiatrists haven't heard of Equi yet; eMoods has 12 years of trust
- **Single founder** — most common failure mode in solo health apps
- **Regulatory ambush** — one viral incident involving a crisis situation or diagnostic claim can trigger App Store removal and legal exposure

### Where Equi Can Actually Win

1. **eMoods is ugly** — it looks like 2012 because it is. Equi's design language is genuinely better and UI quality directly correlates with engagement in mental health apps.
2. **AI integration** — no bipolar-specific app has meaningful AI. Weekly pattern analysis + relapse signature builder are genuinely novel. If the output is useful, that's a real moat.
3. **The workbook** — structured CBT/DBT content built into a tracker is unusual. Most apps are just logging. Gives Equi clinical depth competitors lack.
4. **Niche trust** — bipolar communities recommend bipolar-specific apps. Tight niche = strong word of mouth.
5. **Psychiatrist portal** — 50 psychiatrists recommending Equi to patients = thousands of high-retention downloads with near-zero churn.

### Probability Assessment

| Outcome | Probability | What it Requires |
|---|---|---|
| Fails quietly (never gets traction) | 50% | Doing nothing differently |
| Modest success (10–50k users, side income) | 30% | Good execution, some marketing |
| Real business (100k+, sustainable) | 15% | Clinical partnerships + strong retention |
| Breakout (1M+, acquirable) | 5% | Right timing + psychiatric system buy-in |

### What Separates the 15% from the 50%

Apps that survive in mental health win on **trust distribution** — getting into rooms where bipolar patients get advice:
- Psychiatrist offices
- NAMI (National Alliance on Mental Illness) support groups
- Reddit r/bipolar (350k members)
- Peer support specialists

None of that is a coding problem. The app is good enough right now to start those conversations.

**The one question that decides everything:**
> Do you have access to even one psychiatrist who would try Equi with 5 patients and give feedback?

If yes — that's the entire go-to-market. Build from there.
If no — that's the first problem to solve, not another feature.

---

## 4. Product Focus — Bipolar vs. Expansion

### Verdict: Stay Focused. Don't Expand Yet.

**Premature scaling of scope** is one of the top 5 reasons funded startups fail — even more dangerous for a solo builder.

What happens when you expand too early:
- Attention splits across two problems, neither gets solved properly
- Bipolar users feel the app is "no longer for them" — niche trust evaporates
- Marketing becomes impossible — can't clearly explain who the app is for
- Regulatory surface area doubles
- Competitors stay focused while you scatter

"Built for everyone" means trusted by no one in mental health.

### Traction Thresholds Before Expansion

Don't consider expanding until hitting **all three**:

| Signal | Target |
|---|---|
| Active users (open 3x+/week) | 10,000+ |
| Day-30 retention | >15% |
| Unsolicited psychiatrist/therapist endorsements | 5+ |

### The Case for Staying Bipolar-Only Long Term

The most successful mental health apps that reached scale or got acquired owned their niche first:
- **Ginger** — depression/anxiety only → acquired for $1.3B
- **Lyra Health** — enterprise mental health → $5.6B valuation, still focused
- **eMoods** — bipolar only, 12 years, still category leader

Bipolar disorder alone is a **$6B+ market** across apps, coaching, clinical tools, and insurance integration. No need to expand to build a serious business.

### The One Sensible Exception Now

**Caregiver / Guardian mode** — already partially built (support network feature).

Family members and partners of bipolar patients are a natural adjacent user. Same illness, different seat. This is low-risk expansion that:
- Doubles addressable market within the same niche
- Increases retention (users whose family is also on the app churn less)
- Requires no new clinical content

### When to Expand (2–3 Year Horizon)

If Equi reaches 50k+ active users with psychiatrist endorsements, the natural second condition is **not** depression or anxiety. It's:

**Borderline Personality Disorder (BPD)**
- Frequently misdiagnosed as bipolar — massive community overlap
- Same mood tracking paradigm applies
- Same psychiatrist relationships already built
- r/BPD has 300k+ members actively looking for tools
- Almost no good dedicated apps exist

### The Goal

> Make Equi the app that every bipolar patient and their psychiatrist considers essential — in the same way diabetics consider a glucose monitor essential.

That is a big enough goal. Expansion before that point is a distraction dressed up as ambition.

---

*Notes compiled from strategy sessions, March 2026.*
