-- Phase 4E: Enhanced AI — schema additions
-- Idempotent — safe to re-run.

-- ── ai_reports: add monthly report type support ───────────────────────────────
-- report_type already exists as text DEFAULT 'weekly'.
-- Add a check constraint to document valid values (won't break existing rows).

alter table ai_reports
  drop constraint if exists ai_reports_report_type_check;

alter table ai_reports
  add constraint ai_reports_report_type_check
  check (report_type in ('weekly', 'monthly'));

-- ── community_posts: moderation webhook setup note ───────────────────────────
-- The moderate-post Edge Function is triggered by a Database Webhook.
-- Set up in Supabase Dashboard → Database → Webhooks:
--   Name:    moderate-post-on-insert
--   Table:   community_posts
--   Events:  INSERT
--   URL:     https://<project>.supabase.co/functions/v1/moderate-post
--   Headers: Authorization: Bearer <service_role_key>
--
-- The Edge Function updates community_posts.moderation_status to
-- 'approved' or 'rejected' based on Perspective API + Groq LLM review.
