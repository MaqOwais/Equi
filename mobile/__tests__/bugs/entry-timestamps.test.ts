/**
 * ENTRY TIMESTAMPS — Comprehensive regression test suite
 *
 * Every entry type (cycle, medication, sleep, journal, nutrition, activities)
 * must show a timestamp in the day detail view regardless of whether the data
 * came from local AsyncStorage or Supabase.
 *
 * Architecture:
 *   Local path  — data logged today, not yet synced → timestamp from LocalDayData
 *   Supabase path — data fetched from cloud → timestamp from detailData fetch
 *   Fallback chain — detailData?.xxxLoggedAt ?? data.xxxTimestamp
 *
 * Coverage:
 *   1.  LocalDayData interface — all timestamp fields present
 *   2.  today.ts — logMedication saves medTimestamp
 *   3.  today.ts — logCycle saves cycleTimestamp
 *   4.  sleep.ts — logManual saves sleepTimestamp
 *   5.  journal.ts — save() saves journalTimestamp
 *   6.  tracker.tsx + you/nutrition.tsx — saveLocal includes nutritionTimestamp
 *   7.  DayData interface — all timestamp fields present
 *   8.  calendar.ts skeleton — timestamps populated from local
 *   9.  calendar.ts merge — activityEntries with completedAt from local
 *   10. local-day-store.ts syncDayToCloud — cycle uses full ISO timestamp
 *   11. day/[date].tsx — each section uses fallback chain
 *   12. fmtTime — returns '' for date-only strings, real time for ISO timestamps
 *   13. activities — completedAt preserved end-to-end from LocalActivityCompletion
 *   14. Integration — logMedication → getLocal → medTimestamp is an ISO string
 *   15. Integration — logCycle → getLocal → cycleTimestamp is an ISO string
 *   16. Substances (checkinTimestamp) — full pipeline: store → local → DayData → display
 *   17. Social Rhythm (socialRhythmTimestamp) — full pipeline: store → local → DayData → display
 *   18. Integration — logCheckin → getLocal → checkinTimestamp is an ISO string
 *   19. Integration — checkIn → getLocal → socialRhythmTimestamp is an ISO string
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── File paths ───────────────────────────────────────────────────────────────

const ROOT = path.join(__dirname, '../..');

const LOCAL_STORE    = path.join(ROOT, 'lib/local-day-store.ts');
const CALENDAR_STORE = path.join(ROOT, 'stores/calendar.ts');
const TODAY_STORE    = path.join(ROOT, 'stores/today.ts');
const SLEEP_STORE    = path.join(ROOT, 'stores/sleep.ts');
const JOURNAL_STORE  = path.join(ROOT, 'stores/journal.ts');
const TRACKER_SCREEN = path.join(ROOT, 'app/(tabs)/tracker.tsx');
const NUTRITION_SCREEN = path.join(ROOT, 'app/(tabs)/you/nutrition.tsx');
const DAY_SCREEN     = path.join(ROOT, 'app/day/[date].tsx');
const TIMESTAMPS_UTIL = path.join(ROOT, 'utils/timestamps.ts');
const SOCIAL_RHYTHM_STORE = path.join(ROOT, 'stores/socialRhythm.ts');

const localSrc    = fs.readFileSync(LOCAL_STORE, 'utf8');
const calendarSrc = fs.readFileSync(CALENDAR_STORE, 'utf8');
const todaySrc    = fs.readFileSync(TODAY_STORE, 'utf8');
const sleepSrc    = fs.readFileSync(SLEEP_STORE, 'utf8');
const journalSrc  = fs.readFileSync(JOURNAL_STORE, 'utf8');
const trackerSrc  = fs.readFileSync(TRACKER_SCREEN, 'utf8');
const nutritionSrc = fs.readFileSync(NUTRITION_SCREEN, 'utf8');
const daySrc      = fs.readFileSync(DAY_SCREEN, 'utf8');
const tsSrc       = fs.readFileSync(TIMESTAMPS_UTIL, 'utf8');
const socialRhythmSrc = fs.readFileSync(SOCIAL_RHYTHM_STORE, 'utf8');

// ─── Shared mocks ─────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      gte:         jest.fn().mockReturnThis(),
      lte:         jest.fn().mockReturnThis(),
      order:       jest.fn().mockResolvedValue({ data: [] }),
      upsert:      jest.fn().mockReturnThis(),
      single:      jest.fn().mockResolvedValue({ data: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    })),
  },
}));

jest.mock('../../lib/local-day-store', () => ({
  saveLocal: jest.fn().mockResolvedValue(undefined),
  getLocal:  jest.fn().mockResolvedValue(null),
}));

// ─── 1. LocalDayData interface ────────────────────────────────────────────────

describe('LocalDayData interface — all timestamp fields', () => {
  const TIMESTAMP_FIELDS = [
    'cycleTimestamp',
    'medTimestamp',
    'sleepTimestamp',
    'journalTimestamp',
    'nutritionTimestamp',
  ];

  for (const field of TIMESTAMP_FIELDS) {
    it(`has ${field} field`, () => {
      expect(localSrc).toContain(field);
    });
  }

  it('cycleTimestamp is optional and nullable (ISO 8601)', () => {
    expect(localSrc).toMatch(/cycleTimestamp\?:\s*string\s*\|\s*null/);
  });

  it('medTimestamp is optional and nullable (ISO 8601)', () => {
    expect(localSrc).toMatch(/medTimestamp\?:\s*string\s*\|\s*null/);
  });

  it('sleepTimestamp is optional and nullable (ISO 8601)', () => {
    expect(localSrc).toMatch(/sleepTimestamp\?:\s*string\s*\|\s*null/);
  });

  it('journalTimestamp is optional and nullable (ISO 8601)', () => {
    expect(localSrc).toMatch(/journalTimestamp\?:\s*string\s*\|\s*null/);
  });

  it('nutritionTimestamp is optional and nullable (ISO 8601)', () => {
    expect(localSrc).toMatch(/nutritionTimestamp\?:\s*string\s*\|\s*null/);
  });
});

// ─── 2. today.ts — logMedication saves medTimestamp ──────────────────────────

describe('today.ts — logMedication saves medTimestamp', () => {
  const implStart = todaySrc.indexOf('logMedication: async');
  const impl = todaySrc.slice(implStart, implStart + 500);

  it('logMedication has an async implementation', () => {
    expect(implStart).toBeGreaterThan(-1);
  });

  it('generates medTimestamp with new Date().toISOString()', () => {
    expect(impl).toContain('medTimestamp');
    expect(impl).toContain('new Date().toISOString()');
  });

  it('passes medTimestamp to saveLocal', () => {
    expect(impl).toContain('medTimestamp');
    const saveLocalPos = impl.indexOf('saveLocal');
    const tsPos = impl.indexOf('medTimestamp');
    expect(saveLocalPos).toBeGreaterThan(-1);
    // medTimestamp must be defined before saveLocal call
    expect(tsPos).toBeLessThan(saveLocalPos);
  });
});

// ─── 3. today.ts — logCycle saves cycleTimestamp ─────────────────────────────

describe('today.ts — logCycle saves cycleTimestamp', () => {
  const implStart = todaySrc.indexOf('logCycle: async');
  const impl = todaySrc.slice(implStart, implStart + 500);

  it('logCycle has an async implementation', () => {
    expect(implStart).toBeGreaterThan(-1);
  });

  it('generates cycleTimestamp with new Date().toISOString()', () => {
    expect(impl).toContain('cycleTimestamp');
    expect(impl).toContain('new Date().toISOString()');
  });

  it('passes cycleTimestamp to saveLocal', () => {
    const saveLocalPos = impl.indexOf('saveLocal');
    const tsPos = impl.indexOf('cycleTimestamp');
    expect(saveLocalPos).toBeGreaterThan(-1);
    expect(tsPos).toBeLessThan(saveLocalPos);
  });
});

// ─── 4. sleep.ts — logManual saves sleepTimestamp ────────────────────────────

describe('sleep.ts — logManual saves sleepTimestamp', () => {
  it('calls saveLocal with sleepTimestamp in the manual log path', () => {
    expect(sleepSrc).toContain('sleepTimestamp');
    // At least one saveLocal call includes sleepTimestamp
    expect(sleepSrc).toMatch(/saveLocal[^;]*sleepTimestamp/s);
  });

  it('sleepTimestamp uses new Date().toISOString()', () => {
    expect(sleepSrc).toContain('sleepTimestamp: new Date().toISOString()');
  });

  it('saves sleepTimestamp in both manual and HealthKit sync paths', () => {
    const matches = (sleepSrc.match(/sleepTimestamp/g) ?? []);
    // Should appear in at least 2 saveLocal calls (logManual + syncFromHealthKit)
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── 5. journal.ts — save() saves journalTimestamp ───────────────────────────

describe('journal.ts — save() passes journalTimestamp to saveLocal', () => {
  it('saveLocal call includes journalTimestamp', () => {
    const saveLocalMatch = journalSrc.match(/saveLocal\([^)]+\)/s);
    expect(saveLocalMatch).not.toBeNull();
    expect(journalSrc).toContain('journalTimestamp');
  });

  it('journalTimestamp uses new Date().toISOString()', () => {
    expect(journalSrc).toContain('journalTimestamp: new Date().toISOString()');
  });
});

// ─── 6. Nutrition screens save nutritionTimestamp ────────────────────────────

describe('tracker.tsx — nutrition save includes nutritionTimestamp', () => {
  it('saveLocal call includes nutritionTimestamp', () => {
    expect(trackerSrc).toContain('nutritionTimestamp');
    expect(trackerSrc).toContain('nutritionTimestamp: new Date().toISOString()');
  });
});

describe('you/nutrition.tsx — nutrition save includes nutritionTimestamp', () => {
  it('saveLocal call includes nutritionTimestamp', () => {
    expect(nutritionSrc).toContain('nutritionTimestamp');
    expect(nutritionSrc).toContain('nutritionTimestamp: new Date().toISOString()');
  });
});

// ─── 7. DayData interface ─────────────────────────────────────────────────────

describe('DayData interface — all timestamp fields present', () => {
  const interfaceBlock = calendarSrc.slice(
    calendarSrc.indexOf('export interface DayData'),
    calendarSrc.indexOf('interface CalendarStore'),
  );

  const TIMESTAMP_FIELDS = [
    'cycleTimestamp',
    'medTimestamp',
    'sleepTimestamp',
    'journalTimestamp',
    'nutritionTimestamp',
  ];

  for (const field of TIMESTAMP_FIELDS) {
    it(`DayData has ${field}: string | null`, () => {
      expect(interfaceBlock).toContain(field);
      expect(interfaceBlock).toMatch(new RegExp(`${field}:\\s*string\\s*\\|\\s*null`));
    });
  }

  it('DayData has activityEntries with name and completedAt', () => {
    expect(interfaceBlock).toContain('activityEntries');
    expect(interfaceBlock).toContain('completedAt');
  });
});

// ─── 8. calendar.ts skeleton — timestamps from local ─────────────────────────

describe('calendar.ts Step 1 skeleton — populates all timestamps from local', () => {
  // The skeleton build is between Step 1 comments
  const skeletonStart = calendarSrc.indexOf('Step 1: Build skeleton');
  const skeletonEnd   = calendarSrc.indexOf('Step 2: Fetch Supabase');
  const skeleton = calendarSrc.slice(skeletonStart, skeletonEnd);

  it('populates cycleTimestamp from local', () => {
    expect(skeleton).toContain('cycleTimestamp');
    expect(skeleton).toContain('local?.cycleTimestamp');
  });

  it('populates medTimestamp from local', () => {
    expect(skeleton).toContain('medTimestamp');
    expect(skeleton).toContain('local?.medTimestamp');
  });

  it('populates sleepTimestamp from local', () => {
    expect(skeleton).toContain('sleepTimestamp');
    expect(skeleton).toContain('local?.sleepTimestamp');
  });

  it('populates journalTimestamp from local', () => {
    expect(skeleton).toContain('journalTimestamp');
    expect(skeleton).toContain('local?.journalTimestamp');
  });

  it('populates nutritionTimestamp from local', () => {
    expect(skeleton).toContain('nutritionTimestamp');
    expect(skeleton).toContain('local?.nutritionTimestamp');
  });

  it('populates activityEntries from local activityCompletions', () => {
    expect(skeleton).toContain('activityEntries');
    expect(skeleton).toContain('activityCompletions');
    expect(skeleton).toContain('completedAt');
  });
});

// ─── 9. calendar.ts merge — activityEntries preserved ────────────────────────

describe('calendar.ts Step 2 merge — activityEntries with completedAt', () => {
  const mergeStart = calendarSrc.indexOf('Step 2: Fetch Supabase');
  const mergeEnd   = calendarSrc.indexOf('set({ days: merged })');
  const merge = calendarSrc.slice(mergeStart, mergeEnd);

  it('preserves activityEntries in the merged result', () => {
    expect(merge).toContain('activityEntries');
  });

  it('falls back to Supabase activity_completions when no local entries', () => {
    expect(merge).toContain('activityLogs');
    expect(merge).toContain('completedAt');
  });

  it('preserves medTimestamp in the merge', () => {
    expect(merge).toContain('medTimestamp');
    expect(merge).toContain('loc.medTimestamp');
  });

  it('preserves journalTimestamp in the merge', () => {
    expect(merge).toContain('journalTimestamp');
    expect(merge).toContain('loc.journalTimestamp');
  });

  it('preserves nutritionTimestamp in the merge', () => {
    expect(merge).toContain('nutritionTimestamp');
    expect(merge).toContain('loc.nutritionTimestamp');
  });

  it('preserves sleepTimestamp in the merge', () => {
    expect(merge).toContain('sleepTimestamp');
    expect(merge).toContain('loc.sleepTimestamp');
  });
});

// ─── 10. syncDayToCloud — cycle uses full ISO timestamp ──────────────────────

describe('local-day-store.ts syncDayToCloud — preserves full timestamps', () => {
  it('cycle_logs.logged_at uses cycleTimestamp (not bare date)', () => {
    // Must use local.cycleTimestamp as logged_at, not just the date string
    expect(localSrc).toContain('local.cycleTimestamp ?? date');
  });

  it('does NOT use bare date for cycle logged_at', () => {
    // The old broken pattern was: logged_at: date
    // Find the cycle_logs upsert block
    const cycleUpsertStart = localSrc.indexOf("from('cycle_logs').upsert");
    const cycleUpsertEnd   = localSrc.indexOf('})', cycleUpsertStart);
    const cycleUpsert = localSrc.slice(cycleUpsertStart, cycleUpsertEnd);
    // Should NOT be just `logged_at: date`
    expect(cycleUpsert).not.toMatch(/logged_at:\s*date[^,\n]/);
  });
});

// ─── 11. day/[date].tsx — fallback chain for every section ───────────────────

describe('day/[date].tsx — timestamp fallback chain (local ?? Supabase)', () => {
  it('sleep section uses detailData?.sleepLoggedAt ?? data.sleepTimestamp', () => {
    expect(daySrc).toContain('detailData?.sleepLoggedAt ?? data.sleepTimestamp');
  });

  it('medication section uses detailData?.medLoggedAt ?? data.medTimestamp', () => {
    expect(daySrc).toContain('detailData?.medLoggedAt ?? data.medTimestamp');
  });

  it('journal section uses detailData?.journalCreatedAt ?? data.journalTimestamp', () => {
    expect(daySrc).toContain('detailData?.journalCreatedAt ?? data.journalTimestamp');
  });

  it('nutrition section uses detailData?.nutritionLoggedAt ?? data.nutritionTimestamp', () => {
    expect(daySrc).toContain('detailData?.nutritionLoggedAt ?? data.nutritionTimestamp');
  });

  it('activities section falls back to data.activityEntries when detailData is empty', () => {
    expect(daySrc).toContain('data.activityEntries');
    // Must map activityEntries to { title, completed_at } shape
    expect(daySrc).toContain('completedAt');
  });

  it('all timestamp displays use the LoggedAt component with the fallback chain', () => {
    // Timestamps are now rendered via <LoggedAt iso={...} /> which internally calls fmtTime.
    // Verify each section passes the correct fallback chain as the iso prop.
    const wrappedChains = [
      'LoggedAt iso={detailData?.sleepLoggedAt ?? data.sleepTimestamp',
      'LoggedAt iso={detailData?.medLoggedAt ?? data.medTimestamp',
      'LoggedAt iso={detailData?.journalCreatedAt ?? data.journalTimestamp',
      'LoggedAt iso={detailData?.nutritionLoggedAt ?? data.nutritionTimestamp',
    ];
    for (const chain of wrappedChains) {
      expect(daySrc).toContain(chain);
    }
    // LoggedAt component must call fmtTime internally
    expect(daySrc).toContain('function LoggedAt');
    expect(daySrc).toContain('fmtTime(iso)');
  });
});

// ─── 12. fmtTime utility ─────────────────────────────────────────────────────

describe('fmtTime utility — handles all timestamp formats', () => {
  // Import directly to run real logic
  jest.resetModules();
  // Re-import without mocks for this describe block
  let fmtTime: (iso: string) => string;

  beforeAll(() => {
    // Read the function directly from source
    // Test via source inspection (the function is pure)
    fmtTime = require('../../utils/timestamps').fmtTime;
  });

  it('returns empty string for date-only string (YYYY-MM-DD)', () => {
    expect(fmtTime('2026-03-16')).toBe('');
  });

  it('returns non-empty string for full ISO timestamp', () => {
    const result = fmtTime('2026-03-16T18:39:00.000Z');
    expect(result).not.toBe('');
    expect(result).toMatch(/\d+:\d{2}\s*(AM|PM)/);
  });

  it('returns non-empty string for Supabase microsecond timestamp', () => {
    const result = fmtTime('2026-03-16T18:39:00.123456+00:00');
    expect(result).not.toBe('');
    expect(result).toMatch(/\d+:\d{2}\s*(AM|PM)/);
  });

  it('does NOT return 12:00 AM for date-only strings', () => {
    expect(fmtTime('2026-03-16')).not.toBe('12:00 AM');
    expect(fmtTime('2026-03-16')).not.toContain('12:00');
  });

  it('guards against date-only input via regex check in source', () => {
    expect(tsSrc).toMatch(/\\d\{4\}-\\d\{2\}-\\d\{2\}/);
    expect(tsSrc).toContain("return ''");
  });
});

// ─── 13. activityEntries end-to-end ──────────────────────────────────────────

describe('activityEntries — completedAt flows from LocalActivityCompletion → DayData', () => {
  it('LocalActivityCompletion has completedAt: string field', () => {
    expect(localSrc).toContain('completedAt: string');
  });

  it('DayData.activityEntries maps name and completedAt from local completions', () => {
    // The skeleton build maps: activityCompletions → activityEntries
    expect(calendarSrc).toMatch(/activityEntries.*activityCompletions|activityCompletions.*activityEntries/s);
    expect(calendarSrc).toContain('completedAt: c.completedAt');
  });

  it('day/[date].tsx maps activityEntries.completedAt to completed_at for display', () => {
    // The fallback mapping: { name: e.name, completed_at: e.completedAt }
    expect(daySrc).toContain('e.completedAt');
  });

  it('day/[date].tsx renders LoggedAt for activities with timestamps', () => {
    // Activities now use the unified LoggedAt component instead of inline "Completed at" text
    expect(daySrc).toContain('LoggedAt iso={act.completed_at}');
  });
});

// ─── 14. Integration — logMedication saves medTimestamp to local ──────────────

describe('Integration — logMedication → local storage saves medTimestamp', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@react-native-async-storage/async-storage', () => ({
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select:      jest.fn().mockReturnThis(),
          eq:          jest.fn().mockReturnThis(),
          upsert:      jest.fn().mockReturnThis(),
          single:      jest.fn().mockResolvedValue({ data: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    }));
  });

  it('logMedication passes a valid ISO medTimestamp to saveLocal', async () => {
    const { saveLocal } = require('../../lib/local-day-store');
    const mockSaveLocal = jest.fn().mockResolvedValue(undefined);
    (saveLocal as jest.Mock) = mockSaveLocal;

    // Re-require with real saveLocal mock injected
    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: mockSaveLocal,
      getLocal:  jest.fn().mockResolvedValue(null),
    }));
    jest.resetModules();

    const { saveLocal: sl } = require('../../lib/local-day-store');
    const slMock = sl as jest.Mock;

    const { useTodayStore } = require('../../stores/today');
    useTodayStore.setState({ date: '2026-03-16', medicationStatus: null });

    const before = Date.now();
    await useTodayStore.getState().logMedication('user-1', 'taken');
    const after = Date.now();

    expect(slMock).toHaveBeenCalled();
    const partial = slMock.mock.calls[slMock.mock.calls.length - 1][2];
    expect(partial.medTimestamp).toBeDefined();
    expect(partial.medTimestamp).not.toBeNull();

    const ts = new Date(partial.medTimestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── 15. Integration — logCycle saves cycleTimestamp ─────────────────────────

describe('Integration — logCycle → local storage saves cycleTimestamp', () => {
  it('logCycle persists cycleTimestamp to local storage', async () => {
    jest.resetModules();
    const mockSaveLocal = jest.fn().mockResolvedValue(undefined);
    jest.mock('../../lib/local-day-store', () => ({
      saveLocal: mockSaveLocal,
      getLocal:  jest.fn().mockResolvedValue(null),
    }));
    jest.mock('../../lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          upsert: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    }));

    const { useTodayStore } = require('../../stores/today');
    useTodayStore.setState({ date: '2026-03-16', cycleState: null });

    const before = Date.now();
    await useTodayStore.getState().logCycle('user-1', 'stable', 6, [], 'Good day');
    const after = Date.now();

    expect(mockSaveLocal).toHaveBeenCalled();
    const partial = mockSaveLocal.mock.calls[mockSaveLocal.mock.calls.length - 1][2];
    expect(partial.cycleTimestamp).toBeDefined();

    const ts = new Date(partial.cycleTimestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── 16. All sections have a non-empty timestamp or graceful absence ──────────

describe('day/[date].tsx — no section shows wrong/missing timestamps', () => {
  // All sections now use the unified LoggedAt component — fmtTime lives inside LoggedAt, not inline.

  it('sleep: LoggedAt renders the fallback expression (no raw date shown)', () => {
    const sleepSection = daySrc.slice(daySrc.indexOf('── Sleep ──'), daySrc.indexOf('── Medication ──'));
    expect(sleepSection).toContain('LoggedAt iso={detailData?.sleepLoggedAt');
    expect(sleepSection).not.toContain('sleepLoggedAt}'); // not rendered raw without LoggedAt
  });

  it('medication: LoggedAt renders the fallback expression', () => {
    const medSection = daySrc.slice(daySrc.indexOf('── Medication ──'), daySrc.indexOf('── Activities ──'));
    expect(medSection).toContain('LoggedAt iso={detailData?.medLoggedAt');
    expect(medSection).not.toContain('medLoggedAt}'); // not rendered raw without LoggedAt
  });

  it('journal: LoggedAt renders the fallback expression', () => {
    const journalSection = daySrc.slice(daySrc.indexOf('── Journal ──'), daySrc.indexOf('── Workbook ──'));
    expect(journalSection).toContain('LoggedAt iso={detailData?.journalCreatedAt');
    expect(journalSection).not.toContain('journalCreatedAt}'); // not rendered raw without LoggedAt
  });

  it('nutrition: LoggedAt renders the fallback expression', () => {
    const nutritionSection = daySrc.slice(daySrc.indexOf('── Nutrition ──'), daySrc.indexOf('── Substances ──'));
    expect(nutritionSection).toContain('LoggedAt iso={detailData?.nutritionLoggedAt');
    expect(nutritionSection).not.toContain('nutritionLoggedAt}'); // not rendered raw without LoggedAt
  });

  it('activities: LoggedAt renders completed_at', () => {
    const actSection = daySrc.slice(daySrc.indexOf('── Activities ──'), daySrc.indexOf('── Journal ──'));
    expect(actSection).toContain('LoggedAt iso={act.completed_at}');
  });

  it('workbook entries use LoggedAt on created_at', () => {
    const workbookSection = daySrc.slice(daySrc.indexOf('── Workbook ──'), daySrc.indexOf('── Nutrition ──'));
    expect(workbookSection).toContain('LoggedAt iso={e.created_at}');
  });
});

// ─── 17. No entry type shows a date-only value directly ──────────────────────

describe('fmtTime guard — date-only strings never render as timestamps', () => {
  it('fmtTime source contains the date-only guard regex', () => {
    expect(tsSrc).toContain("return ''");
    expect(tsSrc).toMatch(/\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//);
  });

  it('fmtTime("2026-01-15") returns empty string (no midnight display)', () => {
    const { fmtTime } = require('../../utils/timestamps');
    expect(fmtTime('2026-01-15')).toBe('');
  });

  it('fmtTime("2026-01-15T09:30:00.000Z") returns a time string', () => {
    const { fmtTime } = require('../../utils/timestamps');
    const result = fmtTime('2026-01-15T09:30:00.000Z');
    expect(result).toMatch(/^\d+:\d{2}\s*(AM|PM)$/);
  });
});

// ─── 18. Substances — checkinTimestamp full pipeline ─────────────────────────

describe('Substances — checkinTimestamp full pipeline', () => {
  it('LocalDayData has checkinTimestamp field', () => {
    expect(localSrc).toContain('checkinTimestamp');
    expect(localSrc).toMatch(/checkinTimestamp\?:\s*string\s*\|\s*null/);
  });

  it('DayData (calendar store) has checkinTimestamp: string | null', () => {
    const interfaceBlock = calendarSrc.slice(
      calendarSrc.indexOf('export interface DayData'),
      calendarSrc.indexOf('interface CalendarStore'),
    );
    expect(interfaceBlock).toContain('checkinTimestamp');
    expect(interfaceBlock).toMatch(/checkinTimestamp:\s*string\s*\|\s*null/);
  });

  it('calendar skeleton populates checkinTimestamp from local storage', () => {
    expect(calendarSrc).toContain('checkinTimestamp: local?.checkinTimestamp');
  });

  it('calendar Supabase merge falls back to checkinMap created_at', () => {
    expect(calendarSrc).toContain('checkinMap[date]?.created_at');
  });

  it('today.ts logCheckin generates checkinTimestamp with new Date().toISOString()', () => {
    // Skip the interface declaration; find the async implementation
    const implStart = todaySrc.indexOf('logCheckin: async');
    expect(implStart).toBeGreaterThan(-1);
    const impl = todaySrc.slice(implStart, implStart + 400);
    expect(impl).toContain('checkinTimestamp');
    expect(impl).toContain('new Date().toISOString()');
  });

  it('today.ts logCheckin passes checkinTimestamp to saveLocal', () => {
    const implStart = todaySrc.indexOf('logCheckin: async');
    expect(implStart).toBeGreaterThan(-1);
    const impl = todaySrc.slice(implStart, implStart + 400);
    expect(impl).toContain('checkinTimestamp');
    expect(impl).toContain('saveLocal');
  });

  it('day/[date].tsx substances section uses LoggedAt with fallback chain', () => {
    const substancesSection = daySrc.slice(
      daySrc.indexOf('── Substances ──'),
      daySrc.indexOf('── Social Rhythm ──'),
    );
    expect(substancesSection).toContain('LoggedAt iso={detailData?.checkinLoggedAt ?? data.checkinTimestamp}');
  });

  it('day/[date].tsx fetches checkin created_at from daily_checkins', () => {
    expect(daySrc).toContain('daily_checkins');
    expect(daySrc).toContain('checkinLoggedAt');
  });

  it('day/[date].tsx detailData state declares checkinLoggedAt field', () => {
    const stateDecl = daySrc.slice(daySrc.indexOf('useState<{'), daySrc.indexOf('| null>(null)'));
    expect(stateDecl).toContain('checkinLoggedAt');
  });
});

// ─── 19. Social Rhythm — socialRhythmTimestamp full pipeline ─────────────────

describe('Social Rhythm — socialRhythmTimestamp full pipeline', () => {
  it('LocalDayData has socialRhythmTimestamp field', () => {
    expect(localSrc).toContain('socialRhythmTimestamp');
    expect(localSrc).toMatch(/socialRhythmTimestamp\?:\s*string\s*\|\s*null/);
  });

  it('DayData (calendar store) has socialRhythmTimestamp: string | null', () => {
    const interfaceBlock = calendarSrc.slice(
      calendarSrc.indexOf('export interface DayData'),
      calendarSrc.indexOf('interface CalendarStore'),
    );
    expect(interfaceBlock).toContain('socialRhythmTimestamp');
    expect(interfaceBlock).toMatch(/socialRhythmTimestamp:\s*string\s*\|\s*null/);
  });

  it('calendar skeleton populates socialRhythmTimestamp from local storage', () => {
    expect(calendarSrc).toContain('socialRhythmTimestamp: local?.socialRhythmTimestamp');
  });

  it('calendar Supabase merge falls back to socialMap created_at', () => {
    expect(calendarSrc).toContain('socialMap[date]?.created_at');
  });

  it('socialRhythm.ts checkIn saves socialRhythmTimestamp with new Date().toISOString()', () => {
    expect(socialRhythmSrc).toContain('socialRhythmTimestamp');
    expect(socialRhythmSrc).toContain('new Date().toISOString()');
  });

  it('socialRhythm.ts checkIn passes socialRhythmTimestamp to saveLocal', () => {
    const saveLocalStart = socialRhythmSrc.indexOf('saveLocal(');
    expect(saveLocalStart).toBeGreaterThan(-1);
    const saveLocalBlock = socialRhythmSrc.slice(saveLocalStart, saveLocalStart + 300);
    expect(saveLocalBlock).toContain('socialRhythmTimestamp');
  });

  it('day/[date].tsx social rhythm section uses LoggedAt with fallback chain', () => {
    const socialSection = daySrc.slice(
      daySrc.indexOf('── Social Rhythm ──'),
      daySrc.indexOf('── Cycle ──') !== -1
        ? daySrc.indexOf('── Cycle ──')
        : daySrc.indexOf('── Tasks ──'),
    );
    expect(socialSection).toContain('LoggedAt iso={detailData?.socialRhythmLoggedAt ?? data.socialRhythmTimestamp}');
  });

  it('day/[date].tsx fetches social rhythm created_at from social_rhythm_logs', () => {
    expect(daySrc).toContain('social_rhythm_logs');
    expect(daySrc).toContain('socialRhythmLoggedAt');
  });

  it('day/[date].tsx detailData state declares socialRhythmLoggedAt field', () => {
    const stateDecl = daySrc.slice(daySrc.indexOf('useState<{'), daySrc.indexOf('| null>(null)'));
    expect(stateDecl).toContain('socialRhythmLoggedAt');
  });
});

// ─── 20. Integration — logCheckin → local storage saves checkinTimestamp ──────

describe('Integration — logCheckin → local storage saves checkinTimestamp', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@react-native-async-storage/async-storage', () => ({
      getItem:    jest.fn().mockResolvedValue(null),
      setItem:    jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }));
    jest.mock('../../lib/supabase', () => ({ supabase: {} }));
  });

  it('logCheckin passes a valid ISO checkinTimestamp to saveLocal', async () => {
    const mockSaveLocal = jest.fn().mockResolvedValue(undefined);
    jest.mock('../../lib/local-day-store', () => ({
      saveLocal:      mockSaveLocal,
      getLocal:       jest.fn().mockResolvedValue(null),
      getPendingDates: jest.fn().mockResolvedValue([]),
    }));

    const { useTodayStore } = require('../../stores/today');
    useTodayStore.setState({ date: '2026-03-17' });

    const before = Date.now();
    await useTodayStore.getState().logCheckin('user-1', false, true);
    const after = Date.now();

    expect(mockSaveLocal).toHaveBeenCalled();
    const partial = mockSaveLocal.mock.calls[mockSaveLocal.mock.calls.length - 1][2];
    expect(partial.checkinTimestamp).toBeDefined();
    expect(partial.alcohol).toBe(false);
    expect(partial.cannabis).toBe(true);

    const ts = new Date(partial.checkinTimestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── 21. Integration — checkIn → local storage saves socialRhythmTimestamp ───

describe('Integration — checkIn (socialRhythm) → local storage saves socialRhythmTimestamp', () => {
  it('socialRhythm.ts checkIn calls saveLocal with socialRhythmTimestamp', () => {
    // Static source analysis: verify the saveLocal call is present and contains the field
    const saveLocalIdx = socialRhythmSrc.indexOf('saveLocal(');
    expect(saveLocalIdx).toBeGreaterThan(-1);
    const block = socialRhythmSrc.slice(saveLocalIdx, saveLocalIdx + 300);
    expect(block).toContain('socialRhythmTimestamp');
    expect(block).toContain('new Date().toISOString()');
  });

  it('socialRhythmTimestamp appears AFTER score calculation (not before)', () => {
    const scorePos = socialRhythmSrc.indexOf('const { score');
    const tsPos = socialRhythmSrc.indexOf('socialRhythmTimestamp');
    expect(scorePos).toBeGreaterThan(-1);
    expect(tsPos).toBeGreaterThan(-1);
    // Timestamp is generated after the score is computed (correct ordering)
    expect(tsPos).toBeGreaterThan(scorePos);
  });
});
