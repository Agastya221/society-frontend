import React, { memo } from 'react';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Victoria Memorial — Kolkata */
const VictoriaMemorialIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base platform */}
        <Rect x="6" y="56" width="52" height="3" rx="1" fill={color} opacity={0.25} />
        <Rect x="10" y="52" width="44" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Left wing */}
        <Rect x="10" y="36" width="14" height="16" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M10 36 L17 30 L24 36" fill={color} opacity={0.3} />
        {/* Right wing */}
        <Rect x="40" y="36" width="14" height="16" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M40 36 L47 30 L54 36" fill={color} opacity={0.3} />
        {/* Central body */}
        <Rect x="22" y="30" width="20" height="22" rx="0.5" fill={color} opacity={0.4} />
        {/* Entrance arch */}
        <Path d="M29 52 Q32 44 35 52" stroke={color} strokeWidth={1} fill="none" />
        {/* Main dome */}
        <Path d="M26 30 Q32 14 38 30" fill={color} opacity={0.45} />
        {/* Dome drum */}
        <Rect x="28" y="28" width="8" height="2" rx="0.5" fill={color} opacity={0.35} />
        {/* Dome lantern */}
        <Rect x="30" y="14" width="4" height="4" rx="0.5" fill={color} opacity={0.4} />
        {/* Angel of Victory on top */}
        <Line x1="32" y1="14" x2="32" y2="8" stroke={color} strokeWidth={1.2} />
        <Circle cx="32" cy="7" r="1.5" fill={color} opacity={0.5} />
        {/* Small side domes */}
        <Path d="M12 36 Q14 32 16 36" fill={color} opacity={0.3} />
        <Path d="M48 36 Q50 32 52 36" fill={color} opacity={0.3} />
    </Svg>
));

VictoriaMemorialIcon.displayName = 'VictoriaMemorialIcon';
export default VictoriaMemorialIcon;
