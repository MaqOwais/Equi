/**
 * Shared timestamp utilities.
 *
 * Why this exists:
 * - Supabase server timestamps use microseconds + "+00:00" suffix
 *   (e.g. "2026-03-12T04:07:22.123456+00:00") which Hermes mis-parses.
 * - toLocaleTimeString() is unreliable on Android builds lacking full ICU data.
 * - These functions are used in workbook.tsx, tracker.tsx, and day/[date].tsx.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Normalize any Supabase or standard ISO timestamp to a valid JS Date. */
export function parseSupabaseTs(iso: string): Date {
  const normalized = iso
    .replace(/(\.\d{3})\d+/, '$1')  // trim microseconds → milliseconds
    .replace(/\+00:00$/, 'Z');       // replace +00:00 with Z
  return new Date(normalized);
}

/** Format a Date as "H:MM AM/PM" using local timezone (no ICU dependency). */
export function fmtLocalTime(d: Date): string {
  const h    = d.getHours();
  const m    = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format an ISO string as just "H:MM AM/PM". Used in detail views. */
export function fmtTime(iso: string): string {
  return fmtLocalTime(parseSupabaseTs(iso));
}

/**
 * Format an ISO string as a human-relative timestamp:
 * "Today, 9:30 PM" / "Yesterday, 2:15 PM" / "Mon, 11:00 AM" /
 * "Mar 11" / "Mar 11, 2025"
 */
export function fmtTimestamp(iso: string): string {
  const d   = parseSupabaseTs(iso);
  const now = new Date();
  const timeStr = fmtLocalTime(d);

  const entryDay = d.toDateString();
  const todayDay = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayDay = yesterday.toDateString();

  if (entryDay === todayDay)     return `Today, ${timeStr}`;
  if (entryDay === yesterdayDay) return `Yesterday, ${timeStr}`;

  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 7 * 86400000) return `${WEEKDAYS[d.getDay()]}, ${timeStr}`;

  const dateStr = diffMs > 365 * 86400000
    ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `${dateStr}, ${timeStr}`;
}
