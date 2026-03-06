-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3B — Daily Tracking
-- Run in Supabase Dashboard → SQL Editor after 3a_auth_onboarding.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. medication_status enum
do $$ begin
  create type medication_status as enum ('taken', 'skipped', 'partial');
exception when duplicate_object then null;
end $$;

-- 2. cycle_logs
create table if not exists cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  state cycle_state not null,
  intensity smallint check (intensity between 1 and 10),
  symptoms text[],
  notes text,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);
alter table cycle_logs enable row level security;
drop policy if exists "own cycle logs" on cycle_logs;
create policy "own cycle logs" on cycle_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. mood_logs
create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  logged_at date not null default current_date,
  score smallint not null check (score between 1 and 10),
  cycle_state cycle_state,
  created_at timestamptz default now(),
  unique (user_id, logged_at)
);
alter table mood_logs enable row level security;
drop policy if exists "own mood logs" on mood_logs;
create policy "own mood logs" on mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. journal_entries
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  entry_date date not null default current_date,
  blocks jsonb not null default '""',
  cycle_state cycle_state,
  mood_score smallint,
  sleep_hours numeric(3,1),
  locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, entry_date)
);
alter table journal_entries enable row level security;
drop policy if exists "own journal" on journal_entries;
create policy "own journal" on journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. daily_checkins
create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  checkin_date date not null default current_date,
  alcohol boolean,
  cannabis boolean,
  created_at timestamptz default now(),
  unique (user_id, checkin_date)
);
alter table daily_checkins enable row level security;
drop policy if exists "own checkins" on daily_checkins;
create policy "own checkins" on daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. medication_logs
create table if not exists medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  log_date date not null default current_date,
  status medication_status not null,
  skip_reason text,
  side_effects text[],
  share_with_psychiatrist boolean default false,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);
alter table medication_logs enable row level security;
drop policy if exists "own medication logs" on medication_logs;
create policy "own medication logs" on medication_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. sleep_logs
create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  sleep_date date not null,
  hours_slept numeric(3,1),
  quality_percent smallint check (quality_percent between 0 and 100),
  source text default 'manual',
  created_at timestamptz default now(),
  unique (user_id, sleep_date)
);
alter table sleep_logs enable row level security;
drop policy if exists "own sleep" on sleep_logs;
create policy "own sleep" on sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. life_events
create table if not exists life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_date date not null,
  title text not null,
  category text,
  created_at timestamptz default now()
);
alter table life_events enable row level security;
drop policy if exists "own life events" on life_events;
create policy "own life events" on life_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify:
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
-- ─────────────────────────────────────────────────────────────────────────────
