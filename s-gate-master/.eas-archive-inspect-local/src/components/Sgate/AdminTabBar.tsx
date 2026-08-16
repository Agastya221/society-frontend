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

// ─── Only show these 4 tabs for Admin ─────────────────────────────────────────
const VISIBLE_TABS = new Set(['index', 'gate-passes', 'broadcast', 'profile']);

// ─── Explicit labels for each tab (route base name → display label) ─────────
const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  'gate-passes': 'Passes',
  broadcast: 'Alerts',
  profile: 'Profile',
};

// ─── Fallback icons ──────────────────────────────────────────────────────────
const TAB_ICONS: Record<string, string> = {
  index: 'home-outline',
  'gate-passes': 'clipboard-text-outline',
  broadcast: 'bullhorn-outline',
  profile: 'account-outline',
};

// Extract base route name
function getBaseName(routeName: string): string {
  return routeName.split('/')[0];
}

export function AdminTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Filter: only render routes whose base name is in VISIBLE_TABS
  const visibleRoutes = state.routes.filter(r => VISIBLE_TABS.has(getBaseName(r.name)));

  // Map the focused index
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
            <AdminTab
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

function AdminTab({ label, iconName, isFocused, options, onPress, onLongPress }: {
  label: string;
  iconName: string;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const iconColor = isFocused ? SgateColors.gold : SgateColors.t3;

  const pillOpacity = useSharedValue(isFocused ? 1 : 0);
  const pillScaleX  = useSharedValue(isFocused ? 1 : 0);
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
        <Animated.View style={[styles.indicator, pillStyle]} />
        <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
          {options.tabBarIcon?.({
            focused: isFocused,
            color: iconColor,
            size: 22,
          }) ?? (
            <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
          )}
        </Animated.View>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
    paddingTop: 6,
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
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
