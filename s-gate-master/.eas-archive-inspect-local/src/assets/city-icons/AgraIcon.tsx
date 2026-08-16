import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const AgraIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M12 2C9 2 8 6 8 8c0 2-2 3-2 3v5c0 1.5 1.5 2.5 3 2.5V22h10v-3.5c1.5 0 3-1 3-2.5v-5s-2-1-2-3c0-2-1-6-4-6z" /><Path d="M4 22V10M20 22V10M12 8v2M2 22h20" />
    </Svg>
  );
});

AgraIcon.displayName = 'AgraIcon';
