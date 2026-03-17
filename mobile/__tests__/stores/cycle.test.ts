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
