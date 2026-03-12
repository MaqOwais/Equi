import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  Companion, PsychiatristConnection,
  AccessApprovalRequest, ApprovalRequestType, ApproverRole,
} from '../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataSection =
  | 'share_cycle_data'
  | 'share_journal'
  | 'share_activities'
  | 'share_medication'
  | 'share_sleep'
  | 'share_nutrition'
  | 'share_workbook'
  | 'share_ai_report';

export const SECTION_META: Record<DataSection, { label: string; icon: string; desc: string }> = {
  share_cycle_data:  { label: 'Cycle Tracker',   icon: '🔄', desc: 'Mood & cycle state logs' },
  share_journal:     { label: 'Journal',          icon: '📖', desc: 'Your written journal entries' },
  share_activities:  { label: 'Activities',       icon: '🏃', desc: 'Activity completions & bookmarks' },
  share_medication:  { label: 'Medications',      icon: '💊', desc: 'Adherence & skip reasons' },
  share_sleep:       { label: 'Sleep',            icon: '🌙', desc: 'Sleep duration & quality' },
  share_nutrition:   { label: 'Nutrition',        icon: '🥗', desc: 'Food quality logs' },
  share_workbook:    { label: 'Workbook',         icon: '📝', desc: 'Bipolar workbook responses' },
  share_ai_report:   { label: 'AI Report',        icon: '✦',  desc: 'Weekly AI wellness report' },
};

// Sections that require guardian approval before toggling (for guardian connections)
export const GUARDIAN_APPROVAL_SECTIONS: DataSection[] = [
  'share_medication', 'share_journal', 'share_workbook',
];

// Default sections enabled per role
export const PSYCHIATRIST_DEFAULTS: DataSection[] = [
  'share_cycle_data', 'share_medication', 'share_ai_report', 'share_sleep',
];
export const GUARDIAN_DEFAULTS: DataSection[] = [
  'share_cycle_data', 'share_medication', 'share_ai_report',
];
export const WELL_WISHER_DEFAULTS: DataSection[] = [
  'share_cycle_data',
];
// Well-wishers are limited to these sections only
export const WELL_WISHER_ALLOWED: DataSection[] = [
  'share_cycle_data', 'share_ai_report',
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface AccessStore {
  psychiatristConn: PsychiatristConnection | null;
  guardians: Companion[];
  wellWishers: Companion[];
  pendingRequests: AccessApprovalRequest[];
  isLoading: boolean;

  load: (userId: string) => Promise<void>;

  // Toggle a section for a companion (guardian or well-wisher)
  toggleCompanionSection: (
    companionId: string,
    section: DataSection,
    value: boolean,
    userId: string,
  ) => Promise<{ needsApproval: boolean }>;

  // Toggle a section for the psychiatrist connection
  togglePsychiatristSection: (
    connId: string,
    section: DataSection,
    value: boolean,
  ) => Promise<void>;

  // Submit a change request (access_change or medication_change)
  submitApprovalRequest: (params: {
    userId: string;
    requestType: ApprovalRequestType;
    approverRole: ApproverRole;
    approverCompanionId: string | null;
    description: string;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
  }) => Promise<AccessApprovalRequest | null>;

  // Cancel a pending request
  cancelRequest: (requestId: string) => Promise<void>;
}

export const useAccessStore = create<AccessStore>((set, get) => ({
  psychiatristConn: null,
  guardians: [],
  wellWishers: [],
  pendingRequests: [],
  isLoading: false,

  async load(userId) {
    set({ isLoading: true });
    const [connRes, companionsRes, requestsRes] = await Promise.all([
      supabase
        .from('psychiatrist_connections')
        .select('*')
        .eq('patient_id', userId)
        .eq('status', 'accepted')
        .maybeSingle(),
      supabase
        .from('companions')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at'),
      supabase
        .from('access_approval_requests')
        .select('*')
        .eq('patient_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    const companions = (companionsRes.data ?? []) as Companion[];
    set({
      psychiatristConn: (connRes.data ?? null) as PsychiatristConnection | null,
      guardians:   companions.filter((c) => c.role === 'guardian'),
      wellWishers: companions.filter((c) => c.role === 'well_wisher'),
      pendingRequests: (requestsRes.data ?? []) as AccessApprovalRequest[],
      isLoading: false,
    });
  },

  async toggleCompanionSection(companionId, section, value, userId) {
    const companion = [...get().guardians, ...get().wellWishers].find((c) => c.id === companionId);
    if (!companion) return { needsApproval: false };

    // Guardian changes to sensitive sections require approval
    const needsApproval =
      companion.role === 'guardian' &&
      GUARDIAN_APPROVAL_SECTIONS.includes(section);

    if (needsApproval) {
      // Create approval request — don't apply the change yet
      await get().submitApprovalRequest({
        userId,
        requestType: 'access_change',
        approverRole: 'guardian',
        approverCompanionId: companionId,
        description: `${value ? 'Enable' : 'Disable'} ${SECTION_META[section].label} access for your guardian`,
        oldValue: { [section]: !value },
        newValue: { [section]: value },
      });
      return { needsApproval: true };
    }

    // No approval needed — apply immediately
    const update = { [section]: value };
    set((s) => ({
      guardians:   s.guardians.map((c)   => c.id === companionId ? { ...c, ...update } : c),
      wellWishers: s.wellWishers.map((c) => c.id === companionId ? { ...c, ...update } : c),
    }));
    await supabase.from('companions').update(update).eq('id', companionId);
    return { needsApproval: false };
  },

  async togglePsychiatristSection(connId, section, value) {
    const update = { [section]: value };
    set((s) => ({
      psychiatristConn: s.psychiatristConn
        ? { ...s.psychiatristConn, ...update }
        : null,
    }));
    await supabase.from('psychiatrist_connections').update(update).eq('id', connId);
  },

  async submitApprovalRequest({ userId, requestType, approverRole, approverCompanionId, description, oldValue, newValue }) {
    const { data } = await supabase
      .from('access_approval_requests')
      .insert({
        patient_id: userId,
        request_type: requestType,
        approver_role: approverRole,
        approver_companion_id: approverCompanionId,
        description,
        old_value: oldValue,
        new_value: newValue,
        status: 'pending',
      })
      .select()
      .single();

    if (data) {
      set((s) => ({ pendingRequests: [data as AccessApprovalRequest, ...s.pendingRequests] }));
      return data as AccessApprovalRequest;
    }
    return null;
  },

  async cancelRequest(requestId) {
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((r) => r.id !== requestId),
    }));
    await supabase
      .from('access_approval_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
  },
}));
