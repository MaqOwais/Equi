# Phase 5C — Onboarding Flow

The first-time user experience (FTUE) is the single highest-leverage moment in a mental health app. A person who just received a bipolar diagnosis — or who has been struggling for years — is opening Equi for the first time. The onboarding flow must be warm, non-clinical, non-overwhelming, and get the user to their first meaningful data entry within five minutes.

← [Phase 5 README](./README.md)

---

## Principles

1. **Progressive disclosure** — collect only what is needed now. Relapse signature can be built later; do not front-load every setup step.
2. **No dark patterns** — no countdown timers, no "free trial ending" messaging, no pre-checked consent boxes.
3. **Emotional safety** — use Equi's color language from the first screen. Never show red. Tone is warm, peer-to-peer, not clinical.
4. **Skippable steps** — only auth and role are mandatory. Diagnosis, support network, relapse signature, and notification permissions are skippable with a clear "I'll do this later" option.
5. **Companion path** — the flow bifurcates at step 1: patients and companions have different experiences.

---

## Flow Overview

```
Splash (animated logo, 2s)
    │
    ▼
Role Selection
    ├── Patient → [Auth] → [Diagnosis] → [Medication toggle] → [Support Network] → [Relapse Prompt] → [Permissions] → Home
    └── Companion → [Auth] → [Connect to patient] → Companion Home
```

---

## Screen-by-Screen Design

### Screen 1 — Splash

```
┌─────────────────────────────┐
│                             │
│                             │
│         ≋  EQUI             │
│   Finding your equilibrium. │
│                             │
│                             │
│         (animating in)      │
│                             │
└─────────────────────────────┘
```

- Logo fades in over 800ms, tagline follows at 200ms delay
- Background: `#F7F3EE` (surface)
- Logo color: `#3D3935` (charcoal)
- Auto-advance after 2 seconds if session exists → Home
- Auto-advance after 2 seconds if no session → Role Selection

---

### Screen 2 — Role Selection

```
┌─────────────────────────────┐
│                             │
│  Who are you here for?      │
│                             │
│  ┌───────────────────────┐  │
│  │  I'm tracking my own  │  │
│  │  mental health        │  │
│  │                       │  │
│  │  ○  Patient / Self    │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  I'm supporting       │  │
│  │  someone I care about │  │
│  │                       │  │
│  │  ○  Companion         │  │
│  └───────────────────────┘  │
│                             │
│  Both paths use the same    │
│  app. Your role can change  │
│  anytime in Settings.       │
│                             │
└─────────────────────────────┘
```

**Route:** `/(onboarding)/role`

Sets `profiles.user_role` immediately on tap before navigating — the tab bar structure differs by role.

---

### Screen 3 — Auth (OTP email, no password)

```
┌─────────────────────────────┐
│                             │
│  Your email                 │
│                             │
│  ┌───────────────────────┐  │
│  │  you@example.com      │  │
│  └───────────────────────┘  │
│                             │
│  [  Continue  ]             │
│                             │
│  ────────────────────────   │
│                             │
│  We'll send a 6-digit code. │
│  No password needed.        │
│  Your data stays private.   │
│                             │
│  By continuing you agree to │
│  our Terms and Privacy      │
│  Policy.                    │
│                             │
└─────────────────────────────┘
```

**OTP verification screen:**

```
┌─────────────────────────────┐
│                             │
│  Check your email           │
│                             │
│  We sent a code to          │
│  you@example.com            │
│                             │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │  │ │  │ │  │ │  │ │  │ │  │ │  ← 6 digit inputs
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│                             │
│  Didn't get it? Resend  (0:45) │
│                             │
└─────────────────────────────┘
```

**Why OTP, not password:**
- Users with bipolar disorder may have cognitive fog episodes that make password recall difficult
- OTP is accessible and familiar
- No password reset flow to build or support

**Implementation:** `supabase.auth.signInWithOtp({ email })` → `supabase.auth.verifyOtp({ email, token, type: 'email' })`

**Route:** `/(onboarding)/auth`

---

### Screen 4 — Diagnosis (Patient only, skippable)

```
┌─────────────────────────────┐
│                             │
│  Which best describes you?  │
│                             │
│  ○  Bipolar I               │
│     Distinct manic episodes │
│                             │
│  ○  Bipolar II              │
│     Hypomanic + depressive  │
│                             │
│  ○  Cyclothymia             │
│     Milder mood cycling     │
│                             │
│  ○  Still figuring it out   │
│     Exploring or recently   │
│     diagnosed               │
│                             │
│  This helps us personalise  │
│  your experience. Your      │
│  diagnosis is private and   │
│  never shared automatically.│
│                             │
│  [  Continue  ]             │
│  Skip for now               │
│                             │
└─────────────────────────────┘
```

**Copy tone:** Not clinical. No "DSM-5 criteria". Person-first language.

Sets `profiles.diagnosis`. Maps to the `Diagnosis` enum: `bipolar_1 | bipolar_2 | cyclothymia | unsure`.

**Route:** `/(onboarding)/diagnosis`

---

### Screen 5 — Medication Toggle (Patient only)

```
┌─────────────────────────────┐
│                             │
│  Are you currently on       │
│  medication for your        │
│  diagnosis?                 │
│                             │
│  ┌───────────────────────┐  │
│  │  Yes — I take         │  │
│  │  medication regularly  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  No — not currently   │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  I'd rather not say   │  │
│  └───────────────────────┘  │
│                             │
│  This controls whether the  │
│  medication check-in appears│
│  on your Home screen.       │
│  You can change this anytime│
│  in Settings.               │
│                             │
└─────────────────────────────┘
```

Sets `profiles.track_medication`. No judgment framing — all three options are visually identical.

**Route:** `/(onboarding)/medication`

---

### Screen 6 — Support Network (Skippable)

```
┌─────────────────────────────┐
│                             │
│  Who's in your corner?      │
│                             │
│  Add people who support     │
│  you — family, friends, or  │
│  your therapist.            │
│                             │
│  They'll get their own app  │
│  view. You control exactly  │
│  what they can see.         │
│                             │
│  ┌───────────────────────┐  │
│  │  + Add someone        │  │
│  └───────────────────────┘  │
│                             │
│  ─────────────────────────  │
│  Emergency contacts         │
│  (for Crisis Mode)          │
│                             │
│  ┌───────────────────────┐  │
│  │  + Add emergency      │  │
│  │    contact            │  │
│  └───────────────────────┘  │
│                             │
│  [  Continue  ]             │
│  Skip for now               │
│                             │
└─────────────────────────────┘
```

Flows into the companion invite UI (enter email → sets companion status to `pending`).
Emergency contacts are stored in `emergency_contacts` table.

**Route:** `/(onboarding)/network`

---

### Screen 7 — Relapse Signature Prompt (Skippable)

```
┌─────────────────────────────┐
│                             │
│  Your personal warning      │
│  signs                      │
│                             │
│  Most people with bipolar   │
│  disorder experience the    │
│  same 1–3 warning signs     │
│  before each episode —      │
│  unique to them.            │
│                             │
│  Setting these up now means │
│  Equi can flag them early.  │
│                             │
│  ┌───────────────────────┐  │
│  │  Set up now (5 min)   │  │  ← routes to full Relapse Signature Builder
│  └───────────────────────┘  │
│                             │
│  Set up later in You →      │
│  Relapse Signatures         │
│                             │
└─────────────────────────────┘
```

This is a prompt only — the actual builder (Screen 18) is a multi-step flow that lives in `/(tabs)/you/relapse-signature`. Onboarding links out and then returns.

**Route:** `/(onboarding)/relapse-prompt`

---

### Screen 8 — Permissions Gate

```
┌─────────────────────────────┐
│                             │
│  A few quick permissions    │
│                             │
│  ┌───────────────────────┐  │
│  │  🔔  Notifications    │  │
│  │  Daily check-in       │  │
│  │  reminders + early    │  │
│  │  warning alerts.      │  │
│  │                       │  │
│  │  [ Allow ]  Skip      │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  🍎  Apple Health     │  │
│  │  Auto-import your     │  │
│  │  sleep data.          │  │
│  │  (optional — manual   │  │
│  │  entry always works)  │  │
│  │                       │  │
│  │  [ Allow ]  Skip      │  │
│  └───────────────────────┘  │
│                             │
│  [  Go to Equi  ]           │
│                             │
└─────────────────────────────┘
```

**Important:** iOS requires a native permission prompt be shown only **once** per permission type. Show the Equi permission rationale screen **first**, then call the native prompt only when the user taps "Allow". If they tap Skip, do not call the native prompt at all — the user can grant permissions later in Settings.

```ts
// lib/permissions.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version < 33) return true; // no prompt needed < Android 13
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

**Route:** `/(onboarding)/permissions`

---

### Companion Flow (Branch from Screen 2)

Companions get a shorter flow:

```
Role = Companion
    │
    ▼
Auth (OTP) — same as Screen 3
    │
    ▼
┌─────────────────────────────┐
│  Who are you supporting?    │
│                             │
│  Enter the email address    │
│  of the person you're       │
│  supporting.                │
│                             │
│  ┌───────────────────────┐  │
│  │  their@email.com      │  │
│  └───────────────────────┘  │
│                             │
│  They'll receive an invite. │
│  Once accepted, you'll see  │
│  what they choose to share. │
│                             │
│  [  Send invite  ]          │
│                             │
└─────────────────────────────┘
    │
    ▼
Companion Home (limited tab bar)
```

The invite creates a `companions` row with `status: 'pending'` and sends an email via Supabase Edge Function.

---

## Day-Zero Experience (Empty State Seeding)

A new user with zero data sees empty charts and no AI report. This is demotivating. On day zero, Equi shows:

### Home screen — day 0

```
┌─────────────────────────────┐
│  Good morning.              │
│                             │
│  ┌───────────────────────┐  │
│  │  How's your cycle     │  │  ← primary CTA on day 0
│  │  today?               │  │
│  │                       │  │
│  │  STABLE  ELEVATED     │  │
│  │  LOW     MIXED        │  │
│  └───────────────────────┘  │
│                             │
│  YOUR FIRST WEEK            │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Log each day to unlock     │
│  your 7-day pattern.        │
│                             │
│  ┌───────────────────────┐  │
│  │  Write in your        │  │
│  │  journal              │  │  ← secondary CTA
│  └───────────────────────┘  │
└─────────────────────────────┘
```

- No empty chart is shown — replace with a "first 7 days" progress indicator (7 dots, grayscale)
- No "No data" labels — replace with warm action prompts
- AI report: "Generate your first report after 3+ days of logging" (not shown until data exists)

### Cycle tracker — day 0

90-day graph shows 90 empty (grey) bars + a single intro chip:
> "Your 90-day pattern will build here. Log each day to see it grow."

---

## Re-Onboarding (Return After Gap)

Users who haven't logged in 14+ days get a lightweight re-entry:

```
┌─────────────────────────────┐
│  Welcome back               │
│                             │
│  A lot can change in        │
│  2 weeks. Want to pick up   │
│  where you left off?        │
│                             │
│  ┌───────────────────────┐  │
│  │  Log today's cycle    │  │
│  └───────────────────────┘  │
│                             │
│  Or:  Review your last      │
│  report first               │
│                             │
└─────────────────────────────┘
```

Triggered when `last_active_at` (computed from latest `mood_logs.logged_at`) is > 14 days ago. This is checked in `app/_layout.tsx` after auth.

---

## Data Model Changes for Onboarding

```sql
-- Add to profiles table
alter table profiles add column if not exists onboarding_step text default 'role';
-- Values: 'role' | 'auth' | 'diagnosis' | 'medication' | 'network' | 'relapse' | 'permissions' | 'complete'

alter table profiles add column if not exists onboarding_completed_at timestamptz;

-- Track last active (for re-onboarding)
alter table profiles add column if not exists last_active_at timestamptz default now();
```

The `onboarding_step` field allows resuming onboarding if the user is interrupted (app killed mid-flow). On next launch: if `onboarding_step !== 'complete'`, resume from the saved step.

---

## Expo Router File Structure

```
app/
├── (onboarding)/
│   ├── _layout.tsx        # No tab bar; back button to role only
│   ├── role.tsx
│   ├── auth.tsx
│   ├── verify.tsx         # OTP code entry
│   ├── diagnosis.tsx
│   ├── medication.tsx
│   ├── network.tsx
│   ├── relapse-prompt.tsx
│   └── permissions.tsx
├── (tabs)/
│   └── ...                # existing tab screens
└── _layout.tsx            # root — redirects to (onboarding) or (tabs)
```

Root `_layout.tsx` logic:
```ts
const { session } = useAuthStore();
const { profile } = useProfileStore();

if (!session) return <Redirect href="/(onboarding)/role" />;
if (profile?.onboarding_step !== 'complete') return <Redirect href={`/(onboarding)/${profile.onboarding_step}`} />;
return <Redirect href="/(tabs)" />;
```

---

## Retention Mechanics (Non-Gamified)

Equi does not use streaks, points, or leaderboards. Retention is driven by genuine utility:

| Day | Trigger | Mechanism |
|---|---|---|
| 0 | Install | Onboarding completes; first cycle log made |
| 1 | Morning | Check-in reminder notification |
| 3 | Evening | "You've logged 3 days — your first pattern is forming" prompt |
| 7 | Any time | "Generate your first weekly AI report" deep link notification |
| 14 | Evening | "Your 2-week pattern is ready to review" (if 10+ logs) |
| 30 | Morning | "Generate your first 30-day report" notification |

All retention notifications are:
- Opt-in (granted at permissions screen)
- Sent at user's preferred time (set in notification preferences)
- Never sent if the user has already logged that day
