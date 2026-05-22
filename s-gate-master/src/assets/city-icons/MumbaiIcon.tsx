import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const MumbaiIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 20h16" /><Path d="M6 20V6h12v14" /><Path d="M9 20v-6a3 3 0 0 1 6 0v6" /><Path d="M6 10h12" /><Path d="M6 6c0-1 .5-2 2-2s2 1 2 2" /><Path d="M14 6c0-1 .5-2 2-2s2 1 2 2" />
    </Svg>
  );
});

MumbaiIcon.displayName = 'MumbaiIcon';
