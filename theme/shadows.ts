import { colors } from './colors';

export const shadows = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

export const gradients = {
  primary: [colors.gradientStart, colors.gradientEnd],
  hero: [colors.primary, colors.secondary],
  card: ['rgba(124, 58, 237, 0.18)', 'rgba(168, 85, 247, 0.0)'],
  dark: [colors.background, colors.backgroundElevated],
  warm: ['#7C3AED', '#C084FC'],
  deep: ['#4C1D95', '#7C3AED'],
} as const;
