import React, { memo } from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Open Hand Monument — Chandigarh */
const OpenHandIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base pedestal */}
        <Rect x="22" y="54" width="20" height="4" rx="1" fill={color} opacity={0.3} />
        <Rect x="26" y="48" width="12" height="6" rx="0.5" fill={color} opacity={0.35} />
        {/* Pole */}
        <Rect x="30" y="30" width="4" height="18" rx="0.5" fill={color} opacity={0.4} />
        {/* Open palm (facing right, fingers up) */}
        <Path
            d="M32 30 L32 12 Q32 10 34 10 L34 8 Q34 6 36 6 L36 10
               Q36 6 38 6 L38 10
               Q38 6 40 6 L40 14
               Q42 12 44 14 L44 20 Q44 26 38 28 L32 30"
            fill={color}
            opacity={0.4}
        />
        {/* Thumb */}
        <Path d="M32 22 Q28 18 26 20 Q24 22 28 26 L32 28" fill={color} opacity={0.35} />
        {/* Palm lines */}
        <Path d="M34 18 L38 18" stroke={color} strokeWidth={0.5} opacity={0.25} />
        <Path d="M34 22 L40 22" stroke={color} strokeWidth={0.5} opacity={0.25} />
        {/* Pivot mechanism at base */}
        <Line x1="28" y1="30" x2="36" y2="30" stroke={color} strokeWidth={1.5} opacity={0.45} />
    </Svg>
));

OpenHandIcon.displayName = 'OpenHandIcon';
export default OpenHandIcon;
