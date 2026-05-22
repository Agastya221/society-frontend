import React, { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { CityIconProps } from './types';

/**
 * Elegant City Skyline fallback — used when no specific
 * landmark icon exists for a city. Feels intentional and premium.
 */
const CitySkylineIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Ground */}
        <Rect x="4" y="54" width="56" height="3" rx="1" fill={color} opacity={0.25} />
        {/* Building 1 — medium, left */}
        <Rect x="6" y="30" width="10" height="24" rx="1" fill={color} opacity={0.3} />
        <Rect x="8" y="34" width="2.5" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="12" y="34" width="2.5" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="8" y="40" width="2.5" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="12" y="40" width="2.5" height="3" rx="0.3" fill={color} opacity={0.15} />
        {/* Building 2 — tall tower, center-left */}
        <Rect x="18" y="18" width="8" height="36" rx="1" fill={color} opacity={0.38} />
        <Rect x="20" y="22" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="23" y="22" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="20" y="28" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="23" y="28" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        <Path d="M22 18 L22 14" stroke={color} strokeWidth={1} opacity={0.35} />
        {/* Building 3 — widest, center */}
        <Rect x="28" y="26" width="14" height="28" rx="1" fill={color} opacity={0.35} />
        <Rect x="30" y="30" width="3" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="35" y="30" width="3" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="30" y="36" width="3" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="35" y="36" width="3" height="3" rx="0.3" fill={color} opacity={0.15} />
        <Path d="M32 26 Q35 20 38 26" fill={color} opacity={0.3} />
        {/* Building 4 — short, right */}
        <Rect x="44" y="38" width="8" height="16" rx="1" fill={color} opacity={0.3} />
        <Rect x="46" y="42" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="49" y="42" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        {/* Building 5 — medium-tall, far right */}
        <Rect x="54" y="28" width="6" height="26" rx="0.5" fill={color} opacity={0.32} />
        <Rect x="55.5" y="32" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
        <Rect x="55.5" y="38" width="2" height="2.5" rx="0.3" fill={color} opacity={0.15} />
    </Svg>
));

CitySkylineIcon.displayName = 'CitySkylineIcon';
export default CitySkylineIcon;
