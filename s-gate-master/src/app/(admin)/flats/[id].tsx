import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';

interface ResidentRecord {
    id: string;
    flatId: string;
    user: { name: string; phone: string };
    residentType: string;
}

interface FlatData {
    id: string;
    number: string;
    block: string;
    floor: string;
    ownerName: string;
}

export default function FlatDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(s => s.user);
    const [flat, setFlat] = useState<FlatData | null>(null);
    const [residents, setResidents] = useState<ResidentRecord[]>([]);

    useEffect(() => {
        if (!id || !user?.societyId) return;

        // Fetch flat details
        const fetchFlat = async () => {
            try {
                const blocksRes = await api.get(
                    `/resident/onboarding/societies/${user.societyId}/blocks`
                );
                const blocks = blocksRes.data?.data ?? [];
                for (const block of blocks) {
                    try {
                        const flatsRes = await api.get(
                            `/resident/onboarding/societies/${user.societyId}/blocks/${block.id}/flats`
                        );
                        const rawFlats = flatsRes.data?.data ?? [];
                        const found = rawFlats.find((f: any) => f.id === id);
                        if (found) {
                            setFlat({
                                id: found.id,
                                number: found.number || found.flat_number || found.flatNumber || found.name || '',
                                block: block.name,
                                floor: String(found.floor ?? ''),
                                ownerName: found.ownerName || found.owner_name || '',
                            });
                            break;
                        }
                    } catch { /* skip */ }
                }
            } catch (err) {
                console.error('[FlatDetail] Failed to fetch flat:', err);
            }
        };

        // Fetch residents
        const fetchResidents = async () => {
            try {
                const res = await api.get('/resident/onboarding/admin/pending', {
                    params: { status: 'APPROVED', page: 1, limit: 50 },
                });
                const all: ResidentRecord[] = res.data?.data ?? [];
                setResidents(all.filter(r => r.flatId === id));
            } catch (err) {
                console.error('[FlatDetail] Failed to fetch residents:', err);
            }
        };

        fetchFlat();
        fetchResidents();
    }, [id, user?.societyId]);

    const flatNumber = flat?.number || id?.slice(0, 6)?.toUpperCase() || '—';
    const flatBlock = flat?.block || '—';
    const flatFloor = flat?.floor || '';
    const ownerName = flat?.ownerName || '';

    const handleInvite = () => {
        AppAlert.show('Coming Soon', 'Resident invitation will be available shortly.');
    };

    const handleHistory = () => {
        AppAlert.show('Coming Soon', 'Entry history will be available shortly.');
    };

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Flat {flatNumber}</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>{flatBlock} Block</Text>
                </View>
                <TouchableOpacity style={styles.headerActionBtn}>
                    <MaterialCommunityIcons name="dots-vertical" size={20} color={SgateColors.t2} />
                </TouchableOpacity>
            </View>

            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── Hero Card ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(0).springify()}>
                    <View style={styles.heroCard}>
                        <View style={styles.heroAvatarCircle}>
                            <Text style={styles.heroAvatarText}>
                                {flatNumber.length > 3 ? flatNumber.slice(0, 3) : flatNumber}
                            </Text>
                        </View>
                        <Text style={styles.heroTitle}>Flat {flatNumber}</Text>
                        <Text style={styles.heroSubtitle}>
                            {flatBlock} Block{flatFloor ? ` · Floor ${flatFloor}` : ''}
                        </Text>
                        {ownerName ? (
                            <View style={styles.ownerBadge}>
                                <MaterialCommunityIcons name="account-outline" size={14} color={SgateColors.goldDeep} />
                                <Text style={styles.ownerBadgeText}>{ownerName}</Text>
                            </View>
                        ) : (
                            <View style={[styles.ownerBadge, { backgroundColor: SgateColors.surface }]}>
                                <MaterialCommunityIcons name="account-off-outline" size={14} color={SgateColors.t4} />
                                <Text style={[styles.ownerBadgeText, { color: SgateColors.t4 }]}>Unassigned</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* ── Stats Strip ────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(60).springify()}>
                    <View style={styles.statsStrip}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconWrap, { backgroundColor: SgateColors.goldPale }]}>
                                <MaterialCommunityIcons name="credit-card-outline" size={16} color={SgateColors.goldDeep} />
                            </View>
                            <Text style={styles.statValue}>N/A</Text>
                            <Text style={styles.statLabel}>Payment</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIconWrap, { backgroundColor: SgateColors.blueBg }]}>
                                <MaterialCommunityIcons name="car-outline" size={16} color={SgateColors.blue} />
                            </View>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Vehicles</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIconWrap, { backgroundColor: '#F3E8FF' }]}>
                                <MaterialCommunityIcons name="account-group-outline" size={16} color={SgateColors.violet} />
                            </View>
                            <Text style={styles.statValue}>{residents.length}</Text>
                            <Text style={styles.statLabel}>Residents</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ── Residents Section ──────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(120).springify()}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Residents</Text>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{residents.length}</Text>
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        {residents.length === 0 ? (
                            <View style={styles.emptyBlock}>
                                <View style={styles.emptyIconWrap}>
                                    <MaterialCommunityIcons name="account-off-outline" size={28} color={SgateColors.t4} />
                                </View>
                                <Text style={styles.emptyTitle}>No residents yet</Text>
                                <Text style={styles.emptySub}>Invite residents to this flat to get started.</Text>
                            </View>
                        ) : (
                            residents.map((resident, index) => (
                                <View
                                    key={resident.id}
                                    style={[
                                        styles.residentRow,
                                        index < residents.length - 1 && styles.residentRowBorder,
                                    ]}
                                >
                                    <View style={styles.residentAvatar}>
                                        <Text style={styles.residentAvatarText}>
                                            {resident.user.name?.charAt(0)?.toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                    <View style={styles.residentInfo}>
                                        <Text style={styles.residentName}>{resident.user.name}</Text>
                                        <Text style={styles.residentSub}>{resident.residentType} · {resident.user.phone}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t4} />
                                </View>
                            ))
                        )}
                    </View>
                </Animated.View>

                {/* ── Actions ────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(180).springify()}>
                    <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={handleInvite}>
                        <MaterialCommunityIcons name="account-plus-outline" size={18} color={SgateColors.t1} />
                        <Text style={styles.primaryBtnText}>Invite New Resident</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={handleHistory}>
                        <MaterialCommunityIcons name="history" size={18} color={SgateColors.t2} />
                        <Text style={styles.secondaryBtnText}>View Entry History</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header
    headerWrapper: {
        backgroundColor: SgateColors.card,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    headerActionBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },

    scrollContent: { padding: 20 },

    // Hero Card
    heroCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 24,
        alignItems: 'center',
        marginBottom: 12,
    },
    heroAvatarCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    heroAvatarText: { fontSize: 20, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    heroTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    heroSubtitle: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 12 },
    ownerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: SgateColors.goldPale,
        borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    ownerBadgeText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },

    // Stats
    statsStrip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingVertical: 16, paddingHorizontal: 8,
        marginBottom: 20,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statIconWrap: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    statValue: { fontSize: 16, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    statLabel: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t4, letterSpacing: 0.3 },
    statDivider: { width: 1, height: 40, backgroundColor: SgateColors.borderSoft },

    // Section
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    sectionBadge: {
        backgroundColor: SgateColors.surface,
        borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    sectionBadgeText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t4 },

    sectionCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 20,
    },

    // Resident row
    residentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    residentRowBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    residentAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
    },
    residentAvatarText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    residentInfo: { flex: 1 },
    residentName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    residentSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // Empty
    emptyBlock: { alignItems: 'center', paddingVertical: 20 },
    emptyIconWrap: {
        width: 56, height: 56, borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2, marginBottom: 4 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    // Buttons
    primaryBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 10,
    },
    primaryBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    secondaryBtn: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
