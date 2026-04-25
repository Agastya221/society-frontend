import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
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

import { SgateBrandMark } from '../../components/Sgate';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Avatar } from '../../components/ui/Avatar';
import { ApprovalCard } from '../../components/visitors/ApprovalCard';
import { PreApproveSheet } from '../../components/pre-approvals/PreApproveSheet';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

import { useAuthStore } from '../../store/useAuthStore';
import { useGateStore } from '../../store/useGateStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import type { Entry } from '../../types/api';
import { AppAlert } from '../../components/ui/AppAlert';

// ─── Brand yellow (Rapido-style) ──────────────────────────────────────────────
const BRAND_YELLOW = '#FFD60A';
const BRAND_YELLOW_BG = '#FFFBE6';

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

function formatType(raw: string): string {
    if (!raw) return 'Guest';
    return raw
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

interface QuickItem {
    icon: string;
    label: string;
    color: string;
    bg: string;
    onPress: () => void;
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
    const [refreshing, setRefreshing]         = useState(false);
    const [actioningId, setActioningId]       = useState<string | null>(null);
    const [exitDir, setExitDir]               = useState<Record<string, 'left' | 'right'>>({});

    useEffect(() => {
        fetchPendingRequests();
        fetchUnreadCount();
        fetchEntries({ status: 'CHECKED_IN' });
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchPendingRequests(),
            fetchUnreadCount(),
            fetchEntries({ status: 'CHECKED_IN' }),
        ]);
        setRefreshing(false);
    }, [fetchPendingRequests, fetchUnreadCount, fetchEntries]);

    const handleApprove = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        setActioningId(id);
        try { await approveRequest(id); }
        catch { AppAlert.show('Error', 'Failed to approve. Please try again.'); }
        finally { setActioningId(null); }
    };

    const handleDeny = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'left' }));
        setActioningId(id);
        try { await rejectRequest(id); }
        catch { AppAlert.show('Error', 'Failed to deny. Please try again.'); }
        finally { setActioningId(null); }
    };

    const firstName   = user?.name?.split(' ')[0] ?? 'Resident';
    const societyName = user?.society?.name ?? 'Your Society';

    const quickActions: QuickItem[] = [
        {
            icon: 'account-check-outline',
            label: 'Pre-Approve',
            color: SgateColors.goldDeep,
            bg: SgateColors.goldPale,
            onPress: () => setShowPreApprove(true),
        },
        {
            icon: 'smart-card-outline',
            label: 'My Passes',
            color: SgateColors.blue,
            bg: SgateColors.blueBg,
            onPress: () => router.push('/(resident)/my-passes' as any),
        },
        {
            icon: 'package-variant',
            label: 'Delivery',
            color: SgateColors.t2,
            bg: SgateColors.surface,
            onPress: () => router.push('/expect-delivery' as any),
        },
        {
            icon: 'car-outline',
            label: 'My Vehicles',
            color: SgateColors.t2,
            bg: SgateColors.surface,
            onPress: () => router.push('/(resident)/vehicles' as any),
        },
        {
            icon: 'receipt-text-outline',
            label: 'Dues',
            color: SgateColors.red,
            bg: SgateColors.redBg,
            onPress: () => router.push('/(resident)/society-dues' as any),
        },
        {
            icon: 'account-wrench-outline',
            label: 'Daily Help',
            color: SgateColors.green,
            bg: SgateColors.greenBg,
            onPress: () => router.push('/(resident)/daily-help' as any),
        },
        {
            icon: 'message-outline',
            label: 'Community',
            color: SgateColors.blue,
            bg: SgateColors.blueBg,
            onPress: () => router.push('/(resident)/communication' as any),
        },
        {
            icon: 'view-grid-outline',
            label: 'All Tools',
            color: SgateColors.t1,
            bg: SgateColors.gold,
            onPress: () => router.push('/(resident)/all-tools' as any),
        },
    ];

    return (
        <View style={S.root}>
            {/* ══ HEADER ═══════════════════════════════════════════════════ */}
            <Animated.View
                entering={FadeInDown.delay(0).springify()}
                style={[S.header, { paddingTop: insets.top + 18 }]}
            >
                {/* Brand + Greeting */}
                <View style={S.headerTop}>
                    <View style={S.brandRow}>
                        <View style={S.logoWrap}>
                            <SgateBrandMark size={48} />
                        </View>
                        <View>
                            <Text style={S.greetText}>{greeting()}, {firstName} 👋</Text>
                            <Text style={S.societyText} numberOfLines={1}>{societyName}</Text>
                        </View>
                    </View>

                    {/* Bell */}
                    <TouchableOpacity
                        style={S.bellBtn}
                        onPress={() => router.push('/notifications' as any)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons name="bell-outline" size={22} color={SgateColors.t1} />
                        {unreadCount > 0 && (
                            <View style={S.badge}>
                                <Text style={S.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Pending gate badge — shown only when someone is waiting */}
                {pendingRequests.length > 0 && (
                    <View style={S.gateAlert}>
                        <View style={S.gateAlertDot} />
                        <Text style={S.gateAlertText}>
                            {pendingRequests.length} visitor{pendingRequests.length > 1 ? 's' : ''} waiting at the gate
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#996300" />
                    </View>
                )}
            </Animated.View>

            <ScrollView
                style={S.scroll}
                contentContainerStyle={S.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={BRAND_YELLOW}
                        colors={[BRAND_YELLOW]}
                    />
                }
            >
                {/* ══ QUICK ACTIONS ════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={S.section}>
                    <Text style={S.sectionLabel}>Quick Actions</Text>
                    <View style={S.quickGrid}>
                        {quickActions.map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={S.quickItem}
                                onPress={item.onPress}
                                activeOpacity={0.65}
                            >
                                <View style={[S.quickIcon, { backgroundColor: item.bg }]}>
                                    <MaterialCommunityIcons name={item.icon as any} size={26} color={item.color} />
                                </View>
                                <Text style={S.quickLabel} numberOfLines={1}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* ══ WAITING AT GATE ══════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.delay(160).springify()} style={S.section}>
                    <SectionHeader
                        title="Waiting at Gate"
                        rightPill={
                            pendingRequests.length > 0
                                ? { text: `${pendingRequests.length} new`, color: '#996300', bg: BRAND_YELLOW_BG }
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
                                entering={FadeInDown.delay(index * 60).springify()}
                                exiting={
                                    exitDir[req.id] === 'right'
                                        ? FadeOutRight.duration(260)
                                        : FadeOutLeft.duration(260)
                                }
                                style={S.cardWrap}
                            >
                                <ApprovalCard
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

                {/* ══ TODAY'S ACTIVITY ════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.delay(220).springify()} style={S.section}>
                    <SectionHeader
                        title="Today's Activity"
                        rightLabel="See all"
                        onRightPress={() => router.push('/(resident)/approvals' as any)}
                    />

                    {entries.length === 0 ? (
                        <ActivityEmpty />
                    ) : (
                        <View style={S.activityCard}>
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
            </ScrollView>

            <PreApproveSheet
                visible={showPreApprove}
                onClose={() => setShowPreApprove(false)}
            />
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityRow({ entry, isLast }: { entry: Entry; isLast: boolean }) {
    const { pill, label } = entryStatusToPill(entry.status);
    return (
        <View style={[S.activityRow, !isLast && S.activityDivider]}>
            <Avatar name={entry.visitorName} size={36} />
            <View style={S.activityInfo}>
                <Text style={S.activityName} numberOfLines={1}>{entry.visitorName}</Text>
                <Text style={S.activityTime}>{timeAgo(entry.createdAt)}</Text>
            </View>
            <ActivityPill status={pill} label={label} />
        </View>
    );
}

function ActivityPill({ status, label }: { status: PillStatus; label: string }) {
    const { bg, text } = PILL_COLORS[status];
    return (
        <View style={[S.actPill, { backgroundColor: bg }]}>
            <Text style={[S.actPillText, { color: text }]}>{label}</Text>
        </View>
    );
}

const PILL_COLORS: Record<PillStatus, { bg: string; text: string }> = {
    active:   { bg: SgateColors.greenBg,  text: SgateColors.green },
    approved: { bg: SgateColors.greenBg,  text: SgateColors.green },
    pending:  { bg: BRAND_YELLOW_BG,      text: '#996300' },
    denied:   { bg: SgateColors.redBg,    text: SgateColors.red },
    expired:  { bg: '#F2F2F2',            text: SgateColors.t3 },
};

function GateEmpty() {
    return (
        <View style={S.emptyWrap}>
            <View style={S.emptyIcon}>
                <MaterialCommunityIcons name="check-circle-outline" size={22} color={SgateColors.green} />
            </View>
            <Text style={S.emptyTitle}>All clear!</Text>
            <Text style={S.emptySub}>No one is waiting at the gate</Text>
        </View>
    );
}

function GateSkeleton() {
    return (
        <View style={S.skeletonCard}>
            <View style={S.skeletonRow}>
                <View style={S.skeletonCircle} />
                <View style={{ flex: 1 }}>
                    <View style={[S.skeletonLine, { width: '60%' }]} />
                    <View style={[S.skeletonLine, { width: '40%', marginTop: 6 }]} />
                </View>
            </View>
        </View>
    );
}

function ActivityEmpty() {
    return (
        <View style={S.emptyWrap}>
            <MaterialCommunityIcons name="clock-outline" size={22} color={SgateColors.t4} />
            <Text style={S.emptySub}>No activity yet today</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // ── Header ─────────────────────────────────────────────────────────────
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    greetText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 2,
    },
    societyText: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -0.3,
    },
    bellBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: BRAND_YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 2,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        fontSize: 8,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },

    // Gate alert strip (only shows when someone is at gate)
    gateAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: BRAND_YELLOW_BG,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    gateAlertDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: BRAND_YELLOW,
    },
    gateAlertText: {
        flex: 1,
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#996300',
    },

    // ── Scroll ─────────────────────────────────────────────────────────────
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 24, paddingBottom: 12 },

    // ── Section ────────────────────────────────────────────────────────────
    section: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 16,
    },

    divider: { height: 0 },

    // ── Quick Actions ───────────────────────────────────────────────────────
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 20,
        columnGap: 0,
    },
    quickItem: {
        width: '25%',
        alignItems: 'center',
        gap: 8,
    },
    quickIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
        textAlign: 'center',
    },

    // ── Card Wrap ───────────────────────────────────────────────────────────
    cardWrap: { marginBottom: 10 },

    // ── Activity Card ───────────────────────────────────────────────────────
    activityCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    activityDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    activityInfo: { flex: 1 },
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
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    actPillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },

    // ── Empty & Skeleton ────────────────────────────────────────────────────
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 28,
        gap: 8,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    emptyIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    emptySub: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    skeletonCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skeletonCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#EBEBEB',
    },
    skeletonLine: {
        height: 11,
        borderRadius: 6,
        backgroundColor: '#EBEBEB',
    },
});
