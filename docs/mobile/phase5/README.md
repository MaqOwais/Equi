# Phase 5 — Beta Launch

**Status:** ✅ Complete (5A–5F implemented; 5D app store submission pending native build)

Phase 5 transforms Equi from a complete feature set into a shippable, observable, and monetised product. It covers the full pipeline from native builds to App Store submission, adds the psychiatrist marketplace, wires in donations, and hardens every layer for real users in production.

Phase 4 must be fully complete before Phase 5 begins. A native build (EAS Build, not Expo Go) is required from 5A onwards — all feature work after this point must be tested on a real device or simulator via the development client.

← [mobile/](../../)

---

## Sub-phases

| Phase | Name | Core Deliverable | Key Dependency |
|---|---|---|---|
| **5A** | Native Build Pipeline | EAS Build · iOS + Android signing · OTA updates · Dev Client | Xcode 16+ (macOS 14+) |
| **5B** | Quality & Observability | Sentry · performance profiling · accessibility · offline hardening | 5A (needs native build to run Sentry native SDK) |
| **5C** | Onboarding Flow | Full FTUE: role → auth → diagnosis → network → relapse signature → permissions | 5A (push permission requires native build) |
| **5D** | App Store Submission | iOS + Android submission · metadata · Privacy Nutrition Label · medical compliance | 5A + 5B + 5C (all must be stable) |
| **5E** | Psychiatrist Marketplace | Real profiles · map search · Calendly booking · insurance · Partner Network | Phase 3D (companion/psychiatrist DB layer) |
| **5F** | Donations & Monetisation | Stripe · donation tiers · sponsor-a-user · transparent spending dashboard | 5D (App Store compliance rules apply) |

---

## Goals

1. **Ship to real users** — TestFlight (iOS) and Google Play internal track (Android) by end of 5C; public App Store by end of 5D.
2. **Close the observability gap** — every crash, every Groq failure, every Supabase timeout is captured and actionable before users hit it.
3. **Nail day-zero experience** — an empty app is a confusing app; onboarding seeds the core tracking loop in the first five minutes.
4. **Make the marketplace real** — placeholder psychiatrist profiles become live, bookable clinicians with verified NPI numbers.
5. **Fund the mission** — donations fund access for people who cannot afford care; the model is transparent and abuse-resistant.

---

## New Infrastructure Added in Phase 5

| Component | Phase | Purpose |
|---|---|---|
| EAS Build + EAS Update | 5A | Native builds, OTA patches, signed binaries |
| Expo Dev Client | 5A | Custom dev environment with all native modules |
| Sentry React Native SDK | 5B | Crash reporting, performance traces, ANR detection |
| Maestro (E2E testing) | 5B | Automated UI smoke tests on CI |
| Supabase `psychiatrists_public` view | 5E | RLS-safe public profile data for marketplace |
| Calendly API integration | 5E | Appointment booking without a custom scheduler |
| `bookings` table | 5E | Appointment records with status + insurance info |
| Stripe React Native SDK | 5F | One-time + recurring donations |
| `donations` table | 5F | Donation records, tier, sponsor target |
| `sponsored_users` table | 5F | Users with active sponsored access |

---

## New Screens Added in Phase 5

| Screen | Phase | Route |
|---|---|---|
| Onboarding — Role Selection | 5C | `/(onboarding)/role` |
| Onboarding — Auth (OTP) | 5C | `/(onboarding)/auth` |
| Onboarding — Diagnosis | 5C | `/(onboarding)/diagnosis` |
| Onboarding — Support Network | 5C | `/(onboarding)/network` |
| Onboarding — Relapse Signature Prompt | 5C | `/(onboarding)/relapse-prompt` |
| Onboarding — Permissions | 5C | `/(onboarding)/permissions` |
| Psychiatrist Directory | 5E | `/(tabs)/psychiatrists` (existing, now real) |
| Psychiatrist Profile | 5E | `/psychiatrist/[id]` |
| Book Appointment | 5E | `/psychiatrist/[id]/book` |
| Donation Screen | 5F | `/(tabs)/you/donate` |
| Spending Dashboard | 5F | `/(tabs)/you/spending` |

---

## Updated Screens in Phase 5

| Screen | What changes |
|---|---|
| **Psychiatrists (Screen 08)** | Placeholder profiles → live data; map search goes live; Partner Network badge |
| **You / Profile (Screen 13)** | Donation tier badge; sponsor status; wearable sync status |
| **Home / Today (Screen 02)** | Day-0 empty state with guided first-log prompt |
| **AI Wellness Report (Screen 09)** | Graceful empty state when < 3 days of data |
| **Onboarding** | New full FTUE flow replaces the stub auth screen |

---

## App Store Compliance Notes

Equi is a **Medical / Health & Fitness** app with content relating to mental health and medication. Several platform-specific rules apply:

- **iOS Medical category** — requires disclaimers that the app is not a substitute for clinical care. App Store review typically assigns a healthcare specialist reviewer.
- **No in-app purchases for donations on iOS** — Apple requires all in-app transactions to go through Apple IAP (30% fee) or to be handled on the web. Equi routes donations through a web link to avoid the 30% cut; the app does not call them "purchases."
- **Android Data Safety** — all data types collected must be declared. Groq zero-retention must be documented.
- **HIPAA** — Equi is not a HIPAA Covered Entity (it does not transmit ePHI to third parties on behalf of a provider). However, Supabase BAA is signed and Groq's zero-retention API is documented in the privacy policy.
- **Age rating** — 12+ (mature themes, references to mental illness and crisis support). Avoid 17+ (which triggers stricter review and blocks school distribution).

---

## Design Constraints (carry forward)

All Phase 1 design principles apply unchanged:
- No red except genuine crisis UI
- Mood states have colors — never labeled bad or good
- No streaks that punish missing days
- Offline-first for core tracking
- Data always exportable and deletable
- Zero AI data retention (Groq)

Additional Phase 5 constraints:
- **No dark patterns** in donation flows — no pre-checked recurring options, no guilt language
- **No paywall on core features** — donations unlock a badge, not features
- **Psychiatrist marketplace is directory-first** — browsing is free, no registration wall

---

## Detailed Documentation

- [5a-build-pipeline.md](./5a-build-pipeline.md) — EAS Build, signing, OTA updates, Dev Client
- [5b-quality-observability.md](./5b-quality-observability.md) — Sentry, performance, accessibility, offline hardening
- [5c-onboarding.md](./5c-onboarding.md) — Full FTUE flow design and implementation
- [5d-app-store.md](./5d-app-store.md) — App Store submission, metadata, compliance, review strategy
- [5e-psychiatrist-marketplace.md](./5e-psychiatrist-marketplace.md) — Marketplace, booking, Equi Partner Network
- [5f-donations.md](./5f-donations.md) — Stripe, donation tiers, sponsor-a-user, spending dashboard
