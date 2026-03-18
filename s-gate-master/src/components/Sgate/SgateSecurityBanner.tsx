import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface SgateSecurityBannerProps {
  subtitle?: string;
}

export function SgateSecurityBanner({
  subtitle = '2 guards active · Gate A, B monitored',
}: SgateSecurityBannerProps) {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Gold accent line at top */}
      <LinearGradient
        colors={['transparent', 'rgba(255,184,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />

      {/* Main gradient background */}
      <LinearGradient
        colors={[SgateColors.black, SgateColors.charcoal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Shield icon bubble */}
        <View style={styles.iconBubble}>
          <Feather name="shield" size={22} color={SgateColors.gold} />
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>All Secure</Text>
            <Animated.View style={[styles.pulseDot, pulseStyle]} />
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  accentLine: {
    height: 2,
    width: '100%',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,184,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: '#FFFFFF',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SgateColors.green,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
  },
});
