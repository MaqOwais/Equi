/**
 * Supabase database types — Phase 3B.
 * Replace with auto-generated types once schema is stable:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 */

export type CycleState = 'stable' | 'manic' | 'depressive' | 'mixed';
export type Diagnosis = 'bipolar_1' | 'bipolar_2' | 'cyclothymia' | 'unsure';
export type UserRole = 'patient' | 'companion';
export type ContactType = 'emergency' | 'social';
export type MedicationStatus = 'taken' | 'skipped' | 'partial';

// ── Phase 3B row types ─────────────────────────────────────────────────────

export interface CycleLog {
  id: string;
  user_id: string;
  logged_at: string;   // ISO date YYYY-MM-DD
  state: CycleState;
  intensity: number;
  symptoms: string[];
  notes: string | null;
  created_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  score: number;       // 1-10
  cycle_state: CycleState | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  blocks: string;      // plain text in 3B; Lexical JSON in future
  cycle_state: CycleState | null;
  mood_score: number | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  alcohol: boolean | null;
  cannabis: boolean | null;
  created_at: string;
}

export interface MedicationLog {
  id: string;
  user_id: string;
  log_date: string;
  status: MedicationStatus;
  skip_reason: string | null;
  side_effects: string[];
  share_with_psychiatrist: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  diagnosis_confirmed: boolean;
  current_cycle_state: CycleState;
  onboarding_complete: boolean;
  created_at: string;
  // Phase 3A additions
  diagnosis: Diagnosis | null;
  track_medication: boolean;
  user_role: UserRole;
  companion_for: string | null;
  companion_relationship: string | null;
  timezone: string;
  theme: Record<string, unknown> | null;
  // Phase 5C additions
  onboarding_step: OnboardingStep;
  onboarding_completed_at: string | null;
  last_active_at: string | null;
  // Medication & substance preferences
  medication_name: string | null;
  medication_dosage: string | null;
  track_substances: boolean;
}

export type OnboardingStep =
  | 'role' | 'auth' | 'diagnosis' | 'medication'
  | 'network' | 'relapse' | 'permissions' | 'complete';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  contact_type: ContactType;
  created_at: string;
}

// ── Phase 3C row types ─────────────────────────────────────────────────────

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  category: string | null;
  compatible_states: CycleState[];
  restricted_states: CycleState[];
  is_workbook_entry: boolean;
  illustration_url: string | null;
  evidence_label: string | null;
  created_at: string;
}

export interface ActivityCompletion {
  id: string;
  user_id: string;
  activity_id: string;
  completed_at: string | null;
  cycle_state: CycleState | null;
  notes: string | null;
  bookmarked: boolean;
  created_at: string;
  activity?: Activity;
}

export interface PrescribedActivity {
  id: string;
  patient_id: string;
  psychiatrist_id: string | null;
  activity_id: string;
  dosage_per_week: number | null;
  goal: string | null;
  prescribed_at: string;
  active: boolean;
  activity?: Activity;
  completions_this_week?: number;
}

export interface WorkbookResponse {
  id: string;
  user_id: string;
  chapter: number;
  prompt_index: number;
  response: string;
  entry_date: string; // YYYY-MM-DD — for calendar grouping
  created_at: string;
  updated_at: string;
}

export interface RoutineAnchor {
  id: string;
  user_id: string;
  anchor_name: string;
  target_time: string | null;
  enabled: boolean;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  log_date: string;
  categories: Record<string, number>;
  eating_window_start: string | null;
  eating_window_end: string | null;
  hydration_glasses: number | null;
  gut_health_note: string | null;
  input_method: string | null;
  created_at: string;
}

// ── Phase 3D row types ─────────────────────────────────────────────────────

export type PostReaction = 'i_relate' | 'thank_you_for_sharing';
export type CompanionRole = 'well_wisher' | 'guardian';
export type GuardianLevel = 'view_only' | 'alert_on_risk' | 'full_control';
export type CompanionStatus = 'pending' | 'accepted' | 'rejected';

export interface CommunityPost {
  id: string;
  author_id: string;
  channel: string;
  body: string;
  moderation_status: string;
  moderation_reason: string | null;
  created_at: string;
  // Derived from join
  reactions?: { reaction: PostReaction; user_id: string }[];
}

export interface Companion {
  id: string;
  patient_id: string;
  companion_id: string | null;
  role: CompanionRole;
  guardian_level: GuardianLevel | null;
  status: CompanionStatus;
  // Data section toggles
  share_mood_summaries: boolean;
  share_cycle_data: boolean;
  share_journal: boolean;
  share_activities: boolean;
  share_ai_report: boolean;
  share_medication: boolean;
  share_sleep: boolean;
  share_nutrition: boolean;
  share_workbook: boolean;
  // Optional expiry
  access_expires_at: string | null;
  invite_email: string | null;
  phone: string | null;
  created_at: string;
}

// ── Access approval requests ───────────────────────────────────────────────

export type ApprovalRequestType = 'medication_change' | 'access_change';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApproverRole = 'psychiatrist' | 'guardian';

export interface AccessApprovalRequest {
  id: string;
  patient_id: string;
  request_type: ApprovalRequestType;
  description: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  status: ApprovalStatus;
  approver_role: ApproverRole;
  approver_companion_id: string | null;   // null when approver is psychiatrist
  responded_at: string | null;
  created_at: string;
}

export interface Psychiatrist {
  id: string;
  // Identity
  npi_number: string;
  name: string;
  credentials: string | null;
  bio: string | null;
  photo_url: string | null;
  // Practice
  offers_telehealth: boolean;
  offers_in_person: boolean;
  location_city: string | null;
  location_state: string | null;   // 2-letter US state
  // Insurance
  insurance_accepted: string[] | null;
  sliding_scale: boolean;
  // Equi integration
  is_equi_partner: boolean;
  calendly_username: string | null;
  activity_prescribing_enabled: boolean;
  // Status
  verified_at: string | null;
  profile_visible: boolean;
  created_at: string;
}

export interface PsychiatristConnection {
  id: string;
  patient_id: string;
  psychiatrist_id: string;
  status: 'requested' | 'accepted' | 'ended';
  share_cycle_data: boolean;
  share_journal: boolean;
  share_activities: boolean;
  share_ai_report: boolean;
  share_medication: boolean;
  share_sleep: boolean;
  share_nutrition: boolean;
  share_workbook: boolean;
  connected_at: string;
}

export interface Booking {
  id: string;
  patient_id: string;
  psychiatrist_id: string;
  calendly_event_uri: string | null;
  appointment_at: string | null;
  appointment_type: 'telehealth' | 'in_person' | null;
  insurance_claimed: string | null;
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  include_ai_snapshot: boolean;
  created_at: string;
}

// ── Phase 4B row types ─────────────────────────────────────────────────────

export interface AnchorDetailEntry {
  anchor_id: string;
  anchor_name: string;
  target: string;         // HH:MM:SS
  actual: string | null;  // HH:MM:SS
  delta_minutes: number | null;
}

export interface RoutineAnchorLog {
  id: string;
  user_id: string;
  anchor_id: string;
  date: string;           // YYYY-MM-DD
  actual_time: string;    // HH:MM:SS
  source: string;         // 'manual' | 'healthkit' | 'auto_log_now'
  created_at: string;
}

export interface SocialRhythmLog {
  id: string;
  user_id: string;
  date: string;
  score: number | null;            // 0–100
  anchors_hit: number | null;
  anchors_partial: number | null;
  anchors_total: number | null;
  anchor_detail: AnchorDetailEntry[] | null;
  created_at: string;
}

// ── Phase 4D row types ─────────────────────────────────────────────────────

export interface ReportShare {
  id: string;
  report_id: string;
  user_id: string;
  companion_id: string | null;
  share_url: string;
  expires_at: string;
  viewed_at: string | null;
  created_at: string;
}

// ── Medications & Substances ───────────────────────────────────────────────

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  times: string[];            // ['HH:MM', ...] — one notification per time
  ring_enabled: boolean;      // alarm-style sound vs silent notification
  active: boolean;
  created_at: string;
}

export type SubstanceCategory = 'alcohol' | 'cannabis' | 'stimulant' | 'opioid' | 'other';

export interface UserSubstance {
  id: string;
  user_id: string;
  name: string;
  category: SubstanceCategory;
  active: boolean;
  created_at: string;
}

// ── Phase 4C row types ─────────────────────────────────────────────────────

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_token: string | null;
  push_token_updated_at: string | null;
  // Reminders
  checkin_enabled: boolean;
  checkin_time: string;             // HH:MM:SS
  checkin_ring: boolean;
  // Insights
  weekly_report_enabled: boolean;
  early_warning_enabled: boolean;
  // Routine
  anchor_nudges_enabled: boolean;
  anchor_nudges_ring: boolean;
  // Journal
  journal_enabled: boolean;
  journal_time: string;             // HH:MM:SS
  journal_ring: boolean;
  // Sleep log
  sleep_log_enabled: boolean;
  sleep_log_time: string;           // HH:MM:SS (morning reminder)
  sleep_log_ring: boolean;
  // Activity reminder
  activity_reminder_enabled: boolean;
  activity_reminder_time: string;   // HH:MM:SS
  activity_reminder_ring: boolean;
  // Safety
  post_crisis_enabled: boolean;
  updated_at: string;
}

// ── Phase 4A row types ─────────────────────────────────────────────────────

export type SleepSource = 'manual' | 'healthkit' | 'google_fit';
export type WearableProvider = 'healthkit' | 'google_fit';

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;                   // YYYY-MM-DD
  duration_minutes: number | null;
  quality_score: number | null;   // 1–5
  source: SleepSource;
  bedtime: string | null;         // HH:MM:SS
  wake_time: string | null;
  deep_minutes: number | null;
  rem_minutes: number | null;
  awakenings: number | null;
  raw_healthkit: Record<string, unknown> | null;
  created_at: string;
}

export interface WearableConnection {
  id: string;
  user_id: string;
  provider: WearableProvider;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  connected_at: string;
  last_synced_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      emergency_contacts: {
        Row: EmergencyContact;
        Insert: Omit<EmergencyContact, 'id' | 'created_at'>;
        Update: Partial<EmergencyContact>;
      };
    };
    Enums: {
      cycle_state: CycleState;
    };
  };
}
