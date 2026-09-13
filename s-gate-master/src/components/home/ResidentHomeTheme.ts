import { Platform } from 'react-native';

export const ResidentHomeColors = {
    page: '#FCFCFB',
    card: '#FFFFFF',
    primary: '#FACC15',
    primaryText: '#111318',
    secondaryText: '#73798C',
    tertiaryText: '#9297A8',
    sectionText: '#747A91',
    border: '#ECEDEF',
    hero: '#FFF6D6',
    success: '#18BC7A',
    successText: '#17617A',
    danger: '#EF4052',
    dangerSurface: '#FFF7F7',
    dangerBorder: 'rgba(239, 64, 82, 0.14)',
    blue: '#1688E9',
    blueSurface: '#EFF7FF',
    orange: '#F28D12',
    orangeSurface: '#FFF8EF',
    green: '#12B977',
    greenSurface: '#EFFBF5',
    violet: '#8738D1',
    violetSurface: '#F7F0FD',
    neutralSurface: '#F6F6F7',
} as const;

export const ResidentHomeSpacing = {
    xxs: 4,
    xs: 8,
    sm: 10,
    md: 12,
    base: 16,
    gutter: 18,
    lg: 20,
    xl: 24,
} as const;

export const ResidentHomeRadius = {
    control: 13,
    icon: 14,
    card: 17,
    largeCard: 19,
    hero: 26,
    full: 999,
} as const;

export const ResidentHomeShadow = Platform.select({
    ios: {
        shadowColor: '#253047',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.045,
        shadowRadius: 10,
    },
    android: { elevation: 1 },
    default: {},
}) ?? {};
