import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
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
import { AppAlert } from '@/components/ui/AppAlert';
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
    const [searchQuery, setSearchQuery] = useState('');
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

    const toggleStatus = async (guard: Guard, e?: any) => {
        // Prevent card press from firing
        e?.stopPropagation?.();
        const newActive = !guard.isActive;
        setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isActive: newActive } : g));
        try {
            await api.patch(`/auth/resident-app/users/${guard.id}/status`, { isActive: newActive });
        } catch {
            setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isActive: !newActive } : g));
            AppAlert.show('Error', 'Failed to update guard status');
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) { AppAlert.show('Error', 'Name is required'); return; }
        const cleaned = phone.trim().replace(/\D/g, '');
        if (cleaned.length !== 10) { AppAlert.show('Error', 'Enter a valid 10-digit phone number'); return; }
        setSubmitting(true);
        try {
            await api.post('/auth/resident-app/create-guard', { name: name.trim(), phone: `+91${cleaned}` });
            setModalVisible(false);
            resetForm();
            fetchGuards();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to create guard');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    };

    const filteredGuards = guards.filter(g => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return g.name.toLowerCase().includes(q) || g.phone.includes(q);
    });

    return (
        <View style={styles.root}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={[styles.headerBar, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerBarTitle}>Guard Management</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{guards.length}</Text>
                </View>
            </View>

            <View style={styles.spacer} />

            {/* ── Search + Add ─────────────────────────────────────────── */}
            <View style={styles.topControls}>
                <View style={styles.searchWrap}>
                    <MaterialCommunityIcons name="magnify" size={18} color={SgateColors.t3} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or phone..."
                        placeholderTextColor={SgateColors.t4}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialCommunityIcons name="close-circle" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="plus" size={18} color={SgateColors.t1} />
                    <Text style={styles.addBtnText}>Add New Guard</Text>
                </TouchableOpacity>
            </View>

            {/* ── Content ──────────────────────────────────────────────── */}
            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filteredGuards}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconWrap}>
                                <MaterialCommunityIcons name="shield-off-outline" size={36} color={SgateColors.t4} />
                            </View>
                            <Text style={styles.emptyTitle}>No guards found</Text>
                            <Text style={styles.emptySub}>{searchQuery ? 'Try a different search query.' : 'Tap "Add New Guard" to get started.'}</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => {
                        const initial = item.name.charAt(0).toUpperCase();
                        return (
                            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                                <TouchableOpacity
                                    style={styles.card}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/(admin)/guards/[id]', params: { id: item.id, guardData: JSON.stringify(item) } })}
                                >
                                    {/* Top Row: Avatar + Info + Status */}
                                    <View style={styles.cardTop}>
                                        <View style={styles.avatarWrap}>
                                            <View style={[styles.avatar, !item.isActive && styles.avatarInactive]}>
                                                <Text style={[styles.avatarText, !item.isActive && styles.avatarTextInactive]}>{initial}</Text>
                                            </View>
                                            <View style={styles.cardInfo}>
                                                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                                                <View style={styles.phoneRow}>
                                                    <MaterialCommunityIcons name="phone-outline" size={13} color={SgateColors.t3} />
                                                    <Text style={styles.cardPhone}>{item.phone}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={[styles.statusPill, item.isActive ? styles.statusActive : styles.statusInactive]}>
                                            <View style={[styles.statusDot, { backgroundColor: item.isActive ? SgateColors.green : SgateColors.red }]} />
                                            <Text style={[styles.statusText, { color: item.isActive ? SgateColors.green : SgateColors.red }]}>
                                                {item.isActive ? 'Active' : 'Inactive'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Divider */}
                                    <View style={styles.cardDivider} />

                                    {/* Bottom Row: Meta + Action */}
                                    <View style={styles.cardBottom}>
                                        <View style={styles.metaChips}>
                                            <View style={styles.metaChip}>
                                                <MaterialCommunityIcons name="calendar-clock-outline" size={13} color={SgateColors.t3} />
                                                <Text style={styles.metaChipText}>Joined {formatDate(item.createdAt)}</Text>
                                            </View>
                                            <View style={styles.metaChip}>
                                                <MaterialCommunityIcons name="shield-account-outline" size={13} color={SgateColors.t3} />
                                                <Text style={styles.metaChipText}>{item.role || 'Guard'}</Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.toggleBtn, item.isActive ? styles.toggleBtnDeactivate : styles.toggleBtnActivate]}
                                            onPress={(e) => toggleStatus(item, e)}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons
                                                name={item.isActive ? 'close-circle-outline' : 'check-circle-outline'}
                                                size={14}
                                                color={item.isActive ? SgateColors.red : '#FFFFFF'}
                                            />
                                            <Text style={[styles.toggleBtnText, { color: item.isActive ? SgateColors.red : '#FFFFFF' }]}>
                                                {item.isActive ? 'Deactivate' : 'Activate'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Chevron hint */}
                                    <View style={styles.chevronHint}>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={SgateColors.t4} />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    }}
                />
            )}

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
                        <View style={styles.formPhoneRow}>
                            <View style={styles.formPhonePrefix}>
                                <Text style={styles.formPhonePrefixText}>+91</Text>
                            </View>
                            <TextInput style={styles.formPhoneInput} value={phone}
                                onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                                keyboardType="phone-pad" placeholder="10-digit number"
                                placeholderTextColor={SgateColors.t4} maxLength={10} />
                        </View>

                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={handleCreate} disabled={submitting} activeOpacity={0.8}>
                            {submitting ? <ActivityIndicator size="small" color={SgateColors.t1} /> :
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
    countBadge: {
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countBadgeText: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    spacer: { height: 6 },

    // Top Controls
    topControls: { paddingHorizontal: 20, paddingTop: 10 },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    addBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 6,
    },
    addBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    listContent: { padding: 20, paddingTop: 10, flexGrow: 1 },

    // ── Premium Guard Card ──────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 12,
        position: 'relative',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12 },
            android: { elevation: 2 },
        }),
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(212,175,55,0.2)',
    },
    avatarInactive: {
        backgroundColor: SgateColors.surface,
        borderColor: SgateColors.borderSoft,
    },
    avatarText: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    avatarTextInactive: { color: SgateColors.t3 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    cardPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Status pill
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusActive: { backgroundColor: SgateColors.greenBg },
    statusInactive: { backgroundColor: SgateColors.redBg },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold },

    // Divider
    cardDivider: {
        height: 1,
        backgroundColor: SgateColors.borderSoft,
        marginVertical: 14,
    },

    // Bottom
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaChips: { gap: 6, flex: 1 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaChipText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Toggle button
    toggleBtn: {
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    toggleBtnActivate: { backgroundColor: SgateColors.green },
    toggleBtnDeactivate: { backgroundColor: SgateColors.redBg },
    toggleBtnText: { fontSize: 12, fontFamily: SgateFonts.semibold },

    // Chevron
    chevronHint: {
        position: 'absolute',
        right: 8,
        top: '50%',
        marginTop: -10,
    },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },

    // Modal
    modalWrap: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    infoBanner: { backgroundColor: SgateColors.goldPale, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 24 },
    infoBannerText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.goldDeep, flex: 1, lineHeight: 18 },

    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8 },
    formInput: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, marginBottom: 18 },

    formPhoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
    formPhonePrefix: { paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: SgateColors.border, paddingVertical: 15 },
    formPhonePrefixText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    formPhoneInput: { flex: 1, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },

    submitBtn: { backgroundColor: SgateColors.gold, borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
