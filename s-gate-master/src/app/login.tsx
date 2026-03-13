import { useAuthStore } from "@/store/useAuthStore";
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
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

// ─── Screens ─────────────────────────────────────────────────────────────────
type Screen = 'phone' | 'otp';

export default function Login() {
    const router = useRouter();
    const login  = useAuthStore((s) => s.login);

    const [screen, setScreen]     = useState<Screen>('phone');
    const [phone, setPhone]        = useState('');
    const [otp, setOtp]            = useState('');
    const [reqId, setReqId]        = useState('');        // MSG91 request ID for retry/verify
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]        = useState('');
    const [countdown, setCountdown] = useState(0);        // Resend cooldown in seconds
    // ── Initialise MSG91 widget once ──────────────────────────────────────────
    useEffect(() => {
        OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
    }, []);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Timer countdown ────────────────────────────────────────────────────────
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

    // ── Validate Indian phone number ──────────────────────────────────────────
    const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(p.trim());

    // ── Step 1: Send OTP via MSG91 ────────────────────────────────────────────
    const handleSendOtp = async () => {
        const cleaned = phone.trim().replace(/\D/g, '');
        if (!isValidPhone(cleaned)) {
            setError('Please enter a valid 10-digit Indian mobile number');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await OTPWidget.sendOTP({ identifier: `91${cleaned}` });
            console.log('📤 MSG91 sendOTP response:', response);

            if (response?.reqId) {
                setReqId(response.reqId ?? '');
                setScreen('otp');
                setCountdown(30);
            } else {
                setError(response?.message || 'Failed to send OTP. Please try again.');
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
        } catch (err: any) {
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: Verify OTP locally with MSG91, then call our backend ──────────
    const handleVerifyOtp = async () => {
        if (otp.trim().length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const verifyResponse = await OTPWidget.verifyOTP({ reqId, otp: otp.trim() });
            console.log('✅ MSG91 verifyOTP response:', verifyResponse);

            // MSG91 verifyOTP response: { message: "SUCCESS", reqId: string }
            // The widgetToken (JWT) that we send to backend is the reqId from verifyOTP
            // which MSG91 has already validated. Our backend calls MSG91's
            // verifyAccessToken with this to confirm & get the phone.
            const isSuccess = 
                verifyResponse?.message?.toUpperCase() === 'SUCCESS' ||
                verifyResponse?.type === 'success';

            if (!isSuccess) {
                setError('Invalid OTP. Please check and try again.');
                setIsLoading(false);
                return;
            }

            // The access-token our backend needs is the reqId from a verified session
            const widgetToken = verifyResponse?.reqId ?? reqId;

            // 3. Send widgetToken to our backend → get our own accessToken + user
            const backendRes = await api.post('/api/v1/auth/admin-app/otp/verify', { widgetToken });
            const data = backendRes.data?.data;

            if (!data?.accessToken || !data?.user) {
                setError('Authentication failed. Please contact support.');
                return;
            }

            // 4. Persist login state
            await login(data.accessToken, data.refreshToken, data.user, data.appType);

        } catch (err: any) {
            console.error('Verify error:', err);
            const msg = err?.response?.data?.message || err?.message || 'Verification failed.';
            setError(msg);
            if (msg.toLowerCase().includes('no account') || msg.includes('404')) {
                Alert.alert(
                    'No Account Found',
                    'This number is not registered. Please contact your society admin.',
                    [{ text: 'OK', onPress: () => setScreen('phone') }]
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View className="flex-1">
            {/* Background gradient */}
            <LinearGradient
                colors={['#1e3a8a', '#1e40af', '#3b82f6', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            {/* Decorative blobs */}
            <View className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <View className="absolute -top-20 -right-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
                <View className="absolute top-40 -left-20 w-60 h-60 bg-blue-300/20 rounded-full blur-3xl" />
                <View className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl" />
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
                                <View className="relative items-center justify-center mb-6 h-48 w-48">
                                    <Feather name="shield" size={100} color="white" />
                                    <View className="absolute inset-0 bg-blue-400/40 blur-3xl rounded-full -z-10" />
                                </View>
                                <Text className="text-white text-3xl font-bold tracking-tight mb-2">S-Gate Security</Text>
                                <Text className="text-blue-100 text-base text-center font-medium">Your Community's Digital Guardian</Text>
                            </Animated.View>

                            {/* Card */}
                            <Animated.View
                                entering={FadeInDown.delay(200).springify()}
                                className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/40"
                            >
                                {/* ── Screen: Phone Entry ── */}
                                {screen === 'phone' && (
                                    <>
                                        <Text className="text-2xl font-bold text-slate-800 mb-1">Welcome Back</Text>
                                        <Text className="text-slate-500 mb-6">Enter your mobile number to continue</Text>

                                        {error ? (
                                            <Animated.View entering={FadeInDown.springify()} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center gap-3">
                                                <Feather name="alert-circle" size={18} color="#dc2626" />
                                                <Text className="text-red-600 text-sm flex-1">{error}</Text>
                                            </Animated.View>
                                        ) : null}

                                        {/* Phone Input */}
                                        <View className="mb-6">
                                            <Text className="text-slate-700 font-semibold mb-2 text-sm">Mobile Number</Text>
                                            <View className="bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-1 flex-row items-center gap-3">
                                                <View className="flex-row items-center gap-1 border-r border-slate-300 pr-3">
                                                    <Text className="text-slate-700 font-semibold text-base">🇮🇳</Text>
                                                    <Text className="text-slate-600 font-semibold">+91</Text>
                                                </View>
                                                <TextInput
                                                    className="flex-1 text-slate-900 text-base"
                                                    placeholder="10-digit mobile number"
                                                    placeholderTextColor="#94a3b8"
                                                    value={phone}
                                                    onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                                                    keyboardType="number-pad"
                                                    maxLength={10}
                                                    editable={!isLoading}
                                                />
                                            </View>
                                        </View>

                                        {/* Send OTP Button */}
                                        <TouchableOpacity
                                            onPress={handleSendOtp}
                                            disabled={isLoading || phone.trim().length < 10}
                                            className="overflow-hidden rounded-xl shadow-lg"
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={phone.trim().length === 10 ? ['#3b82f6', '#2563eb', '#1d4ed8'] : ['#94a3b8', '#94a3b8']}
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

                                {/* ── Screen: OTP Entry ── */}
                                {screen === 'otp' && (
                                    <>
                                        {/* Back */}
                                        <TouchableOpacity
                                            onPress={() => { setScreen('phone'); setOtp(''); setError(''); }}
                                            className="flex-row items-center gap-2 mb-4"
                                        >
                                            <Feather name="arrow-left" size={18} color="#3b82f6" />
                                            <Text className="text-blue-600 font-semibold text-sm">Change number</Text>
                                        </TouchableOpacity>

                                        <Text className="text-2xl font-bold text-slate-800 mb-1">Enter OTP</Text>
                                        <Text className="text-slate-500 mb-6">
                                            We sent a 6-digit code to{' '}
                                            <Text className="font-semibold text-slate-700">+91 {phone}</Text>
                                        </Text>

                                        {error ? (
                                            <Animated.View entering={FadeInDown.springify()} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center gap-3">
                                                <Feather name="alert-circle" size={18} color="#dc2626" />
                                                <Text className="text-red-600 text-sm flex-1">{error}</Text>
                                            </Animated.View>
                                        ) : null}

                                        {/* OTP Input */}
                                        <View className="mb-4">
                                            <Text className="text-slate-700 font-semibold mb-2 text-sm">6-Digit OTP</Text>
                                            <View className="bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-1 flex-row items-center gap-3">
                                                <Feather name="lock" size={20} color="#64748b" />
                                                <TextInput
                                                    className="flex-1 text-slate-900 text-xl tracking-widest font-bold"
                                                    placeholder="• • • • • •"
                                                    placeholderTextColor="#94a3b8"
                                                    value={otp}
                                                    onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    autoFocus
                                                    editable={!isLoading}
                                                />
                                            </View>
                                        </View>

                                        {/* Resend */}
                                        <View className="flex-row items-center justify-end mb-6">
                                            <TouchableOpacity onPress={handleResendOtp} disabled={countdown > 0 || isLoading}>
                                                <Text className={`text-sm font-semibold ${countdown > 0 ? 'text-slate-400' : 'text-blue-600'}`}>
                                                    {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Verify Button */}
                                        <TouchableOpacity
                                            onPress={handleVerifyOtp}
                                            disabled={isLoading || otp.length < 6}
                                            className="overflow-hidden rounded-xl shadow-lg"
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={otp.length === 6 ? ['#3b82f6', '#2563eb', '#1d4ed8'] : ['#94a3b8', '#94a3b8']}
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
                                <View className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                                    <Text className="text-white text-xs font-medium">Secured by S-Gate Technology</Text>
                                </View>
                            </Animated.View>

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
