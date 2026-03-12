import { parseSupabaseTs, fmtLocalTime, fmtTime, fmtTimestamp } from '../../utils/timestamps';

// ─── parseSupabaseTs ──────────────────────────────────────────────────────────

describe('parseSupabaseTs', () => {
  it('parses Supabase server format (microseconds + +00:00)', () => {
    // "2026-03-12T04:07:22.123456+00:00" — the format that was causing the bug
    const d = parseSupabaseTs('2026-03-12T04:07:22.123456+00:00');
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
    // UTC hour should be 4
    expect(d.getUTCHours()).toBe(4);
    expect(d.getUTCMinutes()).toBe(7);
  });

  it('parses standard Z format unchanged', () => {
    const d = parseSupabaseTs('2026-03-12T04:07:22.123Z');
    expect(d.getUTCHours()).toBe(4);
    expect(d.getUTCMinutes()).toBe(7);
  });

  it('produces the same Date from both formats for the same moment', () => {
    const fromServer = parseSupabaseTs('2026-03-12T04:07:22.123456+00:00');
    const fromApp    = parseSupabaseTs('2026-03-12T04:07:22.123Z');
    expect(fromServer.getTime()).toBe(fromApp.getTime());
  });

  it('handles no fractional seconds', () => {
    const d = parseSupabaseTs('2026-03-12T04:07:22+00:00');
    expect(isNaN(d.getTime())).toBe(false);
    expect(d.getUTCHours()).toBe(4);
  });
});

// ─── fmtLocalTime ─────────────────────────────────────────────────────────────

describe('fmtLocalTime', () => {
  it('formats midnight as 12:00 AM', () => {
    const d = new Date('2026-01-01T00:00:00');
    expect(fmtLocalTime(d)).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    const d = new Date('2026-01-01T12:00:00');
    expect(fmtLocalTime(d)).toBe('12:00 PM');
  });

  it('formats 9:05 PM correctly', () => {
    const d = new Date('2026-01-01T21:05:00');
    expect(fmtLocalTime(d)).toBe('9:05 PM');
  });

  it('formats 1:30 AM correctly', () => {
    const d = new Date('2026-01-01T01:30:00');
    expect(fmtLocalTime(d)).toBe('1:30 AM');
  });

  it('pads minutes with leading zero', () => {
    const d = new Date('2026-01-01T14:03:00');
    expect(fmtLocalTime(d)).toBe('2:03 PM');
  });
});

// ─── fmtTime ──────────────────────────────────────────────────────────────────

describe('fmtTime', () => {
  it('handles Supabase server timestamp', () => {
    // 09:30 UTC — what the local time is depends on TZ, but format should be valid
    const result = fmtTime('2026-03-12T09:30:00.000000+00:00');
    expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });
});

// ─── fmtTimestamp ─────────────────────────────────────────────────────────────

describe('fmtTimestamp', () => {
  beforeEach(() => {
    // Pin "now" to 2026-03-12 at 15:00 UTC
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-12T15:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Today, ..." for a timestamp on the current calendar day', () => {
    const result = fmtTimestamp('2026-03-12T09:00:00.000Z');
    expect(result).toMatch(/^Today, /);
  });

  it('returns "Yesterday, ..." for a timestamp on the previous calendar day', () => {
    const result = fmtTimestamp('2026-03-11T10:00:00.000Z');
    expect(result).toMatch(/^Yesterday, /);
  });

  it('returns weekday name for timestamps 2–6 days ago', () => {
    // 3 days ago
    const result = fmtTimestamp('2026-03-09T10:00:00.000Z');
    expect(result).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), /);
  });

  it('returns "Month Day" for timestamps 7–365 days ago', () => {
    const result = fmtTimestamp('2026-01-01T10:00:00.000Z');
    expect(result).toMatch(/^Jan 1, /);
  });

  it('returns "Month Day, Year" for timestamps over a year ago', () => {
    const result = fmtTimestamp('2024-01-01T10:00:00.000Z');
    expect(result).toMatch(/^Jan 1, 2024, /);
  });

  it('always appends a valid time portion', () => {
    const result = fmtTimestamp('2026-03-12T13:45:00.000Z');
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)$/);
  });

  it('handles Supabase microsecond format without error', () => {
    expect(() => fmtTimestamp('2026-03-12T04:07:22.123456+00:00')).not.toThrow();
  });
});
