-- ─── Phase 3D: Social & Community ────────────────────────────────────────────
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type companion_role as enum ('well_wisher', 'guardian');
create type guardian_level as enum ('view_only', 'alert_on_risk', 'full_control');
create type post_reaction as enum ('i_relate', 'thank_you_for_sharing');

-- ── Community Posts ───────────────────────────────────────────────────────────

create table if not exists community_posts (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid references auth.users on delete cascade,
  channel            text not null,
    -- 'wins_this_week' | 'depressive_days' | 'mania_stories' | 'medication_talk' | 'caregiver_corner'
  body               text not null,
  moderation_status  text default 'pending',
    -- 'approved' | 'flagged' | 'removed' | 'pending'
  moderation_reason  text,
  created_at         timestamptz default now()
);
alter table community_posts enable row level security;

-- Authors see their own posts + all approved posts
create policy "read community" on community_posts for select
  using (moderation_status = 'approved' or author_id = auth.uid());
create policy "insert own" on community_posts for insert
  with check (author_id = auth.uid());
create policy "delete own" on community_posts for delete
  using (author_id = auth.uid());

-- ── Community Reactions ───────────────────────────────────────────────────────

create table if not exists community_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references community_posts on delete cascade,
  user_id     uuid references auth.users on delete cascade,
  reaction    post_reaction not null,
  created_at  timestamptz default now(),
  unique (post_id, user_id)  -- one reaction per user per post
);
alter table community_reactions enable row level security;
create policy "own reactions" on community_reactions using (auth.uid() = user_id);
-- Allow reading reactions so counts are visible to all
create policy "read reactions" on community_reactions for select using (true);

-- ── Companions ────────────────────────────────────────────────────────────────

create table if not exists companions (
  id                    uuid primary key default gen_random_uuid(),
  patient_id            uuid references auth.users on delete cascade,
  companion_id          uuid references auth.users,
  role                  companion_role not null,
  guardian_level        guardian_level,
  status                text default 'pending',  -- 'pending' | 'accepted' | 'rejected'

  -- Per-person sharing toggles (all off by default)
  share_mood_summaries  boolean default false,
  share_cycle_data      boolean default false,
  share_ai_report       boolean default false,
  share_medication      boolean default false,

  invite_email          text,  -- for pending invitations sent by email
  created_at            timestamptz default now(),
  unique (patient_id, companion_id)
);
alter table companions enable row level security;
create policy "patient sees their companions" on companions
  using (auth.uid() = patient_id);
create policy "companion sees their link" on companions
  using (auth.uid() = companion_id);

-- ── Companion Journal Shares ──────────────────────────────────────────────────

create table if not exists companion_journal_shares (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid references auth.users on delete cascade,
  companion_id     uuid references auth.users,
  journal_entry_id uuid references journal_entries on delete cascade,
  shared_at        timestamptz default now()
);
alter table companion_journal_shares enable row level security;
create policy "patient controls shares" on companion_journal_shares
  using (auth.uid() = patient_id);
create policy "companion reads shared" on companion_journal_shares for select
  using (auth.uid() = companion_id);

-- ── Psychiatrists (directory) ─────────────────────────────────────────────────

create table if not exists psychiatrists (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  credentials          text,
  bio                  text,
  is_equi_partner      boolean default false,
  offers_telehealth    boolean default false,
  offers_in_person     boolean default false,
  insurance_accepted   text[],
  location_city        text,
  location_country     text,
  created_at           timestamptz default now()
);
-- Global read — public directory, no RLS needed

-- ── Seed: Psychiatrist Directory (demo data) ──────────────────────────────────

insert into psychiatrists (name, credentials, bio, is_equi_partner, offers_telehealth, offers_in_person, insurance_accepted, location_city, location_country) values

('Dr Sarah Okafor',
 'MD, Board Certified in Psychiatry',
 'Specialises in bipolar spectrum disorders and psychoeducation. Has worked with patients using digital monitoring tools for 8 years.',
 true, true, true,
 ARRAY['Aetna', 'Blue Cross', 'Cigna'],
 'London', 'UK'),

('Dr James Whitfield',
 'MRCPsych, CCST Psychiatry',
 'NHS Consultant Psychiatrist with a focus on affective disorders and lithium management. Partner of the Equi clinical programme.',
 true, true, false,
 ARRAY['NHS', 'Bupa', 'AXA Health'],
 'Manchester', 'UK'),

('Dr Amara Patel',
 'MD, MPH',
 'Focuses on holistic approaches to bipolar care including lifestyle medicine, social rhythms, and medication optimisation.',
 false, true, true,
 ARRAY['United Healthcare', 'Anthem', 'Kaiser'],
 'New York', 'USA'),

('Dr Leila Nasseri',
 'FRANZCP',
 'Adult psychiatrist with a research background in mood disorder early intervention and digital health.',
 true, true, true,
 ARRAY['Medicare', 'Medibank', 'HBF'],
 'Melbourne', 'Australia');
