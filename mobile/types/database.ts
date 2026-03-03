/**
 * Supabase database types.
 *
 * This file will be replaced by auto-generated types once the schema is set up:
 *   npx supabase gen types typescript --project-id <project-id> > types/database.ts
 *
 * For now it defines the Phase 2 minimal schema types manually.
 */

export type CycleState = 'stable' | 'manic' | 'depressive' | 'mixed';

export interface Profile {
  id: string;
  display_name: string | null;
  diagnosis_confirmed: boolean;
  current_cycle_state: CycleState;
  onboarding_complete: boolean;
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
    };
    Enums: {
      cycle_state: CycleState;
    };
  };
}
