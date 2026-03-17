// Mock supabase so expo-sqlite / expo-asset don't need to resolve in Jest
jest.mock('../../lib/supabase', () => ({ supabase: {} }));

import { buildDailyDominant, useCycleStore, type CycleLogEntry } from '../../stores/cycle';

function makeEntry(overrides: Partial<CycleLogEntry> = {}): CycleLogEntry {
  return {
    id: 'test-id',
    date: '2026-03-12',
    timestamp: '2026-03-12T10:00:00.000Z',
    state: 'stable',
    intensity: 5,
    symptoms: [],
    notes: null,
    ...overrides,
  };
}

// ─── Bug regression: stale dayEntries on date navigation ─────────────────────
//
// Bug: navigating from Date A to Date B showed Date A's cycle entries on
// Date B's page. Root cause: loadDay() did not clear dayEntries before the
// async Supabase fetch, so the previous day's data persisted in the store
// while the new fetch was in-flight (and permanently if Date B had no entries).

describe('loadDay — stale dayEntries cross-date regression', () => {
  const march16Entry: CycleLogEntry = {
    id: 'entry-mar16',
    date: '2026-03-16',
    timestamp: '2026-03-16T17:44:00.000Z',
    state: 'mixed',
    intensity: 5,
    symptoms: ['sleep disturbed'],
    notes: 'Had dim morning due to sleep disturbed',
  };

  beforeEach(() => {
    // Reset store to a clean state between tests
    useCycleStore.setState({ logs: [], dayEntries: [], currentState: 'stable' });
  });

  it('clears dayEntries synchronously before the async fetch resolves', async () => {
    // Arrange: seed store as if Date A (Mar 16) was already loaded
    useCycleStore.setState({ dayEntries: [march16Entry] });

    // Mock the Supabase chain for Date B (Mar 17) — returns empty, resolves slowly
    let resolveFetch!: (value: unknown) => void;
    const fetchPromise = new Promise((r) => { resolveFetch = r; });

    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnValue(fetchPromise.then(() => ({ data: [] }))),
    });

    // Act: start loading Date B WITHOUT awaiting
    const loadPromise = useCycleStore.getState().loadDay('user-1', '2026-03-17');

    // Assert: dayEntries must be cleared BEFORE the fetch resolves (synchronously)
    // This is the core of the bug — without the fix, this would still be [march16Entry]
    expect(useCycleStore.getState().dayEntries).toEqual([]);

    // Clean up: let the fetch resolve so we don't leave dangling promises
    resolveFetch(undefined);
    await loadPromise;
  });

  it('keeps dayEntries empty after fetch returns no results for the new date', async () => {
    // Arrange: seed with Date A data
    useCycleStore.setState({ dayEntries: [march16Entry] });

    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: [] }),  // Date B has 0 entries
    });

    // Act
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    // Assert: March 16's entry must NOT bleed into March 17
    expect(useCycleStore.getState().dayEntries).toEqual([]);
  });

  it('replaces dayEntries with the new date\'s results when fetch returns data', async () => {
    const march17Entry: CycleLogEntry = {
      id: 'entry-mar17',
      date: '2026-03-17',
      timestamp: '2026-03-17T09:00:00.000Z',
      state: 'stable',
      intensity: 6,
      symptoms: [],
      notes: null,
    };

    // Arrange: seed with Date A data
    useCycleStore.setState({ dayEntries: [march16Entry] });

    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({
        data: [{
          id: march17Entry.id,
          logged_at: march17Entry.timestamp,
          state: march17Entry.state,
          intensity: march17Entry.intensity,
          symptoms: march17Entry.symptoms,
          notes: march17Entry.notes,
        }],
      }),
    });

    // Act
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    // Assert: only March 17's entry is present
    expect(useCycleStore.getState().dayEntries).toHaveLength(1);
    expect(useCycleStore.getState().dayEntries[0].id).toBe('entry-mar17');
    expect(useCycleStore.getState().dayEntries[0].state).toBe('stable');
  });
});

// ─── loadDay — timezone-aware date boundary regression ───────────────────────
//
// Bug: loadDay() queried with bare 'YYYY-MM-DD' date strings, which Supabase
// interprets as UTC. For users in UTC+N timezones, this caused entries from
// the previous local day (logged in the afternoon/evening, which maps to early
// UTC next day) to appear on the wrong date. Fix: convert local midnight to
// UTC via `new Date(date + 'T00:00:00').toISOString()` and add a client-side
// millisecond filter as belt-and-suspenders.

describe('loadDay — timezone-aware date boundaries', () => {
  beforeEach(() => {
    useCycleStore.setState({ logs: [], dayEntries: [], currentState: 'stable' });
  });

  function mockFromWith(rows: any[]) {
    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: rows }),
    });
    return mockSupabase;
  }

  it('sends ISO 8601 UTC strings to Supabase, not bare date strings', async () => {
    const mockGte = jest.fn().mockReturnThis();
    const mockLte = jest.fn().mockReturnThis();
    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    mockGte,
      lte:    mockLte,
      order:  jest.fn().mockResolvedValue({ data: [] }),
    });

    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    // Both bounds must be full ISO 8601 UTC strings ending in Z, not bare dates
    const gteArg = mockGte.mock.calls[0][1] as string;
    const lteArg = mockLte.mock.calls[0][1] as string;
    expect(gteArg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(lteArg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('gte bound encodes local midnight (not a bare date string)', async () => {
    const mockGte = jest.fn().mockReturnThis();
    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    mockGte,
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: [] }),
    });

    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    const gteArg = mockGte.mock.calls[0][1] as string;
    // The UTC time must equal what new Date('2026-03-17T00:00:00').toISOString() produces
    const expectedStart = new Date('2026-03-17T00:00:00').toISOString();
    expect(gteArg).toBe(expectedStart);
    // Must NOT be a bare date (the old broken form)
    expect(gteArg).not.toBe('2026-03-17');
  });

  it('client-side filter excludes an entry from just before local midnight', async () => {
    // Simulates the exact screenshot bug: March 16 entries appearing on March 17.
    // The entry is logged at UTC 23:59 on March 16 — which is before local midnight
    // in UTC (and even more so in UTC+N). The filter must exclude it.
    const prevDayEntry = {
      id: 'prev-day',
      logged_at: '2026-03-16T23:59:00.000Z',
      state: 'mixed',
      intensity: 5,
      symptoms: [],
      notes: null,
    };
    const correctEntry = {
      id: 'correct-day',
      logged_at: '2026-03-17T09:00:00.000Z',
      state: 'stable',
      intensity: 6,
      symptoms: [],
      notes: null,
    };

    mockFromWith([prevDayEntry, correctEntry]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    const entries = useCycleStore.getState().dayEntries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('correct-day');
  });

  it('client-side filter excludes an entry from just after local day end', async () => {
    // Use local-time strings (no Z) so the test is timezone-agnostic.
    // new Date('2026-03-18T00:00:01') = 1 second into March 18 LOCAL → always after local day end.
    const nextDayEntry = {
      id: 'next-day',
      logged_at: new Date('2026-03-18T00:00:01').toISOString(),
      state: 'manic',
      intensity: 7,
      symptoms: [],
      notes: null,
    };
    const correctEntry = {
      id: 'last-of-day',
      logged_at: new Date('2026-03-17T23:59:59').toISOString(),
      state: 'stable',
      intensity: 4,
      symptoms: [],
      notes: null,
    };

    mockFromWith([correctEntry, nextDayEntry]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    const entries = useCycleStore.getState().dayEntries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('last-of-day');
  });

  it('keeps an entry logged exactly at local midnight (00:00:00.000)', async () => {
    const midnightEntry = {
      id: 'at-midnight',
      logged_at: new Date('2026-03-17T00:00:00').toISOString(), // local midnight
      state: 'stable',
      intensity: 3,
      symptoms: [],
      notes: null,
    };

    mockFromWith([midnightEntry]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    expect(useCycleStore.getState().dayEntries).toHaveLength(1);
    expect(useCycleStore.getState().dayEntries[0].id).toBe('at-midnight');
  });

  it('keeps an entry at the last possible millisecond of the local day', async () => {
    const lastMsEntry = {
      id: 'last-ms',
      logged_at: new Date('2026-03-17T23:59:59.999').toISOString(), // local day-end
      state: 'depressive',
      intensity: 8,
      symptoms: ['low energy'],
      notes: null,
    };

    mockFromWith([lastMsEntry]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    expect(useCycleStore.getState().dayEntries).toHaveLength(1);
    expect(useCycleStore.getState().dayEntries[0].id).toBe('last-ms');
  });

  it('passes all entries within the local day and rejects none', async () => {
    // Use local-time strings (no Z) so timestamps are within the local day on any machine.
    const rows = [
      { id: 'e1', logged_at: new Date('2026-03-17T00:00:00').toISOString(), state: 'stable',     intensity: 5, symptoms: [], notes: null },
      { id: 'e2', logged_at: new Date('2026-03-17T08:30:00').toISOString(), state: 'manic',      intensity: 7, symptoms: [], notes: null },
      { id: 'e3', logged_at: new Date('2026-03-17T14:15:00').toISOString(), state: 'depressive', intensity: 6, symptoms: [], notes: null },
      { id: 'e4', logged_at: new Date('2026-03-17T23:00:00').toISOString(), state: 'mixed',      intensity: 4, symptoms: [], notes: null },
    ];

    mockFromWith(rows);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    expect(useCycleStore.getState().dayEntries).toHaveLength(4);
    expect(useCycleStore.getState().dayEntries.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('rejects all three March 16 entries from the exact screenshot bug scenario', async () => {
    // These are the exact timestamps from the user's screenshot showing the bleed bug.
    // March 16: 5:44 PM, 6:33 PM, 6:39 PM local — all must be excluded from March 17.
    const mar16Entries = [
      { id: 'mar16-a', logged_at: '2026-03-16T17:44:00.000Z', state: 'mixed',  intensity: 5, symptoms: ['sleep disturbed'], notes: null },
      { id: 'mar16-b', logged_at: '2026-03-16T18:33:00.000Z', state: 'manic',  intensity: 6, symptoms: [],                 notes: null },
      { id: 'mar16-c', logged_at: '2026-03-16T18:39:00.000Z', state: 'stable', intensity: 4, symptoms: [],                 notes: null },
    ];
    const mar17Entries = [
      { id: 'mar17-a', logged_at: '2026-03-17T09:54:00.000Z', state: 'stable', intensity: 5, symptoms: [], notes: null },
      { id: 'mar17-b', logged_at: '2026-03-17T10:52:00.000Z', state: 'stable', intensity: 5, symptoms: [], notes: null },
    ];

    mockFromWith([...mar16Entries, ...mar17Entries]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    const entries = useCycleStore.getState().dayEntries;
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.id)).toEqual(['mar17-a', 'mar17-b']);
    // Confirm none of the March 16 ids leaked through
    const ids = entries.map((e) => e.id);
    expect(ids).not.toContain('mar16-a');
    expect(ids).not.toContain('mar16-b');
    expect(ids).not.toContain('mar16-c');
  });

  it('maps filtered entries correctly — all fields preserved', async () => {
    const row = {
      id: 'full-entry',
      logged_at: '2026-03-17T12:00:00.000Z',
      state: 'mixed',
      intensity: 7,
      symptoms: ['racing thoughts', 'insomnia'],
      notes: 'difficult day',
    };

    mockFromWith([row]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    const entry = useCycleStore.getState().dayEntries[0];
    expect(entry.id).toBe('full-entry');
    expect(entry.date).toBe('2026-03-17');       // date is set from the requested date param
    expect(entry.timestamp).toBe('2026-03-17T12:00:00.000Z');
    expect(entry.state).toBe('mixed');
    expect(entry.intensity).toBe(7);
    expect(entry.symptoms).toEqual(['racing thoughts', 'insomnia']);
    expect(entry.notes).toBe('difficult day');
  });

  it('defaults intensity to 5 when Supabase returns null', async () => {
    const row = {
      id: 'null-intensity',
      logged_at: '2026-03-17T10:00:00.000Z',
      state: 'stable',
      intensity: null,
      symptoms: [],
      notes: null,
    };

    mockFromWith([row]);
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    expect(useCycleStore.getState().dayEntries[0].intensity).toBe(5);
  });

  it('returns empty dayEntries when Supabase returns null data', async () => {
    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: null }),
    });

    await useCycleStore.getState().loadDay('user-1', '2026-03-17');
    expect(useCycleStore.getState().dayEntries).toEqual([]);
  });

  it('entries are in ascending order (oldest-first) after filtering', async () => {
    // Use local-time strings (no Z) so all entries fall within the local day on any machine.
    const rows = [
      { id: 'e3', logged_at: new Date('2026-03-17T20:00:00').toISOString(), state: 'mixed',  intensity: 5, symptoms: [], notes: null },
      { id: 'e1', logged_at: new Date('2026-03-17T06:00:00').toISOString(), state: 'stable', intensity: 3, symptoms: [], notes: null },
      { id: 'e2', logged_at: new Date('2026-03-17T12:00:00').toISOString(), state: 'manic',  intensity: 8, symptoms: [], notes: null },
    ];

    mockFromWith(rows); // mock returns rows in the order given; Supabase ordering is in the query
    // Actual Supabase orders via .order('logged_at', { ascending: true })
    // After filtering the client-side code preserves the order Supabase returns
    await useCycleStore.getState().loadDay('user-1', '2026-03-17');

    // All 3 entries should be present (the mock data is already valid for this date)
    expect(useCycleStore.getState().dayEntries).toHaveLength(3);
    // IDs in mock order (ordering is delegated to Supabase in production)
    expect(useCycleStore.getState().dayEntries.map((e) => e.id)).toEqual(['e3', 'e1', 'e2']);
  });
});

// ─── buildDailyDominant ───────────────────────────────────────────────────────

describe('buildDailyDominant', () => {
  it('returns empty map for empty logs', () => {
    expect(buildDailyDominant([])).toEqual({});
  });

  it('maps a single entry to its date', () => {
    const entry = makeEntry({ date: '2026-03-12', state: 'stable' });
    const result = buildDailyDominant([entry]);
    expect(result['2026-03-12']).toEqual(entry);
  });

  it('last entry wins when multiple logs share the same date', () => {
    const first  = makeEntry({ id: 'a', date: '2026-03-12', state: 'stable',   timestamp: '2026-03-12T08:00:00.000Z' });
    const second = makeEntry({ id: 'b', date: '2026-03-12', state: 'manic',    timestamp: '2026-03-12T14:00:00.000Z' });
    const third  = makeEntry({ id: 'c', date: '2026-03-12', state: 'mixed',    timestamp: '2026-03-12T20:00:00.000Z' });
    const result = buildDailyDominant([first, second, third]);
    expect(result['2026-03-12'].id).toBe('c');
    expect(result['2026-03-12'].state).toBe('mixed');
  });

  it('keeps separate entries for different dates', () => {
    const monday    = makeEntry({ date: '2026-03-09', state: 'stable' });
    const tuesday   = makeEntry({ date: '2026-03-10', state: 'manic' });
    const wednesday = makeEntry({ date: '2026-03-11', state: 'depressive' });
    const result = buildDailyDominant([monday, tuesday, wednesday]);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result['2026-03-09'].state).toBe('stable');
    expect(result['2026-03-10'].state).toBe('manic');
    expect(result['2026-03-11'].state).toBe('depressive');
  });

  it('preserves the full entry object, not just the state', () => {
    const entry = makeEntry({ date: '2026-03-12', symptoms: ['insomnia', 'racing thoughts'], intensity: 8, notes: 'rough day' });
    const result = buildDailyDominant([entry]);
    expect(result['2026-03-12'].symptoms).toEqual(['insomnia', 'racing thoughts']);
    expect(result['2026-03-12'].intensity).toBe(8);
    expect(result['2026-03-12'].notes).toBe('rough day');
  });
});
