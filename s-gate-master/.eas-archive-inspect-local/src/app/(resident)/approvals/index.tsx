import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getEntryRequestPhoto } from '@/services/gate.service';
import { ActivityIndicator,
    AppState,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EntryRequest {
    id: string;
    type: string;
    visitorName?: string;
    providerTag?: string;
    photoKey?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    flat: { flatNumber: string };
    createdAt: string;
    expiresAt: string;
}

const POLL_MS = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function typeLabel(type: string, providerTag?: string): string {
    const base =
        type === 'DELIVERY_PERSON' || type === 'DELIVERY' ? 'Delivery' :
        type === 'CAB'     ? 'Cab'     :
        type === 'SERVICE' ? 'Service' :
        type === 'GUEST'   ? 'Guest'   :
        type.replace(/_/g, ' ');
    return providerTag ? `${base} • ${providerTag}` : base;
}

function typeIconName(type: string): any {
    if (type?.includes('DELIVERY')) return 'cube-outline';
    if (type === 'CAB')     return 'car-outline';
    if (type === 'SERVICE') return 'construct-outline';
    return 'person-outline';
}

function typeColor(type: string): string {
    if (type?.includes('DELIVERY')) return '#F97316';
    if (type === 'CAB')     return '#8B5CF6';
    if (type === 'SERVICE') return '#0EA5E9';
    return SgateColors.goldDeep;
}

// ─── Photo cell — lazily loads viewUrl from the photo endpoint ────────────────
function PhotoCell({ id, type, photoKey, color }: { id: string; type: string; photoKey?: string; color: string }) {
    const [viewUrl, setViewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!photoKey) return;
        getEntryRequestPhoto(id)
            .then((r) => { if (r.viewUrl) setViewUrl(r.viewUrl); })
            .catch(() => {});
    }, [id, photoKey]);

    return (
        <View style={[styles.photoWrap, { backgroundColor: color + '18' }]}>
            {viewUrl ? (
                <Image
                    source={{ uri: viewUrl }}
                    style={styles.photo}
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <Ionicons name={typeIconName(type)} size={30} color={color} />
            )}
        </View>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ApprovalsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [requests, setRequests]     = useState<EntryRequest[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<EntryRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actioning, setActioning]   = useState<string | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchRequests = useCallback(async (silent = false) => {
        try {
            if (!silent) setError(null);
            const res = await api.get('/gate/entry-requests?status=PENDING');
            setRequests(res.data?.data || []);
        } catch (err: any) {
            if (!silent) setError(err?.response?.data?.message || 'Failed to fetch pending requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchRequests();
            pollRef.current = setInterval(() => fetchRequests(true), POLL_MS);
            return () => { if (pollRef.current) clearInterval(pollRef.current); };
        }, [fetchRequests])
    );

    // Re-poll when app comes back to foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') fetchRequests(true);
        });
        return () => sub.remove();
    }, [fetchRequests]);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleApprove = async (item: EntryRequest) => {
        if (actioning) return;
        setActioning(item.id);
        const previous = [...requests];
        setRequests((prev) => prev.filter((r) => r.id !== item.id));
        try {
            await api.patch(`/gate/entry-requests/${item.id}/approve`);
        } catch (err: any) {
            setRequests(previous);
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to approve request');
        } finally {
            setActioning(null);
        }
    };

    const handleDenyConfirm = async () => {
        if (!rejectTarget || actioning) return;
        const item = rejectTarget;
        const reason = rejectReason.trim() || 'Not expecting anyone';
        setActioning(item.id);
        setRejectTarget(null);
        setRejectReason('');
        const previous = [...requests];
        setRequests((prev) => prev.filter((r) => r.id !== item.id));
        try {
            await api.patch(`/gate/entry-requests/${item.id}/reject`, { reason });
        } catch (err: any) {
            setRequests(previous);
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to reject request');
        } finally {
            setActioning(null);
        }
    };

    // ── List item ────────────────────────────────────────────────────────────
    const renderItem = ({ item, index }: { item: EntryRequest; index: number }) => {
        const expiresAt = new Date(item.expiresAt).getTime();
        const now       = Date.now();
        const secsLeft  = Math.max(0, Math.floor((expiresAt - now) / 1000));
        const minsLeft  = Math.floor(secsLeft / 60);
        const isExpired = secsLeft <= 0;
        const isPending = item.status === 'PENDING' && !isExpired;
        const color     = typeColor(item.type);
        const isUrgent  = secsLeft < 60 && !isExpired;

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <View style={[styles.requestCard, isPending && styles.requestCardActive]}>
                    {/* Top: photo + info */}
                    <View style={styles.requestTop}>
                        {/* Photo or type icon */}
                        <PhotoCell id={item.id} type={item.type} photoKey={item.photoKey} color={color} />

                        <View style={styles.requestInfo}>
                            <View style={styles.requestNameRow}>
                                <Text style={[styles.typeLabel, { color }]} numberOfLines={1}>
                                    {typeLabel(item.type, item.providerTag)}
                                </Text>
                                {!isExpired ? (
                                    <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
                                        <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                                            {minsLeft > 0 ? `${minsLeft}m` : `${secsLeft}s`}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusPill, styles.statusExpired]}>
                                        <Text style={styles.statusExpiredText}>Expired</Text>
                                    </View>
                                )}
                            </View>

                            {item.flat?.flatNumber && (
                                <Text style={styles.flatText}>Flat {item.flat.flatNumber}</Text>
                            )}
                            <Text style={styles.timeText}>
                                {new Date(item.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        </View>
                    </View>

                    {/* Action buttons — pending only */}
                    {isPending && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.denyBtn}
                                onPress={() => { setRejectTarget(item); setRejectReason(''); }}
                                activeOpacity={0.75}
                                disabled={!!actioning}
                            >
                                <Feather name="x" size={15} color={SgateColors.t2} />
                                <Text style={styles.denyText}>Deny</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() => handleApprove(item)}
                                activeOpacity={0.75}
                                disabled={!!actioning}
                            >
                                {actioning === item.id ? (
                                    <ActivityIndicator size="small" color={SgateColors.gold} />
                                ) : (
                                    <>
                                        <Feather name="check" size={15} color={SgateColors.gold} />
                                        <Text style={styles.approveText}>Allow Entry</Text>
                                    </>
                                )}
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
            <View style={[styles.centerSafe, { paddingTop: insets.top }]}>
                <AppLoader />
            </View>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────────
    if (error && requests.length === 0) {
        return (
            <View style={[styles.centerSafe, { paddingTop: insets.top }]}>
                <Feather name="alert-circle" size={48} color={SgateColors.red} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => { setLoading(true); fetchRequests(); }}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main render ──────────────────────────────────────────────────────────
    return (
        <View style={styles.safe}>
            {/* Header — identical to Deliveries screen */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitor Approvals</Text>
            </View>

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onRefresh={() => { setRefreshing(true); fetchRequests(); }}
                refreshing={refreshing}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Feather name="shield" size={56} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>All Caught Up!</Text>
                        <Text style={styles.emptySub}>No pending approvals at the moment.</Text>
                    </View>
                }
            />

            {/* Deny modal */}
            <Modal
                visible={!!rejectTarget}
                transparent
                animationType="fade"
                onRequestClose={() => setRejectTarget(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Deny Entry?</Text>
                        <Text style={styles.modalSub}>
                            {typeLabel(rejectTarget?.type ?? '', rejectTarget?.providerTag)}
                            {rejectTarget?.flat?.flatNumber ? ` · Flat ${rejectTarget.flat.flatNumber}` : ''}
                        </Text>
                        <TextInput
                            style={styles.modalTextInput}
                            multiline
                            textAlignVertical="top"
                            placeholder="Reason (optional)"
                            placeholderTextColor={SgateColors.t4}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setRejectTarget(null)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalRejectBtn}
                                onPress={handleDenyConfirm}
                            >
                                <Text style={styles.modalRejectText}>Deny</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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

    // ── Header (matches Deliveries screen exactly) ────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginLeft: 12,
        flex: 1,
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
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
            android: { elevation: 2 },
        }),
    },
    requestCardActive: {
        borderColor: SgateColors.border,
    },
    requestTop: {
        flexDirection: 'row',
        padding: 16,
        gap: 14,
        alignItems: 'center',
    },

    // Photo / icon
    photoWrap: {
        width: 64,
        height: 64,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photo: {
        width: 64,
        height: 64,
    },

    // Info column
    requestInfo: {
        flex: 1,
    },
    requestNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
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
    timerBadgeUrgent: {
        backgroundColor: '#FEE2E2',
    },
    timerText: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
    },
    timerTextUrgent: {
        color: '#DC2626',
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

    flatText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
        marginBottom: 2,
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
        paddingVertical: 13,
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
        flex: 1.6,
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    approveText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
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
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 28,
    },
    retryText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
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
