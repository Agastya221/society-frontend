import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
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
import { SourceBadge } from '../../components/SourceBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { approveGatePass, GatePass, getAllGatePasses, rejectGatePass } from '../../services/gatePass';

const TYPE_META: Record<string, { bg: string; color: string; label: string }> = {
    guest:        { bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'GUEST' },
    worker:       { bg: SgateColors.blueBg,   color: SgateColors.blue,    label: 'WORKER' },
    material:     { bg: '#F3ECFF',            color: '#7C3AED',           label: 'MATERIAL' },
    material_in:  { bg: '#F3ECFF',            color: '#7C3AED',           label: 'MATERIAL IN' },
    material_out: { bg: '#FFF4E6',            color: '#D97706',           label: 'MATERIAL OUT' },
};

function getTypeMeta(type: string) {
    return TYPE_META[type.toLowerCase()] ?? { bg: SgateColors.blueBg, color: SgateColors.blue, label: type.replace('_', ' ').toUpperCase() };
}

export default function GatePassesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const loadPasses = useCallback(async () => {
        try {
            const data = await getAllGatePasses();
            setPasses(data);
        } catch (error) {
            console.error('Failed to load gate passes:', error);
            Alert.alert('Error', 'Failed to load gate passes');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadPasses();
        }, [loadPasses])
    );

    const onRefresh = () => {
        setIsRefreshing(true);
        loadPasses();
    };

    const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected') => {
        try {
            if (status === 'Approved') {
                await approveGatePass(id);
                Alert.alert('Success', 'Gate pass approved successfully');
            } else {
                if (!rejectReason.trim()) {
                    Alert.alert('Error', 'Please provide a reason for rejection');
                    return;
                }
                await rejectGatePass(id, rejectReason);
                Alert.alert('Success', 'Gate pass rejected');
            }
            
            // Refresh list
            loadPasses();

            if (status === 'Rejected') {
                setRejectId(null);
                setRejectReason('');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || `Failed to ${status.toLowerCase()} gate pass`);
        }
    };

    if (isLoading && !isRefreshing) {
        return (
            <View style={[styles.centerSafe, { paddingTop: insets.top }]}>
                <AppLoader />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gate Passes</Text>
            </View>

            {/* ── Spacer ─────────────────────────────────────────────────── */}
            <View style={styles.spacer} />

            <FlatList
                data={passes}
                keyExtractor={item => item.id}
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
                        <MaterialCommunityIcons name="inbox-outline" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No gate passes found</Text>
                        <Text style={styles.emptySub}>Gate pass requests will appear here.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const meta = getTypeMeta(item.type);
                    return (
                        <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 50).springify()}>
                            <View style={styles.card}>
                                {/* Top row: badges */}
                                <View style={styles.cardBadgeRow}>
                                    <View style={styles.badgeGroup}>
                                        <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                                            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                                        </View>
                                        <SourceBadge source={item.societyId ? "RESIDENT" : "ADMIN"} />
                                    </View>
                                    <StatusBadge status={item.status} />
                                </View>

                                {/* Content */}
                                <View style={styles.cardContent}>
                                    {item.title ? (
                                        <Text style={styles.cardTitle}>{item.title}</Text>
                                    ) : null}

                                    {item.requestedBy && (
                                        <Text style={[styles.cardName, !item.title && styles.cardNameLarge]}>
                                            {item.requestedBy.name}
                                        </Text>
                                    )}

                                    <View style={styles.cardMetaRow}>
                                        {item.flat ? (
                                            <>
                                                <MaterialCommunityIcons name="home-outline" size={14} color={SgateColors.t3} />
                                                <Text style={styles.cardMetaText}>
                                                    {item.flat.block?.name || ''} {item.flat.flatNumber}
                                                </Text>
                                                <Text style={styles.cardMetaDot}>•</Text>
                                            </>
                                        ) : null}
                                        <MaterialCommunityIcons name="clock-outline" size={14} color={SgateColors.t3} />
                                        <Text style={styles.cardMetaText}>
                                            {new Date(item.validFrom).toLocaleDateString()}
                                        </Text>
                                    </View>

                                    {item.description ? (
                                        <View style={styles.descBox}>
                                            <Text style={styles.descText}>{item.description}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Rejection Reason Display */}
                                {item.status === 'REJECTED' && (
                                    <View style={styles.rejectedBox}>
                                        <Text style={styles.rejectedLabel}>STATUS</Text>
                                        <Text style={styles.rejectedText}>Pass has been rejected.</Text>
                                    </View>
                                )}

                                {/* Action buttons */}
                                {item.status === 'PENDING' && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.rejectBtn}
                                            onPress={() => setRejectId(item.id)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={styles.rejectBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.approveBtn}
                                            onPress={() => handleStatusUpdate(item.id, 'Approved')}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={styles.approveBtnText}>Approve</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                    );
                }}
            />

            {/* ── Rejection Modal ─────────────────────────────────────────── */}
            <Modal visible={!!rejectId} transparent animationType="fade" onRequestClose={() => setRejectId(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Reject Request</Text>
                        <Text style={styles.modalSub}>Please provide a reason for this rejection.</Text>

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
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => rejectId && handleStatusUpdate(rejectId, 'Rejected')}
                                disabled={!rejectReason.trim()}
                                style={[
                                    styles.modalConfirmBtn,
                                    !rejectReason.trim() && styles.modalConfirmBtnDisabled,
                                ]}
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
    centerSafe: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },

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

    listContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },

    // Card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 12,
    },

    cardBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    badgeGroup: { flexDirection: 'row', gap: 6 },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typeBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },

    cardContent: { marginBottom: 12 },
    cardTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    cardName: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cardNameLarge: { fontSize: 18, marginBottom: 4 },

    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
    cardMetaText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    cardMetaDot: { fontSize: 12, color: SgateColors.t4 },

    descBox: {
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 12,
        marginTop: 10,
    },
    descText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 20 },

    // Rejected
    rejectedBox: {
        backgroundColor: SgateColors.redBg,
        borderRadius: 14,
        padding: 12,
        marginBottom: 4,
    },
    rejectedLabel: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.red, letterSpacing: 0.5, marginBottom: 2 },
    rejectedText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.red },

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
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.red },
    approveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

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
    },
    modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16 },
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
    },
    modalBtnRow: { flexDirection: 'row', gap: 10 },
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
