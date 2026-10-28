import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { GuardColors, GuardFonts, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import { Pressy } from '@/components/gate/Pressy';
import { useEmergencyStore } from '@/store/useEmergencyStore';

export type NavTab = 'home' | 'emergency' | 'scan' | 'logs' | 'profile';

export interface BottomNavBarProps {
  activeTab?: NavTab;
  onScan: () => void;
  onEmergency: () => void;
  onLogs: () => void;
  onProfile: () => void;
  onHome?: () => void;
}

export interface AppBottomNavProps {
  activeTab?: NavTab;
  onHome?: () => void;
  onScan?: () => void;
  onEmergency?: () => void;
  onLogs?: () => void;
  onProfile?: () => void;
}

/**
 * Connected Bottom Navigation component that automatically handles routing,
 * active tab detection, and haptic feedback across all screens in the app.
 */
export function AppBottomNav({
  activeTab,
  onHome,
  onScan,
  onEmergency,
  onLogs,
  onProfile,
}: AppBottomNavProps = {}) {
  const router = useRouter();
  const pathname = usePathname?.() ?? '';

  const resolvedTab: NavTab | undefined = activeTab ?? (() => {
    if (!pathname || pathname === '/' || pathname === '/index') return 'home';
    if (pathname.includes('today-entries') || pathname.includes('approvals')) return 'logs';
    if (pathname.includes('profile') || pathname.includes('my-attendance')) return 'profile';
    if (pathname.includes('emergencies')) return 'emergency';
    if (pathname.includes('scan-verify')) return 'scan';
    return undefined;
  })();

  const handleHome = () => {
    if (onHome) {
      onHome();
      return;
    }
    if (pathname === '/' || pathname === '/index' || !pathname) return;
    router.replace('/');
  };

  const handleEmergency = () => {
    if (onEmergency) {
      onEmergency();
      return;
    }
    if (pathname === '/emergencies') return;
    router.push('/emergencies');
  };

  const handleScan = () => {
    if (onScan) {
      onScan();
      return;
    }
    if (pathname === '/scan-verify') return;
    router.push('/scan-verify');
  };

  const handleLogs = () => {
    if (onLogs) {
      onLogs();
      return;
    }
    if (pathname === '/today-entries') return;
    router.push('/today-entries');
  };

  const handleProfile = () => {
    if (onProfile) {
      onProfile();
      return;
    }
    if (pathname === '/profile') return;
    router.push('/profile');
  };

  return (
    <BottomNavBar
      activeTab={resolvedTab}
      onHome={handleHome}
      onEmergency={handleEmergency}
      onScan={handleScan}
      onLogs={handleLogs}
      onProfile={handleProfile}
    />
  );
}

export const BRAND_AMBER = '#F5A623';
export const BRAND_AMBER_GRADIENT = ['#FFB800', '#F59E0B'] as const;

/**
 * Enterprise-grade, persistent Bottom Navigation Bar with an elevated Central Scanner FAB.
 * Replaces the disconnected floating dock pills with an edge-to-edge, polished app shell bar.
 */
export function BottomNavBar({
  activeTab = 'home',
  onScan,
  onEmergency,
  onLogs,
  onProfile,
  onHome,
}: BottomNavBarProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const activeEmergencies = useEmergencyStore((state) => state.active);
  const hasEmergency = activeEmergencies.length > 0;

  // Shake animation for the Emergency tab icon when an emergency is active
  const shake = useSharedValue(0);

  useEffect(() => {
    if (hasEmergency) {
      shake.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 60, easing: Easing.linear }),
          withTiming(14, { duration: 60, easing: Easing.linear }),
          withTiming(-12, { duration: 60, easing: Easing.linear }),
          withTiming(12, { duration: 60, easing: Easing.linear }),
          withTiming(-8, { duration: 60, easing: Easing.linear }),
          withTiming(8, { duration: 60, easing: Easing.linear }),
          withTiming(0, { duration: 60, easing: Easing.linear }),
          withDelay(1200, withTiming(0, { duration: 50 }))
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(shake);
      shake.value = 0;
    }
    return () => {
      cancelAnimation(shake);
    };
  }, [hasEmergency, shake]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shake.value}deg` }],
  }));

  const handlePress = (tab: NavTab, action: () => void) => {
    if (tab === 'scan') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (tab === 'emergency') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    action();
  };

  const activeColor = '#0F172A';
  const inactiveColor = '#64748B';

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {/* Tab: Home */}
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={t('home.navHome')}
        onPress={() => handlePress('home', onHome ?? (() => {}))}
        style={styles.tabItem}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={24}
          color={activeTab === 'home' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'home' ? activeColor : inactiveColor },
            activeTab === 'home' && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {t('home.navHome')}
        </Text>
      </Pressy>

      {/* Tab: Emergency */}
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={t('home.navEmergency')}
        onPress={() => handlePress('emergency', onEmergency)}
        style={styles.tabItem}
      >
        <Animated.View style={[styles.iconWrap, shakeStyle]}>
          <Ionicons
            name={hasEmergency ? 'warning' : 'warning-outline'}
            size={24}
            color={hasEmergency ? GuardColors.red : activeTab === 'emergency' ? activeColor : inactiveColor}
          />
          {hasEmergency ? <View style={styles.emergencyDot} /> : null}
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            { color: hasEmergency ? GuardColors.red : activeTab === 'emergency' ? activeColor : inactiveColor },
            activeTab === 'emergency' && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {t('home.navEmergency')}
        </Text>
      </Pressy>

      {/* Central Scanner FAB Slot */}
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={t('home.scan')}
        onPress={() => handlePress('scan', onScan)}
        scaleTo={0.92}
        style={styles.fabSlot}
      >
        <View style={[styles.fabButton, styles.fabShadow]}>
          <LinearGradient
            colors={BRAND_AMBER_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
          />
          <Ionicons name="qr-code" size={28} color="#0F172A" />
        </View>
        <Text style={styles.fabLabel} numberOfLines={1}>
          {t('home.scan')}
        </Text>
      </Pressy>

      {/* Tab: Logs / Entries */}
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={t('home.logs')}
        onPress={() => handlePress('logs', onLogs)}
        style={styles.tabItem}
      >
        <Ionicons
          name={activeTab === 'logs' ? 'receipt' : 'receipt-outline'}
          size={24}
          color={activeTab === 'logs' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'logs' ? activeColor : inactiveColor },
            activeTab === 'logs' && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {t('home.logs')}
        </Text>
      </Pressy>

      {/* Tab: Profile */}
      <Pressy
        accessibilityRole="button"
        accessibilityLabel={t('home.profile')}
        onPress={() => handlePress('profile', onProfile)}
        style={styles.tabItem}
      >
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={24}
          color={activeTab === 'profile' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'profile' ? activeColor : inactiveColor },
            activeTab === 'profile' && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {t('home.profile')}
        </Text>
      </Pressy>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    // Ambient upper shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GuardColors.red,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tabLabel: {
    fontFamily: GuardFonts.medium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  tabLabelActive: {
    fontFamily: GuardFonts.bold,
    fontWeight: '800',
  },
  fabSlot: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: BRAND_AMBER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  fabShadow: {
    shadowColor: BRAND_AMBER,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 10,
  },
  fabLabel: {
    fontFamily: GuardFonts.bold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
});
