import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

import { WorkspaceSwitchButton } from '@/components/ui/WorkspaceSwitchButton';
import { SgateBrandMark } from '@/components/Sgate';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ApprovalCard } from '@/components/visitors/ApprovalCard';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import { AppAlert } from '@/components/ui/AppAlert';
import { FloatingSOSButton } from '@/components/ui/FloatingSOSButton';
import { ResidentContextPicker } from '@/components/context/ResidentContextPicker';
import { ResidentRequestDetailsSheet } from '@/components/context/ResidentRequestDetailsSheet';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import api from '@/services/api';
import {
    getResidentContexts,
    switchResidentContext,
    type ResidentContext,
    type ResidentContextRequest,
    type ResidentContextsResponse,
    type ResidentRequestDetails,
} from '@/services/profile.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useGateStore } from '@/store/useGateStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import type { Entry } from '@/types/api';
import { buildOnboardingDraftFromRequest } from '@/utils/onboardingRequestDraft';
import { getQuickActionsForRole } from '@/components/home/homeToolsConfig';

const BRAND_YELLOW    = '#FFD60A';
const BRAND_YELLOW_BG = '#FFFBE6';

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
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
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

function shouldOpenAdminArea(redirectTo?: string, nextRole?: string | null): boolean {
    const normalizedRole = nextRole?.toUpperCase();
    return redirectTo === 'ADMIN_PANEL' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

export default function ResidentHomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, login } = useAuthStore();
    const startAddMembershipFlow = useOnboardingStore((s) => s.startAddMembershipFlow);
    const startRequestCorrectionFlow = useOnboardingStore((s) => s.startRequestCorrectionFlow);

    // ── Gate store ────────────────────────────────────────────────────────────
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

    // ── Local state ──────────────────────────────────────────────────────────
    const [showPreApprove, setShowPreApprove] = useState(false);
    const [preApproveType, setPreApproveType] = useState<any>(undefined);
    const [refreshing, setRefreshing]         = useState(false);
    const [exitDir, setExitDir]               = useState<Record<string, 'left' | 'right'>>({});
    const [contextsData, setContextsData]     = useState<ResidentContextsResponse | null>(null);
    const [showContextSheet, setShowContextSheet] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ResidentContextRequest | null>(null);
    const [showRequestDetails, setShowRequestDetails] = useState(false);
    const [contextsLoading, setContextsLoading]   = useState(false);
    const [switchingContextId, setSwitchingContextId] = useState<string | null>(null);

    // ── Data fetching ────────────────────────────────────────────────────────

    const fetchSharedData = useCallback(async () => {
        await Promise.allSettled([
            fetchPendingRequests(),
            fetchUnreadCount(),
            fetchEntries({ status: 'CHECKED_IN' }),
        ]);
    }, [fetchPendingRequests, fetchUnreadCount, fetchEntries]);

    const fetchContexts = useCallback(async () => {
        if (!user?.id) return;
        setContextsLoading(true);
        try {
            const result = await getResidentContexts();
            setContextsData(result);
            // Sync contexts into global auth store so WorkspaceSwitchButton can access them
            useAuthStore.getState().setContexts(result.contexts ?? []);
        } catch (error) {
            console.error('Context fetch failed:', error);
        } finally {
            setContextsLoading(false);
        }
    }, [user?.id]);

    // ── Initial load (useFocusEffect) ────────────────────────────────────────

    useFocusEffect(
        useCallback(() => {
            fetchSharedData();
            fetchContexts();
        }, [fetchSharedData, fetchContexts])
    );

    // ── Pull-to-refresh ──────────────────────────────────────────────────────

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchSharedData(),
            fetchContexts(),
        ]);
        setRefreshing(false);
    }, [fetchSharedData, fetchContexts]);

    // ── Gate actions ─────────────────────────────────────────────────────────

    const handleApprove = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        try { await approveRequest(id); }
        catch { AppAlert.show('Error', 'Failed to approve. Please try again.'); }
    };

    const handleDeny = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'left' }));
        try { await rejectRequest(id); }
        catch { AppAlert.show('Error', 'Failed to deny. Please try again.'); }
    };

    // ── Navigation helper ────────────────────────────────────────────────────

    const nav = useCallback((route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    }, [router]);

    // ── Derived data ─────────────────────────────────────────────────────────

    const firstName   = user?.name?.split(' ')[0] ?? 'Resident';
    const societyName = user?.society?.name ?? 'Your Society';

    const notificationsRoute = '/notifications';
    const activityRoute = '/(resident)/approvals';

    // ── Quick actions from config ────────────────────────────────────────────

    const quickActions = getQuickActionsForRole('resident');

    const residentContexts = contextsData?.contexts?.filter(c => c.role === 'RESIDENT') ?? [];
    const activeContext = residentContexts.find(c => c.isActiveContext) ?? null;

    const contextTitle = activeContext?.label
        ?? [user?.flat?.block?.name, user?.flat?.number].filter(Boolean).join(' - ')
        ?? societyName;
    const canOpenContextSheet = residentContexts.length > 0 || !contextsLoading;

    const handleQuickAction = useCallback((route: string) => {
        if (route.startsWith('MODAL:preapprove')) {
            if (route === 'MODAL:preapprove_delivery') {
                setPreApproveType('DELIVERY');
            } else {
                setPreApproveType(undefined);
            }
            setShowPreApprove(true);
            return;
        }
        nav(route);
    }, [nav]);

    const handleSwitchContext = useCallback(async (context: ResidentContext) => {
        if (context.isActiveContext || switchingContextId) {
            setShowContextSheet(false);
            return;
        }

        setSwitchingContextId(context.membershipId);
        try {
            const result = await switchResidentContext(context.membershipId);
            await login(
                result.accessToken,
                result.refreshToken,
                result.user,
                result.appType,
                false,
                null,
            );
            setContextsData(result.contexts);
            setShowContextSheet(false);

            const nextIsAdmin = shouldOpenAdminArea(result.redirectTo, result.user?.role);
            const targetRoute = nextIsAdmin ? '/(admin)' : '/(resident)/home';

            if (nextIsAdmin) {
                router.replace(targetRoute as any);
                return;
            }

            await Promise.allSettled([
                fetchSharedData(),
                fetchContexts(),
            ]);
        } catch (error: any) {
            AppAlert.show(
                'Could not switch home',
                error?.response?.data?.message || 'Please try again in a moment.'
            );
        } finally {
            setSwitchingContextId(null);
        }
    }, [
        switchingContextId,
        login,
        fetchSharedData,
        fetchContexts,
        router,
    ]);

    const handleAddAnotherHome = useCallback(() => {
        setShowContextSheet(false);
        startAddMembershipFlow('/(resident)/profile');
        router.push('/(onboarding)/select-city' as any);
    }, [router, startAddMembershipFlow]);

    const handleRequestPress = useCallback((request: ResidentContextRequest) => {
        setShowContextSheet(false);
        setSelectedRequest(request);
        setShowRequestDetails(true);
    }, []);

    const handleRequestDeleted = useCallback(() => {
        setSelectedRequest(null);
        setShowRequestDetails(false);
        fetchContexts();
    }, [fetchContexts]);

    const requestReturnTo = '/(resident)/profile';

    const handleRequestApplyAgain = useCallback((request: ResidentContextRequest | ResidentRequestDetails) => {
        const draft = buildOnboardingDraftFromRequest(request);
        if (!draft) {
            AppAlert.show('Could not continue', 'This request is missing flat details. Please apply again.');
            return;
        }

        setShowRequestDetails(false);
        setSelectedRequest(null);
        startRequestCorrectionFlow({
            ...draft,
            returnTo: requestReturnTo,
            sourceRequestId: request.requestId,
            sourceRequestStatus: draft.sourceRequestStatus,
        });
        router.push('/(onboarding)/document-upload' as any);
    }, [requestReturnTo, router, startRequestCorrectionFlow]);

    const handleRequestEditSelection = useCallback((request: ResidentContextRequest | ResidentRequestDetails) => {
        const draft = buildOnboardingDraftFromRequest(request);
        if (!draft) {
            AppAlert.show('Could not continue', 'This request is missing flat details. Please apply again.');
            return;
        }

        setShowRequestDetails(false);
        setSelectedRequest(null);
        startRequestCorrectionFlow({
            ...draft,
            returnTo: requestReturnTo,
            sourceRequestId: request.requestId,
            sourceRequestStatus: draft.sourceRequestStatus,
        });
        router.push('/(onboarding)/select-block' as any);
    }, [requestReturnTo, router, startRequestCorrectionFlow]);

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
                            <SgateBrandMark size={44} />
                        </View>
                        <TouchableOpacity
                            style={S.contextTrigger}
                            activeOpacity={0.7}
                            disabled={!canOpenContextSheet}
                            onPress={() => setShowContextSheet(true)}
                            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                            <Text style={S.greetText}>{greeting()}, {firstName} 👋</Text>
                            <View style={S.contextTitleRow}>
                                <Text style={S.societyText} numberOfLines={1}>{contextTitle}</Text>
                                <MaterialCommunityIcons name="chevron-down" size={18} color={SgateColors.t1} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <WorkspaceSwitchButton variant="header" />

                        {/* Bell */}
                        <TouchableOpacity
                            style={S.bellBtn}
                            onPress={() => nav(notificationsRoute)}
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
                        {quickActions.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={S.quickItem}
                                onPress={() => handleQuickAction(item.route)}
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
                        onRightPress={() => nav(activityRoute)}
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

            {/* ── Floating SOS FAB (Shared for both roles) ──────────────── */}
            <FloatingSOSButton role="resident" bottomOffset={70} />

            <PreApproveSheet
                visible={showPreApprove}
                initialType={preApproveType}
                onClose={() => setShowPreApprove(false)}
            />

            <ResidentContextPicker
                visible={showContextSheet}
                contexts={residentContexts}
                requests={contextsData?.requests ?? []}
                activeContext={activeContext}
                isLoading={contextsLoading}
                switchingContextId={switchingContextId}
                onClose={() => setShowContextSheet(false)}
                onRefresh={fetchContexts}
                onSwitch={handleSwitchContext}
                onRequestPress={handleRequestPress}
                onAddAnother={handleAddAnotherHome}
                variant="dropdown"
                topOffset={insets.top + 88}
            />

            <ResidentRequestDetailsSheet
                visible={showRequestDetails}
                request={selectedRequest}
                onClose={() => setShowRequestDetails(false)}
                onDeleted={handleRequestDeleted}
                onApplyAgain={handleRequestApplyAgain}
                onEditSelection={handleRequestEditSelection}
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

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EEEB',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    logoWrap: {
        marginRight: 12,
    },
    contextTrigger: {
        flex: 1,
        justifyContent: 'center',
    },
    greetText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 2,
    },
    contextTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    societyText: {
        fontSize: 18,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        maxWidth: '85%',
        letterSpacing: -0.5,
    },
    bellBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8F8F8',
        borderWidth: 1,
        borderColor: '#EBEBEB',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#DC2626',
        borderRadius: 9,
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        minWidth: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontFamily: SgateFonts.bold,
    },
    gateAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BRAND_YELLOW_BG,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 14,
    },
    gateAlertDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#DC2626',
        marginRight: 8,
    },
    gateAlertText: {
        flex: 1,
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: '#996300',
    },
    scroll: {
        flex: 1,
        backgroundColor: '#F5F4F0',
    },
    scrollContent: {
        paddingVertical: 16,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E6E4E0',
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    quickItem: {
        width: '25%',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    quickIcon: {
        width: 52,
        height: 52,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    quickLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
        textAlign: 'center',
        width: '100%',
    },
    cardWrap: {
        marginBottom: 12,
    },
    activityCard: {
        backgroundColor: '#FFFFFF',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    activityDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0EEEB',
    },
    activityInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    activityName: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    actPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    actPillText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    emptySub: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    skeletonCard: {
        paddingVertical: 8,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0EEEB',
        marginRight: 12,
    },
    skeletonLine: {
        height: 10,
        backgroundColor: '#F0EEEB',
        borderRadius: 5,
    },
});
