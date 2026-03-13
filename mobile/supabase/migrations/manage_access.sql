-- ─── Manage Access — DB Migration ────────────────────────────────────────────
-- Run this in Supabase SQL Editor

-- 1. Add granular section columns to companions table
ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS share_journal     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_activities  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_sleep       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_nutrition   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_workbook    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz DEFAULT null;

-- 2. Add granular section columns to psychiatrist_connections table
ALTER TABLE psychiatrist_connections
  ADD COLUMN IF NOT EXISTS share_journal     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_activities  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_sleep       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS share_nutrition   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_workbook    boolean NOT NULL DEFAULT false;

-- 3. Create access approval requests table
CREATE TABLE IF NOT EXISTS access_approval_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request_type          text NOT NULL CHECK (request_type IN ('medication_change', 'access_change')),
  description           text NOT NULL,
  old_value             jsonb,
  new_value             jsonb,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_role         text NOT NULL CHECK (approver_role IN ('psychiatrist', 'guardian')),
  approver_companion_id uuid REFERENCES companions(id) ON DELETE SET NULL,
  responded_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- 4. Row Level Security
ALTER TABLE access_approval_requests ENABLE ROW LEVEL SECURITY;

-- Patient can read and create their own requests
CREATE POLICY "Patient reads own requests"
  ON access_approval_requests FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patient creates own requests"
  ON access_approval_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Patient can cancel (update to rejected) their own pending requests
CREATE POLICY "Patient cancels own requests"
  ON access_approval_requests FOR UPDATE
  USING (auth.uid() = patient_id AND status = 'pending');

-- 5. Index for fast lookup of pending requests per patient
CREATE INDEX IF NOT EXISTS idx_access_approval_patient_status
  ON access_approval_requests (patient_id, status);

-- 6. Add AI access config to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_access jsonb DEFAULT '{
    "share_cycle_data":true,
    "share_journal":true,
    "share_activities":true,
    "share_medication":true,
    "share_sleep":true,
    "share_nutrition":true,
    "share_workbook":true
  }'::jsonb;
