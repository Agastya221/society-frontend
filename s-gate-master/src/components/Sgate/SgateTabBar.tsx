import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface TabItem {
  name: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

interface SgateTabBarProps extends BottomTabBarProps {
  tabs?: TabItem[];
}

export function SgateTabBar({ state, descriptors, navigation, tabs }: SgateTabBarProps) {
  const insets = useSafeAreaInsets();

  // Track indicator position for sliding gold pill
  const indicatorX = useSharedValue(0);
  const TAB_WIDTH = 70; // approximate, recalculated on layout

  useEffect(() => {
    indicatorX.value = withSpring(state.index * TAB_WIDTH, {
      damping: 20,
      stiffness: 200,
    });
  }, [state.index]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Try to get icon from options tabBarIcon or fall back to tabs prop
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
              ? options.title
              : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Individual Tab Item ──────────────────────────────────────────────────────

interface TabItemProps {
  label: string;
  isFocused: boolean;
  options: ReturnType<BottomTabBarProps['descriptors'][string]['options']['tabBarIcon'] extends undefined ? any : any>;
  onPress: () => void;
}

function TabItem({ label, isFocused, options, onPress }: {
  label: string;
  isFocused: boolean;
  options: any;
  onPress: () => void;
}) {
  const iconColor = isFocused ? SgateColors.gold : SgateColors.t3;
  const pillOpacity = useSharedValue(isFocused ? 1 : 0);
  const pillScaleX = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    pillOpacity.value = withSpring(isFocused ? 1 : 0, { damping: 18, stiffness: 220 });
    pillScaleX.value = withSpring(isFocused ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scaleX: pillScaleX.value }],
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={styles.tabItem}>
        {/* Gold indicator pill */}
        <Animated.View style={[styles.indicator, pillStyle]} />

        {/* Icon */}
        <View style={styles.iconWrapper}>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: iconColor,
            size: 22,
          }) ?? (
            <Feather name="circle" size={22} color={iconColor} />
          )}
        </View>

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? SgateColors.gold : SgateColors.t3,
              fontFamily: isFocused ? SgateFonts.bold : SgateFonts.regular,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    minWidth: 50,
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 99,
    backgroundColor: SgateColors.gold,
    marginBottom: 6,
  },
  iconWrapper: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 9.5,
  },
});
