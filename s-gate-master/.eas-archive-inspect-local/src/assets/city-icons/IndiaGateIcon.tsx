import React, { memo } from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** India Gate — Delhi NCR */
const IndiaGateIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base platform */}
        <Rect x="8" y="56" width="48" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Left pillar */}
        <Rect x="14" y="24" width="6" height="32" rx="1" fill={color} opacity={0.5} />
        {/* Right pillar */}
        <Rect x="44" y="24" width="6" height="32" rx="1" fill={color} opacity={0.5} />
        {/* Arch */}
        <Path
            d="M14 36 C14 26, 20 20, 32 20 C44 20, 50 26, 50 36"
            stroke={color}
            strokeWidth={2.5}
            fill="none"
        />
        {/* Top beam */}
        <Rect x="12" y="20" width="40" height="5" rx="1" fill={color} opacity={0.6} />
        {/* Parapet / crown */}
        <Rect x="16" y="14" width="32" height="6" rx="1" fill={color} opacity={0.4} />
        {/* Dome on top */}
        <Path
            d="M28 14 Q32 6 36 14"
            stroke={color}
            strokeWidth={2}
            fill={color}
            opacity={0.5}
        />
    </Svg>
));

IndiaGateIcon.displayName = 'IndiaGateIcon';
export default IndiaGateIcon;
