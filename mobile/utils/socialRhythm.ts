import type { RoutineAnchor, RoutineAnchorLog, AnchorDetailEntry } from '../types/database';

/**
 * Returns absolute delta in minutes between two HH:MM[:SS] strings.
 * Handles midnight crossing (e.g. 23:45 vs 00:10 → 25 min).
 */
export function timeDeltaMinutes(target: string, actual: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const diff = Math.abs(toMin(target) - toMin(actual));
  return Math.min(diff, 1440 - diff);
}

export interface RhythmScoreResult {
  score: number;
  hit: number;      // anchors within ±30min
  partial: number;  // anchors within ±60min
  total: number;    // anchors with a target_time set
  detail: AnchorDetailEntry[];
}

export function calculateRhythmScore(
  anchors: RoutineAnchor[],
  logs: RoutineAnchorLog[],
): RhythmScoreResult {
  const enabled = anchors.filter((a) => a.target_time);
  if (!enabled.length) return { score: 0, hit: 0, partial: 0, total: 0, detail: [] };

  const logMap = new Map(logs.map((l) => [l.anchor_id, l.actual_time]));
  let points = 0;
  let hit = 0;
  let partial = 0;
  const detail: AnchorDetailEntry[] = [];

  for (const anchor of enabled) {
    const actual = logMap.get(anchor.id) ?? null;
    const delta = actual && anchor.target_time
      ? timeDeltaMinutes(anchor.target_time, actual)
      : null;

    let pts = 0;
    if (delta !== null) {
      if (delta <= 30) { pts = 1.0; hit++; }
      else if (delta <= 60) { pts = 0.5; partial++; }
    }
    points += pts;
    detail.push({ anchor_id: anchor.id, anchor_name: anchor.anchor_name, target: anchor.target_time!, actual, delta_minutes: delta });
  }

  return {
    score: Math.round((points / enabled.length) * 100),
    hit,
    partial,
    total: enabled.length,
    detail,
  };
}

/** Colour-code a 0–100 rhythm score. */
export function scoreColor(score: number): string {
  if (score >= 80) return '#A8C5A0';  // sage
  if (score >= 50) return '#E8DCC8';  // sand
  return '#C4A0B0';                   // mauve
}

/** Current time as HH:MM string. */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
