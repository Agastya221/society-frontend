import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Guard {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
    createdAt: string;
    society?: { name: string };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GuardsScreen() {
    const [guards, setGuards]       = useState<Guard[]>([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Modal state
    const [isModalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting]       = useState(false);
    const [name, setName]   = useState('');
    const [phone, setPhone] = useState('');

    const resetForm = () => { setName(''); setPhone(''); };

    useFocusEffect(useCallback(() => { fetchGuards(); }, []));

    const fetchGuards = async () => {
        try {
            const res = await api.get('/auth/resident-app/guards');
            setGuards(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch guards:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => { setRefreshing(true); fetchGuards(); };

    const toggleStatus = async (guard: Guard) => {
        const newActive = !guard.isActive;
        setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isActive: newActive } : g));
        try {
            await api.patch(`/auth/resident-app/users/${guard.id}/status`, { isActive: newActive });
        } catch {
            setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isActive: !newActive } : g));
            Alert.alert('Error', 'Failed to update guard status');
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
        const cleaned = phone.trim().replace(/\D/g, '');
        if (cleaned.length !== 10) { Alert.alert('Error', 'Enter a valid 10-digit phone number'); return; }
        setSubmitting(true);
        try {
            await api.post('/auth/resident-app/create-guard', { name: name.trim(), phone: `+91${cleaned}` });
            setModalVisible(false);
            resetForm();
            fetchGuards();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create guard');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    };

    if (loading) {
        return (
            <AppLoader />
        );
    }

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerBarTitle}>Guard Management</Text>
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            <FlatList
                data={guards}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Add New Guard</Text>
                    </TouchableOpacity>
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="shield-off-outline" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No guards yet</Text>
                        <Text style={styles.emptySub}>Add your first guard.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const initial = item.name.charAt(0).toUpperCase();
                    return (
                        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                            <View style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View style={styles.avatarWrap}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{initial}</Text>
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={styles.cardName}>{item.name}</Text>
                                            <Text style={styles.cardPhone}>{item.phone}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusPill, item.isActive ? styles.statusActive : styles.statusInactive]}>
                                        <View style={[styles.statusDot, { backgroundColor: item.isActive ? SgateColors.green : SgateColors.t4 }]} />
                                        <Text style={[styles.statusText, { color: item.isActive ? SgateColors.green : SgateColors.t4 }]}>
                                            {item.isActive ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.metaRow}>
                                    <MaterialCommunityIcons name="calendar-outline" size={12} color={SgateColors.t4} />
                                    <Text style={styles.metaText}>Joined {formatDate(item.createdAt)}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.toggleBtn, item.isActive ? styles.toggleBtnDeactivate : styles.toggleBtnActivate]}
                                    onPress={() => toggleStatus(item)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.toggleBtnText, { color: item.isActive ? SgateColors.t2 : '#FFFFFF' }]}>
                                        {item.isActive ? 'Deactivate' : 'Activate'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    );
                }}
            />

            {/* ── Add Guard Modal ─────────────────────────────────────────── */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalWrap, { paddingBottom: insets.bottom }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Guard</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.infoBanner}>
                            <MaterialCommunityIcons name="information-outline" size={15} color={SgateColors.goldDeep} />
                            <Text style={styles.infoBannerText}>Guards log in via OTP only. No password is needed.</Text>
                        </View>

                        <Text style={styles.formLabel}>FULL NAME *</Text>
                        <TextInput style={styles.formInput} value={name} onChangeText={setName}
                            placeholder="e.g. Suresh Kumar" placeholderTextColor={SgateColors.t4} />

                        <Text style={styles.formLabel}>MOBILE NUMBER *</Text>
                        <View style={styles.phoneRow}>
                            <View style={styles.phonePrefix}>
                                <Text style={styles.phonePrefixText}>+91</Text>
                            </View>
                            <TextInput style={styles.phoneInput} value={phone}
                                onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                                keyboardType="phone-pad" placeholder="10-digit number"
                                placeholderTextColor={SgateColors.t4} maxLength={10} />
                        </View>

                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={handleCreate} disabled={submitting} activeOpacity={0.8}>
                            {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> :
                                <Text style={styles.submitBtnText}>Add Guard</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    centerWrap: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },

    // Header
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerBarTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    spacer: { height: 6 },

    listContent: { padding: 20, flexGrow: 1 },

    // Add button
    addBtn: { backgroundColor: SgateColors.black, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
    addBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },

    // Card
    card: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 10 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cardPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // Status pill
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusActive: { backgroundColor: SgateColors.greenBg },
    statusInactive: { backgroundColor: SgateColors.surface },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold },

    // Meta
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
    metaText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    // Toggle button
    toggleBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
    toggleBtnActivate: { backgroundColor: SgateColors.black },
    toggleBtnDeactivate: { backgroundColor: SgateColors.surface },
    toggleBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

    // Modal
    modalWrap: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    infoBanner: { backgroundColor: SgateColors.goldPale, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24 },
    infoBannerText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.goldDeep, flex: 1, lineHeight: 18 },

    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8 },
    formInput: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, marginBottom: 18 },

    phoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
    phonePrefix: { paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: SgateColors.border, paddingVertical: 15 },
    phonePrefixText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    phoneInput: { flex: 1, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },

    submitBtn: { backgroundColor: SgateColors.black, borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
