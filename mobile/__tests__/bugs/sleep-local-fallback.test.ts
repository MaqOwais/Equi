/**
 * SLEEP LOCAL FALLBACK — Regression test suite
 *
 * Bug: sleep.load() only queried Supabase. On hot-reload or cold start, if
 * Supabase returned null for today (race condition, brief offline, or the write
 * hadn't been committed yet), todayLog was overwritten with null — making it
 * appear as if the user had never logged sleep.
 *
 * Fix: sleep.load() now reads local store in parallel and uses it as a fallback
 * when Supabase has no row for today (local-first, same pattern as today.load).
 *
 * Regression history:
 *   #1 — Home screen showed sleep prompt again after hot-reload even though
 *         the user had already logged sleep that morning.
 *   #2 — Race condition: logManual() optimistic update overwritten by a
 *         concurrent load() that resolved after the optimistic write.
 *
 * These tests lock down every structural invariant so the bug cannot recur.
 */

import * as fs from 'fs';
import * as path from 'path';

const SLEEP_STORE_PATH = path.join(__dirname, '../../stores/sleep.ts');
const sleepSrc = fs.readFileSync(SLEEP_STORE_PATH, 'utf8');

// ─── Shared mocks ─────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/healthkit', () => ({
  fetchLastNightSleep:      jest.fn().mockResolvedValue(null),
  requestSleepPermissions:  jest.fn().mockResolvedValue(false),
}));

// ─── 1. Source-level structural checks ────────────────────────────────────────

describe('sleep.ts source — local fallback structure', () => {
  it('imports getLocal from local-day-store', () => {
    expect(sleepSrc).toMatch(/import\s*\{[^}]*getLocal[^}]*\}\s*from\s*['"]\.\.\/lib\/local-day-store['"]/);
  });

  it('calls getLocal(userId, today) inside load()', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('getLocal(userId, today)');
  });

  it('reads local store in the same Promise.all as Supabase queries', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    const promiseAllBlock = loadImpl.slice(loadImpl.indexOf('Promise.all'), loadImpl.indexOf(']);'));
    expect(promiseAllBlock).toContain('getLocal(userId, today)');
    expect(promiseAllBlock).toContain("from('sleep_logs')");
  });

  it('constructs a localFallback when Supabase has no data but local does', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('localFallback');
    expect(loadImpl).toContain('local?.sleepQuality');
  });

  it('todayLog assignment prefers Supabase data over local fallback', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    // Must be: todayRes.data ?? localFallback (not the other way round)
    expect(loadImpl).toMatch(/todayLog:\s*\(todayRes\.data\s+as\s+SleepLog\)\s*\?\?\s*localFallback/);
  });

  it('localFallback is null when Supabase has a row (no double-write)', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    // Guard condition must check !todayRes.data first
    expect(loadImpl).toMatch(/!todayRes\.data\s*&&\s*local\?\.sleepQuality/);
  });

  it('localFallback maps sleepQuality → quality_score', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('quality_score: local.sleepQuality');
  });

  it('localFallback maps sleepDuration → duration_minutes', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('duration_minutes: local.sleepDuration');
  });

  it('localFallback uses sleepTimestamp as created_at (preserves original log time)', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('local.sleepTimestamp');
  });
});

// ─── 2. Runtime: Supabase returns data → local fallback NOT used ───────────────

describe('sleep.load() runtime — Supabase row exists → uses Supabase data', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@react-native-async-storage/async-storage', () => ({
      getItem:    jest.fn().mockResolvedValue(null),
      setItem:    jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock('../../lib/healthkit', () => ({
      fetchLastNightSleep:     jest.fn().mockResolvedValue(null),
      requestSleepPermissions: jest.fn().mockResolvedValue(false),
    }));
  });

  it('uses Supabase todayLog when Supabase has a row', async () => {
    // Note: mockSupabaseRow must use the `mock` prefix so Jest allows it in the factory
    const mockSupabaseRow = {
      id: 'sb-1', user_id: 'user-1', date: '2026-03-17',
      quality_score: 4, duration_minutes: 450, source: 'manual',
      bedtime: null, wake_time: null, deep_minutes: null,
      rem_minutes: null, awakenings: null, raw_healthkit: null,
      created_at: '2026-03-17T08:00:00.000Z',
    };

    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          gte:    jest.fn().mockReturnThis(),
          order:  jest.fn().mockResolvedValue({ data: [] }),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockSupabaseRow }),
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: jest.fn().mockResolvedValue(undefined),
      getLocal:  jest.fn().mockResolvedValue({
        date: '2026-03-17', userId: 'user-1',
        sleepQuality: 2, sleepDuration: 330,
        sleepTimestamp: '2026-03-17T07:00:00.000Z',
      }),
    }));

    const { useSleepStore } = require('../../stores/sleep');
    await useSleepStore.getState().load('user-1', true);

    // Supabase data wins even though local also has data
    expect(useSleepStore.getState().todayLog?.id).toBe('sb-1');
    expect(useSleepStore.getState().todayLog?.quality_score).toBe(4);
  });
});

// ─── 3. Runtime: Supabase returns null → local fallback kicks in ──────────────

describe('sleep.load() runtime — no Supabase row → falls back to local', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@react-native-async-storage/async-storage', () => ({
      getItem:    jest.fn().mockResolvedValue(null),
      setItem:    jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock('../../lib/healthkit', () => ({
      fetchLastNightSleep:     jest.fn().mockResolvedValue(null),
      requestSleepPermissions: jest.fn().mockResolvedValue(false),
    }));
  });

  it('todayLog is non-null when Supabase is empty but local has sleepQuality', async () => {
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          gte:    jest.fn().mockReturnThis(),
          order:  jest.fn().mockResolvedValue({ data: [] }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }), // Supabase empty
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: jest.fn().mockResolvedValue(undefined),
      getLocal:  jest.fn().mockResolvedValue({
        date: '2026-03-17', userId: 'user-1',
        sleepQuality: 3,
        sleepDuration: 390,
        sleepTimestamp: new Date('2026-03-17T07:45:00').toISOString(),
      }),
    }));

    const { useSleepStore } = require('../../stores/sleep');
    await useSleepStore.getState().load('user-1', true);

    const log = useSleepStore.getState().todayLog;
    expect(log).not.toBeNull();
    expect(log?.quality_score).toBe(3);
    expect(log?.duration_minutes).toBe(390);
  });

  it('todayLog reflects the correct quality score from local store', async () => {
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          gte:    jest.fn().mockReturnThis(),
          order:  jest.fn().mockResolvedValue({ data: [] }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: jest.fn().mockResolvedValue(undefined),
      getLocal:  jest.fn().mockResolvedValue({
        date: '2026-03-17', userId: 'user-1',
        sleepQuality: 5,
        sleepDuration: 510,
        sleepTimestamp: new Date('2026-03-17T08:00:00').toISOString(),
      }),
    }));

    const { useSleepStore } = require('../../stores/sleep');
    await useSleepStore.getState().load('user-1', true);

    expect(useSleepStore.getState().todayLog?.quality_score).toBe(5);
    expect(useSleepStore.getState().todayLog?.duration_minutes).toBe(510);
  });

  it('todayLog is null when both Supabase and local have no sleep data', async () => {
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          gte:    jest.fn().mockReturnThis(),
          order:  jest.fn().mockResolvedValue({ data: [] }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: jest.fn().mockResolvedValue(undefined),
      getLocal:  jest.fn().mockResolvedValue(null), // nothing local either
    }));

    const { useSleepStore } = require('../../stores/sleep');
    await useSleepStore.getState().load('user-1', true);

    expect(useSleepStore.getState().todayLog).toBeNull();
  });

  it('todayLog is null when local exists but has no sleepQuality', async () => {
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          gte:    jest.fn().mockReturnThis(),
          order:  jest.fn().mockResolvedValue({ data: [] }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: jest.fn().mockResolvedValue(undefined),
      // local has cycle data but no sleep
      getLocal:  jest.fn().mockResolvedValue({
        date: '2026-03-17', userId: 'user-1',
        cycleState: 'stable', cycleIntensity: 6,
      }),
    }));

    const { useSleepStore } = require('../../stores/sleep');
    await useSleepStore.getState().load('user-1', true);

    expect(useSleepStore.getState().todayLog).toBeNull();
  });

  it('home screen sleep prompt stays hidden after load when local has sleep data', async () => {
    // Simulates the exact bug scenario:
    // 1. User logs sleep → logManual writes locally + Supabase
    // 2. App hot-reloads → store resets, load() re-runs
    // 3. Supabase hasn't committed yet → returns null
    // 4. Local store has the data → todayLog should NOT be null
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          gte:    jest.fn().mockReturnThis(),
          order:  jest.fn().mockResolvedValue({ data: [] }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }), // race: not committed yet
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: jest.fn().mockResolvedValue(undefined),
      getLocal:  jest.fn().mockResolvedValue({
        date: '2026-03-17', userId: 'user-1',
        sleepQuality: 4,
        sleepDuration: 450,
        sleepTimestamp: new Date('2026-03-17T07:30:00').toISOString(),
      }),
    }));

    const { useSleepStore } = require('../../stores/sleep');
    await useSleepStore.getState().load('user-1', true);

    // todayLog must not be null — sleep prompt must stay hidden
    const showSleepPrompt = useSleepStore.getState().todayLog === null;
    expect(showSleepPrompt).toBe(false);
  });
});

// ─── 4. logManual still saves to local store ──────────────────────────────────

describe('sleep.logManual() — still writes sleepTimestamp to local store', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@react-native-async-storage/async-storage', () => ({
      getItem:    jest.fn().mockResolvedValue(null),
      setItem:    jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock('../../lib/healthkit', () => ({
      fetchLastNightSleep:     jest.fn().mockResolvedValue(null),
      requestSleepPermissions: jest.fn().mockResolvedValue(false),
    }));
  });

  it('calls saveLocal with sleepQuality, sleepDuration, and sleepTimestamp', async () => {
    const mockSaveLocal = jest.fn().mockResolvedValue(undefined);

    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select:  jest.fn().mockReturnThis(),
          eq:      jest.fn().mockReturnThis(),
          upsert:  jest.fn().mockReturnThis(),
          single:  jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    }));

    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: mockSaveLocal,
      getLocal:  jest.fn().mockResolvedValue(null),
    }));

    const { useSleepStore } = require('../../stores/sleep');
    const before = Date.now();
    await useSleepStore.getState().logManual('user-1', 4);
    const after = Date.now();

    expect(mockSaveLocal).toHaveBeenCalled();
    const partial = mockSaveLocal.mock.calls[0][2];
    expect(partial.sleepQuality).toBe(4);
    expect(partial.sleepDuration).toBeGreaterThan(0);
    expect(partial.sleepTimestamp).toBeDefined();

    const ts = new Date(partial.sleepTimestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── 5. 5-minute cache is not bypassed by the local fallback ──────────────────

describe('sleep.load() cache — local fallback does not disable the 5-minute cache', () => {
  it('load source still has the 5-minute lastLoaded guard', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('lastLoaded');
    expect(loadImpl).toMatch(/5\s*\*\s*60\s*\*\s*1000/);
    expect(loadImpl).toContain('if (!force && lastLoaded');
  });

  it('force=true bypasses the cache (used after logManual)', () => {
    const loadImpl = sleepSrc.slice(sleepSrc.indexOf('load: async'), sleepSrc.indexOf('logManual: async'));
    expect(loadImpl).toContain('force = false');
    expect(loadImpl).toMatch(/if\s*\(!force\s*&&\s*lastLoaded/);
  });
});
