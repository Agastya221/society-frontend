import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Rumi Darwaza — Lucknow */
const RumiDarwazaIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="10" y="56" width="44" height="3" rx="1" fill={color} opacity={0.25} />
        {/* Left tower */}
        <Rect x="10" y="20" width="8" height="36" rx="1" fill={color} opacity={0.4} />
        <Path d="M10 20 Q14 14 18 20" fill={color} opacity={0.45} />
        <Circle cx="14" cy="13.5" r="1" fill={color} opacity={0.4} />
        {/* Right tower */}
        <Rect x="46" y="20" width="8" height="36" rx="1" fill={color} opacity={0.4} />
        <Path d="M46 20 Q50 14 54 20" fill={color} opacity={0.45} />
        <Circle cx="50" cy="13.5" r="1" fill={color} opacity={0.4} />
        {/* Main arch gateway */}
        <Rect x="18" y="26" width="28" height="30" rx="1" fill={color} opacity={0.35} />
        <Path
            d="M22 56 Q32 30 42 56"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
        {/* Upper parapet */}
        <Rect x="16" y="22" width="32" height="4" rx="0.5" fill={color} opacity={0.4} />
        {/* Central dome */}
        <Path d="M26 22 Q32 12 38 22" fill={color} opacity={0.45} />
        <Circle cx="32" cy="11.5" r="1.5" fill={color} opacity={0.5} />
        <Path d="M32 10 L32 7" stroke={color} strokeWidth={1} />
        {/* Decorative arches on parapet */}
        <Path d="M20 26 Q22 24 24 26" stroke={color} strokeWidth={0.6} fill="none" opacity={0.3} />
        <Path d="M28 26 Q30 24 32 26" stroke={color} strokeWidth={0.6} fill="none" opacity={0.3} />
        <Path d="M36 26 Q38 24 40 26" stroke={color} strokeWidth={0.6} fill="none" opacity={0.3} />
    </Svg>
));

RumiDarwazaIcon.displayName = 'RumiDarwazaIcon';
export default RumiDarwazaIcon;
