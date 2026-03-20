import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface EntryRequest {
    id: string;
    type: string;
    visitorName: string;
    visitorPhone?: string;
    providerTag?: string;
    photoKey?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    flat: { flatNumber: string };
    createdAt: string;
    expiresAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ApprovalsScreen() {
    const router = useRouter();
    const [requests, setRequests]     = useState<EntryRequest[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError]           = useState<string | null>(null);

    const [selectedRequest, setSelectedRequest] = useState<EntryRequest | null>(null);
    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        type: 'APPROVE' | 'REJECT';
    }>({ visible: false, type: 'APPROVE' });
    const [rejectReason, setRejectReason] = useState('');

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchRequests = async () => {
        try {
            setError(null);
            const res = await api.get('/gate/requests?status=PENDING');
            setRequests(res.data?.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || 'Failed to fetch pending requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchRequests();
            const interval = setInterval(fetchRequests, 60000);
            return () => clearInterval(interval);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleAction = (request: EntryRequest, type: 'APPROVE' | 'REJECT') => {
        setSelectedRequest(request);
        setRejectReason('');
        setModalConfig({ visible: true, type });
    };

    const confirmApprove = async () => {
        if (!selectedRequest) return;
        const requestId = selectedRequest.id;
        const previous = [...requests];
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setModalConfig({ ...modalConfig, visible: false });
        setSelectedRequest(null);
        try {
            await api.patch(`/gate/requests/${requestId}/approve`);
        } catch (err: any) {
            setRequests(previous);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to approve request');
        }
    };

    const confirmReject = async () => {
        if (!selectedRequest) return;
        const requestId = selectedRequest.id;
        const reason = rejectReason.trim() || 'Not expecting anyone';
        const previous = [...requests];
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setModalConfig({ ...modalConfig, visible: false });
        setSelectedRequest(null);
        setRejectReason('');
        try {
            await api.patch(`/gate/requests/${requestId}/reject`, { reason });
        } catch (err: any) {
            setRequests(previous);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to reject request');
        }
    };

    // ── List item ────────────────────────────────────────────────────────────
    const renderItem = ({ item, index }: { item: EntryRequest; index: number }) => {
        const expiresAt = new Date(item.expiresAt).getTime();
        const now = Date.now();
        const minsLeft = Math.max(0, Math.floor((expiresAt - now) / 60000));
        const initials = item.visitorName
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <View style={styles.requestCard}>
                    {/* Top: visitor info */}
                    <View style={styles.requestTop}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.requestInfo}>
                            <View style={styles.requestNameRow}>
                                <Text style={styles.requestName} numberOfLines={1}>
                                    {item.visitorName}
                                </Text>
                                {minsLeft > 0 ? (
                                    <View style={styles.timerBadge}>
                                        <Text style={styles.timerText}>{minsLeft}m left</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusPill, styles.statusExpired]}>
                                        <Text style={styles.statusExpiredText}>Expired</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.requestMeta}>
                                <View style={styles.typePill}>
                                    <Text style={styles.typePillText}>
                                        {item.type.replace(/_/g, ' ')}
                                    </Text>
                                </View>
                                {item.flat?.flatNumber && (
                                    <Text style={styles.flatText}>{item.flat.flatNumber}</Text>
                                )}
                            </View>
                            <Text style={styles.timeText}>
                                {new Date(item.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        </View>
                    </View>

                    {/* Bottom: action buttons */}
                    {item.status === 'PENDING' && minsLeft > 0 && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.denyBtn}
                                onPress={() => handleAction(item, 'REJECT')}
                                activeOpacity={0.75}
                            >
                                <Feather name="x" size={15} color={SgateColors.t2} />
                                <Text style={styles.denyText}>Deny</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() => handleAction(item, 'APPROVE')}
                                activeOpacity={0.75}
                            >
                                <Feather name="check" size={15} color={SgateColors.gold} />
                                <Text style={styles.approveText}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView edges={['top']} style={styles.centerSafe}>
                <ActivityIndicator size="large" color={SgateColors.gold} />
            </SafeAreaView>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────────
    if (error && requests.length === 0) {
        return (
            <SafeAreaView edges={['top']} style={styles.centerSafe}>
                <Feather name="alert-circle" size={48} color={SgateColors.red} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => { setLoading(true); fetchRequests(); }}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Main render ──────────────────────────────────────────────────────────
    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitor Approvals</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onRefresh={onRefresh}
                refreshing={refreshing}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Feather name="shield" size={56} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>All Caught Up!</Text>
                        <Text style={styles.emptySub}>No pending approvals at the moment.</Text>
                    </View>
                }
            />

            {/* ── Approve / Reject modal ──────────────────────────────────────── */}
            <Modal
                visible={modalConfig.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalConfig({ ...modalConfig, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {modalConfig.type === 'APPROVE' ? (
                            <>
                                <Text style={styles.modalTitle}>Approve Entry?</Text>
                                <Text style={styles.modalSub}>
                                    Allow {selectedRequest?.visitorName} to enter?
                                </Text>
                                <View style={styles.modalBtnRow}>
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setModalConfig({ ...modalConfig, visible: false })}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalApproveBtn}
                                        onPress={confirmApprove}
                                    >
                                        <Text style={styles.modalApproveText}>Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Reject Entry?</Text>
                                <Text style={styles.modalSub}>
                                    Provide a reason for rejecting {selectedRequest?.visitorName}.
                                </Text>
                                <TextInput
                                    style={styles.modalTextInput}
                                    multiline
                                    textAlignVertical="top"
                                    placeholder="e.g. Not expecting anyone"
                                    placeholderTextColor={SgateColors.t4}
                                    value={rejectReason}
                                    onChangeText={setRejectReason}
                                />
                                <View style={styles.modalBtnRow}>
                                    <TouchableOpacity
                                        style={styles.modalCancelBtn}
                                        onPress={() => setModalConfig({ ...modalConfig, visible: false })}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalRejectBtn}
                                        onPress={confirmReject}
                                    >
                                        <Text style={styles.modalRejectText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    centerSafe: {
        flex: 1,
        backgroundColor: SgateColors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 12,
    },

    // ── Header ───────────────────────────────────────────────────────────────
    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },

    // ── List ─────────────────────────────────────────────────────────────────
    listContent: {
        padding: 20,
        paddingBottom: 100,
        flexGrow: 1,
    },

    // ── Request card ─────────────────────────────────────────────────────────
    requestCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        marginBottom: 10,
        overflow: 'hidden',
    },
    requestTop: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        alignItems: 'flex-start',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
    requestInfo: {
        flex: 1,
    },
    requestNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    requestName: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        flex: 1,
        marginRight: 8,
    },

    // Timer badge
    timerBadge: {
        backgroundColor: SgateColors.redBg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    timerText: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
    },

    // Status pill
    statusPill: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusExpired: {
        backgroundColor: SgateColors.surface,
    },
    statusExpiredText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },

    // Type pill & meta
    requestMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    typePill: {
        backgroundColor: SgateColors.surface,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    typePillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
        textTransform: 'capitalize',
    },
    flatText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
    },
    timeText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
    },

    // ── Action row ───────────────────────────────────────────────────────────
    actionRow: {
        flexDirection: 'row',
        padding: 12,
        paddingTop: 0,
        gap: 8,
    },
    denyBtn: {
        flex: 1,
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    denyText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    approveBtn: {
        flex: 1.4,
        backgroundColor: SgateColors.black,
        borderRadius: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    approveText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: '#FFFFFF',
    },

    // ── Empty state ──────────────────────────────────────────────────────────
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        opacity: 0.7,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginTop: 12,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // ── Error state ──────────────────────────────────────────────────────────
    errorText: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: SgateColors.black,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 28,
    },
    retryText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },

    // ── Modal ────────────────────────────────────────────────────────────────
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
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 6,
    },
    modalSub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 20,
        lineHeight: 20,
    },
    modalTextInput: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 14,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        height: 96,
        marginBottom: 16,
    },
    modalBtnRow: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    modalApproveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.green,
        alignItems: 'center',
    },
    modalApproveText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
    modalRejectBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.red,
        alignItems: 'center',
    },
    modalRejectText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
});
