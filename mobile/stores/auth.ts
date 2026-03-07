import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface AuthStore {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  // Onboarding transient state (cleared after session is established)
  pendingRole: UserRole | null;
  pendingEmail: string | null;
  setSession: (s: Session | null) => void;
  setProfile: (p: Profile | null) => void;
  setPendingRole: (role: UserRole) => void;
  setPendingEmail: (email: string) => void;
  loadProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  profile: null,
  isLoading: true,
  pendingRole: null,
  pendingEmail: null,

  setSession: (session) => set({ session, isLoading: false }),

  setProfile: (profile) => set({ profile }),

  setPendingRole: (pendingRole) => set({ pendingRole }),

  setPendingEmail: (pendingEmail) => set({ pendingEmail }),

  loadProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) set({ profile: data as Profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, pendingRole: null, pendingEmail: null });
  },
}));
