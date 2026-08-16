export const SgateColors = {
  // PRIMARY (Brand)
  black: '#0D0F14',
  ink: '#161922',
  charcoal: '#1E212B',

  // ACCENT (Gold)
  gold: '#FFB800',
  goldDeep: '#E5A500',
  goldPale: '#FFF8E1',

  // SEMANTIC
  green: '#00D68F',
  greenBg: '#E5FBF3',
  red: '#FF5C5C',
  redBg: '#FFF0F0',
  blue: '#4C9AFF',
  blueBg: '#EBF3FF',
  violet: '#9B6DFF',

  // NEUTRALS
  bg: '#F5F4F0',
  card: '#FFFFFF',
  surface: '#EEECEA',
  border: '#E5E3DE',
  borderSoft: '#F0EEEB',

  // TEXT
  t1: '#0D0F14',
  t2: '#4A4D57',
  t3: '#8A8D97',
  t4: '#B5B8C0',
} as const;

export const SgateSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const SgateRadius = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 22,
  '2xl': 24,
  pill: 20,
  full: 9999,
} as const;

export const SgateFonts = {
  regular: 'Sora-Regular',
  medium: 'Sora-Medium',
  semibold: 'Sora-SemiBold',
  bold: 'Sora-Bold',
  extrabold: 'Sora-ExtraBold',
} as const;

export const SgateTypography = {
  screenTitle: { fontSize: 28, fontFamily: 'Sora-ExtraBold', letterSpacing: -0.04 * 28 },
  sectionHeading: { fontSize: 17, fontFamily: 'Sora-ExtraBold' },
  cardTitle: { fontSize: 15, fontFamily: 'Sora-SemiBold' },
  body: { fontSize: 14, fontFamily: 'Sora-Regular' },
  bodyMedium: { fontSize: 14, fontFamily: 'Sora-Medium' },
  caption: { fontSize: 12, fontFamily: 'Sora-Medium' },
  microLabel: { fontSize: 11, fontFamily: 'Sora-Bold', letterSpacing: 0.1 * 11, textTransform: 'uppercase' as const },
  tabLabel: { fontSize: 9.5, fontFamily: 'Sora-Regular' },
  tabLabelActive: { fontSize: 9.5, fontFamily: 'Sora-Bold' },
} as const;

export const SgateShadows = {
  minimal: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 40, elevation: 3 },
} as const;
