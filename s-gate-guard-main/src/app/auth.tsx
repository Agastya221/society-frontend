// @ts-ignore - the native SDK does not publish TypeScript declarations
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiantButton } from '@/components/gate/GiantButton';
import { LanguageSwitch } from '@/components/gate/LanguageSwitch';
import { useKeyboardHeight } from '@/components/gate/useKeyboardHeight';
import { GuardBrandMark } from '@/components/GuardBrandMark';
import { GuardColors, GuardFonts, GuardGradients, GuardTouch, GuardType } from '@/constants/theme';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '@/constants/msg91';
import { useT } from '@/i18n';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

type Screen = 'phone' | 'otp';

export default function AuthScreen() {
  const t = useT();
  const keyboardHeight = useKeyboardHeight();
  const login = useAuthStore((state) => state.login);
  const [screen, setScreen] = useState<Screen>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [reqId, setReqId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // With the keyboard up, bring the button into view.
  useEffect(() => {
    if (keyboardHeight > 0) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [keyboardHeight]);

  useEffect(() => { OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH); }, []);
  // Android back on the OTP step returns to the phone step instead of closing the app.
  useEffect(() => {
    if (screen !== 'otp') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLoading) return true;
      setScreen('phone'); setOtp(''); setError('');
      return true;
    });
    return () => sub.remove();
  }, [screen, isLoading]);
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
    if (!/^[6-9]\d{9}$/.test(cleaned)) { setError(t('auth.errPhone')); return; }
    setIsLoading(true); setError('');
    try {
      const response = await OTPWidget.sendOTP({ identifier: `91${cleaned}` });
      if (response?.type === 'error' || response?.success === false) setError(t('auth.errSend'));
      else {
        setReqId(response?.reqId ?? (response?.type === 'success' ? response?.message ?? '' : ''));
        setScreen('otp'); setCountdown(30);
      }
    } catch { setError(t('auth.errConn')); }
    finally { setIsLoading(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !reqId) return;
    setIsLoading(true); setError('');
    try {
      const response = await OTPWidget.retryOTP({ reqId });
      if (response?.reqId || response?.message?.toUpperCase() === 'SUCCESS') setCountdown(30);
      else setError(t('auth.errResend'));
    } catch { setError(t('auth.errResend')); }
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError(t('auth.errOtpLen')); return; }
    setIsLoading(true); setError('');
    try {
      const response = await OTPWidget.verifyOTP({ reqId, otp });
      const success = response?.message?.toUpperCase() === 'SUCCESS' || response?.type === 'success';
      if (!success) { setError(t('auth.errWrongOtp')); return; }
      const widgetToken = typeof response?.message === 'string' && response.message.startsWith('eyJ') ? response.message : response?.reqId ?? reqId;
      const backend = await api.post('/api/v1/auth/guard-app/otp/verify', { widgetToken });
      const data = backend.data?.data;
      if (!data?.accessToken || !data?.user) { setError(t('auth.errAuth')); return; }
      if (data.user.role !== 'GUARD') { setError(t('auth.notGuard')); return; }
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (caught: any) {
      const message = caught?.response?.data?.message || caught?.message || t('auth.errVerify');
      // The server rejects non-guard accounts with 403 "...for guards only."
      if (caught?.response?.status === 403 && /guards only/i.test(message)) { setError(t('auth.notGuard')); return; }
      setError(message);
      if (message.toLowerCase().includes('no guard') || message.includes('404')) {
        Alert.alert(t('auth.notFoundTitle'), t('auth.notFoundText'), [{ text: t('common.ok'), onPress: () => setScreen('phone') }]);
      }
    } finally { setIsLoading(false); }
  };

  const isReady = screen === 'phone' ? phone.length === 10 : otp.length === 6;
  const submit = screen === 'phone' ? handleSendOtp : handleVerifyOtp;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={GuardColors.bg} />
      <LinearGradient colors={GuardGradients.glow} style={styles.glow} pointerEvents="none" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: 24 + keyboardHeight }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <GuardBrandMark />
            <LanguageSwitch compact />
          </View>

          <View style={styles.brandArea}>
            <Text style={styles.eyebrow}>{t('auth.eyebrow')}</Text>
            <Text style={styles.title}>{screen === 'phone' ? t('auth.welcome') : t('auth.verifyTitle')}</Text>
            <Text style={styles.subtitle}>{screen === 'phone' ? t('auth.welcomeSub') : t('auth.sentTo', { phone })}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.secureRow}><Ionicons name="shield-checkmark" size={18} color={GuardColors.green} /><Text style={styles.secureText}>{t('auth.secure')}</Text></View>
            {screen === 'otp' && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setScreen('phone'); setOtp(''); setError(''); }} style={styles.backRow}>
                <Ionicons name="arrow-back" size={22} color={GuardColors.t1} />
                <Text style={styles.backText}>{t('auth.change')}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>{screen === 'phone' ? t('auth.mobile') : t('auth.otpLabel')}</Text>
            <View style={[styles.inputWrap, !!error && styles.inputError]}>
              {screen === 'phone' ? <Text style={styles.prefix}>+91</Text> : <Ionicons name="lock-closed-outline" size={24} color={GuardColors.t3} />}
              <TextInput
                value={screen === 'phone' ? phone : otp}
                onChangeText={(value) => {
                  const cleaned = value.replace(/\D/g, '').slice(0, screen === 'phone' ? 10 : 6);
                  if (screen === 'phone') setPhone(cleaned); else setOtp(cleaned);
                  setError('');
                }}
                placeholder={screen === 'phone' ? t('auth.phonePlaceholder') : '••••••'}
                placeholderTextColor={GuardColors.t4}
                keyboardType="number-pad"
                maxLength={screen === 'phone' ? 10 : 6}
                autoFocus={screen === 'otp'}
                editable={!isLoading}
                style={[styles.input, screen === 'otp' && styles.otpInput]}
              />
            </View>
            {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={22} color={GuardColors.red} /><Text style={styles.errorText}>{error}</Text></View>}

            {screen === 'otp' && (
              <TouchableOpacity activeOpacity={0.7} onPress={handleResendOtp} disabled={countdown > 0 || isLoading} style={styles.resend}>
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>{countdown > 0 ? t('auth.resendIn', { n: countdown }) : t('auth.resend')}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.submit}>
              <GiantButton
                label={screen === 'phone' ? t('auth.continue') : t('auth.verifySignIn')}
                icon={screen === 'phone' ? 'arrow-forward' : 'shield-checkmark'}
                tone="gold"
                loading={isLoading}
                disabled={!isReady}
                onPress={submit}
              />
            </View>
          </View>
          <Text style={styles.help}>{t('auth.help')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, root: { flex: 1, backgroundColor: GuardColors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandArea: { marginTop: 28, marginBottom: 22 },
  eyebrow: { fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 13, lineHeight: 18, letterSpacing: 1.6, color: GuardColors.goldDeep },
  title: { marginTop: 8, fontFamily: GuardFonts.bold, fontWeight: '900', fontSize: 34, lineHeight: 44, letterSpacing: -0.8, color: GuardColors.t1 },
  subtitle: { marginTop: 8, fontFamily: GuardFonts.medium, fontSize: GuardType.body, lineHeight: 26, fontWeight: '500', color: GuardColors.t2 },
  card: { backgroundColor: GuardColors.card, borderRadius: 30, borderWidth: 1, borderColor: GuardColors.border, padding: 20 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  secureText: { fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 13, lineHeight: 18, letterSpacing: 1, color: GuardColors.green },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: GuardTouch.min, marginBottom: 6 },
  backText: { fontFamily: GuardFonts.bold, fontWeight: '800', fontSize: GuardType.body, lineHeight: 26, color: GuardColors.t1 },
  label: { marginBottom: 10, fontFamily: GuardFonts.semibold, fontWeight: '800', fontSize: 14, lineHeight: 20, letterSpacing: 0.8, color: GuardColors.t3 },
  inputWrap: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, borderWidth: 2, borderColor: GuardColors.border, backgroundColor: GuardColors.bg, paddingHorizontal: 18 },
  inputError: { borderColor: GuardColors.red },
  prefix: { fontFamily: GuardFonts.bold, fontWeight: '800', fontSize: 26, color: GuardColors.t1, paddingRight: 14, borderRightWidth: 2, borderRightColor: GuardColors.border },
  input: { flex: 1, fontFamily: GuardFonts.bold, fontWeight: '800', fontSize: 28, letterSpacing: 2, color: GuardColors.t1, paddingVertical: 12 },
  otpInput: { fontSize: 34, letterSpacing: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, backgroundColor: GuardColors.redBg, borderRadius: 18, padding: 14 },
  errorText: { flex: 1, fontFamily: GuardFonts.bold, fontWeight: '700', fontSize: GuardType.min + 1, lineHeight: 24, color: GuardColors.red },
  resend: { alignSelf: 'flex-end', minHeight: GuardTouch.min, justifyContent: 'center', marginTop: 4 },
  resendText: { fontFamily: GuardFonts.bold, fontWeight: '800', fontSize: GuardType.min + 1, lineHeight: 22, color: GuardColors.goldDeep },
  resendDisabled: { color: GuardColors.t3 },
  submit: { marginTop: 14 },
  help: { marginTop: 20, textAlign: 'center', fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, color: GuardColors.t3 },
});
