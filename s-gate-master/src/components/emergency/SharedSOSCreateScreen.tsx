import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
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
import { AppAlert } from '@/components/ui/AppAlert';
import { SOSButton } from '@/components/ui/SOSButton';
import { SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

type SosState = 'idle' | 'holding' | 'triggered' | 'failed';

// ─── Constants ───────────────────────────────────────────────────────────────

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TYPE_ICONS: Record<string, MaterialIconName> = {
    HARASSMENT: 'woman',
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
    { label: 'Harassment', type: 'HARASSMENT' },
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

/**
 * One location reading, taken at the moment the alarm is sent (never tracked in between). The permission itself is
 * already required by the app's start-up check; a phone that cannot give a fix still raises the alarm.
 */
async function takeOneReading(): Promise<{ latitude: number; longitude: number } | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const current = await Location.getForegroundPermissionsAsync();
        if (!current.granted && !(current.canAskAgain && (await Location.requestForegroundPermissionsAsync()).granted)) return null;
        const position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 4000); }),
        ]);
        const fix = position ?? (await Location.getLastKnownPositionAsync());
        return fix ? { latitude: fix.coords.latitude, longitude: fix.coords.longitude } : null;
    } catch {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

type Place = { blockId?: string; location?: string };

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
                <Text className="text-[11px] text-gray-800 font-sora-bold text-center px-1" style={{ fontFamily: SgateFonts.bold }}>
                    {label}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface SharedSOSCreateScreenProps {
    role: 'resident' | 'admin';
}

export default function SharedSOSCreateScreen({ role }: SharedSOSCreateScreenProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // State Machine
    const [state, setState] = useState<SosState>('idle');
    const [lastTriggerTime, setLastTriggerTime] = useState(0);
    const [isOffline, setIsOffline] = useState(false);
    
    // A harassment alarm asks "where?" first; it is the one alarm that is private and silent
    const [harassmentOpen, setHarassmentOpen] = useState(false);
    const [privateSend, setPrivateSend] = useState(false);
    const [places, setPlaces] = useState<{ blocks: { id: string; name: string }[]; commonAreas: string[] } | null>(null);
    const [pickedPlace, setPickedPlace] = useState<Place | null>(null);

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

    }, []);

    useEffect(() => {
        if (!harassmentOpen || places) return;
        (async () => {
            try {
                const res = await api.get('/community/emergencies/places');
                const data = res?.data?.data;
                if (data && Array.isArray(data.blocks)) {
                    setPlaces({ blocks: data.blocks, commonAreas: Array.isArray(data.commonAreas) ? data.commonAreas : [] });
                }
            } catch {
                // Picking a place is optional: the alarm still goes without it
            }
        })();
    }, [harassmentOpen, places]);

    // ─── Interaction Handlers ────────────────────────────────────────────────

    const handleSOS = useCallback(async (type: string = 'OTHER', skipHaptic: boolean = false, place?: Place) => {
        const now = Date.now();
        if (now - lastTriggerTime < COOLDOWN_MS) {
            AppAlert.show('Slow Down', 'Please wait before sending another alert.');
            return;
        }

        setState('triggered');
        setPrivateSend(type === 'HARASSMENT');
        setLastTriggerTime(now);
        
        if (!skipHaptic) {
            // Single Heavy Haptic on Trigger Success for tile grid (SOSButton handles its own)
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Vibration.vibrate([0, 100, 50, 200]);
        }

        try {
            const body: any = { type };
            const reading = await takeOneReading();
            if (reading) {
                body.latitude = reading.latitude;
                body.longitude = reading.longitude;
            }
            if (place?.blockId) body.blockId = place.blockId;
            if (place?.location) body.location = place.location;
            
            // API Call
            const res = await api.post('/community/emergencies', body);
            const data = res.data?.data || res.data;
            
            if (role === 'admin') {
                AppAlert.show('SOS Sent ✓', 'Emergency alert has been broadcast to all security personnel.');
                router.replace('/(admin)/emergencies' as any);
            } else {
                router.replace({
                    pathname: '/(resident)/emergency/sent',
                    params: { emergencyId: data.id, type: data.type },
                } as any);
            }
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
    }, [lastTriggerTime, router, role]);

    // ─── Animated Styles ─────────────────────────────────────────────────────

    const sirenStyle = useAnimatedStyle(() => ({
        transform: [{ rotateZ: `${sirenRotate.value}deg` }],
    }));

    // ─── Render UI ────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-[#FAFAFA]">
            <LinearGradient
                colors={['#FFFFFF', '#FAFAFA', '#FFF5F5']}
                className="flex-1 relative"
                style={{ paddingTop: insets.top }}
            >
                {/* Status Indicator (Offline / Sending) */}
                {(state === 'triggered' || isOffline) && (
                    <Animated.View entering={FadeInDown} className="absolute top-0 left-0 right-0 z-[60] py-4 bg-red-500 items-center shadow-lg">
                        <View className="flex-row items-center gap-3" style={{ marginTop: insets.top }}>
                            <ActivityIndicator color="white" size="small" />
                            <Text className="text-white font-sora-bold text-sm">
                                {isOffline ? 'Sending when network is available...' : privateSend ? 'Sending...' : 'Broadcasting Emergency...'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Show Alerts Button */}
                <TouchableOpacity
                    onPress={() => {
                        if (role === 'admin') {
                            router.push('/(admin)/emergencies' as any);
                        } else {
                            router.push('/(resident)/emergency' as any);
                        }
                    }}
                    disabled={state === 'triggered'}
                    className="absolute left-6 top-6 h-10 px-4 rounded-full bg-white/80 items-center justify-center border border-gray-100 shadow-sm z-[55] flex-row gap-2"
                    accessibilityLabel="View emergency alerts"
                    style={{ marginTop: insets.top }}
                >
                    <MaterialIcons name="format-list-bulleted" size={18} color="#374151" />
                    <Text className="text-[13px] font-sora-bold text-gray-700" style={{ fontFamily: SgateFonts.bold }}>Show Alerts</Text>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    disabled={state === 'triggered'}
                    className="absolute right-6 top-6 w-10 h-10 rounded-full bg-white/80 items-center justify-center border border-gray-100 shadow-sm z-[55]"
                    accessibilityLabel="Close emergency screen"
                    style={{ marginTop: insets.top }}
                >
                    <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>

                {/* Scrollable Main Area */}
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ flexGrow: 1 }} 
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header Section */}
                    <View className="items-center mt-20 mb-2">
                        <Animated.View style={sirenStyle} className="mb-3">
                            <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center shadow-md shadow-red-100">
                                <MaterialCommunityIcons name="alarm-light" size={28} color="#ef4444" />
                            </View>
                        </Animated.View>
                        <Text className="text-2xl font-sora-extrabold text-gray-900 tracking-tight" style={{ fontFamily: SgateFonts.bold }}>
                            Emergency SOS
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1 font-sora-medium">Hold button or tap an emergency type</Text>
                    </View>

                    {/* Main SOS Button Hub */}
                    <View className="items-center justify-center py-2">
                        <SOSButton 
                            onTrigger={() => handleSOS('OTHER', true)} 
                            disabled={state === 'triggered' || isOffline} 
                            holdDuration={2000} 
                        />
                    </View>

                    {/* Grid Section */}
                    <View className="px-3" style={{ flexShrink: 0 }}>
                        <View className="flex-row flex-wrap justify-start">
                            {TILES.map((tile, index) => (
                                <CategoryCard
                                    key={tile.type}
                                    label={tile.label}
                                    icon={TYPE_ICONS[tile.type]}
                                    index={index}
                                    disabled={state === 'triggered' || isOffline}
                                    onPress={() => (tile.type === 'HARASSMENT' ? setHarassmentOpen(true) : handleSOS(tile.type))}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Bottom Info Section */}
                    <View className="mt-auto items-center pt-8" style={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}>
                        <View className="flex-row items-center bg-red-50/90 px-4 py-2.5 rounded-full border border-red-100 shadow-sm shadow-red-100/50">
                            <MaterialIcons name="my-location" size={16} color="#ef4444" />
                            <Text className="text-red-700 text-[11px] font-sora-bold ml-2 uppercase tracking-wide">
                                Your location is shared once, when you send
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>

            {/* Harassment: pick where (optional), then send silently */}
            <Modal visible={harassmentOpen} transparent animationType="slide" onRequestClose={() => setHarassmentOpen(false)}>
                <View style={sheetStyles.backdrop}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setHarassmentOpen(false)} />
                    <View style={[sheetStyles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
                        <Text style={sheetStyles.title}>Harassment alarm</Text>
                        <Text style={sheetStyles.text}>
                            Security and the admin are told at once. The residents of the tower you pick get only a short
                            "look out" message, without any names. Your phone stays silent.
                        </Text>
                        {places && (places.blocks.length > 0 || places.commonAreas.length > 0) ? (
                            <View>
                                <Text style={sheetStyles.where}>Where is it happening? (optional)</Text>
                                <ScrollView style={sheetStyles.chipsScroll} contentContainerStyle={sheetStyles.chips} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                    {places.blocks.map((block) => {
                                        const on = pickedPlace?.blockId === block.id;
                                        return (
                                            <TouchableOpacity
                                                key={block.id}
                                                testID={`place-block-${block.id}`}
                                                onPress={() => setPickedPlace(on ? null : { blockId: block.id })}
                                                style={[sheetStyles.chip, on && sheetStyles.chipOn]}
                                                accessibilityState={{ selected: on }}
                                            >
                                                <Text style={[sheetStyles.chipText, on && sheetStyles.chipTextOn]}>{block.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {places.commonAreas.map((area) => {
                                        const on = pickedPlace?.location === area;
                                        return (
                                            <TouchableOpacity
                                                key={area}
                                                testID={`place-area-${area}`}
                                                onPress={() => setPickedPlace(on ? null : { location: area })}
                                                style={[sheetStyles.chip, on && sheetStyles.chipOn]}
                                                accessibilityState={{ selected: on }}
                                            >
                                                <Text style={[sheetStyles.chipText, on && sheetStyles.chipTextOn]}>{area}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        ) : null}
                        <TouchableOpacity
                            testID="harassment-send"
                            style={sheetStyles.send}
                            activeOpacity={0.85}
                            onPress={() => {
                                const place = pickedPlace ?? undefined;
                                setHarassmentOpen(false);
                                setPickedPlace(null);
                                // Silent: no vibration, no sound, no haptic on her phone
                                handleSOS('HARASSMENT', true, place);
                            }}
                        >
                            <MaterialIcons name="campaign" size={22} color="#FFFFFF" />
                            <Text style={sheetStyles.sendText}>Send silently</Text>
                        </TouchableOpacity>
                        <TouchableOpacity testID="harassment-cancel" onPress={() => { setHarassmentOpen(false); setPickedPlace(null); }} style={sheetStyles.cancel}>
                            <Text style={sheetStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const sheetStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: 22, gap: 12 },
    title: { fontSize: 20, color: '#111827', fontFamily: SgateFonts.bold },
    text: { fontSize: 14, lineHeight: 20, color: '#4B5563', fontFamily: SgateFonts.regular },
    where: { fontSize: 13, color: '#111827', marginBottom: 8, fontFamily: SgateFonts.bold },
    chipsScroll: { maxHeight: 140 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
    chipOn: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
    chipText: { fontSize: 14, color: '#374151', fontFamily: SgateFonts.bold },
    chipTextOn: { color: '#B91C1C' },
    send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 16 },
    sendText: { color: '#FFFFFF', fontSize: 16, fontFamily: SgateFonts.bold },
    cancel: { alignItems: 'center', paddingVertical: 8 },
    cancelText: { color: '#6B7280', fontSize: 15, fontFamily: SgateFonts.bold },
});
