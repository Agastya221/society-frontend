import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

type Variant = 'primary' | 'secondary' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface SgateButtonProps {
  variant?: Variant;
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  size?: Size;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; borderColor?: string }> = {
  primary:   { bg: SgateColors.black,   text: '#FFFFFF' },
  secondary: { bg: SgateColors.surface, text: SgateColors.t1 },
  gold:      { bg: SgateColors.gold,    text: SgateColors.black },
  danger:    { bg: SgateColors.red,     text: '#FFFFFF' },
};

const SIZE_STYLES: Record<Size, { paddingVertical: number; fontSize: number; radius: number; iconSize: number }> = {
  sm: { paddingVertical: 10, fontSize: 13, radius: 14, iconSize: 14 },
  md: { paddingVertical: 17, fontSize: 15, radius: 16, iconSize: 16 },
  lg: { paddingVertical: 20, fontSize: 16, radius: 18, iconSize: 18 },
};

export function SgateButton({
  variant = 'primary',
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  size = 'md',
  style,
}: SgateButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableWithoutFeedback
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View
        style={[
          styles.base,
          {
            backgroundColor: v.bg,
            paddingVertical: s.paddingVertical,
            borderRadius: s.radius,
            opacity: isDisabled ? 0.55 : 1,
          },
          animStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' ? SgateColors.t1 : '#FFFFFF'}
          />
        ) : (
          <View style={styles.inner}>
            {icon && (
              <Feather
                name={icon}
                size={s.iconSize}
                color={v.text}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.label,
                {
                  color: v.text,
                  fontSize: s.fontSize,
                  fontFamily: SgateFonts.bold,
                },
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 7,
  },
  label: {
    letterSpacing: 0.1,
  },
});
