import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './spacing';
import { typography } from './typography';
import { shadows, gradients } from './shadows';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  gradients,
};

export type Theme = typeof theme;

export type AppTheme = 'light' | 'dark';

export { colors, spacing, radius, typography, shadows, gradients };
export default theme;
