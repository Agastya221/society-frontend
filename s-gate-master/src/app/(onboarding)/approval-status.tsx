import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useOnboardingStatus } from '@/hooks/useOnboardingQueries';
import type { OnboardingStatusType } from '@/types/onboarding.types';

// ─── Status Configs ───────────────────────────────────────────────────────────

interface StatusConfig {
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    iconBg: string;
    cardBg: string;
    cardBorder: string;
    title: string;
    titleColor: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
    PENDING_APPROVAL: {
        icon: 'clock',
        iconColor: '#d97706',
        iconBg: '#FEF3C7',
        cardBg: '#FFFBEB',
        cardBorder: '#FDE68A',
        title: 'Under Review',
        titleColor: '#92400E',
    },
    RESUBMIT_REQUESTED: {
        icon: 'alert-triangle',
        iconColor: '#dc2626',
        iconBg: '#FEE2E2',
        cardBg: '#FEF2F2',
        cardBorder: '#FECACA',
        title: 'Action Required',
        titleColor: '#991B1B',
    },
    REJECTED: {
        icon: 'x-circle',
        iconColor: '#dc2626',
        iconBg: '#FEE2E2',
        cardBg: '#FEF2F2',
        cardBorder: '#FECACA',
        title: 'Request Rejected',
        titleColor: '#991B1B',
    },
    APPROVED: {
        icon: 'check-circle',
        iconColor: '#16a34a',
        iconBg: '#DCFCE7',
        cardBg: '#F0FDF4',
        cardBorder: '#BBF7D0',
        title: "You're All Set!",
        titleColor: '#166534',
    },
};

// ─── Pulsing Icon ─────────────────────────────────────────────────────────────

function PulsingIcon({ config }: { config: StatusConfig }) {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (config.icon === 'clock') {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 800 }),
                    withTiming(0.95, { duration: 800 })
                ),
                -1,
                true
            );
        }
    }, [config.icon]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.iconCircle, { backgroundColor: config.iconBg }, animStyle]}>
            <Feather name={config.icon} size={48} color={config.iconColor} />
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ApprovalStatusScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data, isLoading, isError } = useOnboardingStatus(
        true,
        true // Enable polling
    );

    const status: OnboardingStatusType = data?.status ?? 'PENDING_APPROVAL';
    const config = STATUS_CONFIGS[status];

    // Handle APPROVED: update auth store
    useEffect(() => {
        if (status === 'APPROVED') {
            handleApproved();
        }
    }, [status]);

    const handleApproved = async () => {
        try {
            await SecureStore.setItemAsync('requiresOnboarding', 'false');
            await SecureStore.setItemAsync('onboardingStatus', 'COMPLETED');
            useAuthStore.setState({
                requiresOnboarding: false,
                onboardingStatus: 'COMPLETED',
            });
            await useAuthStore.getState().refreshAccessToken();
        } catch (err) {
            console.error('Failed to handle approval:', err);
        }
    };

    // Handle DRAFT/PENDING_DOCS — redirect to continue
    if (status === 'DRAFT' || status === 'PENDING_DOCS' || status === 'NOT_STARTED') {
        return (
            <View style={styles.root}>
                <StatusBar style="dark" />
                <View style={styles.centerContent}>
                    <View style={[styles.iconCircle, { backgroundColor: SgateColors.goldPale }]}>
                        <Feather name="edit-3" size={36} color={SgateColors.gold} />
                    </View>
                    <Text style={styles.draftTitle}>Complete Your Application</Text>
                    <Text style={styles.draftSubtitle}>
                        Your onboarding is incomplete. Continue where you left off.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.replace('/(onboarding)/select-city')}
                        style={styles.goldBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.goldBtnText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (isLoading || !config) {
        return (
            <View style={[styles.root, styles.centerContent]}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color={SgateColors.gold} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <View style={styles.content}>
                {/* Status Icon */}
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                    <PulsingIcon config={config} />
                </Animated.View>

                {/* Status Card */}
                <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.cardWrap}>
                    <View
                        style={[
                            styles.statusCard,
                            { backgroundColor: config.cardBg, borderColor: config.cardBorder },
                        ]}
                    >
                        <Text style={[styles.statusTitle, { color: config.titleColor }]}>
                            {config.title}
                        </Text>

                        {/* PENDING */}
                        {status === 'PENDING_APPROVAL' && (
                            <>
                                <Text style={styles.statusMessage}>
                                    Your request is under review by the society admin.
                                </Text>
                                <Text style={styles.statusHint}>
                                    We'll notify you once it's approved.
                                </Text>

                                {/* Details */}
                                {data && (
                                    <View style={styles.detailsBox}>
                                        <DetailRow label="Society" value={data.society} />
                                        <DetailRow label="Block" value={data.block} />
                                        <DetailRow label="Flat" value={data.flat} />
                                        <DetailRow label="Type" value={data.residentType} />
                                        {data.submittedAt && (
                                            <DetailRow
                                                label="Submitted"
                                                value={new Date(data.submittedAt).toLocaleDateString()}
                                            />
                                        )}
                                    </View>
                                )}

                                <View style={styles.pollingBadge}>
                                    <ActivityIndicator size="small" color="#d97706" />
                                    <Text style={styles.pollingText}>Auto-refreshing...</Text>
                                </View>
                            </>
                        )}

                        {/* RESUBMIT */}
                        {status === 'RESUBMIT_REQUESTED' && (
                            <>
                                <Text style={styles.statusMessage}>
                                    Please resubmit with corrections noted below.
                                </Text>
                                {data?.resubmitReason && (
                                    <View style={styles.reasonBox}>
                                        <Text style={styles.reasonText}>{data.resubmitReason}</Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* REJECTED */}
                        {status === 'REJECTED' && (
                            <>
                                <Text style={styles.statusMessage}>
                                    Unfortunately, your request has been rejected.
                                </Text>
                                {data?.rejectionReason && (
                                    <View style={styles.reasonBox}>
                                        <Text style={styles.reasonText}>{data.rejectionReason}</Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* APPROVED */}
                        {status === 'APPROVED' && (
                            <Text style={styles.statusMessage}>
                                Your onboarding is complete. Welcome to your society!
                            </Text>
                        )}
                    </View>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.actionsWrap}>
                    {status === 'RESUBMIT_REQUESTED' && (
                        <TouchableOpacity
                            onPress={() => router.replace('/(onboarding)/select-city')}
                            style={styles.goldBtn}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.goldBtnText}>Resubmit Documents</Text>
                        </TouchableOpacity>
                    )}

                    {status === 'REJECTED' && (
                        <TouchableOpacity
                            onPress={() => router.replace('/(onboarding)/select-city')}
                            style={styles.goldBtn}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.goldBtnText}>Start Over</Text>
                        </TouchableOpacity>
                    )}

                    {status === 'APPROVED' && (
                        <TouchableOpacity
                            onPress={() => router.replace('/(resident)/home')}
                            style={[styles.goldBtn, { backgroundColor: SgateColors.green }]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.goldBtnText, { color: '#FFFFFF' }]}>
                                Go to Home
                            </Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>

            {/* Logout */}
            <View style={[styles.logoutBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    onPress={() => useAuthStore.getState().logout()}
                    style={styles.logoutBtn}
                >
                    <Text style={styles.logoutText}>Sign out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    cardWrap: {
        width: '100%',
    },
    statusCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    statusTitle: {
        fontSize: 22,
        fontFamily: SgateFonts.extrabold,
        marginBottom: 10,
        textAlign: 'center',
    },
    statusMessage: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        textAlign: 'center',
        lineHeight: 20,
    },
    statusHint: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        marginTop: 6,
    },
    detailsBox: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    detailValue: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    pollingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    pollingText: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: '#92400E',
    },
    reasonBox: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 12,
        marginTop: 12,
    },
    reasonText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: '#dc2626',
        lineHeight: 18,
    },
    actionsWrap: {
        width: '100%',
    },
    goldBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goldBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    draftTitle: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 8,
    },
    draftSubtitle: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    logoutBar: {
        paddingHorizontal: 24,
    },
    logoutBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    logoutText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
    },
});
