import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Charminar — Hyderabad */
const CharminarIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base */}
        <Rect x="12" y="54" width="40" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Main body */}
        <Rect x="18" y="30" width="28" height="24" rx="1" fill={color} opacity={0.35} />
        {/* Central arch */}
        <Path d="M27 54 Q32 40 37 54" stroke={color} strokeWidth={1.5} fill="none" />
        {/* Upper arches row */}
        <Path d="M22 38 Q25 34 28 38" stroke={color} strokeWidth={1} fill="none" />
        <Path d="M36 38 Q39 34 42 38" stroke={color} strokeWidth={1} fill="none" />
        {/* Four minarets */}
        {/* Left-front */}
        <Rect x="14" y="18" width="3.5" height="36" rx="0.5" fill={color} opacity={0.4} />
        <Path d="M14 18 Q15.75 12 17.5 18" fill={color} opacity={0.5} />
        <Circle cx="15.75" cy="11.5" r="1" fill={color} opacity={0.5} />
        {/* Right-front */}
        <Rect x="46.5" y="18" width="3.5" height="36" rx="0.5" fill={color} opacity={0.4} />
        <Path d="M46.5 18 Q48.25 12 50 18" fill={color} opacity={0.5} />
        <Circle cx="48.25" cy="11.5" r="1" fill={color} opacity={0.5} />
        {/* Left-back */}
        <Rect x="19" y="22" width="3" height="8" rx="0.5" fill={color} opacity={0.3} />
        <Path d="M19 22 Q20.5 17 22 22" fill={color} opacity={0.35} />
        {/* Right-back */}
        <Rect x="42" y="22" width="3" height="8" rx="0.5" fill={color} opacity={0.3} />
        <Path d="M42 22 Q43.5 17 45 22" fill={color} opacity={0.35} />
        {/* Central dome */}
        <Path d="M26 30 Q32 22 38 30" fill={color} opacity={0.4} />
    </Svg>
));

CharminarIcon.displayName = 'CharminarIcon';
export default CharminarIcon;
