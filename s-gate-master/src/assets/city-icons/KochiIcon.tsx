import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const KochiIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M18 22V12l-6-4-6 4v10" /><Path d="M12 8l-6 4M12 8l6 4M12 8V2" /><Path d="M4 12l8-4 8 4M2 22h20" />
    </Svg>
  );
});

KochiIcon.displayName = 'KochiIcon';
