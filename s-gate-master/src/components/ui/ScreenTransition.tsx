import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useIsFocused, useRoute } from '@react-navigation/native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Screen change animation for the resident and admin navigators.
 *
 * The navigators swap screens instantly (animation 'none'); the screen that comes to the front
 * then slides in a short way and settles. The old cross-fade showed both screens half-see-through
 * at once, which looked like a grey ghost over every screen on Back. Going forward the screen
 * slides in from the right, going back it slides in from the left, so Back feels like Back.
 */
const SLIDE_DISTANCE = 32;
const DURATION = 240;

// Order in which screens came to the front. Returning to the one before the current screen is "back".
const trail: string[] = [];

function directionFor(key: string): 1 | -1 {
  if (trail.length >= 2 && trail[trail.length - 2] === key) {
    trail.pop();
    return -1;
  }
  if (trail[trail.length - 1] !== key) trail.push(key);
  // Keep the trail short; only the last couple of entries matter
  if (trail.length > 30) trail.splice(0, trail.length - 30);
  return 1;
}

export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  const routeKey = useRoute().key;
  const slide = useSharedValue(0);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!focused) return;
    const wasEmpty = trail.length === 0;
    const direction = directionFor(routeKey);
    if (wasEmpty) return; // the very first screen of the session appears without an animation
    slide.value = direction * SLIDE_DISTANCE;
    progress.value = 0;
    slide.value = withTiming(0, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
  }, [focused, routeKey, slide, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * progress.value,
    transform: [{ translateX: slide.value }],
  }));

  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
