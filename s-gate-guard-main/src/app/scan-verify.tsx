import { GiantButton } from '@/components/gate/GiantButton';
import { KeyGrid } from '@/components/gate/KeyGrid';
import { PassPicker } from '@/components/gate/PassPicker';
import { ResultScreen } from '@/components/gate/ResultScreen';
import {
    ListedPass, Match, ReasonRowData, conflictTitle, reasonRows,
} from '@/components/PreApprovedPass';
import { GuardColors, GuardFonts, GuardRadius, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    Linking,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME_SIZE = SW * 0.7;
const PASSCODE_RE = /^[A-Z0-9]{6}$/;
/** A result goes back to Home by itself after this long, so the next guard action starts clean. */
const AUTO_RETURN_SECONDS = 8;
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 64;

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
    staffType?: string;
    isCurrentlyWorking?: boolean;
    attendanceAction?: 'CHECKED_IN' | 'CHECKED_OUT';
}

// Resident pre-approved (CAB / DELIVERY / HELP) QRs carry a signed token whose
// payload is { type: 'pre_approved', entryId }. /guard/scan only *checks* those, so
// they go through /guard/pre-approved/validate and the guard records the entry with
// /guard/pre-approved/:id/use — the same flow as the Pre-approved screen.
type PrePhase =
    | { kind: 'result'; matches: Match[]; message?: string }
    | { kind: 'denied'; message?: string; rows: ReasonRowData[]; title?: string }
    | { kind: 'allowed'; match: Match };

function base64UrlDecode(input: string): string {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
    return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

/** True for a pre-approved entry QR. The signature is checked by the server, not here. */
function isPreApprovedQr(code: string): boolean {
    const parts = code.split('.');
    if (parts.length !== 3) return false;
    try {
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        return payload?.type === 'pre_approved' && typeof payload?.entryId === 'string';
    } catch {
        return false;
    }
}

/** The server's own message wins; with no response at all it is a network problem. */
function apiError(err: any, fallback: string, network: string): string {
    return err?.response?.data?.message ?? (err?.response ? fallback : network);
}

function prettify(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function prePhaseFrom(result: Match, listed: Record<string, ListedPass>): PrePhase {
    if (result.allowed) {
        return {
            kind: 'result',
            matches: result.matches?.length ? result.matches : [result],
            message: result.message?.trim() || undefined,
        };
    }
    return { kind: 'denied', message: result.message?.trim() || undefined, rows: reasonRows(result.reasons, listed) };
}

// ─── Scan line ────────────────────────────────────────────────────────────────

/** A soft gold line sweeping the frame, so it is obvious the camera is looking. */
function ScanLine() {
    const y = useSharedValue(0);
    useEffect(() => {
        y.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
    }, [y]);
    const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (FRAME_SIZE - 28) + 8 }] }));
    return (
        <Animated.View style={[S.scanLine, style]} pointerEvents="none">
            <LinearGradient
                colors={['rgba(255,184,0,0)', 'rgba(255,200,40,0.95)', 'rgba(255,184,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
}

// ─── Permission Gate ──────────────────────────────────────────────────────────

function PermissionView({ onRequest, onBack }: { onRequest: () => void; onBack: () => void }) {
    const t = useT();
    const insets = useSafeAreaInsets();
    return (
        <View style={[S.permRoot, { paddingTop: insets.top + 20 }]}>
            {/* This route hides the stack header, so give the permission state its own way out. */}
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} style={[S.permBack, { top: insets.top + 8 }]} onPress={onBack}>
                <Ionicons name="arrow-back" size={26} color={GuardColors.t1} />
            </Pressable>
            <View style={S.permIconWrap}>
                <Ionicons name="camera-outline" size={56} color={GuardColors.t2} />
            </View>
            <Text style={S.permTitle}>{t('scan.cameraTitle')}</Text>
            <Text style={S.permSub}>{t('scan.cameraText')}</Text>
            <GiantButton label={t('scan.allowCamera')} icon="camera" onPress={onRequest} style={S.permBtn} />
        </View>
    );
}

// ─── Code entry (big keys, no system keyboard) ───────────────────────────────

function CodeEntry({
    value, busy, bottomInset, onChange, onVerify, onClose,
}: {
    value: string;
    busy: boolean;
    bottomInset: number;
    onChange: (next: string) => void;
    onVerify: () => void;
    onClose: () => void;
}) {
    const t = useT();
    const ready = value.length >= MIN_CODE_LENGTH && !busy;
    const press = (c: string) => {
        if (busy || value.length >= MAX_CODE_LENGTH) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(value + c);
    };
    return (
        <View style={S.codeWrap} pointerEvents="box-none">
            <View style={[S.codeCard, { paddingBottom: Math.max(bottomInset, 12) + 12 }]}>
                <View style={S.handle} />
                <View style={S.codeHead}>
                    <View style={{ flex: 1 }}>
                        <Text style={S.codeTitle}>{t('scan.codeTitle')}</Text>
                        <Text style={S.codeSub}>{t('scan.codeHint')}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t('scan.close')} testID="code-close" style={S.codeClose} onPress={onClose} disabled={busy}>
                        <Ionicons name="close" size={28} color={GuardColors.t1} />
                    </Pressable>
                </View>

                <View style={S.codeDisplay}>
                    <Text testID="code-display" style={[S.codeText, !value && S.codePlaceholder]} numberOfLines={1} adjustsFontSizeToFit>
                        {value || '– – – – – –'}
                    </Text>
                </View>

                <View style={{ marginTop: 14 }}><KeyGrid disabled={busy} onKey={press} /></View>

                <View style={S.codeActions}>
                    <TouchableOpacity
                        activeOpacity={0.6}
                        testID="key-delete"
                        accessibilityRole="button"
                        accessibilityLabel={t('scan.delete')}
                        disabled={busy || !value}
                        style={[S.deleteKey, (!value || busy) && { opacity: 0.4 }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(value.slice(0, -1)); }}
                        onLongPress={() => onChange('')}
                    >
                        <Ionicons name="backspace-outline" size={30} color={GuardColors.t1} />
                    </TouchableOpacity>
                    <GiantButton
                        label={t('scan.verify')}
                        icon="shield-checkmark"
                        tone="allow"
                        loading={busy}
                        disabled={!ready}
                        onPress={onVerify}
                        style={S.verifyBtn}
                    />
                </View>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScanVerifyScreen() {
    const t = useT();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState<VerifyResult | null>(null);
    const cooldownRef = useRef(false);

    const [manualOpen, setManualOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const [pre, setPre] = useState<PrePhase | null>(null);
    const [windows, setWindows] = useState<Record<string, ListedPass>>({});
    const [allowingId, setAllowingId] = useState<string | null>(null);
    // A ref, because a second tap on Allow can land before the re-render disables it.
    const allowRef = useRef(false);

    const goHome = useCallback(() => router.replace('/'), [router]);

    // Resident guest/party passes carry a 6-char passcode (QR value and the code shown
    // under it). /guard/scan only understands signed QR tokens and staff tokens, so those
    // must go through /guard/verify-code or every resident pass is "Invalid or expired".
    const verify = useCallback(
        async (raw: string) => {
            const code = raw.trim();
            if (!code || cooldownRef.current || verifying || result || pre) return;
            cooldownRef.current = true;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setVerifying(true);

            try {
                if (isPreApprovedQr(code)) {
                    // The validate result has no schedule; the active list fills in each pass's window.
                    const [res, list] = await Promise.all([
                        api.post('/api/v1/guard/pre-approved/validate', { qrToken: code }),
                        api.get('/api/v1/guard/pre-approved?limit=100').catch(() => null),
                    ]);
                    const listed: ListedPass[] = list?.data?.data?.entries ?? [];
                    const byId = Object.fromEntries(listed.map((p) => [p.id, p]));
                    setWindows(byId);
                    const phase = prePhaseFrom(res.data?.data ?? { allowed: false, isPrivate: false }, byId);
                    setPre(phase);
                    Haptics.notificationAsync(phase.kind === 'denied'
                        ? Haptics.NotificationFeedbackType.Error
                        : Haptics.NotificationFeedbackType.Success);
                    return;
                }

                let payload: VerifyResult;
                if (PASSCODE_RE.test(code.toUpperCase())) {
                    const res = await api.post<{ success: boolean; message?: string; data: Record<string, any> }>(
                        '/api/v1/guard/verify-code',
                        { code: code.toUpperCase() }
                    );
                    const d = res.data?.data ?? {};
                    payload = {
                        allowed: Boolean(d.allowed),
                        reason: res.data?.message,
                        inviteType: d.inviteType,
                        visitorName: d.visitorName,
                        flatNumber: d.flatNumber,
                    };
                } else {
                    const res = await api.post<{
                        success: boolean;
                        message?: string;
                        data: { type: string; allowed: boolean; pass?: Record<string, any> };
                    }>(
                        '/api/v1/guard/scan',
                        { qrToken: code }
                    );
                    const scan = res.data?.data;
                    if (scan?.type === 'PRE_APPROVED') {
                        // A token we couldn't decode locally but the server knows: same pre-approved flow.
                        setWindows({});
                        setPre(prePhaseFrom({ isPrivate: false, ...(scan.pass as Partial<Match>), allowed: Boolean(scan.allowed) }, {}));
                        Haptics.notificationAsync(scan.allowed
                            ? Haptics.NotificationFeedbackType.Success
                            : Haptics.NotificationFeedbackType.Error);
                        return;
                    }
                    const pass = scan?.pass ?? {};
                    payload = {
                        allowed: Boolean(scan?.allowed),
                        reason: res.data?.message,
                        type: scan?.type,
                        inviteType: pass.inviteType,
                        visitorName: scan?.type === 'DOMESTIC_STAFF' ? pass.name : pass.visitorName,
                        flatNumber: pass.flatNumber ?? pass.flat?.flatNumber,
                        scheduleType: pass.scheduleType,
                        mode: pass.mode,
                        staffType: pass.staffType,
                        isCurrentlyWorking: pass.isCurrentlyWorking,
                        attendanceAction: pass.attendanceAction,
                    };
                }
                setResult(payload);

                if (payload?.allowed) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
            } catch (err: any) {
                const denied = err?.response?.data;
                if (denied?.data?.type === 'PRE_APPROVED') {
                    setWindows({});
                    setPre(prePhaseFrom({ isPrivate: false, ...denied.data.pass, allowed: false }, {}));
                } else {
                    setResult({ allowed: false, reason: apiError(err, t('scan.couldNotVerify'), t('scan.networkError')) });
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setManualOpen(false);
                setManualCode('');
                setVerifying(false);
            }
        },
        [verifying, result, pre, t]
    );

    const handleAllow = useCallback(async (match: Match) => {
        if (!match.entryId || allowRef.current) return;
        allowRef.current = true;
        setAllowingId(match.entryId);
        try {
            await api.post(`/api/v1/guard/pre-approved/${match.entryId}/use`, {});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPre({ kind: 'allowed', match });
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPre({
                kind: 'denied',
                title: conflictTitle(err) ? t('scan.passUsed') : undefined,
                message: apiError(err, t('scan.couldNotRecord'), t('scan.networkError')),
                rows: [],
            });
        } finally {
            allowRef.current = false;
            setAllowingId(null);
        }
    }, [t]);

    // Hardware back closes the code card first instead of leaving the scanner.
    useEffect(() => {
        if (!manualOpen) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (verifying) return true;
            setManualOpen(false);
            setManualCode('');
            return true;
        });
        return () => sub.remove();
    }, [manualOpen, verifying]);

    const handleBarcode = useCallback(({ data }: { data: string }) => { verify(data); }, [verify]);

    const handleScanAgain = useCallback(() => {
        if (allowRef.current) return;
        setResult(null);
        setPre(null);
        setVerifying(false);
        // Short delay before allowing next scan to prevent double-fire
        setTimeout(() => { cooldownRef.current = false; }, 800);
    }, []);

    // Hardware back on a result returns to the scanner (like Scan Again) instead of
    // leaving the screen; it is ignored while an entry is being recorded.
    const showingResult = !!result || !!pre;
    useEffect(() => {
        if (!showingResult) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!allowRef.current) handleScanAgain();
            return true;
        });
        return () => sub.remove();
    }, [showingResult, handleScanAgain]);

    // ── Permission states ─────────────────────────────────────────────────────
    if (!permission) {
        return (
            <View style={S.loadingRoot}>
                <ActivityIndicator size="large" color={GuardColors.goldDeep} />
            </View>
        );
    }

    if (!permission.granted) {
        // Once the user picks "Don't allow" twice Android stops showing the prompt — send them to Settings instead.
        return <PermissionView onRequest={permission.canAskAgain ? requestPermission : () => Linking.openSettings()} onBack={() => router.back()} />;
    }

    // ── Verdict screens ───────────────────────────────────────────────────────
    const flatText = (flat?: string | null, isPrivate?: boolean) => {
        if (isPrivate) return t('scan.privateFlat');
        if (!flat) return undefined;
        return `${t('common.flat')} ${flat === 'OFFICE' ? t('scan.office') : flat}`;
    };
    const passName = (m: Match) => (m.entryId ? windows[m.entryId]?.visitorName : null) ?? m.displayLabel;

    const verdict = (() => {
        if (result) {
            const staff = result.type === 'DOMESTIC_STAFF';
            const out = result.attendanceAction === 'CHECKED_OUT';
            const kindLabel = staff && result.staffType
                ? prettify(result.staffType)
                : (result.type ?? result.inviteType ?? '').replace(/_/g, ' ');
            const typeLabel = ({ GUEST: t('common.guest'), DELIVERY: t('common.delivery'), CAB: t('common.cab'), HELP: t('common.help') } as Record<string, string>)[kindLabel.toUpperCase()]
                ?? (staff ? kindLabel : kindLabel.toUpperCase());
            return (
                <ResultScreen
                    kind={result.allowed ? 'allow' : 'deny'}
                    title={!result.allowed ? t('common.deny') : staff ? t(out ? 'scan.staffOut' : 'scan.staffIn') : t('common.allow')}
                    reason={!result.allowed ? (result.reason || t('scan.noPassFound')) : staff ? t(out ? 'scan.staffOutSub' : 'scan.staffInSub') : undefined}
                    name={result.allowed ? result.visitorName : undefined}
                    flat={result.allowed ? flatText(result.flatNumber) : undefined}
                    typeLabel={result.allowed ? typeLabel || undefined : undefined}
                    primaryLabel={t('scan.scanNext')}
                    onPrimary={handleScanAgain}
                    secondaryLabel={t('common.home')}
                    onSecondary={goHome}
                    autoReturnSeconds={AUTO_RETURN_SECONDS}
                    onAutoReturn={goHome}
                />
            );
        }
        if (!pre) return null;
        if (pre.kind === 'result' && pre.matches.length > 1) {
            return <PassPicker matches={pre.matches} windows={windows} busy={!!allowingId} onAllow={handleAllow} onCancel={handleScanAgain} />;
        }
        if (pre.kind === 'result') {
            const m = pre.matches[0];
            return (
                <ResultScreen
                    kind="allow"
                    title={t('scan.validPass')}
                    reason={pre.message ?? t('scan.preApprovedBy')}
                    name={passName(m)}
                    flat={flatText(m.flatNumber, m.isPrivate)}
                    primaryLabel={t('scan.allowEntry')}
                    onPrimary={() => handleAllow(m)}
                    secondaryLabel={t('common.cancel')}
                    onSecondary={handleScanAgain}
                    busy={!!allowingId}
                />
            );
        }
        if (pre.kind === 'allowed') {
            return (
                <ResultScreen
                    kind="allow"
                    title={t('common.allow')}
                    reason={t('scan.logged')}
                    name={passName(pre.match)}
                    flat={flatText(pre.match.flatNumber, pre.match.isPrivate)}
                    primaryLabel={t('scan.scanNext')}
                    onPrimary={handleScanAgain}
                    secondaryLabel={t('common.home')}
                    onSecondary={goHome}
                    autoReturnSeconds={AUTO_RETURN_SECONDS}
                    onAutoReturn={goHome}
                />
            );
        }
        return (
            <ResultScreen
                kind="deny"
                title={pre.title ?? t('scan.noValidPass')}
                reason={pre.message ?? t('scan.noPassFound')}
                primaryLabel={t('scan.scanNext')}
                onPrimary={handleScanAgain}
                secondaryLabel={t('common.home')}
                onSecondary={goHome}
                autoReturnSeconds={AUTO_RETURN_SECONDS}
                onAutoReturn={goHome}
            >
                {pre.rows.map(({ key, title, detail, tag }) => (
                    <View key={key} style={S.reasonRow}>
                        <Text style={S.reasonTitle}>{title} — {tag}</Text>
                        <Text style={S.reasonDetail}>{detail}</Text>
                    </View>
                ))}
            </ResultScreen>
        );
    })();

    // ── Scanner UI ────────────────────────────────────────────────────────────
    return (
        <View style={S.root}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Camera — full screen */}
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={showingResult || verifying || manualOpen ? undefined : handleBarcode}
            />

            {/* Dark overlay with transparent cut-out simulation */}
            <View style={S.overlay} pointerEvents="none">
                <View style={S.overlayTop} />
                <View style={S.overlayMiddle}>
                    <View style={S.overlaySide} />
                    <View style={S.frame}>
                        <View style={[S.corner, S.cornerTL]} />
                        <View style={[S.corner, S.cornerTR]} />
                        <View style={[S.corner, S.cornerBL]} />
                        <View style={[S.corner, S.cornerBR]} />
                        {!showingResult && !verifying && !manualOpen && <ScanLine />}
                    </View>
                    <View style={S.overlaySide} />
                </View>
                <View style={S.overlayBottom} />
            </View>

            {/* Header bar */}
            <View style={[S.headerBar, { paddingTop: insets.top + 8 }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} style={S.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </Pressable>
                <Text style={S.headerTitle}>{t('scan.title')}</Text>
                <View style={S.headerSpacer} />
            </View>

            {/* Hint + type-code button */}
            {!showingResult && !verifying && !manualOpen && (
                <>
                    <View style={S.hintWrap} pointerEvents="none">
                        <Text style={S.hintText}>{t('scan.hint')}</Text>
                    </View>
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']} style={S.scrim} pointerEvents="none" />
                    <View style={[S.bottomAction, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
                        <GiantButton label={t('scan.typeCode')} icon="keypad" tone="light" onPress={() => setManualOpen(true)} />
                    </View>
                </>
            )}

            {/* Verifying spinner */}
            {verifying && (
                <View style={S.verifyingWrap} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={S.verifyingText}>{t('scan.verifying')}</Text>
                </View>
            )}

            {/* Verdict: full-screen green or red */}
            {verdict && <View style={StyleSheet.absoluteFill}>{verdict}</View>}

            {/* Code entry — for the code shown under the resident's QR */}
            {manualOpen && !showingResult && (
                <CodeEntry
                    value={manualCode}
                    busy={verifying}
                    bottomInset={insets.bottom}
                    onChange={setManualCode}
                    onVerify={() => verify(manualCode)}
                    onClose={() => { setManualOpen(false); setManualCode(''); }}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER_LEN = 46;
const CORNER_THICKNESS = 6;
const CORNER_RADIUS = 20;
const FRAME_TOP = (SH - FRAME_SIZE) / 2 - 40;

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GuardColors.bg },

    // ── Permission screen ──────────────────────────────────────────────────────
    permRoot: { flex: 1, backgroundColor: GuardColors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
    permIconWrap: { width: 112, height: 112, borderRadius: 32, backgroundColor: GuardColors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    permTitle: { fontFamily: GuardFonts.bold, fontSize: GuardType.title, fontWeight: '900', color: GuardColors.t1, textAlign: 'center' },
    permSub: { fontFamily: GuardFonts.medium, fontSize: GuardType.body, fontWeight: '500', color: GuardColors.t2, textAlign: 'center', lineHeight: 26 },
    permBtn: { marginTop: 12 },
    permBack: { position: 'absolute', left: 16, width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, alignItems: 'center', justifyContent: 'center' },

    // ── Overlay ────────────────────────────────────────────────────────────────
    overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
    overlayTop: { height: FRAME_TOP, backgroundColor: 'rgba(0,0,0,0.62)' },
    overlayMiddle: { flexDirection: 'row', height: FRAME_SIZE },
    overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
    overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
    frame: { width: FRAME_SIZE, height: FRAME_SIZE },
    corner: { position: 'absolute', width: CORNER_LEN, height: CORNER_LEN, borderColor: GuardColors.gold },
    scanLine: { position: 'absolute', left: 14, right: 14, height: 4, borderRadius: 2 },
    cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: CORNER_RADIUS },
    cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: CORNER_RADIUS },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: CORNER_RADIUS },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: CORNER_RADIUS },

    // ── Header ─────────────────────────────────────────────────────────────────
    headerBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: GuardFonts.bold, fontSize: 22, fontWeight: '800', color: '#fff' },
    headerSpacer: { width: GuardTouch.min },

    // ── Hint / type code / verifying ───────────────────────────────────────────
    hintWrap: { position: 'absolute', top: FRAME_TOP + FRAME_SIZE + 24, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
    hintText: { fontFamily: GuardFonts.bold, fontSize: 20, lineHeight: 28, fontWeight: '800', color: '#fff', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, overflow: 'hidden' },
    scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
    bottomAction: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
    verifyingWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    verifyingText: { marginTop: 14, color: '#fff', fontFamily: GuardFonts.bold, fontSize: GuardType.button, fontWeight: '800' },

    // ── Code entry ─────────────────────────────────────────────────────────────
    codeWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    codeCard: { backgroundColor: GuardColors.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingHorizontal: 20, paddingTop: 10, ...guardShadow('#000000', 3) },
    handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: GuardColors.t4, marginBottom: 14 },
    codeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    codeTitle: { fontFamily: GuardFonts.bold, fontSize: 24, fontWeight: '900', color: GuardColors.t1 },
    codeSub: { marginTop: 2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, fontWeight: '600', color: GuardColors.t2 },
    codeClose: { width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, backgroundColor: GuardColors.surface, alignItems: 'center', justifyContent: 'center' },
    codeDisplay: { marginTop: 14, minHeight: 76, borderRadius: 24, backgroundColor: GuardColors.card, borderWidth: 2, borderColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, ...guardShadow('#FFB300', 1) },
    codeText: { fontFamily: GuardFonts.bold, fontSize: 38, fontWeight: '900', letterSpacing: 6, color: GuardColors.t1 },
    codePlaceholder: { color: GuardColors.t4, letterSpacing: 4 },
    codeActions: { marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
    deleteKey: { width: GuardTouch.button, height: GuardTouch.button, borderRadius: 26, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', ...guardShadow('#0D0F14', 1) },
    verifyBtn: { flex: 1, width: undefined },

    // ── Pass picker ────────────────────────────────────────────────────────────

    // ── Refusal reasons on the red screen ──────────────────────────────────────
    reasonRow: { marginTop: 14, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
    reasonTitle: { color: '#fff', fontFamily: GuardFonts.bold, fontSize: GuardType.body, fontWeight: '800' },
    reasonDetail: { marginTop: 2, color: 'rgba(255,255,255,0.9)', fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, fontWeight: '600' },
});
