import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

// ─── Only show these 5 tabs ─────────────────────────────────────────────────
const VISIBLE_TABS = new Set(['home', 'visitors', 'deliveries', 'society', 'profile']);

// ─── SgateTabBar ─────────────────────────────────────────────────────────────
export function SgateTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Filter: only render routes that are in VISIBLE_TABS
  const visibleRoutes = state.routes.filter(r => VISIBLE_TABS.has(r.name));

  // Map the focused index: find the position of the currently-focused route
  // in the filtered list (-1 if it's a hidden screen)
  const focusedRouteName = state.routes[state.index]?.name;
  const focusedVisibleIndex = visibleRoutes.findIndex(r => r.name === focusedRouteName);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabRow}>
        {visibleRoutes.map((route, idx) => {
          const { options } = descriptors[route.key];
          const isFocused = focusedVisibleIndex === idx;

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name.charAt(0).toUpperCase() + route.name.slice(1);

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

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <SgateTab
              key={route.key}
              label={label}
              isFocused={isFocused}
              options={options}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Individual Tab ──────────────────────────────────────────────────────────

function SgateTab({ label, isFocused, options, onPress, onLongPress }: {
  label: string;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const iconColor = isFocused ? SgateColors.gold : SgateColors.t3;

  // Animated gold pill indicator
  const pillOpacity = useSharedValue(isFocused ? 1 : 0);
  const pillScaleX  = useSharedValue(isFocused ? 1 : 0);

  // Icon scale pop on focus
  const iconScale = useSharedValue(1);

  useEffect(() => {
    pillOpacity.value = withSpring(isFocused ? 1 : 0, { damping: 18, stiffness: 220 });
    pillScaleX.value  = withSpring(isFocused ? 1 : 0, { damping: 18, stiffness: 220 });

    if (isFocused) {
      iconScale.value = withSpring(1.1, { damping: 12, stiffness: 300 });
    } else {
      iconScale.value = withSpring(1, { damping: 18, stiffness: 220 });
    }
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scaleX: pillScaleX.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.tabItem}>
        {/* Gold indicator pill at top */}
        <Animated.View style={[styles.indicator, pillStyle]} />

        {/* Icon */}
        <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: iconColor,
            size: 22,
          }) ?? (
            <Feather name="circle" size={22} color={iconColor} />
          )}
        </Animated.View>

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? SgateColors.gold : SgateColors.t4,
              fontFamily: isFocused ? SgateFonts.bold : SgateFonts.medium,
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
    paddingTop: 6,
    // Subtle shadow on iOS, elevation on Android
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 2,
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: SgateColors.gold,
    marginBottom: 6,
  },
  iconWrapper: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
