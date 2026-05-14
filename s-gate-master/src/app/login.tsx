// @ts-ignore — package ships without types
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '@/constants/msg91';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

const SGATE_LOGO = require('../../assets/images/icons/s-gate-logo-without-bg.png');

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

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={S.root}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={S.root}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[S.innerWrap, { paddingTop: insets.top + 16 }]}>
                    {screen === 'phone'
                        ? <PhoneScreen
                            phone={phone} setPhone={setPhone}
                            error={error} setError={setError}
                            isLoading={isLoading} onSend={handleSendOtp}
                          />
                        : <OtpScreen
                            phone={phone} otp={otp} setOtp={setOtp}
                            error={error} setError={setError}
                            isLoading={isLoading} countdown={countdown}
                            inputRef={otpInputRef}
                            onVerify={handleVerifyOtp} onResend={handleResendOtp}
                            onBack={() => { setScreen('phone'); setOtp(''); setError(''); }}
                          />
                    }

                    {/* Footer */}
                    <View style={[S.footer, { paddingBottom: insets.bottom + 16 }]}>
                        <View style={S.featuresRow}>
                            <FeaturePill icon="shield" label="SECURE" />
                            <FeaturePill icon="user" label="RESIDENT" />
                            <FeaturePill icon="headphones" label="ASSIST" />
                        </View>
                        <Text style={S.footerText}>POWERED BY S-GATE TECHNOLOGY © 2025</Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}


// ─── PHONE SCREEN ─────────────────────────────────────────────────────────────
interface PhoneScreenProps {
    phone: string; setPhone: (v: string) => void;
    error: string; setError: (v: string) => void;
    isLoading: boolean; onSend: () => void;
}

function PhoneScreen({ phone, setPhone, error, setError, isLoading, onSend }: PhoneScreenProps) {
    const phoneFocus = useSharedValue(0);
    const btnScale = useSharedValue(1);
    const canSubmit = phone.trim().length === 10 && !isLoading;

    const inputBorderStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(phoneFocus.value, [0, 1], [SgateColors.border, SgateColors.gold]),
    }));
    const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    return (
        <View style={S.screenWrap}>
            {/* Hero */}
            <Animated.View entering={FadeInDown.delay(50).springify()} style={S.hero}>
                <View style={S.logoBg}>
                    <Image source={SGATE_LOGO} style={S.logo} resizeMode="contain" />
                </View>
                <Text style={S.heroTitle}>Welcome{'\n'}Back</Text>
                <Text style={S.heroSub}>Sign in to access your gated community.</Text>
            </Animated.View>

            {/* Form card */}
            <View style={S.card}>
                {error ? (
                    <Animated.View entering={FadeInDown.duration(250)} style={S.errorBanner}>
                        <Feather name="alert-circle" size={14} color={SgateColors.red} style={{ marginRight: 8 }} />
                        <Text style={S.errorText}>{error}</Text>
                    </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={S.label}>MOBILE NUMBER</Text>
                    <Animated.View style={[S.inputRow, inputBorderStyle]}>
                        <View style={S.prefix}>
                            <Text style={S.prefixText}>+91</Text>
                        </View>
                        <TextInput
                            style={S.phoneInput}
                            placeholder="00000 00000"
                            placeholderTextColor={SgateColors.t4}
                            value={phone}
                            onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                            keyboardType="number-pad"
                            maxLength={10}
                            editable={!isLoading}
                            onFocus={() => { phoneFocus.value = withTiming(1, { duration: 200 }); }}
                            onBlur={() => { phoneFocus.value = withTiming(0, { duration: 200 }); }}
                        />
                    </Animated.View>
                    <Text style={S.helper}>We'll send a 6-digit OTP to verify your account.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={btnStyle}>
                    <TouchableWithoutFeedback
                        onPress={onSend}
                        onPressIn={() => { btnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
                        onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                        disabled={!canSubmit}
                    >
                        <View style={[S.primaryBtn, !canSubmit && S.btnDisabled]}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <View style={S.btnRow}>
                                    <Text style={S.primaryBtnText}>Send OTP</Text>
                                    <Feather name="arrow-right" size={18} color={SgateColors.t1} style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </Animated.View>


            </View>
        </View>
    );
}


// ─── OTP SCREEN ───────────────────────────────────────────────────────────────
interface OtpScreenProps {
    phone: string; otp: string; setOtp: (v: string) => void;
    error: string; setError: (v: string) => void;
    isLoading: boolean; countdown: number;
    inputRef: React.RefObject<TextInput | null>;
    onVerify: () => void; onResend: () => void; onBack: () => void;
}

function OtpScreen({
    phone, otp, setOtp, error, setError, isLoading, countdown,
    inputRef, onVerify, onResend, onBack,
}: OtpScreenProps) {
    const btnScale = useSharedValue(1);
    const canVerify = otp.length === 6 && !isLoading;
    const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    return (
        <View style={S.screenWrap}>
            {/* Hero */}
            <Animated.View entering={FadeInDown.delay(50).springify()} style={S.hero}>
                {/* Back button */}
                <TouchableOpacity onPress={onBack} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>

                <View style={S.logoBg}>
                    <Image source={SGATE_LOGO} style={S.logo} resizeMode="contain" />
                </View>
                <Text style={S.heroTitle}>Verify{'\n'}OTP</Text>
                <Text style={S.heroSub}>Sent to +91 {phone}</Text>
            </Animated.View>

            {/* Form card */}
            <View style={S.card}>
                {error ? (
                    <Animated.View entering={FadeInDown.duration(250)} style={S.errorBanner}>
                        <Feather name="alert-circle" size={14} color={SgateColors.red} style={{ marginRight: 8 }} />
                        <Text style={S.errorText}>{error}</Text>
                    </Animated.View>
                ) : null}

                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={S.label}>6-DIGIT CODE</Text>
                    <OtpBoxes value={otp} inputRef={inputRef} onChange={(v) => { setOtp(v); setError(''); }} disabled={isLoading} />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={S.resendRow}>
                    <Text style={S.resendHint}>
                        {countdown > 0 ? `Resend OTP in ${countdown}s` : "Didn't receive it?"}
                    </Text>
                    {countdown === 0 && (
                        <TouchableOpacity onPress={onResend} disabled={isLoading} style={{ marginLeft: 6 }}>
                            <Text style={S.resendLink}>Resend</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(300).springify()} style={btnStyle}>
                    <TouchableWithoutFeedback
                        onPress={onVerify}
                        onPressIn={() => { btnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
                        onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                        disabled={!canVerify}
                    >
                        <View style={[S.goldBtn, !canVerify && S.btnDisabled]}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color={SgateColors.t1} />
                            ) : (
                                <View style={S.btnRow}>
                                    <Text style={S.goldBtnText}>Verify & Continue</Text>
                                    <Feather name="arrow-right" size={18} color={SgateColors.t1} style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </View>
        </View>
    );
}


// ─── OTP BOXES ────────────────────────────────────────────────────────────────
function OtpBoxes({ value, inputRef, onChange, disabled }: {
    value: string; inputRef: React.RefObject<TextInput | null>;
    onChange: (v: string) => void; disabled?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={S.otpRow}>
            <TextInput
                ref={inputRef} value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad" maxLength={6} autoFocus editable={!disabled}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                style={S.otpHidden} caretHidden
            />
            {Array.from({ length: 6 }).map((_, i) => {
                const char = value[i] ?? '';
                const isActive = focused && (char ? i === value.length - 1 : i === value.length);
                return (
                    <View key={i} style={[S.otpCell, isActive && S.otpCellActive, !!char && S.otpCellFilled]}>
                        <Text style={S.otpDigit}>{char}</Text>
                    </View>
                );
            })}
        </TouchableOpacity>
    );
}


// ─── FEATURE PILL ─────────────────────────────────────────────────────────────
function FeaturePill({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
    return (
        <View style={S.featurePill}>
            <View style={S.featureIcon}>
                <Feather name={icon} size={16} color={SgateColors.t3} />
            </View>
            <Text style={S.featureLabel}>{label}</Text>
        </View>
    );
}


// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    innerWrap: { flex: 1 },
    screenWrap: { flex: 1 },

    // ── Hero ─────────────────────────────────────────────────────────
    hero: {
        paddingHorizontal: 28,
        paddingTop: 12,
        paddingBottom: 32,
        backgroundColor: '#FFFFFF',
    },
    logoBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    logo: { width: 44, height: 44 },
    heroTitle: {
        fontSize: 36,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -1.2,
        lineHeight: 42,
        marginBottom: 10,
    },
    heroSub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 21,
    },
    backBtn: {
        position: 'absolute',
        top: 12,
        right: 24,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Card ─────────────────────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.bg,
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 24,
    },

    // ── Error ────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.redBg,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#DC2626',
    },

    // ── Label ────────────────────────────────────────────────────────
    label: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t2,
        letterSpacing: 1.5,
        marginBottom: 10,
    },

    // ── Phone input ──────────────────────────────────────────────────
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 14,
        paddingHorizontal: 16,
    },
    prefix: {
        paddingRight: 14,
        borderRightWidth: 1,
        borderRightColor: SgateColors.borderSoft,
        paddingVertical: 15,
        marginRight: 6,
    },
    prefixText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t2,
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 15,
        paddingLeft: 10,
        fontSize: 16,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    helper: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 10,
        marginLeft: 2,
    },

    // ── Buttons ──────────────────────────────────────────────────────
    primaryBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 50,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: SgateColors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
    },
    primaryBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: 0.3,
    },
    goldBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 50,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: SgateColors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
    },
    goldBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: 0.3,
    },
    btnDisabled: { opacity: 0.4 },
    btnRow: { flexDirection: 'row', alignItems: 'center' },

    altBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
    altBtnText: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        textDecorationLine: 'underline',
    },

    // ── OTP ──────────────────────────────────────────────────────────
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        position: 'relative',
    },
    otpHidden: {
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
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpCellActive: {
        borderColor: SgateColors.gold,
        backgroundColor: SgateColors.goldPale,
    },
    otpCellFilled: {
        borderColor: SgateColors.t4,
        backgroundColor: '#FFFFFF',
    },
    otpDigit: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        justifyContent: 'center',
    },
    resendHint: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    resendLink: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
    },

    // ── Footer ───────────────────────────────────────────────────────
    footer: {
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
    featurePill: { alignItems: 'center', gap: 8 },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: SgateColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureLabel: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t4,
        letterSpacing: 1.5,
    },
    footerText: {
        fontSize: 10,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        letterSpacing: 1,
        textAlign: 'center',
    },
});
