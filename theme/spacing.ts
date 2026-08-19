export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type Spacing = keyof typeof spacing;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  base: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  full: 9999,
} as const;

export type Radius = keyof typeof radius;
