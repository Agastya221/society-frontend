import React, { memo } from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Vidhana Soudha — Bangalore */
const VidhanaSoudhaIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base platform */}
        <Rect x="6" y="56" width="52" height="3" rx="1" fill={color} opacity={0.25} />
        <Rect x="8" y="52" width="48" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Steps */}
        <Rect x="10" y="48" width="44" height="4" rx="0.5" fill={color} opacity={0.3} />
        {/* Pillars row */}
        <Rect x="14" y="32" width="3" height="16" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="22" y="32" width="3" height="16" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="30" y="32" width="3" height="16" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="38" y="32" width="3" height="16" rx="0.5" fill={color} opacity={0.45} />
        <Rect x="46" y="32" width="3" height="16" rx="0.5" fill={color} opacity={0.45} />
        {/* Upper beam */}
        <Rect x="10" y="28" width="44" height="4" rx="1" fill={color} opacity={0.5} />
        {/* Central pediment / triangular crown */}
        <Path d="M20 28 L32 16 L44 28" fill={color} opacity={0.4} />
        {/* Central dome */}
        <Path d="M28 16 Q32 8 36 16" fill={color} opacity={0.5} />
        <Line x1="32" y1="10" x2="32" y2="6" stroke={color} strokeWidth={1.2} />
        {/* Side wing roofs */}
        <Rect x="10" y="26" width="10" height="2" rx="0.5" fill={color} opacity={0.35} />
        <Rect x="44" y="26" width="10" height="2" rx="0.5" fill={color} opacity={0.35} />
    </Svg>
));

VidhanaSoudhaIcon.displayName = 'VidhanaSoudhaIcon';
export default VidhanaSoudhaIcon;
