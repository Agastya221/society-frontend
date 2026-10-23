import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface PressyProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Layout style for the touch area (flex, margins). */
  wrapStyle?: StyleProp<ViewStyle>;
  /** Visual style of the thing that shrinks when pressed. */
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}

/**
 * A touchable that gently shrinks under the thumb. Styles are plain objects:
 * NativeWind drops Pressable style *functions* on this app.
 */
export function Pressy({ wrapStyle, style, scaleTo = 0.97, children, onPressIn, onPressOut, ...rest }: PressyProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={wrapStyle}
      onPressIn={(e) => { scale.value = withTiming(scaleTo, { duration: 90 }); onPressIn?.(e); }}
      onPressOut={(e) => { scale.value = withSpring(1, { damping: 14, stiffness: 260 }); onPressOut?.(e); }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
