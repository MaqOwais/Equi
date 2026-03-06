-- Phase 4B: Social Rhythm & IPSRT
-- Idempotent — safe to re-run.

-- ── routine_anchor_logs ───────────────────────────────────────────────────────
-- Individual actual-time records per anchor per day.

create table if not exists routine_anchor_logs (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  anchor_id   uuid references routine_anchors on delete cascade not null,
  date        date not null,
  actual_time time not null,
  source      text default 'manual',   -- 'manual' | 'healthkit' | 'auto_log_now'
  created_at  timestamptz default now(),
  unique (user_id, anchor_id, date)
);

alter table routine_anchor_logs enable row level security;

drop policy if exists "Users own their anchor logs" on routine_anchor_logs;
create policy "Users own their anchor logs"
  on routine_anchor_logs for all using (auth.uid() = user_id);

-- ── social_rhythm_logs ────────────────────────────────────────────────────────
-- Daily aggregate score, calculated client-side after anchors are logged.

create table if not exists social_rhythm_logs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users on delete cascade not null,
  date             date not null,
  score            int check (score between 0 and 100),
  anchors_hit      int,      -- count within ±30min
  anchors_partial  int,      -- count within ±60min
  anchors_total    int,      -- total anchors with a target_time set
  anchor_detail    jsonb,    -- [{ anchor_id, anchor_name, target, actual, delta_minutes }]
  created_at       timestamptz default now(),
  unique (user_id, date)
);

alter table social_rhythm_logs enable row level security;

drop policy if exists "Users own their rhythm logs" on social_rhythm_logs;
create policy "Users own their rhythm logs"
  on social_rhythm_logs for all using (auth.uid() = user_id);
