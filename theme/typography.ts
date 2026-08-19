export const typography = {
  fontFamilyRegular: 'Inter-Regular',
  fontFamilyMedium: 'Inter-Medium',
  fontFamilySemiBold: 'Inter-SemiBold',
  fontFamilyBold: 'Inter-Bold',
  fontFamilyDisplay: 'Sora-SemiBold',
  fontFamilyDisplayBold: 'Sora-Bold',

  display: {
    fontFamily: 'Sora-Bold',
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700' as const,
  },
  h1: {
    fontFamily: 'Sora-SemiBold',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '600' as const,
  },
  h2: {
    fontFamily: 'Sora-SemiBold',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  h3: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  h4: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  button: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  overline: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
  },
} as const;

export type TypographyStyle = keyof typeof typography;
