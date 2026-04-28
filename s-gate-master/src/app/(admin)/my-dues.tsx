import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Due {
    id: string;
    month: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
    dueDate: string;
    paidAt?: string;
    description?: string;
}

const STATUS_CONFIG = {
    PAID:    { label: 'Paid',    color: SgateColors.green,    bg: SgateColors.greenBg  },
    PENDING: { label: 'Pending', color: SgateColors.goldDeep, bg: SgateColors.goldPale },
    OVERDUE: { label: 'Overdue', color: SgateColors.red,      bg: SgateColors.redBg    },
};

// ─── Mock fallback data (used if API returns 404) ─────────────────────────────
const MOCK_DUES: Due[] = [
    { id: '1', month: 'April 2026',   amount: 2500, status: 'PENDING', dueDate: '2026-04-10', description: 'Monthly maintenance' },
    { id: '2', month: 'March 2026',   amount: 2500, status: 'PAID',    dueDate: '2026-03-10', paidAt: '2026-03-07', description: 'Monthly maintenance' },
    { id: '3', month: 'February 2026',amount: 2500, status: 'PAID',    dueDate: '2026-02-10', paidAt: '2026-02-05', description: 'Monthly maintenance' },
    { id: '4', month: 'January 2026', amount: 2500, status: 'OVERDUE', dueDate: '2026-01-10', description: 'Monthly maintenance' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyDuesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [dues, setDues]           = useState<Due[]>([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isMock, setIsMock]       = useState(false);

    const fetchDues = async () => {
        try {
            const res = await api.get('/resident/dues');
            const data: Due[] = res.data?.data ?? [];
            setDues(data);
            setIsMock(false);
        } catch (err: any) {
            // Fall back to mock data if endpoint not yet available
            setDues(MOCK_DUES);
            setIsMock(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchDues(); }, []));
    const onRefresh = () => { setRefreshing(true); fetchDues(); };

    // Summary stats
    const totalPending = dues.filter(d => d.status === 'PENDING').reduce((s, d) => s + d.amount, 0);
    const totalOverdue = dues.filter(d => d.status === 'OVERDUE').reduce((s, d) => s + d.amount, 0);
    const totalPaid    = dues.filter(d => d.status === 'PAID').reduce((s, d) => s + d.amount, 0);

    const renderDue = ({ item }: { item: Due }) => {
        const conf = STATUS_CONFIG[item.status];
        return (
            <View style={styles.card}>
                <View style={styles.cardLeft}>
                    <View style={[styles.statusDot, { backgroundColor: conf.color }]} />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardMonth}>{item.month}</Text>
                        {item.description && (
                            <Text style={styles.cardDesc}>{item.description}</Text>
                        )}
                        <Text style={styles.cardDate}>
                            {item.status === 'PAID' && item.paidAt
                                ? `Paid on ${item.paidAt}`
                                : `Due by ${item.dueDate}`}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>₹{item.amount.toLocaleString()}</Text>
                    <View style={[styles.badge, { backgroundColor: conf.bg }]}>
                        <Text style={[styles.badgeText, { color: conf.color }]}>{conf.label}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.safe}>
                <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Dues</Text>
                </View>
                <AppLoader />
            </View>
        );
    }

    return (
        <View style={styles.safe}>
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Dues</Text>
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            <FlatList
                data={dues}
                keyExtractor={item => item.id}
                renderItem={renderDue}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        tintColor={SgateColors.gold} colors={[SgateColors.gold]} />
                }
                ListHeaderComponent={
                    <>
                        {/* Summary cards */}
                        <View style={styles.summaryRow}>
                            <SummaryCard label="Pending" amount={totalPending} color={SgateColors.goldDeep} bg={SgateColors.goldPale} />
                            <SummaryCard label="Overdue" amount={totalOverdue} color={SgateColors.red}      bg={SgateColors.redBg}   />
                            <SummaryCard label="Paid"    amount={totalPaid}    color={SgateColors.green}    bg={SgateColors.greenBg} />
                        </View>

                        {isMock && (
                            <View style={styles.mockBanner}>
                                <MaterialCommunityIcons name="information-outline" size={13} color={SgateColors.goldDeep} style={{ marginRight: 6 }} />
                                <Text style={styles.mockBannerText}>Preview data — dues feature coming soon</Text>
                            </View>
                        )}

                        <Text style={styles.sectionLabel}>DUE HISTORY</Text>
                    </>
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="credit-card-outline" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No Dues Found</Text>
                        <Text style={styles.emptySubtitle}>Your maintenance dues will appear here.</Text>
                    </View>
                }
            />
        </View>
    );
}

// Header sub-component removed — inlined above

function SummaryCard({ label, amount, color, bg }: {
    label: string; amount: number; color: string; bg: string;
}) {
    return (
        <View style={[styles.summaryCard, { backgroundColor: bg }]}>
            <Text style={[styles.summaryAmount, { color }]}>₹{amount.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
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
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    spacer: { height: 6 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    listContent: { padding: 16, flexGrow: 1 },

    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
    summaryAmount: { fontSize: 16, fontFamily: SgateFonts.extrabold, letterSpacing: -0.5 },
    summaryLabel: { fontSize: 11, fontFamily: SgateFonts.semibold, marginTop: 2 },

    mockBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.goldPale,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
    },
    mockBannerText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.goldDeep },

    sectionLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        marginBottom: 10,
    },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    cardInfo: { flex: 1 },
    cardMonth: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    cardDesc: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 2 },
    cardDate: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    cardRight: { alignItems: 'flex-end', gap: 6 },
    cardAmount: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.4 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 8 },
    emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },
});
