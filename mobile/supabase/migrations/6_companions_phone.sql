-- ─── Migration 6: Add phone to companions ──────────────────────────────────
-- Run in Supabase Dashboard → SQL Editor
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- 1. Add phone column
ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. Fix missing INSERT policy on companions
--    Without this, sendInvite() silently fails in production (RLS rejects the insert)
DROP POLICY IF EXISTS "patient creates companion" ON companions;
CREATE POLICY "patient creates companion"
  ON companions FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- 3. Fix missing UPDATE policy on companions
--    Needed for guardian_level changes and share toggle updates
DROP POLICY IF EXISTS "patient updates companion" ON companions;
CREATE POLICY "patient updates companion"
  ON companions FOR UPDATE
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- 4. Fix missing DELETE policy on companions
--    Needed for the "Remove companion" button
DROP POLICY IF EXISTS "patient deletes companion" ON companions;
CREATE POLICY "patient deletes companion"
  ON companions FOR DELETE
  USING (auth.uid() = patient_id);

-- 5. Fix bookings default status: 'requested' not 'scheduled'
--    (TS type has 'requested' as initial state, SQL had 'scheduled' as default)
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'requested';

-- VERIFY:
--   select column_name, data_type from information_schema.columns
--   where table_name = 'companions' order by ordinal_position;
--
--   select policyname, cmd from pg_policies where tablename = 'companions';
