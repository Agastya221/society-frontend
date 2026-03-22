import { Feather } from '@expo/vector-icons';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { SgateAvatar } from '@/components/Sgate/SgateAvatar';
import { SgateBrandMark } from '@/components/Sgate/SgateBrandMark';
import { PreApproveSheet } from '@/components/Sgate/PreApproveSheet';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardStats {
    totalFlats: number;
    occupiedFlats: number;
    activeResidents: number;
    todayEntries: number;
    pendingComplaints: number;
}

// ─── Quick Action data ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { title: 'Gate Passes',  icon: 'check-circle' as const, route: '/(admin)/gate-passes',          bg: SgateColors.goldPale,  iconColor: SgateColors.goldDeep },
    { title: 'Residents',    icon: 'users'        as const, route: '/(admin)/onboarding-requests',   bg: SgateColors.blueBg,    iconColor: SgateColors.blue },
    { title: 'Guards',       icon: 'shield'       as const, route: '/(admin)/guards',                bg: SgateColors.greenBg,   iconColor: SgateColors.green },
    { title: 'Complaints',   icon: 'alert-circle' as const, route: '/(admin)/complaints',            bg: SgateColors.redBg,     iconColor: SgateColors.red },
    { title: 'Notices',      icon: 'bell'         as const, route: '/(admin)/notices',               bg: SgateColors.surface,   iconColor: SgateColors.t2 },
    { title: 'Profile',      icon: 'user'         as const, route: '/(admin)/profile',               bg: SgateColors.goldPale,  iconColor: SgateColors.goldDeep },
];

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuthStore();

    const [stats, setStats]       = useState<DashboardStats | null>(null);
    const [loading, setLoading]   = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showPreApprove, setShowPreApprove] = useState(false);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/admin/reports/dashboard');
            setStats(res.data?.data ?? null);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            setStats({ totalFlats: 0, occupiedFlats: 0, activeResidents: 0, todayEntries: 0, pendingComplaints: 0 });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

    const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

    const firstName   = user?.name?.split(' ')[0] ?? 'Admin';
    const societyName = user?.society?.name ?? 'Your Society';
    const displayVal  = (v: number | undefined) => loading ? '—' : String(v ?? 0);

    function greeting(): string {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    return (
        <View style={styles.root}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        tintColor={SgateColors.gold} colors={[SgateColors.gold]} />
                }
            >
                {/* ── Header ──────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.headerArea}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            <SgateBrandMark size={42} />
                            <View style={styles.headerTexts}>
                                <Text style={styles.greetingLine}>{greeting()}, {firstName}</Text>
                                <Text style={styles.societyLine} numberOfLines={1}>{societyName}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push('/(admin)/profile')}
                            style={styles.profileBtn}
                        >
                            <SgateAvatar name={user?.name ?? 'A'} size={40} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Stats grid ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsGrid}>
                    <StatCard label="Total Flats" value={displayVal(stats?.totalFlats)} icon="home" accent={SgateColors.blue} />
                    <StatCard label="Residents" value={displayVal(stats?.activeResidents)} icon="users" accent={SgateColors.green} />
                    <StatCard label="Entries Today" value={displayVal(stats?.todayEntries)} icon="activity" accent={SgateColors.goldDeep} />
                    <StatCard label="Complaints" value={displayVal(stats?.pendingComplaints)} icon="alert-circle" accent={SgateColors.red} />
                </Animated.View>

                {/* ── Quick actions ────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
                    <View style={styles.actionsGrid}>
                        {/* Pre-Approve tile — only if admin has a flat */}
                        {user?.flatId && (
                            <QuickActionTile
                                title="Pre-Approve"
                                icon="user-check"
                                bg={SgateColors.goldPale}
                                iconColor={SgateColors.goldDeep}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowPreApprove(true);
                                }}
                            />
                        )}
                        {QUICK_ACTIONS.map((action) => (
                            <QuickActionTile
                                key={action.title}
                                title={action.title}
                                icon={action.icon}
                                bg={action.bg}
                                iconColor={action.iconColor}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push(action.route as any);
                                }}
                                badge={action.title === 'Complaints' && stats?.pendingComplaints ? stats.pendingComplaints : undefined}
                            />
                        ))}
                    </View>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <PreApproveSheet
                visible={showPreApprove}
                onClose={() => setShowPreApprove(false)}
            />
        </View>
    );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }: {
    label: string; value: string; icon: keyof typeof Feather.glyphMap; accent: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: accent + '14' }]}>
                <Feather name={icon} size={17} color={accent} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Quick action tile ───────────────────────────────────────────────────────
function QuickActionTile({ title, icon, bg, iconColor, onPress, badge }: {
    title: string; icon: keyof typeof Feather.glyphMap; bg: string;
    iconColor: string; onPress: () => void; badge?: number;
}) {
    return (
        <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.actionIconWrap, { backgroundColor: bg }]}>
                <Feather name={icon} size={22} color={iconColor} />
            </View>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSub}>Manage</Text>
            {badge ? (
                <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{badge}</Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.card,
    },
    scroll: { flex: 1 },
    scrollContent: {
        paddingBottom: 40,
    },

    // Header
    headerArea: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerTexts: { flex: 1 },
    greetingLine: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    societyLine: {
        fontSize: 18,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -0.5,
    },
    profileBtn: {},

    // Stats
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 28,
    },
    statCard: {
        width: '47%',
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -1,
        marginBottom: 2,
    },
    statLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
    },

    // Quick actions
    sectionLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        paddingHorizontal: 21,
        marginBottom: 14,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 10,
    },
    actionTile: {
        width: '47%',
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        justifyContent: 'space-between',
        minHeight: 130,
        position: 'relative',
    },
    actionIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    actionTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    actionSub: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginTop: 2,
    },
    actionBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: SgateColors.red,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    actionBadgeText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
});
