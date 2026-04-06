import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const PHOTO_SIZE = SW * 0.42;
const POLL_MS    = 3000;
const TIMEOUT_S  = 45;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'waiting' | 'timeout' | 'approved' | 'denied';

function typeDisplayLabel(type?: string): string {
    if (!type) return 'Visitor';
    if (type.includes('DELIVERY')) return 'Delivery';
    if (type === 'CAB')     return 'Cab';
    if (type === 'SERVICE') return 'Service';
    if (type === 'GUEST')   return 'Guest';
    return type.replace(/_/g, ' ');
}

function resolvePhase(status: string): Phase | null {
    const s = status?.toUpperCase();
    if (['APPROVED', 'INSIDE', 'CHECKED_IN'].includes(s)) return 'approved';
    if (['REJECTED', 'DENIED'].includes(s))               return 'denied';
    return null;
}

// ─── Pulsing ring ─────────────────────────────────────────────────────────────

function PulseRing({ delay, color }: { delay: number; color: string }) {
    const scale   = useSharedValue(1);
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1,    { duration: 0 }),
                withTiming(1.55, { duration: 1400, easing: Easing.out(Easing.ease) }),
            ),
            -1, false, undefined, delay,
        );
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.5, { duration: 0 }),
                withTiming(0,   { duration: 1400, easing: Easing.out(Easing.ease) }),
            ),
            -1, false, undefined, delay,
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: PHOTO_SIZE, height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
        borderWidth: 2, borderColor: color,
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={style} />;
}

// ─── No-ID error state ────────────────────────────────────────────────────────

function NoIdError({ onBack }: { onBack: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[S.root, { paddingTop: insets.top + 20, justifyContent: 'center' }]}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
            <Text style={[S.statusText, { marginTop: 16 }]}>Entry submitted</Text>
            <Text style={[S.statusSub, { marginTop: 6, paddingHorizontal: 40, textAlign: 'center' }]}>
                Could not track this request — resident was notified.
                Check the Approvals screen for the response.
            </Text>
            <Pressable style={[S.nextVisitorBtn, { marginTop: 32 }]} onPress={onBack}>
                <Text style={S.nextVisitorText}>Go to Approvals</Text>
            </Pressable>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EntryWaitingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        id: string; flat: string; name: string; type: string; photo: string;
    }>();

    const { id, flat, name, type, photo } = params;
    const photoUri = photo && photo.length > 0 ? decodeURIComponent(photo) : null;

    const [phase,     setPhase]     = useState<Phase>('waiting');
    const [elapsed,   setElapsed]   = useState(0);
    const [actioning, setActioning] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const settled   = useRef(false);

    // ── Fix #2: no entry ID ───────────────────────────────────────────────────
    if (!id) {
        return <NoIdError onBack={() => router.replace('/approvals' as any)} />;
    }

    const stopAll = useCallback(() => {
        if (pollRef.current)  clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const settle = useCallback((p: Phase) => {
        if (settled.current) return;
        settled.current = true;
        stopAll();
        setPhase(p);
        Haptics.notificationAsync(
            p === 'approved'
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Error,
        );
    }, [stopAll]);

    // ── Poll single entry / fallback to list ──────────────────────────────────
    const poll = useCallback(async () => {
        if (settled.current) return;
        try {
            const res = await api.get(`/api/v1/gate/entry-requests/${id}`);
            const status: string =
                res.data?.data?.status ?? res.data?.data?.entryRequest?.status ?? '';
            const resolved = resolvePhase(status);
            if (resolved) settle(resolved);
        } catch {
            // Fallback: check pending list
            try {
                const listRes = await api.get('/api/v1/gate/entry-requests?status=PENDING');
                const requests: any[] =
                    listRes.data?.data?.entries ?? listRes.data?.data ?? [];
                const match = requests.find((r: any) => r.id === id);
                if (match) {
                    const resolved = resolvePhase(match.status);
                    if (resolved) settle(resolved);
                } else {
                    // No longer pending → was approved/denied, check entries log
                    const entriesRes = await api.get('/api/v1/gate/entries?limit=20&page=1');
                    const entries: any[] = entriesRes.data?.data?.entries ?? [];
                    const found = entries.find((e: any) => e.entryRequestId === id || e.id === id);
                    if (found) {
                        const resolved = resolvePhase(found.status);
                        if (resolved) settle(resolved);
                    }
                }
            } catch { /* ignore */ }
        }
    }, [id, settle]);

    // ── Timer ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setElapsed(prev => {
                const next = prev + 1;
                if (next >= TIMEOUT_S && !settled.current) {
                    clearInterval(timerRef.current!);
                    setPhase('timeout');
                }
                return next;
            });
        }, 1000);
        return stopAll;
    }, []);

    // ── Polling interval ──────────────────────────────────────────────────────
    useEffect(() => {
        poll();
        pollRef.current = setInterval(poll, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [poll]);

    // ── Fix #4: AppState — resume polling when app comes to foreground ────────
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && !settled.current) poll();
        });
        return () => sub.remove();
    }, [poll]);

    // ── Fix #3: Cancel request when X is tapped ───────────────────────────────
    const handleClose = () => {
        Alert.alert(
            'Cancel Request?',
            'This will cancel the approval request for this visitor.',
            [
                { text: 'Keep Waiting', style: 'cancel' },
                {
                    text: 'Cancel Request', style: 'destructive',
                    onPress: async () => {
                        setCancelling(true);
                        try {
                            await api.patch(`/api/v1/gate/entry-requests/${id}/reject`);
                        } catch { /* best-effort */ } finally {
                            setCancelling(false);
                            stopAll();
                            router.replace('/');
                        }
                    },
                },
            ],
        );
    };

    // ── Fix #1: Next visitor — leave request pending, go to new entry ─────────
    const handleNextVisitor = () => {
        // Do NOT cancel — resident is still being notified.
        // The result will show up in the Approvals screen.
        stopAll();
        router.replace('/new-entry' as any);
    };

    // ── Override actions ──────────────────────────────────────────────────────
    const handleAllow = async () => {
        if (actioning) return;
        setActioning(true);
        try {
            await api.patch(`/api/v1/gate/entry-requests/${id}/approve`);
            settle('approved');
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setActioning(false);
        }
    };

    const handleDeny = async () => {
        if (actioning) return;
        setActioning(true);
        try {
            await api.patch(`/api/v1/gate/entry-requests/${id}/reject`);
            settle('denied');
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setActioning(false);
        }
    };

    const goNewEntry  = () => router.replace('/new-entry' as any);
    const goDashboard = () => router.replace('/');

    // ── Result screens ────────────────────────────────────────────────────────
    if (phase === 'approved') {
        return (
            <Animated.View entering={FadeIn.duration(300)} style={[S.resultRoot, { backgroundColor: '#059669' }]}>
                <View style={[S.resultContent, { paddingTop: insets.top + 24 }]}>
                    <Ionicons name="checkmark-circle" size={96} color="#fff" />
                    <Text style={S.resultTitle}>Entry Approved</Text>
                    <Text style={S.resultSub}>{typeDisplayLabel(type)}</Text>
                    <Text style={S.resultFlat}>Flat {flat}</Text>
                    <Text style={S.resultHint}>Let the visitor through</Text>
                </View>
                <View style={[S.resultActions, { paddingBottom: insets.bottom + 24 }]}>
                    <TouchableOpacity style={S.resultBtnSecondary} onPress={goNewEntry} activeOpacity={0.85}>
                        <Text style={S.resultBtnSecondaryText}>New Entry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.resultBtnPrimary} onPress={goDashboard} activeOpacity={0.85}>
                        <Text style={S.resultBtnPrimaryText}>Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }

    if (phase === 'denied') {
        return (
            <Animated.View entering={FadeIn.duration(300)} style={[S.resultRoot, { backgroundColor: '#DC2626' }]}>
                <View style={[S.resultContent, { paddingTop: insets.top + 24 }]}>
                    <Ionicons name="close-circle" size={96} color="#fff" />
                    <Text style={S.resultTitle}>Entry Denied</Text>
                    <Text style={S.resultSub}>{typeDisplayLabel(type)}</Text>
                    <Text style={S.resultFlat}>Flat {flat}</Text>
                    <Text style={S.resultHint}>Ask the visitor to leave</Text>
                </View>
                <View style={[S.resultActions, { paddingBottom: insets.bottom + 24 }]}>
                    <TouchableOpacity style={S.resultBtnSecondary} onPress={goNewEntry} activeOpacity={0.85}>
                        <Text style={S.resultBtnSecondaryText}>New Entry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.resultBtnPrimary} onPress={goDashboard} activeOpacity={0.85}>
                        <Text style={S.resultBtnPrimaryText}>Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }

    // ── Waiting / Timeout ─────────────────────────────────────────────────────
    const isTimeout  = phase === 'timeout';
    const remaining  = Math.max(0, TIMEOUT_S - elapsed);

    return (
        <View style={[S.root, { paddingTop: insets.top }]}>

            {/* ── Top bar ───────────────────────────────────────────────── */}
            <View style={S.topBar}>
                {/* Fix #3: cancel with confirmation */}
                <TouchableOpacity
                    style={S.closeBtn}
                    onPress={handleClose}
                    disabled={cancelling}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    {cancelling
                        ? <ActivityIndicator size="small" color="#6B7280" />
                        : <Ionicons name="close" size={22} color="#6B7280" />
                    }
                </TouchableOpacity>

                <Text style={S.topTitle}>
                    {isTimeout ? 'No Response' : 'Notifying Resident'}
                </Text>

                {/* Fix #1: next visitor shortcut */}
                <TouchableOpacity style={S.nextBtn} onPress={handleNextVisitor}>
                    <Text style={S.nextBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {/* Fix #1: context strip explaining "Next" */}
            {!isTimeout && (
                <View style={S.queueStrip}>
                    <Ionicons name="people-outline" size={13} color="#6B7280" />
                    <Text style={S.queueStripText}>
                        More visitors waiting? Tap <Text style={{ fontWeight: '800' }}>Next</Text> — this request stays active in Approvals.
                    </Text>
                </View>
            )}

            {/* ── Photo + pulse rings ───────────────────────────────────── */}
            <View style={S.photoWrap}>
                {!isTimeout && (
                    <>
                        <PulseRing delay={0}   color="#3B82F6" />
                        <PulseRing delay={480} color="#3B82F6" />
                        <PulseRing delay={960} color="#3B82F6" />
                    </>
                )}
                {photoUri ? (
                    <Image source={{ uri: photoUri }} style={S.photo} contentFit="cover" />
                ) : (
                    <View style={S.avatarFallback}>
                        <Ionicons
                            name={
                                type === 'DELIVERY' ? 'cube'      :
                                type === 'CAB'      ? 'car'       :
                                type === 'SERVICE'  ? 'construct' : 'person'
                            }
                            size={52}
                            color="#3B82F6"
                        />
                    </View>
                )}
            </View>

            {/* ── Visitor info ──────────────────────────────────────────── */}
            <View style={S.infoSection}>
                <View style={S.typeBadge}>
                    <Ionicons
                        name={
                            type === 'DELIVERY' ? 'cube'      :
                            type === 'CAB'      ? 'car'       :
                            type === 'SERVICE'  ? 'construct' : 'person'
                        }
                        size={14}
                        color="#3B82F6"
                    />
                    <Text style={S.typeBadgeText}>{typeDisplayLabel(type)}</Text>
                </View>
                <View style={S.flatRow}>
                    <Ionicons name="home-outline" size={15} color="#9CA3AF" />
                    <Text style={S.flatLabel}>Flat {flat}</Text>
                </View>
            </View>

            {/* ── Status ───────────────────────────────────────────────── */}
            <View style={S.statusSection}>
                {!isTimeout ? (
                    <>
                        <ActivityIndicator size="small" color="#3B82F6" style={{ marginBottom: 10 }} />
                        <Text style={S.statusText}>Waiting for resident to respond…</Text>
                        <View style={S.timerBadge}>
                            <Text style={S.timerText}>{remaining}s remaining</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={S.timeoutBadge}>
                            <Ionicons name="time-outline" size={16} color="#D97706" />
                            <Text style={S.timeoutBadgeText}>No response after {TIMEOUT_S}s</Text>
                        </View>
                        <Text style={S.statusSub}>Resident may be unavailable. You decide.</Text>
                    </>
                )}
            </View>

            {/* ── Override buttons — timeout only ───────────────────────── */}
            {isTimeout && (
                <Animated.View
                    entering={FadeIn.duration(250)}
                    style={[S.overrideRow, { paddingBottom: insets.bottom + 16 }]}
                >
                    <Pressable
                        style={({ pressed }) => [S.denyBtn, pressed && S.btnPressed]}
                        onPress={handleDeny}
                        disabled={actioning}
                    >
                        {actioning
                            ? <ActivityIndicator size="small" color="#DC2626" />
                            : <>
                                <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                                <Text style={S.denyBtnText}>Turn Away</Text>
                              </>
                        }
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [S.allowBtn, pressed && S.btnPressed]}
                        onPress={handleAllow}
                        disabled={actioning}
                    >
                        {actioning
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                <Text style={S.allowBtnText}>Allow Anyway</Text>
                              </>
                        }
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
    },

    // ── Top bar ────────────────────────────────────────────────────────────────
    topBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    closeBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },
    topTitle: {
        fontSize: 16, fontWeight: '700', color: '#1F2937',
    },
    // Fix #1 — "Next" button
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
    },
    nextBtnText: {
        fontSize: 13, fontWeight: '700', color: '#2563EB',
    },

    // Fix #1 — queue context strip
    queueStrip: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#F9FAFB',
        borderRadius: 10, marginHorizontal: 20,
        paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    queueStripText: {
        flex: 1, fontSize: 12, fontWeight: '500', color: '#6B7280', lineHeight: 17,
    },

    // ── Photo ──────────────────────────────────────────────────────────────────
    photoWrap: {
        width: PHOTO_SIZE, height: PHOTO_SIZE,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 28, marginBottom: 24,
    },
    photo: {
        width: PHOTO_SIZE, height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
        borderWidth: 4, borderColor: '#fff',
        ...Platform.select({
            ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
            android: { elevation: 6 },
        }),
    },
    avatarFallback: {
        width: PHOTO_SIZE, height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
        backgroundColor: '#EFF6FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 4, borderColor: '#fff',
        ...Platform.select({
            ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
            android: { elevation: 5 },
        }),
    },

    // ── Info ───────────────────────────────────────────────────────────────────
    infoSection: {
        alignItems: 'center', gap: 6, marginBottom: 20,
    },
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
    },
    typeBadgeText: {
        fontSize: 14, fontWeight: '700', color: '#2563EB',
    },
    flatRow: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
    },
    flatLabel: {
        fontSize: 15, fontWeight: '600', color: '#6B7280',
    },

    // ── Status ─────────────────────────────────────────────────────────────────
    statusSection: {
        alignItems: 'center', paddingHorizontal: 32, gap: 8, flex: 1,
    },
    statusText: {
        fontSize: 16, fontWeight: '700', color: '#1F2937', textAlign: 'center',
    },
    statusSub: {
        fontSize: 13, fontWeight: '500', color: '#9CA3AF', textAlign: 'center',
    },
    timerBadge: {
        backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
    },
    timerText: {
        fontSize: 13, fontWeight: '800', color: '#2563EB',
    },
    timeoutBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 4,
    },
    timeoutBadgeText: {
        fontSize: 13, fontWeight: '700', color: '#D97706',
    },

    // ── Override buttons ───────────────────────────────────────────────────────
    overrideRow: {
        width: '100%', flexDirection: 'row', gap: 12,
        paddingHorizontal: 20, paddingTop: 12,
    },
    denyBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, paddingVertical: 16, borderRadius: 16,
        borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2',
    },
    allowBtn: {
        flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 7, paddingVertical: 16, borderRadius: 16, backgroundColor: '#10B981',
        ...Platform.select({
            ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
            android: { elevation: 5 },
        }),
    },
    btnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
    denyBtnText:  { fontSize: 15, fontWeight: '800', color: '#DC2626' },
    allowBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    // ── Result screen ──────────────────────────────────────────────────────────
    resultRoot: {
        flex: 1, justifyContent: 'space-between',
    },
    resultContent: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingHorizontal: 32,
    },
    resultTitle: {
        fontSize: 32, fontWeight: '900', color: '#fff',
        letterSpacing: -1, marginTop: 12,
    },
    resultSub: {
        fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)',
    },
    resultFlat: {
        fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
    },
    resultHint: {
        marginTop: 8, fontSize: 14, fontWeight: '600',
        color: 'rgba(255,255,255,0.6)', textAlign: 'center',
    },
    resultActions: {
        flexDirection: 'row', gap: 12, paddingHorizontal: 24,
    },
    resultBtnSecondary: {
        flex: 1, paddingVertical: 16, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center',
    },
    resultBtnPrimary: {
        flex: 2, paddingVertical: 16, borderRadius: 16,
        backgroundColor: '#fff', alignItems: 'center',
    },
    resultBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    resultBtnPrimaryText:   { fontSize: 15, fontWeight: '800', color: '#1F2937' },

    // ── Next visitor button (NoIdError) ────────────────────────────────────────
    nextVisitorBtn: {
        backgroundColor: '#3B82F6', paddingHorizontal: 32,
        paddingVertical: 14, borderRadius: 14,
    },
    nextVisitorText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
