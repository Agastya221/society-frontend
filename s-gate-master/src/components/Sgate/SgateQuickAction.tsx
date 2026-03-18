import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface SgateQuickActionProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  bgColor: string;
  iconColor: string;
  onPress: () => void;
}

export function SgateQuickAction({
  icon,
  label,
  bgColor,
  iconColor,
  onPress,
}: SgateQuickActionProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableWithoutFeedback
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.card, animStyle]}>
        <View style={[styles.iconBubble, { backgroundColor: bgColor }]}>
          <Feather name={icon} size={22} color={iconColor} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: SgateColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 10,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11.5,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    textAlign: 'center',
    lineHeight: 15,
  },
});
