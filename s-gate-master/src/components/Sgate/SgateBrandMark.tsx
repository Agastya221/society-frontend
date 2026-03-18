import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SgateColors } from '@/constants/Sgate-theme';

interface SgateBrandMarkProps {
  size?: number;
}

/**
 * The Sgate mascot mark — a gold circle with a shield icon inside.
 * Used in headers and splash-style sections.
 */
export function SgateBrandMark({ size = 42 }: SgateBrandMarkProps) {
  const iconSize = Math.round(size * 0.46);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Feather name="shield" size={iconSize} color={SgateColors.black} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: SgateColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
