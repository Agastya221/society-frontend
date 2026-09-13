import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeOutLeft,
    FadeOutRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import { ResidentContextPicker } from '@/components/context/ResidentContextPicker';
import { ResidentRequestDetailsSheet } from '@/components/context/ResidentRequestDetailsSheet';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AppAlert } from '@/components/ui/AppAlert';
import { ApprovalCard } from '@/components/visitors/ApprovalCard';
import { SgateColors } from '@/constants/Sgate-theme';

import api from '@/services/api';
import * as communityService from '@/services/community.service';
import * as gateService from '@/services/gate.service';
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
import { buildOnboardingDraftFromRequest } from '@/utils/onboardingRequestDraft';

import ActivityCard from './ActivityCard';
import { AdminActionSummary } from './AdminActionSummary';
import { FloatingSOSButton } from './FloatingSOSButton';
import HeroCard from './HeroCard';
import HomeHeader from './HomeHeader';
import QuickActions from './QuickActions';
import WaitingGateCard from './WaitingGateCard';
import ResidentHomeDashboard from './ResidentHomeDashboard';
import type { ResidentSocietyUpdate } from './ResidentHomeWidgets';
import { type UserRole, getQuickActionsForRole } from './homeToolsConfig';

const BRAND_YELLOW = '#FFB800';

interface SharedHomeScreenProps {
    role: UserRole;
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

function shouldOpenAdminArea(redirectTo?: string, nextRole?: string | null): boolean {
    const normalizedRole = nextRole?.toUpperCase();
    return redirectTo === 'ADMIN_PANEL' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

function formatUserFlatLabel(user: any): string | null {
    const flatNumber = user?.flat?.flatNumber ?? user?.flat?.number;
    const blockName = user?.flat?.block?.name;

    if (flatNumber) {
        return [blockName, flatNumber].filter(Boolean).join(' - ');
    }

    return null;
}

function getPendingDues(raw: any): any[] {
    const list: any[] = Array.isArray(raw) ? raw : raw?.dues ?? raw?.items ?? [];
    return list.filter((due) => String(due?.status ?? due?.invoiceStatus ?? '').toUpperCase() !== 'PAID');
}

function getDueAmount(due: any): number {
    return Number(due?.totalAmount ?? due?.amount ?? due?.payableAmount ?? due?.balanceAmount ?? 0) || 0;
}

function getListFromPayload(raw: any, key: string): any[] {
    const payload = raw?.data ?? raw;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

function getCountFromPayload(raw: any, fallback: number): number {
    const payload = raw?.data ?? raw;
    return Number(payload?.total ?? payload?.count ?? payload?.meta?.total ?? fallback);
}

export default function SharedHomeScreen({ role }: SharedHomeScreenProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        user,
        role: authRole,
        login,
        userContexts,
        selectedResidentContextId,
        selectedAdminContextId,
    } = useAuthStore();
    const startAddMembershipFlow = useOnboardingStore((s) => s.startAddMembershipFlow);
    const startRequestCorrectionFlow = useOnboardingStore((s) => s.startRequestCorrectionFlow);

    const isAdmin = role === 'admin';

    const pendingRequests = useGateStore((state) => state.pendingRequests);
    const entries = useGateStore((state) => state.entries);
    const gateLoading = useGateStore((state) => state.isLoading);
    const fetchPendingRequests = useGateStore((state) => state.fetchPendingRequests);
    const fetchEntries = useGateStore((state) => state.fetchEntries);
    const approveRequest = useGateStore((state) => state.approveRequest);
    const rejectRequest = useGateStore((state) => state.rejectRequest);
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
    const canShowAdminPill = isAdmin || authRole === 'ADMIN' || authRole === 'SUPER_ADMIN';

    const [showPreApprove, setShowPreApprove] = useState(false);
    const [preApproveType, setPreApproveType] = useState<any>(undefined);
    const [refreshing, setRefreshing] = useState(false);
    const [exitDir, setExitDir] = useState<Record<string, 'left' | 'right'>>({});
    const [contextsData, setContextsData] = useState<ResidentContextsResponse | null>(null);
    const [showContextSheet, setShowContextSheet] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ResidentContextRequest | null>(null);
    const [showRequestDetails, setShowRequestDetails] = useState(false);
    const [contextsLoading, setContextsLoading] = useState(false);
    const [switchingContextId, setSwitchingContextId] = useState<string | null>(null);
    const [pendingSocietyPasses, setPendingSocietyPasses] = useState<any[]>([]);
    const [pendingOnboardingCount, setPendingOnboardingCount] = useState(0);
    const [pendingDuesCount, setPendingDuesCount] = useState(0);
    const [pendingDuesAmount, setPendingDuesAmount] = useState<number | null>(null);
    const [deliveryCount, setDeliveryCount] = useState<number | null>(null);
    const [societyUpdates, setSocietyUpdates] = useState<ResidentSocietyUpdate[]>([]);

    const fetchAdminData = useCallback(async () => {
        if (!isAdmin) return;
        if (authRole !== 'ADMIN' && authRole !== 'SUPER_ADMIN') return;
        try {
            const [passesRes, onboardingRes] = await Promise.allSettled([
                api.get('/gate/passes', { params: { status: 'PENDING' } }),
                api.get('/resident/onboarding/admin/pending', {
                    params: { status: 'PENDING_APPROVAL', page: 1, limit: 20 },
                }),
            ]);

            const rawPasses = passesRes.status === 'fulfilled'
                ? passesRes.value.data?.data || passesRes.value.data || []
                : [];
            const societyPasses = Array.isArray(rawPasses)
                ? rawPasses.filter((p: any) => p.type.includes('MATERIAL') || p.type.includes('MOVE'))
                : [];
            setPendingSocietyPasses(societyPasses);

            if (onboardingRes.status === 'fulfilled') {
                const requests = getListFromPayload(onboardingRes.value.data, 'requests');
                setPendingOnboardingCount(getCountFromPayload(onboardingRes.value.data, requests.length));
            } else {
                setPendingOnboardingCount(0);
            }
        } catch (error) {
            console.error('Admin data fetch failed:', error);
        }
    }, [isAdmin, authRole]);

    const fetchResidentDuesCount = useCallback(async () => {
        if (isAdmin) {
            setPendingDuesCount(0);
            setPendingDuesAmount(null);
            return;
        }

        try {
            const res = await api.get('/resident/dues');
            const raw = res.data?.data ?? res.data;
            const pendingDues = getPendingDues(raw);
            setPendingDuesCount(pendingDues.length);
            setPendingDuesAmount(pendingDues.reduce((total, due) => total + getDueAmount(due), 0));
        } catch {
            setPendingDuesCount(0);
            setPendingDuesAmount(null);
        }
    }, [isAdmin]);

    const fetchResidentHomeData = useCallback(async () => {
        if (isAdmin) {
            setDeliveryCount(null);
            setSocietyUpdates([]);
            return;
        }

        const [deliveryRes, noticesRes] = await Promise.allSettled([
            gateService.getExpectedDeliveries(),
            communityService.getNotices({ page: 1, limit: 2 }),
        ]);

        if (deliveryRes.status === 'fulfilled') {
            const deliveries = deliveryRes.value as any[];
            setDeliveryCount(deliveries.length);
            const firstDelivery = deliveries[0];
            if (firstDelivery) {
                setSocietyUpdates((current) => [
                    ...current.filter((update) => update.kind !== 'delivery'),
                    {
                        id: `delivery-${firstDelivery.id ?? 'today'}`,
                        title: `${firstDelivery.company ?? firstDelivery.provider ?? 'Package'} delivery arriving`,
                        subtitle: 'Expected today',
                        detail: 'Keep your phone handy',
                        kind: 'delivery',
                    },
                ]);
            }
        } else {
            setDeliveryCount(null);
        }

        if (noticesRes.status === 'fulfilled') {
            const notices = noticesRes.value as any[];
            const notice = notices[0];
            if (notice) {
                setSocietyUpdates((current) => [
                    {
                        id: notice.id ?? 'notice-today',
                        title: notice.title ?? 'Society update',
                        subtitle: notice.type === 'MAINTENANCE' ? 'Maintenance update' : 'New notice',
                        detail: notice.location ?? 'Tap to read more',
                        kind: notice.type === 'MAINTENANCE' ? 'maintenance' : 'notice',
                    },
                    ...current.filter((update) => update.kind !== 'notice' && update.kind !== 'maintenance'),
                ]);
            }
        }
    }, [isAdmin]);

    const fetchSharedData = useCallback(async () => {
        await Promise.allSettled([
            fetchPendingRequests(),
            fetchUnreadCount(),
            fetchEntries({ status: 'CHECKED_IN' }),
            fetchResidentDuesCount(),
            fetchResidentHomeData(),
        ]);
    }, [fetchPendingRequests, fetchUnreadCount, fetchEntries, fetchResidentDuesCount, fetchResidentHomeData]);

    const fetchContexts = useCallback(async () => {
        if (!user?.id) return;
        setContextsLoading(true);
        try {
            const result = await getResidentContexts();
            setContextsData(result);
            useAuthStore.getState().setContexts(result.contexts ?? []);
        } catch (error) {
            console.error('Context fetch failed:', error);
        } finally {
            setContextsLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchSharedData();
            fetchContexts();
            if (isAdmin) fetchAdminData();
        }, [fetchSharedData, fetchContexts, fetchAdminData, isAdmin])
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchSharedData(),
            fetchContexts(),
            isAdmin ? fetchAdminData() : Promise.resolve(),
        ]);
        setRefreshing(false);
    }, [fetchSharedData, fetchContexts, fetchAdminData, isAdmin]);

    const handleApprove = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        try {
            await approveRequest(id);
        } catch {
            AppAlert.show('Error', 'Failed to approve. Please try again.');
        }
    };

    const handleDeny = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'left' }));
        try {
            await rejectRequest(id);
        } catch {
            AppAlert.show('Error', 'Failed to deny. Please try again.');
        }
    };

    const handleApprovePass = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        try {
            const { approveGatePass } = await import('@/services/gatePass');
            await approveGatePass(id);
            fetchAdminData();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const nav = useCallback((route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    }, [router]);

    const notificationsRoute = isAdmin ? '/(admin)/notifications' : '/(resident)/notifications';
    const activityRoute = isAdmin ? '/(admin)/approval-requests' : '/(resident)/approvals';
    const sosRoute = isAdmin ? '/(admin)/sos-create' : '/(resident)/emergency/create';
    const quickActions = getQuickActionsForRole(role);
    const selectedContextId = isAdmin ? selectedAdminContextId : selectedResidentContextId;
    const cachedContext = userContexts.find((context) => context.membershipId === selectedContextId)
        ?? userContexts.find((context) => context.isActiveContext)
        ?? null;
    const activeContext = contextsData?.activeContext ?? cachedContext;
    const rawSocietyName = activeContext?.societyName
        ?? contextsData?.contexts?.[0]?.societyName
        ?? user?.society?.name
        ?? 'Society';
    const societyName = rawSocietyName.trim().toLowerCase() === 'society' ? 'My Society' : rawSocietyName;
    const activeFlatTitle = activeContext?.flatNumber
        ? [activeContext.blockName, activeContext.flatNumber].filter(Boolean).join(' - ')
        : null;
    const contextLabel = activeContext?.label?.trim();
    const hasUsefulContextLabel = contextLabel
        && contextLabel.toLowerCase() !== rawSocietyName.trim().toLowerCase()
        && contextLabel.toLowerCase() !== 'society';
    const contextTitle = activeFlatTitle
        ?? (hasUsefulContextLabel ? contextLabel : null)
        ?? formatUserFlatLabel(user)
        ?? 'My Home';
    const canOpenContextSheet = (contextsData?.contexts?.length ?? 0) > 0 || !contextsLoading;
    const pendingAdminActionsCount = pendingSocietyPasses.length + pendingOnboardingCount;

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

    const handleHeroAction = useCallback((target: string) => {
        if (target === 'resident-approvals') {
            nav('/(resident)/approvals');
            return;
        }
        if (target === 'resident-dues') {
            nav('/(resident)/society-dues');
            return;
        }
        if (target === 'admin-approvals') {
            nav(pendingSocietyPasses.length > 0 ? '/(admin)/gate-passes' : '/(admin)/onboarding-requests');
        }
    }, [nav, pendingSocietyPasses.length]);

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

            if (nextIsAdmin !== isAdmin) {
                router.replace(targetRoute as any);
                return;
            }

            await Promise.allSettled([
                fetchSharedData(),
                fetchContexts(),
                nextIsAdmin ? fetchAdminData() : Promise.resolve(),
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
        fetchAdminData,
        isAdmin,
        router,
    ]);

    const handleAddAnotherHome = useCallback(() => {
        setShowContextSheet(false);
        startAddMembershipFlow(role === 'admin' ? '/(admin)/profile' : '/(resident)/profile');
        router.push('/(onboarding)/select-city' as any);
    }, [role, router, startAddMembershipFlow]);

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

    const requestReturnTo = role === 'admin' ? '/(admin)/profile' : '/(resident)/profile';

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

    if (!isAdmin) {
        return (
            <View style={S.root}>
                <ResidentHomeDashboard
                    user={user as any}
                    towerName={contextTitle}
                    societyName={societyName}
                    notificationCount={unreadCount}
                    canOpenContextSheet={canOpenContextSheet}
                    pendingRequests={pendingRequests}
                    gateLoading={gateLoading}
                    deliveryCount={deliveryCount}
                    duesAmount={pendingDuesAmount}
                    updates={societyUpdates}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    onContextPress={() => setShowContextSheet(true)}
                    onNotificationPress={() => nav(notificationsRoute)}
                    onSosPress={() => nav(sosRoute)}
                    onNavigate={handleQuickAction}
                    onAllow={handleApprove}
                    onDecline={handleDeny}
                />
                <PreApproveSheet
                    visible={showPreApprove}
                    initialType={preApproveType}
                    onClose={() => setShowPreApprove(false)}
                />
                <ResidentContextPicker
                    visible={showContextSheet}
                    contexts={contextsData?.contexts ?? []}
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

    return (
        <View style={S.root}>
            <HomeHeader
                towerName={contextTitle}
                societyName={societyName}
                notificationCount={unreadCount}
                canOpenContextSheet={canOpenContextSheet}
                showWorkspaceSwitch={canShowAdminPill}
                currentRole={role}
                onContextPress={() => setShowContextSheet(true)}
                onNotificationPress={() => nav(notificationsRoute)}
                onWorkspaceSwitch={() => nav(isAdmin ? '/(resident)/home' : '/(admin)')}
            />

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
                <HeroCard
                    role={role}
                    pendingRequestsCount={pendingRequests.length}
                    pendingApprovalsCount={pendingAdminActionsCount}
                    duesPendingCount={pendingDuesCount}
                    onAction={handleHeroAction}
                />

                <QuickActions actions={quickActions} onActionPress={handleQuickAction} />

                <AdminActionSummary
                    pendingOnboardingCount={pendingOnboardingCount}
                    onOpenOnboarding={() => nav('/(admin)/onboarding-requests')}
                />

                {isAdmin && pendingSocietyPasses.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(140).springify()} style={S.section}>
                        <SectionHeader
                            title="Action Required"
                            rightPill={{
                                text: `${pendingSocietyPasses.length} Society`,
                                color: SgateColors.red,
                                bg: SgateColors.redBg,
                            }}
                        />
                        {pendingSocietyPasses.map((pass, index) => (
                            <Animated.View
                                key={pass.id}
                                entering={FadeInDown.delay(index * 60).springify()}
                                exiting={
                                    exitDir[pass.id] === 'right'
                                        ? FadeOutRight.duration(260)
                                        : FadeOutLeft.duration(260)
                                }
                                style={S.cardWrap}
                            >
                                <ApprovalCard
                                    name={pass.title || pass.type.replace('_', ' ')}
                                    type={pass.flat?.flatNumber ? `Flat ${pass.flat.flatNumber}` : 'Society'}
                                    time={timeAgo(pass.createdAt)}
                                    gate={pass.requestedBy?.name || 'Admin Request'}
                                    onApprove={() => handleApprovePass(pass.id)}
                                    onDeny={() => nav('/(admin)/gate-passes')}
                                />
                            </Animated.View>
                        ))}
                    </Animated.View>
                )}

                <WaitingGateCard
                    pendingRequests={pendingRequests}
                    isLoading={gateLoading}
                    exitDir={exitDir}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                />

                <ActivityCard
                    entries={entries}
                    isLoading={gateLoading}
                    onSeeAll={() => nav(activityRoute)}
                />
            </ScrollView>

            <FloatingSOSButton
                bottomOffset={Math.max(insets.bottom + 80, 80)}
                onPress={() => nav(sosRoute)}
            />

            <PreApproveSheet
                visible={showPreApprove}
                initialType={preApproveType}
                onClose={() => setShowPreApprove(false)}
            />

            <ResidentContextPicker
                visible={showContextSheet}
                contexts={contextsData?.contexts ?? []}
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

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 18,
        paddingBottom: 158,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    cardWrap: {
        marginBottom: 10,
    },
});
