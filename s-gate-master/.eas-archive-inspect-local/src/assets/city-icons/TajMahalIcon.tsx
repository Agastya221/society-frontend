import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Taj Mahal — Agra */
const TajMahalIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base platform */}
        <Rect x="6" y="54" width="52" height="4" rx="1" fill={color} opacity={0.3} />
        <Rect x="10" y="50" width="44" height="4" rx="1" fill={color} opacity={0.35} />
        {/* Main body */}
        <Rect x="16" y="32" width="32" height="18" rx="1" fill={color} opacity={0.4} />
        {/* Main dome */}
        <Path
            d="M22 32 Q32 8 42 32"
            stroke={color}
            strokeWidth={2}
            fill={color}
            opacity={0.45}
        />
        {/* Dome finial */}
        <Path d="M32 12 L32 8" stroke={color} strokeWidth={1.5} />
        <Circle cx="32" cy="7" r="1.5" fill={color} opacity={0.6} />
        {/* Arch entrance */}
        <Path
            d="M28 50 Q32 38 36 50"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
        />
        {/* Left minaret */}
        <Rect x="8" y="28" width="4" height="22" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M8 28 Q10 22 12 28" fill={color} opacity={0.4} />
        <Circle cx="10" cy="22" r="1" fill={color} opacity={0.5} />
        {/* Right minaret */}
        <Rect x="52" y="28" width="4" height="22" rx="0.5" fill={color} opacity={0.35} />
        <Path d="M52 28 Q54 22 56 28" fill={color} opacity={0.4} />
        <Circle cx="54" cy="22" r="1" fill={color} opacity={0.5} />
    </Svg>
));

TajMahalIcon.displayName = 'TajMahalIcon';
export default TajMahalIcon;
