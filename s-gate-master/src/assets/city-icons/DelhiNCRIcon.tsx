import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const DelhiNCRIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 20h16" /><Path d="M7 20V8h10v12" /><Path d="M9 20v-8a3 3 0 0 1 6 0v8" /><Path d="M8 8V6h8v2" /><Path d="M10 6V4h4v2" />
    </Svg>
  );
});

DelhiNCRIcon.displayName = 'DelhiNCRIcon';
