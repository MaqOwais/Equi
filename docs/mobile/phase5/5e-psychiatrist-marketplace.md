# Phase 5E — Psychiatrist Marketplace

Turns the placeholder psychiatrist directory into a live, searchable marketplace of bipolar-specialist US psychiatrists. Users can browse by location, filter by telehealth vs. in-person, view insurance accepted, and book directly through Calendly. The Equi Partner Network is a curated tier of psychiatrists who have integrated the app into their clinical workflow.

← [Phase 5 README](./README.md)

---

## Architecture Overview

```
Mobile app (directory + booking)
    │
    ├── Supabase: psychiatrists table (public profiles)
    │       ├── psychiatrists_public view (RLS-safe, no PII)
    │       └── psychiatrist_connections (patient ↔ psychiatrist link)
    │
    ├── Calendly API (appointment booking)
    │   └── Supabase Edge Function: create-calendly-event
    │
    └── Psychiatrist Portal (separate lightweight web app)
            ├── Next.js (or Remix)
            └── Supabase auth (same project, psychiatrist role)
```

---

## Database Schema

```sql
-- ── Psychiatrist profiles ─────────────────────────────────────────────────
create table psychiatrists (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  npi_number          text unique not null,    -- National Provider Identifier (verified)
  name                text not null,
  credentials         text,                    -- e.g. "MD, ABPN Board Certified"
  bio                 text,
  photo_url           text,

  -- Practice
  offers_telehealth   boolean default false,
  offers_in_person    boolean default false,
  location_city       text,
  location_state      text,                    -- 2-letter US state code
  location_lat        float,
  location_lng        float,

  -- Insurance
  insurance_accepted  text[],                  -- e.g. ['Aetna', 'Blue Cross', 'Cigna']
  sliding_scale       boolean default false,

  -- Equi integration
  is_equi_partner     boolean default false,   -- Equi Partner Network member
  calendly_username   text,                    -- for booking link generation
  activity_prescribing_enabled boolean default false,

  -- Status
  verified_at         timestamptz,             -- null = unverified / pending
  profile_visible     boolean default true,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Public-safe view (excludes NPI, lat/lng precision)
create view psychiatrists_public as
  select
    id, name, credentials, bio, photo_url,
    offers_telehealth, offers_in_person,
    location_city, location_state,
    insurance_accepted, sliding_scale,
    is_equi_partner, calendly_username,
    activity_prescribing_enabled
  from psychiatrists
  where verified_at is not null
    and profile_visible = true;

-- ── Patient ↔ Psychiatrist connection ────────────────────────────────────
create table psychiatrist_connections (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid references auth.users not null,
  psychiatrist_id     uuid references psychiatrists not null,
  status              text default 'requested',  -- 'requested' | 'accepted' | 'ended'
  share_ai_report     boolean default false,
  share_medication    boolean default false,
  share_cycle_data    boolean default false,
  connected_at        timestamptz default now(),
  unique(patient_id, psychiatrist_id)
);

-- ── Bookings ──────────────────────────────────────────────────────────────
create table bookings (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid references auth.users not null,
  psychiatrist_id     uuid references psychiatrists not null,
  calendly_event_uri  text,                    -- Calendly event URI for cancellation
  appointment_at      timestamptz,
  appointment_type    text,                    -- 'telehealth' | 'in_person'
  insurance_claimed   text,
  status              text default 'requested', -- 'requested' | 'scheduled' | 'completed' | 'cancelled'
  notes               text,                    -- patient's pre-appointment notes
  include_ai_snapshot boolean default true,    -- attach AI wellness snapshot to the request
  created_at          timestamptz default now()
);

-- Migration (run if bookings table already exists without these columns)
-- alter table bookings add column if not exists notes text;
-- alter table bookings add column if not exists include_ai_snapshot boolean default true;

-- RLS
alter table psychiatrist_connections enable row level security;
create policy "patients manage own connections"
  on psychiatrist_connections for all using (auth.uid() = patient_id);

alter table bookings enable row level security;
create policy "patients see own bookings"
  on bookings for all using (auth.uid() = patient_id);
```

---

## Directory Screen

**Route:** `/(tabs)/psychiatrists` (existing screen, now wired to live data)

```
┌─────────────────────────────┐
│  Find a Psychiatrist        │
│                             │
│  ┌───────────────────────┐  │
│  │  🔍  City or state    │  │
│  └───────────────────────┘  │
│                             │
│  FILTERS                    │
│  [Telehealth] [In-person]   │
│  [Equi Partner] [Sliding $] │
│                             │
│  ─────────────────────────  │
│                             │
│  ┌───────────────────────┐  │
│  │  ⭐ EQUI PARTNER       │  │  ← gold badge
│  │  Dr. Sarah Okonkwo    │  │
│  │  MD · Board Certified │  │
│  │  Chicago, IL          │  │
│  │  Telehealth + In-person│ │
│  │  Aetna · Blue Cross   │  │
│  │  [ View profile ]     │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  Dr. Marcus Webb      │  │
│  │  MD · Chicago, IL     │  │
│  │  Telehealth           │  │
│  │  Cigna · United       │  │
│  │  [ View profile ]     │  │
│  └───────────────────────┘  │
│                             │
│  🏠    📓    🌊    🎯    👤 │
└─────────────────────────────┘
```

### Search implementation

Search is client-side on the directory load (no full-text search server needed at MVP scale < 500 psychiatrists):

```ts
// stores/psychiatrists.ts
load: async () => {
  const { data } = await supabase
    .from('psychiatrists_public')
    .select('*')
    .order('is_equi_partner', { ascending: false });  // Partners first
  set({ all: data ?? [] });
},

search: (query: string, filters: Filters) => {
  const { all } = get();
  return all.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.location_city?.toLowerCase().includes(query.toLowerCase()) ||
      p.location_state?.toLowerCase().includes(query.toLowerCase());
    const matchesTelehealth = !filters.telehealth || p.offers_telehealth;
    const matchesInPerson = !filters.in_person || p.offers_in_person;
    const matchesPartner = !filters.equi_partner || p.is_equi_partner;
    const matchesSliding = !filters.sliding_scale || p.sliding_scale;
    return matchesQuery && matchesTelehealth && matchesInPerson && matchesPartner && matchesSliding;
  });
},
```

For scale > 500 psychiatrists: move to Supabase full-text search (`to_tsvector` + `plainto_tsquery`) or a simple PostgREST `ilike` filter with PostGIS for radius search.

---

## Psychiatrist Profile Screen

**Route:** `/psychiatrist/[id]`

```
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  ⭐ Equi Partner             │
│  Dr. Sarah Okonkwo, MD      │
│  Board Certified Psychiatry │
│  ABPN · 14 years experience │
│                             │
│  Chicago, IL                │
│  Telehealth + In-person     │
│                             │
│  ABOUT                      │
│  Dr. Okonkwo specialises in │
│  bipolar spectrum disorders  │
│  and trauma-informed care.  │
│  She integrates IPSRT and   │
│  CBT-based approaches...    │
│                             │
│  INSURANCE                  │
│  Aetna · Blue Cross · Cigna │
│  United · Sliding scale ✓   │
│                             │
│  EQUI PARTNER               │
│  Understands Equi's         │
│  monitoring approach and    │
│  can receive your AI report │
│  before appointments.       │
│                             │
│  [  Book Appointment  ]     │
│                             │
│  Already connected?         │
│  Share my AI report         │
│                             │
└─────────────────────────────┘
```

---

## Booking Flow (Calendly Integration)

Calendly is the scheduling backend. Equi does not build a custom scheduler.

### Setup

1. Each psychiatrist creates a Calendly account and sets their availability.
2. They provide their Calendly username to Equi during onboarding.
3. Equi stores `calendly_username` on the psychiatrist profile.

### Booking link generation

```ts
// The simplest approach: open Calendly in-app WebView or browser
const calendlyUrl = `https://calendly.com/${psychiatrist.calendly_username}?name=${encodeURIComponent(user.display_name)}&email=${encodeURIComponent(user.email)}`;

Linking.openURL(calendlyUrl);
```

For a more integrated experience (booking within the app), use the [Calendly Embed](https://help.calendly.com/hc/en-us/articles/223195488) in a WebView:

```tsx
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: `https://calendly.com/${psychiatrist.calendly_username}` }}
  style={{ flex: 1 }}
  onNavigationStateChange={(navState) => {
    // Detect booking completion (Calendly redirects to /confirm)
    if (navState.url.includes('/confirm')) {
      handleBookingComplete();
    }
  }}
/>
```

### Post-booking record

On booking confirmation, create a record in `bookings`:

```ts
await supabase.from('bookings').insert({
  patient_id: userId,
  psychiatrist_id: psychiatrist.id,
  appointment_type: selectedType,
  status: 'scheduled',
});
```

Calendly webhooks (optional Phase 5F+): listen for `invitee.created` and `invitee.canceled` events to keep `bookings.status` in sync.

---

## Equi Partner Network

The Partner Network is a curated tier of psychiatrists who have:
1. Verified their NPI number with Equi
2. Agreed to the Equi Partner Terms (understand the monitoring approach, will not share patient data outside the app)
3. Enabled `activity_prescribing_enabled` to receive prescribing access in the portal

### Partner benefits

| Feature | Standard psychiatrist | Equi Partner |
|---|---|---|
| Listed in directory | ✅ | ✅ |
| Gold partner badge | ❌ | ✅ |
| Sorted first in results | ❌ | ✅ |
| Activity prescribing portal | ❌ | ✅ |
| Receive AI report shares | ❌ | ✅ |
| Patient compliance dashboard | ❌ | ✅ |

### Partner onboarding flow (ops, not in-app)

1. Psychiatrist submits interest at equiapp.com/partner
2. Equi team verifies NPI via NPI Registry API
3. Equi creates psychiatrist profile in Supabase
4. Psychiatrist receives login link to the Partner Portal
5. Equi sets `is_equi_partner = true`, `verified_at = now()`

---

## Psychiatrist Portal (Web)

A lightweight web app separate from the mobile app. Built with Next.js (App Router) + Supabase Auth + Tailwind.

**URL:** portal.equiapp.com

### Portal screens

| Screen | Function |
|---|---|
| Dashboard | Overview of connected patients, recent activity |
| Patient detail | Patient's shared data (cycle, mood, AI report) — only what patient has consented to share |
| Activity prescribe | Assign activities with dosage (sessions/week) and phase restrictions |
| Prescriptions | List of active prescriptions, compliance % per patient |
| Profile | Update bio, photo, availability, insurance |
| Booking calendar | View upcoming appointments (Calendly embed) |

### Portal data access rules

The psychiatrist can only see data the patient has explicitly enabled:

| Data type | Patient control | Default |
|---|---|---|
| AI Wellness Report | `share_ai_report` toggle per psychiatrist | Off |
| Cycle state (summary) | `share_cycle_data` toggle | Off |
| Medication adherence | `share_medication` toggle | Off |
| Journal entries | Never accessible | N/A — hardcoded off |
| Mood scores | Only with `share_cycle_data` | Off |

Enforced at database level via RLS on `psychiatrist_connections`:
```sql
-- Psychiatrists can only read patient data when connection is accepted
-- and the relevant share flag is true
create policy "psychiatrist_read_cycle"
  on cycle_logs for select
  using (
    exists (
      select 1 from psychiatrist_connections
      where patient_id = cycle_logs.user_id
        and psychiatrist_id = auth.uid()::uuid
        and status = 'accepted'
        and share_cycle_data = true
    )
  );
```

---

## NPI Verification

The National Provider Identifier (NPI) is a unique identifier for US healthcare providers. Verification prevents fake profiles.

### NPI Registry API (NPPES)

```ts
// supabase/functions/verify-npi/index.ts
const res = await fetch(
  `https://npiregistry.cms.hhs.gov/api/?number=${npiNumber}&version=2.1`
);
const data = await res.json();

const provider = data.results?.[0];
if (!provider) return { valid: false };

const taxonomy = provider.taxonomies?.find((t: any) => t.primary);
const isPsychiatrist =
  taxonomy?.desc?.toLowerCase().includes('psychiatry') ||
  taxonomy?.code?.startsWith('2084');  // NUCC taxonomy: Psychiatry & Neurology

return {
  valid: true,
  name: `${provider.basic.first_name} ${provider.basic.last_name}`,
  credential: provider.basic.credential,
  isPsychiatrist,
};
```

This runs as a Supabase Edge Function called during partner onboarding (ops team only — not user-facing).

---

## Insurance Verification (MVP)

Full real-time insurance verification (via Eligible API or Availity) is complex and expensive. Phase 5E ships a simpler MVP:

**MVP:** Self-reported insurance. Psychiatrist selects which insurers they accept from a standardised list. Patient sees a "Check your plan" disclaimer.

**Phase 6+:** Real-time eligibility check via Eligible.com API. Patient enters member ID → instant verification of in-network status.

### Insurance list (curated for bipolar care, US major payers)

```ts
export const US_INSURERS = [
  'Aetna', 'Anthem', 'Blue Cross Blue Shield', 'Cigna', 'Humana',
  'Kaiser Permanente', 'Medicaid', 'Medicare', 'Tricare', 'UnitedHealth',
  'Oscar Health', 'Molina Healthcare', 'WellCare', 'Sliding scale / self-pay',
];
```

---

## Sharing AI Report with Psychiatrist

From the AI Report screen, the user can share the current weekly or monthly report with any connected psychiatrist who has `share_ai_report = true`.

```
┌─────────────────────────────┐
│  Share with your            │
│  psychiatrist               │
│                             │
│  Dr. Sarah Okonkwo          │
│  Equi Partner               │
│                             │
│  [  Send report  ]          │
│                             │
│  They'll receive a 7-day    │
│  read-only link. You can    │
│  revoke access anytime.     │
│                             │
└─────────────────────────────┘
```

This reuses the Phase 4D `shareWithCompanion()` flow — psychiatrist connections are structurally identical to companion connections for sharing purposes (both use the `report_shares` table).

---

## Phase 5E Launch Scope

| Item | Included in 5E launch |
|---|---|
| Live psychiatrist profiles (real data) | ✅ |
| City/state search + filters | ✅ |
| Equi Partner badge | ✅ |
| Calendly booking (WebView) | ✅ |
| AI report sharing with psychiatrist | ✅ |
| Partner Portal (web) — activity prescribing | ✅ |
| NPI verification (ops-side) | ✅ |
| Map view (pin-on-map) | ❌ Deferred — Google Maps SDK adds ~2MB to bundle |
| Real-time insurance verification | ❌ Phase 6 |
| Calendly webhook sync | ❌ Phase 6 |
| In-app appointment reminders | ❌ Phase 6 |
| Video consultation (Twilio) | ❌ Phase 6 |
