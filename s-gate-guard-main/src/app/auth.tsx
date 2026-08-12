// @ts-ignore - the native SDK does not publish TypeScript declarations
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuardBrandMark } from '@/components/GuardBrandMark';
import { GuardColors, GuardFonts, GuardRadius } from '@/constants/theme';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '@/constants/msg91';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

type Screen = 'phone' | 'otp';

export default function AuthScreen() {
  const login = useAuthStore((state) => state.login);
  const [screen, setScreen] = useState<Screen>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [reqId, setReqId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH); }, []);
  useEffect(() => {
    if (countdown <= 0) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setCountdown((value) => {
      if (value <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
      return value - 1;
    }), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) { setError('Enter a valid 10-digit mobile number.'); return; }
    setIsLoading(true); setError('');
    try {
      const response = await OTPWidget.sendOTP({ identifier: `91${cleaned}` });
      if (response?.type === 'error' || response?.success === false) setError('Could not send the OTP. Please try again.');
      else {
        setReqId(response?.reqId ?? (response?.type === 'success' ? response?.message ?? '' : ''));
        setScreen('otp'); setCountdown(30);
      }
    } catch { setError('Could not send the OTP. Check your connection.'); }
    finally { setIsLoading(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !reqId) return;
    setIsLoading(true); setError('');
    try {
      const response = await OTPWidget.retryOTP({ reqId });
      if (response?.reqId || response?.message?.toUpperCase() === 'SUCCESS') setCountdown(30);
      else setError('Could not resend the OTP.');
    } catch { setError('Could not resend the OTP.'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setIsLoading(true); setError('');
    try {
      const response = await OTPWidget.verifyOTP({ reqId, otp });
      const success = response?.message?.toUpperCase() === 'SUCCESS' || response?.type === 'success';
      if (!success) { setError('That OTP is incorrect. Please try again.'); return; }
      const widgetToken = typeof response?.message === 'string' && response.message.startsWith('eyJ') ? response.message : response?.reqId ?? reqId;
      const backend = await api.post('/api/v1/auth/guard-app/otp/verify', { widgetToken });
      const data = backend.data?.data;
      if (!data?.accessToken || !data?.user) { setError('Authentication failed. Contact your administrator.'); return; }
      if (data.user.role !== 'GUARD' && data.user.role !== 'SUPER_ADMIN') { setError('This app is available only to security staff.'); return; }
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (caught: any) {
      const message = caught?.response?.data?.message || caught?.message || 'Verification failed.';
      setError(message);
      if (message.toLowerCase().includes('no guard') || message.includes('404')) {
        Alert.alert('Guard account not found', 'Ask your society administrator to register this mobile number.', [{ text: 'OK', onPress: () => setScreen('phone') }]);
      }
    } finally { setIsLoading(false); }
  };

  const isReady = screen === 'phone' ? phone.length === 10 : otp.length === 6;
  const submit = screen === 'phone' ? handleSendOtp : handleVerifyOtp;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandArea}>
            <GuardBrandMark />
            <Text style={styles.eyebrow}>TRUSTED SOCIETY ACCESS</Text>
            <Text style={styles.title}>{screen === 'phone' ? 'Welcome, guard.' : 'Verify your number.'}</Text>
            <Text style={styles.subtitle}>{screen === 'phone' ? 'Sign in with the mobile number assigned by your society administrator.' : `We sent a security code to +91 ${phone}.`}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.secureRow}><Ionicons name="shield-checkmark" size={16} color={GuardColors.green} /><Text style={styles.secureText}>SECURE STAFF SIGN IN</Text></View>
            {screen === 'otp' && <Pressable onPress={() => { setScreen('phone'); setOtp(''); setError(''); }} style={styles.backRow}><Ionicons name="arrow-back" size={18} color={GuardColors.t2} /><Text style={styles.backText}>Change mobile number</Text></Pressable>}

            <Text style={styles.label}>{screen === 'phone' ? 'MOBILE NUMBER' : '6-DIGIT OTP'}</Text>
            <View style={[styles.inputWrap, !!error && styles.inputError]}>
              {screen === 'phone' ? <Text style={styles.prefix}>+91</Text> : <Ionicons name="lock-closed-outline" size={19} color={GuardColors.t3} />}
              <TextInput
                value={screen === 'phone' ? phone : otp}
                onChangeText={(value) => {
                  const cleaned = value.replace(/\D/g, '').slice(0, screen === 'phone' ? 10 : 6);
                  if (screen === 'phone') setPhone(cleaned); else setOtp(cleaned);
                  setError('');
                }}
                placeholder={screen === 'phone' ? 'Enter registered number' : '••••••'}
                placeholderTextColor={GuardColors.t4}
                keyboardType="number-pad"
                maxLength={screen === 'phone' ? 10 : 6}
                autoFocus={screen === 'otp'}
                editable={!isLoading}
                style={[styles.input, screen === 'otp' && styles.otpInput]}
              />
            </View>
            {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={GuardColors.red} /><Text style={styles.errorText}>{error}</Text></View>}

            {screen === 'otp' && <Pressable onPress={handleResendOtp} disabled={countdown > 0 || isLoading} style={styles.resend}><Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>{countdown > 0 ? `Resend available in ${countdown}s` : 'Resend OTP'}</Text></Pressable>}
            <Pressable onPress={submit} disabled={!isReady || isLoading} style={[styles.button, (!isReady || isLoading) && styles.buttonDisabled]}>
              {isLoading ? <ActivityIndicator color={GuardColors.black} /> : <><Text style={styles.buttonText}>{screen === 'phone' ? 'Continue securely' : 'Verify & sign in'}</Text><Ionicons name="arrow-forward" size={20} color={GuardColors.black} /></>}
            </Pressable>
          </View>
          <Text style={styles.help}>Having trouble? Contact your society administrator.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, root: { flex: 1, backgroundColor: GuardColors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28 },
  brandArea: { marginBottom: 28 }, eyebrow: { marginTop: 28, fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 10, letterSpacing: 1.7, color: GuardColors.goldDeep },
  title: { marginTop: 8, fontFamily: GuardFonts.bold, fontWeight: '900', fontSize: 32, lineHeight: 38, letterSpacing: -1, color: GuardColors.t1 },
  subtitle: { marginTop: 8, maxWidth: 340, fontFamily: GuardFonts.regular, fontSize: 14, lineHeight: 21, color: GuardColors.t2 },
  card: { backgroundColor: GuardColors.card, borderRadius: GuardRadius.xl, borderWidth: 1, borderColor: GuardColors.border, padding: 20 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 }, secureText: { fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 10, letterSpacing: 1.2, color: GuardColors.green },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginBottom: 20 }, backText: { fontFamily: GuardFonts.medium, fontWeight: '600', fontSize: 13, color: GuardColors.t2 },
  label: { marginBottom: 8, fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 10, letterSpacing: 1.1, color: GuardColors.t3 },
  inputWrap: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: GuardRadius.md, borderWidth: 1, borderColor: GuardColors.border, backgroundColor: GuardColors.bg, paddingHorizontal: 16 },
  inputError: { borderColor: GuardColors.red }, prefix: { fontFamily: GuardFonts.semibold, fontWeight: '700', fontSize: 16, color: GuardColors.t1, paddingRight: 12, borderRightWidth: 1, borderRightColor: GuardColors.border },
  input: { flex: 1, fontFamily: GuardFonts.medium, fontWeight: '600', fontSize: 16, color: GuardColors.t1, paddingVertical: 0 }, otpInput: { fontSize: 22, letterSpacing: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, backgroundColor: GuardColors.redBg, borderRadius: 12, padding: 11 }, errorText: { flex: 1, fontFamily: GuardFonts.regular, fontSize: 12, lineHeight: 17, color: GuardColors.red },
  resend: { alignSelf: 'flex-end', marginTop: 14 }, resendText: { fontFamily: GuardFonts.semibold, fontWeight: '700', fontSize: 12, color: GuardColors.goldDeep }, resendDisabled: { color: GuardColors.t4 },
  button: { height: 56, marginTop: 22, borderRadius: GuardRadius.md, backgroundColor: GuardColors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonDisabled: { backgroundColor: GuardColors.surface }, buttonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] }, buttonText: { fontFamily: GuardFonts.bold, fontWeight: '800', fontSize: 15, color: GuardColors.black },
  help: { marginTop: 20, textAlign: 'center', fontFamily: GuardFonts.regular, fontSize: 12, color: GuardColors.t3 },
});
