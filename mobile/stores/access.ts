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
  share_cycle_data: { label: 'Cycle Tracker',  icon: '🔄', desc: 'Mood & cycle state logs' },
  share_journal:    { label: 'Journal',         icon: '📖', desc: 'Your written journal entries' },
  share_activities: { label: 'Activities',      icon: '🏃', desc: 'Activity completions & bookmarks' },
  share_medication: { label: 'Medications',     icon: '💊', desc: 'Adherence & skip reasons' },
  share_sleep:      { label: 'Sleep',           icon: '🌙', desc: 'Sleep duration & quality' },
  share_nutrition:  { label: 'Nutrition',       icon: '🥗', desc: 'Food quality logs' },
  share_workbook:   { label: 'Workbook',        icon: '📝', desc: 'Bipolar workbook responses' },
  share_ai_report:  { label: 'AI Report',       icon: '✦',  desc: 'Weekly AI wellness report' },
};

export const ALL_SECTIONS = Object.keys(SECTION_META) as DataSection[];

// AI can access everything except the AI report itself
export const AI_SECTIONS: DataSection[] = [
  'share_cycle_data', 'share_journal', 'share_activities',
  'share_medication', 'share_sleep', 'share_nutrition', 'share_workbook',
];

// Approval logic — returns true when the change needs guardian approval
export function requiresApproval(
  role: 'guardian' | 'well_wisher' | 'psychiatrist',
  newValue: boolean,
): boolean {
  if (role === 'psychiatrist') return true;        // any psychiatrist access change
  if (role === 'guardian')    return !newValue;    // turning guardian access OFF
  if (role === 'well_wisher') return newValue;     // turning well-wisher access ON
  return false;
}

// Default AI access (all on)
const DEFAULT_AI_ACCESS: Record<DataSection, boolean> = {
  share_cycle_data: true,
  share_journal:    true,
  share_activities: true,
  share_medication: true,
  share_sleep:      true,
  share_nutrition:  true,
  share_workbook:   true,
  share_ai_report:  false, // not applicable
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface AccessStore {
  psychiatristConn: PsychiatristConnection | null;
  guardians: Companion[];
  wellWishers: Companion[];
  pendingRequests: AccessApprovalRequest[];
  aiAccess: Record<DataSection, boolean>;
  isLoading: boolean;

  load: (userId: string) => Promise<void>;

  toggleCompanionSection: (
    companionId: string,
    section: DataSection,
    value: boolean,
    userId: string,
  ) => Promise<{ needsApproval: boolean }>;

  togglePsychiatristSection: (
    connId: string,
    section: DataSection,
    value: boolean,
  ) => Promise<void>;

  toggleAiSection: (
    section: DataSection,
    value: boolean,
    userId: string,
  ) => Promise<void>;

  submitApprovalRequest: (params: {
    userId: string;
    requestType: ApprovalRequestType;
    approverRole: ApproverRole;
    approverCompanionId: string | null;
    description: string;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
  }) => Promise<AccessApprovalRequest | null>;

  cancelRequest: (requestId: string) => Promise<void>;
}

export const useAccessStore = create<AccessStore>((set, get) => ({
  psychiatristConn: null,
  guardians:        [],
  wellWishers:      [],
  pendingRequests:  [],
  aiAccess:         { ...DEFAULT_AI_ACCESS },
  isLoading:        false,

  async load(userId) {
    set({ isLoading: true });
    const [connRes, companionsRes, requestsRes, profileRes] = await Promise.all([
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
      supabase
        .from('profiles')
        .select('ai_access')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    const companions = (companionsRes.data ?? []) as Companion[];
    const aiRaw = (profileRes.data as Record<string, unknown> | null)?.ai_access;
    const aiAccess = aiRaw
      ? { ...DEFAULT_AI_ACCESS, ...(aiRaw as Record<string, boolean>) }
      : { ...DEFAULT_AI_ACCESS };

    set({
      psychiatristConn: (connRes.data ?? null) as PsychiatristConnection | null,
      guardians:        companions.filter((c) => c.role === 'guardian'),
      wellWishers:      companions.filter((c) => c.role === 'well_wisher'),
      pendingRequests:  (requestsRes.data ?? []) as AccessApprovalRequest[],
      aiAccess,
      isLoading: false,
    });
  },

  async toggleCompanionSection(companionId, section, value, userId) {
    const companion = [...get().guardians, ...get().wellWishers].find((c) => c.id === companionId);
    if (!companion) return { needsApproval: false };

    const role = companion.role as 'guardian' | 'well_wisher';
    const needsApprovalFlag = requiresApproval(role, value);

    if (needsApprovalFlag) {
      await get().submitApprovalRequest({
        userId,
        requestType: 'access_change',
        approverRole: 'guardian',
        approverCompanionId: companionId,
        description: `${value ? 'Enable' : 'Disable'} ${SECTION_META[section].label} for ${role === 'guardian' ? 'guardian' : 'well-wisher'}`,
        oldValue: { [section]: !value },
        newValue: { [section]: value },
      });
      return { needsApproval: true };
    }

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
      psychiatristConn: s.psychiatristConn ? { ...s.psychiatristConn, ...update } : null,
    }));
    await supabase.from('psychiatrist_connections').update(update).eq('id', connId);
  },

  async toggleAiSection(section, value, userId) {
    const newAiAccess = { ...get().aiAccess, [section]: value };
    set({ aiAccess: newAiAccess });
    // best-effort: requires ai_access column migration on profiles
    await supabase.from('profiles').update({ ai_access: newAiAccess }).eq('id', userId);
  },

  async submitApprovalRequest({
    userId, requestType, approverRole, approverCompanionId, description, oldValue, newValue,
  }) {
    const { data } = await supabase
      .from('access_approval_requests')
      .insert({
        patient_id:           userId,
        request_type:         requestType,
        approver_role:        approverRole,
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
