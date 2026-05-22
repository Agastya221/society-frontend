import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const HyderabadIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 20h16" /><Path d="M6 20V4h2v16" /><Path d="M16 20V4h2v16" /><Path d="M8 20v-6a4 4 0 0 1 8 0v6" /><Path d="M8 10h8" /><Path d="M5 4h4" /><Path d="M15 4h4" />
    </Svg>
  );
});

HyderabadIcon.displayName = 'HyderabadIcon';
