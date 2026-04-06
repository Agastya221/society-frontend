import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { useActiveEmergency } from '../../../context/EmergencyContext';
import api from '../../../services/api';

const TYPE_ICONS: Record<string, string> = {
  MEDICAL: 'medkit',
  FIRE: 'flame',
  SECURITY: 'shield',
  LIFT_STUCK: 'git-merge-outline',
  ANIMAL_THREAT: 'paw',
  THEFT: 'bag-remove-outline',
  VIOLENCE: 'person-remove-outline',
  ACCIDENT: 'car-outline',
  OTHER: 'ellipsis-horizontal',
};

export default function EmergencySentScreen() {
  const router = useRouter();
  const { emergencyId, type } = useLocalSearchParams<{
    emergencyId: string;
    type: string;
  }>();
  const { dismissAlert } = useActiveEmergency();
  const [cancelling, setCancelling] = useState(false);

  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const handleFalseAlarm = async () => {
    if (!emergencyId) return;
    setCancelling(true);
    try {
      await api.patch(`/community/emergencies/${emergencyId}/false-alarm`, {
        notes: 'Accidental trigger',
      });
      dismissAlert(emergencyId);
      router.replace('/(resident)/home' as any);
    } catch (err: any) {
      setCancelling(false);
      const status = err?.response?.status;
      if (status === 401) { router.replace('/login' as any); return; }
      if (status === 403) {
        Alert.alert('Not Allowed', 'Only the reporter or an admin can cancel this alert.');
        return;
      }
      if (!err?.response) {
        Alert.alert('Error', 'No connection. Please try again.');
        return;
      }
      Alert.alert('Error', err?.response?.data?.message || 'Could not cancel. Try again.');
    }
  };

  const confirmFalseAlarm = () => {
    Alert.alert(
      'Cancel Emergency?',
      'Only cancel if this was a mistake. Guards will receive an all-clear notification.',
      [
        { text: 'Keep Active', style: 'cancel' },
        { text: 'Cancel Alert', style: 'destructive', onPress: handleFalseAlarm },
      ]
    );
  };

  const iconName = TYPE_ICONS[type || ''] || 'warning';

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Animated.View style={[styles.outerRing, pulseStyle]}>
          <View style={styles.innerCircle}>
            <Ionicons name={iconName as any} size={36} color="#FFFFFF" />
          </View>
        </Animated.View>
        <Text style={styles.alertTitle}>Alert Sent!</Text>
        <Text style={styles.alertSubtitle}>Guards and admin have been notified.</Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark" size={22} color={SgateColors.green} />
          <Text style={styles.infoTitle}>Help is on the way</Text>
        </View>
        <Text style={styles.infoBody}>
          Stay calm. Keep your phone with you and remain at your location.
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.falseAlarmButton}
          onPress={confirmFalseAlarm}
          disabled={cancelling}
          activeOpacity={0.7}
        >
          <Text style={styles.falseAlarmText}>
            {cancelling ? 'Cancelling…' : 'False Alarm — Cancel Alert'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push('/(resident)/emergency' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewButtonText}>View My Emergencies</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SgateColors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    alignItems: 'center',
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 28,
    fontFamily: SgateFonts.extrabold,
    color: '#FFFFFF',
    marginTop: 24,
  },
  alertSubtitle: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 40,
    width: '88%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  infoBody: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 4,
    lineHeight: 19,
  },
  buttonsContainer: {
    marginTop: 32,
    width: '88%',
    alignItems: 'center',
  },
  falseAlarmButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  falseAlarmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
  },
  viewButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: SgateFonts.medium,
  },
});
