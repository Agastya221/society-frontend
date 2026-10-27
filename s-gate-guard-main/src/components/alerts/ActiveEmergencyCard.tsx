import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GuardFonts } from '@/constants/theme';
import { useT } from '@/i18n';
import type { ActiveEmergency } from '@/store/useEmergencyStore';

export const EMERGENCY_CRIMSON = '#BE123C';
export const EMERGENCY_CRIMSON_DARK = '#9F1239';
export const EMERGENCY_CRIMSON_DEEP = '#881337';

export interface ActiveEmergencyCardProps {
  emergencies: ActiveEmergency[];
  onPress: () => void;
  testID?: string;
}

/**
 * Ultra-modern, high-trust Active Emergency Card for S-Gate Guard.
 * Features:
 * - Fluid squircle geometry (borderRadius: 30) consistent with "Scan QR" and "New visitor"
 * - Deep multi-stop ruby gradient with watermark shield depth
 * - Frosted icon squircle with live pulsating beacon
 * - Authoritative typography hierarchy with [● LIVE ALERT] status chip
 * - Signature S-Gate circular action button with forward arrow
 */
export function ActiveEmergencyCard({
  emergencies,
  onPress,
  testID = 'emergency-bar',
}: ActiveEmergencyCardProps) {
  const t = useT();

  // Subtle slow-pulsing sheen
  const glowOpacity = useSharedValue(0.35);
  // Live beacon pulse
  const beaconScale = useSharedValue(1);
  const beaconOpacity = useSharedValue(0.4);
  // Live indicator dot pulse
  const liveDotOpacity = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    beaconScale.value = withRepeat(
      withTiming(1.18, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    beaconOpacity.value = withRepeat(
      withTiming(0.08, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    liveDotOpacity.value = withRepeat(
      withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glowOpacity, beaconScale, beaconOpacity, liveDotOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const beaconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: beaconScale.value }],
    opacity: beaconOpacity.value,
  }));

  const liveDotStyle = useAnimatedStyle(() => ({
    opacity: liveDotOpacity.value,
  }));

  if (!emergencies || emergencies.length === 0) return null;

  const first = emergencies[0];
  const typeLabel = (type: string) => t(`emergency.${type}`);

  const title =
    emergencies.length === 1
      ? t('activeEmergency.one', { type: typeLabel(first.type) })
      : t('activeEmergency.many', { n: emergencies.length });

  const subtitle = t('activeEmergency.manage');

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      testID={testID}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Multi-stop rich ruby crimson gradient */}
      <LinearGradient
        colors={['#D91E42', EMERGENCY_CRIMSON, EMERGENCY_CRIMSON_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
      />

      {/* Signature tactile watermark rotated in background */}
      <Ionicons
        name="shield"
        size={140}
        color="rgba(255, 255, 255, 0.08)"
        style={styles.watermark}
        pointerEvents="none"
      />

      {/* Ambient glass sheen */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.glowLayer, glowStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.22)', 'rgba(255, 255, 255, 0.04)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Guaranteed horizontal layout row */}
      <View style={styles.innerRow}>
        {/* Left: Frosted Icon Badge with pulsing beacon */}
        <View style={styles.badgeWrapper}>
          <Animated.View style={[styles.beaconRing, beaconStyle]} pointerEvents="none" />
          <View style={styles.badgeIcon}>
            <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
          </View>
        </View>

        {/* Center: Typographic Hierarchy */}
        <View style={styles.copy}>
          <View style={styles.liveChip}>
            <Animated.View style={[styles.liveDot, liveDotStyle]} />
            <Text style={styles.liveText}>{t('activeEmergency.liveBadge')}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* Right: Signature S-Gate circular action button */}
        <View style={styles.actionBtn}>
          <Ionicons name="arrow-forward" size={22} color={EMERGENCY_CRIMSON} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    borderRadius: 30,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: EMERGENCY_CRIMSON,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    // Deep ambient ruby drop shadow
    shadowColor: '#881337',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    justifyContent: 'center',
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  watermark: {
    position: 'absolute',
    right: -16,
    top: -24,
    transform: [{ rotate: '-12deg' }],
  },
  glowLayer: {
    borderRadius: 30,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  badgeWrapper: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  beaconRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: GuardFonts.bold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: GuardFonts.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
});
