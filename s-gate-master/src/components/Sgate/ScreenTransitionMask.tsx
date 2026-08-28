import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SgateColors } from '@/constants/Sgate-theme';

const REVEAL_DURATION_MS = 100;

/**
 * An opaque mask mounted for each route. It reveals only the new scene, so an
 * inactive tab can never bleed through while React mounts the destination.
 */
export function ScreenTransitionMask() {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withTiming(0, {
      duration: REVEAL_DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mask, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  mask: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: SgateColors.bg,
  },
});
