import { GiantButton } from '@/components/gate/GiantButton';
import { E2E } from '@/utils/e2e';
import { ResultScreen } from '@/components/gate/ResultScreen';
import { GuardColors, GuardFonts, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    BackHandler,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withDelay,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PHOTO_SIZE = 150;
const POLL_MS    = 3000;
const TIMEOUT_S  = 45;

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'waiting' | 'timeout' | 'approved' | 'admitted' | 'denied';

function typeLabelKey(type?: string): string | null {
    if (!type) return 'common.guest';
    if (type.includes('DELIVERY')) return 'common.delivery';
    if (type === 'CAB') return 'common.cab';
    if (type === 'SERVICE' || type === 'VENDOR') return 'common.service';
    if (type === 'GUEST' || type === 'VISITOR') return 'common.guest';
    if (type === 'HELP') return 'common.help';
    if (type === 'OTHER') return 'common.other';
    return null;
}

function typeIcon(type?: string): keyof typeof Ionicons.glyphMap {
    if (type === 'DELIVERY') return 'cube';
    if (type === 'CAB') return 'car';
    if (type === 'SERVICE' || type === 'HELP') return 'construct';
    return 'person';
}

function resolvePhase(status: string, entryId?: string | null): Phase | null {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return entryId ? 'admitted' : 'approved';
    if (['INSIDE', 'CHECKED_IN'].includes(s)) return 'admitted';
    if (['REJECTED', 'DENIED', 'EXPIRED'].includes(s)) return 'denied';
    return null;
}

// ─── Pulsing ring ─────────────────────────────────────────────────────────────

function PulseRing({ delay = 0 }: { delay?: number }) {
    const scale   = useSharedValue(1);
    const opacity = useSharedValue(0.45);

    useEffect(() => {
        if (E2E) return;
        const loop = (from: number, to: number) => withDelay(delay, withRepeat(
            withSequence(withTiming(from, { duration: 0 }), withTiming(to, { duration: 1800, easing: Easing.out(Easing.ease) })),
            -1, false,
        ));
        scale.value = loop(1, 1.9);
        opacity.value = loop(0.45, 0);
    }, [opacity, scale, delay]);

    const style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: PHOTO_SIZE, height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
        backgroundColor: 'rgba(255,255,255,0.55)',
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={style} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EntryWaitingScreen() {
    const t = useT();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        id: string; flat: string; name: string; type: string; photo: string;
    }>();

    const { id, flat, type, photo, name } = params;
    const visitorName = name?.trim() || null;
    const photoUri = photo && photo.length > 0 ? decodeURIComponent(photo) : null;
    const typeKey = typeLabelKey(type);
    const typeText = typeKey ? t(typeKey) : (type ?? '').replace(/_/g, ' ');

    const [phase,     setPhase]     = useState<Phase>('waiting');
    const [elapsed,   setElapsed]   = useState(0);
    const [actioning, setActioning] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const actioningRef = useRef(false); // blocks a second override tap before re-render

    const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const settled   = useRef(false);

    // The time bar drains over the wait.
    const bar = useSharedValue(1);
    useEffect(() => {
        bar.value = withTiming(0, { duration: TIMEOUT_S * 1000, easing: Easing.linear });
    }, [bar]);
    const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

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
            const entryId: string | null = res.data?.data?.entryId ?? res.data?.data?.entryRequest?.entryId ?? null;
            const resolved = resolvePhase(status, entryId);
            if (resolved) settle(resolved);
        } catch {
            // Fallback: check pending list
            try {
                const listRes = await api.get('/api/v1/gate/entry-requests?status=PENDING');
                const payload = listRes.data?.data;
                const requests: any[] =
                    Array.isArray(payload) ? payload : (payload?.entryRequests ?? payload?.entries ?? []);
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
    }, [stopAll]);

    // ── Polling interval ──────────────────────────────────────────────────────
    useEffect(() => {
        poll();
        pollRef.current = setInterval(poll, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [poll]);

    // ── AppState — resume polling when app comes to foreground ────────────────
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && !settled.current) poll();
        });
        return () => sub.remove();
    }, [poll]);

    // ── Cancel request when X is tapped ───────────────────────────────────────
    const handleClose = () => {
        if (phase === 'approved') { stopAll(); goDashboard(); return; }
        Alert.alert(
            t('waiting.cancelTitle'),
            t('waiting.cancelText'),
            [
                { text: t('waiting.keepWaiting'), style: 'cancel' },
                {
                    text: t('waiting.cancelRequest'), style: 'destructive',
                    onPress: async () => {
                        setCancelling(true);
                        try {
                            await api.patch(`/api/v1/gate/entry-requests/${id}/cancel`);
                        } catch { /* best-effort */ } finally {
                            setCancelling(false);
                            stopAll();
                            goDashboard();
                        }
                    },
                },
            ],
        );
    };

    // ── Next visitor — leave request pending, go to new entry ─────────────────
    const handleNextVisitor = () => {
        // Do NOT cancel — resident is still being notified.
        // The result will show up in the waiting list.
        stopAll();
        goNewEntry();
    };

    // ── Override actions ──────────────────────────────────────────────────────
    const override = async (action: 'approve' | 'reject') => {
        if (actioningRef.current) return;
        actioningRef.current = true;
        setActioning(true);
        try {
            await api.patch(`/api/v1/gate/entry-requests/${id}/${action}`);
            settle(action === 'approve' ? 'approved' : 'denied');
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('waiting.couldNotUpdate'), err?.response?.data?.message ?? t('waiting.tryAgain'));
        } finally {
            actioningRef.current = false;
            setActioning(false);
        }
    };

    const admit = async () => {
        if (actioningRef.current) return;
        actioningRef.current = true;
        setActioning(true);
        try {
            await api.patch(`/api/v1/gate/entry-requests/${id}/admit`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPhase('admitted');
        } catch (err: any) {
            Alert.alert(t('waiting.couldNotUpdate'), err?.response?.data?.message ?? t('waiting.tryAgain'));
            goDashboard();
        } finally {
            actioningRef.current = false;
            setActioning(false);
        }
    };

    // Stack here is [index, new-entry (still holding the submitted form), entry-waiting].
    // replace() used to leave that stale form (and a second dashboard) underneath, so
    // Android back resurfaced it. Pop back to the dashboard first, then open a fresh screen.
    function goDashboard() { router.dismissAll(); }
    function goNewEntry() { router.dismissAll(); router.push('/new-entry'); }
    function goApprovals() { router.dismissAll(); router.push('/approvals'); }

    // Android back: while waiting it asks before cancelling (same as the X);
    // on a result screen it returns to the dashboard instead of the old form.
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!id) goApprovals();
            else if (phase === 'approved' || phase === 'admitted' || phase === 'denied') goDashboard();
            else if (!cancelling) handleClose();
            return true;
        });
        return () => sub.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, phase, cancelling]);

    // ── Result screens ────────────────────────────────────────────────────────
    if (!id) {
        return (
            <ResultScreen
                kind="wait"
                title={t('waiting.untracked')}
                reason={t('waiting.untrackedText')}
                primaryLabel={t('waiting.goWaiting')}
                onPrimary={goApprovals}
                secondaryLabel={t('common.home')}
                onSecondary={goDashboard}
            />
        );
    }

    if (phase === 'approved') {
        return (
            <ResultScreen
                kind="wait"
                title={t('waiting.ready')}
                reason={t('waiting.confirmAtGate')}
                name={visitorName ?? typeText}
                flat={flat ? `${t('common.flat')} ${flat}` : undefined}
                typeLabel={visitorName ? typeText : undefined}
                primaryLabel={t('waiting.admit')}
                onPrimary={admit}
                busy={actioning}
                secondaryLabel={t('waiting.next')}
                onSecondary={handleNextVisitor}
            />
        );
    }

    if (phase === 'admitted' || phase === 'denied') {
        const ok = phase === 'admitted';
        return (
            <ResultScreen
                kind={ok ? 'allow' : 'deny'}
                title={ok ? t('common.allow') : t('common.deny')}
                reason={ok ? t('waiting.letThrough') : t('waiting.askLeave')}
                name={visitorName ?? typeText}
                flat={flat ? `${t('common.flat')} ${flat}` : undefined}
                typeLabel={visitorName ? typeText : undefined}
                photoUrl={photoUri}
                primaryLabel={t('waiting.newVisitor')}
                onPrimary={goNewEntry}
                secondaryLabel={t('common.home')}
                onSecondary={goDashboard}
                autoReturnSeconds={8}
                onAutoReturn={goDashboard}
            />
        );
    }

    // ── Waiting / Timeout ─────────────────────────────────────────────────────
    const isTimeout  = phase === 'timeout';
    const remaining  = Math.max(0, TIMEOUT_S - elapsed);

    return (
        <LinearGradient
            colors={isTimeout ? ['#FFC58A', '#FF9F55', '#F57C2A'] : ['#FFE38A', '#FFC933', '#FFB000']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[S.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* ── Top bar ───────────────────────────────────────────────── */}
            <View style={S.topBar}>
                <TouchableOpacity
                    testID="wait-close"
                    accessibilityRole="button"
                    accessibilityLabel={t('waiting.cancelRequest')}
                    style={S.closeBtn}
                    onPress={handleClose}
                    disabled={cancelling}
                    activeOpacity={0.7}
                >
                    {cancelling
                        ? <ActivityIndicator size="small" color={GuardColors.t1} />
                        : <Ionicons name="close" size={28} color={GuardColors.t1} />
                    }
                </TouchableOpacity>
                <Text style={S.topTitle} numberOfLines={1}>{isTimeout ? t('waiting.noResponse') : t('waiting.notifying')}</Text>
                <View style={{ width: GuardTouch.min }} />
            </View>

            {/* ── Visitor ───────────────────────────────────────────────── */}
            <View style={S.center}>
                <View style={S.photoWrap}>
                    {!isTimeout && <><PulseRing /><PulseRing delay={900} /></>}
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={S.photo} contentFit="cover" />
                    ) : (
                        <View style={S.avatarFallback}>
                            <Ionicons name={typeIcon(type)} size={64} color={GuardColors.goldDeep} />
                        </View>
                    )}
                </View>

                <View style={[S.card, guardShadow('#000000', 2)]}>
                    {visitorName ? <Text style={S.visitorName} numberOfLines={1}>{visitorName}</Text> : null}
                    <View style={S.cardRow}>
                        <View style={S.typeBadge}>
                            <Ionicons name={typeIcon(type)} size={18} color={GuardColors.goldDeep} />
                            <Text style={S.typeBadgeText}>{typeText + '\u00A0'}</Text>
                        </View>
                        <View style={S.flatRow}>
                            <Ionicons name="home" size={18} color={GuardColors.t2} />
                            <Text style={S.flatLabel}>{t('common.flat')} {flat}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Status ─────────────────────────────────────────────── */}
                <View style={S.status}>
                    {!isTimeout ? (
                        <>
                            <Text style={S.statusText}>{t('waiting.waitingFor')}</Text>
                            <View style={S.track}><Animated.View style={[S.fill, barStyle]} /></View>
                            <Text style={S.timerText}>{t('waiting.secondsLeft', { n: remaining })}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={S.statusText}>{t('waiting.noResponseAfter', { n: TIMEOUT_S })}</Text>
                            <Text style={S.statusSub}>{t('waiting.youDecide')}</Text>
                        </>
                    )}
                </View>
            </View>

            {/* ── Actions ───────────────────────────────────────────────── */}
            <View style={S.actions}>
                {isTimeout ? (
                    <>
                        <GiantButton label={t('waiting.letInAnyway')} icon="checkmark-circle" tone="allow" loading={actioning} onPress={() => override('approve')} />
                        <GiantButton label={t('waiting.sendAway')} icon="close-circle" tone="deny" disabled={actioning} onPress={() => override('reject')} />
                    </>
                ) : null}
                <GiantButton label={t('waiting.next')} sub={isTimeout ? undefined : t('waiting.nextHint')} icon="people" tone={isTimeout ? 'light' : 'dark'} onPress={handleNextVisitor} />
            </View>
        </LinearGradient>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 20 },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    closeBtn: { width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
    topTitle: { flex: 1, textAlign: 'center', color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 22, lineHeight: 30, fontWeight: '900' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
    photoWrap: { width: PHOTO_SIZE, height: PHOTO_SIZE, alignItems: 'center', justifyContent: 'center' },
    photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: PHOTO_SIZE / 2, borderWidth: 5, borderColor: '#FFFFFF' },
    avatarFallback: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: PHOTO_SIZE / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

    card: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18, alignItems: 'center', gap: 10 },
    visitorName: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: -0.4 },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GuardColors.goldPale, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
    typeBadgeText: { color: GuardColors.goldDeep, fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '800' },
    flatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    flatLabel: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 22, lineHeight: 30, fontWeight: '900' },

    status: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
    statusText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
    statusSub: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.body, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
    track: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: 'rgba(13,15,20,0.15)', overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: GuardColors.black },
    timerText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '700' },

    actions: { gap: 12 },
});
