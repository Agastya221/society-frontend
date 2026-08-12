import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME_SIZE = SW * 0.7;

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifyResult {
    allowed: boolean;
    reason?: string;
    inviteType?: string;
    visitorName?: string;
    flatNumber?: string;
    scheduleType?: string;
    mode?: string;
    type?: string;
}

// ─── Permission Gate ──────────────────────────────────────────────────────────

function PermissionView({ onRequest }: { onRequest: () => void }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[S.permRoot, { paddingTop: insets.top + 20 }]}>
            <View style={S.permIconWrap}>
                <Ionicons name="camera-outline" size={48} color="#6B7280" />
            </View>
            <Text style={S.permTitle}>Camera Access Needed</Text>
            <Text style={S.permSub}>
                Allow camera access to scan resident QR codes for entry verification.
            </Text>
            <Pressable style={S.permBtn} onPress={onRequest}>
                <Text style={S.permBtnText}>Allow Camera</Text>
            </Pressable>
        </View>
    );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({
    result,
    onScanAgain,
}: {
    result: VerifyResult;
    onScanAgain: () => void;
}) {
    const isAllowed = result.allowed;
    const accent = isAllowed ? '#16A34A' : '#DC2626';
    const accentBg = isAllowed ? '#F0FDF4' : '#FEF2F2';
    const iconName: any = isAllowed ? 'checkmark-circle' : 'close-circle';

    const typeLabel = result.type ?? result.inviteType ?? '';
    const modeLabel = result.mode ?? '';

    return (
        <View style={S.resultCard}>
            {/* Status icon + headline */}
            <View style={[S.resultIconWrap, { backgroundColor: accentBg }]}>
                <Ionicons name={iconName} size={52} color={accent} />
            </View>

            <Text style={[S.resultHeadline, { color: accent }]}>
                {isAllowed ? 'Entry Allowed' : 'Entry Denied'}
            </Text>

            {!isAllowed && !!result.reason && (
                <Text style={S.resultReason}>{result.reason}</Text>
            )}

            {isAllowed && (
                <View style={S.resultRows}>
                    {!!result.visitorName && (
                        <View style={S.resultRow}>
                            <Ionicons name="person-outline" size={16} color="#6B7280" />
                            <Text style={S.resultRowLabel}>Name</Text>
                            <Text style={S.resultRowValue}>{result.visitorName}</Text>
                        </View>
                    )}
                    {!!result.flatNumber && (
                        <View style={S.resultRow}>
                            <Ionicons name="home-outline" size={16} color="#6B7280" />
                            <Text style={S.resultRowLabel}>Flat</Text>
                            <Text style={S.resultRowValue}>
                                {result.flatNumber === 'OFFICE' ? 'Admin Office' : result.flatNumber}
                            </Text>
                        </View>
                    )}
                    {!!typeLabel && (
                        <View style={S.resultRow}>
                            <Ionicons name="layers-outline" size={16} color="#6B7280" />
                            <Text style={S.resultRowLabel}>Type</Text>
                            <Text style={S.resultRowValue}>{typeLabel}</Text>
                        </View>
                    )}
                    {!!modeLabel && modeLabel !== 'NORMAL' && (
                        <View style={S.resultRow}>
                            <Ionicons name="shield-outline" size={16} color="#6B7280" />
                            <Text style={S.resultRowLabel}>Mode</Text>
                            <Text style={S.resultRowValue}>{modeLabel}</Text>
                        </View>
                    )}
                </View>
            )}

            <TouchableOpacity style={[S.scanAgainBtn, { backgroundColor: accent }]} onPress={onScanAgain} activeOpacity={0.85}>
                <Ionicons name="qr-code-outline" size={18} color="#fff" />
                <Text style={S.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScanVerifyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState<VerifyResult | null>(null);
    const cooldownRef = useRef(false);

    const handleBarcode = useCallback(
        async ({ data }: { data: string }) => {
            if (cooldownRef.current || verifying || result) return;
            cooldownRef.current = true;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setVerifying(true);

            try {
                const res = await api.post<{ success: boolean; data: VerifyResult }>(
                    '/api/v1/guard-app/verify-code',
                    { code: data }
                );
                const payload = res.data?.data;
                setResult(payload);

                if (payload?.allowed) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
            } catch (err: any) {
                const msg = err?.response?.data?.message ?? 'Could not verify code';
                setResult({ allowed: false, reason: msg });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setVerifying(false);
            }
        },
        [verifying, result]
    );

    const handleScanAgain = () => {
        setResult(null);
        setVerifying(false);
        // Short delay before allowing next scan to prevent double-fire
        setTimeout(() => { cooldownRef.current = false; }, 800);
    };

    // ── Permission states ─────────────────────────────────────────────────────
    if (!permission) {
        return (
            <View style={S.loadingRoot}>
                <ActivityIndicator size="large" color={GuardColors.goldDeep} />
            </View>
        );
    }

    if (!permission.granted) {
        return <PermissionView onRequest={requestPermission} />;
    }

    // ── Scanner UI ────────────────────────────────────────────────────────────
    return (
        <View style={S.root}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Camera — full screen */}
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={result || verifying ? undefined : handleBarcode}
            />

            {/* Dark overlay with transparent cut-out simulation */}
            <View style={S.overlay} pointerEvents="none">
                {/* Top dark bar */}
                <View style={S.overlayTop} />

                {/* Middle row: dark left + frame gap + dark right */}
                <View style={S.overlayMiddle}>
                    <View style={S.overlaySide} />
                    {/* Frame hole (transparent) */}
                    <View style={S.frame}>
                        {/* Corner markers */}
                        <View style={[S.corner, S.cornerTL]} />
                        <View style={[S.corner, S.cornerTR]} />
                        <View style={[S.corner, S.cornerBL]} />
                        <View style={[S.corner, S.cornerBR]} />
                    </View>
                    <View style={S.overlaySide} />
                </View>

                {/* Bottom dark bar */}
                <View style={S.overlayBottom} />
            </View>

            {/* Header bar */}
            <View style={[S.headerBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={S.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={S.headerTitle}>Scan QR Code</Text>
                <View style={S.headerSpacer} />
            </View>

            {/* Hint text below frame */}
            {!result && !verifying && (
                <View style={S.hintWrap} pointerEvents="none">
                    <Text style={S.hintText}>Point camera at the resident QR code</Text>
                </View>
            )}

            {/* Verifying spinner */}
            {verifying && (
                <View style={S.verifyingWrap} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={S.verifyingText}>Verifying…</Text>
                </View>
            )}

            {/* Result card */}
            {result && <ResultCard result={result} onScanAgain={handleScanAgain} />}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER_LEN = 28;
const CORNER_THICKNESS = 4;
const CORNER_RADIUS = 6;

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingRoot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },

    // ── Permission screen ──────────────────────────────────────────────────────
    permRoot: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    permIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    permTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
    },
    permSub: {
        fontSize: 15,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    permBtn: {
        marginTop: 16,
        backgroundColor: GuardColors.gold,
        paddingHorizontal: 36,
        paddingVertical: 16,
        borderRadius: 16,
        ...Platform.select({
            ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
            android: { elevation: 5 },
        }),
    },
    permBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },

    // ── Overlay ────────────────────────────────────────────────────────────────
    overlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'column',
    },
    overlayTop: {
        // Space above frame: center frame vertically a bit above center
        height: (SH - FRAME_SIZE) / 2 - 40,
        backgroundColor: 'rgba(0,0,0,0.62)',
    },
    overlayMiddle: {
        flexDirection: 'row',
        height: FRAME_SIZE,
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.62)',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.62)',
    },
    frame: {
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        // transparent — camera shows through
    },

    // Corner markers
    corner: {
        position: 'absolute',
        width: CORNER_LEN,
        height: CORNER_LEN,
        borderColor: '#fff',
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: CORNER_THICKNESS,
        borderLeftWidth: CORNER_THICKNESS,
        borderTopLeftRadius: CORNER_RADIUS,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: CORNER_THICKNESS,
        borderRightWidth: CORNER_THICKNESS,
        borderTopRightRadius: CORNER_RADIUS,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: CORNER_THICKNESS,
        borderLeftWidth: CORNER_THICKNESS,
        borderBottomLeftRadius: CORNER_RADIUS,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: CORNER_THICKNESS,
        borderRightWidth: CORNER_THICKNESS,
        borderBottomRightRadius: CORNER_RADIUS,
    },

    // ── Header ─────────────────────────────────────────────────────────────────
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    headerSpacer: {
        width: 40,
    },

    // ── Hints / verifying ──────────────────────────────────────────────────────
    hintWrap: {
        position: 'absolute',
        // below the frame
        top: (SH - FRAME_SIZE) / 2 - 40 + FRAME_SIZE + 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    verifyingWrap: {
        position: 'absolute',
        top: (SH - FRAME_SIZE) / 2 - 40 + FRAME_SIZE / 2 - 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 12,
    },
    verifyingText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },

    // ── Result card ────────────────────────────────────────────────────────────
    resultCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        paddingBottom: 40,
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 20 },
            android: { elevation: 16 },
        }),
    },
    resultIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    resultHeadline: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    resultReason: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    resultRows: {
        width: '100%',
        marginTop: 12,
        gap: 10,
        marginBottom: 8,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    resultRowLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9CA3AF',
        flex: 1,
    },
    resultRowValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    scanAgainBtn: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        justifyContent: 'center',
        ...Platform.select({
            ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
            android: { elevation: 4 },
        }),
    },
    scanAgainText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
});
