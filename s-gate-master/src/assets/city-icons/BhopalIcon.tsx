import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const BhopalIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 22V10M20 22V10M8 22v-4a4 4 0 0 1 8 0v4" /><Path d="M12 18a4 4 0 0 0-8 0M20 18a4 4 0 0 0-8 0" /><Path d="M4 10c0-2 1-3 1-3s1 1 1 3M20 10c0-2-1-3-1-3s-1 1-1 3M12 8c0-2 1-4 1-4s1 2 1 4" /><Path d="M2 22h20" />
    </Svg>
  );
});

BhopalIcon.displayName = 'BhopalIcon';
