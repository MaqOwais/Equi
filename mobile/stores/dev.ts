/**
 * dev.ts — Developer override store.
 *
 * Only meaningful when DEV_MODE = true (constants/dev.ts).
 * In production builds, overrides are never applied and the store is never
 * rendered — the bundle cost is negligible (tiny Zustand slice).
 *
 * Overrides reset to null on every fresh app start (no persistence).
 */

import { create } from 'zustand';
import type { Diagnosis } from '../types/database';

export type BipolarOverride = 'bipolar' | 'general' | null;

interface DevStore {
  // ── Overrides ────────────────────────────────────────────────────────────
  /** null = use real profile value; 'bipolar'/'general' = force */
  bipolarOverride: BipolarOverride;
  /** null = use real profile diagnosis; anything else = simulate that diagnosis */
  diagnosisOverride: Diagnosis | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setBipolarOverride: (v: BipolarOverride) => void;
  setDiagnosisOverride: (d: Diagnosis | null) => void;
  resetAll: () => void;
}

const DEFAULTS: Pick<DevStore, 'bipolarOverride' | 'diagnosisOverride'> = {
  bipolarOverride:   null,
  diagnosisOverride: null,
};

export const useDevStore = create<DevStore>((set) => ({
  ...DEFAULTS,

  setBipolarOverride: (v) => set({ bipolarOverride: v }),
  setDiagnosisOverride: (d) => set({ diagnosisOverride: d }),
  resetAll: () => set(DEFAULTS),
}));
