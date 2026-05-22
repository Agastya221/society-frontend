import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const AhmedabadIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M6 20V10c0-3.3 2.7-6 6-6s6 2.7 6 6v10Z" /><Path d="M6 14h12" /><Path d="M12 10v10" />
    </Svg>
  );
});

AhmedabadIcon.displayName = 'AhmedabadIcon';
