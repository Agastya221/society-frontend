import React, { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Shaniwar Wada — Pune */
const ShaniwarWadaIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="8" y="56" width="48" height="3" rx="1" fill={color} opacity={0.25} />
        {/* Main fort wall */}
        <Rect x="10" y="28" width="44" height="28" rx="1" fill={color} opacity={0.35} />
        {/* Battlements / crenellation */}
        <Rect x="10" y="24" width="6" height="4" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="20" y="24" width="6" height="4" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="30" y="24" width="6" height="4" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="40" y="24" width="6" height="4" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="48" y="24" width="6" height="4" rx="0.5" fill={color} opacity={0.45} />
        {/* Grand entrance arch */}
        <Path
            d="M26 56 Q32 38 38 56"
            stroke={color}
            strokeWidth={1.8}
            fill="none"
        />
        {/* Upper window arches */}
        <Path d="M16 38 Q19 34 22 38" stroke={color} strokeWidth={1} fill="none" />
        <Path d="M42 38 Q45 34 48 38" stroke={color} strokeWidth={1} fill="none" />
        {/* Central tower / spire */}
        <Rect x="28" y="16" width="8" height="8" rx="0.5" fill={color} opacity={0.5} />
        <Path d="M28 16 L32 8 L36 16" fill={color} opacity={0.45} />
        {/* Flag */}
        <Path d="M32 8 L32 4" stroke={color} strokeWidth={1} />
        <Path d="M32 4 L37 5.5 L32 7" fill={color} opacity={0.4} />
    </Svg>
));

ShaniwarWadaIcon.displayName = 'ShaniwarWadaIcon';
export default ShaniwarWadaIcon;
