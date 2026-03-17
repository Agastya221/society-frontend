import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateShadows } from '@/constants/Sgate-theme';

interface SgateCardProps {
  children: React.ReactNode;
  elevated?: boolean;
  style?: ViewStyle;
}

export function SgateCard({ children, elevated = false, style }: SgateCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      style={[
        styles.card,
        elevated && SgateShadows.card,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
});
