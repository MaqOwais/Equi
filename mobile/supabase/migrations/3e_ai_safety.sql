-- ─── Phase 3E: AI, Insights & Safety ────────────────────────────────────────
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── AI Reports ────────────────────────────────────────────────────────────────

create table if not exists ai_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  report_type  text not null,     -- 'weekly' | 'monthly'
  period_start date not null,
  period_end   date not null,
  report_json  jsonb not null,
  pdf_url      text,
  created_at   timestamptz default now()
);
alter table ai_reports enable row level security;
create policy "own reports" on ai_reports using (auth.uid() = user_id);

-- ── Relapse Signatures ────────────────────────────────────────────────────────

create table if not exists relapse_signatures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  episode_type text not null,       -- 'manic' | 'depressive'
  warning_signs text[] not null,    -- 1–3 personal early warning signs
  days_before  smallint,            -- 1–14
  noticed_by   text,                -- 'me' | 'both' | 'people_around_me'
  created_at   timestamptz default now(),
  unique (user_id, episode_type)
);
alter table relapse_signatures enable row level security;
create policy "own signatures" on relapse_signatures using (auth.uid() = user_id);

-- ── Emergency Contacts ────────────────────────────────────────────────────────
-- (Table may already exist from earlier phases — create if not exists)

create table if not exists emergency_contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  name         text not null,
  phone        text not null,
  contact_type text default 'emergency',  -- 'emergency' | 'social'
  created_at   timestamptz default now()
);
alter table emergency_contacts enable row level security;
create policy "own contacts"
  on emergency_contacts using (auth.uid() = user_id);
