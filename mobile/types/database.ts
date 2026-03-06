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
}

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
  share_mood_summaries: boolean;
  share_cycle_data: boolean;
  share_ai_report: boolean;
  share_medication: boolean;
  invite_email: string | null;
  created_at: string;
}

export interface Psychiatrist {
  id: string;
  name: string;
  credentials: string | null;
  bio: string | null;
  is_equi_partner: boolean;
  offers_telehealth: boolean;
  offers_in_person: boolean;
  insurance_accepted: string[] | null;
  location_city: string | null;
  location_country: string | null;
  created_at: string;
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
