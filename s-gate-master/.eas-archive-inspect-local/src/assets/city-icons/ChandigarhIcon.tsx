import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const ChandigarhIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M12 22V12" /><Path d="M8 12c0-2 1-4 4-4s4 2 4 4" /><Path d="M10 8V4M12 8V2M14 8V5M8 12v-2" /><Path d="M6 22h12" />
    </Svg>
  );
});

ChandigarhIcon.displayName = 'ChandigarhIcon';
