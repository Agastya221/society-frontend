import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
    Easing,
    FadeInDown,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateAvatar, SgateCard, SgateStatusPill } from '../../components/Sgate';
import { SgateColors, SgateFonts, SgateTypography } from '../../constants/Sgate-theme';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GateRequest {
    id: string;
    type: string;
    visitorName: string;
    visitorPhone?: string;
    providerTag?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    flat: { flatNumber: string };
    gate?: string;
    createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} min ago`;
    return `${Math.floor(diff / 60)}h ago`;
}

function typeToStatus(type: string): 'active' | 'pending' | 'approved' | 'denied' | 'expired' {
    const t = type?.toLowerCase();
    if (t === 'delivery') return 'pending';
    if (t === 'service') return 'active';
    return 'pending';
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ResidentHomeScreen() {
    const router  = useRouter();
    const insets  = useSafeAreaInsets();
    const { user } = useAuthStore();

    const [requests, setRequests]     = useState<GateRequest[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [actioning, setActioning]   = useState<string | null>(null); // id being processed

    // Track exit direction per request id
    const exitDirRef = useRef<Record<string, 'left' | 'right'>>({});

    // ── Data fetching ────────────────────────────────────────────────────────
    const fetchPending = async () => {
        try {
            const res = await api.get('/gate/requests?status=PENDING');
            const data = res.data?.data;
            setRequests(Array.isArray(data) ? data : (data?.entries ?? []));
        } catch (err) {
            console.error('Failed to fetch pending requests:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPending();
        }, [])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPending();
        setRefreshing(false);
    };

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleApprove = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        exitDirRef.current[id] = 'right';
        setActioning(id);
        // Optimistic remove
        setRequests(prev => prev.filter(r => r.id !== id));
        try {
            await api.patch(`/gate/requests/${id}/approve`);
        } catch (err: any) {
            // Revert on failure
            Alert.alert('Error', err?.response?.data?.message || 'Failed to approve');
            await fetchPending();
        } finally {
            setActioning(null);
        }
    };

    const handleDeny = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        exitDirRef.current[id] = 'left';
        setActioning(id);
        setRequests(prev => prev.filter(r => r.id !== id));
        try {
            await api.patch(`/gate/requests/${id}/reject`, { reason: 'Not expected' });
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to deny');
            await fetchPending();
        } finally {
            setActioning(null);
        }
    };

    const societyName = user?.society?.name ?? 'Your Society';

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
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
                {/* ── Header ──────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.mascot}>
                            <Feather name="shield" size={20} color={SgateColors.black} />
                        </View>
                        <View>
                            <Text style={styles.greetingText}>{greeting()}</Text>
                            <Text style={styles.societyText} numberOfLines={1}>
                                {societyName}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.bellBtn}
                        onPress={() => router.push('/(resident)/approvals')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="bell" size={22} color={SgateColors.t1} />
                        {requests.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {requests.length > 9 ? '9+' : requests.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Security Banner ─────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <SecurityBanner />
                </Animated.View>

                {/* ── Quick Actions ────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                    <QuickActions router={router} />
                </Animated.View>

                {/* ── Waiting at Gate ──────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Waiting at Gate</Text>
                        {requests.length > 0 && (
                            <Text style={styles.newBadge}>{requests.length} new</Text>
                        )}
                    </View>

                    {requests.length === 0 ? (
                        <EmptyState />
                    ) : (
                        requests.map((req, index) => (
                            <GateRequestCard
                                key={req.id}
                                request={req}
                                index={index}
                                isActioning={actioning === req.id}
                                onApprove={() => handleApprove(req.id)}
                                onDeny={() => handleDeny(req.id)}
                            />
                        ))
                    )}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Security Banner ──────────────────────────────────────────────────────────
function SecurityBanner() {
    const dotOpacity = useSharedValue(0.4);

    React.useEffect(() => {
        dotOpacity.value = withRepeat(
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const dotStyle = useAnimatedStyle(() => ({
        opacity: dotOpacity.value,
    }));

    return (
        <View style={styles.securityBanner}>
            {/* Shield icon in green circle */}
            <View style={styles.shieldCircle}>
                <Feather name="shield" size={18} color={SgateColors.green} />
            </View>

            {/* Text */}
            <View style={styles.securityText}>
                <View style={styles.securityTitleRow}>
                    <Text style={styles.securityTitle}>All Secure</Text>
                    <Animated.View style={[styles.pulseDot, dotStyle]} />
                </View>
                <Text style={styles.securitySub}>
                    2 guards active · Gate A, B monitored
                </Text>
            </View>
        </View>
    );
}

// ─── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ router }: { router: ReturnType<typeof useRouter> }) {
    const actions = [
        {
            icon: 'user-plus' as const,
            label: 'Pre-Approve',
            bg: SgateColors.gold,
            delay: 0,
            onPress: () => router.push('/(resident)/pre-approvals/create'),
        },
        {
            icon: 'key' as const,
            label: 'Gate Pass',
            bg: SgateColors.charcoal,
            delay: 60,
            onPress: () => router.push('/(resident)/gate-passes'),
        },
        {
            icon: 'package' as const,
            label: 'Delivery',
            bg: SgateColors.blue,
            delay: 120,
            onPress: () => router.push('/(resident)/deliveries' as any),
        },
        {
            icon: 'alert-triangle' as const,
            label: 'SOS Alert',
            bg: SgateColors.red,
            delay: 180,
            onPress: () =>
                Alert.alert(
                    'SOS Alert',
                    'Send emergency alert to all guards?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Send SOS',
                            style: 'destructive',
                            onPress: () => router.push('/(resident)/emergency/create'),
                        },
                    ]
                ),
        },
    ];

    return (
        <View style={styles.quickRow}>
            {actions.map((action) => (
                <QuickActionItem key={action.label} {...action} />
            ))}
        </View>
    );
}

interface QuickActionItemProps {
    icon: React.ComponentProps<typeof Feather>['name'];
    label: string;
    bg: string;
    delay: number;
    onPress: () => void;
}

function QuickActionItem({ icon, label, bg, delay, onPress }: QuickActionItemProps) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const iconColor =
        bg === SgateColors.gold ? SgateColors.black : '#FFFFFF';

    return (
        <Animated.View
            entering={FadeInDown.delay(200 + delay).springify()}
            style={[styles.quickItem, animStyle]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
                }}
                onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                onPress={onPress}
                style={styles.quickTouchable}
            >
                <View style={[styles.quickIconCircle, { backgroundColor: bg }]}>
                    <Feather name={icon} size={20} color={iconColor} />
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Gate Request Card ────────────────────────────────────────────────────────
interface GateRequestCardProps {
    request: GateRequest;
    index: number;
    isActioning: boolean;
    onApprove: () => void;
    onDeny: () => void;
}

function GateRequestCard({ request, index, isActioning, onApprove, onDeny }: GateRequestCardProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify()}
            exiting={FadeOut.duration(280)}
            style={styles.cardWrap}
        >
            <SgateCard style={styles.gateCard}>
                {/* Top row: avatar + info + type pill */}
                <View style={styles.cardTop}>
                    <SgateAvatar name={request.visitorName} size={44} />
                    <View style={styles.cardInfo}>
                        <Text style={styles.visitorName} numberOfLines={1}>
                            {request.visitorName}
                        </Text>
                        <Text style={styles.visitorMeta} numberOfLines={1}>
                            {request.gate ?? 'Gate A'} · {timeAgo(request.createdAt)}
                        </Text>
                    </View>
                    <SgateStatusPill status={typeToStatus(request.type)} size="sm" />
                </View>

                {/* Action buttons */}
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.denyBtn]}
                        onPress={onDeny}
                        disabled={isActioning}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.denyBtnText}>✕  Deny</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={onApprove}
                        disabled={isActioning}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.approveBtnText}>✓  Approve</Text>
                    </TouchableOpacity>
                </View>
            </SgateCard>
        </Animated.View>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <View style={styles.emptyWrap}>
            <View style={styles.emptyMascot}>
                <Feather name="check-circle" size={28} color={SgateColors.green} />
            </View>
            <Text style={styles.emptyTitle}>All clear!</Text>
            <Text style={styles.emptySub}>No one is waiting at the gate</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        paddingTop: 12,
    },

    // ── Header ─────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    mascot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    greetingText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    societyText: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    bellBtn: {
        position: 'relative',
        padding: 4,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },

    // ── Security Banner ────────────────────────────────────────────────────
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.charcoal,
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        gap: 14,
    },
    shieldCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,214,143,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    securityText: {
        flex: 1,
    },
    securityTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    securityTitle: {
        ...SgateTypography.sectionHeading,
        color: '#FFFFFF',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: SgateColors.green,
    },
    securitySub: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginTop: 3,
    },

    // ── Quick Actions ───────────────────────────────────────────────────────
    section: {
        marginBottom: 24,
    },
    quickRow: {
        flexDirection: 'row',
        gap: 8,
    },
    quickItem: {
        flex: 1,
    },
    quickTouchable: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingVertical: 14,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 8,
    },
    quickIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
        textAlign: 'center',
    },

    // ── Section header ─────────────────────────────────────────────────────
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        ...SgateTypography.sectionHeading,
        color: SgateColors.t1,
    },
    newBadge: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
    },

    // ── Gate request card ──────────────────────────────────────────────────
    cardWrap: {
        marginBottom: 12,
    },
    gateCard: {
        padding: 16,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    cardInfo: {
        flex: 1,
    },
    visitorName: {
        ...SgateTypography.cardTitle,
        color: SgateColors.t1,
    },
    visitorMeta: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    denyBtn: {
        backgroundColor: SgateColors.surface,
    },
    denyBtnText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    approveBtn: {
        backgroundColor: SgateColors.green,
    },
    approveBtnText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: '#FFFFFF',
    },

    // ── Empty state ────────────────────────────────────────────────────────
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyMascot: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        ...SgateTypography.sectionHeading,
        color: SgateColors.t1,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
});
