import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Kapaleeshwarar Temple — Chennai */
const TempleIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="14" y="54" width="36" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Temple body */}
        <Rect x="18" y="34" width="28" height="20" rx="1" fill={color} opacity={0.35} />
        {/* Gopuram tiers (pyramid) */}
        <Rect x="20" y="28" width="24" height="6" rx="0.5" fill={color} opacity={0.4} />
        <Rect x="22" y="22" width="20" height="6" rx="0.5" fill={color} opacity={0.42} />
        <Rect x="24" y="16" width="16" height="6" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="27" y="11" width="10" height="5" rx="0.5" fill={color} opacity={0.48} />
        {/* Crown finial */}
        <Path d="M30 11 Q32 4 34 11" fill={color} opacity={0.5} />
        <Circle cx="32" cy="5" r="1.2" fill={color} opacity={0.5} />
        {/* Entrance arch */}
        <Path d="M28 54 Q32 44 36 54" stroke={color} strokeWidth={1.2} fill="none" />
        {/* Decorative horizontal lines on gopuram */}
        <Path d="M22 25 L42 25" stroke={color} strokeWidth={0.5} opacity={0.3} />
        <Path d="M24 19 L40 19" stroke={color} strokeWidth={0.5} opacity={0.3} />
        <Path d="M27 14 L37 14" stroke={color} strokeWidth={0.5} opacity={0.3} />
    </Svg>
));

TempleIcon.displayName = 'TempleIcon';
export default TempleIcon;
