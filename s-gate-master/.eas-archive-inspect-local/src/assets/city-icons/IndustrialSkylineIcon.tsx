import React, { memo } from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Tata Steel / Industrial Skyline — Jamshedpur */
const IndustrialSkylineIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="6" y="56" width="52" height="3" rx="1" fill={color} opacity={0.25} />
        {/* Factory building */}
        <Rect x="8" y="34" width="20" height="22" rx="1" fill={color} opacity={0.35} />
        {/* Factory windows */}
        <Rect x="12" y="38" width="4" height="4" rx="0.5" fill={color} opacity={0.2} />
        <Rect x="20" y="38" width="4" height="4" rx="0.5" fill={color} opacity={0.2} />
        <Rect x="12" y="46" width="4" height="4" rx="0.5" fill={color} opacity={0.2} />
        <Rect x="20" y="46" width="4" height="4" rx="0.5" fill={color} opacity={0.2} />
        {/* Tall chimney 1 */}
        <Rect x="14" y="12" width="4" height="22" rx="0.5" fill={color} opacity={0.5} />
        <Path d="M14 12 L16 8 L18 12" fill={color} opacity={0.4} />
        {/* Smoke wisps */}
        <Path d="M16 8 Q18 4 20 6 Q22 3 24 5" stroke={color} strokeWidth={1} fill="none" opacity={0.25} />
        {/* Office tower */}
        <Rect x="32" y="22" width="14" height="34" rx="1" fill={color} opacity={0.4} />
        {/* Tower windows grid */}
        <Rect x="35" y="26" width="3" height="3" rx="0.3" fill={color} opacity={0.2} />
        <Rect x="40" y="26" width="3" height="3" rx="0.3" fill={color} opacity={0.2} />
        <Rect x="35" y="32" width="3" height="3" rx="0.3" fill={color} opacity={0.2} />
        <Rect x="40" y="32" width="3" height="3" rx="0.3" fill={color} opacity={0.2} />
        <Rect x="35" y="38" width="3" height="3" rx="0.3" fill={color} opacity={0.2} />
        <Rect x="40" y="38" width="3" height="3" rx="0.3" fill={color} opacity={0.2} />
        {/* Antenna on tower */}
        <Line x1="39" y1="22" x2="39" y2="16" stroke={color} strokeWidth={1} opacity={0.4} />
        <Line x1="37" y1="18" x2="41" y2="18" stroke={color} strokeWidth={0.8} opacity={0.3} />
        {/* Smaller structure */}
        <Rect x="50" y="40" width="8" height="16" rx="0.5" fill={color} opacity={0.3} />
        <Path d="M50 40 L54 34 L58 40" fill={color} opacity={0.3} />
    </Svg>
));

IndustrialSkylineIcon.displayName = 'IndustrialSkylineIcon';
export default IndustrialSkylineIcon;
