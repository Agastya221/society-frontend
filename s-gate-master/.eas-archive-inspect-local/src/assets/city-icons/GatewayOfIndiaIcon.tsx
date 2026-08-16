import React, { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Gateway of India — Mumbai */
const GatewayOfIndiaIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Base steps */}
        <Rect x="8" y="56" width="48" height="3" rx="1" fill={color} opacity={0.25} />
        <Rect x="12" y="52" width="40" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Left wing */}
        <Rect x="12" y="30" width="8" height="22" rx="1" fill={color} opacity={0.4} />
        <Rect x="14" y="26" width="4" height="4" rx="0.5" fill={color} opacity={0.35} />
        {/* Right wing */}
        <Rect x="44" y="30" width="8" height="22" rx="1" fill={color} opacity={0.4} />
        <Rect x="46" y="26" width="4" height="4" rx="0.5" fill={color} opacity={0.35} />
        {/* Central tower body */}
        <Rect x="22" y="20" width="20" height="32" rx="1" fill={color} opacity={0.45} />
        {/* Grand arch */}
        <Path
            d="M26 52 Q32 34 38 52"
            stroke={color}
            strokeWidth={1.8}
            fill="none"
        />
        {/* Smaller upper arches */}
        <Path d="M26 28 Q29 24 32 28" stroke={color} strokeWidth={1} fill="none" />
        <Path d="M32 28 Q35 24 38 28" stroke={color} strokeWidth={1} fill="none" />
        {/* Crown / parapet */}
        <Rect x="20" y="16" width="24" height="4" rx="1" fill={color} opacity={0.5} />
        {/* Central dome */}
        <Path d="M28 16 Q32 8 36 16" fill={color} opacity={0.45} />
        {/* Dome tip */}
        <Path d="M32 10 L32 7" stroke={color} strokeWidth={1.2} />
        {/* Side turrets */}
        <Path d="M22 16 L22 14 L24 14 L24 16" fill={color} opacity={0.4} />
        <Path d="M40 16 L40 14 L42 14 L42 16" fill={color} opacity={0.4} />
    </Svg>
));

GatewayOfIndiaIcon.displayName = 'GatewayOfIndiaIcon';
export default GatewayOfIndiaIcon;
