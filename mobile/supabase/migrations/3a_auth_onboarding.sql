-- ─────────────────────────────────────────────────────────────────────────────
-- Equi — Full baseline schema (Phase 2 + Phase 3A combined)
-- Run this in the Supabase Dashboard → SQL Editor
-- Safe to run on a fresh project — uses IF NOT EXISTS throughout
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Cycle state enum
do $$ begin
  create type cycle_state as enum ('stable', 'manic', 'depressive', 'mixed');
exception when duplicate_object then null;
end $$;

-- 2. Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  diagnosis_confirmed boolean default false,
  current_cycle_state cycle_state default 'stable',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  -- Phase 3A columns
  diagnosis text,
  track_medication boolean default false,
  user_role text default 'patient',
  companion_for uuid,
  companion_relationship text,
  timezone text default 'UTC',
  theme jsonb
);

-- 3. Row Level Security on profiles
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- 4. Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, user_role)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    'patient'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 5. Emergency contacts table
create table if not exists emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  phone text not null,
  contact_type text default 'emergency',
  created_at timestamptz default now()
);

alter table emergency_contacts enable row level security;

drop policy if exists "Users can manage own contacts" on emergency_contacts;
create policy "Users can manage own contacts"
  on emergency_contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify:
--   select column_name from information_schema.columns where table_name = 'profiles' order by ordinal_position;
--   select * from emergency_contacts limit 5;
-- ─────────────────────────────────────────────────────────────────────────────
