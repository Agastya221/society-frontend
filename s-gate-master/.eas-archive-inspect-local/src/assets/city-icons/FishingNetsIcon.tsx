import React, { memo } from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Chinese Fishing Nets — Kochi */
const FishingNetsIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Water line */}
        <Path d="M4 54 Q10 51 16 54 Q22 57 28 54 Q34 51 40 54 Q46 57 52 54 Q58 51 60 54" stroke={color} strokeWidth={1.2} fill="none" opacity={0.3} />
        <Path d="M4 58 Q10 55 16 58 Q22 61 28 58 Q34 55 40 58 Q46 61 52 58 Q58 55 60 58" stroke={color} strokeWidth={1} fill="none" opacity={0.2} />
        {/* Main vertical pole */}
        <Line x1="20" y1="50" x2="20" y2="10" stroke={color} strokeWidth={2} opacity={0.5} />
        {/* Horizontal arm */}
        <Line x1="20" y1="18" x2="54" y2="18" stroke={color} strokeWidth={1.5} opacity={0.4} />
        {/* Net triangular frame */}
        <Path d="M20 50 L54 18" stroke={color} strokeWidth={1.2} opacity={0.35} />
        {/* Net mesh lines */}
        <Path d="M20 38 L42 18" stroke={color} strokeWidth={0.6} opacity={0.2} />
        <Path d="M20 44 L48 18" stroke={color} strokeWidth={0.6} opacity={0.2} />
        <Path d="M25 50 L54 22" stroke={color} strokeWidth={0.6} opacity={0.2} />
        <Path d="M32 50 L54 28" stroke={color} strokeWidth={0.6} opacity={0.2} />
        {/* Counter weight rope */}
        <Path d="M20 18 L8 28" stroke={color} strokeWidth={1.2} opacity={0.4} />
        <Path d="M20 18 L6 24" stroke={color} strokeWidth={1} opacity={0.35} />
        {/* Weights */}
        <Rect x="4" y="24" width="4" height="2" rx="0.5" fill={color} opacity={0.4} />
        <Rect x="6" y="28" width="4" height="2" rx="0.5" fill={color} opacity={0.4} />
    </Svg>
));

FishingNetsIcon.displayName = 'FishingNetsIcon';
export default FishingNetsIcon;
