import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';
import api from '../../services/api';

interface EmergencyOverlayProps {
  emergencyId?: string;
  onDismiss?: () => void;
}

export function EmergencyOverlay({ emergencyId, onDismiss }: EmergencyOverlayProps) {
  const pulseScale = useSharedValue(1);
  const [cancelling, setCancelling] = React.useState(false);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleFalseAlarm = async () => {
    if (!emergencyId) {
      onDismiss?.();
      return;
    }
    setCancelling(true);
    try {
      await api.patch(`/community/emergencies/${emergencyId}/false-alarm`, {
        notes: 'Accidental trigger',
      });
      onDismiss?.();
    } catch (err: any) {
      setCancelling(false);
      const status = err?.response?.status;
      if (status === 403) {
        // Not the reporter — just dismiss the local overlay
        onDismiss?.();
      } else {
        Alert.alert('Error', 'Could not cancel. Please inform a guard directly.');
      }
    }
  };

  const confirmFalseAlarm = () => {
    Alert.alert(
      'Cancel Emergency?',
      'Only cancel if this was a mistake. Guards will receive an all-clear.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel Alert',
          style: 'destructive',
          onPress: handleFalseAlarm,
        },
      ]
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Pulsing icon */}
        <Animated.View style={[styles.outerRing, pulseStyle]}>
          <View style={styles.innerRing}>
            <Ionicons name="warning" size={52} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Text style={styles.title}>EMERGENCY ACTIVE</Text>
        <Text style={styles.subtitle}>Guards and admin have been notified</Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color={SgateColors.green} />
            <Text style={styles.infoTitle}>Help is on the way</Text>
          </View>
          <Text style={styles.infoBody}>
            Security has been alerted. Stay calm and remain at your location.
          </Text>
        </View>

        {/* Live indicator */}
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE SAFETY PROTOCOL</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.falseAlarmBtn}
            onPress={confirmFalseAlarm}
            disabled={cancelling}
            activeOpacity={0.7}
          >
            <Text style={styles.falseAlarmText}>
              {cancelling ? 'Cancelling…' : 'False Alarm — Cancel Alert'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Dismiss notification</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    backgroundColor: SgateColors.red,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  outerRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  innerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: SgateFonts.extrabold,
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 20,
    marginTop: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: '#FFFFFF',
  },
  infoBody: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    opacity: 0.75,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SgateColors.green,
  },
  liveText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
  },
  actions: {
    marginTop: 36,
    width: '100%',
    gap: 12,
  },
  falseAlarmBtn: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  falseAlarmText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'underline',
  },
});
