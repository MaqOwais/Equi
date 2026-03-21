/**
 * BIPOLAR flag utility.
 *
 * Centralises the logic for deciding whether a user is on the bipolar spectrum.
 * - BIPOLAR = true  → bipolar_1 | bipolar_2 | cyclothymia
 * - BIPOLAR = false → depression | anxiety | general | other | unsure | null
 *
 * Use isBipolar() anywhere you need to branch content between the two modes.
 * Use useBipolarFlag() inside React components for a hook-friendly interface.
 */

import type { Diagnosis } from '../types/database';
import { useAuthStore } from '../stores/auth';

const BIPOLAR_DIAGNOSES = new Set<Diagnosis>(['bipolar_1', 'bipolar_2', 'cyclothymia']);

export function isBipolar(diagnosis: Diagnosis | null | undefined): boolean {
  if (!diagnosis) return false;
  return BIPOLAR_DIAGNOSES.has(diagnosis);
}

/** React hook — reads diagnosis from the auth store and returns the flag. */
export function useBipolarFlag(): boolean {
  const profile = useAuthStore((s) => s.profile);
  return isBipolar(profile?.diagnosis);
}

/** Human-readable label for a diagnosis value. */
export function diagnosisLabel(diagnosis: Diagnosis | null | undefined): string {
  switch (diagnosis) {
    case 'bipolar_1':    return 'Bipolar I';
    case 'bipolar_2':    return 'Bipolar II';
    case 'cyclothymia':  return 'Cyclothymia';
    case 'depression':   return 'Depression / Low mood';
    case 'anxiety':      return 'Anxiety';
    case 'general':      return 'General wellness';
    case 'other':        return 'Other';
    case 'unsure':       return 'Still figuring it out';
    default:             return 'Not set';
  }
}
