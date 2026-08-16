import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const JaipurIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 22V6l4-2 4 2 4-2 4 2v16" /><Path d="M6 10h2M10 10h4M16 10h2M6 14h2M10 14h4M16 14h2M6 18h2M10 18h4M16 18h2" /><Path d="M2 22h20" />
    </Svg>
  );
});

JaipurIcon.displayName = 'JaipurIcon';
