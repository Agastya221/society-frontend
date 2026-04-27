import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    SgateBrandMark,
    SgateQuickAction,
    SgateSecurityBanner,
} from '@/components/Sgate';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ApprovalCard } from '@/components/visitors/ApprovalCard';
import { PreApproveSheet } from '@/components/pre-approvals/PreApproveSheet';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';

import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useGateStore } from '@/store/useGateStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { Entry } from '@/types/api';

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

interface DashboardStats {
    totalFlats: number;
    occupiedFlats: number;
    activeResidents: number;
    todayEntries: number;
    pendingComplaints: number;
    pendingGatePasses?: number;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, role } = useAuthStore();

    // Store states (same as resident home)
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

    // Admin Dashboard stats
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showPreApprove, setShowPreApprove] = useState(false);
    const [pendingSocietyPasses, setPendingSocietyPasses] = useState<any[]>([]);

    // Track array element exit direction
    const [exitDir, setExitDir] = useState<Record<string, 'left' | 'right'>>({});

    const fetchAllAdmin = async () => {
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return;
        try {
            // Parallel fetch for stats and society-level pending passes
            const [dashRes, passesRes] = await Promise.all([
                api.get('/admin/reports/dashboard'),
                api.get('/gate/passes', { params: { status: 'PENDING' } })
            ]);

            if (dashRes.status === 200) {
                setStats(dashRes.data?.data ?? null);
            }

            // Correct access based on common API patterns in this repo
            const rawPasses = passesRes.data?.data || passesRes.data || [];
            // Filter only for types that need admin eyes (Material/Moving)
            const societyPasses = Array.isArray(rawPasses) 
                ? rawPasses.filter((p: any) => p.type.includes('MATERIAL') || p.type.includes('MOVE')) 
                : [];
            setPendingSocietyPasses(societyPasses);

        } catch (error) {
            console.error('Admin Dashboard fetch failed:', error);
            setStats({ totalFlats: 0, occupiedFlats: 0, activeResidents: 0, todayEntries: 0, pendingComplaints: 0 });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchAllAdmin();
        fetchPendingRequests();
        fetchUnreadCount();
        fetchEntries({ status: 'CHECKED_IN' });
    }, [role]));

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchAllAdmin(),
            fetchPendingRequests(),
            fetchUnreadCount(),
            fetchEntries({ status: 'CHECKED_IN' }),
        ]);
        setRefreshing(false);
    };

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleApprovePass = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        try {
            const { approveGatePass } = await import('@/services/gatePass');
            await approveGatePass(id);
            // Refresh to ensure sync
            fetchAllAdmin();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleApprove = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'right' }));
        try {
            await approveRequest(id);
        } catch {
            // handle error
        }
    };

    const handleDeny = async (id: string) => {
        setExitDir(prev => ({ ...prev, [id]: 'left' }));
        try {
            await rejectRequest(id);
        } catch {
            // handle error
        }
    };

    const nav = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const firstName   = user?.name?.split(' ')[0] ?? 'Admin';
    const societyName = user?.society?.name ?? 'Your Society';

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
                {/* ══ WHITE HEADER ══════════════════════════════════════════ */}
                <View style={[styles.headerArea, { paddingTop: insets.top + 14 }]}>
                    <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.greetingRow}>
                        <View style={styles.greetingLeft}>
                            <SgateBrandMark size={42} />
                            <View style={styles.greetingTexts}>
                                <Text style={styles.greetingLine}>{greeting()}, {firstName}</Text>
                                <Text style={styles.societyLine} numberOfLines={1}>{societyName}</Text>
                            </View>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.bellBtn} onPress={() => nav('/(admin)/notifications')}>
                                <MaterialCommunityIcons name="bell-outline" size={22} color={SgateColors.t1} />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => nav('/(admin)/profile')}>
                                <Avatar name={user?.name ?? 'A'} size={40} />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(80).springify()}>
                        <SgateSecurityBanner />
                    </Animated.View>
                </View>

                {/* ══ BG CONTENT AREA ═══════════════════════════════════════ */}
                <View style={styles.contentArea}>

                    {/* ── Admin Stats Grid ──────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.statsWrap}>
                        <View style={styles.statsGrid}>
                            <StatCard label="Total Flats" value={stats?.totalFlats ?? 0} icon="home-outline" color={SgateColors.blue} bg={SgateColors.blueBg} loading={loading} />
                            <StatCard label="Residents" value={stats?.activeResidents ?? 0} icon="account-group-outline" color={SgateColors.green} bg={SgateColors.greenBg} loading={loading} />
                            <StatCard label="Entries Today" value={stats?.todayEntries ?? 0} icon="chart-line" color={SgateColors.goldDeep} bg={SgateColors.goldPale} loading={loading} />
                            <StatCard label="Open Complaints" value={stats?.pendingComplaints ?? 0} icon="alert-circle-outline" color={SgateColors.red} bg={SgateColors.redBg} loading={loading} />
                        </View>
                    </Animated.View>

                    {/* ── Quick Actions ──────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(160).springify()} style={[styles.quickRow, { marginBottom: 0 }]}>
                        <SgateQuickAction icon="account-check-outline" label={'Pre-\nApprove'} bgColor={SgateColors.goldPale} iconColor={SgateColors.goldDeep} onPress={() => setShowPreApprove(true)} />
                        <SgateQuickAction icon="smart-card-outline" label={'My\nPasses'} bgColor={SgateColors.blueBg} iconColor={SgateColors.blue} onPress={() => nav('/(admin)/my-passes')} />
                        <SgateQuickAction icon="receipt-text-outline" label={'My\nDues'} bgColor={SgateColors.surface} iconColor={SgateColors.t2} onPress={() => nav('/(admin)/my-dues')} />
                        <SgateQuickAction icon="alert-outline" label={'SOS\nAlert'} bgColor={SgateColors.redBg} iconColor={SgateColors.red} onPress={() => nav('/(admin)/emergencies')} />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.quickRow, { marginTop: 18, marginBottom: 28 }]}>
                        <SgateQuickAction icon="clipboard-check-outline" label={'Gate\nPasses'} bgColor={SgateColors.goldPale} iconColor={SgateColors.goldDeep} onPress={() => nav('/(admin)/gate-passes')} />
                        <SgateQuickAction icon="account-group-outline" label={'Residents'} bgColor={SgateColors.blueBg} iconColor={SgateColors.blue} onPress={() => nav('/(admin)/onboarding-requests')} />
                        <SgateQuickAction icon="shield-outline" label={'Guards'} bgColor={SgateColors.greenBg} iconColor={SgateColors.green} onPress={() => nav('/(admin)/guards')} />
                        <SgateQuickAction icon="view-grid-outline" label={'All\nTools'} bgColor={SgateColors.surface} iconColor={SgateColors.t2} onPress={() => nav('/(admin)/all-tools')} />
                    </Animated.View>

                    {/* ── Society Approvals (Admin Power) ────────────────────── */}
                    {pendingSocietyPasses.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.section}>
                            <SectionHeader
                                title="Action Required"
                                rightPill={{ text: `${pendingSocietyPasses.length} Society`, color: SgateColors.red, bg: SgateColors.redBg }}
                            />
                            {pendingSocietyPasses.map((pass, index) => (
                                <Animated.View key={pass.id} entering={FadeInDown.delay(index * 70).springify()}
                                    exiting={exitDir[pass.id] === 'right' ? FadeOutRight.duration(260) : FadeOutLeft.duration(260)}
                                    style={styles.cardWrap}>
                                    <ApprovalCard
                                        name={pass.title || pass.type.replace('_', ' ')}
                                        type={pass.flat?.flatNumber ? `Flat ${pass.flat.flatNumber}` : 'Society'}
                                        time={timeAgo(pass.createdAt)}
                                        gate={pass.requestedBy?.name || 'Admin Request'}
                                        onApprove={() => handleApprovePass(pass.id)}
                                        onDeny={() => nav('/(admin)/gate-passes')} // Redirect to full view for rejections with reasons
                                    />
                                </Animated.View>
                            ))}
                        </Animated.View>
                    )}

                    {/* ── Waiting at Gate (Personal) ─────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.section}>
                        <SectionHeader
                            title="My Visitors"
                            rightPill={pendingRequests.length > 0 ? { text: `${pendingRequests.length} new`, color: SgateColors.goldDeep, bg: SgateColors.goldPale } : undefined}
                        />

                        {gateLoading && pendingRequests.length === 0 ? (
                            <GateSkeleton />
                        ) : pendingRequests.length === 0 ? (
                            <GateEmpty />
                        ) : (
                            pendingRequests.map((req, index) => (
                                <Animated.View key={req.id} entering={FadeInDown.delay(index * 70).springify()}
                                    exiting={exitDir[req.id] === 'right' ? FadeOutRight.duration(260) : FadeOutLeft.duration(260)}
                                    style={styles.cardWrap}>
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

                    {/* ── Today's Activity ──────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.section}>
                        <SectionHeader title="Today's Activity" rightLabel="See all" onRightPress={() => nav('/(resident)/approvals')} />

                        {entries.length === 0 ? (
                            <ActivityEmpty />
                        ) : (
                            <View style={styles.activityCard}>
                                {entries.map((entry, index) => (
                                    <ActivityRow key={entry.id} entry={entry} isLast={index === entries.length - 1} />
                                ))}
                            </View>
                        )}
                    </Animated.View>

                </View>
            </ScrollView>

            <PreApproveSheet visible={showPreApprove} onClose={() => setShowPreApprove(false)} />
        </View>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, bg, loading }: any) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
                 <MaterialCommunityIcons name={icon} size={16} color={color} />
            </View>
            <Text style={styles.statValue}>{loading ? '—' : value}</Text>
            <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
        </View>
    );
}

function LargeAction({ title, sub, icon, bg, color, onPress }: any) {
    return (
        <TouchableOpacity style={styles.largeTile} onPress={onPress}>
            <View style={[styles.largeTileIcon, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.largeTileTitle}>{title}</Text>
            <Text style={styles.largeTileSub}>{sub}</Text>
        </TouchableOpacity>
    );
}

function ActivityRow({ entry, isLast }: { entry: Entry; isLast: boolean }) {
    const { pill, label } = entryStatusToPill(entry.status);
    return (
        <View style={[styles.activityRow, !isLast && styles.activityDivider]}>
            <Avatar name={entry.visitorName} size={36} />
            <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={1}>{entry.visitorName}</Text>
                <Text style={styles.activityTime}>{timeAgo(entry.createdAt)}</Text>
            </View>
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

function GateEmpty() {
    return (
        <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="check-circle-outline" size={26} color={SgateColors.green} />
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
            <MaterialCommunityIcons name="clock-outline" size={20} color={SgateColors.t4} />
            <Text style={styles.activityEmptyText}>No activity yet today</Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.card },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    // Header
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
    greetingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    greetingTexts: { flex: 1 },
    greetingLine: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    societyLine: { fontSize: 18, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bellBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    badge: {
        position: 'absolute', top: 7, right: 7,
        minWidth: 16, height: 16, borderRadius: 8,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: SgateColors.card,
    },
    badgeText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.black },

    // Content area
    contentArea: {
        backgroundColor: SgateColors.bg,
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    statsWrap: { marginBottom: 28 },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    statCard: {
        width: '48%',
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
    },
    statIconWrap: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: { fontSize: 24, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, marginBottom: 2 },
    statLabel: { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t3, letterSpacing: 0.5 },

    // Section
    section: { marginBottom: 28 },
    cardWrap: { marginBottom: 12 },
    quickRow: { flexDirection: 'row', gap: 10 },

    // Large Quick Row (Admin tools)
    largeQuickRowWrap: { gap: 12 },
    largeQuickRow: { flexDirection: 'row', gap: 12 },
    largeTile: {
        flex: 1,
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        minHeight: 120,
    },
    largeTileIcon: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    largeTileTitle: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    largeTileSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

    // Activity card
    activityCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
    activityDivider: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    activityInfo: { flex: 1 },
    activityName: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    activityTime: { marginTop: 2, fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    actPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
    actPillText: { fontSize: 11, fontFamily: SgateFonts.semibold },

    // Empty/Skeleton
    emptyWrap: { alignItems: 'center', paddingVertical: 28 },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: SgateColors.greenBg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    
    skeletonCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 12 },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    skeletonCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: SgateColors.surface },
    skeletonLines: { flex: 1 },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: SgateColors.surface },
    
    activityEmptyWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24, backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft },
    activityEmptyText: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
