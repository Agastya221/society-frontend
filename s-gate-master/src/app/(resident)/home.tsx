import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeOutLeft,
    FadeOutRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    SgateApprovalCard,
    SgateBrandMark,
    SgateQuickAction,
    SgateSecurityBanner,
    SgateSectionHeader,
    SgateStatusPill,
} from '../../components/Sgate';
import { SgateAvatar } from '../../components/Sgate/SgateAvatar';
import { PreApproveSheet } from '../../components/Sgate/PreApproveSheet';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

import { useAuthStore } from '../../store/useAuthStore';
import { useGateStore } from '../../store/useGateStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import type { Entry } from '../../types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)}h ago`;
}

type PillStatus = 'active' | 'pending' | 'approved' | 'denied' | 'expired';

function entryStatusToPill(status: Entry['status']): { pill: PillStatus; label: string } {
    switch (status) {
        case 'CHECKED_IN':  return { pill: 'active',   label: 'Inside' };
        case 'CHECKED_OUT': return { pill: 'expired',  label: 'Left' };
        case 'APPROVED':    return { pill: 'approved', label: 'Approved' };
        case 'REJECTED':    return { pill: 'denied',   label: 'Denied' };
        default:            return { pill: 'pending',  label: 'Pending' };
    }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ResidentHomeScreen() {
    const router  = useRouter();
    const insets  = useSafeAreaInsets();
    const { user } = useAuthStore();

    const {
        pendingRequests,
        entries,
        isLoading: gateLoading,
        fetchPendingRequests,
        fetchEntries,
        approveRequest,
        rejectRequest,
    } = useGateStore();

    const { unreadCount, fetchUnreadCount } = useNotificationStore();

    const [showPreApprove, setShowPreApprove] = useState(false);
    const [refreshing, setRefreshing]   = useState(false);
    // Track which id is currently being acted on (for per-card loading)
    const [actioningId, setActioningId] = useState<string | null>(null);
    // Track exit direction per id so animated exit picks left vs right
    const [exitDir, setExitDir]         = useState<Record<string, 'left' | 'right'>>({});

    // ── Initial load ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetchPendingRequests();
        fetchUnreadCount();
        fetchEntries({ status: 'CHECKED_IN' });
    }, []);

    // ── Pull-to-refresh ──────────────────────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchPendingRequests(),
            fetchUnreadCount(),
            fetchEntries({ status: 'CHECKED_IN' }),
        ]);
        setRefreshing(false);
    }, [fetchPendingRequests, fetchUnreadCount, fetchEntries]);

    // ── Gate actions ─────────────────────────────────────────────────────────
    const handleApprove = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        setActioningId(id);
        try {
            await approveRequest(id);
        } catch {
            Alert.alert('Error', 'Failed to approve. Please try again.');
        } finally {
            setActioningId(null);
        }
    };

    const handleDeny = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'left' }));
        setActioningId(id);
        try {
            await rejectRequest(id);
        } catch {
            Alert.alert('Error', 'Failed to deny. Please try again.');
        } finally {
            setActioningId(null);
        }
    };



    // ── Derived ───────────────────────────────────────────────────────────────
    const firstName    = user?.name?.split(' ')[0] ?? 'Resident';
    const societyName  = user?.society?.name ?? 'Your Society';

    return (
        <View style={styles.root}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={SgateColors.gold}
                        colors={[SgateColors.gold]}
                    />
                }
            >
                {/* ══ WHITE HEADER AREA ════════════════════════════════════ */}
                <View style={[styles.headerArea, { paddingTop: insets.top + 14 }]}>

                    {/* Greeting row */}
                    <Animated.View
                        entering={FadeInDown.delay(0).springify()}
                        style={styles.greetingRow}
                    >
                        <View style={styles.greetingLeft}>
                            <SgateBrandMark size={42} />
                            <View style={styles.greetingTexts}>
                                <Text style={styles.greetingLine}>
                                    {greeting()}, {firstName}
                                </Text>
                                <Text style={styles.societyLine} numberOfLines={1}>
                                    {societyName}
                                </Text>
                            </View>
                        </View>

                        {/* Bell */}
                        <TouchableOpacity
                            style={styles.bellBtn}
                            onPress={() => router.push('/notifications' as any)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Feather name="bell" size={21} color={SgateColors.t1} />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Security banner */}
                    <Animated.View entering={FadeInDown.delay(80).springify()}>
                        <SgateSecurityBanner />
                    </Animated.View>
                </View>

                {/* ══ BG CONTENT AREA ══════════════════════════════════════ */}
                <View style={styles.contentArea}>

                    {/* ── Quick actions ──────────────────────────────────── */}
                    <Animated.View
                        entering={FadeInDown.delay(160).springify()}
                        style={styles.quickRow}
                    >
                        <SgateQuickAction
                            icon="user-check"
                            label={'Pre-\nApprove'}
                            bgColor={SgateColors.goldPale}
                            iconColor={SgateColors.goldDeep}
                            onPress={() => setShowPreApprove(true)}
                        />
                        <SgateQuickAction
                            icon="hash"
                            label={'Gate\nPass'}
                            bgColor={SgateColors.blueBg}
                            iconColor={SgateColors.blue}
                            onPress={() => router.push('/gate-pass-create' as any)}
                        />
                        <SgateQuickAction
                            icon="package"
                            label={'Expect\nDelivery'}
                            bgColor={SgateColors.surface}
                            iconColor={SgateColors.t2}
                            onPress={() => router.push('/expect-delivery' as any)}
                        />
                        <SgateQuickAction
                            icon="alert-triangle"
                            label={'SOS\nAlert'}
                            bgColor={SgateColors.redBg}
                            iconColor={SgateColors.red}
                            onPress={() => router.push('/(resident)/emergency/create' as any)}
                        />
                    </Animated.View>

                    {/* ── Pending approvals ──────────────────────────────── */}
                    <Animated.View
                        entering={FadeInDown.delay(240).springify()}
                        style={styles.section}
                    >
                        <SgateSectionHeader
                            title="Waiting at Gate"
                            rightPill={
                                pendingRequests.length > 0
                                    ? {
                                          text: `${pendingRequests.length} new`,
                                          color: SgateColors.goldDeep,
                                          bg: SgateColors.goldPale,
                                      }
                                    : undefined
                            }
                        />

                        {gateLoading && pendingRequests.length === 0 ? (
                            <GateSkeleton />
                        ) : pendingRequests.length === 0 ? (
                            <GateEmpty />
                        ) : (
                            pendingRequests.map((req, index) => (
                                <Animated.View
                                    key={req.id}
                                    entering={FadeInDown.delay(index * 70).springify()}
                                    exiting={
                                        exitDir[req.id] === 'right'
                                            ? FadeOutRight.duration(260)
                                            : FadeOutLeft.duration(260)
                                    }
                                    style={styles.cardWrap}
                                >
                                    <SgateApprovalCard
                                        name={req.visitorName}
                                        type={formatType(req.type)}
                                        time={timeAgo(req.createdAt)}
                                        gate={req.gate ?? 'Gate A'}
                                        onApprove={() => handleApprove(req.id)}
                                        onDeny={() => handleDeny(req.id)}
                                    />
                                </Animated.View>
                            ))
                        )}
                    </Animated.View>

                    {/* ── Today's activity ───────────────────────────────── */}
                    <Animated.View
                        entering={FadeInDown.delay(320).springify()}
                        style={styles.section}
                    >
                        <SgateSectionHeader
                            title="Today's Activity"
                            rightLabel="See all"
                            onRightPress={() => router.push('/(resident)/approvals' as any)}
                        />

                        {entries.length === 0 ? (
                            <ActivityEmpty />
                        ) : (
                            <View style={styles.activityCard}>
                                {entries.map((entry, index) => (
                                    <ActivityRow
                                        key={entry.id}
                                        entry={entry}
                                        isLast={index === entries.length - 1}
                                    />
                                ))}
                            </View>
                        )}
                    </Animated.View>
                </View>
            </ScrollView>

            <PreApproveSheet
                visible={showPreApprove}
                onClose={() => setShowPreApprove(false)}
            />
        </View>
    );
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ entry, isLast }: { entry: Entry; isLast: boolean }) {
    const { pill, label } = entryStatusToPill(entry.status);
    return (
        <View style={[styles.activityRow, !isLast && styles.activityDivider]}>
            <SgateAvatar name={entry.visitorName} size={36} />
            <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={1}>
                    {entry.visitorName}
                </Text>
                <Text style={styles.activityTime}>
                    {timeAgo(entry.createdAt)}
                </Text>
            </View>
            {/* Custom pill so we can show "Inside" / "Left" labels */}
            <ActivityPill status={pill} label={label} />
        </View>
    );
}

function ActivityPill({ status, label }: { status: PillStatus; label: string }) {
    const { bg, text } = ACTIVITY_PILL_COLORS[status];
    return (
        <View style={[styles.actPill, { backgroundColor: bg }]}>
            <Text style={[styles.actPillText, { color: text }]}>{label}</Text>
        </View>
    );
}

const ACTIVITY_PILL_COLORS: Record<PillStatus, { bg: string; text: string }> = {
    active:   { bg: SgateColors.greenBg,  text: SgateColors.green },
    approved: { bg: SgateColors.greenBg,  text: SgateColors.green },
    pending:  { bg: SgateColors.goldPale, text: SgateColors.goldDeep },
    denied:   { bg: SgateColors.redBg,    text: SgateColors.red },
    expired:  { bg: SgateColors.surface,  text: SgateColors.t3 },
};

// ─── Empty / skeleton states ──────────────────────────────────────────────────

function GateEmpty() {
    return (
        <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
                <Feather name="check-circle" size={26} color={SgateColors.green} />
            </View>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySub}>No one is waiting at the gate</Text>
        </View>
    );
}

function GateSkeleton() {
    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonRow}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonLines}>
                    <View style={[styles.skeletonLine, { width: '60%' }]} />
                    <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
                </View>
            </View>
        </View>
    );
}

function ActivityEmpty() {
    return (
        <View style={styles.activityEmptyWrap}>
            <Feather name="clock" size={20} color={SgateColors.t4} />
            <Text style={styles.activityEmptyText}>No activity yet today</Text>
        </View>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatType(raw: string): string {
    if (!raw) return 'Guest';
    // "DOMESTIC_STAFF" → "Domestic Staff"
    return raw
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.card, // white fills the notch
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // ── Header (white) ─────────────────────────────────────────────────────
    headerArea: {
        backgroundColor: SgateColors.card,
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 16,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    greetingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    greetingTexts: {
        flex: 1,
    },
    greetingLine: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    societyLine: {
        fontSize: 18,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    bellBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 7,
        right: 7,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: SgateColors.card,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },

    // ── Content (bg) ───────────────────────────────────────────────────────
    contentArea: {
        backgroundColor: SgateColors.bg,
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // ── Quick actions ──────────────────────────────────────────────────────
    quickRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 28,
    },

    // ── Section ────────────────────────────────────────────────────────────
    section: {
        marginBottom: 28,
    },
    cardWrap: {
        marginBottom: 12,
    },

    // ── Activity card ──────────────────────────────────────────────────────
    activityCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        gap: 12,
    },
    activityDivider: {
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    activityInfo: {
        flex: 1,
    },
    activityName: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    activityTime: {
        marginTop: 2,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    actPill: {
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    actPillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },

    // ── Gate empty state ───────────────────────────────────────────────────
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 28,
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // ── Skeleton ───────────────────────────────────────────────────────────
    skeletonCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 12,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skeletonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SgateColors.surface,
    },
    skeletonLines: {
        flex: 1,
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: SgateColors.surface,
    },

    // ── Activity empty ─────────────────────────────────────────────────────
    activityEmptyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 24,
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    activityEmptyText: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
});
