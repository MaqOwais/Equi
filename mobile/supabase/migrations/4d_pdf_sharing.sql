-- Phase 4D: PDF Export & Data Sharing
-- Idempotent — safe to re-run.

-- ── report_shares ──────────────────────────────────────────────────────────────
-- Tracks every time the user shares their PDF with a companion or copies a link.

create table if not exists report_shares (
  id            uuid default gen_random_uuid() primary key,
  report_id     uuid references ai_reports on delete cascade not null,
  user_id       uuid references auth.users on delete cascade not null,
  companion_id  uuid references companions on delete set null,
  share_url     text not null,
  expires_at    timestamptz not null,
  viewed_at     timestamptz,
  created_at    timestamptz default now()
);

alter table report_shares enable row level security;

drop policy if exists "Users manage their own shares" on report_shares;
create policy "Users manage their own shares"
  on report_shares for all using (auth.uid() = user_id);

-- ── profiles: soft-delete + export tracking ───────────────────────────────────
-- Adds deletion grace period and export timestamp to existing profiles table.

alter table profiles add column if not exists
  deletion_scheduled_at timestamptz;   -- set when user requests account deletion (30-day grace)

alter table profiles add column if not exists
  last_data_export_at timestamptz;     -- set when user triggers personal data export
