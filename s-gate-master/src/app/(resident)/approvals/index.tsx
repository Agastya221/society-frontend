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
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { useGateStore } from '@/store/useGateStore';
import { gateRequestStatus, type GateStatusTone } from '@/utils/gateRequestStatus';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EntryRequest {
    id: string;
    type: string;
    visitorName?: string;
    providerTag?: string;
    purpose?: string;
    photoKey?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    flat: { flatNumber?: string; number?: string };
    createdAt: string;
    expiresAt: string;
    entryId?: string | null;
    rejectionReason?: string | null;
}

const POLL_MS = 5000;
/** How far back "Recent" decisions go, and how many are shown. */
const RECENT_WINDOW_MS = 12 * 60 * 60 * 1000;
const RECENT_LIMIT = 20;

const TONE_STYLE: Record<GateStatusTone, { bg: string; fg: string }> = {
    pending: { bg: '#FFF4DC', fg: '#B07A00' },
    waiting: { bg: '#E8F1FF', fg: '#2563EB' },
    entered: { bg: '#E5FAF4', fg: '#078463' },
    denied:  { bg: '#FDECEC', fg: '#C62828' },
    ended:   { bg: '#F1F1F1', fg: '#6B7280' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function typeLabel(type: string, providerTag?: string): string {
    const base =
        type === 'DELIVERY_PERSON' || type === 'DELIVERY' ? 'Delivery' :
        type === 'CAB'     ? 'Cab'     :
        type === 'SERVICE' || type === 'VENDOR' ? 'Service' :
        type === 'GUEST' || type === 'VISITOR' ? 'Guest'   :
        type.replace(/_/g, ' ');
    return providerTag ? `${base} • ${providerTag}` : base;
}

function typeIconName(type: string): any {
    if (type?.includes('DELIVERY')) return 'cube-outline';
    if (type === 'CAB')     return 'car-outline';
    if (type === 'SERVICE' || type === 'VENDOR') return 'construct-outline';
    return 'person-outline';
}

function typeColor(type: string): string {
    if (type?.includes('DELIVERY')) return '#F97316';
    if (type === 'CAB')     return '#8B5CF6';
    if (type === 'SERVICE' || type === 'VENDOR') return '#0EA5E9';
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

// ─── Recent decision row ──────────────────────────────────────────────────────
function RecentRow({ item }: { item: EntryRequest }) {
    const status = gateRequestStatus(item);
    const tone = TONE_STYLE[status.tone];
    const color = typeColor(item.type);
    const flat = item.flat?.flatNumber || item.flat?.number;
    return (
        <View style={styles.recentRow} testID={`recent-${item.id}`}>
            <View style={[styles.recentIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={typeIconName(item.type)} size={20} color={color} />
            </View>
            <View style={styles.recentInfo}>
                <Text style={styles.recentName} numberOfLines={1}>
                    {item.visitorName || typeLabel(item.type, item.providerTag)}
                </Text>
                <Text style={styles.recentMeta} numberOfLines={1}>
                    {flat ? `Flat ${flat} · ` : ''}
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {status.detail ? <Text style={styles.recentMeta} numberOfLines={2}>{status.detail}</Text> : null}
            </View>
            <View style={[styles.recentPill, { backgroundColor: tone.bg }]}>
                <Text style={[styles.recentPillText, { color: tone.fg }]} numberOfLines={2}>{status.label}</Text>
            </View>
        </View>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ApprovalsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [requests, setRequests]     = useState<EntryRequest[]>([]);
    const [recent, setRecent]         = useState<EntryRequest[]>([]);
    const gatePushAt = useGateStore((state) => state.gatePushAt);
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
            // One call for both lists: everything for my flats from the last few hours.
            // Pending ones need an answer; the rest show how each request ended up
            // (approved and waiting for the guard, entered, left, expired, denied).
            const since = encodeURIComponent(new Date(Date.now() - RECENT_WINDOW_MS).toISOString());
            const res = await api.get(`/gate/entry-requests?since=${since}&order=newest&limit=100`);
            const payload = res.data?.data;
            const rows: EntryRequest[] = Array.isArray(payload) ? payload : (payload?.entryRequests ?? payload?.entries ?? []);
            const list = Array.isArray(rows) ? rows : [];
            setRequests(list.filter((r) => r.status === 'PENDING'));
            setRecent(list.filter((r) => r.status !== 'PENDING').slice(0, RECENT_LIMIT));
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

    // A gate push (approved / denied / expired / new request) refreshes at once.
    useEffect(() => {
        if (gatePushAt) fetchRequests(true);
    }, [gatePushAt, fetchRequests]);

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
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify()}>
                <View style={[styles.requestCard, isPending && styles.requestCardActive]}>
                    {/* Top: photo + info */}
                    <View style={styles.requestTop}>
                        {/* Photo or type icon */}
                        <PhotoCell id={item.id} type={item.type} photoKey={item.photoKey} color={color} />

                        <View style={styles.requestInfo}>
                            <View style={styles.requestNameRow}>
                                <Text style={[styles.typeLabel, { color }]} numberOfLines={1}>
                                    {item.visitorName || typeLabel(item.type, item.providerTag)}
                                </Text>
                                {!isExpired ? (
                                    <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
                                        <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                                            {minsLeft > 0 ? `${minsLeft}m left` : `${secsLeft}s left`}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusPill, styles.statusExpired]}>
                                        <Text style={styles.statusExpiredText}>Expired</Text>
                                    </View>
                                )}
                            </View>

                            {(item.flat?.flatNumber || item.flat?.number) && (
                                <Text style={styles.flatText}>
                                    {item.visitorName ? `${typeLabel(item.type, item.providerTag)} · ` : ''}Flat {item.flat.flatNumber || item.flat.number}
                                </Text>
                            )}
                            {item.purpose ? <Text style={styles.flatText} numberOfLines={2}>Purpose: {item.purpose}</Text> : null}
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
                                activeOpacity={0.8}
                                disabled={!!actioning}
                            >
                                <Feather name="x" size={15} color={SgateColors.t2} />
                                <Text style={styles.denyText}>Deny</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() => handleApprove(item)}
                                activeOpacity={0.8}
                                disabled={!!actioning}
                            >
                                {actioning === item.id ? (
                                    <ActivityIndicator size="small" color={SgateColors.gold} />
                                ) : (
                                    <>
                                        <Feather name="check" size={15} color={SgateColors.gold} />
                                        <Text style={styles.approveText}>Approve Visitor</Text>
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
            <ScreenHeader title="Visitor Approvals" onBack={() => router.back()} />

            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onRefresh={() => { setRefreshing(true); fetchRequests(); }}
                refreshing={refreshing}
                ListEmptyComponent={
                    <EmptyState
                        iconName="shield-outline"
                        title="All Caught Up!"
                        description="No pending approvals at the moment."
                    />
                }
                ListFooterComponent={recent.length > 0 ? (
                    <View style={styles.recentSection}>
                        <Text style={styles.recentHeading}>Recent</Text>
                        {recent.map((item) => <RecentRow key={item.id} item={item} />)}
                    </View>
                ) : null}
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
                            {rejectTarget?.visitorName || typeLabel(rejectTarget?.type ?? '', rejectTarget?.providerTag)}
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
    recentSection: { marginTop: 20, gap: 10 },
    recentHeading: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.t1, marginBottom: 2 },
    recentRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12,
        borderWidth: 1, borderColor: '#EEECE7',
    },
    recentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    recentInfo: { flex: 1 },
    recentName: { fontFamily: SgateFonts.semibold, fontSize: 14, color: SgateColors.t1 },
    recentMeta: { fontFamily: SgateFonts.regular, fontSize: 12, color: SgateColors.t3, marginTop: 2 },
    recentPill: { maxWidth: 150, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
    recentPillText: { fontFamily: SgateFonts.semibold, fontSize: 11, textAlign: 'center' },
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
        backgroundColor: 'rgba(0,0,0,0.48)',
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
