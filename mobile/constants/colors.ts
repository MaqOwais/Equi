export const Colors = {
  sageGreen:  '#A8C5A0', // Stable / calm
  skyBlue:    '#89B4CC', // Manic / elevated
  dustyMauve: '#C4A0B0', // Depressive / low
  warmSand:   '#E8DCC8', // Neutral backgrounds
  softWhite:  '#F7F3EE', // Cards / surfaces
  charcoal:   '#3D3935', // Primary text
  mutedGold:  '#C9A84C', // Achievements / rewards
} as const;

export type CycleState = 'stable' | 'manic' | 'depressive' | 'mixed';

export const CycleColors: Record<CycleState, string> = {
  stable:     Colors.sageGreen,
  manic:      Colors.skyBlue,
  depressive: Colors.dustyMauve,
  mixed:      Colors.warmSand,
};
