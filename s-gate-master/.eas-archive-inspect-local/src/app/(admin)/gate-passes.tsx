import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Modal,
    RefreshControl,
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
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { approveGatePass, GatePass, getAllGatePasses, rejectGatePass } from '@/services/gatePass';

// ─── Config ───────────────────────────────────────────────────────────────────
type MIcon = React.ComponentProps<typeof MaterialIcons>['name'];

const TYPE_META: Record<string, { icon: MIcon; bg: string; color: string; label: string }> = {
    guest:        { icon: 'person-outline',       bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Guest' },
    worker:       { icon: 'engineering',          bg: SgateColors.blueBg,   color: SgateColors.blue,     label: 'Worker' },
    material:     { icon: 'inventory-2',          bg: '#F3ECFF',            color: '#7C3AED',            label: 'Material' },
    material_in:  { icon: 'move-to-inbox',        bg: SgateColors.greenBg,  color: SgateColors.green,    label: 'Material In' },
    material_out: { icon: 'outbox',               bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Material Out' },
    move_in:      { icon: 'login',                bg: SgateColors.greenBg,  color: SgateColors.green,    label: 'Move In' },
    move_out:     { icon: 'logout',               bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Move Out' },
    maintenance:  { icon: 'build',                bg: SgateColors.blueBg,   color: SgateColors.blue,     label: 'Maintenance' },
    vehicle:      { icon: 'directions-car',       bg: SgateColors.blueBg,   color: SgateColors.blue,     label: 'Vehicle' },
};

function getTypeMeta(type: string) {
    return TYPE_META[type.toLowerCase()] ?? { icon: 'badge' as MIcon, bg: SgateColors.surface, color: SgateColors.t2, label: type.replace(/_/g, ' ') };
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:  { bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Pending' },
    APPROVED: { bg: SgateColors.greenBg,  color: '#065f46',            label: 'Approved' },
    REJECTED: { bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Rejected' },
    ACTIVE:   { bg: SgateColors.blueBg,   color: SgateColors.blue,     label: 'Active' },
    USED:     { bg: SgateColors.surface,  color: SgateColors.t3,       label: 'Used' },
    EXPIRED:  { bg: SgateColors.surface,  color: SgateColors.t4,       label: 'Expired' },
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] ?? { bg: SgateColors.surface, color: SgateColors.t3, label: status };
}

const FILTERS = [
    { key: 'ALL',      label: 'All' },
    { key: 'PENDING',  label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'EXPIRED',  label: 'Expired' },
];

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 0) return 'Upcoming';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function GatePassesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [passes, setPasses]         = useState<GatePass[]>([]);
    const [isLoading, setIsLoading]   = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter]         = useState('ALL');
    const [rejectId, setRejectId]     = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const loadPasses = useCallback(async () => {
        try {
            const data = await getAllGatePasses();
            setPasses(data);
        } catch (error) {
            console.error('Failed to load gate passes:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadPasses(); }, [loadPasses]));

    const onRefresh = () => { setIsRefreshing(true); loadPasses(); };

    const filtered = passes.filter((p) => {
        if (filter === 'ALL') return true;
        return p.status === filter;
    });

    const pendingCount = passes.filter((p) => p.status === 'PENDING').length;

    const handleApprove = async (id: string) => {
        try {
            await approveGatePass(id);
            AppAlert.show('Success', 'Gate pass approved');
            loadPasses();
        } catch (error: any) {
            AppAlert.show('Error', error.message || 'Failed to approve');
        }
    };

    const handleRejectConfirm = async () => {
        if (!rejectId || !rejectReason.trim()) return;
        try {
            await rejectGatePass(rejectId, rejectReason);
            AppAlert.show('Success', 'Gate pass rejected');
            setRejectId(null);
            setRejectReason('');
            loadPasses();
        } catch (error: any) {
            AppAlert.show('Error', error.message || 'Failed to reject');
        }
    };

    const renderItem = ({ item, index }: { item: GatePass; index: number }) => {
        const meta   = getTypeMeta(item.type);
        const status = getStatusConfig(item.status);
        const isPending = item.status === 'PENDING';

        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 50).springify()}>
                <View style={[styles.card, isPending && styles.cardPending]}>
                    {/* Top row */}
                    <View style={styles.cardTop}>
                        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                            <MaterialIcons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={styles.cardInfo}>
                            <View style={styles.cardTitleRow}>
                                <Text style={styles.typeLabel}>{meta.label}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                </View>
                            </View>
                            {/* Title */}
                            {!!item.title && (
                                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            )}
                            {/* Requester */}
                            <Text style={styles.senderText} numberOfLines={1}>
                                {item.requestedBy?.name ?? 'Unknown'}
                            </Text>
                        </View>
                    </View>

                    {/* Meta row */}
                    <View style={styles.metaRow}>
                        {item.flat && (
                            <>
                                <View style={styles.metaChip}>
                                    <MaterialIcons name="home" size={12} color={SgateColors.t3} />
                                    <Text style={styles.metaChipText}>
                                        {item.flat.block?.name ? `${item.flat.block.name} ` : ''}{item.flat.flatNumber}
                                    </Text>
                                </View>
                            </>
                        )}
                        <View style={styles.metaChip}>
                            <MaterialIcons name="schedule" size={12} color={SgateColors.t3} />
                            <Text style={styles.metaChipText}>
                                {new Date(item.validFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                        <View style={styles.metaChip}>
                            <MaterialIcons name="access-time" size={12} color={SgateColors.t4} />
                            <Text style={[styles.metaChipText, { color: SgateColors.t4 }]}>{timeAgo(item.createdAt)}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    {!!item.description && (
                        <View style={styles.descBox}>
                            <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                        </View>
                    )}

                    {/* Rejection note */}
                    {item.status === 'REJECTED' && (
                        <View style={styles.rejectedBox}>
                            <Text style={styles.rejectedLabel}>Rejected</Text>
                            <Text style={styles.rejectedText}>This pass has been rejected.</Text>
                        </View>
                    )}

                    {/* Action buttons (admin only, pending) */}
                    {isPending && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.rejectBtn}
                                onPress={() => setRejectId(item.id)}
                                activeOpacity={0.75}
                            >
                                <MaterialIcons name="close" size={14} color={SgateColors.red} />
                                <Text style={styles.rejectBtnText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() => handleApprove(item.id)}
                                activeOpacity={0.75}
                            >
                                <MaterialIcons name="check" size={14} color={SgateColors.t1} />
                                <Text style={styles.approveBtnText}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialIcons name="arrow-back" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Gate Passes</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Pass requests & approvals</Text>
                    </View>
                    {pendingCount > 0 && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{pendingCount} PENDING</Text>
                        </View>
                    )}
                </View>

                {/* Filter tabs */}
                <View style={styles.filterRow}>
                    {FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                            onPress={() => setFilter(f.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {isLoading && !isRefreshing ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={SgateColors.gold}
                            colors={[SgateColors.gold]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialIcons name="badge" size={56} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>No gate passes</Text>
                            <Text style={styles.emptySub}>Gate pass requests will appear here.</Text>
                        </View>
                    }
                />
            )}

            {/* ── Rejection Modal ─────────────────────────────────────────── */}
            <Modal visible={!!rejectId} transparent animationType="fade" onRequestClose={() => setRejectId(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <MaterialIcons name="block" size={28} color={SgateColors.red} />
                        </View>
                        <Text style={styles.modalTitle}>Reject Pass</Text>
                        <Text style={styles.modalSub}>Provide a reason for rejecting this gate pass request.</Text>

                        <TextInput
                            style={styles.noteInput}
                            multiline
                            textAlignVertical="top"
                            placeholder="Reason for rejection..."
                            placeholderTextColor={SgateColors.t4}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                onPress={() => { setRejectId(null); setRejectReason(''); }}
                                style={styles.modalCancelBtn}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleRejectConfirm}
                                disabled={!rejectReason.trim()}
                                style={[
                                    styles.modalConfirmBtn,
                                    !rejectReason.trim() && styles.modalConfirmBtnDisabled,
                                ]}
                                activeOpacity={0.75}
                            >
                                <Text style={[
                                    styles.modalConfirmText,
                                    !rejectReason.trim() && { color: SgateColors.t4 },
                                ]}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header (matches emergencies screen)
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
    headerSub:   { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SgateColors.goldDeep },
    liveText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep, letterSpacing: 0.5 },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    listContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },

    // Cards
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 10,
    },
    cardPending: { borderColor: SgateColors.goldDeep + '50', borderWidth: 1.5 },

    cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    typeLabel: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold },
    cardTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    senderText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaChipText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    descBox: {
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    descText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 19 },

    rejectedBox: {
        backgroundColor: SgateColors.redBg,
        borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 6,
        marginBottom: 10,
    },
    rejectedLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.red, marginBottom: 2 },
    rejectedText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2 },

    // Action row
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingTop: 14,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: SgateColors.redBg,
    },
    rejectBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.red },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: SgateColors.gold,
    },
    approveBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Empty
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.7 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 12, marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: SgateColors.card,
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    modalIconWrap: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16, textAlign: 'center' },
    noteInput: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 14,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        height: 100,
        marginBottom: 16,
        width: '100%',
    },
    modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    modalConfirmBtn: {
        flex: 1.2,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.red,
        alignItems: 'center',
    },
    modalConfirmBtnDisabled: { backgroundColor: SgateColors.surface, opacity: 0.6 },
    modalConfirmText: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
