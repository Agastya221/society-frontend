import React, { memo } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import type { CityIconProps } from './types';

/** Golden Temple — Amritsar */
const GoldenTempleIcon: React.FC<CityIconProps> = memo(({ size = 48, color = '#C0C0C0' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Water reflection */}
        <Path d="M4 56 Q10 54 16 56 Q22 58 28 56 Q34 54 40 56 Q46 58 52 56 Q58 54 60 56" stroke={color} strokeWidth={0.8} fill="none" opacity={0.2} />
        {/* Platform on water */}
        <Rect x="12" y="50" width="40" height="4" rx="1" fill={color} opacity={0.3} />
        {/* Main building body */}
        <Rect x="18" y="30" width="28" height="20" rx="1" fill={color} opacity={0.4} />
        {/* Entrance */}
        <Path d="M28 50 Q32 42 36 50" stroke={color} strokeWidth={1.2} fill="none" />
        {/* Side windows */}
        <Path d="M20 38 Q22 35 24 38" stroke={color} strokeWidth={0.8} fill="none" opacity={0.4} />
        <Path d="M40 38 Q42 35 44 38" stroke={color} strokeWidth={0.8} fill="none" opacity={0.4} />
        {/* Main dome */}
        <Path d="M24 30 Q32 14 40 30" fill={color} opacity={0.45} />
        {/* Dome fluting */}
        <Path d="M28 30 Q32 18 36 30" stroke={color} strokeWidth={0.5} fill="none" opacity={0.25} />
        {/* Finial / kalash */}
        <Rect x="30.5" y="14" width="3" height="3" rx="0.5" fill={color} opacity={0.4} />
        <Circle cx="32" cy="11" r="2" fill={color} opacity={0.5} />
        <Path d="M32 9 L32 6" stroke={color} strokeWidth={1} />
        <Circle cx="32" cy="5.5" r="1" fill={color} opacity={0.45} />
        {/* Small corner domes */}
        <Path d="M16 30 Q18 26 20 30" fill={color} opacity={0.3} />
        <Circle cx="18" cy="25.5" r="0.8" fill={color} opacity={0.3} />
        <Path d="M44 30 Q46 26 48 30" fill={color} opacity={0.3} />
        <Circle cx="46" cy="25.5" r="0.8" fill={color} opacity={0.3} />
    </Svg>
));

GoldenTempleIcon.displayName = 'GoldenTempleIcon';
export default GoldenTempleIcon;
