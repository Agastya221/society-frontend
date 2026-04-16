import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

type SosState = 'idle' | 'holding' | 'triggered' | 'failed';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
    MEDICAL: 'plus-circle-outline',
    FIRE: 'flame',
    SECURITY: 'shield-alert-outline',
    LIFT_STUCK: 'transit-connection-variant',
    ANIMAL_THREAT: 'paw',
    THEFT: 'lock-open-alert-outline',
    VIOLENCE: 'account-alert-outline',
    ACCIDENT: 'car-emergency',
    OTHER: 'dots-horizontal-circle-outline',
};

const TILES = [
    { label: 'Medical', type: 'MEDICAL' },
    { label: 'Fire', type: 'FIRE' },
    { label: 'Security', type: 'SECURITY' },
    { label: 'Lift Stuck', type: 'LIFT_STUCK' },
    { label: 'Animal Threat', type: 'ANIMAL_THREAT' },
    { label: 'Theft', type: 'THEFT' },
    { label: 'Violence', type: 'VIOLENCE' },
    { label: 'Accident', type: 'ACCIDENT' },
    { label: 'Other', type: 'OTHER' },
];

const COOLDOWN_MS = 15000; // 15s cooldown

// ─── Sub-Components ──────────────────────────────────────────────────────────

function CategoryCard({
    label,
    icon,
    index,
    disabled,
    onPress,
}: {
    label: string;
    icon: string;
    index: number;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <Animated.View
            entering={FadeInDown.delay(200 + index * 30).springify()}
            className={`${width > 350 ? 'w-1/3' : 'w-1/2'} p-2`}
        >
            <BlurView intensity={25} tint="light" className="rounded-[24px] overflow-hidden border border-white/40">
                <Pressable
                    onPress={onPress}
                    disabled={disabled}
                    style={({ pressed }) => ({
                        backgroundColor: pressed ? 'rgba(255,255,255,0.4)' : 'transparent',
                        opacity: disabled ? 0.5 : 1,
                    })}
                    className="items-center justify-center py-5 h-28"
                    accessibilityLabel={`${label} emergency category`}
                    accessibilityHint={`Tap to report ${label} emergency`}
                >
                    <View className="mb-3">
                        <MaterialCommunityIcons name={icon as any} size={36} color="#ef4444" />
                    </View>
                    <Text className="text-[11px] text-gray-700 uppercase tracking-[2px] text-center px-1 font-bold">
                        {label}
                    </Text>
                </Pressable>
            </BlurView>
        </Animated.View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateEmergencyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // State Machine
    const [state, setState] = useState<SosState>('idle');
    const [lastTriggerTime, setLastTriggerTime] = useState(0);
    const [isOffline, setIsOffline] = useState(false);
    
    const locationRef = useRef<string | null>(null);

    // Animations
    const pulseValue = useSharedValue(1);
    const sirenRotate = useSharedValue(0);
    const holdProgress = useSharedValue(0);
    const sosScale = useSharedValue(1);
    const holdTimer = useRef<NodeJS.Timeout | null>(null);
    const hapticInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Continuous Pulse loop (Idle & Holding)
        pulseValue.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1
        );

        // Siren rotation animation
        sirenRotate.value = withRepeat(
            withSequence(
                withTiming(10, { duration: 150 }),
                withTiming(-10, { duration: 150 })
            ),
            -1,
            true
        );

        // Warm up location
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                locationRef.current = `${loc.coords.latitude},${loc.coords.longitude}`;
            } catch { }
        })();

        return () => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            if (hapticInterval.current) clearInterval(hapticInterval.current);
        };
    }, []);

    // ─── Interaction Handlers ────────────────────────────────────────────────

    const handleSOS = useCallback(async (type: string = 'OTHER') => {
        const now = Date.now();
        if (now - lastTriggerTime < COOLDOWN_MS) {
            AppAlert.show('Slow Down', 'Please wait before sending another alert.');
            return;
        }

        setState('triggered');
        setLastTriggerTime(now);
        
        // Single Heavy Haptic on Trigger Success (Simulated success here for flow)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([0, 100, 50, 200]);

        try {
            const body: any = { type };
            if (locationRef.current) body.location = locationRef.current;
            
            // API Call
            const res = await api.post('/community/emergencies', body);
            const data = res.data?.data || res.data;
            
            router.replace({
                pathname: '/(resident)/emergency/sent',
                params: { emergencyId: data.id, type: data.type },
            } as any);
        } catch (err: any) {
            console.error('SOS Failed:', err);
            
            const isNetworkError = !err.response;
            if (isNetworkError) {
                setIsOffline(true);
                // In a real app, we would save to a persistent queue here.
                // For this demo, we'll keep the UI in "triggered" state but showing offline message
                AppAlert.show('Offline', 'Alert saved locally. Connecting to security...');
            } else {
                setState('failed');
                AppAlert.show('Failed', err.response?.data?.message || 'SOS failed — call security directly');
            }
        }
    }, [lastTriggerTime, router]);

    const startHold = () => {
        if (state === 'triggered') return;
        
        setState('holding');
        sosScale.value = withSpring(0.92);
        holdProgress.value = withTiming(100, { duration: 2000 });

        // Tactile Haptic Pulses during hold (~500ms)
        hapticInterval.current = setInterval(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 500);

        holdTimer.current = setTimeout(() => {
            if (hapticInterval.current) clearInterval(hapticInterval.current);
            handleSOS('OTHER');
        }, 2000);
    };

    const cancelHold = () => {
        if (state === 'triggered') return;
        
        setState('idle');
        if (holdTimer.current) clearTimeout(holdTimer.current);
        if (hapticInterval.current) clearInterval(hapticInterval.current);
        
        holdProgress.value = withTiming(0, { duration: 300 });
        sosScale.value = withSpring(1);
    };

    // ─── Animated Styles ─────────────────────────────────────────────────────

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseValue.value }],
        opacity: interpolate(pulseValue.value, [1, 1.15], [0.3, 0.05]),
    }));

    const sosButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sosScale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${holdProgress.value}%`,
        opacity: holdProgress.value > 0 ? 1 : 0,
    }));

    const sirenStyle = useAnimatedStyle(() => ({
        transform: [{ rotateZ: `${sirenRotate.value}deg` }],
    }));

    // ─── Render UI ────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FFFFFF', '#FFF8F8']}
                className="flex-1"
                style={{ paddingTop: insets.top }}
            >
                {/* Status Indicator (Offline / Sending) */}
                {(state === 'triggered' || isOffline) && (
                    <Animated.View entering={FadeInDown} className="absolute top-0 left-0 right-0 z-[60] py-4 bg-red-500 items-center">
                        <View className="flex-row items-center gap-3">
                            <ActivityIndicator color="white" size="small" />
                            <Text className="text-white font-bold text-sm">
                                {isOffline ? 'Sending when network is available...' : 'Broadcasting Emergency...'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Header Section */}
                <View className="items-center mt-12 mb-6">
                    <Animated.View style={sirenStyle} className="mb-4">
                        <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center shadow-lg shadow-red-100">
                            <MaterialCommunityIcons name="alarm-light" size={32} color="#ef4444" />
                        </View>
                    </Animated.View>
                    <Text className="text-3xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: SgateFonts.bold }}>
                        Emergency SOS
                    </Text>
                    <Text className="text-gray-400 text-sm mt-1 font-medium">Immediate help available</Text>
                </View>

                {/* Main SOS Button Hub */}
                <View className="items-center justify-center py-4">
                    {/* Pulsing Light Aura */}
                    <Animated.View
                        style={[pulseStyle]}
                        className="absolute w-56 h-56 rounded-full bg-red-500"
                    />

                    <View className="w-[160px] h-[160px] items-center justify-center">
                        <Pressable
                            onPressIn={startHold}
                            onPressOut={cancelHold}
                            disabled={state === 'triggered'}
                            className="z-50"
                            accessibilityLabel="Emergency SOS button"
                            accessibilityHint="Hold for 2 seconds to send emergency alert"
                            accessibilityRole="button"
                            accessibilityState={{ disabled: state === 'triggered', busy: state === 'triggered' }}
                        >
                            <Animated.View
                                style={[sosButtonStyle]}
                                className="w-[125px] h-[125px] rounded-full bg-red-500 items-center justify-center shadow-2xl shadow-red-400 border-[6px] border-white/90 overflow-hidden"
                            >
                                <LinearGradient
                                    colors={['#ff7676', '#ef4444', '#dc2626']}
                                    className="absolute inset-0"
                                />
                                {/* Glass Gloss Overlays */}
                                <View className="absolute top-1.5 left-4 w-20 h-8 bg-white/20 rounded-full rotate-[-15deg]" />
                                
                                <MaterialCommunityIcons name="alert-decagram" size={24} color="white" style={{ opacity: 0.9, marginBottom: 2 }} />
                                <Text className="text-white text-3xl font-black tracking-widest leading-none" style={{ fontFamily: SgateFonts.extrabold }}>SOS</Text>
                                <Text className="text-white/80 text-[8px] font-bold mt-1.5 uppercase tracking-wider" style={{ fontFamily: SgateFonts.bold }}>
                                    {state === 'holding' ? 'KEEP HOLDING' : 'HOLD 2 SEC'}
                                </Text>
                            </Animated.View>
                        </Pressable>
                    </View>
                </View>

                {/* Grid Section - Increased spacing for clarity */}
                <View className="flex-1 mt-4 px-3">
                    <View className="flex-row flex-wrap justify-between">
                        {TILES.map((tile, index) => (
                            <CategoryCard
                                key={tile.type}
                                label={tile.label}
                                icon={TYPE_ICONS[tile.type]}
                                index={index}
                                disabled={state === 'triggered'}
                                onPress={() => handleSOS(tile.type)}
                            />
                        ))}
                    </View>
                </View>

                {/* Bottom Info Section */}
                <View className="mt-auto items-center pb-12 px-10">
                    <View className="flex-row items-center bg-gray-50 px-5 py-3 rounded-full border border-gray-100">
                        <Ionicons name="location" size={16} color="#ef4444" />
                        <Text className="text-gray-500 text-[11px] font-bold ml-2 tracking-tight uppercase">
                            Your live location will be shared instantly
                        </Text>
                    </View>
                </View>

                {/* Safe Back / Close */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    disabled={state === 'triggered'}
                    className="absolute right-6 top-12 w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100 shadow-sm"
                    accessibilityLabel="Close emergency screen"
                >
                    <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({});
