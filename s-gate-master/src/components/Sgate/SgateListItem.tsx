import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface SgateListItemProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
  hideDivider?: boolean;
}

export function SgateListItem({
  icon,
  label,
  sublabel,
  onPress,
  showChevron = true,
  rightContent,
  style,
  hideDivider = false,
}: SgateListItemProps) {
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    opacity.value = withTiming(0.6, { duration: 80 });
  };

  const handlePressOut = () => {
    opacity.value = withTiming(1, { duration: 150 });
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.row,
          !hideDivider && styles.divider,
          animStyle,
          style,
        ]}
      >
        {/* Icon bubble */}
        {icon && (
          <View style={styles.iconCircle}>
            <Feather name={icon} size={16} color={SgateColors.t2} />
          </View>
        )}

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {sublabel && (
            <Text style={styles.sublabel} numberOfLines={1}>
              {sublabel}
            </Text>
          )}
        </View>

        {/* Right content or chevron */}
        <View style={styles.right}>
          {rightContent ?? null}
          {showChevron && (
            <Feather
              name="chevron-right"
              size={16}
              color={SgateColors.t4}
              style={rightContent ? styles.chevronSpaced : undefined}
            />
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SgateColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },
  sublabel: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  chevronSpaced: {
    marginLeft: 6,
  },
});
