export const SgateColors = {
  // Source of truth: the resident Home screen (src/components/home/ResidentHomeTheme.ts).
  // Keep these values in sync with ResidentHomeColors — Home is the design reference.

  // PRIMARY (Brand)
  black: '#111318',
  ink: '#111318',
  charcoal: '#253047',

  // ACCENT (Gold)
  gold: '#FACC15',
  goldDeep: '#F28D12',
  goldPale: '#FFF6D6',

  // SEMANTIC
  green: '#12B977',
  greenBg: '#EFFBF5',
  greenText: '#17617A',
  red: '#EF4052',
  redBg: '#FFF7F7',
  redBorder: 'rgba(239, 64, 82, 0.14)',
  blue: '#1688E9',
  blueBg: '#EFF7FF',
  orange: '#F28D12',
  orangeBg: '#FFF8EF',
  violet: '#8738D1',
  violetBg: '#F7F0FD',

  // NEUTRALS
  bg: '#FCFCFB',
  card: '#FFFFFF',
  surface: '#F6F6F7',
  border: '#ECEDEF',
  borderSoft: '#ECEDEF',

  // TEXT
  t1: '#111318',
  t2: '#73798C',
  t3: '#9297A8',
  t4: '#9297A8',
  section: '#747A91',
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
  sm: 13,
  md: 17,
  lg: 19,
  xl: 22,
  '2xl': 26,
  icon: 14,
  pill: 20,
  full: 9999,
} as const;

/** Shared layout values. Screens should use these instead of one-off gutters. */
export const SgateLayout = {
  screenGutter: 18,
  compactGutter: 16,
  headerTopGap: 16,
  headerBottomGap: 16,
  headerContentGap: 6,
  cardGap: 12,
  controlHeight: 52,
  iconButtonSize: 44,
  sheetMaxHeight: '88%' as const,
} as const;

/** Reusable surface recipes matching the Community Notices visual language. */
export const SgateSurfaces = {
  card: {
    backgroundColor: SgateColors.card,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    borderRadius: SgateRadius.md,
  },
  input: {
    minHeight: SgateLayout.controlHeight,
    backgroundColor: SgateColors.surface,
    borderWidth: 1,
    borderColor: SgateColors.border,
    borderRadius: SgateRadius.sm,
  },
  sheet: {
    backgroundColor: SgateColors.card,
    borderTopLeftRadius: SgateRadius['2xl'],
    borderTopRightRadius: SgateRadius['2xl'],
    maxHeight: SgateLayout.sheetMaxHeight,
    overflow: 'hidden' as const,
  },
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
  minimal: { shadowColor: '#253047', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  card: { shadowColor: '#253047', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 1 },
} as const;
