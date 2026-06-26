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
import { ApprovalCard } from '@/components/visitors/ApprovalCard';
import { AppAlert } from '@/components/ui/AppAlert';
import { FloatingSOSButton } from '@/components/ui/FloatingSOSButton';
import { ResidentContextPicker } from '@/components/context/ResidentContextPicker';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import api from '@/services/api';
import {
    getResidentContexts,
    switchResidentContext,
    type ResidentContext,
    type ResidentContextsResponse,
} from '@/services/profile.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
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

function shouldOpenAdminArea(redirectTo?: string, nextRole?: string | null): boolean {
    const normalizedRole = nextRole?.toUpperCase();
    return redirectTo === 'ADMIN_PANEL' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

export default function AdminHomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, role: authRole, login } = useAuthStore();
    const startAddMembershipFlow = useOnboardingStore((s) => s.startAddMembershipFlow);

    const { unreadCount, fetchUnreadCount } = useNotificationStore();

    // ── Local state ──────────────────────────────────────────────────────────
    const [refreshing, setRefreshing]         = useState(false);
    const [exitDir, setExitDir]               = useState<Record<string, 'left' | 'right'>>({});
    const [contextsData, setContextsData]     = useState<ResidentContextsResponse | null>(null);
    const [showContextSheet, setShowContextSheet] = useState(false);
    const [contextsLoading, setContextsLoading]   = useState(false);
    const [switchingContextId, setSwitchingContextId] = useState<string | null>(null);
    const [pendingSocietyPasses, setPendingSocietyPasses] = useState<any[]>([]);

    // ── Data fetching ────────────────────────────────────────────────────────

    const fetchAdminData = useCallback(async () => {
        if (authRole !== 'ADMIN' && authRole !== 'SUPER_ADMIN') return;
        try {
            const passesRes = await api.get('/gate/passes', { params: { status: 'PENDING' } });
            const rawPasses = passesRes.data?.data || passesRes.data || [];
            const societyPasses = Array.isArray(rawPasses)
                ? rawPasses.filter((p: any) => p.type.includes('MATERIAL') || p.type.includes('MOVE'))
                : [];
            setPendingSocietyPasses(societyPasses);
        } catch (error) {
            console.error('Admin data fetch failed:', error);
        }
    }, [authRole]);

    const fetchSharedData = useCallback(async () => {
        await Promise.allSettled([
            fetchUnreadCount(),
        ]);
    }, [fetchUnreadCount]);

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
            fetchAdminData();
        }, [fetchSharedData, fetchContexts, fetchAdminData])
    );

    // ── Pull-to-refresh ──────────────────────────────────────────────────────

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchSharedData(),
            fetchContexts(),
            fetchAdminData(),
        ]);
        setRefreshing(false);
    }, [fetchSharedData, fetchContexts, fetchAdminData]);

    // ── Admin society pass approval ──────────────────────────────────────────

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

    // ── Navigation helper ────────────────────────────────────────────────────

    const nav = useCallback((route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    }, [router]);

    // ── Derived data ─────────────────────────────────────────────────────────

    const firstName   = user?.name?.split(' ')[0] ?? 'Admin';
    const societyName = user?.society?.name ?? 'Your Society';

    const notificationsRoute = '/(admin)/notifications';

    // ── Quick actions from config ────────────────────────────────────────────

    const quickActions = getQuickActionsForRole('admin');

    const adminContexts = contextsData?.contexts?.filter(c => c.role !== 'RESIDENT') ?? [];
    const activeContext = adminContexts.find(c => c.isActiveContext) ?? null;

    const contextTitle = activeContext?.label
        ?? [user?.flat?.block?.name, user?.flat?.number].filter(Boolean).join(' - ')
        ?? societyName;
    const canOpenContextSheet = adminContexts.length > 0 || !contextsLoading;

    const handleQuickAction = useCallback((route: string) => {
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

            if (!nextIsAdmin) {
                router.replace(targetRoute as any);
                return;
            }

            await Promise.allSettled([
                fetchSharedData(),
                fetchContexts(),
                fetchAdminData(),
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
        router,
    ]);

    const handleAddAnotherHome = useCallback(() => {
        setShowContextSheet(false);
        startAddMembershipFlow('/(admin)/profile');
        router.push('/(onboarding)/select-city' as any);
    }, [router, startAddMembershipFlow]);

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

                {/* ══ ADMIN: ACTION REQUIRED (Society Passes) ═════════════ */}
                {pendingSocietyPasses.length > 0 && (
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
            </ScrollView>

            {/* ── Floating SOS FAB (Shared for both roles) ──────────────── */}
            <FloatingSOSButton role="admin" bottomOffset={70} />

            <ResidentContextPicker
                visible={showContextSheet}
                contexts={adminContexts}
                requests={[]}
                activeContext={activeContext}
                isLoading={contextsLoading}
                switchingContextId={switchingContextId}
                onClose={() => setShowContextSheet(false)}
                onRefresh={fetchContexts}
                onSwitch={handleSwitchContext}
                onRequestPress={() => {}}
                onAddAnother={handleAddAnotherHome}
                variant="dropdown"
                topOffset={insets.top + 88}
            />
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
});
