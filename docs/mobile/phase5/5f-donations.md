# Phase 5F — Donations & Sponsor-a-User

Equi is a free app with no advertising and no data monetisation. This phase implements a voluntary donation system that funds ongoing development, server costs, and a sponsor-a-user programme that keeps the app free for people who cannot afford a subscription tier. All donation infrastructure runs through Stripe — no Apple IAP, no Google Play Billing — via a web checkout to avoid the 30% platform cut and to comply with Apple's rules on charitable/voluntary payments.

← [Phase 5 README](./README.md)

---

## Design Principles

1. **Completely optional** — zero functionality is gated behind donations. The app is fully usable without ever seeing the donation screen.
2. **No in-app purchase** — Stripe web checkout (opens browser). Apple App Store guidelines allow this for donations and charitable giving.
3. **Transparent spending** — a public dashboard shows exactly how donation funds are allocated (server costs, moderation, new features).
4. **Sponsor-a-user** — donors can earmark their contribution to fund access for specific users or a general pool.
5. **No dark patterns** — no countdown timers, no "your streak is at risk", no recurring-by-default checkboxes.

---

## Architecture Overview

```
Mobile app
    │
    ├── Donation UI (in-app prompt → opens browser)
    │       └── equiapp.com/donate (Stripe Payment Links or custom Next.js checkout)
    │
    ├── Supabase Edge Functions
    │       ├── stripe-webhook          (handles payment events)
    │       └── check-sponsored-status  (validates if user is sponsored)
    │
    ├── Stripe (payment processor)
    │       ├── Payment Links (one-time)
    │       └── Subscriptions (recurring monthly)
    │
    └── Supabase DB
            ├── donations
            └── sponsored_users
```

---

## Database Schema

```sql
-- ── Donations ──────────────────────────────────────────────────────────────
create table donations (
  id                  uuid primary key default gen_random_uuid(),

  -- Donor (optional — anonymous donations supported)
  donor_user_id       uuid references auth.users,  -- null if anonymous
  donor_email         text,                         -- from Stripe, may differ from account email

  -- Payment
  stripe_payment_id   text unique not null,         -- Stripe PaymentIntent or Subscription ID
  amount_cents        integer not null,             -- e.g. 500 = $5.00
  currency            text default 'usd',
  is_recurring        boolean default false,
  stripe_subscription_id text,                      -- set if recurring
  status              text default 'succeeded',     -- 'succeeded' | 'refunded' | 'disputed'

  -- Allocation
  allocation          text default 'general',       -- 'general' | 'sponsor_user' | 'server_costs' | 'moderation'
  sponsored_user_id   uuid references auth.users,  -- set if allocation = 'sponsor_user'
  donor_message       text,                         -- optional note from donor (max 280 chars)

  created_at          timestamptz default now()
);

-- RLS: donors see own donations only; no public read
alter table donations enable row level security;

create policy "donors see own donations"
  on donations for select
  using (auth.uid() = donor_user_id);

-- ── Sponsored users ────────────────────────────────────────────────────────
create table sponsored_users (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null unique,
  sponsored_by        uuid references auth.users,   -- null if from general pool
  donation_id         uuid references donations,
  sponsored_until     timestamptz not null,
  created_at          timestamptz default now()
);

-- RLS: users see own sponsor status; no cross-user visibility
alter table sponsored_users enable row level security;

create policy "users see own sponsor status"
  on sponsored_users for select
  using (auth.uid() = user_id);

-- ── Spending log (public — feeds transparent dashboard) ────────────────────
create table spending_log (
  id                  uuid primary key default gen_random_uuid(),
  category            text not null,   -- 'server', 'moderation', 'development', 'legal'
  amount_cents        integer not null,
  description         text not null,   -- e.g. "Supabase Pro — March 2026"
  period_start        date,
  period_end          date,
  created_at          timestamptz default now()
);

-- Public read (no RLS) — feeds the transparency dashboard
```

---

## Donation Tiers

All amounts in USD. Recurring = monthly subscription via Stripe.

| Tier | Amount | Label | Recurring option |
|---|---|---|---|
| Coffee | $3 | "Buy the team a coffee" | ✅ |
| Supporter | $10 | "Keep the servers running" | ✅ |
| Advocate | $25 | "Fund a month for someone who can't pay" | ✅ |
| Champion | $50 | "Fund a new feature" | ✅ |
| Custom | Any | User-entered amount ($1 minimum) | ❌ (one-time only) |

The **Advocate** and **Champion** tiers automatically allocate to the `sponsor_user` pool unless the donor specifies otherwise.

---

## In-App Donation Screens

### Entry Points

Donations are surfaced in three low-pressure locations:

1. **Settings → Support Equi** — primary path, always discoverable
2. **You tab → after generating first AI report** — shown once, opt-out-able ("Don't show again")
3. **Monthly prompt** — once per 30 days if user has never donated (shown as a card on Home, dismissible)

### Donation Screen

**Route:** `/(tabs)/you/donate`

```
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Keep Equi free for         │
│  everyone                   │
│                             │
│  Equi has no ads and never  │
│  sells your data. Every     │
│  donation goes directly to  │
│  development and keeping    │
│  the app free for people    │
│  who can't afford it.       │
│                             │
│  ─────────────────────────  │
│                             │
│  [$3] [$10] [$25] [$50]     │  ← chip selector
│                             │
│  Or enter amount: $ ___     │
│                             │
│  ○  One-time                │
│  ○  Monthly (cancel anytime)│
│                             │
│  [  Continue to payment  ]  │  ← opens browser → Stripe
│                             │
│  🔒 Secured by Stripe.      │
│  Your card details never    │
│  reach our servers.         │
│                             │
│  ─────────────────────────  │
│  SPONSOR SOMEONE            │
│                             │
│  Know someone who needs     │
│  Equi but can't pay?        │
│  Send them a sponsored      │
│  link instead.              │
│                             │
│  [ Sponsor a specific user ]│
│                             │
└─────────────────────────────┘
```

### Post-Donation Return Screen

After Stripe checkout completes, the browser redirects to `equiapp.com/donate/success?session_id=xxx` which deep-links back to the app:

```
equi://donate/success?session_id=xxx
```

```
┌─────────────────────────────┐
│                             │
│       ✦                     │
│                             │
│  Thank you.                 │
│                             │
│  Your $10 contribution      │
│  keeps Equi running for     │
│  everyone.                  │
│                             │
│  You've been added to the   │
│  Equi Supporters list.      │
│  (Opt out in Settings)      │
│                             │
│  [  Back to app  ]          │
│                             │
└─────────────────────────────┘
```

Deep link handling in `app/_layout.tsx`:

```ts
import { useURL } from 'expo-linking';

const url = useURL();

useEffect(() => {
  if (url?.includes('donate/success')) {
    const sessionId = new URL(url).searchParams.get('session_id');
    if (sessionId) router.push('/(tabs)/you/donate-success');
  }
}, [url]);
```

---

## Stripe Integration

### Why web checkout, not in-app SDK

| Approach | Platform cut | Rules |
|---|---|---|
| Apple IAP | 30% (15% for small business) | Mandatory for "digital goods and services" |
| Stripe React Native SDK (in-app) | 0% platform cut | Prohibited for digital goods — Apple would reject |
| **Web checkout (opens browser)** | **0% platform cut** | **Allowed for donations, charitable giving** |
| Google Play Billing | 15–30% | Not mandatory for donations |

Apple's guidelines explicitly allow "reader" apps and charitable donations to use external payment methods. Equi qualifies as the latter.

### Stripe setup

1. Create a Stripe account at stripe.com
2. Create **Payment Links** for each tier (simpler than custom checkout for MVP)
3. Or build custom checkout at `equiapp.com/donate` with the Stripe Node.js SDK

### Payment Link generation (MVP)

```ts
// equiapp.com/donate — web only
// OR: pre-created Stripe Payment Links, one per tier

const STRIPE_PAYMENT_LINKS: Record<string, Record<string, string>> = {
  one_time: {
    '300':  'https://buy.stripe.com/your-link-3',
    '1000': 'https://buy.stripe.com/your-link-10',
    '2500': 'https://buy.stripe.com/your-link-25',
    '5000': 'https://buy.stripe.com/your-link-50',
  },
  recurring: {
    '300':  'https://buy.stripe.com/your-sub-link-3',
    '1000': 'https://buy.stripe.com/your-sub-link-10',
    '2500': 'https://buy.stripe.com/your-sub-link-25',
    '5000': 'https://buy.stripe.com/your-sub-link-50',
  },
};

// Open in browser — NOT a WebView (Stripe requires full browser for SCA compliance)
import { Linking } from 'react-native';

function openDonationLink(amountCents: number, recurring: boolean, userId: string) {
  const mode = recurring ? 'recurring' : 'one_time';
  const baseUrl = STRIPE_PAYMENT_LINKS[mode][String(amountCents)];

  // Append metadata so webhook can link payment to user
  const url = `${baseUrl}?client_reference_id=${userId}`;
  Linking.openURL(url);
}
```

For custom amounts, open the full web checkout page instead of a Payment Link:

```ts
const customUrl = `https://equiapp.com/donate?amount=${amountCents}&user=${userId}&mode=${recurring ? 'subscription' : 'payment'}`;
Linking.openURL(customUrl);
```

### Stripe webhook (Supabase Edge Function)

```ts
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response('Webhook signature invalid', { status: 400 });
  }

  switch (event.type) {

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = pi.metadata?.user_id ?? pi.client_reference_id;
      const amountCents = pi.amount_received;
      const email = pi.receipt_email;

      await supabase.from('donations').insert({
        donor_user_id: userId ?? null,
        donor_email: email ?? null,
        stripe_payment_id: pi.id,
        amount_cents: amountCents,
        is_recurring: false,
        status: 'succeeded',
        allocation: amountCents >= 2500 ? 'sponsor_user' : 'general',
      });

      // If Advocate ($25+) or Champion ($50+), add to sponsor pool
      if (amountCents >= 2500) {
        await addToSponsorPool(amountCents, userId, pi.id);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.subscription) break;

      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const userId = sub.metadata?.user_id;
      const amountCents = invoice.amount_paid;

      await supabase.from('donations').insert({
        donor_user_id: userId ?? null,
        donor_email: invoice.customer_email ?? null,
        stripe_payment_id: invoice.payment_intent as string ?? invoice.id,
        stripe_subscription_id: invoice.subscription as string,
        amount_cents: amountCents,
        is_recurring: true,
        status: 'succeeded',
        allocation: amountCents >= 2500 ? 'sponsor_user' : 'general',
      });
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await supabase
        .from('donations')
        .update({ status: 'refunded' })
        .eq('stripe_payment_id', charge.payment_intent as string);
      break;
    }
  }

  return new Response('ok');
});

async function addToSponsorPool(amountCents: number, donorUserId: string | null, donationId: string) {
  // $25 = 1 month sponsorship, $50 = 2 months, etc.
  const months = Math.floor(amountCents / 2500);
  const sponsoredUntil = new Date();
  sponsoredUntil.setMonth(sponsoredUntil.getMonth() + months);

  // Check if there are users in the sponsorship request queue
  const { data: queued } = await supabase
    .from('sponsored_users')
    .select('user_id')
    .lt('sponsored_until', new Date().toISOString())  // expired
    .limit(1)
    .single();

  const targetUserId = queued?.user_id ?? null;

  if (targetUserId) {
    await supabase.from('sponsored_users').upsert({
      user_id: targetUserId,
      sponsored_by: donorUserId,
      sponsored_until: sponsoredUntil.toISOString(),
    }, { onConflict: 'user_id' });
  }
  // else: amount pools as credit for future sponsorships
}
```

---

## Sponsor-a-User Flow

### Requesting sponsorship (user side)

Users who need a sponsored account can request one from the app:

**Route:** `/(tabs)/you/request-sponsorship`

```
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Request a sponsored        │
│  account                    │
│                             │
│  Equi is free. If you're    │
│  going through a difficult  │
│  time and would like a      │
│  sponsored account (funded  │
│  by the community), you     │
│  can request one here.      │
│                             │
│  We don't ask why. There    │
│  are no eligibility checks. │
│                             │
│  [  Add me to the list  ]   │
│                             │
│  Current wait:              │
│  ≈ 0 days (sponsored        │
│  accounts usually granted   │
│  within 24h)                │
│                             │
└─────────────────────────────┘
```

This adds a row to `sponsored_users` with `sponsored_until = now()` (expired — marks them as waiting). The webhook picks them up when a qualifying donation arrives.

### Sending a sponsored link (donor side)

From the donation screen, donors can sponsor a specific user by email:

```
┌─────────────────────────────┐
│  Sponsor a specific person  │
│                             │
│  ┌───────────────────────┐  │
│  │  their@email.com      │  │
│  └───────────────────────┘  │
│                             │
│  Duration: [1 month ▼]      │
│  (3 months / 6 months)      │
│                             │
│  [  Send sponsorship  ]     │
│                             │
│  They'll receive an email   │
│  with a link to claim their │
│  sponsored account.         │
│                             │
└─────────────────────────────┘
```

This creates a `sponsorship_invites` record and sends an email via Supabase Edge Function. When the recipient clicks the link and signs in, `sponsored_users` is populated.

---

## Transparent Spending Dashboard

**URL:** equiapp.com/transparency (public web page — not in the app)

```
┌───────────────────────────────────────────────────┐
│  Equi — Where your donations go                   │
│                                                   │
│  March 2026                                       │
│                                                   │
│  Total donations received: $1,240                 │
│  Total spent:               $847                  │
│  Reserved for sponsorships: $393                  │
│                                                   │
│  ─────────────────────────────────────────────    │
│                                                   │
│  SPENDING BREAKDOWN                               │
│                                                   │
│  ██████████████████░░░░░  68%  Server costs       │
│  ████░░░░░░░░░░░░░░░░░░░  15%  Moderation         │
│  ████░░░░░░░░░░░░░░░░░░░  12%  Development tools  │
│  █░░░░░░░░░░░░░░░░░░░░░░   5%  Legal / Privacy    │
│                                                   │
│  ITEMISED LOG                                     │
│  Supabase Pro — Mar 2026 ............. $25/mo     │
│  Groq API usage — Mar 2026 ........... $42        │
│  Sentry — Mar 2026 ................... $26/mo     │
│  Part-time moderation (10h) ........... $150      │
│  Expo EAS Build credits .............. $29/mo     │
│                                                   │
│  SPONSORSHIPS                                     │
│  Active sponsored accounts: 12                    │
│  Accounts sponsored this month: 4                 │
│                                                   │
│  Last updated: 2026-03-01 (monthly)               │
└───────────────────────────────────────────────────┘
```

The dashboard is a static Next.js page that reads from the public `spending_log` table via Supabase REST API. The donation totals are aggregated but individual donor records are never shown.

### Edge Function: aggregate donation stats

```ts
// supabase/functions/donation-stats/index.ts
// Public endpoint — no auth required

Deno.serve(async () => {
  const supabase = createClient(...serviceRole...);

  const { data: totals } = await supabase
    .from('donations')
    .select('amount_cents, allocation, created_at')
    .eq('status', 'succeeded')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const { data: spending } = await supabase
    .from('spending_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const { count: activeSponsored } = await supabase
    .from('sponsored_users')
    .select('*', { count: 'exact' })
    .gt('sponsored_until', new Date().toISOString());

  const totalDonated = totals?.reduce((sum, d) => sum + d.amount_cents, 0) ?? 0;
  const totalSpent = spending?.reduce((sum, s) => sum + s.amount_cents, 0) ?? 0;

  return Response.json({
    month: new Date().toISOString().slice(0, 7),
    total_donated_cents: totalDonated,
    total_spent_cents: totalSpent,
    reserved_cents: totalDonated - totalSpent,
    active_sponsored_users: activeSponsored ?? 0,
    spending: spending ?? [],
  });
});
```

---

## GDPR & Privacy Compliance

| Concern | Handling |
|---|---|
| Donor email address | Received from Stripe webhook — never shown publicly, accessible only by service role. Donor can request deletion via privacy@equiapp.com. |
| Anonymous donations | `donor_user_id` nullable — anonymous donations are fully supported. |
| Donor name on public supporters list | Opt-in only (checkbox in post-donation screen). Display name used, never email. |
| Recurring billing | Stripe manages subscription; Equi stores only the subscription ID and amount. No card data stored. |
| Right to deletion | Deleting an Equi account does not cancel Stripe subscriptions — user must cancel separately. Email instructions sent at account deletion. |
| Sponsored user privacy | No donor can identify which specific user received their sponsorship. The link is one-way and anonymised. |

---

## Donation Prompt Frequency Rules

To avoid feeling extractive:

```ts
// lib/donation-prompt.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROMPT_KEY = 'equi_last_donation_prompt';
const DONATED_KEY = 'equi_has_donated';

export async function shouldShowDonationPrompt(): Promise<boolean> {
  const hasDonated = await AsyncStorage.getItem(DONATED_KEY);
  if (hasDonated === 'true') return false;  // never prompt past donors

  const lastShown = await AsyncStorage.getItem(PROMPT_KEY);
  if (!lastShown) return true;

  const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
  return daysSince >= 30;  // at most once per 30 days
}

export async function markPromptShown() {
  await AsyncStorage.setItem(PROMPT_KEY, String(Date.now()));
}

export async function markDonated() {
  await AsyncStorage.setItem(DONATED_KEY, 'true');
}
```

---

## Phase 5F Launch Scope

| Item | Included in 5F launch |
|---|---|
| Donation screen with tier chips | ✅ |
| Opens Stripe Payment Links in browser | ✅ |
| Post-donation deep link return | ✅ |
| Stripe webhook → `donations` table | ✅ |
| Sponsor-a-user pool (auto-assign) | ✅ |
| Transparency page (equiapp.com/transparency) | ✅ |
| Donation prompt (30-day cadence) | ✅ |
| Recurring monthly subscriptions | ✅ |
| Named sponsor (specific user by email) | ✅ |
| In-app receipts / donation history | ✅ |
| Donor name on public supporters list (opt-in) | ✅ |
| Apple IAP | ❌ Not used (30% cut + complexity) |
| In-app Stripe SDK payment sheet | ❌ Apple guidelines prohibit for digital goods |
| Donor leaderboard | ❌ Deferred — creates social pressure |
| NFT receipts | ❌ Never |
