import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Vibration,
  View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

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

const TILES = [
  { label: 'MEDICAL', type: 'MEDICAL' },
  { label: 'FIRE', type: 'FIRE' },
  { label: 'SECURITY', type: 'SECURITY' },
  { label: 'LIFT STUCK', type: 'LIFT_STUCK' },
  { label: 'ANIMAL THREAT', type: 'ANIMAL_THREAT' },
  { label: 'THEFT', type: 'THEFT' },
  { label: 'VIOLENCE', type: 'VIOLENCE' },
  { label: 'ACCIDENT', type: 'ACCIDENT' },
  { label: 'OTHER', type: 'OTHER' },
];

function TileButton({
  label,
  icon,
  index,
  isLoading,
  disabled,
  onPress,
}: {
  label: string;
  icon: string;
  index: number;
  isLoading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 40).springify()}
      style={[styles.tile, animatedStyle]}
    >
      <TouchableWithoutFeedback
        onPressIn={() => { scale.value = withSpring(0.93); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={onPress}
        disabled={disabled}
      >
        <View style={styles.tileInner}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name={icon as any} size={28} color="#FFFFFF" />
              <Text style={styles.tileLabel}>{label}</Text>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

export default function CreateEmergencyScreen() {
  const router = useRouter();
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const locationRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        locationRef.current = `${loc.coords.latitude},${loc.coords.longitude}`;
      } catch {}
    })();
  }, []);

  const handleError = (err: any) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message;
    if (status === 401) { router.replace('/login' as any); return; }
    if (status === 403) { AppAlert.show('Error', 'Your account is inactive. Contact your admin.'); return; }
    if (status === 500) { AppAlert.show('Error', 'SOS failed — please call security directly'); return; }
    if (status === 400) { AppAlert.show('Error', message || 'Something went wrong, please try again'); return; }
    if (!err?.response) { AppAlert.show('Error', 'No connection. Please try again.'); return; }
    AppAlert.show('Error', message || 'Something went wrong, please try again');
  };

  const handleTilePress = async (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Vibration.vibrate(80);
    setLoadingType(type);
    try {
      const body: any = { type };
      if (locationRef.current) body.location = locationRef.current;
      const res = await api.post('/community/emergencies', body);
      const data = res.data?.data || res.data;
      router.replace({
        pathname: '/(resident)/emergency/sent',
        params: { emergencyId: data.id, type: data.type },
      } as any);
    } catch (err: any) {
      setLoadingType(null);
      handleError(err);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <TouchableWithoutFeedback onPress={() => router.back()}>
        <View style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="medical" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>IMMEDIATE RESPONSE REQUIRED</Text>
      </View>

      <View style={styles.grid}>
        {TILES.map((tile, index) => (
          <View key={tile.type} style={styles.tileWrapper}>
            <TileButton
              label={tile.label}
              icon={TYPE_ICONS[tile.type]}
              index={index}
              isLoading={loadingType === tile.type}
              disabled={loadingType !== null}
              onPress={() => handleTilePress(tile.type)}
            />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SgateColors.red,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontFamily: SgateFonts.extrabold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2.5,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  tileWrapper: {
    width: '33.333%',
    padding: 5,
  },
  tile: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tileInner: {
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  tileLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: SgateFonts.bold,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginTop: 10,
    textAlign: 'center',
  },
});
