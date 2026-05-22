import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const KolkataIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M2 20h20" /><Path d="M6 20V8l4-4h4l4 4v12" /><Path d="M10 20V8" /><Path d="M14 20V8" /><Path d="M6 14h12" /><Path d="M2 20l4-6" /><Path d="M22 20l-4-6" />
    </Svg>
  );
});

KolkataIcon.displayName = 'KolkataIcon';
