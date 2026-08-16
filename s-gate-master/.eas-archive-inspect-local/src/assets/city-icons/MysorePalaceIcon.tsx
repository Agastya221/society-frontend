import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Mysore Palace — Mysore */
const MysorePalaceIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base platform */}
        <Rect x="6" y="56" width="52" height="3" rx="1" fill={color} opacity={0.25} />
        <Rect x="8" y="52" width="48" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Main building */}
        <Rect x="10" y="32" width="44" height="20" rx="1" fill={color} opacity={0.35} />
        {/* Entrance arch */}
        <Path d="M28 52 Q32 44 36 52" stroke={color} strokeWidth={1.2} fill="none" />
        {/* Windows */}
        <Path d="M14 40 Q16 37 18 40" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M22 40 Q24 37 26 40" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M38 40 Q40 37 42 40" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M46 40 Q48 37 50 40" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        {/* Upper cornice */}
        <Rect x="8" y="28" width="48" height="4" rx="0.5" fill={color} opacity={0.4} />
        {/* Central large dome */}
        <Path d="M24 28 Q32 12 40 28" fill={color} opacity={0.45} />
        <Rect x="29" y="12" width="6" height="4" rx="0.5" fill={color} opacity={0.4} />
        <Circle cx="32" cy="10" r="2" fill={color} opacity={0.5} />
        <Path d="M32 8 L32 5" stroke={color} strokeWidth={1} />
        {/* Left dome */}
        <Path d="M10 28 Q14 22 18 28" fill={color} opacity={0.3} />
        <Circle cx="14" cy="21.5" r="1" fill={color} opacity={0.35} />
        {/* Right dome */}
        <Path d="M46 28 Q50 22 54 28" fill={color} opacity={0.3} />
        <Circle cx="50" cy="21.5" r="1" fill={color} opacity={0.35} />
        {/* Corner towers */}
        <Rect x="8" y="26" width="4" height="6" rx="0.5" fill={color} opacity={0.35} />
        <Rect x="52" y="26" width="4" height="6" rx="0.5" fill={color} opacity={0.35} />
    </Svg>
));

MysorePalaceIcon.displayName = 'MysorePalaceIcon';
export default MysorePalaceIcon;
