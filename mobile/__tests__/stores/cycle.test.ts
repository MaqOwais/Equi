// Mock supabase so expo-sqlite / expo-asset don't need to resolve in Jest
jest.mock('../../lib/supabase', () => ({ supabase: {} }));

import { buildDailyDominant, type CycleLogEntry } from '../../stores/cycle';

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
