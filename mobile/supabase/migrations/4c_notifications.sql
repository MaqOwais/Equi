-- Phase 4C: Smart Notifications
-- Idempotent — safe to re-run.

-- ── notification_preferences ──────────────────────────────────────────────────
-- One row per user. Created on first call to save() from the client.

create table if not exists notification_preferences (
  id                    uuid default gen_random_uuid() primary key,
  user_id               uuid references auth.users on delete cascade not null unique,
  push_token            text,                          -- Expo push token
  push_token_updated_at timestamptz,

  -- Reminders
  checkin_enabled       boolean default true,
  checkin_time          time    default '20:00:00',    -- 8:00 PM
  medication_enabled    boolean default true,
  medication_time       time    default '08:00:00',    -- 8:00 AM

  -- Insights
  weekly_report_enabled boolean default true,
  early_warning_enabled boolean default true,

  -- Routine
  anchor_nudges_enabled boolean default false,         -- off by default

  -- Safety
  post_crisis_enabled   boolean default false,         -- off by default

  updated_at            timestamptz default now()
);

alter table notification_preferences enable row level security;

drop policy if exists "Users own their notification preferences" on notification_preferences;
create policy "Users own their notification preferences"
  on notification_preferences for all using (auth.uid() = user_id);
