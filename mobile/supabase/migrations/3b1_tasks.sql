-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3B-1 — Tasks (Daily To-Do list with energy levels)
-- Run in Supabase Dashboard → SQL Editor after 3b_daily_tracking.sql
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users on delete cascade not null,
  title         text        not null,
  energy_level  text        not null default 'medium'
                            check (energy_level in ('low', 'medium', 'high')),
  due_date      date        not null,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz default now()
);

alter table tasks enable row level security;

drop policy if exists "Users manage own tasks" on tasks;
create policy "Users manage own tasks"
  on tasks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists tasks_user_date on tasks (user_id, due_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify:
--   select * from tasks where user_id = auth.uid() order by due_date;
-- ─────────────────────────────────────────────────────────────────────────────
