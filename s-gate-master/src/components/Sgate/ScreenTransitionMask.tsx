import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SgateColors } from '@/constants/Sgate-theme';

const REVEAL_DURATION_MS = 260;

/**
 * An opaque mask mounted for each route. It reveals only the new scene, so an
 * inactive tab can never bleed through while React mounts the destination.
 */
export function ScreenTransitionMask() {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(width + 8, {
      duration: REVEAL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateX, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mask, animatedStyle]}
    >
      <View style={styles.revealEdge} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mask: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: SgateColors.bg,
  },
  revealEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: SgateColors.gold,
    shadowColor: SgateColors.gold,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
});
