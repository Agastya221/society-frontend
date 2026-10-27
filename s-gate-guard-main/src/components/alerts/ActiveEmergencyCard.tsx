import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { GuardFonts, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import { Pressy } from '@/components/gate/Pressy';
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
 * Exact same dimensions (126px height, 30px squircle radius), 64x64 left badge,
 * and 48x48 circular action button as the yellow "Scan QR" and black "New visitor" cards.
 */
export function ActiveEmergencyCard({
  emergencies,
  onPress,
  testID = 'emergency-bar',
}: ActiveEmergencyCardProps) {
  const t = useT();

  // Subtle slow-pulsing sheen
  const glowOpacity = useSharedValue(0.35);
  // Live indicator dot pulse
  const liveDotOpacity = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.75, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    liveDotOpacity.value = withRepeat(
      withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glowOpacity, liveDotOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
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

  const emergencyIcon =
    first.type === 'FIRE'
      ? 'flame'
      : first.type === 'MEDICAL'
        ? 'medkit'
        : 'warning';

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressy
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      testID={testID}
      onPress={handlePress}
      style={[
        styles.card,
        guardShadow('#881337', 3),
      ]}
    >
      {/* Luminous multi-stop ruby crimson gradient */}
      <LinearGradient
        colors={['#E11D48', EMERGENCY_CRIMSON, EMERGENCY_CRIMSON_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
      />

      {/* Signature tactile watermark rotated in background */}
      <Ionicons
        name="warning"
        size={160}
        color="rgba(255, 255, 255, 0.12)"
        style={styles.watermark}
        pointerEvents="none"
      />

      {/* Ambient top-edge specular glass sheen */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.glowLayer, glowStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Left: 64x64 Frosted Squircle Badge matching Scan QR & New Visitor */}
      <View style={styles.badgeWrapper}>
        <Ionicons name={emergencyIcon} size={32} color="#FFFFFF" />
      </View>

      {/* Center: Typographic Hierarchy */}
      <View style={styles.copy}>
        <View style={styles.liveChip}>
          <Animated.View style={[styles.liveDot, liveDotStyle]} />
          <Text style={styles.liveText}>{t('activeEmergency.liveBadge')}</Text>
        </View>
        <Text
          style={styles.title}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Right: Signature S-Gate circular action button (48x48) */}
      <View style={styles.actionBtn}>
        <Ionicons name="arrow-forward" size={22} color={EMERGENCY_CRIMSON} />
      </View>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 126,
    minHeight: 126,
    borderRadius: 30,
    backgroundColor: EMERGENCY_CRIMSON,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: -20,
    top: -20,
    transform: [{ rotate: '-10deg' }],
  },
  glowLayer: {
    borderRadius: 30,
  },
  badgeWrapper: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: GuardFonts.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: GuardFonts.medium,
    fontSize: 14,
    lineHeight: 20,
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
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
});
