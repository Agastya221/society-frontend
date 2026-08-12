import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EmergencyType = {
    title: string;
    apiType: string;
    icon: any;
    color: string;
    bgColor: string;
    description: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMERGENCIES: EmergencyType[] = [
    { title: 'Medical', apiType: 'MEDICAL', icon: 'medkit', color: '#DC2626', bgColor: '#FEE2E2', description: 'Medical emergency or injury' },
    { title: 'Fire', apiType: 'FIRE', icon: 'flame', color: '#DC2626', bgColor: '#FEE2E2', description: 'Fire outbreak or smoke detected' },
    { title: 'Security', apiType: 'SECURITY', icon: 'shield-checkmark', color: '#DC2626', bgColor: '#FEE2E2', description: 'Security threat or breach' },
    { title: 'Lift Stuck', apiType: 'LIFT_STUCK', icon: 'git-merge-outline', color: '#2563EB', bgColor: '#DBEAFE', description: 'Person trapped in elevator' },
    { title: 'Animal Threat', apiType: 'ANIMAL_THREAT', icon: 'paw', color: '#B7791F', bgColor: '#FFF7D6', description: 'Dangerous animal in society' },
    { title: 'Theft', apiType: 'THEFT', icon: 'lock-open', color: '#7C3AED', bgColor: '#EDE9FE', description: 'Theft or attempted theft' },
    { title: 'Violence', apiType: 'VIOLENCE', icon: 'warning', color: '#DC2626', bgColor: '#FEE2E2', description: 'Violence or physical threat' },
    { title: 'Accident', apiType: 'ACCIDENT', icon: 'car-sport', color: '#EA580C', bgColor: '#FFEDD5', description: 'Accident inside the society' },
    { title: 'Other', apiType: 'OTHER', icon: 'ellipsis-horizontal', color: '#4B5563', bgColor: '#F3F4F6', description: 'Other urgent emergency' },
];

export default function EmergenciesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [raising, setRaising] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    
    // Success Confirmation Screen State
    const [successAlert, setSuccessAlert] = useState<{ type: string; timestamp: Date } | null>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (cooldown > 0) timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [cooldown]);

    const showSuccessScreen = (type: string) => {
        setSuccessAlert({ type, timestamp: new Date() });
    };

    const raiseEmergency = async (emergency: EmergencyType) => {
        if (cooldown > 0 || raising) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setRaising(emergency.apiType);
        try {
            await api.post('/api/v1/community/emergencies', {
                type: emergency.apiType,
                description: emergency.description,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCooldown(15);
            showSuccessScreen(emergency.title);
        } catch (err: any) {
            Alert.alert('Failed', err?.response?.data?.message ?? 'Could not raise alert. Please call security directly.');
        } finally {
            setRaising(null);
        }
    };

    if (successAlert) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successContent}>
                    <View style={styles.successIconWrapper}>
                        <Ionicons name="warning" size={80} color="#DC2626" />
                    </View>
                    <Text style={styles.successTitle}>EMERGENCY ALERT SENT!</Text>
                    <Text style={styles.successAlertType}>{successAlert.type}</Text>
                    
                    <View style={styles.successDetails}>
                        <Ionicons name="time-outline" size={20} color="#6B7280" />
                        <Text style={styles.successTime}>
                            Broadcasted at {successAlert.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Text>
                    </View>
                    
                    <Text style={styles.successInfo}>
                        All residents and administrators have been notified immediately. Please stay calm and assist if possible.
                    </Text>

                    <Pressable 
                        style={styles.successCloseBtn}
                        onPress={() => setSuccessAlert(null)}
                    >
                        <Text style={styles.successCloseText}>Close Screen</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.warningBanner, { paddingTop: insets.top + 20 }]}>
                <Pressable style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={GuardColors.t1} /></Pressable>
                <View style={styles.warningIcon}><Ionicons name="warning-outline" size={22} color={GuardColors.red} /></View>
                <View style={styles.warningText}>
                    <Text style={styles.warningTitle}>Emergency Console</Text>
                    <Text style={styles.warningSubtitle}>Use strictly for genuine emergencies</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Quick emergency access</Text>
                    <Text style={styles.sectionSubtitle}>Tap the emergency type to broadcast an alert.</Text>
                </View>

                <View style={styles.emergencyGrid}>
                    {EMERGENCIES.map((emergency) => (
                        <EmergencyCard
                            key={emergency.apiType}
                            emergency={emergency}
                            isRaising={raising === emergency.apiType}
                            cooldownRemaining={cooldown}
                            onPress={() => raiseEmergency(emergency)}
                        />
                    ))}
                </View>

                <View style={styles.helpSection}>
                    <Text style={styles.helpTitle}>What happens when you raise an alarm?</Text>
                    {[
                        'All residents receive instant notification',
                        'Admin team is alerted immediately',
                        'Emergency services may be contacted',
                    ].map((text) => (
                        <View key={text} style={styles.helpItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.helpText}>{text}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

function EmergencyCard({ emergency, isRaising, cooldownRemaining, onPress }: {
    emergency: EmergencyType; isRaising: boolean; cooldownRemaining: number; onPress: () => void;
}) {
    const isOnCooldown = cooldownRemaining > 0;

    return (
        <Pressable
                onPress={onPress}
                disabled={isRaising || isOnCooldown}
                style={[
                    styles.emergencyCard, 
                    isOnCooldown && styles.emergencyCardDisabled
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: isOnCooldown ? GuardColors.surface : emergency.bgColor }]}>
                    {isRaising
                        ? <ActivityIndicator size="small" color={emergency.color} />
                        : <Ionicons name={emergency.icon} size={25} color={isOnCooldown ? GuardColors.t3 : emergency.color} />}
                </View>
                <Text style={[styles.cardTitle, { color: isOnCooldown ? GuardColors.t3 : GuardColors.t1 }]}>{emergency.title}</Text>
                {isOnCooldown ? (
                    <Text style={styles.cooldownBadgeText}>{cooldownRemaining}s</Text>
                ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GuardColors.bg },
    warningBanner: { backgroundColor: GuardColors.card, borderBottomWidth: 1, borderBottomColor: GuardColors.border, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
    warningIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: GuardColors.redBg, alignItems: 'center', justifyContent: 'center' },
    warningText: { flex: 1 },
    warningTitle: { fontSize: 17, fontWeight: '900', color: GuardColors.t1, marginBottom: 2 },
    warningSubtitle: { fontSize: 12, fontWeight: '600', color: GuardColors.t2 },
    
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionHeading: { marginBottom: 16 },
    sectionTitle: { fontSize: 19, fontWeight: '900', color: GuardColors.t1, marginBottom: 4 },
    sectionSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: GuardColors.t2 },
    emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    emergencyCard: { width: (SCREEN_WIDTH - 72) / 3, minHeight: 104, backgroundColor: GuardColors.card, borderRadius: 18, paddingHorizontal: 6, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GuardColors.border },
    emergencyCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
    emergencyCardDisabled: { opacity: 0.8, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
    
    iconCircle: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
    cardTitle: { minHeight: 28, fontSize: 11, lineHeight: 14, fontWeight: '800', textAlign: 'center' },
    
    cooldownBadgeText: { position: 'absolute', top: 8, right: 9, fontSize: 10, fontWeight: '800', color: '#6B7280' },

    helpSection: { backgroundColor: GuardColors.goldPale, borderRadius: 16, padding: 20, marginTop: 8, borderWidth: 1, borderColor: '#F3D37A' },
    helpTitle: { fontSize: 15, fontWeight: '900', color: GuardColors.t1, marginBottom: 16 },
    helpItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    helpText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },

    successContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 30 },
    successContent: { alignItems: 'center', width: '100%' },
    successIconWrapper: { width: 112, height: 112, borderRadius: 36, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FEE2E2' },
    successTitle: { fontSize: 22, fontWeight: '900', color: '#1F2937', marginBottom: 4, textAlign: 'center', letterSpacing: 0.5 },
    successAlertType: { fontSize: 32, fontWeight: '900', color: '#DC2626', letterSpacing: 1, marginBottom: 24, textAlign: 'center' },
    successDetails: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 24 },
    successTime: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
    successInfo: { fontSize: 15, fontWeight: '500', color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },
    successCloseBtn: { backgroundColor: '#F3F4F6', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, width: '100%' },
    successCloseText: { fontSize: 16, fontWeight: '800', color: '#374151', textAlign: 'center' },
});
