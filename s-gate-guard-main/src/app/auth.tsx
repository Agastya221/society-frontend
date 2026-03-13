import { useAuthStore } from "@/store/useAuthStore";
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore — package ships without types
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import api from "@/services/api";
import { MSG91_WIDGET_ID, MSG91_TOKEN_AUTH } from '@/constants/msg91';

type Screen = 'phone' | 'otp';

export default function AuthScreen() {
    const login = useAuthStore((s) => s.login);

    const [screen, setScreen]       = useState<Screen>('phone');
    const [phone, setPhone]          = useState('');
    const [otp, setOtp]              = useState('');
    const [reqId, setReqId]          = useState('');
    const [isLoading, setIsLoading]  = useState(false);
    const [error, setError]          = useState('');
    const [countdown, setCountdown]  = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Initialise MSG91 widget once ──────────────────────────────────────────
    useEffect(() => {
        OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
    }, []);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (countdown <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
        timerRef.current = setInterval(() => {
            setCountdown((c) => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [countdown]);

    const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(p.trim());

    // ── Step 1: Send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        const cleaned = phone.trim().replace(/\D/g, '');
        if (!isValidPhone(cleaned)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await OTPWidget.sendOTP({ identifier: `91${cleaned}` });
            console.log('📤 MSG91 sendOTP (guard):', response);
            if (response?.reqId) {
                setReqId(response.reqId ?? '');
                setScreen('otp');
                setCountdown(30);
            } else {
                setError(response?.message || 'Failed to send OTP. Please try again.');
            }
        } catch (err: any) {
            setError('Failed to send OTP. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────────────────────────
    const handleResendOtp = async () => {
        if (countdown > 0 || !reqId) return;
        setIsLoading(true);
        setError('');
        try {
            const retryResponse = await OTPWidget.retryOTP({ reqId });
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

    // ── Step 2: Verify OTP → call guard backend endpoint ─────────────────────
    const handleVerifyOtp = async () => {
        if (otp.trim().length !== 6) { setError('Please enter the 6-digit OTP'); return; }
        setIsLoading(true);
        setError('');
        try {
            // 1. Verify with MSG91 Widget
            const verifyResponse = await OTPWidget.verifyOTP({ reqId, otp: otp.trim() });
            console.log('✅ MSG91 verifyOTP (guard):', verifyResponse);

            const isSuccess =
                verifyResponse?.message?.toUpperCase() === 'SUCCESS' ||
                verifyResponse?.type === 'success';

            if (!isSuccess) {
                setError('Invalid OTP. Please check and try again.');
                setIsLoading(false);
                return;
            }

            const widgetToken = verifyResponse?.reqId ?? reqId;

            // 2. Call guard-specific backend endpoint
            const backendRes = await api.post('/api/v1/auth/guard-app/otp/verify', { widgetToken });
            const data = backendRes.data?.data;

            if (!data?.accessToken || !data?.user) {
                setError('Authentication failed. Please contact support.');
                return;
            }

            // 3. Verify this account is actually a guard (role check for UX safety)
            if (data.user.role !== 'GUARD' && data.user.role !== 'SUPER_ADMIN') {
                setError('Access denied. This app is for guards only.');
                return;
            }

            // 4. Save to store — include refreshToken so silent refresh works
            await login(data.accessToken, data.refreshToken, data.user);

        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Verification failed.';
            setError(msg);
            if (msg.toLowerCase().includes('no guard') || msg.includes('404')) {
                Alert.alert(
                    'No Guard Account Found',
                    'This number is not registered as a guard. Please contact your society admin.',
                    [{ text: 'OK', onPress: () => setScreen('phone') }]
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View className="flex-1">
            {/* Dark green-blue gradient for guard app */}
            <LinearGradient
                colors={['#0f2027', '#203a43', '#2c5364']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            {/* Decorative blobs */}
            <View className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <View className="absolute -top-16 -right-16 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl" />
                <View className="absolute top-48 -left-16 w-56 h-56 bg-cyan-400/15 rounded-full blur-3xl" />
            </View>

            <SafeAreaView className="flex-1" edges={['top']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-1 px-6 justify-center pb-24">

                            {/* Logo */}
                            <Animated.View entering={FadeInUp.delay(100).springify()} className="items-center mb-8">
                                <View className="relative items-center justify-center mb-6 h-40 w-40">
                                    <View className="bg-teal-500/20 rounded-full p-8">
                                        <Feather name="shield" size={72} color="#5eead4" />
                                    </View>
                                    <View className="absolute inset-0 bg-teal-400/20 blur-3xl rounded-full -z-10" />
                                </View>
                                <Text className="text-white text-3xl font-bold tracking-tight mb-1">Guard Portal</Text>
                                <Text className="text-teal-300 text-base text-center font-medium">S-Gate Security System</Text>
                            </Animated.View>

                            {/* Card */}
                            <Animated.View
                                entering={FadeInDown.delay(200).springify()}
                                className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20"
                            >
                                {/* ── Phone screen ── */}
                                {screen === 'phone' && (
                                    <>
                                        <Text className="text-xl font-bold text-white mb-1">Guard Login</Text>
                                        <Text className="text-teal-200 text-sm mb-6">Enter your registered mobile number</Text>

                                        {error ? (
                                            <Animated.View entering={FadeInDown.springify()} className="bg-red-500/20 border border-red-400/40 rounded-xl p-4 mb-4 flex-row items-center gap-3">
                                                <Feather name="alert-circle" size={18} color="#fca5a5" />
                                                <Text className="text-red-200 text-sm flex-1">{error}</Text>
                                            </Animated.View>
                                        ) : null}

                                        {/* Phone Input */}
                                        <View className="mb-6">
                                            <Text className="text-teal-200 font-semibold mb-2 text-sm">Mobile Number</Text>
                                            <View className="bg-white/10 border border-white/20 rounded-xl px-3 py-1 flex-row items-center gap-3">
                                                <View className="flex-row items-center gap-1 border-r border-white/20 pr-3">
                                                    <Text className="text-white font-semibold">🇮🇳 +91</Text>
                                                </View>
                                                <TextInput
                                                    className="flex-1 text-white text-base"
                                                    placeholder="10-digit mobile number"
                                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                                    value={phone}
                                                    onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                                                    keyboardType="number-pad"
                                                    maxLength={10}
                                                    editable={!isLoading}
                                                />
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            onPress={handleSendOtp}
                                            disabled={isLoading || phone.length < 10}
                                            className="overflow-hidden rounded-xl"
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={phone.length === 10 ? ['#0d9488', '#0f766e'] : ['#374151', '#374151']}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                className="py-4 items-center"
                                            >
                                                {isLoading ? (
                                                    <View className="flex-row items-center gap-2">
                                                        <ActivityIndicator size="small" color="#fff" />
                                                        <Text className="text-white font-bold text-base">Sending OTP...</Text>
                                                    </View>
                                                ) : (
                                                    <View className="flex-row items-center gap-2">
                                                        <Text className="text-white font-bold text-base">Send OTP</Text>
                                                        <Feather name="arrow-right" size={20} color="#fff" />
                                                    </View>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* ── OTP screen ── */}
                                {screen === 'otp' && (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => { setScreen('phone'); setOtp(''); setError(''); }}
                                            className="flex-row items-center gap-2 mb-4"
                                        >
                                            <Feather name="arrow-left" size={18} color="#5eead4" />
                                            <Text className="text-teal-300 font-semibold text-sm">Change number</Text>
                                        </TouchableOpacity>

                                        <Text className="text-xl font-bold text-white mb-1">Enter OTP</Text>
                                        <Text className="text-teal-200 text-sm mb-6">
                                            Code sent to <Text className="font-bold text-white">+91 {phone}</Text>
                                        </Text>

                                        {error ? (
                                            <Animated.View entering={FadeInDown.springify()} className="bg-red-500/20 border border-red-400/40 rounded-xl p-4 mb-4 flex-row items-center gap-3">
                                                <Feather name="alert-circle" size={18} color="#fca5a5" />
                                                <Text className="text-red-200 text-sm flex-1">{error}</Text>
                                            </Animated.View>
                                        ) : null}

                                        <View className="mb-4">
                                            <Text className="text-teal-200 font-semibold mb-2 text-sm">6-Digit OTP</Text>
                                            <View className="bg-white/10 border border-white/20 rounded-xl px-4 py-1 flex-row items-center gap-3">
                                                <Feather name="lock" size={20} color="#5eead4" />
                                                <TextInput
                                                    className="flex-1 text-white text-xl tracking-widest font-bold"
                                                    placeholder="• • • • • •"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                    value={otp}
                                                    onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    autoFocus
                                                    editable={!isLoading}
                                                />
                                            </View>
                                        </View>

                                        <View className="flex-row justify-end mb-6">
                                            <TouchableOpacity onPress={handleResendOtp} disabled={countdown > 0 || isLoading}>
                                                <Text className={`text-sm font-semibold ${countdown > 0 ? 'text-white/30' : 'text-teal-300'}`}>
                                                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            onPress={handleVerifyOtp}
                                            disabled={isLoading || otp.length < 6}
                                            className="overflow-hidden rounded-xl"
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={otp.length === 6 ? ['#0d9488', '#0f766e'] : ['#374151', '#374151']}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                className="py-4 items-center"
                                            >
                                                {isLoading ? (
                                                    <View className="flex-row items-center gap-2">
                                                        <ActivityIndicator size="small" color="#fff" />
                                                        <Text className="text-white font-bold text-base">Verifying...</Text>
                                                    </View>
                                                ) : (
                                                    <View className="flex-row items-center gap-2">
                                                        <Text className="text-white font-bold text-base">Verify & Sign In</Text>
                                                        <Feather name="check-circle" size={20} color="#fff" />
                                                    </View>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </Animated.View>

                            {/* Footer */}
                            <Animated.View entering={FadeInDown.delay(400).springify()} className="mt-8 items-center">
                                <View className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                                    <Text className="text-teal-300 text-xs font-medium">🔒 Guard Access Only</Text>
                                </View>
                            </Animated.View>

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
