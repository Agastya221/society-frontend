import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
const VISIBLE_TABS = new Set(['home', 'deliveries', 'notices', 'society', 'profile']);

// ─── Explicit labels for each tab (route base name → display label) ─────────
const TAB_LABELS: Record<string, string> = {
  home: 'Home',
  deliveries: 'Delivery',
  notices: 'Notice',
  society: 'Society',
  profile: 'Profile',
};

// ─── Fallback icons (used when descriptor tabBarIcon is missing for dir routes)
const TAB_ICONS: Record<string, string> = {
  home: 'home-outline',
  deliveries: 'package-variant',
  notices: 'file-document-outline',
  society: 'account-group-outline',
  profile: 'account-outline',
};

// Extract base route name: 'notices/index' → 'notices', 'home' → 'home'
function getBaseName(routeName: string): string {
  return routeName.split('/')[0];
}

// ─── SgateTabBar ─────────────────────────────────────────────────────────────
export function SgateTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Filter: only render exactly one route per VISIBLE_TAB to prevent duplicates
  // (Expo Router auto-generates profile/index alongside explicit profile route)
  const visibleRoutes = [];
  const seenBaseNames = new Set();
  
  for (const route of state.routes) {
    const baseName = getBaseName(route.name);
    if (VISIBLE_TABS.has(baseName) && !seenBaseNames.has(baseName)) {
      visibleRoutes.push(route);
      seenBaseNames.add(baseName);
    }
  }

  // Map the focused index based on our deduplicated visibleRoutes
  const focusedRouteName = state.routes[state.index]?.name;
  const focusedBaseName = getBaseName(focusedRouteName ?? '');
  const focusedVisibleIndex = visibleRoutes.findIndex(
    r => getBaseName(r.name) === focusedBaseName
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabRow}>
        {visibleRoutes.map((route, idx) => {
          const { options } = descriptors[route.key];
          const isFocused = focusedVisibleIndex === idx;
          const baseName = getBaseName(route.name);

          // Use explicit label map — never fall back to raw route name
          const label = TAB_LABELS[baseName] ?? baseName.charAt(0).toUpperCase() + baseName.slice(1);

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
              iconName={TAB_ICONS[baseName] ?? 'circle'}
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

function SgateTab({ label, iconName, isFocused, options, onPress, onLongPress }: {
  label: string;
  iconName: string;
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
            <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 14,
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
    paddingTop: 0,
    paddingBottom: 4,
  },
  indicator: {
    width: 24,
    height: 4,
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
    letterSpacing: 0,
  },
});
