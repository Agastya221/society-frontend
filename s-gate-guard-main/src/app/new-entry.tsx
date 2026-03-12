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
    View
} from 'react-native';

const VISITOR_TYPES = ['Guest', 'Delivery', 'Worker', 'Cab'] as const;
type VType = typeof VISITOR_TYPES[number];

const VISITOR_TYPE_MAP: Record<VType, string> = {
    Guest: 'GUEST', Delivery: 'DELIVERY', Worker: 'WORKER', Cab: 'CAB',
};
const TYPE_COLORS: Record<VType, string> = { Guest: '#3B82F6', Delivery: '#F59E0B', Worker: '#8B5CF6', Cab: '#10B981' };
const TYPE_ICONS: Record<VType, any> = { Guest: 'person', Delivery: 'cube', Worker: 'construct', Cab: 'car' };

interface FlatResult {
    id: string;
    flatNumber: string;
    wing?: string;
    floor?: number;
}

export default function NewEntryScreen() {
    const router = useRouter();
    const [type, setType] = useState<VType>('Guest');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    
    // Flat Search
    const [flatSearch, setFlatSearch] = useState('');
    const [selectedFlat, setSelectedFlat] = useState<FlatResult | null>(null);
    const [flatSearchResults, setFlatSearchResults] = useState<FlatResult[]>([]);
    const [isSearchingFlat, setIsSearchingFlat] = useState(false);
    const [showFlatDropdown, setShowFlatDropdown] = useState(false);

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

    // Debounced Flat Search
    useEffect(() => {
        if (!flatSearch.trim() || selectedFlat?.flatNumber === flatSearch) {
            setFlatSearchResults([]);
            setShowFlatDropdown(false);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearchingFlat(true);
            try {
                const res = await api.get(`/api/v1/gate/flats/search?query=${encodeURIComponent(flatSearch)}`);
                setFlatSearchResults(res.data?.data || []);
                setShowFlatDropdown(true);
            } catch (err) {
                console.error(err);
                setFlatSearchResults([]);
            } finally {
                setIsSearchingFlat(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [flatSearch, selectedFlat]);

    const handleSelectFlat = (flat: FlatResult) => {
        setSelectedFlat(flat);
        setFlatSearch(flat.flatNumber);
        setShowFlatDropdown(false);
        setError('');
    };

    const handleSubmit = async () => {
        if (!name.trim() || !selectedFlat) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError('Visitor name and a valid flat selection are required');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            const payload: any = {
                visitorName: name.trim(),
                visitorType: VISITOR_TYPE_MAP[type],
                flatId: selectedFlat.id,
                purpose: notes.trim() || undefined,
            };
            
            if (phone.trim()) {
                let formattedPhone = phone.trim().replace(/\D/g, '');
                if (formattedPhone.length === 10) {
                    payload.visitorPhone = `+91${formattedPhone}`;
                } else if (formattedPhone.length > 10) {
                    payload.visitorPhone = `+${formattedPhone}`;
                } else {
                    payload.visitorPhone = `+91${formattedPhone}`; // Backend validation will handle short numbers
                }
            }

            await api.post('/api/v1/gate/entries', payload);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Entry Submitted', `${name} entry request sent for Flat ${selectedFlat.flatNumber}. Waiting for resident approval.`, [
                { text: 'New Entry', onPress: () => { 
                    setName(''); 
                    setPhone('');
                    setFlatSearch(''); 
                    setSelectedFlat(null);
                    setNotes(''); 
                    setType('Guest'); 
                } },
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
                                    <Ionicons name={TYPE_ICONS[t]} size={24} color={type === t ? TYPE_COLORS[t] : '#6B7280'} />
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
                                placeholder="e.g. John Doe"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={(t) => { setName(t); setError(''); }}
                                autoCapitalize="words"
                            />
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Visitor Phone (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="10-digit mobile number"
                                placeholderTextColor="#9CA3AF"
                                value={phone}
                                onChangeText={(t) => { setPhone(t); setError(''); }}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={[styles.inputGroup, { zIndex: 50 }]}>
                            <Text style={styles.inputLabel}>Search Flat *</Text>
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. A-101"
                                    placeholderTextColor="#9CA3AF"
                                    value={flatSearch}
                                    onChangeText={(t) => { 
                                        setFlatSearch(t); 
                                        setSelectedFlat(null);
                                        setError(''); 
                                    }}
                                    autoCapitalize="characters"
                                />
                                {isSearchingFlat && (
                                    <ActivityIndicator size="small" color="#3B82F6" style={styles.searchLoader} />
                                )}
                            </View>
                            
                            {/* Dropdown */}
                            {showFlatDropdown && flatSearchResults.length > 0 && (
                                <View style={styles.dropdown}>
                                    {flatSearchResults.map((item) => (
                                        <Pressable 
                                            key={item.id} 
                                            style={styles.dropdownItem}
                                            onPress={() => handleSelectFlat(item)}
                                        >
                                            <Ionicons name="home" size={16} color="#6B7280" style={{marginRight: 8}}/>
                                            <Text style={styles.dropdownText}>
                                                {item.flatNumber} {item.wing ? `(Wing ${item.wing})` : ''}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                            {showFlatDropdown && flatSearchResults.length === 0 && !isSearchingFlat && flatSearch.trim().length > 0 && (
                                <View style={styles.dropdown}>
                                    <Text style={styles.noResultsText}>No flats found</Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.inputGroup, { zIndex: 1 }]}>
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
    formCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, zIndex: 1, borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 }, android: { elevation: 3 } }) },
    inputGroup: { marginBottom: 20, position: 'relative' },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 16, color: '#1F2937', borderWidth: 1.5, borderColor: '#E5E7EB', fontWeight: '500' },
    textArea: { height: 90, paddingTop: 14 },
    searchContainer: { justifyContent: 'center' },
    searchLoader: { position: 'absolute', right: 16 },
    dropdown: { position: 'absolute', top: 85, left: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 8, zIndex: 100, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 } }) },
    dropdownItem: { padding: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dropdownText: { fontSize: 15, fontWeight: '600', color: '#374151' },
    noResultsText: { padding: 12, fontSize: 14, color: '#6B7280', textAlign: 'center' },
    submitButton: { backgroundColor: '#3B82F6', borderRadius: 16, padding: 18, zIndex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...Platform.select({ ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 }, android: { elevation: 6 } }) },
    submitButtonPressed: { backgroundColor: '#2563EB', transform: [{ scale: 0.97 }] },
    submitButtonDisabled: { backgroundColor: '#9CA3AF' },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
