import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Taj-ul-Masajid — Bhopal */
const TajUlMasajidIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="8" y="54" width="48" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Main mosque body */}
        <Rect x="16" y="30" width="32" height="24" rx="1" fill={color} opacity={0.35} />
        {/* Central arch */}
        <Path d="M27 54 Q32 40 37 54" stroke={color} strokeWidth={1.5} fill="none" />
        {/* Side arches */}
        <Path d="M18 48 Q21 44 24 48" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        <Path d="M40 48 Q43 44 46 48" stroke={color} strokeWidth={0.8} fill="none" opacity={0.35} />
        {/* Central large dome */}
        <Path d="M24 30 Q32 16 40 30" fill={color} opacity={0.45} />
        <Circle cx="32" cy="16" r="1.5" fill={color} opacity={0.5} />
        <Path d="M32 14.5 L32 11" stroke={color} strokeWidth={1} />
        <Circle cx="32" cy="10" r="0.8" fill={color} opacity={0.4} />
        {/* Side smaller domes */}
        <Path d="M16 30 Q20 24 24 30" fill={color} opacity={0.3} />
        <Path d="M40 30 Q44 24 48 30" fill={color} opacity={0.3} />
        {/* Left minaret */}
        <Rect x="8" y="16" width="4" height="38" rx="0.5" fill={color} opacity={0.4} />
        <Path d="M8 16 Q10 10 12 16" fill={color} opacity={0.45} />
        <Circle cx="10" cy="9.5" r="1" fill={color} opacity={0.4} />
        <Path d="M10 8.5 L10 6" stroke={color} strokeWidth={0.8} />
        {/* Right minaret */}
        <Rect x="52" y="16" width="4" height="38" rx="0.5" fill={color} opacity={0.4} />
        <Path d="M52 16 Q54 10 56 16" fill={color} opacity={0.45} />
        <Circle cx="54" cy="9.5" r="1" fill={color} opacity={0.4} />
        <Path d="M54 8.5 L54 6" stroke={color} strokeWidth={0.8} />
    </Svg>
));

TajUlMasajidIcon.displayName = 'TajUlMasajidIcon';
export default TajUlMasajidIcon;
