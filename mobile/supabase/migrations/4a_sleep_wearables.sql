-- Phase 4A: Sleep & Wearable Sync
-- Idempotent — safe to re-run.

-- ── Enums ──────────────────────────────────────────────────────────────────────

do $$ begin
  create type sleep_source as enum ('manual', 'healthkit', 'google_fit');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type wearable_provider as enum ('healthkit', 'google_fit');
exception when duplicate_object then null;
end $$;

-- ── sleep_logs ─────────────────────────────────────────────────────────────────

create table if not exists sleep_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  date             date not null,
  duration_minutes int,
  quality_score    int check (quality_score between 1 and 5),
  source           sleep_source default 'manual',
  bedtime          time,
  wake_time        time,
  deep_minutes     int,
  rem_minutes      int,
  awakenings       int,
  raw_healthkit    jsonb,          -- raw payload; never sent to AI
  created_at       timestamptz default now(),
  unique (user_id, date)
);

alter table sleep_logs enable row level security;

drop policy if exists "Users own their sleep logs" on sleep_logs;
create policy "Users own their sleep logs"
  on sleep_logs for all using (auth.uid() = user_id);

-- ── wearable_connections ───────────────────────────────────────────────────────

create table if not exists wearable_connections (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  provider         wearable_provider not null,
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  connected_at     timestamptz default now(),
  last_synced_at   timestamptz,
  unique (user_id, provider)
);

alter table wearable_connections enable row level security;

drop policy if exists "Users own their wearable connections" on wearable_connections;
create policy "Users own their wearable connections"
  on wearable_connections for all using (auth.uid() = user_id);
