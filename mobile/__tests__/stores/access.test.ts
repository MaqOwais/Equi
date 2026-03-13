/**
 * access.test.ts
 *
 * Covers:
 *   - requiresApproval() business logic
 *   - Store defaults
 *   - load() — data parsing, ai_access fallback, guardian/well-wisher separation
 *   - toggleCompanionSection() — immediate vs approval path for guardian & well-wisher
 *   - togglePsychiatristSection() — optimistic update
 *   - toggleAiSection() — state + DB
 *   - submitApprovalRequest() — success & failure
 *   - cancelRequest() — optimistic removal
 *   - ALL_SECTIONS / AI_SECTIONS — content contracts
 */

import {
  useAccessStore,
  requiresApproval,
  ALL_SECTIONS,
  AI_SECTIONS,
  SECTION_META,
} from '../../stores/access';

// ─── Supabase mock ────────────────────────────────────────────────────────────

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { supabase } = require('../../lib/supabase') as { supabase: { from: jest.Mock } };

/** Builds a chainable Supabase query stub that resolves `terminal` at the end. */
function makeChain(terminal: unknown) {
  const self: Record<string, unknown> = {};
  ['select', 'eq', 'order', 'insert', 'update', 'upsert', 'delete', 'in'].forEach(
    (m) => { (self[m] as jest.Mock) = jest.fn().mockReturnValue(self); },
  );
  (self['single'] as jest.Mock)      = jest.fn().mockResolvedValue(terminal);
  (self['maybeSingle'] as jest.Mock) = jest.fn().mockResolvedValue(terminal);
  // Make the chain itself awaitable (for queries that don't call .single())
  self['then']  = (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve);
  self['catch'] = (reject: (e: unknown) => unknown) => Promise.resolve(terminal).catch(reject);
  return self;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-001';

const PSYCH_CONN = {
  id: 'pc-001', patient_id: USER_ID, psychiatrist_id: 'psy-001', status: 'accepted',
  share_cycle_data: true, share_journal: true, share_activities: true,
  share_medication: true, share_sleep: true, share_nutrition: false,
  share_workbook: false, share_ai_report: true,
};

const GUARDIAN = {
  id: 'g-001', patient_id: USER_ID, role: 'guardian', status: 'accepted',
  invite_email: 'guardian@test.com',
  share_cycle_data: true, share_journal: false, share_activities: true,
  share_medication: true, share_sleep: true, share_nutrition: false,
  share_workbook: false, share_ai_report: true,
};

const WELL_WISHER = {
  id: 'w-001', patient_id: USER_ID, role: 'well_wisher', status: 'accepted',
  invite_email: 'wisher@test.com',
  share_cycle_data: true, share_journal: false, share_activities: false,
  share_medication: false, share_sleep: false, share_nutrition: false,
  share_workbook: false, share_ai_report: false,
};

const PENDING_REQUEST = {
  id: 'req-001', patient_id: USER_ID, request_type: 'access_change',
  description: 'Test request', status: 'pending',
  approver_role: 'guardian', approver_companion_id: 'g-001',
  old_value: { share_journal: true }, new_value: { share_journal: false },
  created_at: '2026-01-01T00:00:00Z', responded_at: null,
};

// ─── Reset store before each test ─────────────────────────────────────────────

beforeEach(() => {
  useAccessStore.setState({
    psychiatristConn: null,
    guardians:        [],
    wellWishers:      [],
    pendingRequests:  [],
    aiAccess: {
      share_cycle_data: true, share_journal: true, share_activities: true,
      share_medication: true, share_sleep: true, share_nutrition: true,
      share_workbook: true,   share_ai_report: false,
    },
    isLoading: false,
  });
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// requiresApproval
// ─────────────────────────────────────────────────────────────────────────────

describe('requiresApproval()', () => {
  describe('psychiatrist', () => {
    it('returns true when enabling a section', () => {
      expect(requiresApproval('psychiatrist', true)).toBe(true);
    });
    it('returns true when disabling a section', () => {
      expect(requiresApproval('psychiatrist', false)).toBe(true);
    });
  });

  describe('guardian', () => {
    it('returns true when DISABLING (turning off) — guardian approval needed to remove access', () => {
      expect(requiresApproval('guardian', false)).toBe(true);
    });
    it('returns false when ENABLING (turning on) — no approval needed to grant access', () => {
      expect(requiresApproval('guardian', true)).toBe(false);
    });
  });

  describe('well_wisher', () => {
    it('returns true when ENABLING (turning on) — guardian must approve adding access', () => {
      expect(requiresApproval('well_wisher', true)).toBe(true);
    });
    it('returns false when DISABLING (turning off) — no approval needed to restrict access', () => {
      expect(requiresApproval('well_wisher', false)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section constants
// ─────────────────────────────────────────────────────────────────────────────

describe('ALL_SECTIONS', () => {
  it('contains all 8 data sections', () => {
    expect(ALL_SECTIONS).toHaveLength(8);
  });

  it('includes share_ai_report', () => {
    expect(ALL_SECTIONS).toContain('share_ai_report');
  });

  it('every section has metadata (label, icon, desc)', () => {
    ALL_SECTIONS.forEach((section) => {
      const meta = SECTION_META[section];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect(meta.desc).toBeTruthy();
    });
  });
});

describe('AI_SECTIONS', () => {
  it('does NOT include share_ai_report (AI cannot access its own report)', () => {
    expect(AI_SECTIONS).not.toContain('share_ai_report');
  });

  it('contains 7 sections', () => {
    expect(AI_SECTIONS).toHaveLength(7);
  });

  it('is a strict subset of ALL_SECTIONS', () => {
    AI_SECTIONS.forEach((s) => expect(ALL_SECTIONS).toContain(s));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Store defaults
// ─────────────────────────────────────────────────────────────────────────────

describe('store defaults', () => {
  it('starts with null psychiatristConn', () => {
    expect(useAccessStore.getState().psychiatristConn).toBeNull();
  });

  it('starts with empty guardians and wellWishers', () => {
    const { guardians, wellWishers } = useAccessStore.getState();
    expect(guardians).toHaveLength(0);
    expect(wellWishers).toHaveLength(0);
  });

  it('all AI sections default to true', () => {
    const { aiAccess } = useAccessStore.getState();
    AI_SECTIONS.forEach((s) => expect(aiAccess[s]).toBe(true));
  });

  it('share_ai_report defaults to false in aiAccess (not applicable)', () => {
    expect(useAccessStore.getState().aiAccess.share_ai_report).toBe(false);
  });

  it('isLoading starts false', () => {
    expect(useAccessStore.getState().isLoading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// load()
// ─────────────────────────────────────────────────────────────────────────────

describe('load()', () => {
  function setupLoadMock({
    psychConn = { data: null },
    companions = { data: [] },
    requests   = { data: [] },
    profile    = { data: null },
  } = {}) {
    supabase.from.mockImplementation((table: string) => {
      if (table === 'psychiatrist_connections') return makeChain(psychConn);
      if (table === 'companions')               return makeChain(companions);
      if (table === 'access_approval_requests') return makeChain(requests);
      if (table === 'profiles')                 return makeChain(profile);
      return makeChain({ data: null });
    });
  }

  it('sets psychiatristConn when accepted connection exists', async () => {
    setupLoadMock({ psychConn: { data: PSYCH_CONN } });
    await useAccessStore.getState().load(USER_ID);
    expect(useAccessStore.getState().psychiatristConn).toMatchObject({ id: 'pc-001' });
  });

  it('keeps psychiatristConn null when no connection', async () => {
    setupLoadMock({ psychConn: { data: null } });
    await useAccessStore.getState().load(USER_ID);
    expect(useAccessStore.getState().psychiatristConn).toBeNull();
  });

  it('separates guardians from well-wishers', async () => {
    setupLoadMock({ companions: { data: [GUARDIAN, WELL_WISHER] } });
    await useAccessStore.getState().load(USER_ID);
    const { guardians, wellWishers } = useAccessStore.getState();
    expect(guardians).toHaveLength(1);
    expect(guardians[0].id).toBe('g-001');
    expect(wellWishers).toHaveLength(1);
    expect(wellWishers[0].id).toBe('w-001');
  });

  it('loads pending approval requests', async () => {
    setupLoadMock({ requests: { data: [PENDING_REQUEST] } });
    await useAccessStore.getState().load(USER_ID);
    expect(useAccessStore.getState().pendingRequests).toHaveLength(1);
    expect(useAccessStore.getState().pendingRequests[0].id).toBe('req-001');
  });

  it('loads ai_access from profile and merges with defaults', async () => {
    const profileAiAccess = { share_cycle_data: false, share_journal: false };
    setupLoadMock({ profile: { data: { ai_access: profileAiAccess } } });
    await useAccessStore.getState().load(USER_ID);
    const { aiAccess } = useAccessStore.getState();
    expect(aiAccess.share_cycle_data).toBe(false);
    expect(aiAccess.share_journal).toBe(false);
    // Others remain default (true)
    expect(aiAccess.share_activities).toBe(true);
  });

  it('falls back to all-true defaults when profile has no ai_access', async () => {
    setupLoadMock({ profile: { data: { ai_access: null } } });
    await useAccessStore.getState().load(USER_ID);
    AI_SECTIONS.forEach((s) =>
      expect(useAccessStore.getState().aiAccess[s]).toBe(true),
    );
  });

  it('handles completely empty data gracefully', async () => {
    setupLoadMock();
    await useAccessStore.getState().load(USER_ID);
    const state = useAccessStore.getState();
    expect(state.psychiatristConn).toBeNull();
    expect(state.guardians).toHaveLength(0);
    expect(state.wellWishers).toHaveLength(0);
    expect(state.pendingRequests).toHaveLength(0);
  });

  it('sets isLoading false after completion', async () => {
    setupLoadMock();
    await useAccessStore.getState().load(USER_ID);
    expect(useAccessStore.getState().isLoading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleCompanionSection() — guardian
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCompanionSection() — guardian', () => {
  beforeEach(() => {
    useAccessStore.setState({ guardians: [{ ...GUARDIAN }] as never });
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
  });

  it('applies immediately when ENABLING (no approval needed)', async () => {
    // guardian share_journal is currently false → turning ON → no approval
    useAccessStore.setState({
      guardians: [{ ...GUARDIAN, share_journal: false }] as never,
    });
    const result = await useAccessStore.getState()
      .toggleCompanionSection('g-001', 'share_journal', true, USER_ID);
    expect(result.needsApproval).toBe(false);
    expect(useAccessStore.getState().guardians[0].share_journal).toBe(true);
  });

  it('calls supabase update when no approval needed', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await useAccessStore.getState()
      .toggleCompanionSection('g-001', 'share_activities', true, USER_ID);
    expect(supabase.from).toHaveBeenCalledWith('companions');
    expect(chain.update).toHaveBeenCalledWith({ share_activities: true });
  });

  it('returns needsApproval:true when DISABLING (turning off)', async () => {
    // guardian share_journal is currently true → turning OFF → needs approval
    useAccessStore.setState({
      guardians: [{ ...GUARDIAN, share_journal: true }] as never,
    });
    const insertChain = makeChain({ data: { id: 'req-new' }, error: null });
    supabase.from.mockReturnValue(insertChain);

    const result = await useAccessStore.getState()
      .toggleCompanionSection('g-001', 'share_journal', false, USER_ID);
    expect(result.needsApproval).toBe(true);
  });

  it('does NOT update companion state when approval is needed', async () => {
    useAccessStore.setState({
      guardians: [{ ...GUARDIAN, share_medication: true }] as never,
    });
    const insertChain = makeChain({ data: { id: 'req-new' }, error: null });
    supabase.from.mockReturnValue(insertChain);

    await useAccessStore.getState()
      .toggleCompanionSection('g-001', 'share_medication', false, USER_ID);
    // State should NOT have been updated
    expect(useAccessStore.getState().guardians[0].share_medication).toBe(true);
  });

  it('adds approval request to pendingRequests when disabling', async () => {
    useAccessStore.setState({
      guardians: [{ ...GUARDIAN, share_sleep: true }] as never,
    });
    const insertChain = makeChain({ data: PENDING_REQUEST, error: null });
    supabase.from.mockReturnValue(insertChain);

    await useAccessStore.getState()
      .toggleCompanionSection('g-001', 'share_sleep', false, USER_ID);
    // submitApprovalRequest should have been called (inserts into access_approval_requests)
    expect(supabase.from).toHaveBeenCalledWith('access_approval_requests');
  });

  it('returns needsApproval:false for unknown companion id', async () => {
    const result = await useAccessStore.getState()
      .toggleCompanionSection('nonexistent-id', 'share_journal', false, USER_ID);
    expect(result.needsApproval).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleCompanionSection() — well-wisher
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleCompanionSection() — well-wisher', () => {
  beforeEach(() => {
    useAccessStore.setState({ wellWishers: [{ ...WELL_WISHER }] as never });
  });

  it('returns needsApproval:true when ENABLING (turning on)', async () => {
    const insertChain = makeChain({ data: PENDING_REQUEST, error: null });
    supabase.from.mockReturnValue(insertChain);

    const result = await useAccessStore.getState()
      .toggleCompanionSection('w-001', 'share_activities', true, USER_ID);
    expect(result.needsApproval).toBe(true);
  });

  it('does NOT update state when enabling needs approval', async () => {
    useAccessStore.setState({
      wellWishers: [{ ...WELL_WISHER, share_activities: false }] as never,
    });
    const insertChain = makeChain({ data: PENDING_REQUEST, error: null });
    supabase.from.mockReturnValue(insertChain);

    await useAccessStore.getState()
      .toggleCompanionSection('w-001', 'share_activities', true, USER_ID);
    expect(useAccessStore.getState().wellWishers[0].share_activities).toBe(false);
  });

  it('applies immediately when DISABLING (turning off) — no approval', async () => {
    useAccessStore.setState({
      wellWishers: [{ ...WELL_WISHER, share_cycle_data: true }] as never,
    });
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await useAccessStore.getState()
      .toggleCompanionSection('w-001', 'share_cycle_data', false, USER_ID);
    expect(result.needsApproval).toBe(false);
    expect(useAccessStore.getState().wellWishers[0].share_cycle_data).toBe(false);
  });

  it('includes correct description when submitting approval for well-wisher', async () => {
    const insertChain = makeChain({ data: PENDING_REQUEST, error: null });
    supabase.from.mockReturnValue(insertChain);

    await useAccessStore.getState()
      .toggleCompanionSection('w-001', 'share_journal', true, USER_ID);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('well-wisher'),
        new_value: { share_journal: true },
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// togglePsychiatristSection()
// ─────────────────────────────────────────────────────────────────────────────

describe('togglePsychiatristSection()', () => {
  beforeEach(() => {
    useAccessStore.setState({
      psychiatristConn: { ...PSYCH_CONN } as never,
    });
  });

  it('optimistically updates psychiatristConn state', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .togglePsychiatristSection('pc-001', 'share_nutrition', true);
    expect(useAccessStore.getState().psychiatristConn?.share_nutrition).toBe(true);
  });

  it('calls supabase update on psychiatrist_connections table', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .togglePsychiatristSection('pc-001', 'share_workbook', true);
    expect(supabase.from).toHaveBeenCalledWith('psychiatrist_connections');
    expect(chain.update).toHaveBeenCalledWith({ share_workbook: true });
    expect(chain.eq).toHaveBeenCalledWith('id', 'pc-001');
  });

  it('does nothing if psychiatristConn is null', async () => {
    useAccessStore.setState({ psychiatristConn: null });
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .togglePsychiatristSection('pc-001', 'share_journal', false);
    expect(useAccessStore.getState().psychiatristConn).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleAiSection()
// ─────────────────────────────────────────────────────────────────────────────

describe('toggleAiSection()', () => {
  it('updates the specific section in aiAccess state', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .toggleAiSection('share_journal', false, USER_ID);
    expect(useAccessStore.getState().aiAccess.share_journal).toBe(false);
  });

  it('does not affect other AI sections', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .toggleAiSection('share_medication', false, USER_ID);
    const { aiAccess } = useAccessStore.getState();
    expect(aiAccess.share_cycle_data).toBe(true);
    expect(aiAccess.share_journal).toBe(true);
    expect(aiAccess.share_activities).toBe(true);
  });

  it('calls profiles update with the full new aiAccess object', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .toggleAiSection('share_sleep', false, USER_ID);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_access: expect.objectContaining({ share_sleep: false }),
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', USER_ID);
  });

  it('can re-enable a section', async () => {
    useAccessStore.setState({
      aiAccess: { ...useAccessStore.getState().aiAccess, share_nutrition: false },
    });
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState()
      .toggleAiSection('share_nutrition', true, USER_ID);
    expect(useAccessStore.getState().aiAccess.share_nutrition).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// submitApprovalRequest()
// ─────────────────────────────────────────────────────────────────────────────

describe('submitApprovalRequest()', () => {
  const BASE_PARAMS = {
    userId:               USER_ID,
    requestType:          'access_change' as const,
    approverRole:         'guardian' as const,
    approverCompanionId:  'g-001',
    description:          'Disable Journal for guardian',
    oldValue:             { share_journal: true },
    newValue:             { share_journal: false },
  };

  it('adds the new request to pendingRequests on success', async () => {
    const newRequest = { ...PENDING_REQUEST, id: 'req-new' };
    const chain = makeChain({ data: newRequest, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().submitApprovalRequest(BASE_PARAMS);
    expect(useAccessStore.getState().pendingRequests[0].id).toBe('req-new');
  });

  it('prepends new request (most recent first)', async () => {
    useAccessStore.setState({ pendingRequests: [PENDING_REQUEST] as never });
    const newRequest = { ...PENDING_REQUEST, id: 'req-newer' };
    const chain = makeChain({ data: newRequest, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().submitApprovalRequest(BASE_PARAMS);
    expect(useAccessStore.getState().pendingRequests[0].id).toBe('req-newer');
    expect(useAccessStore.getState().pendingRequests[1].id).toBe('req-001');
  });

  it('returns null and does not update state when DB returns no data', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await useAccessStore.getState().submitApprovalRequest(BASE_PARAMS);
    expect(result).toBeNull();
    expect(useAccessStore.getState().pendingRequests).toHaveLength(0);
  });

  it('sends correct payload to supabase', async () => {
    const chain = makeChain({ data: PENDING_REQUEST, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().submitApprovalRequest(BASE_PARAMS);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id:            USER_ID,
        request_type:          'access_change',
        approver_role:         'guardian',
        approver_companion_id: 'g-001',
        description:           'Disable Journal for guardian',
        old_value:             { share_journal: true },
        new_value:             { share_journal: false },
        status:                'pending',
      }),
    );
  });

  it('uses access_approval_requests table', async () => {
    const chain = makeChain({ data: PENDING_REQUEST, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().submitApprovalRequest(BASE_PARAMS);
    expect(supabase.from).toHaveBeenCalledWith('access_approval_requests');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cancelRequest()
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelRequest()', () => {
  beforeEach(() => {
    useAccessStore.setState({ pendingRequests: [PENDING_REQUEST] as never });
  });

  it('removes the request from pendingRequests immediately (optimistic)', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().cancelRequest('req-001');
    expect(useAccessStore.getState().pendingRequests).toHaveLength(0);
  });

  it('calls supabase update with status "rejected"', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().cancelRequest('req-001');
    expect(supabase.from).toHaveBeenCalledWith('access_approval_requests');
    expect(chain.update).toHaveBeenCalledWith({ status: 'rejected' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'req-001');
  });

  it('only removes the targeted request, leaving others intact', async () => {
    const secondRequest = { ...PENDING_REQUEST, id: 'req-002' };
    useAccessStore.setState({
      pendingRequests: [PENDING_REQUEST, secondRequest] as never,
    });
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await useAccessStore.getState().cancelRequest('req-001');
    expect(useAccessStore.getState().pendingRequests).toHaveLength(1);
    expect(useAccessStore.getState().pendingRequests[0].id).toBe('req-002');
  });

  it('does not throw when cancelling a non-existent request id', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);

    await expect(
      useAccessStore.getState().cancelRequest('does-not-exist'),
    ).resolves.not.toThrow();
    // Original request still intact
    expect(useAccessStore.getState().pendingRequests).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-role approval symmetry
// ─────────────────────────────────────────────────────────────────────────────

describe('approval symmetry — all roles, all sections', () => {
  it('psychiatrist always requires approval for every section', () => {
    ALL_SECTIONS.forEach((section) => {
      expect(requiresApproval('psychiatrist', true)).toBe(true);
      expect(requiresApproval('psychiatrist', false)).toBe(true);
      // section variable suppresses unused warning
      void section;
    });
  });

  it('guardian: only OFF direction triggers approval', () => {
    // Turning any section OFF needs approval
    expect(requiresApproval('guardian', false)).toBe(true);
    // Turning any section ON is immediate
    expect(requiresApproval('guardian', true)).toBe(false);
  });

  it('well-wisher: only ON direction triggers approval', () => {
    // Turning any section ON needs approval
    expect(requiresApproval('well_wisher', true)).toBe(true);
    // Turning any section OFF is immediate
    expect(requiresApproval('well_wisher', false)).toBe(false);
  });

  it('guardian and well-wisher approval rules are opposite of each other', () => {
    // Guardian: OFF=approval, ON=immediate
    // Well-wisher: ON=approval, OFF=immediate
    // They are exact mirrors
    expect(requiresApproval('guardian', false)).toBe(requiresApproval('well_wisher', true));
    expect(requiresApproval('guardian', true)).toBe(requiresApproval('well_wisher', false));
  });
});
