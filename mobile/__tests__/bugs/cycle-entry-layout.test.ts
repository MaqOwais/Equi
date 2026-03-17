/**
 * CYCLE ENTRY LAYOUT CONSISTENCY — Regression test suite
 *
 * This bug has appeared 3 times. Every time it surfaces as a visual
 * inconsistency between two rendering paths in day/[date].tsx:
 *
 *   Path A — "Supabase path": cycleStore.dayEntries.length > 0
 *             renders: entryTime | entryDot | entryState
 *
 *   Path B — "Fallback path": cycleStore.dayEntries is empty, falls back
 *             to calendar store DayData
 *             BUG: rendered dot first, then state+time inline — different layout
 *
 * Regression history:
 *   #1 — Cross-date stale data: Mar 17 showed Mar 16's entries (Path A bleeding)
 *   #2 — No timestamp on fallback dates (Path B had no cycleTimestamp field)
 *   #3 — Inconsistent element order: Path B put dot before time column
 *
 * These tests lock down every structural invariant so the bug cannot recur
 * without a test failure.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_SCREEN_PATH = path.join(__dirname, '../../app/day/[date].tsx');
const CALENDAR_STORE_PATH = path.join(__dirname, '../../stores/calendar.ts');
const LOCAL_STORE_PATH = path.join(__dirname, '../../lib/local-day-store.ts');
const TODAY_STORE_PATH = path.join(__dirname, '../../stores/today.ts');
const CYCLE_STORE_PATH = path.join(__dirname, '../../stores/cycle.ts');

const src = fs.readFileSync(DAY_SCREEN_PATH, 'utf8');

/**
 * Extracts the JSX block between two marker comments in day/[date].tsx.
 * Throws if either marker is missing — the test itself flags the regression.
 */
function extractBlock(startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  const end   = src.indexOf(endMarker, start);
  if (start === -1) throw new Error(`Marker not found in source: "${startMarker}"`);
  if (end   === -1) throw new Error(`End marker not found after start: "${endMarker}"`);
  return src.slice(start, end);
}

/**
 * Returns the position of a style token (e.g. 's.entryTime') within a block.
 * Returns -1 if not found.
 */
function pos(block: string, token: string): number {
  return block.indexOf(token);
}

// Isolate each rendering branch
const SUPABASE_BLOCK_START  = '// Full timestamped timeline from Supabase';
const SUPABASE_BLOCK_END    = '// Fallback to calendar store data';
const FALLBACK_BLOCK_START  = '// Fallback to calendar store data';
const FALLBACK_BLOCK_END    = '</SectionCard>';

const supabaseBlock = extractBlock(SUPABASE_BLOCK_START, SUPABASE_BLOCK_END);
const fallbackBlock = extractBlock(FALLBACK_BLOCK_START, FALLBACK_BLOCK_END);

// ─── 1. Element ORDER in Supabase path ────────────────────────────────────────

describe('Supabase path — element order: time → dot → state', () => {
  it('renders entryTime before entryDot', () => {
    const timeP = pos(supabaseBlock, 's.entryTime');
    const dotP  = pos(supabaseBlock, 's.entryDot');
    expect(timeP).toBeGreaterThan(-1);
    expect(dotP).toBeGreaterThan(-1);
    expect(timeP).toBeLessThan(dotP);
  });

  it('renders entryDot before entryState', () => {
    const dotP   = pos(supabaseBlock, 's.entryDot');
    const stateP = pos(supabaseBlock, 's.entryState');
    expect(dotP).toBeGreaterThan(-1);
    expect(stateP).toBeGreaterThan(-1);
    expect(dotP).toBeLessThan(stateP);
  });

  it('renders entryTime before entryState', () => {
    const timeP  = pos(supabaseBlock, 's.entryTime');
    const stateP = pos(supabaseBlock, 's.entryState');
    expect(timeP).toBeLessThan(stateP);
  });

  it('renders entrySub after entryState', () => {
    const stateP = pos(supabaseBlock, 's.entryState');
    const subP   = pos(supabaseBlock, 's.entrySub');
    expect(stateP).toBeLessThan(subP);
  });

  it('renders entryNotes after entrySub', () => {
    const subP   = pos(supabaseBlock, 's.entrySub');
    const notesP = pos(supabaseBlock, 's.entryNotes');
    expect(subP).toBeLessThan(notesP);
  });

  it('sources timestamp from entry.timestamp (not a different field)', () => {
    expect(supabaseBlock).toContain('entry.timestamp');
    expect(supabaseBlock).not.toContain('entry.date');
    expect(supabaseBlock).not.toContain('entry.logged_at');
  });

  it('passes timestamp through fmtTime', () => {
    expect(supabaseBlock).toContain('fmtTime(entry.timestamp)');
  });
});

// ─── 2. Element ORDER in Fallback path ────────────────────────────────────────

describe('Fallback path — element order: time → dot → state (must match Supabase path)', () => {
  it('renders entryTime before entryDot', () => {
    const timeP = pos(fallbackBlock, 's.entryTime');
    const dotP  = pos(fallbackBlock, 's.entryDot');
    expect(timeP).toBeGreaterThan(-1);
    expect(dotP).toBeGreaterThan(-1);
    expect(timeP).toBeLessThan(dotP);
  });

  it('renders entryDot before entryState', () => {
    const dotP   = pos(fallbackBlock, 's.entryDot');
    const stateP = pos(fallbackBlock, 's.entryState');
    expect(dotP).toBeGreaterThan(-1);
    expect(stateP).toBeGreaterThan(-1);
    expect(dotP).toBeLessThan(stateP);
  });

  it('renders entryTime before entryState', () => {
    const timeP  = pos(fallbackBlock, 's.entryTime');
    const stateP = pos(fallbackBlock, 's.entryState');
    expect(timeP).toBeLessThan(stateP);
  });

  it('renders entrySub after entryState', () => {
    const stateP = pos(fallbackBlock, 's.entryState');
    const subP   = pos(fallbackBlock, 's.entrySub');
    expect(stateP).toBeLessThan(subP);
  });

  it('renders entryNotes after entrySub', () => {
    const subP   = pos(fallbackBlock, 's.entrySub');
    const notesP = pos(fallbackBlock, 's.entryNotes');
    expect(subP).toBeLessThan(notesP);
  });

  it('sources timestamp from data.cycleTimestamp (not entry.timestamp)', () => {
    expect(fallbackBlock).toContain('data.cycleTimestamp');
    expect(fallbackBlock).not.toContain('entry.timestamp');
  });

  it('passes timestamp through fmtTime', () => {
    expect(fallbackBlock).toContain('fmtTime(data.cycleTimestamp)');
  });
});

// ─── 3. Both paths use the SAME style names ───────────────────────────────────

describe('Both paths use identical style tokens', () => {
  const SHARED_STYLES = [
    's.entryRow',
    's.entryTime',
    's.entryDot',
    's.entryState',
    's.entrySub',
    's.entryNotes',
  ];

  for (const style of SHARED_STYLES) {
    it(`both Supabase and fallback use "${style}"`, () => {
      expect(supabaseBlock).toContain(style);
      expect(fallbackBlock).toContain(style);
    });
  }
});

// ─── 4. Fallback must NOT use the old broken inline-time pattern ──────────────

describe('Fallback path — anti-regression: old broken inline-time patterns must not exist', () => {
  it('does NOT put time inside the state row (old inline pattern)', () => {
    // The old bug placed entryTime AFTER entryState inside a flex row.
    // This was: <Text style={s.entryState}>…</Text> <Text style={s.entryTime}>…</Text>
    const statePos = pos(fallbackBlock, 's.entryState');
    const timePos  = pos(fallbackBlock, 's.entryTime');
    // entryTime must come BEFORE entryState, not after
    expect(timePos).toBeLessThan(statePos);
  });

  it('does NOT put the dot before the time column', () => {
    const dotPos  = pos(fallbackBlock, 's.entryDot');
    const timePos = pos(fallbackBlock, 's.entryTime');
    // Time must come first
    expect(timePos).toBeLessThan(dotPos);
  });

  it('does NOT nest entryTime inside a state-row flex container', () => {
    // Old broken code: <View flex:1><Text entryState>…</Text><Text entryTime>…</Text></View>
    // Detect by checking entryTime does NOT appear after the first flex:1 View
    const flex1Pos = fallbackBlock.indexOf('flex: 1');
    const timePos  = pos(fallbackBlock, 's.entryTime');
    if (flex1Pos !== -1) {
      // entryTime must appear BEFORE the first flex:1 container (not inside it)
      expect(timePos).toBeLessThan(flex1Pos);
    }
  });

  it('renders exactly one entryTime element in the fallback (no duplicate time nodes)', () => {
    const matches = fallbackBlock.match(/s\.entryTime/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('renders exactly one entryDot element in the fallback', () => {
    const matches = fallbackBlock.match(/s\.entryDot/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});

// ─── 5. Style definitions are consistent ─────────────────────────────────────

describe('Style definitions — entryRow layout enforces correct column order', () => {
  it('entryRow is flexDirection: row', () => {
    expect(src).toMatch(/entryRow:\s*\{[^}]*flexDirection:\s*['"]row['"]/);
  });

  it('entryTime has a fixed width (creates aligned left column)', () => {
    expect(src).toMatch(/entryTime:\s*\{[^}]*width:\s*\d+/);
  });

  it('entryDot has flexShrink: 0 (does not collapse)', () => {
    expect(src).toMatch(/entryDot:\s*\{[^}]*flexShrink:\s*0/);
  });
});

// ─── 6. cycleTimestamp data pipeline ─────────────────────────────────────────

describe('cycleTimestamp data pipeline — all 4 layers must carry the field', () => {
  it('LocalDayData has cycleTimestamp field', () => {
    const src = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    expect(src).toContain('cycleTimestamp');
  });

  it('DayData (calendar store) has cycleTimestamp field', () => {
    const src = fs.readFileSync(CALENDAR_STORE_PATH, 'utf8');
    const interfaceBlock = src.slice(src.indexOf('export interface DayData'), src.indexOf('interface CalendarStore'));
    expect(interfaceBlock).toContain('cycleTimestamp');
  });

  it('calendar store local skeleton initialises cycleTimestamp', () => {
    const src = fs.readFileSync(CALENDAR_STORE_PATH, 'utf8');
    // Step 1 skeleton build must set cycleTimestamp from local storage
    expect(src).toContain('cycleTimestamp');
    expect(src).toMatch(/cycleTimestamp.*local.*cycleTimestamp|local.*cycleTimestamp.*cycleTimestamp/s);
  });

  it('calendar store Supabase merge sets cycleTimestamp from logged_at', () => {
    const src = fs.readFileSync(CALENDAR_STORE_PATH, 'utf8');
    expect(src).toContain('cycleMap[date]?.logged_at');
  });

  it('today.ts logCycle saves cycleTimestamp to local storage', () => {
    const src = fs.readFileSync(TODAY_STORE_PATH, 'utf8');
    // Skip the type-definition occurrence; find the async implementation
    const implStart = src.indexOf('logCycle: async');
    expect(implStart).toBeGreaterThan(-1);
    const logCycleImpl = src.slice(implStart, implStart + 600);
    expect(logCycleImpl).toContain('cycleTimestamp');
  });

  it('today.ts logCycle generates timestamp with new Date().toISOString()', () => {
    const src = fs.readFileSync(TODAY_STORE_PATH, 'utf8');
    const implStart = src.indexOf('logCycle: async');
    expect(implStart).toBeGreaterThan(-1);
    const logCycleImpl = src.slice(implStart, implStart + 600);
    expect(logCycleImpl).toContain('new Date().toISOString()');
  });
});

// ─── 7. cycleStore.loadDay clears stale data ─────────────────────────────────

describe('cycleStore.loadDay — must clear stale dayEntries before fetch', () => {
  it('calls set({ dayEntries: [] }) before the await in loadDay', () => {
    const src = fs.readFileSync(CYCLE_STORE_PATH, 'utf8');
    // Skip the interface declaration; find the async implementation
    const implStart = src.indexOf('loadDay: async');
    expect(implStart).toBeGreaterThan(-1);
    const loadDayImpl = src.slice(implStart, implStart + 600);
    const clearPos = loadDayImpl.indexOf('dayEntries: []');
    const awaitPos = loadDayImpl.indexOf('await');
    expect(clearPos).toBeGreaterThan(-1);
    expect(awaitPos).toBeGreaterThan(-1);
    // The synchronous clear must happen before the Supabase await
    expect(clearPos).toBeLessThan(awaitPos);
  });

  it('does not keep old dayEntries after fetch returns empty results', async () => {
    jest.resetModules();
    // Inline mock so this describe block is self-contained
    jest.mock('../../lib/supabase', () => ({ supabase: {} }));
    const { useCycleStore } = require('../../stores/cycle');

    const staleEntry = {
      id: 'old', date: '2026-03-16', timestamp: '2026-03-16T17:44:00Z',
      state: 'mixed', intensity: 5, symptoms: [], notes: null,
    };
    useCycleStore.setState({ dayEntries: [staleEntry] });

    const mockSupabase = require('../../lib/supabase').supabase;
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: [] }),
    });

    await useCycleStore.getState().loadDay('user-1', '2026-03-17');
    expect(useCycleStore.getState().dayEntries).toEqual([]);
  });
});

// ─── 8. Both paths render a wrapping entryRow ─────────────────────────────────

describe('Both paths wrap content in s.entryRow', () => {
  it('Supabase path opens with <View style={s.entryRow}>', () => {
    expect(supabaseBlock).toMatch(/<View\s[^>]*s\.entryRow/);
  });

  it('Fallback path opens with <View style={s.entryRow}>', () => {
    expect(fallbackBlock).toMatch(/<View\s[^>]*s\.entryRow/);
  });
});

// ─── 9. Relative position parity between paths ────────────────────────────────

describe('Both paths have identical relative token ordering', () => {
  const TOKENS = ['s.entryRow', 's.entryTime', 's.entryDot', 's.entryState', 's.entrySub', 's.entryNotes'];

  function tokenOrder(block: string, tokens: string[]): string[] {
    return tokens
      .map((t) => ({ t, p: block.indexOf(t) }))
      .filter(({ p }) => p !== -1)
      .sort((a, b) => a.p - b.p)
      .map(({ t }) => t);
  }

  it('Supabase and fallback render style tokens in the same sequence', () => {
    const supabaseOrder = tokenOrder(supabaseBlock, TOKENS);
    const fallbackOrder = tokenOrder(fallbackBlock, TOKENS);
    expect(fallbackOrder).toEqual(supabaseOrder);
  });
});

// ─── 10. fmtTime utility is imported and used in both paths ───────────────────

describe('fmtTime utility', () => {
  it('is imported in day/[date].tsx', () => {
    expect(src).toContain("import { fmtTime }");
  });

  it('is called on entry.timestamp in the Supabase path', () => {
    expect(supabaseBlock).toContain('fmtTime(entry.timestamp)');
  });

  it('is called on data.cycleTimestamp in the fallback path', () => {
    expect(fallbackBlock).toContain('fmtTime(data.cycleTimestamp)');
  });

  it('is NOT called on entry.date or data.cycleState (wrong fields)', () => {
    expect(src).not.toContain('fmtTime(entry.date)');
    expect(src).not.toContain('fmtTime(data.cycleState)');
  });
});
