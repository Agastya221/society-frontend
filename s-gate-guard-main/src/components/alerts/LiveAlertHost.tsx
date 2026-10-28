import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GiantButton } from '@/components/gate/GiantButton';
import { GuardColors, GuardFonts } from '@/constants/theme';
import { useT } from '@/i18n';
import api, { BASE_URL } from '@/services/api';
import { playSingleChime, startAlertSound, stopAlertSound } from '@/services/alertSound';
import { startRealtime, stopRealtime, type LiveAlert } from '@/services/realtime';
import { useAuthStore } from '@/store/useAuthStore';

const BANNER_MS = 6000;

/**
 * Alerts that arrive while the guard app is open: the server hands them straight to the screen
 * (and sends no push). Urgent ones (resident answered, emergency) fill the screen, ring and
 * vibrate until the guard answers; the rest show as a banner with one chime.
 */
export function LiveAlertHost() {
  const t = useT();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [urgent, setUrgent] = useState<LiveAlert | null>(null);
  const [banner, setBanner] = useState<LiveAlert | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((data: Record<string, string>) => {
    const emergency = data.type === 'EMERGENCY_ALERT' || data.screen === 'EmergencyDetail';
    const delivery = data.type === 'DELIVERY_OVERSTAY';
    const staffTask = String(data.type ?? '').startsWith('STAFF_TASK');
    router.push((emergency ? '/emergencies' : delivery ? '/today-entries' : staffTask ? '/tasks' : '/approvals') as never);
  }, [router]);

  const showAlert = useCallback(async (alert: LiveAlert): Promise<boolean> => {
    const isEmergency = alert.data?.type === 'EMERGENCY_ALERT' || alert.data?.screen === 'EmergencyDetail';
    if (alert.urgent || isEmergency) {
      setBanner(null);
      setUrgent(alert);
      await startAlertSound();
    } else {
      setBanner(alert);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), BANNER_MS);
      void playSingleChime();
    }
    return true;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtime();
      return;
    }
    startRealtime({
      baseUrl: BASE_URL,
      getToken: () => useAuthStore.getState().accessToken,
      refreshSession: () => api.get('/api/v1/gate/entry-requests/queue'),
      onAlert: showAlert,
    });
    return () => {
      stopRealtime();
      stopAlertSound();
    };
  }, [isAuthenticated, showAlert]);

  const close = useCallback(() => {
    stopAlertSound();
    setUrgent(null);
  }, []);

  const kicker = (type?: string) =>
    type === 'GATE_APPROVED' ? t('alert.approved')
      : type === 'GATE_DENIED' ? t('alert.denied')
        : type === 'GATE_EXPIRED' ? t('alert.expired')
          : t('alert.important');

  return (
    <>
      {banner ? (
        <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="box-none">
          <Animated.View entering={FadeInUp.duration(220)}>
            <Pressable style={styles.banner} onPress={() => { const data = banner.data; setBanner(null); open(data); }} accessibilityRole="button">
              <View style={styles.bannerIcon}><Ionicons name="notifications" size={24} color={GuardColors.black} /></View>
              <View style={styles.bannerCopy}>
                <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text>
                <Text style={styles.bannerBody} numberOfLines={2}>{banner.body}</Text>
              </View>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      ) : null}

      <Modal visible={!!urgent} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <View style={styles.backdrop}>
          <Animated.View entering={FadeInDown.duration(260)} style={styles.card}>
            <View style={styles.ringIcon}>
              <Ionicons name={urgent?.data.type === 'GATE_DENIED' ? 'close-circle' : urgent?.data.type === 'GATE_APPROVED' ? 'checkmark-circle' : 'alert-circle'} size={44} color={GuardColors.black} />
            </View>
            <Text style={styles.kicker}>{kicker(urgent?.data.type)}</Text>
            <Text style={styles.title}>{urgent?.title}</Text>
            <Text style={styles.body}>{urgent?.body}</Text>
            <View style={styles.actions}>
              <GiantButton label={t('alert.open')} icon="list" tone="gold" onPress={() => { const data = urgent?.data ?? {}; close(); open(data); }} />
              <GiantButton label={t('common.ok')} icon="checkmark" tone="light" onPress={close} />
            </View>
            <Pressable onPress={stopAlertSound} hitSlop={14} accessibilityRole="button">
              <Text style={styles.silence}>{t('alert.silence')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, zIndex: 50 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, padding: 16, borderRadius: 24,
    backgroundColor: GuardColors.black, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  bannerIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: 18 },
  bannerBody: { color: 'rgba(255,255,255,0.8)', fontFamily: GuardFonts.medium, fontSize: 15, marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(13,15,20,0.78)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: GuardColors.card, borderRadius: 34, padding: 24, alignItems: 'center' },
  ringIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' },
  kicker: { marginTop: 18, fontFamily: GuardFonts.bold, fontSize: 15, letterSpacing: 1.5, color: GuardColors.goldDeep },
  title: { marginTop: 8, fontFamily: GuardFonts.bold, fontSize: 28, color: GuardColors.t1, textAlign: 'center' },
  body: { marginTop: 10, fontFamily: GuardFonts.medium, fontSize: 19, lineHeight: 27, color: GuardColors.t2, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 24 },
  silence: { marginTop: 18, fontFamily: GuardFonts.bold, fontSize: 16, color: GuardColors.t3 },
});
