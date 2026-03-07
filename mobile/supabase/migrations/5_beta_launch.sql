-- ─────────────────────────────────────────────────────────────────────────────
-- Equi — Phase 5 Beta Launch migrations
-- Sub-phases: 5C (onboarding), 5E (psychiatrist marketplace), 5F (donations)
--
-- Run in Supabase Dashboard → SQL Editor
-- Safe to run on existing DB — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5C — Onboarding step tracking
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add onboarding_step to profiles so the flow can resume after app kill
alter table profiles add column if not exists onboarding_step text default 'role';
-- Values: 'role' | 'auth' | 'diagnosis' | 'medication' | 'network' | 'relapse' | 'permissions' | 'complete'

alter table profiles add column if not exists onboarding_completed_at timestamptz;

alter table profiles add column if not exists last_active_at timestamptz default now();

-- Mark existing users (Phase 2–4 era) as having completed onboarding
-- so they are not sent back through the new flow on first upgrade.
update profiles
set onboarding_step = 'complete',
    onboarding_completed_at = coalesce(created_at, now())
where onboarding_step is null
   or onboarding_step = 'role';   -- freshly added rows from the ALTER above

-- Update the handle_new_user trigger to initialise onboarding_step for new signups
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, user_role, onboarding_step)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    'patient',
    'role'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5E — Psychiatrist Marketplace
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Psychiatrist profiles ────────────────────────────────────────────────────

create table if not exists psychiatrists (
  id                            uuid primary key default gen_random_uuid(),

  -- Identity
  npi_number                    text unique not null,    -- National Provider Identifier (verified)
  name                          text not null,
  credentials                   text,                    -- e.g. "MD, ABPN Board Certified"
  bio                           text,
  photo_url                     text,

  -- Practice
  offers_telehealth             boolean default false,
  offers_in_person              boolean default false,
  location_city                 text,
  location_state                text,                    -- 2-letter US state code
  location_lat                  float,
  location_lng                  float,

  -- Insurance
  insurance_accepted            text[],                  -- e.g. ['Aetna', 'Blue Cross', 'Cigna']
  sliding_scale                 boolean default false,

  -- Equi integration
  is_equi_partner               boolean default false,   -- Equi Partner Network member
  calendly_username             text,                    -- for booking link generation
  activity_prescribing_enabled  boolean default false,

  -- Status
  verified_at                   timestamptz,             -- null = unverified / pending
  profile_visible               boolean default true,

  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now()
);

-- ── Upgrade pre-existing psychiatrists table (Phase 3D → 5E) ─────────────────
-- These are no-ops on a fresh database (columns already in CREATE TABLE above).
-- On existing databases (Phase 3D schema), they add the missing columns.
alter table psychiatrists add column if not exists npi_number              text;
alter table psychiatrists add column if not exists photo_url               text;
alter table psychiatrists add column if not exists location_state          text;   -- 2-letter state; 3D used location_country
alter table psychiatrists add column if not exists location_lat            float;
alter table psychiatrists add column if not exists location_lng            float;
alter table psychiatrists add column if not exists sliding_scale           boolean default false;
alter table psychiatrists add column if not exists calendly_username       text;
alter table psychiatrists add column if not exists activity_prescribing_enabled boolean default false;
alter table psychiatrists add column if not exists verified_at             timestamptz;
alter table psychiatrists add column if not exists profile_visible         boolean default true;
alter table psychiatrists add column if not exists updated_at              timestamptz default now();

-- Unique constraint on npi_number (skipped if it already exists)
do $$ begin
  alter table psychiatrists add constraint psychiatrists_npi_number_key unique (npi_number);
exception when duplicate_object then null;
end $$;

-- Trigger to keep updated_at current
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists psychiatrists_updated_at on psychiatrists;
create trigger psychiatrists_updated_at
  before update on psychiatrists
  for each row execute procedure set_updated_at();

-- ── Public-safe view (excludes NPI number and precise lat/lng) ───────────────

drop view if exists psychiatrists_public;
create view psychiatrists_public as
  select
    id,
    name,
    credentials,
    bio,
    photo_url,
    offers_telehealth,
    offers_in_person,
    location_city,
    location_state,
    insurance_accepted,
    sliding_scale,
    is_equi_partner,
    calendly_username,
    activity_prescribing_enabled
  from psychiatrists
  where verified_at is not null
    and profile_visible = true;

-- No RLS on psychiatrists — it's a public directory.
-- The view already filters unverified / hidden profiles.

-- ── Patient ↔ Psychiatrist connection ───────────────────────────────────────

create table if not exists psychiatrist_connections (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid references auth.users on delete cascade not null,
  psychiatrist_id   uuid references psychiatrists on delete cascade not null,
  status            text default 'requested',   -- 'requested' | 'accepted' | 'ended'
  share_ai_report   boolean default false,
  share_medication  boolean default false,
  share_cycle_data  boolean default false,
  connected_at      timestamptz default now(),
  unique(patient_id, psychiatrist_id)
);

alter table psychiatrist_connections enable row level security;

drop policy if exists "patients manage own connections" on psychiatrist_connections;
create policy "patients manage own connections"
  on psychiatrist_connections for all
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- ── Bookings ─────────────────────────────────────────────────────────────────

create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid references auth.users on delete cascade not null,
  psychiatrist_id     uuid references psychiatrists on delete cascade not null,
  calendly_event_uri  text,                       -- Calendly event URI (for cancellation)
  appointment_at      timestamptz,
  appointment_type    text,                       -- 'telehealth' | 'in_person'
  insurance_claimed   text,
  status              text default 'scheduled',   -- 'scheduled' | 'completed' | 'cancelled'
  created_at          timestamptz default now()
);

alter table bookings enable row level security;

drop policy if exists "patients see own bookings" on bookings;
create policy "patients see own bookings"
  on bookings for all
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- ── Performance indexes ──────────────────────────────────────────────────────

create index if not exists idx_psychiatrist_connections_patient
  on psychiatrist_connections(patient_id);
create index if not exists idx_psychiatrist_connections_psychiatrist
  on psychiatrist_connections(psychiatrist_id);
create index if not exists idx_bookings_patient
  on bookings(patient_id);
create index if not exists idx_psychiatrists_partner
  on psychiatrists(is_equi_partner, verified_at, profile_visible);
create index if not exists idx_psychiatrists_state
  on psychiatrists(location_state) where verified_at is not null;

-- ── RLS: psychiatrists can read connected patient data (share flags respected)

-- Cycle logs: psychiatrist can read if patient has accepted and share_cycle_data = true
drop policy if exists "psychiatrist_read_cycle" on cycle_logs;
create policy "psychiatrist_read_cycle"
  on cycle_logs for select
  using (
    auth.uid() = user_id   -- patient reads own data (existing policy via user_id)
    or exists (
      select 1 from psychiatrist_connections
      where patient_id = cycle_logs.user_id
        and psychiatrist_id = auth.uid()::uuid
        and status = 'accepted'
        and share_cycle_data = true
    )
  );

-- ── Seed data — Equi Partner Network (remove before production if populating from portal) ──

-- To add verified psychiatrists, run INSERT statements here or use the Supabase dashboard.
-- Example (uncomment and edit to add your first partner):
--
-- insert into psychiatrists (npi_number, name, credentials, bio, offers_telehealth, offers_in_person,
--   location_city, location_state, insurance_accepted, sliding_scale, is_equi_partner,
--   calendly_username, activity_prescribing_enabled, verified_at)
-- values ('1234567890', 'Dr. Sarah Okonkwo', 'MD, ABPN Board Certified',
--   'Dr. Okonkwo specialises in bipolar spectrum disorders and trauma-informed care.',
--   true, true, 'Chicago', 'IL',
--   ARRAY['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'United Health'],
--   true, true, 'drokonkwo', true, now())
-- on conflict (npi_number) do nothing;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5F — Donations & Sponsor-a-User
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Donations ────────────────────────────────────────────────────────────────

create table if not exists donations (
  id                      uuid primary key default gen_random_uuid(),

  -- Donor (nullable — anonymous donations fully supported)
  donor_user_id           uuid references auth.users on delete set null,
  donor_email             text,                           -- from Stripe, may differ from account email

  -- Payment
  stripe_payment_id       text unique not null,           -- Stripe PaymentIntent or Invoice ID
  amount_cents            integer not null,               -- e.g. 500 = $5.00
  currency                text default 'usd',
  is_recurring            boolean default false,
  stripe_subscription_id  text,

  -- Status
  status                  text default 'succeeded',       -- 'succeeded' | 'refunded' | 'disputed'

  -- Allocation
  allocation              text default 'general',         -- 'general' | 'sponsor_user' | 'server_costs'
  sponsored_user_id       uuid references auth.users on delete set null,
  donor_message           text check (char_length(donor_message) <= 280),

  created_at              timestamptz default now()
);

alter table donations enable row level security;

-- Donors see only their own records; service role (webhook) sees all
drop policy if exists "donors see own donations" on donations;
create policy "donors see own donations"
  on donations for select
  using (auth.uid() = donor_user_id);

-- ── Sponsored users ──────────────────────────────────────────────────────────

create table if not exists sponsored_users (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade not null unique,
  sponsored_by    uuid references auth.users on delete set null,   -- null = general pool
  donation_id     uuid references donations on delete set null,
  sponsored_until timestamptz not null,
  created_at      timestamptz default now()
);

alter table sponsored_users enable row level security;

-- Users see only their own sponsor status
drop policy if exists "users see own sponsor status" on sponsored_users;
create policy "users see own sponsor status"
  on sponsored_users for select
  using (auth.uid() = user_id);

-- ── Spending log (public — feeds transparency dashboard) ─────────────────────

create table if not exists spending_log (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,     -- 'server' | 'moderation' | 'development' | 'legal'
  amount_cents  integer not null,
  description   text not null,     -- e.g. "Supabase Pro — March 2026"
  period_start  date,
  period_end    date,
  created_at    timestamptz default now()
);

-- Public read — no RLS (feeds the public equiapp.com/transparency page)
-- Writes are service-role only (Supabase dashboard / webhook)

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_donations_donor      on donations(donor_user_id);
create index if not exists idx_donations_status     on donations(status, created_at);
create index if not exists idx_sponsored_users_until on sponsored_users(sponsored_until);


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- After running, confirm with:
--
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'profiles'
--   order by ordinal_position;
--
--   select table_name
--   from information_schema.tables
--   where table_schema = 'public'
--   order by table_name;
--
--   select * from psychiatrists_public limit 5;
