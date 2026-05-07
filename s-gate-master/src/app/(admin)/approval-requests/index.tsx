import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { getAllGatePasses, type GatePass } from '@/services/gatePass';

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
const FILTERS: Filter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];

const FILTER_LABELS: Record<Filter, string> = {
    ALL: 'All',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
};

// ─── Status colors ────────────────────────────────────────────────────────────

function statusStyle(status: string): { bg: string; color: string } {
    switch (status) {
        case 'PENDING':  return { bg: SgateColors.goldPale, color: SgateColors.goldDeep };
        case 'APPROVED': return { bg: SgateColors.greenBg,  color: SgateColors.green };
        case 'REJECTED': return { bg: SgateColors.redBg,    color: SgateColors.red };
        case 'EXPIRED':  return { bg: SgateColors.surface,  color: SgateColors.t3 };
        default:         return { bg: SgateColors.surface,  color: SgateColors.t3 };
    }
}

function typeStyle(type: string): { bg: string; color: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] } {
    const t = type?.toUpperCase() ?? '';
    if (t.includes('MOVE'))       return { bg: '#EDE9FE', color: '#7C3AED', icon: 'truck-outline' };
    if (t.includes('MATERIAL'))   return { bg: SgateColors.blueBg, color: SgateColors.blue, icon: 'package-variant' };
    if (t.includes('MAINTENANCE'))return { bg: SgateColors.greenBg, color: SgateColors.green, icon: 'wrench-outline' };
    if (t.includes('VEHICLE'))    return { bg: SgateColors.goldPale, color: SgateColors.goldDeep, icon: 'car-outline' };
    return { bg: SgateColors.surface, color: SgateColors.t2, icon: 'file-document-outline' };
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ApprovalRequestsListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [requests, setRequests] = useState<GatePass[]>([]);
    const [filter, setFilter]     = useState<Filter>('ALL');
    const [refreshing, setRefreshing] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const data = await getAllGatePasses();
            setRequests(data);
        } catch (err) {
            console.error('Failed to load gate passes:', err);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    // ── Filter ────────────────────────────────────────────────────────────
    const filteredRequests = requests.filter(req =>
        filter === 'ALL' ? true : req.status === filter,
    );

    // ── Render card ───────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item, index }: { item: GatePass; index: number }) => {
            const status = statusStyle(item.status);
            const type   = typeStyle(item.type);

            return (
                <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                    <TouchableOpacity
                        style={S.card}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/(admin)/approval-requests/${item.id}` as any)}
                    >
                        {/* Icon + Info */}
                        <View style={S.cardTop}>
                            <View style={[S.iconBubble, { backgroundColor: type.bg }]}>
                                <MaterialCommunityIcons name={type.icon as any} size={20} color={type.color} />
                            </View>

                            <View style={S.cardInfo}>
                                <View style={S.cardTitleRow}>
                                    <Text style={S.cardTitle} numberOfLines={1}>
                                        {item.title || item.type.replace(/_/g, ' ')}
                                    </Text>
                                    <View style={[S.statusPill, { backgroundColor: status.bg }]}>
                                        <Text style={[S.statusText, { color: status.color }]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                {item.description ? (
                                    <Text style={S.cardDesc} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        {/* Meta row */}
                        <View style={S.metaRow}>
                            <View style={S.metaItem}>
                                <MaterialCommunityIcons name="home-outline" size={12} color={SgateColors.t4} />
                                <Text style={S.metaText}>
                                    {item.flat?.flatNumber ? `Flat ${item.flat.flatNumber}` : 'N/A'}
                                </Text>
                            </View>
                            <View style={S.metaItem}>
                                <MaterialCommunityIcons name="account-outline" size={12} color={SgateColors.t4} />
                                <Text style={S.metaText}>
                                    {item.requestedBy?.name ?? 'N/A'}
                                </Text>
                            </View>
                            <View style={S.metaItem}>
                                <MaterialCommunityIcons name="clock-outline" size={12} color={SgateColors.t4} />
                                <Text style={S.metaText}>
                                    {formatDate(item.createdAt)}
                                </Text>
                            </View>
                        </View>

                        {/* Pending action strip */}
                        {item.status === 'PENDING' && (
                            <View style={S.actionRow}>
                                <TouchableOpacity
                                    style={S.actionSecondary}
                                    onPress={() => {/* Cancel logic */}}
                                    activeOpacity={0.75}
                                >
                                    <MaterialCommunityIcons name="close" size={14} color={SgateColors.t2} />
                                    <Text style={S.actionSecondaryText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={S.actionPrimary}
                                    onPress={() => router.push(`/(admin)/approval-requests/${item.id}` as any)}
                                    activeOpacity={0.75}
                                >
                                    <MaterialCommunityIcons name="eye-outline" size={14} color={SgateColors.t1} />
                                    <Text style={S.actionPrimaryText}>View Details</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            );
        },
        [router],
    );

    // ── Empty state ───────────────────────────────────────────────────────
    const emptyLabel =
        filter === 'ALL' ? 'approval' :
        filter === 'PENDING' ? 'pending' :
        filter === 'APPROVED' ? 'approved' : 'rejected';

    const ListEmpty = useCallback(
        () => (
            <View style={S.emptyWrap}>
                <View style={S.emptyIcon}>
                    <MaterialCommunityIcons name="inbox" size={40} color={SgateColors.t4} />
                </View>
                <Text style={S.emptyTitle}>All caught up</Text>
                <Text style={S.emptySub}>No {emptyLabel} requests at the moment</Text>
            </View>
        ),
        [emptyLabel],
    );

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View style={S.root}>
            {/* ── Header + Filters (matches Resident Notices screen) ──── */}
            <View style={[S.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={S.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={S.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={S.headerTitle} numberOfLines={1}>Approval Requests</Text>
                        <Text style={S.headerSub} numberOfLines={1}>Gate pass & move-in/out approvals</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/approval-requests/create' as any)}
                        accessibilityLabel="Create request"
                        style={S.headerAction}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color={SgateColors.t1} />
                    </TouchableOpacity>
                </View>

                <View style={S.filtersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filtersScroll}>
                        {FILTERS.map(f => {
                            const active = f === filter;
                            return (
                                <TouchableOpacity
                                    key={f}
                                    style={[S.chip, active && S.chipActive]}
                                    onPress={() => setFilter(f)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[S.chipText, active && S.chipTextActive]}>
                                        {FILTER_LABELS[f]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            {/* Persistent spacer — content never touches header */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {/* ── List ─────────────────────────────────────────────────── */}
            <FlatList
                data={filteredRequests}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={[
                    S.listContent,
                    filteredRequests.length === 0 && S.listContentEmpty,
                    { paddingBottom: 80 + insets.bottom },
                ]}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // ── Header & Filters (identical to Resident Notices) ─────────────────
    headerWrapper: {
        backgroundColor: SgateColors.card,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    headerAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },

    filtersContainer: { paddingLeft: 20 },
    filtersScroll: { flexDirection: 'row', gap: 10, paddingRight: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: SgateColors.surface },
    chipActive: { backgroundColor: SgateColors.gold },
    chipText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    chipTextActive: { color: SgateColors.t1, fontFamily: SgateFonts.bold },

    // ── List ─────────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    listContentEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Card ─────────────────────────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        marginBottom: 12,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
            android: { elevation: 2 },
        }),
    },
    cardTop: {
        flexDirection: 'row',
        padding: 16,
        gap: 14,
        alignItems: 'flex-start',
    },
    iconBubble: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        flex: 1,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.3,
    },
    cardDesc: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 18,
    },

    // ── Meta row ─────────────────────────────────────────────────────────
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingBottom: 14,
        gap: 14,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // ── Action row ───────────────────────────────────────────────────────
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingBottom: 14,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingTop: 12,
        marginTop: 0,
    },
    actionSecondary: {
        flex: 1,
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actionSecondaryText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    actionPrimary: {
        flex: 1.6,
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actionPrimaryText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },

    // ── Empty state ──────────────────────────────────────────────────────
    emptyWrap: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 40,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },
});
