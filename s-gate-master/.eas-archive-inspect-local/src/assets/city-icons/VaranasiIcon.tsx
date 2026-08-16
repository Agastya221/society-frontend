import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface CityIconProps {
  size?: number;
  color?: string;
}

export const VaranasiIcon = memo(({ size = 46, color = '#A0A0A0' }: CityIconProps) => {
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
      <Path d="M2 22h20M4 22v-4h4v4M10 22v-6h4v6M16 22v-4h4v4M6 18v-4l2-2 2 2v4M14 18v-6l2-2 2 2v6" />
    </Svg>
  );
});

VaranasiIcon.displayName = 'VaranasiIcon';
