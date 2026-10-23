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

/** Colour = meaning on every guard screen: green lets in, red stops, amber waits. */
export const GuardSemantic = {
  allow: GuardColors.green,
  allowBg: '#0A9A62',
  deny: '#D93636',
  denyBg: '#C42B2B',
  wait: GuardColors.gold,
  waitBg: '#FFF3CC',
  neutral: GuardColors.ink,
} as const;

/** Gradient fills (top-left to bottom-right) for the big buttons and result screens. */
export const GuardGradients = {
  gold: ['#FFD95A', '#FFB800', '#FF9F0A'],
  dark: ['#2A2F3E', '#161922', '#0D0F14'],
  allow: ['#22D39A', '#0FB57A', '#08915F'],
  deny: ['#FF6B6B', '#E04545', '#B82424'],
  wait: ['#FFE38A', '#FFC933', '#FFB000'],
  glow: ['#FFF1C2', '#FBF4DF', '#F5F4F0'],
} as const;

/** Soft layered shadow shared by the cards. Colour it per card for a glow. */
export const guardShadow = (color = '#0D0F14', level: 1 | 2 | 3 = 2) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: level * 4 },
  shadowOpacity: 0.08 + level * 0.05,
  shadowRadius: level * 8,
  elevation: level * 3,
});

/** Sizes for guards: big, readable in sunlight, easy to hit with a thumb. */
export const GuardType = { body: 18, button: 20, title: 28, result: 44, min: 15 } as const;
export const GuardTouch = { min: 56, button: 72, giant: 120 } as const;

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
