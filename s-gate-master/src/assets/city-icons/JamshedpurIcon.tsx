import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const JamshedpurIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M2 20h20" /><Path d="M14 20V6h3v14" /><Path d="M10 20V9h3v11" /><Path d="M6 20v-7h3v7" /><Path d="M3 20v-4l3-3" />
    </Svg>
  );
});

JamshedpurIcon.displayName = 'JamshedpurIcon';
