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
