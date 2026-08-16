import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const AmritsarIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 22v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><Path d="M6 16v-4c0-2 2-4 6-4s6 2 6 4v4" /><Path d="M12 8V5M2 22h20M9 22v-4M15 22v-4" />
    </Svg>
  );
});

AmritsarIcon.displayName = 'AmritsarIcon';
