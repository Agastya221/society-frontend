import React, { memo } from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Varanasi Ghats — Varanasi */
const GhatsIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Water */}
        <Path d="M2 54 Q8 51 14 54 Q20 57 26 54 Q32 51 38 54 Q44 57 50 54 Q56 51 62 54" stroke={color} strokeWidth={1} fill="none" opacity={0.3} />
        <Path d="M2 58 Q8 55 14 58 Q20 61 26 58 Q32 55 38 58 Q44 61 50 58 Q56 55 62 58" stroke={color} strokeWidth={0.8} fill="none" opacity={0.2} />
        {/* Steps (ghats) descending to water */}
        <Rect x="4" y="46" width="56" height="2" rx="0.3" fill={color} opacity={0.2} />
        <Rect x="6" y="48" width="52" height="2" rx="0.3" fill={color} opacity={0.22} />
        <Rect x="8" y="50" width="48" height="2" rx="0.3" fill={color} opacity={0.25} />
        {/* Building 1 — left temple */}
        <Rect x="6" y="28" width="12" height="18" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M6 28 Q12 18 18 28" fill={color} opacity={0.4} />
        <Line x1="12" y1="18" x2="12" y2="14" stroke={color} strokeWidth={1} opacity={0.4} />
        {/* Building 2 — tall shikhara */}
        <Rect x="20" y="22" width="10" height="24" rx="0.5" fill={color} opacity={0.38} />
        <Path d="M20 22 L25 8 L30 22" fill={color} opacity={0.42} />
        <Line x1="25" y1="8" x2="25" y2="4" stroke={color} strokeWidth={1} opacity={0.4} />
        {/* Building 3 — wider structure */}
        <Rect x="32" y="26" width="14" height="20" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M34 34 Q36 31 38 34" stroke={color} strokeWidth={0.6} fill="none" opacity={0.3} />
        <Path d="M40 34 Q42 31 44 34" stroke={color} strokeWidth={0.6} fill="none" opacity={0.3} />
        <Rect x="34" y="22" width="10" height="4" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M36 22 Q39 16 42 22" fill={color} opacity={0.35} />
        {/* Building 4 — right */}
        <Rect x="48" y="30" width="10" height="16" rx="0.5" fill={color} opacity={0.32} />
        <Path d="M48 30 Q53 24 58 30" fill={color} opacity={0.35} />
    </Svg>
));

GhatsIcon.displayName = 'GhatsIcon';
export default GhatsIcon;
