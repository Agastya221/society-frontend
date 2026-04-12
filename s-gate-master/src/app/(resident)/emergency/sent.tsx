import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
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
import { AppAlert } from '../../../components/ui/AppAlert';
import { useActiveEmergency } from '../../../context/EmergencyContext';
import api from '../../../services/api';

// ─── Types & Constants ───────────────────────────────────────────────────────

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

// ─── Main Screen ─────────────────────────────────────────────────────────────

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
                withTiming(1.12, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
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
                AppAlert.show('Not Allowed', 'Only the reporter or an admin can cancel this alert.');
                return;
            }
            if (!err?.response) {
                AppAlert.show('Error', 'No connection. Please try again.');
                return;
            }
            AppAlert.show('Error', err?.response?.data?.message || 'Could not cancel. Try again.');
        }
    };

    const confirmFalseAlarm = () => {
        AppAlert.show(
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
        <View className="flex-1 bg-red-600 items-center justify-center px-10">
            <View className="items-center w-full">
                <Animated.View style={pulseStyle} className="w-32 h-32 rounded-full bg-white/20 items-center justify-center border border-white/30 mb-8 shadow-2xl">
                    <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center">
                        <Ionicons name={iconName as any} size={48} color="#FFFFFF" />
                    </View>
                </Animated.View>
                
                <Text className="text-4xl font-extrabold text-white text-center mb-2" style={{ fontFamily: 'Sora-Bold' }}>Alert Sent!</Text>
                <Text className="text-red-100 text-center text-lg font-medium mb-12">Security team has been notified.</Text>
            </View>

            <View className="bg-white p-6 rounded-[32px] w-full shadow-xl mb-10">
                <View className="flex-row items-center gap-3 mb-3">
                    <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                    <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>Help is coming</Text>
                </View>
                <Text className="text-gray-500 text-sm leading-6">
                    Stay calm. Keep your phone with you and remain at your current location for assistance.
                </Text>
            </View>

            <View className="w-full gap-4">
                <TouchableOpacity
                    onPress={confirmFalseAlarm}
                    disabled={cancelling}
                    activeOpacity={0.8}
                    className="bg-black/10 py-5 rounded-2xl items-center border border-white/20"
                >
                    <Text className="text-white font-bold text-[15px]">
                        {cancelling ? 'CANCELLING...' : 'FALSE ALARM — CANCEL'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(resident)/emergency' as any)}
                    activeOpacity={0.7}
                    className="py-2 items-center"
                >
                    <Text className="text-white/80 font-bold text-sm underline">VIEW ALERT HISTORY</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({});
