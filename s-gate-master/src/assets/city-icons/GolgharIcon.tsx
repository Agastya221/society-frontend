import React, { memo } from 'react';
import Svg, { Path, Rect, Ellipse } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Golghar — Patna */
const GolgharIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base / ground */}
        <Rect x="8" y="54" width="48" height="4" rx="1" fill={color} opacity={0.25} />
        {/* Main dome — large hemisphere */}
        <Path
            d="M10 54 Q10 18 32 14 Q54 18 54 54"
            fill={color}
            opacity={0.35}
        />
        {/* Dome outline */}
        <Path
            d="M10 54 Q10 18 32 14 Q54 18 54 54"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            opacity={0.5}
        />
        {/* Spiral staircase lines (left and right) */}
        <Path d="M14 50 Q18 42 22 46" stroke={color} strokeWidth={0.8} fill="none" opacity={0.25} />
        <Path d="M18 44 Q22 36 26 40" stroke={color} strokeWidth={0.8} fill="none" opacity={0.25} />
        <Path d="M50 50 Q46 42 42 46" stroke={color} strokeWidth={0.8} fill="none" opacity={0.25} />
        <Path d="M46 44 Q42 36 38 40" stroke={color} strokeWidth={0.8} fill="none" opacity={0.25} />
        {/* Opening at top */}
        <Ellipse cx="32" cy="15" rx="4" ry="1.5" fill={color} opacity={0.4} />
        {/* Entrance */}
        <Path d="M28 54 Q32 46 36 54" stroke={color} strokeWidth={1} fill="none" opacity={0.4} />
    </Svg>
));

GolgharIcon.displayName = 'GolgharIcon';
export default GolgharIcon;
