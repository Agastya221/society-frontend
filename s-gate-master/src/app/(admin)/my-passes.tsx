import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { AppAlert } from '@/components/ui/AppAlert';
import {
    cancelPreApproved,
    deletePreApproved,
    getPreApprovedList,
} from '@/services/gate.service';
import type {
    PreApprovedEntry,
    PreApprovedStatus,
    PreApprovedType,
} from '@/types/api';

// ─── Config ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<PreApprovedType, {
    label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; bg: string;
}> = {
    CAB:      { label: 'Cab',      icon: 'car-outline',     color: SgateColors.blue,      bg: SgateColors.blueBg   },
    DELIVERY: { label: 'Delivery', icon: 'package-variant',  color: SgateColors.green,     bg: SgateColors.greenBg  },
    HELP:     { label: 'Help',     icon: 'wrench-outline',   color: SgateColors.goldDeep,  bg: SgateColors.goldPale },
};

const STATUS_CONFIG: Record<PreApprovedStatus, { label: string; color: string; bg: string }> = {
    ACTIVE:    { label: 'Active',    color: '#059669', bg: '#E6F9F0' },
    EXPIRED:   { label: 'Expired',   color: SgateColors.t3, bg: SgateColors.surface },
    USED:      { label: 'Used',      color: SgateColors.blue, bg: SgateColors.blueBg },
    CANCELLED: { label: 'Cancelled', color: SgateColors.red,  bg: SgateColors.redBg  },
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminMyPassesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [entries, setEntries]     = useState<PreApprovedEntry[]>([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [menuEntry, setMenuEntry] = useState<PreApprovedEntry | null>(null);
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

    const handleCancel = (entry: PreApprovedEntry) => {
        setMenuEntry(null);
        AppAlert.show(
            'Cancel Pre-Approval?',
            'The QR code will stop working.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel It', style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelPreApproved(entry.id);
                            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'CANCELLED' } : e));
                        } catch (err: any) {
                            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to cancel');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = (entry: PreApprovedEntry) => {
        setMenuEntry(null);
        AppAlert.show(
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
                            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to delete');
                        }
                    },
                },
            ]
        );
    };

    // ── Card Renderer ────────────────────────────────────────────────────────
    const renderItem = ({ item, index }: { item: PreApprovedEntry; index: number }) => {
        const typeConf = TYPE_CONFIG[item.type];
        const statConf = STATUS_CONFIG[item.status];
        const schedInfo = scheduleLabel(item);

        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                    <View style={styles.cardRow}>
                        {/* Left: Icon Box */}
                        <View style={[styles.iconBox, { backgroundColor: typeConf.bg }]}>
                            <MaterialCommunityIcons name={typeConf.icon} size={22} color={typeConf.color} />
                        </View>

                        {/* Middle: Info */}
                        <View style={styles.cardMid}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.meta.visitorName ?? typeConf.label}
                            </Text>

                            {/* Tag pills */}
                            <View style={styles.tagRow}>
                                <View style={[styles.tag, { backgroundColor: typeConf.bg }]}>
                                    <Text style={[styles.tagText, { color: typeConf.color }]}>{typeConf.label}</Text>
                                </View>
                                {item.mode === 'SAFE' && (
                                    <View style={[styles.tag, { backgroundColor: SgateColors.greenBg }]}>
                                        <MaterialCommunityIcons name="shield-outline" size={10} color={SgateColors.green} style={{ marginRight: 3 }} />
                                        <Text style={[styles.tagText, { color: SgateColors.green }]}>Safe</Text>
                                    </View>
                                )}
                                {item.schedule.scheduleType === 'RECURRING' && (
                                    <View style={[styles.tag, { backgroundColor: SgateColors.surface }]}>
                                        <MaterialCommunityIcons name="repeat" size={10} color={SgateColors.t3} style={{ marginRight: 3 }} />
                                        <Text style={[styles.tagText, { color: SgateColors.t3 }]}>Recurring</Text>
                                    </View>
                                )}
                            </View>

                            {/* Schedule row */}
                            {!!schedInfo && (
                                <View style={styles.schedRow}>
                                    <MaterialCommunityIcons name="clock-outline" size={12} color={SgateColors.t3} />
                                    <Text style={styles.schedText} numberOfLines={1}>{schedInfo}</Text>
                                </View>
                            )}

                            {/* Help category */}
                            {item.type === 'HELP' && !!item.meta.category && (
                                <View style={styles.schedRow}>
                                    <MaterialCommunityIcons name="tag-outline" size={12} color={SgateColors.t3} />
                                    <Text style={styles.schedText}>
                                        {(item.meta.customCategory ?? item.meta.category ?? '').replace(/_/g, ' ')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Right: Status + Menu */}
                        <View style={styles.cardRight}>
                            <View style={[styles.statusBadge, { backgroundColor: statConf.bg }]}>
                                <Text style={[styles.statusText, { color: statConf.color }]}>{statConf.label}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.menuBtn}
                                onPress={() => setMenuEntry(item)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons name="dots-vertical" size={18} color={SgateColors.t3} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.safe}>
            {/* Header */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Pre-Approvals</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setSheetVisible(true)}>
                    <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <AppLoader />
            ) : (
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
                            <View style={styles.emptyIconWrap}>
                                <MaterialCommunityIcons name="shield-outline" size={28} color={SgateColors.t3} />
                            </View>
                            <Text style={styles.emptyTitle}>No pre-approvals yet</Text>
                            <Text style={styles.emptySub}>
                                Create a new approval to get started
                            </Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => setSheetVisible(true)}>
                                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                                <Text style={styles.emptyBtnText}>Create Pre-Approval</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Action Sheet */}
            <Modal visible={!!menuEntry} transparent animationType="fade" onRequestClose={() => setMenuEntry(null)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuEntry(null)}>
                    <View style={styles.actionSheet}>
                        <View style={styles.actionHandle} />
                        <Text style={styles.actionTitle} numberOfLines={1}>
                            {menuEntry?.meta.visitorName ?? TYPE_CONFIG[menuEntry?.type ?? 'CAB']?.label}
                        </Text>

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setMenuEntry(null); setSheetVisible(true); }}>
                            <View style={[styles.actionIcon, { backgroundColor: SgateColors.blueBg }]}>
                                <MaterialCommunityIcons name="refresh" size={16} color={SgateColors.blue} />
                            </View>
                            <Text style={styles.actionLabel}>Repeat This</Text>
                            <MaterialCommunityIcons name="chevron-right" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>

                        {menuEntry?.status === 'ACTIVE' && (
                            <TouchableOpacity style={styles.actionItem} onPress={() => menuEntry && handleCancel(menuEntry)}>
                                <View style={[styles.actionIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <MaterialCommunityIcons name="close-circle-outline" size={16} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.actionLabel, { color: SgateColors.red }]}>Cancel Pre-Approval</Text>
                                <MaterialCommunityIcons name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        {menuEntry?.status !== 'ACTIVE' && (
                            <TouchableOpacity style={styles.actionItem} onPress={() => menuEntry && handleDelete(menuEntry)}>
                                <View style={[styles.actionIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.actionLabel, { color: SgateColors.red }]}>Delete Entry</Text>
                                <MaterialCommunityIcons name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.dismissRow} onPress={() => setMenuEntry(null)}>
                            <Text style={styles.dismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <PreApproveSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onSuccess={() => { setSheetVisible(false); fetchEntries(); }}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    // ── Header ───────────────────────────────────────────────────────────
    headerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginLeft: 12,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.t1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── List ─────────────────────────────────────────────────────────────
    listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },

    // ── Card ─────────────────────────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardMid: { flex: 1 },
    cardTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 6 },

    // Tags
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 26,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    tagText: { fontSize: 11, fontFamily: SgateFonts.semibold },

    // Schedule
    schedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    schedText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Right
    cardRight: { alignItems: 'flex-end', gap: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.3 },
    menuBtn: { padding: 2 },

    // ── Empty State ──────────────────────────────────────────────────────
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, textAlign: 'center', marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        backgroundColor: SgateColors.t1,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
    },
    emptyBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.card },

    // ── Action Sheet ─────────────────────────────────────────────────────
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    actionSheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 32,
    },
    actionHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    actionTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3, marginBottom: 14 },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
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
    actionLabel: { flex: 1, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    dismissRow: { paddingTop: 16, alignItems: 'center' },
    dismissText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
});
