# Phase 5D — App Store Submission

Covers everything needed to get Equi approved and live on the iOS App Store and Google Play Store — metadata, screenshots, compliance, the Privacy Nutrition Label, medical category review strategy, and the TestFlight beta programme.

← [Phase 5 README](./README.md)

---

## App Identity

| Field | Value |
|---|---|
| **App name** | Equi |
| **Subtitle (iOS)** | Bipolar mood & cycle tracker |
| **Short description (Android)** | Track your cycle, mood, sleep, and get AI wellness reports. |
| **Category (iOS)** | Medical |
| **Category (Android)** | Health & Fitness |
| **Secondary category (iOS)** | Health & Fitness |
| **Bundle ID / Package** | `com.equi.app` |
| **Age rating** | 12+ (iOS) / Teen (Android) |
| **Languages** | English (US) — launch; Spanish + French in v1.1 |

---

## App Store Description (iOS — 4000 char limit)

```
Equi is a clinical-grade bipolar disorder monitoring system designed for the 6 million Americans living with bipolar spectrum conditions.

Track. Understand. Stabilise.

WHAT EQUI DOES

Cycle Tracking — Log your mood state (stable, elevated, low, mixed) each day with symptom checklists and intensity ratings. Your 90-day pattern is visualised as a wave graph that makes episodes and transitions visible at a glance.

AI Wellness Reports — Every week, Equi analyses your mood, sleep, cycle data, and activity completion and generates a personalised report. Share it as a PDF with your psychiatrist before appointments. No raw journal text is ever sent to the AI.

Sleep & Wearable Sync — Connect Apple Health or Google Fit to auto-import nightly sleep data. Sleep patterns are one of the strongest predictors of mood transitions in bipolar disorder.

Social Rhythm Tracking — Based on IPSRT research, Equi tracks six daily anchor times (wake, first meal, first social contact, work start, dinner, bedtime) and scores your routine consistency — a clinically validated predictor of episode stability.

Activities Library — 18+ therapist-backed activities filtered by your current cycle phase. Includes Gratitude Jar, Box Breathing, Moonlight Winddown, and Forgiveness sequences. Prescribed activities from your psychiatrist appear in a dedicated tab.

Community — Anonymous posts, no algorithmic ranking, no likes. Channels: Wins This Week, Depressive Days, Mania Stories, Medication Talk, Caregiver Corner. Crisis line pinned at the top.

DESIGNED WITH CLINICAL CARE

• No streaks that punish missing days
• No red except genuine crisis UI
• Mood states have colours — never labelled bad or good
• Offline-first — core tracking works without internet
• Data always exportable and deletable
• Zero AI data retention — Groq does not store your data

PRIVACY FIRST

Your raw journal text is never sent anywhere. AI analysis uses only anonymised, derived signals. Equi is not ad-supported. Your data is never sold. GDPR and CCPA compliant with one-tap data export and 30-day account deletion grace period.

---

Equi is not a substitute for professional mental health care. Always follow the guidance of your healthcare provider. If you are in crisis, please contact 988 (Suicide & Crisis Lifeline) or your emergency services.
```

---

## Google Play Description (Short + Long)

**Short description (80 chars):** `AI-powered bipolar cycle tracker with sleep, mood, and wellness reports.`

**Long description:** Same as App Store, with minor formatting adjustments (no markdown, plain paragraphs).

---

## Keywords (iOS — 100 char limit)

```
bipolar,mood tracker,cycle tracker,mental health,mania,depression,wellness report,IPSRT,sleep
```

**Strategy:**
- Lead with the diagnosis (`bipolar`) — users search for this directly
- Include clinical terms (`IPSRT`, `cycle tracker`) to capture informed users
- Include broad terms (`mood tracker`, `mental health`) for discovery
- Avoid generic terms with enormous competition (`anxiety`, `therapy`)

---

## Screenshots

iOS requires screenshots for 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 15), and optionally iPad.

### Recommended 10 screenshots (in order)

| # | Screen | Caption |
|---|---|---|
| 1 | Home — today's cycle card | "Know where you are today" |
| 2 | 90-day cycle wave graph | "See your full pattern" |
| 3 | AI Wellness Report (weekly) | "Your weekly AI analysis, in plain language" |
| 4 | AI Report — early warning flags (gold) | "Spot patterns before they escalate" |
| 5 | Activities — Suggested for this week | "Activities matched to your current phase" |
| 6 | Sleep chart + social rhythm score | "Sleep and routine — the two biggest levers" |
| 7 | Journal entry (block editor) | "Your private space to process everything" |
| 8 | Crisis Mode | "Help is one tap away, always" |
| 9 | Community — anonymous feed | "A community that gets it" |
| 10 | PDF export share sheet | "Share your report with your psychiatrist" |

### Screenshot production

- Use Simulator or real device with clean data (no test usernames, no lorem ipsum)
- Background: `#F7F3EE` — matches the app background so screenshots look native
- Device frame: use [Rotato](https://rotato.app) or App Store Connect built-in framing
- Captions: 40pt font, charcoal (`#3D3935`), positioned top or bottom depending on content
- No hands, no faces — App Store policy compliance

### App Preview Video (optional, high impact)

- 30 seconds maximum
- Show: open app → Home → log cycle → see 90-day graph → AI report → PDF export
- No voiceover (many users watch muted)
- Captions on screen

---

## Privacy Nutrition Label (iOS)

App Store Connect → App Privacy. Declare every data type collected or linked.

### Data linked to the user (stored in Supabase, identified by user ID)

| Type | Data | Use |
|---|---|---|
| Health & Fitness | Sleep data, mood score, cycle state | App functionality |
| Sensitive Info | Mental health diagnosis, medication status | App functionality |
| User Content | Journal entries (stored, never sent to AI) | App functionality |
| Identifiers | User ID (hashed in analytics) | Analytics |
| Contact Info | Email address | Account management |

### Data NOT collected

- Location (psychiatrist search uses city entered by user, no GPS)
- Browsing history
- Financial info (handled by Stripe, not Equi)
- Contacts
- Photos (except optional food photo in nutrition — not stored server-side, processed locally)

### Third-party SDKs and their data practices

| SDK | Data collected | Sent to |
|---|---|---|
| Sentry | Crash reports (no PII) | Sentry.io (US) |
| Groq API | Anonymised health signals (no raw text) | Groq (US, zero-retention) |
| Supabase | All user data | Supabase (US) |
| Stripe | Payment info | Stripe (processed externally) |
| Expo Updates | Device ID for OTA update delivery | Expo (US) |

---

## Android Data Safety Form

Google Play → Store listing → Data safety.

Declare:
- Personal info: **Email address** (collected, required, can request deletion)
- Health and fitness: **Other health info** (mood, cycle state, sleep) — optional, can request deletion
- App activity: **App interactions** (crash logs, performance) — Sentry, no PII
- **Data is encrypted in transit** ✅
- **User can request data deletion** ✅ (Privacy & Data screen → request account deletion)

---

## Medical Disclaimer

Must appear:
1. In the App Store description (last paragraph — see above)
2. On the onboarding screen before auth
3. In the Privacy & Data screen
4. In the AI Wellness Report footer

**Standard wording:**
> Equi is designed to support, not replace, professional mental health care. The information and insights provided by Equi are for personal use only and do not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider with any questions you have regarding your mental health condition.

---

## HIPAA Considerations

Equi is **not** a HIPAA Covered Entity — it is a consumer app, not a healthcare provider or business associate of one. However:

| Measure | Status |
|---|---|
| Supabase BAA | Sign via Supabase Pro plan (Business Associate Agreement available) |
| Groq zero-retention | Documented in privacy policy: "Groq does not retain request data" |
| No PHI to third parties | Journal text never leaves Supabase. AI receives only anonymised derived signals. |
| Data deletion | 30-day soft-delete with GDPR Art. 17 compliance |
| Encryption at rest | Supabase encrypts all data at rest (AES-256) |
| Encryption in transit | All API calls over HTTPS/TLS 1.3 |

---

## Age Rating

**iOS:** 12+
Reasons: Infrequent/mild mature/suggestive themes (mental illness references), Medical/Treatment Information

**Do not rate 17+.** 17+ apps are excluded from school-managed Apple IDs and Family Sharing — this would block a significant portion of the target audience (young adults, caregivers, school health programs).

**Android:** Teen
Content descriptors: None (no violence, no sexual content, no gambling)

---

## TestFlight Beta Programme

### Internal testing (pre-submission)

- Up to 25 internal testers (Apple Developer account members)
- No App Store review required
- Available within minutes of build upload
- Use for team QA

### External testing (public beta)

- Up to 10,000 testers
- Requires App Store review (~1 business day)
- Testers receive a TestFlight link — no App Store account required
- Invitation strategy:
  - Direct outreach to NAMI / DBSA communities
  - Reddit: r/bipolar, r/bipolar2, r/BipolarReddit (moderator permission required)
  - Mental health advocacy organisations
  - Beta waitlist via landing page

### Beta feedback structure

Testers receive a weekly in-app feedback prompt (not a notification — only visible on app open):

```
┌─────────────────────────────┐
│  Beta feedback              │
│                             │
│  This week's focus:         │
│  How clear were the AI      │
│  report insights?           │
│                             │
│  ○  Very clear              │
│  ○  Mostly clear            │
│  ○  Confusing in places     │
│  ○  Hard to understand      │
│                             │
│  Open feedback:             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  [  Submit  ]  Skip         │
│                             │
└─────────────────────────────┘
```

Responses stored in Supabase `beta_feedback` table (not required in production schema).

---

## App Store Review Strategy

Medical apps receive specialist reviewers. Common rejection reasons and how to avoid them:

| Rejection reason | Equi mitigation |
|---|---|
| "App makes medical claims without substantiation" | All AI output includes "informational only" disclaimers; no diagnostic language |
| "App requests health data without clear purpose" | HealthKit usage description in `infoPlist` is specific and user-visible |
| "Crisis resources not included" | Crisis Mode is accessible from every screen; 988 is hardcoded |
| "Privacy policy missing or incomplete" | Privacy policy URL in App Store Connect; full policy hosted at equiapp.com/privacy |
| "App crashes on launch" | Covered by 5B quality gate |
| "In-app purchases not through Apple IAP" | Donations are web-only (opens browser) — not classified as in-app purchase |

### Submission checklist

- [ ] Privacy policy URL set in App Store Connect
- [ ] Support URL set (support@equiapp.com or equiapp.com/support)
- [ ] All screenshots uploaded for all required sizes
- [ ] App preview video reviewed for WWDC guidelines (no hands, no other apps shown)
- [ ] Demo account credentials provided to reviewer (in App Review Information)
- [ ] Demo account has 7+ days of pre-seeded data so reviewer can see AI report
- [ ] "Notes for review" explains: OTP auth, HealthKit permission, Groq API key usage

### Demo account for reviewers

Provide in App Review Information:
```
Email: reviewer@equiapptest.com
Note: An OTP code will be sent to this email. If you cannot receive it, use code: 123456
      (Set ALLOW_TEST_OTP=true for the reviewer@equiapptest.com address in Edge Function)
```

Pre-seed the demo account with:
- 14 days of cycle logs
- 7 days of mood logs
- 3 journal entries
- 1 completed weekly AI report
- 1 emergency contact

---

## Google Play Submission

### Internal test track → Closed testing → Open testing → Production

| Track | Audience | Review time |
|---|---|---|
| Internal testing | 100 testers | Instant |
| Closed testing (alpha) | Invited groups | Instant |
| Open testing (beta) | Public opt-in | 1–2 days review |
| Production | All users | 1–3 days review |

**Staged rollout:** Start production at 10% of users, increase to 50% after 24h if crash-free rate > 99.5%, then 100%.

### Pre-launch report

Google Play automatically runs the APK on Firebase Test Lab devices. Review and fix flagged issues before promoting to production.

---

## Post-Launch Monitoring (First 30 Days)

| Metric | Target | Tool |
|---|---|---|
| Crash-free sessions | > 99.5% | Sentry / App Store Connect |
| App Store rating | ≥ 4.2 | App Store Connect |
| Day-7 retention | > 40% | Supabase: count users with logs in days 4–7 |
| Day-30 retention | > 20% | Supabase: count users with logs 25–30 days post-install |
| AI report generation rate | > 30% of weekly active users | Supabase: `ai_reports` row count per user |
| 1-star reviews with "crash" | 0 | App Store Connect |

Respond to all reviews within 48 hours. App Store review responses are public.
