import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const PuneIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M3 20h18" /><Path d="M4 20V8l2-2h12l2 2v12" /><Path d="M9 20v-5a3 3 0 0 1 6 0v5" /><Path d="M4 12h16" /><Path d="M8 8v4" /><Path d="M16 8v4" />
    </Svg>
  );
});

PuneIcon.displayName = 'PuneIcon';
