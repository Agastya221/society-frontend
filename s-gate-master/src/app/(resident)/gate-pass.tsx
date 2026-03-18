import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
    SgateBrandMark,
    SgateButton,
    SgateHeader,
    SgateStatusPill,
} from '../../components/Sgate';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';
import { getPreApprovalQR } from '../../services/gate.service';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GatePassScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const { id, visitorName, visitorType, validFrom, validUntil } =
        useLocalSearchParams<{
            id: string;
            visitorName?: string;
            visitorType?: string;
            validFrom?: string;
            validUntil?: string;
        }>();

    const [qrData, setQrData] = useState<{
        qrToken: string;
        qrCodeImage: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);

    // ── Fetch QR code on mount ───────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        (async () => {
            try {
                const data = await getPreApprovalQR(id);
                if (!cancelled) setQrData(data);
            } catch (err: any) {
                if (!cancelled)
                    setError(
                        err?.response?.data?.message ?? 'Failed to load QR code',
                    );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // ── Share handler ────────────────────────────────────────────────────
    const handleShare = async () => {
        if (!qrData) return;
        setSharing(true);

        try {
            await Share.share({
                message: `Your sgate gate pass OTP: ${qrData.qrToken}\nShow this at the society gate.`,
                title: 'sgate Gate Pass',
            });
        } catch {
            // User cancelled — no-op
        } finally {
            setSharing(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────
    const formatDate = (iso?: string) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatVisitorType = (raw?: string) => {
        if (!raw) return 'Guest';
        return raw
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    };

    const flatLabel = user?.flat?.number
        ? `${user.flat.block?.name ?? ''}${user.flat.block?.name ? '-' : ''}${user.flat.number}`
        : '—';

    // ── Loading state ────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.root}>
                <SgateHeader
                    title="Gate Pass"
                    showBack
                    onBack={() => router.back()}
                />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={SgateColors.gold} />
                    <Text style={styles.loadingText}>Loading gate pass…</Text>
                </View>
            </View>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────
    if (error || !qrData) {
        return (
            <View style={styles.root}>
                <SgateHeader
                    title="Gate Pass"
                    showBack
                    onBack={() => router.back()}
                />
                <View style={styles.center}>
                    <View style={styles.errorIcon}>
                        <Feather
                            name="alert-circle"
                            size={28}
                            color={SgateColors.red}
                        />
                    </View>
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorSub}>
                        {error ?? 'Could not load gate pass'}
                    </Text>
                    <SgateButton
                        label="Go Back"
                        variant="secondary"
                        icon="arrow-left"
                        onPress={() => router.back()}
                        style={{ marginTop: 20 }}
                    />
                </View>
            </View>
        );
    }

    // ── Build detail rows ────────────────────────────────────────────────
    const details: { label: string; value: string; isOtp?: boolean }[] = [];
    if (visitorName) details.push({ label: 'Visitor', value: visitorName });
    if (visitorType)
        details.push({ label: 'Type', value: formatVisitorType(visitorType) });
    details.push({ label: 'Flat', value: flatLabel });
    if (validFrom) details.push({ label: 'Valid from', value: formatDate(validFrom) });
    if (validUntil)
        details.push({ label: 'Valid until', value: formatDate(validUntil) });
    details.push({ label: 'OTP', value: qrData.qrToken, isOtp: true });

    // ── Success ──────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <SgateHeader
                title="Gate Pass"
                showBack
                onBack={() => router.back()}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Top icon + status ────────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(0).springify()}
                    style={styles.topSection}
                >
                    <SgateBrandMark size={48} />
                    <Text style={styles.passGenerated}>Pass Generated!</Text>
                </Animated.View>

                {/* ── Gate pass card ───────────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(100).springify()}
                    style={styles.card}
                >
                    {/* Black header */}
                    <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                            <SgateBrandMark size={22} />
                            <Text style={styles.cardHeaderTitle}>
                                s
                                <Text style={styles.cardHeaderGold}>gate</Text>
                                {' Pass'}
                            </Text>
                        </View>
                        <SgateStatusPill status="active" size="sm" />
                    </View>

                    {/* White body */}
                    <View style={styles.cardBody}>
                        {/* QR Image */}
                        <View style={styles.qrWrap}>
                            {qrData.qrCodeImage ? (
                                <Image
                                    source={{ uri: qrData.qrCodeImage }}
                                    style={styles.qrImage}
                                    contentFit="contain"
                                />
                            ) : (
                                <View style={styles.qrPlaceholder}>
                                    <Feather
                                        name="grid"
                                        size={36}
                                        color={SgateColors.t4}
                                    />
                                </View>
                            )}
                        </View>
                        <Text style={styles.qrCaption}>
                            Show this QR at the gate
                        </Text>

                        {/* Detail rows */}
                        <View style={styles.detailsWrap}>
                            {details.map((d, i) => (
                                <View
                                    key={d.label}
                                    style={[
                                        styles.detailRow,
                                        i < details.length - 1 &&
                                            styles.detailRowBorder,
                                    ]}
                                >
                                    <Text style={styles.detailLabel}>
                                        {d.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.detailValue,
                                            d.isOtp && styles.detailOtp,
                                        ]}
                                        numberOfLines={1}
                                        selectable
                                    >
                                        {d.value}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </Animated.View>

                {/* ── Bottom buttons ───────────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(200).springify()}
                    style={styles.btnRow}
                >
                    <View style={styles.btnHalf}>
                        <SgateButton
                            label="Share"
                            variant="secondary"
                            icon="share-2"
                            onPress={handleShare}
                            loading={sharing}
                            fullWidth
                        />
                    </View>
                    <View style={styles.btnHalf}>
                        <SgateButton
                            label="Done"
                            variant="primary"
                            icon="check"
                            onPress={() =>
                                router.replace('/(resident)/home')
                            }
                            fullWidth
                        />
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },

    // ── Loading ──────────────────────────────────────────────────────────
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },

    // ── Error ────────────────────────────────────────────────────────────
    errorIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        marginBottom: 6,
    },
    errorSub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },

    // ── Top section ──────────────────────────────────────────────────────
    topSection: {
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    passGenerated: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.green,
    },

    // ── Card ─────────────────────────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255,184,0,0.25)',
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: SgateColors.black,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardHeaderTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
    cardHeaderGold: {
        color: SgateColors.gold,
    },

    // ── Card body ────────────────────────────────────────────────────────
    cardBody: {
        padding: 20,
    },
    qrWrap: {
        alignItems: 'center',
        marginBottom: 8,
    },
    qrImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    qrPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    qrCaption: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginBottom: 16,
    },

    // ── Details ──────────────────────────────────────────────────────────
    detailsWrap: {
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
    },
    detailRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    detailLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
        maxWidth: '60%',
        textAlign: 'right',
    },
    detailOtp: {
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.gold,
        letterSpacing: 3,
    },

    // ── Bottom buttons ───────────────────────────────────────────────────
    btnRow: {
        flexDirection: 'row',
        gap: 10,
    },
    btnHalf: {
        flex: 1,
    },
});
