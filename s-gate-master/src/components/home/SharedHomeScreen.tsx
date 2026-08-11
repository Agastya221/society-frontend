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
import { useProfileStore } from '@/store/useProfileStore';
import { useQueryClient } from '@tanstack/react-query';
import { buildOnboardingDraftFromRequest } from '@/utils/onboardingRequestDraft';
import {
    getActiveContextForRole,
    hasRoleContexts,
} from '@/utils/contextGuards';

import ActivityCard from './ActivityCard';
import { AdminActionSummary } from './AdminActionSummary';
import { FloatingSOSButton } from './FloatingSOSButton';
import HeroCard from './HeroCard';
import HomeHeader from './HomeHeader';
import QuickActions from './QuickActions';
import WaitingGateCard from './WaitingGateCard';
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

function formatUserFlatLabel(user: any): string | null {
    const flatNumber = user?.flat?.flatNumber ?? user?.flat?.number;
    const blockName = user?.flat?.block?.name;

    if (flatNumber) {
        return [blockName, flatNumber].filter(Boolean).join(' - ');
    }

    return null;
}

function countPendingDues(raw: any): number {
    const list: any[] = Array.isArray(raw) ? raw : raw?.dues ?? raw?.items ?? [];
    return list.filter((due) => String(due?.status ?? '').toUpperCase() !== 'PAID').length;
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
        setSelectedContextForRole,
    } = useAuthStore();
    const startAddMembershipFlow = useOnboardingStore((s) => s.startAddMembershipFlow);
    const startRequestCorrectionFlow = useOnboardingStore((s) => s.startRequestCorrectionFlow);

    const isAdmin = role === 'admin';

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

    const availableRoles = hasRoleContexts(userContexts);
    const canShowAdminPill = availableRoles.resident && availableRoles.admin;

    const queryClient = useQueryClient();
    const [switchingWorkspace, setSwitchingWorkspace] = useState(false);
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
            return;
        }

        try {
            const res = await api.get('/resident/dues');
            setPendingDuesCount(countPendingDues(res.data?.data ?? res.data));
        } catch {
            setPendingDuesCount(0);
        }
    }, [isAdmin]);

    const fetchSharedData = useCallback(async () => {
        await Promise.allSettled([
            fetchPendingRequests(),
            fetchUnreadCount(),
            fetchEntries({ status: 'CHECKED_IN' }),
            fetchResidentDuesCount(),
        ]);
    }, [fetchPendingRequests, fetchUnreadCount, fetchEntries, fetchResidentDuesCount]);

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

    const societyName = user?.society?.name ?? 'Your Society';
    const notificationsRoute = isAdmin ? '/(admin)/notifications' : '/notifications';
    const activityRoute = isAdmin ? '/(admin)/approval-requests' : '/(resident)/approvals';
    const sosRoute = isAdmin ? '/(admin)/sos-create' : '/(resident)/emergency/create';
    const quickActions = getQuickActionsForRole(role);
    const allContexts = contextsData?.contexts ?? userContexts;
    const selectedContextId = isAdmin ? selectedAdminContextId : selectedResidentContextId;
    const activeContext = getActiveContextForRole(role, allContexts, selectedContextId);
    const contextTitle = activeContext?.label ?? formatUserFlatLabel(user) ?? societyName;
    const canOpenContextSheet = allContexts.length > 0 || !contextsLoading;
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

    const handleWorkspaceSwitch = useCallback(async () => {
        const targetRole = isAdmin ? 'resident' : 'admin';
        const targetContext = getActiveContextForRole(
            targetRole,
            allContexts,
            targetRole === 'admin' ? selectedAdminContextId : selectedResidentContextId,
        );

        if (!targetContext) {
            AppAlert.show(
                'Switch Error',
                `No alternate workspace found for ${targetRole === 'admin' ? 'Admin View' : 'Resident View'}.`
            );
            return;
        }

        setSwitchingWorkspace(true);
        try {
            // 1. Invoke Switch Context API
            const result = await switchResidentContext(targetContext.membershipId);
            await setSelectedContextForRole(targetRole, targetContext.membershipId);

            // 2. Reset Zustand Stores to clear stale data
            useGateStore.getState().reset();
            useProfileStore.getState().reset();
            useNotificationStore.getState().reset();

            // 3. Invalidate query cache
            await queryClient.invalidateQueries({ queryKey: ['onboarding'] });

            // 4. Update Global Auth state with new JWT, User role and Contexts
            await login(
                result.accessToken,
                result.refreshToken,
                result.user,
                result.appType,
                false,
                null,
                result.contexts?.contexts ?? userContexts
            );

            // 5. Navigate to the requested workspace root. The backend user role can remain admin
            // for dual-role users, so the selected target role is the source of truth here.
            const targetRoute = targetRole === 'admin' ? '/(admin)' : '/(resident)/home';
            router.replace(targetRoute as any);
        } catch (error: any) {
            console.error('Failed to switch workspace:', error);
            AppAlert.show(
                'Workspace Switch Failed',
                error?.response?.data?.message || 'We could not switch your workspace right now. Please verify your connection.'
            );
        } finally {
            setSwitchingWorkspace(false);
        }
    }, [
        isAdmin,
        allContexts,
        selectedAdminContextId,
        selectedResidentContextId,
        setSelectedContextForRole,
        userContexts,
        login,
        router,
        queryClient,
    ]);

    const handleSwitchContext = useCallback(async (context: ResidentContext) => {
        const targetRole = role;
        const sameRoleActive =
            activeContext?.membershipId === context.membershipId || context.isActiveContext;

        if (sameRoleActive || switchingContextId) {
            setShowContextSheet(false);
            return;
        }

        setSwitchingContextId(context.membershipId);
        try {
            const result = await switchResidentContext(context.membershipId);
            await setSelectedContextForRole(targetRole, context.membershipId);
            useGateStore.getState().reset();
            useProfileStore.getState().reset();
            useNotificationStore.getState().reset();
            await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
            await login(
                result.accessToken,
                result.refreshToken,
                result.user,
                result.appType,
                false,
                null,
                result.contexts?.contexts ?? userContexts,
            );
            setContextsData(result.contexts);
            setShowContextSheet(false);

            const targetRoute = targetRole === 'admin' ? '/(admin)' : '/(resident)/home';

            if (targetRole !== role) {
                router.replace(targetRoute as any);
                return;
            }

            await Promise.allSettled([
                fetchSharedData(),
                fetchContexts(),
                targetRole === 'admin' ? fetchAdminData() : Promise.resolve(),
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
        role,
        activeContext?.membershipId,
        setSelectedContextForRole,
        login,
        userContexts,
        fetchSharedData,
        fetchContexts,
        fetchAdminData,
        router,
        queryClient,
    ]);

    const handleAddAnotherHome = useCallback(() => {
        setShowContextSheet(false);
        if (role === 'admin') {
            router.push('/(admin)/settings' as any);
            return;
        }
        startAddMembershipFlow('/(resident)/profile');
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
                onWorkspaceSwitch={handleWorkspaceSwitch}
                switchingWorkspace={switchingWorkspace}
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
                contexts={allContexts}
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
                mode={role}
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
