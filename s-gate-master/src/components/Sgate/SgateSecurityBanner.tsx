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
      {/* Light accent line at top for glassmorphism/modern feel */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentLine}
      />

      {/* Modern vibrant yellow/gold gradient instead of blue */}
      <LinearGradient
        colors={['#FFC72C', '#F9A01B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Shield icon bubble with softer background */}
        <View style={styles.iconBubble}>
          <Feather name="shield" size={22} color="#FFFFFF" />
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
    shadowColor: '#F9A01B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: '#FFFFFF',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: 'rgba(255,255,255,0.85)',
  },
});
