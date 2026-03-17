// @ts-ignore — package ships without types
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '@/constants/msg91';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Screen state ─────────────────────────────────────────────────────────────
type Screen = 'phone' | 'otp';

// ─── Animated primitives ──────────────────────────────────────────────────────
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableWithoutFeedback);

// ─── Main component ───────────────────────────────────────────────────────────
export default function Login() {
    const login = useAuthStore((s) => s.login);

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

    // ── Countdown ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (countdown <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
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
            const isHardError =
                response?.type === 'error' || response?.success === false;
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
            console.log('🔑 widgetToken being sent to backend:', widgetToken.substring(0, 20) + '...');
            const backendRes = await api.post('/api/v1/auth/otp/verify', { widgetToken });
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
                    contentContainerStyle={styles.scrollContent}
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
    const phoneFocus  = useSharedValue(0);
    const btnScale    = useSharedValue(1);
    const canSubmit   = phone.trim().length === 10 && !isLoading;

    // Border color animation: rest→gold on focus
    const phoneContainerStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(phoneFocus.value, [0, 1], [SgateColors.border, SgateColors.gold]),
    }));

    // Button press scale
    const btnStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }],
    }));

    const handleBtnPressIn  = () => { btnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); };
    const handleBtnPressOut = () => { btnScale.value = withSpring(1,    { damping: 15, stiffness: 300 }); };

    return (
        <View style={styles.screenWrap}>
            {/* ── Black hero section ────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.hero}>
                {/* Mascot placeholder */}
                <View style={styles.mascotCircle}>
                    <Feather name="shield" size={36} color={SgateColors.black} />
                </View>
                <Text style={styles.heroTitle}>Welcome back!</Text>
                <Text style={styles.heroSub}>Sign in to your society</Text>
            </Animated.View>

            {/* ── White form section ────────────────────────────────────────── */}
            <View style={styles.form}>

                {/* Error banner */}
                {error ? (
                    <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                        <Feather name="alert-circle" size={14} color={SgateColors.red} style={{ marginRight: 8 }} />
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </Animated.View>
                ) : null}

                {/* PHONE NUMBER ─────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                    <Animated.View style={[styles.inputRow, phoneContainerStyle]}>
                        {/* +91 prefix */}
                        <View style={styles.prefixWrap}>
                            <Text style={styles.prefixText}>+91</Text>
                            <View style={styles.prefixDivider} />
                        </View>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="10-digit mobile number"
                            placeholderTextColor={SgateColors.t4}
                            value={phone}
                            onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                            keyboardType="number-pad"
                            maxLength={10}
                            editable={!isLoading}
                            onFocus={()  => { phoneFocus.value = withTiming(1, { duration: 200 }); }}
                            onBlur={()   => { phoneFocus.value = withTiming(0, { duration: 200 }); }}
                        />
                    </Animated.View>
                </Animated.View>

                {/* YOUR SOCIETY ─────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 20 }}>
                    <Text style={styles.fieldLabel}>YOUR SOCIETY</Text>
                    <TouchableOpacity activeOpacity={0.75} style={styles.societyRow}>
                        <Feather name="map-pin" size={16} color={SgateColors.t3} style={{ marginRight: 10 }} />
                        <Text style={styles.societyText} numberOfLines={1}>
                            Sunrise Heights, Sakchi
                        </Text>
                        <Feather name="chevron-down" size={16} color={SgateColors.t3} />
                    </TouchableOpacity>
                </Animated.View>

                {/* SEND OTP BUTTON ─────────────────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(400).springify()}
                    style={[styles.btnWrap, btnStyle]}
                >
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
                                <Text style={styles.sendBtnText}>Send OTP</Text>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
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
            {/* ── Compact hero ────────────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(0).springify()} style={[styles.hero, styles.heroCompact]}>
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="arrow-left" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.heroTitle}>Enter OTP</Text>
                <Text style={styles.heroSub}>
                    Sent to +91 {phone}
                </Text>
            </Animated.View>

            {/* ── Form ────────────────────────────────────────────────────────── */}
            <View style={styles.form}>

                {/* Error banner */}
                {error ? (
                    <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                        <Feather name="alert-circle" size={14} color={SgateColors.red} style={{ marginRight: 8 }} />
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </Animated.View>
                ) : null}

                {/* 6-digit OTP boxes ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.fieldLabel}>6-DIGIT CODE</Text>
                    <OtpBoxes
                        value={otp}
                        inputRef={inputRef}
                        onChange={(v) => { setOtp(v); setError(''); }}
                        disabled={isLoading}
                    />
                </Animated.View>

                {/* Resend row ─────────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.resendRow}>
                    <Text style={styles.resendHint}>
                        {countdown > 0
                            ? `Resend OTP in ${countdown}s`
                            : "Didn't receive it?"}
                    </Text>
                    {countdown === 0 && (
                        <TouchableOpacity onPress={onResend} disabled={isLoading} style={{ marginLeft: 6 }}>
                            <Text style={styles.resendLink}>Resend</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Verify button ──────────────────────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(400).springify()}
                    style={[styles.btnWrap, btnStyle]}
                >
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
                                <Text style={styles.verifyBtnText}>Verify & Sign In</Text>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </Animated.View>

            </View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP BOXES  — 6 visual digit cells backed by a hidden TextInput
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
            {/* Hidden input that captures real keystrokes */}
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!disabled}
                onFocus={() => setFocused(true)}
                onBlur={()  => setFocused(false)}
                style={styles.otpHiddenInput}
                caretHidden
            />

            {/* 6 visual cells */}
            {Array.from({ length: 6 }).map((_, i) => {
                const char = value[i] ?? '';
                const isActive = focused && (char ? i === value.length - 1 : i === value.length);
                return (
                    <View
                        key={i}
                        style={[
                            styles.otpCell,
                            isActive && styles.otpCellActive,
                            char      && styles.otpCellFilled,
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
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.black,
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: SgateColors.card,
    },
    screenWrap: {
        flex: 1,
        backgroundColor: SgateColors.card,
    },

    // ── Hero (black top) ────────────────────────────────────────────────────
    hero: {
        backgroundColor: SgateColors.black,
        alignItems: 'center',
        paddingTop: 64,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroCompact: {
        paddingTop: 56,
        paddingBottom: 32,
    },
    mascotCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        ...SgateTypography.screenTitle,
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSub: {
        ...SgateTypography.body,
        color: SgateColors.t3,
        textAlign: 'center',
    },
    backBtn: {
        position: 'absolute',
        top: 56,
        left: 20,
        padding: 4,
    },

    // ── Form (white bottom) ─────────────────────────────────────────────────
    form: {
        backgroundColor: SgateColors.card,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 36,
        flex: 1,
    },

    // ── Error banner ────────────────────────────────────────────────────────
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.redBg,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.red,
    },

    // ── Field label ─────────────────────────────────────────────────────────
    fieldLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t2,
        marginBottom: 8,
    },

    // ── Phone input ─────────────────────────────────────────────────────────
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        paddingHorizontal: 14,
    },
    prefixWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
        marginRight: 4,
    },
    prefixText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginRight: 10,
    },
    prefixDivider: {
        width: 1.5,
        height: 20,
        backgroundColor: SgateColors.border,
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 15,
        paddingLeft: 12,
        fontSize: 16,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },

    // ── Society selector ────────────────────────────────────────────────────
    societyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 15,
    },
    societyText: {
        flex: 1,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // ── Send OTP button ─────────────────────────────────────────────────────
    btnWrap: {
        marginTop: 28,
    },
    sendBtn: {
        backgroundColor: SgateColors.black,
        borderRadius: 16,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        opacity: 0.45,
    },
    sendBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },

    // ── Verify button ───────────────────────────────────────────────────────
    verifyBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyBtnDisabled: {
        opacity: 0.45,
    },
    verifyBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
        letterSpacing: 0.2,
    },

    // ── OTP boxes ───────────────────────────────────────────────────────────
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
        backgroundColor: SgateColors.surface,
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
        borderColor: SgateColors.border,
        backgroundColor: SgateColors.surface,
    },
    otpDigit: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },

    // ── Resend row ──────────────────────────────────────────────────────────
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
});
