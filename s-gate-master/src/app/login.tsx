// @ts-ignore — package ships without types
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '@/constants/msg91';
import { SgateBrandMark } from '@/components/Sgate/SgateBrandMark';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Screen state ─────────────────────────────────────────────────────────────
type Screen = 'phone' | 'otp';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Login() {
    const login = useAuthStore((s) => s.login);
    const insets = useSafeAreaInsets();

    const [screen, setScreen]       = useState<Screen>('phone');
    const [phone, setPhone]         = useState('');
    const [otp, setOtp]             = useState('');
    const [reqId, setReqId]         = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState('');
    const [countdown, setCountdown] = useState(0);

    const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
    const otpInputRef = useRef<TextInput>(null);

    // ── MSG91 init ────────────────────────────────────────────────────────────
    useEffect(() => {
        OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
    }, []);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (countdown <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
        timerRef.current = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) { clearInterval(timerRef.current!); return 0; }
                return c - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [countdown]);

    // ── Validation ────────────────────────────────────────────────────────────
    const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(p.trim());

    // ── Send OTP ──────────────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        const cleaned = phone.trim().replace(/\D/g, '');
        if (!isValidPhone(cleaned)) {
            setError('Please enter a valid 10-digit Indian mobile number');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsLoading(true);
        setError('');
        try {
            const response = await OTPWidget.sendOTP({ identifier: `91${cleaned}` });
            console.log('📤 MSG91 sendOTP response:', JSON.stringify(response));
            const isHardError = response?.type === 'error' || response?.success === false;
            if (isHardError) {
                setError('Failed to send OTP. Please try again.');
            } else {
                setReqId(response?.reqId ?? (response?.type === 'success' ? response?.message ?? '' : ''));
                setScreen('otp');
                setCountdown(30);
                setTimeout(() => otpInputRef.current?.focus(), 400);
            }
        } catch (err: any) {
            console.error('MSG91 sendOTP error:', err);
            setError('Failed to send OTP. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────────────────────────
    const handleResendOtp = async () => {
        if (countdown > 0 || !reqId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLoading(true);
        setError('');
        try {
            const retryResponse = await OTPWidget.retryOTP({ reqId });
            console.log('🔄 MSG91 retryOTP response:', retryResponse);
            if (retryResponse?.reqId || retryResponse?.message?.toUpperCase() === 'SUCCESS') {
                setCountdown(30);
            } else {
                setError('Failed to resend OTP. Please try again.');
            }
        } catch {
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Verify OTP ────────────────────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        if (otp.trim().length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsLoading(true);
        setError('');
        try {
            const verifyResponse = await OTPWidget.verifyOTP({ reqId, otp: otp.trim() });
            console.log('✅ MSG91 verifyOTP response:', verifyResponse);
            const isSuccess =
                verifyResponse?.message?.toUpperCase() === 'SUCCESS' ||
                verifyResponse?.type === 'success';
            if (!isSuccess) {
                setError('Invalid OTP. Please check and try again.');
                setIsLoading(false);
                return;
            }
            const widgetToken =
                (typeof verifyResponse?.message === 'string' && verifyResponse.message.startsWith('eyJ'))
                    ? verifyResponse.message
                    : verifyResponse?.reqId ?? reqId;
            console.log('🔑 widgetToken:', widgetToken.substring(0, 20) + '...');
            const backendRes = await api.post('/auth/otp/verify', { widgetToken });
            const data = backendRes.data?.data;
            if (!data?.accessToken || !data?.user) {
                setError('Authentication failed. Please contact support.');
                return;
            }
            await login(
                data.accessToken,
                data.refreshToken,
                data.user,
                data.appType,
                data.requiresOnboarding ?? false,
                data.onboardingStatus ?? null,
            );
        } catch (err: any) {
            console.error('Verify error:', err);
            const status = err?.response?.status;
            const msg = err?.response?.data?.message || err?.message || 'Verification failed.';
            if (status === 429) {
                setError('Too many attempts. Please try again later.');
            } else if (status >= 500) {
                setError('Something went wrong. Please try again.');
            } else {
                setError(msg || 'Verification failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                style={styles.root}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.root}
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {screen === 'phone'
                        ? <PhoneScreen
                            phone={phone}
                            setPhone={setPhone}
                            error={error}
                            setError={setError}
                            isLoading={isLoading}
                            onSend={handleSendOtp}
                          />
                        : <OtpScreen
                            phone={phone}
                            otp={otp}
                            setOtp={setOtp}
                            error={error}
                            setError={setError}
                            isLoading={isLoading}
                            countdown={countdown}
                            inputRef={otpInputRef}
                            onVerify={handleVerifyOtp}
                            onResend={handleResendOtp}
                            onBack={() => { setScreen('phone'); setOtp(''); setError(''); }}
                          />
                    }

                    {/* ── Bottom section: features + footer ─────────────── */}
                    <View style={styles.bottomSection}>
                        <View style={styles.featuresRow}>
                            <FeaturePill icon="shield" label="SECURE" />
                            <FeaturePill icon="user" label="RESIDENT" />
                            <FeaturePill icon="headphones" label="ASSIST" />
                        </View>
                        <Text style={styles.footerText}>
                            POWERED BY S-GATE TECHNOLOGY © 2024
                        </Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// PHONE SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface PhoneScreenProps {
    phone: string;
    setPhone: (v: string) => void;
    error: string;
    setError: (v: string) => void;
    isLoading: boolean;
    onSend: () => void;
}

function PhoneScreen({ phone, setPhone, error, setError, isLoading, onSend }: PhoneScreenProps) {
    const phoneFocus = useSharedValue(0);
    const btnScale   = useSharedValue(1);
    const canSubmit  = phone.trim().length === 10 && !isLoading;

    const phoneContainerStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(phoneFocus.value, [0, 1], ['#2A2A2A', SgateColors.gold]),
    }));

    const btnStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }],
    }));

    const handleBtnPressIn  = () => { btnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); };
    const handleBtnPressOut = () => { btnScale.value = withSpring(1,    { damping: 15, stiffness: 300 }); };

    return (
        <View style={styles.screenWrap}>
            {/* ── Dark section: brand + welcome ────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.darkSection}>
                {/* Dot grid background hint (decorative) */}
                <View style={styles.dotGridOverlay} />

                {/* Brand row */}
                <View style={styles.brandRow}>
                    <SgateBrandMark size={32} />
                    <Text style={styles.brandText}>S-GATE</Text>
                </View>

                {/* Welcome text */}
                <Text style={styles.welcomeTitle}>Welcome{'\n'}Home</Text>
                <Text style={styles.welcomeSub}>
                    Enter your credentials to access your{'\n'}gated community.
                </Text>
            </Animated.View>

            {/* ── White card ──────────────────────────────────────────── */}
            <View style={styles.whiteCard}>
                {/* Error banner */}
                {error ? (
                    <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                        <Feather name="alert-circle" size={14} color={SgateColors.red} style={{ marginRight: 8 }} />
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </Animated.View>
                ) : null}

                {/* MOBILE NUMBER */}
                <Animated.View entering={FadeInDown.delay(150).springify()}>
                    <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                    <Animated.View style={[styles.inputRow, phoneContainerStyle]}>
                        <View style={styles.prefixWrap}>
                            <Text style={styles.prefixText}>+91</Text>
                        </View>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="00000 00000"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            value={phone}
                            onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                            keyboardType="number-pad"
                            maxLength={10}
                            editable={!isLoading}
                            onFocus={() => { phoneFocus.value = withTiming(1, { duration: 200 }); }}
                            onBlur={() => { phoneFocus.value = withTiming(0, { duration: 200 }); }}
                        />
                    </Animated.View>
                    <Text style={styles.helperText}>
                        We'll send a 6-digit OTP to verify your account.
                    </Text>
                </Animated.View>

                {/* SEND OTP BUTTON */}
                <Animated.View entering={FadeInDown.delay(250).springify()} style={btnStyle}>
                    <TouchableWithoutFeedback
                        onPress={onSend}
                        onPressIn={handleBtnPressIn}
                        onPressOut={handleBtnPressOut}
                        disabled={!canSubmit}
                    >
                        <View style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <View style={styles.sendBtnContent}>
                                    <Text style={styles.sendBtnText}>Send OTP</Text>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </Animated.View>

                {/* Login as Service Provider */}
                <Animated.View entering={FadeInDown.delay(350).springify()}>
                    <TouchableOpacity style={styles.altLoginBtn}>
                        <Text style={styles.altLoginText}>Login as Service Provider</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// OTP SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface OtpScreenProps {
    phone: string;
    otp: string;
    setOtp: (v: string) => void;
    error: string;
    setError: (v: string) => void;
    isLoading: boolean;
    countdown: number;
    inputRef: React.RefObject<TextInput | null>;
    onVerify: () => void;
    onResend: () => void;
    onBack: () => void;
}

function OtpScreen({
    phone, otp, setOtp, error, setError, isLoading, countdown,
    inputRef, onVerify, onResend, onBack,
}: OtpScreenProps) {
    const btnScale  = useSharedValue(1);
    const canVerify = otp.length === 6 && !isLoading;

    const btnStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }],
    }));

    return (
        <View style={styles.screenWrap}>
            {/* ── Dark section ────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.darkSection}>
                <View style={styles.dotGridOverlay} />

                {/* Back button */}
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="arrow-left" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.brandRow}>
                    <SgateBrandMark size={32} />
                    <Text style={styles.brandText}>S-GATE</Text>
                </View>

                <Text style={styles.welcomeTitle}>Enter{'\n'}OTP</Text>
                <Text style={styles.welcomeSub}>
                    Sent to +91 {phone}
                </Text>
            </Animated.View>

            {/* ── White card ──────────────────────────────────────────── */}
            <View style={styles.whiteCard}>
                {/* Error */}
                {error ? (
                    <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                        <Feather name="alert-circle" size={14} color={SgateColors.red} style={{ marginRight: 8 }} />
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </Animated.View>
                ) : null}

                {/* OTP boxes */}
                <Animated.View entering={FadeInDown.delay(150).springify()}>
                    <Text style={styles.fieldLabel}>6-DIGIT CODE</Text>
                    <OtpBoxes
                        value={otp}
                        inputRef={inputRef}
                        onChange={(v) => { setOtp(v); setError(''); }}
                        disabled={isLoading}
                    />
                </Animated.View>

                {/* Resend row */}
                <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.resendRow}>
                    <Text style={styles.resendHint}>
                        {countdown > 0 ? `Resend OTP in ${countdown}s` : "Didn't receive it?"}
                    </Text>
                    {countdown === 0 && (
                        <TouchableOpacity onPress={onResend} disabled={isLoading} style={{ marginLeft: 6 }}>
                            <Text style={styles.resendLink}>Resend</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Verify button */}
                <Animated.View entering={FadeInDown.delay(350).springify()} style={btnStyle}>
                    <TouchableWithoutFeedback
                        onPress={onVerify}
                        onPressIn={() => { btnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
                        onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                        disabled={!canVerify}
                    >
                        <View style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color={SgateColors.black} />
                            ) : (
                                <View style={styles.sendBtnContent}>
                                    <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                                    <Feather name="arrow-right" size={18} color={SgateColors.black} style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </View>
        </View>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// OTP BOXES
// ─────────────────────────────────────────────────────────────────────────────
interface OtpBoxesProps {
    value: string;
    inputRef: React.RefObject<TextInput | null>;
    onChange: (v: string) => void;
    disabled?: boolean;
}

function OtpBoxes({ value, inputRef, onChange, disabled }: OtpBoxesProps) {
    const [focused, setFocused] = useState(false);

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.otpRow}
        >
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!disabled}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={styles.otpHiddenInput}
                caretHidden
            />
            {Array.from({ length: 6 }).map((_, i) => {
                const char = value[i] ?? '';
                const isActive = focused && (char ? i === value.length - 1 : i === value.length);
                return (
                    <View
                        key={i}
                        style={[
                            styles.otpCell,
                            isActive && styles.otpCellActive,
                            !!char && styles.otpCellFilled,
                        ]}
                    >
                        <Text style={styles.otpDigit}>{char}</Text>
                    </View>
                );
            })}
        </TouchableOpacity>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// FEATURE PILL — bottom icons
// ─────────────────────────────────────────────────────────────────────────────
function FeaturePill({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
    return (
        <View style={styles.featurePill}>
            <View style={styles.featureIconWrap}>
                <Feather name={icon} size={18} color="rgba(255,255,255,0.35)" />
            </View>
            <Text style={styles.featureLabel}>{label}</Text>
        </View>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#111111',
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#111111',
    },
    screenWrap: {
        flex: 1,
    },

    // ── Dark section (top hero) ──────────────────────────────────────────────
    darkSection: {
        backgroundColor: '#111111',
        paddingHorizontal: 28,
        paddingTop: 20,
        paddingBottom: 36,
        position: 'relative',
        overflow: 'hidden',
    },
    dotGridOverlay: {
        ...StyleSheet.absoluteFillObject,
        // Subtle pattern effect via opacity dot grid
        opacity: 0.03,
        backgroundColor: '#FFFFFF',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 28,
    },
    brandText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 3,
    },
    welcomeTitle: {
        fontSize: 42,
        fontFamily: SgateFonts.extrabold,
        color: '#FFFFFF',
        letterSpacing: -1.5,
        lineHeight: 48,
        marginBottom: 12,
    },
    welcomeSub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.35)',
        lineHeight: 21,
    },
    backBtn: {
        position: 'absolute',
        top: 18,
        right: 24,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── White card ───────────────────────────────────────────────────────────
    whiteCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 24,
        marginTop: -8,
        // Shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 24,
            },
            android: {
                elevation: 12,
            },
        }),
    },

    // ── Error banner ─────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#DC2626',
    },

    // ── Field label ──────────────────────────────────────────────────────────
    fieldLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: '#1A1A1A',
        letterSpacing: 1.5,
        marginBottom: 10,
    },

    // ── Phone input (dark style, matches screenshot) ─────────────────────────
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderWidth: 1.5,
        borderColor: '#2A2A2A',
        borderRadius: 14,
        paddingHorizontal: 16,
    },
    prefixWrap: {
        paddingRight: 14,
        borderRightWidth: 1,
        borderRightColor: '#333333',
        paddingVertical: 15,
        marginRight: 6,
    },
    prefixText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: 'rgba(255,255,255,0.6)',
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 15,
        paddingLeft: 10,
        fontSize: 16,
        fontFamily: SgateFonts.semibold,
        color: '#FFFFFF',
    },
    helperText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: '#9CA3AF',
        marginTop: 10,
        marginLeft: 2,
    },

    // ── Send OTP button ──────────────────────────────────────────────────────
    sendBtn: {
        backgroundColor: '#1A1A1A',
        borderRadius: 50,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    sendBtnDisabled: {
        opacity: 0.4,
    },
    sendBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sendBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },

    // ── Verify button ────────────────────────────────────────────────────────
    verifyBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 50,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    verifyBtnDisabled: {
        opacity: 0.4,
    },
    verifyBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#1A1A1A',
        letterSpacing: 0.3,
    },

    // ── Alt login ────────────────────────────────────────────────────────────
    altLoginBtn: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 8,
    },
    altLoginText: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#6B7280',
        textDecorationLine: 'underline',
    },

    // ── OTP boxes ────────────────────────────────────────────────────────────
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        position: 'relative',
    },
    otpHiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        top: 0,
        left: 0,
    },
    otpCell: {
        flex: 1,
        aspectRatio: 0.9,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpCellActive: {
        borderColor: SgateColors.gold,
        backgroundColor: '#FEF9E7',
    },
    otpCellFilled: {
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
    otpDigit: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: '#1A1A1A',
    },

    // ── Resend row ───────────────────────────────────────────────────────────
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        justifyContent: 'center',
    },
    resendHint: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: '#9CA3AF',
    },
    resendLink: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
    },

    // ── Bottom section ───────────────────────────────────────────────────────
    bottomSection: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
    },
    featuresRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 28,
    },
    featurePill: {
        alignItems: 'center',
        gap: 8,
    },
    featureIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureLabel: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 1.5,
    },
    footerText: {
        fontSize: 10,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.15)',
        letterSpacing: 1,
        textAlign: 'center',
    },
});
