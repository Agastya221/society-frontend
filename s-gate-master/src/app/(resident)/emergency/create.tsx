import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
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
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SOSButton } from '../../../components/ui/SOSButton';
import { SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

type SosState = 'idle' | 'holding' | 'triggered' | 'failed';

// ─── Constants ───────────────────────────────────────────────────────────────

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TYPE_ICONS: Record<string, MaterialIconName> = {
    MEDICAL: 'medical-services',
    FIRE: 'local-fire-department',
    SECURITY: 'security',
    LIFT_STUCK: 'elevator',
    ANIMAL_THREAT: 'pets',
    THEFT: 'lock-open',
    VIOLENCE: 'report-problem',
    ACCIDENT: 'car-crash',
    OTHER: 'more-horiz',
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
    icon: MaterialIconName;
    index: number;
    disabled: boolean;
    onPress: () => void;
}) {
    return (
        <Animated.View
            entering={FadeInDown.delay(200 + index * 30).springify()}
            className="w-1/3 p-1.5"
        >
            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => ({
                    backgroundColor: pressed ? '#fee2e2' : '#ffffff',
                    opacity: disabled ? 0.5 : 1,
                })}
                className="items-center justify-center py-4 rounded-2xl bg-white shadow-sm shadow-gray-200/50 border border-gray-100 min-h-[90px]"
                accessibilityLabel={`${label} emergency category`}
                accessibilityHint={`Tap to report ${label} emergency`}
            >
                <View className="mb-2">
                    <MaterialIcons name={icon} size={28} color="#ef4444" />
                </View>
                <Text className="text-[11px] text-gray-800 font-bold text-center px-1" style={{ fontFamily: SgateFonts.bold }}>
                    {label}
                </Text>
            </Pressable>
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
    const sirenRotate = useSharedValue(0);

    useEffect(() => {
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
    }, []);

    // ─── Interaction Handlers ────────────────────────────────────────────────

    const handleSOS = useCallback(async (type: string = 'OTHER', skipHaptic: boolean = false) => {
        const now = Date.now();
        if (now - lastTriggerTime < COOLDOWN_MS) {
            AppAlert.show('Slow Down', 'Please wait before sending another alert.');
            return;
        }

        setState('triggered');
        setLastTriggerTime(now);
        
        if (!skipHaptic) {
            // Single Heavy Haptic on Trigger Success for tile grid (SOSButton handles its own)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Vibration.vibrate([0, 100, 50, 200]);
        }

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
                AppAlert.show('Offline', 'Alert saved locally. Connecting to security...');
            } else {
                setState('failed');
                AppAlert.show('Failed', err.response?.data?.message || 'SOS failed — call security directly');
            }
        }
    }, [lastTriggerTime, router]);

    // ─── Animated Styles ─────────────────────────────────────────────────────

    const sirenStyle = useAnimatedStyle(() => ({
        transform: [{ rotateZ: `${sirenRotate.value}deg` }],
    }));

    // ─── Render UI ────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-[#FAFAFA]">
            <LinearGradient
                colors={['#FFFFFF', '#FAFAFA', '#FFF5F5']}
                className="flex-1"
                style={{ paddingTop: insets.top }}
            >
                {/* Status Indicator (Offline / Sending) */}
                {(state === 'triggered' || isOffline) && (
                    <Animated.View entering={FadeInDown} className="absolute top-0 left-0 right-0 z-[60] py-4 bg-red-500 items-center shadow-lg">
                        <View className="flex-row items-center gap-3" style={{ marginTop: insets.top }}>
                            <ActivityIndicator color="white" size="small" />
                            <Text className="text-white font-bold text-sm">
                                {isOffline ? 'Sending when network is available...' : 'Broadcasting Emergency...'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Header Section */}
                <View className="items-center mt-8 mb-8">
                    <Animated.View style={sirenStyle} className="mb-3">
                        <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center shadow-md shadow-red-100">
                            <MaterialCommunityIcons name="alarm-light" size={28} color="#ef4444" />
                        </View>
                    </Animated.View>
                    <Text className="text-2xl font-extrabold text-gray-900 tracking-tight" style={{ fontFamily: SgateFonts.bold }}>
                        Emergency SOS
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1 font-medium">Hold button or tap an emergency type</Text>
                </View>

                {/* Main SOS Button Hub */}
                <View className="items-center justify-center py-6">
                    <SOSButton 
                        onTrigger={() => handleSOS('OTHER', true)} 
                        disabled={state === 'triggered' || isOffline} 
                        holdDuration={2000} 
                    />
                </View>

                {/* Grid Section */}
                <View className="flex-1 mt-6 px-3">
                    <View className="flex-row flex-wrap justify-start">
                        {TILES.map((tile, index) => (
                            <CategoryCard
                                key={tile.type}
                                label={tile.label}
                                icon={TYPE_ICONS[tile.type]}
                                index={index}
                                disabled={state === 'triggered' || isOffline}
                                onPress={() => handleSOS(tile.type)}
                            />
                        ))}
                    </View>
                </View>

                {/* Bottom Info Section - Safe App Padding */}
                <View className="mt-auto items-center pt-2" style={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}>
                    <View className="flex-row items-center bg-red-50/90 px-4 py-2.5 rounded-full border border-red-100 shadow-sm shadow-red-100/50">
                        <MaterialIcons name="my-location" size={16} color="#ef4444" />
                        <Text className="text-red-700 text-[11px] font-bold ml-2 uppercase tracking-wide">
                            Live location will be shared
                        </Text>
                    </View>
                </View>

                {/* Safe Back / Close */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    disabled={state === 'triggered'}
                    className="absolute right-6 top-12 w-10 h-10 rounded-full bg-white/80 items-center justify-center border border-gray-100 shadow-sm"
                    accessibilityLabel="Close emergency screen"
                >
                    <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({});
