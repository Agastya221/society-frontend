import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const BangaloreIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M4 20h16" /><Path d="M10 20V10h4v10" /><Path d="M9 10c0-2 1.5-3 3-3s3 1 3 3" /><Path d="M12 7V4" /><Path d="M12 4h2" /><Path d="M6 20v-6h4" /><Path d="M14 14h4v6" />
    </Svg>
  );
});

BangaloreIcon.displayName = 'BangaloreIcon';
