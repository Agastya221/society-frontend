import { Platform } from 'react-native';

/** Shared S-Gate visual language, tuned for the guard app. */
export const GuardColors = {
  black: '#0D0F14',
  ink: '#161922',
  charcoal: '#1E212B',
  gold: '#FFB800',
  goldDeep: '#E5A500',
  goldPale: '#FFF8E1',
  green: '#00B978',
  greenBg: '#E5FBF3',
  red: '#F04444',
  redBg: '#FFF0F0',
  blue: '#397FE8',
  blueBg: '#EBF3FF',
  violet: '#8657E8',
  bg: '#F5F4F0',
  card: '#FFFFFF',
  surface: '#EEECEA',
  border: '#E5E3DE',
  borderSoft: '#F0EEEB',
  t1: '#0D0F14',
  t2: '#4A4D57',
  t3: '#8A8D97',
  t4: '#B5B8C0',
} as const;

export const GuardSpacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const GuardRadius = { sm: 12, md: 16, lg: 20, xl: 24, full: 999 } as const;

// System fonts avoid downloading/loading a custom font on low-memory devices.
export const GuardFonts = Platform.select({
  ios: { regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  default: { regular: 'sans-serif', medium: 'sans-serif-medium', semibold: 'sans-serif-medium', bold: 'sans-serif' },
})!;

export const GuardShadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10 },
  android: { elevation: 1 },
})!;

// Compatibility exports used by the create-expo-app utility components.
export const Colors = {
  light: { text: GuardColors.t1, background: GuardColors.bg, tint: GuardColors.goldDeep, icon: GuardColors.t3, tabIconDefault: GuardColors.t3, tabIconSelected: GuardColors.goldDeep },
  dark: { text: '#F7F7F7', background: GuardColors.black, tint: GuardColors.gold, icon: '#A8ABB4', tabIconDefault: '#A8ABB4', tabIconSelected: GuardColors.gold },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui', serif: 'Georgia', rounded: 'system-ui', mono: 'monospace' },
});
