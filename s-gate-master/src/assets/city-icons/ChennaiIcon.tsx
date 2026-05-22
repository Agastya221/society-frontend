import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const ChennaiIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <Path d="M4 20h16" /><Path d="M8 20v-8l4-6 4 6v8" /><Path d="M12 6V2" /><Path d="M10 4h4" /><Path d="M5 20v-6h3" /><Path d="M16 14h3v6" /><Path d="M11 20v-4a1 1 0 0 1 2 0v4" />
    </Svg>
  );
});

ChennaiIcon.displayName = 'ChennaiIcon';
