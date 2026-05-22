import React, { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Hawa Mahal — Jaipur */
const HawaMahalIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="14" y="56" width="36" height="3" rx="1" fill={color} opacity={0.25} />
        {/* Main façade — 5 tiers tapering upward */}
        {/* Tier 1 (bottom) — widest */}
        <Rect x="16" y="48" width="32" height="8" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M20 56 Q22 52 24 56" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M28 56 Q30 52 32 56" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M36 56 Q38 52 40 56" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        {/* Tier 2 */}
        <Rect x="18" y="40" width="28" height="8" rx="0.5" fill={color} opacity={0.38} />
        <Path d="M22 48 Q24 44 26 48" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M30 48 Q32 44 34 48" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M38 48 Q40 44 42 48" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        {/* Tier 3 */}
        <Rect x="20" y="32" width="24" height="8" rx="0.5" fill={color} opacity={0.4} />
        <Path d="M24 40 Q26 36 28 40" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M32 40 Q34 36 36 40" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        {/* Tier 4 */}
        <Rect x="23" y="24" width="18" height="8" rx="0.5" fill={color} opacity={0.42} />
        <Path d="M27 32 Q29 28 31 32" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M33 32 Q35 28 37 32" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        {/* Tier 5 (top) — narrowest */}
        <Rect x="26" y="16" width="12" height="8" rx="0.5" fill={color} opacity={0.45} />
        <Path d="M29 24 Q30 20 31 24" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        <Path d="M33 24 Q34 20 35 24" stroke={color} strokeWidth={0.7} fill="none" opacity={0.3} />
        {/* Crown */}
        <Path d="M28 16 L32 8 L36 16" fill={color} opacity={0.4} />
        <Path d="M32 8 L32 5" stroke={color} strokeWidth={1} />
    </Svg>
));

HawaMahalIcon.displayName = 'HawaMahalIcon';
export default HawaMahalIcon;
