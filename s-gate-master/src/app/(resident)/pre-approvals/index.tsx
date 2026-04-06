import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { PreApproveSheet } from '../../../components/pre-approvals/PreApproveSheet';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import {
    cancelPreApproved,
    deletePreApproved,
    getPreApprovedList,
} from '../../../services/gate.service';
import type {
    PreApprovedEntry,
    PreApprovedMode,
    PreApprovedScheduleType,
    PreApprovedStatus,
    PreApprovedType,
} from '../../../types/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<PreApprovedType, { label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string; bg: string }> = {
    CAB:      { label: 'Cab',      icon: 'navigation', color: SgateColors.blue,   bg: SgateColors.blueBg  },
    DELIVERY: { label: 'Delivery', icon: 'package',    color: SgateColors.green,  bg: SgateColors.greenBg },
    HELP:     { label: 'Help',     icon: 'tool',       color: SgateColors.gold,   bg: SgateColors.goldPale },
};

const STATUS_CONFIG: Record<PreApprovedStatus, { label: string; color: string; bg: string }> = {
    ACTIVE:    { label: 'Active',    color: SgateColors.green, bg: SgateColors.greenBg },
    EXPIRED:   { label: 'Expired',   color: SgateColors.t3,    bg: SgateColors.surface  },
    USED:      { label: 'Used',      color: SgateColors.blue,  bg: SgateColors.blueBg   },
    CANCELLED: { label: 'Cancelled', color: SgateColors.red,   bg: SgateColors.redBg    },
};

const DAYS_SHORT: Record<string, string> = {
    MON: 'M', TUE: 'T', WED: 'W', THU: 'T', FRI: 'F', SAT: 'S', SUN: 'S',
};

function scheduleLabel(entry: PreApprovedEntry): string {
    const s = entry.schedule;
    if (s.scheduleType === 'ONCE') {
        if (s.date) return `${s.date}  ${s.startTime ?? ''}–${s.endTime ?? ''}`.trim();
        return 'One-time';
    }
    const days = (s.daysOfWeek ?? []).map(d => DAYS_SHORT[d] ?? d).join(' ');
    return `${days}  ${s.timeFrom ?? ''}–${s.timeTo ?? ''}`.trim();
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PreApprovalsScreen() {
    const router = useRouter();
    const [entries, setEntries] = useState<PreApprovedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 3-dot action menu
    const [menuEntry, setMenuEntry] = useState<PreApprovedEntry | null>(null);

    // Pre-approve sheet
    const [sheetVisible, setSheetVisible] = useState(false);

    const fetchEntries = async () => {
        try {
            setError(null);
            const res = await getPreApprovedList({ limit: 50 });
            setEntries(res.entries);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Failed to load pre-approvals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchEntries(); }, []));

    const onRefresh = () => { setRefreshing(true); fetchEntries(); };

    // ── Cancel ───────────────────────────────────────────────────────────────
    const handleCancel = (entry: PreApprovedEntry) => {
        setMenuEntry(null);
        Alert.alert(
            'Cancel Pre-Approval?',
            'The QR code will stop working. You can delete it afterwards.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel It', style: 'destructive',
                    onPress: async () => {
                        try {
                            const updated = await cancelPreApproved(entry.id);
                            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'CANCELLED' } : e));
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel');
                        }
                    },
                },
            ]
        );
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = (entry: PreApprovedEntry) => {
        setMenuEntry(null);
        Alert.alert(
            'Delete Entry?',
            'This will permanently remove this pre-approval.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePreApproved(entry.id);
                            setEntries(prev => prev.filter(e => e.id !== entry.id));
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete');
                        }
                    },
                },
            ]
        );
    };

    // ── Repeat ───────────────────────────────────────────────────────────────
    const handleRepeat = (_entry: PreApprovedEntry) => {
        setMenuEntry(null);
        setSheetVisible(true);
    };

    // ── Render item ──────────────────────────────────────────────────────────
    const renderItem = ({ item }: { item: PreApprovedEntry }) => {
        const typeConf  = TYPE_CONFIG[item.type];
        const statConf  = STATUS_CONFIG[item.status];
        const isActive  = item.status === 'ACTIVE';
        const isCancelled = item.status === 'CANCELLED';
        const schedInfo = scheduleLabel(item);

        return (
            <View style={styles.card}>
                {/* Top row */}
                <View style={styles.cardTop}>
                    {/* Type bubble */}
                    <View style={[styles.typeBubble, { backgroundColor: typeConf.bg }]}>
                        <Feather name={typeConf.icon} size={20} color={typeConf.color} />
                    </View>

                    <View style={styles.cardInfo}>
                        {/* Name + status */}
                        <View style={styles.cardRow}>
                            <Text style={styles.cardName} numberOfLines={1}>
                                {item.meta.visitorName ?? typeConf.label}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: statConf.bg }]}>
                                <Text style={[styles.statusText, { color: statConf.color }]}>{statConf.label}</Text>
                            </View>
                        </View>

                        {/* Type + mode badges */}
                        <View style={styles.badgeRow}>
                            <View style={[styles.typePill, { backgroundColor: typeConf.bg }]}>
                                <Text style={[styles.typePillText, { color: typeConf.color }]}>{typeConf.label}</Text>
                            </View>
                            {item.mode === 'SAFE' && (
                                <View style={[styles.typePill, { backgroundColor: SgateColors.blueBg }]}>
                                    <Feather name="shield" size={10} color={SgateColors.blue} style={{ marginRight: 3 }} />
                                    <Text style={[styles.typePillText, { color: SgateColors.blue }]}>Safe</Text>
                                </View>
                            )}
                            {item.mode === 'SURPRISE' && (
                                <View style={[styles.typePill, { backgroundColor: '#F3EEFF' }]}>
                                    <Text style={[styles.typePillText, { color: '#9B6DFF' }]}>Surprise</Text>
                                </View>
                            )}
                            {item.schedule.scheduleType === 'RECURRING' && (
                                <View style={[styles.typePill, { backgroundColor: SgateColors.surface }]}>
                                    <Feather name="repeat" size={10} color={SgateColors.t3} style={{ marginRight: 3 }} />
                                    <Text style={[styles.typePillText, { color: SgateColors.t3 }]}>Recurring</Text>
                                </View>
                            )}
                        </View>

                        {/* Schedule info */}
                        {!!schedInfo && (
                            <View style={styles.schedRow}>
                                <Feather name="clock" size={11} color={SgateColors.t4} style={{ marginRight: 4 }} />
                                <Text style={styles.schedText} numberOfLines={1}>{schedInfo}</Text>
                            </View>
                        )}
                    </View>

                    {/* 3-dot menu */}
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setMenuEntry(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>

                {/* HELP category */}
                {item.type === 'HELP' && !!item.meta.category && (
                    <View style={styles.categoryRow}>
                        <Text style={styles.categoryText}>
                            {(item.meta.customCategory ?? item.meta.category ?? '').replace(/_/g, ' ')}
                        </Text>
                    </View>
                )}

            </View>
        );
    };

    // ── Loading / error ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pre-Approvals</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={SgateColors.gold} />
                </View>
            </SafeAreaView>
        );
    }

    if (error && entries.length === 0) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pre-Approvals</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <Feather name="wifi-off" size={40} color={SgateColors.t4} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => { setLoading(true); fetchEntries(); }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pre-Approvals</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setSheetVisible(true)}
                >
                    <Feather name="plus" size={20} color={SgateColors.card} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={entries}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onRefresh={onRefresh}
                refreshing={refreshing}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Feather name="shield" size={52} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No Pre-Approvals</Text>
                        <Text style={styles.emptySubtitle}>
                            Create a pre-approval so cabs, deliveries, or helpers can enter without manual approval.
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyBtn}
                            onPress={() => setSheetVisible(true)}
                        >
                            <Text style={styles.emptyBtnText}>Create Pre-Approval</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* ── 3-dot Action Menu Modal ──────────────────────────────────── */}
            <Modal
                visible={!!menuEntry}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuEntry(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuEntry(null)}
                >
                    <View style={styles.actionSheet}>
                        <View style={styles.actionSheetHandle} />
                        <Text style={styles.actionSheetTitle} numberOfLines={1}>
                            {menuEntry?.meta.visitorName ?? TYPE_CONFIG[menuEntry?.type ?? 'CAB']?.label}
                        </Text>

                        {/* Repeat */}
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => menuEntry && handleRepeat(menuEntry)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: SgateColors.blueBg }]}>
                                <Feather name="refresh-cw" size={18} color={SgateColors.blue} />
                            </View>
                            <Text style={styles.actionLabel}>Repeat This</Text>
                            <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>

                        {/* Cancel (only ACTIVE) */}
                        {menuEntry?.status === 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.actionItem}
                                onPress={() => menuEntry && handleCancel(menuEntry)}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: '#FFF3F3' }]}>
                                    <Feather name="x-circle" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.actionLabel, { color: SgateColors.red }]}>Cancel Pre-Approval</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        {/* Delete (only non-ACTIVE) */}
                        {menuEntry?.status !== 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.actionItem}
                                onPress={() => menuEntry && handleDelete(menuEntry)}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: '#FFF3F3' }]}>
                                    <Feather name="trash-2" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.actionLabel, { color: SgateColors.red }]}>Delete Entry</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.actionCancelRow}
                            onPress={() => setMenuEntry(null)}
                        >
                            <Text style={styles.actionCancelText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <PreApproveSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onSuccess={() => { setSheetVisible(false); fetchEntries(); }}
            />
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.black,
        alignItems: 'center',
        justifyContent: 'center',
    },

    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    errorText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    retryBtn: {
        backgroundColor: SgateColors.black,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 4,
    },
    retryBtnText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.card,
    },

    listContent: {
        padding: 16,
        gap: 10,
        flexGrow: 1,
    },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        overflow: 'hidden',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        gap: 12,
    },
    typeBubble: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cardInfo: { flex: 1 },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    cardName: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.6,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginBottom: 6,
    },
    typePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    typePillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },
    schedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    schedText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    menuBtn: {
        paddingTop: 2,
    },
    categoryRow: {
        paddingHorizontal: 14,
        paddingBottom: 12,
    },
    categoryText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        textTransform: 'capitalize',
    },
    // ── Empty ────────────────────────────────────────────────────────────────
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 36,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyBtn: {
        marginTop: 12,
        backgroundColor: SgateColors.black,
        paddingHorizontal: 28,
        paddingVertical: 13,
        borderRadius: 14,
    },
    emptyBtnText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.card,
    },

    // ── Modals ───────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },

    actionSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 32,
    },
    actionSheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    actionSheetTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
        marginBottom: 14,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        gap: 12,
    },
    actionIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        flex: 1,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    actionCancelRow: {
        paddingTop: 16,
        alignItems: 'center',
    },
    actionCancelText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
});
