import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
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

const EMERGENCIES: EmergencyType[] = [
    { title: 'FIRE', apiType: 'FIRE', icon: 'flame', color: '#DC2626', bgColor: '#FEE2E2', description: 'Fire outbreak or smoke detected' },
    { title: 'MEDICAL', apiType: 'MEDICAL', icon: 'medkit', color: '#2563EB', bgColor: '#DBEAFE', description: 'Medical emergency or injury' },
    { title: 'SECURITY', apiType: 'SECURITY', icon: 'shield', color: '#DC2626', bgColor: '#FEE2E2', description: 'Security threat or breach' },
    { title: 'LIFT TRAPPED', apiType: 'LIFT_STUCK', icon: 'alert-circle', color: '#F59E0B', bgColor: '#FEF3C7', description: 'Person trapped in elevator' },
    { title: 'ANIMAL THREAT', apiType: 'ANIMAL_THREAT', icon: 'paw', color: '#8B5CF6', bgColor: '#EDE9FE', description: 'Dangerous animal in bounds' },
];

export default function EmergenciesScreen() {
    const insets = useSafeAreaInsets();
    const [raising, setRaising] = useState<string | null>(null);
    const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
    
    // Success Confirmation Screen State
    const [successAlert, setSuccessAlert] = useState<{ type: string; timestamp: Date } | null>(null);
    const successOpacity = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        const activeCooldowns = Object.keys(cooldowns).filter(k => cooldowns[k] > 0);
        
        if (activeCooldowns.length > 0) {
            timer = setTimeout(() => {
                setCooldowns(prev => {
                    const next = { ...prev };
                    activeCooldowns.forEach(k => {
                        if (next[k] > 0) next[k] -= 1;
                    });
                    return next;
                });
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [cooldowns]);

    const showSuccessScreen = (type: string) => {
        setSuccessAlert({ type, timestamp: new Date() });
        Animated.timing(successOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // Hide success screen automatically after 5 seconds
        setTimeout(() => {
            Animated.timing(successOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                setSuccessAlert(null);
            });
        }, 5000);
    };

    const raiseEmergency = (emergency: EmergencyType) => {
        if (cooldowns[emergency.apiType] > 0) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            `🚨 Raise ${emergency.title} Alert?`,
            `This will immediately notify all residents and the admin team. Only use for genuine ${emergency.title.toLowerCase()} emergencies.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Raise Alert Now',
                    style: 'destructive',
                    onPress: async () => {
                        setRaising(emergency.apiType);
                        try {
                            await api.post('/api/v1/community/emergencies', {
                                type: emergency.apiType,
                                description: emergency.description,
                                // Optional lat/long omitted here, can add via expo-location if needed
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            
                            // Start 30 second specific cooldown for this button
                            setCooldowns(prev => ({ ...prev, [emergency.apiType]: 30 }));
                            
                            showSuccessScreen(emergency.title);
                        } catch (err: any) {
                            Alert.alert('Failed', err?.response?.data?.message ?? 'Could not raise alert. Please call security directly.');
                        } finally {
                            setRaising(null);
                        }
                    },
                },
            ]
        );
    };

    if (successAlert) {
        return (
            <Animated.View style={[styles.successContainer, { opacity: successOpacity }]}>
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
                        onPress={() => {
                            Animated.timing(successOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setSuccessAlert(null));
                        }}
                    >
                        <Text style={styles.successCloseText}>Close Screen</Text>
                    </Pressable>
                </View>
            </Animated.View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.warningBanner, { paddingTop: insets.top + 20 }]}>
                <Ionicons name="warning" size={24} color="#DC2626" />
                <View style={styles.warningText}>
                    <Text style={styles.warningTitle}>Emergency Console</Text>
                    <Text style={styles.warningSubtitle}>Use strictly for genuine emergencies</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {EMERGENCIES.map((emergency, index) => (
                    <EmergencyCard
                        key={emergency.title}
                        emergency={emergency}
                        index={index}
                        isRaising={raising === emergency.apiType}
                        cooldownRemaining={cooldowns[emergency.apiType] || 0}
                        onPress={() => raiseEmergency(emergency)}
                    />
                ))}

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

function EmergencyCard({ emergency, index, isRaising, cooldownRemaining, onPress }: {
    emergency: EmergencyType; index: number; isRaising: boolean; cooldownRemaining: number; onPress: () => void;
}) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, delay: index * 100, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, delay: index * 100, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const isOnCooldown = cooldownRemaining > 0;

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Pressable
                onPress={onPress}
                disabled={isRaising || isOnCooldown}
                style={({ pressed }) => [
                    styles.emergencyCard, 
                    { backgroundColor: emergency.bgColor }, 
                    pressed && styles.emergencyCardPressed,
                    isOnCooldown && styles.emergencyCardDisabled
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: isOnCooldown ? '#9CA3AF' : emergency.color }]}>
                    {isRaising
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name={emergency.icon} size={32} color="#FFFFFF" />}
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: isOnCooldown ? '#6B7280' : emergency.color }]}>{emergency.title}</Text>
                    <Text style={styles.cardDescription}>{emergency.description}</Text>
                </View>
                
                {isOnCooldown ? (
                    <View style={styles.cooldownBadge}>
                        <Ionicons name="time" size={14} color="#6B7280" />
                        <Text style={styles.cooldownBadgeText}>Wait {cooldownRemaining}s...</Text>
                    </View>
                ) : (
                    <Ionicons name="chevron-forward" size={24} color={emergency.color} />
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },
    warningBanner: { backgroundColor: '#FEF2F2', borderBottomWidth: 3, borderBottomColor: '#FEE2E2', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
    warningText: { flex: 1 },
    warningTitle: { fontSize: 18, fontWeight: '900', color: '#DC2626', marginBottom: 2, letterSpacing: 0.5 },
    warningSubtitle: { fontSize: 14, fontWeight: '600', color: '#991B1B' },
    
    scrollContent: { padding: 20, paddingBottom: 40 },
    emergencyCard: { borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', ...Platform.select({ ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 }, android: { elevation: 4 } }) },
    emergencyCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
    emergencyCardDisabled: { opacity: 0.8, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
    
    iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }, android: { elevation: 4 } }) },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    cardDescription: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    
    cooldownBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    cooldownBadgeText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },

    helpSection: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, marginTop: 8, borderWidth: 1, borderColor: '#DBEAFE' },
    helpTitle: { fontSize: 16, fontWeight: '800', color: '#1E40AF', marginBottom: 16 },
    helpItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    helpText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },

    successContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 30 },
    successContent: { alignItems: 'center', width: '100%' },
    successIconWrapper: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 4, borderColor: '#FEE2E2', ...Platform.select({ ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 }, android: { elevation: 10 } }) },
    successTitle: { fontSize: 22, fontWeight: '900', color: '#1F2937', marginBottom: 4, textAlign: 'center', letterSpacing: 0.5 },
    successAlertType: { fontSize: 32, fontWeight: '900', color: '#DC2626', letterSpacing: 1, marginBottom: 24, textAlign: 'center' },
    successDetails: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 24 },
    successTime: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
    successInfo: { fontSize: 15, fontWeight: '500', color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },
    successCloseBtn: { backgroundColor: '#F3F4F6', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, width: '100%' },
    successCloseText: { fontSize: 16, fontWeight: '800', color: '#374151', textAlign: 'center' },
});
