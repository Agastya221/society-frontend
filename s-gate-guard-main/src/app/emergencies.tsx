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
    { title: 'LIFT TRAPPED', apiType: 'LIFT_TRAPPED', icon: 'alert-circle', color: '#F59E0B', bgColor: '#FEF3C7', description: 'Person trapped in elevator' },
];

export default function EmergenciesScreen() {
    const insets = useSafeAreaInsets();
    const [raising, setRaising] = useState<string | null>(null);

    const raiseEmergency = (emergency: EmergencyType) => {
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
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('🚨 Alert Raised', 'All residents and admin have been notified. Emergency services may be contacted.');
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

function EmergencyCard({ emergency, index, isRaising, onPress }: {
    emergency: EmergencyType; index: number; isRaising: boolean; onPress: () => void;
}) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, delay: index * 100, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, delay: index * 100, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Pressable
                onPress={onPress}
                disabled={isRaising}
                style={({ pressed }) => [styles.emergencyCard, { backgroundColor: emergency.bgColor }, pressed && styles.emergencyCardPressed]}
            >
                <View style={[styles.iconCircle, { backgroundColor: emergency.color }]}>
                    {isRaising
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name={emergency.icon} size={32} color="#FFFFFF" />}
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: emergency.color }]}>{emergency.title}</Text>
                    <Text style={styles.cardDescription}>{emergency.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={emergency.color} />
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
    iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }, android: { elevation: 4 } }) },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    cardDescription: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    helpSection: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, marginTop: 8, borderWidth: 1, borderColor: '#DBEAFE' },
    helpTitle: { fontSize: 16, fontWeight: '800', color: '#1E40AF', marginBottom: 16 },
    helpItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    helpText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },
});
