import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const LucknowIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 22v-8c0-4 4-6 8-6s8 2 8 6v8" /><Path d="M8 22v-6a4 4 0 0 1 8 0v6" /><Path d="M12 8V4M10 6h4M2 22h20" />
    </Svg>
  );
});

LucknowIcon.displayName = 'LucknowIcon';
