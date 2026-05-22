import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const DefaultCityIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 22V12h4v10M10 22V6h4v16M16 22v-8h4v8" /><Path d="M2 22h20" />
    </Svg>
  );
});

DefaultCityIcon.displayName = 'DefaultCityIcon';
