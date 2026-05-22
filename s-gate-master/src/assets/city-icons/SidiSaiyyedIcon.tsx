import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Sidi Saiyyed Mosque Jali — Ahmedabad */
const SidiSaiyyedIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="10" y="54" width="44" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Main body */}
        <Rect x="14" y="28" width="36" height="26" rx="1" fill={color} opacity={0.35} />
        {/* Arched window frame (the iconic jali) */}
        <Path
            d="M22 48 Q32 22 42 48"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
        {/* Inner tree/jali pattern — simplified branches */}
        <Path d="M32 48 L32 32" stroke={color} strokeWidth={1} opacity={0.4} />
        <Path d="M32 36 Q26 30 24 34" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M32 36 Q38 30 40 34" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M32 40 Q28 36 26 38" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M32 40 Q36 36 38 38" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        {/* Top parapet */}
        <Rect x="12" y="24" width="40" height="4" rx="0.5" fill={color} opacity={0.4} />
        {/* Small domes */}
        <Path d="M18 24 Q20 20 22 24" fill={color} opacity={0.35} />
        <Path d="M30 24 Q32 18 34 24" fill={color} opacity={0.45} />
        <Path d="M42 24 Q44 20 46 24" fill={color} opacity={0.35} />
        <Circle cx="32" cy="17.5" r="1" fill={color} opacity={0.4} />
    </Svg>
));

SidiSaiyyedIcon.displayName = 'SidiSaiyyedIcon';
export default SidiSaiyyedIcon;
