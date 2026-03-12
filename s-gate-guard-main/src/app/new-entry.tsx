import api from '@/services/api';
import { GatePassType } from '@/types/gatePass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

const VISITOR_TYPES: GatePassType[] = ['Guest', 'Delivery', 'Worker', 'Cab'];
const VISITOR_TYPE_MAP: Record<GatePassType, string> = {
    Guest: 'GUEST', Delivery: 'DELIVERY', Worker: 'WORKER', Cab: 'CAB',
};
const TYPE_COLORS = { Guest: '#3B82F6', Delivery: '#F59E0B', Worker: '#8B5CF6', Cab: '#10B981' };
const TYPE_ICONS = { Guest: 'person', Delivery: 'cube', Worker: 'construct', Cab: 'car' };

export default function NewEntryScreen() {
    const router = useRouter();
    const [type, setType] = useState<GatePassType>('Guest');
    const [name, setName] = useState('');
    const [flat, setFlat] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSubmit = async () => {
        if (!name.trim() || !flat.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError('Visitor name and flat number are required');
            return;
        }
        setError('');
        setSubmitting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await api.post('/api/v1/gate/entries', {
                visitorName: name.trim(),
                visitorType: VISITOR_TYPE_MAP[type],
                flatNumber: flat.trim(),  // backend resolves flatNumber → flatId
                purpose: notes.trim() || undefined,
            });
            Alert.alert('✅ Entry Submitted', `${name} entry request sent for Flat ${flat}. Waiting for resident approval.`, [
                { text: 'New Entry', onPress: () => { setName(''); setFlat(''); setNotes(''); setType('Guest'); } },
                { text: 'Done', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Failed to submit entry. Please try again.';
            setError(msg);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* Visitor Type */}
                    <Text style={styles.sectionLabel}>VISITOR TYPE</Text>
                    <View style={styles.typeGrid}>
                        {VISITOR_TYPES.map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(t); }}
                                style={({ pressed }) => [styles.typeCard, type === t && styles.typeCardActive, type === t && { borderColor: TYPE_COLORS[t] }, pressed && styles.typeCardPressed]}
                            >
                                <View style={[styles.typeIcon, { backgroundColor: TYPE_COLORS[t] + '18' }]}>
                                    <Ionicons name={TYPE_ICONS[t] as any} size={24} color={type === t ? TYPE_COLORS[t] : '#6B7280'} />
                                </View>
                                <Text style={[styles.typeLabel, type === t && { color: TYPE_COLORS[t], fontWeight: '800' }]}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Error banner */}
                    {error ? (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={18} color="#DC2626" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Form */}
                    <View style={styles.formCard}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Visitor Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. John Doe, Amazon Delivery"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={(t) => { setName(t); setError(''); }}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Flat Number *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 101, A-402"
                                placeholderTextColor="#9CA3AF"
                                value={flat}
                                onChangeText={(t) => { setFlat(t); setError(''); }}
                                autoCapitalize="characters"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Purpose / Notes (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Additional details..."
                                placeholderTextColor="#9CA3AF"
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Submit */}
                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting}
                        style={({ pressed }) => [styles.submitButton, submitting && styles.submitButtonDisabled, pressed && !submitting && styles.submitButtonPressed]}
                    >
                        {submitting ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.submitButtonText}>Submitting...</Text>
                            </View>
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="white" />
                                <Text style={styles.submitButtonText}>Submit Entry Request</Text>
                            </>
                        )}
                    </Pressable>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 1.5, marginBottom: 14, marginLeft: 4 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    typeCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 2, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 }, android: { elevation: 2 } }) },
    typeCardActive: { borderWidth: 2.5, backgroundColor: '#FAFBFC' },
    typeCardPressed: { transform: [{ scale: 0.96 }] },
    typeIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    typeLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
    errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 14, marginBottom: 16 },
    errorText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#DC2626' },
    formCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 }, android: { elevation: 3 } }) },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 16, color: '#1F2937', borderWidth: 1.5, borderColor: '#E5E7EB', fontWeight: '500' },
    textArea: { height: 90, paddingTop: 14 },
    submitButton: { backgroundColor: '#3B82F6', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...Platform.select({ ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 }, android: { elevation: 6 } }) },
    submitButtonPressed: { backgroundColor: '#2563EB', transform: [{ scale: 0.97 }] },
    submitButtonDisabled: { backgroundColor: '#9CA3AF' },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
