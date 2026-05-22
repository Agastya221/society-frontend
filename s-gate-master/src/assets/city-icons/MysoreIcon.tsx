import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const MysoreIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 22V10l3-3v15M17 22V10l3-3v15M7 12h10M12 12V6l2-2 2 2v6" /><Path d="M10 16h4M10 20h4M2 22h20" />
    </Svg>
  );
});

MysoreIcon.displayName = 'MysoreIcon';
