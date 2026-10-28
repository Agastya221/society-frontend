import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Radius } from '../../constants/theme';
import { API_URL } from '../../constants/api';
import { api } from '../../services/api';
import { playSingleChime, startAlertSound, stopAlertSound } from '../../services/alertSound';
import { startRealtime, stopRealtime, type LiveAlert } from '../../services/realtime';
import { useAuth } from '../../store/auth';
import { useBookingsSignal } from '../../store/bookingsSignal';
import { useTasksSignal } from '../../store/tasksSignal';

const SERVER_ROOT = API_URL.replace(/\/api\/v1\/?$/, '');
const BANNER_MS = 6000;

/**
 * Alerts that arrive while the staff app is open (a new work request...). The server hands them
 * straight to the screen and sends no push. Urgent ones fill the screen and ring until answered.
 */
export function LiveAlertHost() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [urgent, setUrgent] = useState<LiveAlert | null>(null);
  const [banner, setBanner] = useState<LiveAlert | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((type?: string) => router.push((String(type ?? '').startsWith('STAFF_TASK') ? '/tasks' : '/bookings') as never), [router]);
  const isEmergencyKind = (type?: string) => type === 'EMERGENCY_ALERT' || type === 'EMERGENCY_ALL_CLEAR';

  const showAlert = useCallback(async (alert: LiveAlert): Promise<boolean> => {
    // A new or cancelled work request: the list on the Work requests screen is out of date now
    if (String(alert.data?.type ?? '').startsWith('STAFF_BOOKING')) useBookingsSignal.getState().bump();
    // A task from security or the admin: the Tasks list is out of date now
    if (String(alert.data?.type ?? '').startsWith('STAFF_TASK')) useTasksSignal.getState().bump();
    // The task that is ringing was just cancelled: stop ringing for it
    if (alert.data?.type === 'STAFF_TASK_CANCELLED') {
      setUrgent((shown) => (shown && shown.data?.taskId === alert.data?.taskId ? (stopAlertSound(), null) : shown));
    }
    // The request that is ringing was just cancelled: stop ringing for it
    if (alert.data?.type === 'STAFF_BOOKING_CANCELLED') {
      setUrgent((shown) => (shown && shown.data?.bookingId === alert.data?.bookingId ? (stopAlertSound(), null) : shown));
    }
    // The emergency is over: stop ringing and take the emergency screen down
    if (alert.data?.type === 'EMERGENCY_ALL_CLEAR') {
      stopAlertSound();
      setUrgent((shown) => (shown?.data?.type === 'EMERGENCY_ALERT' ? null : shown));
    }
    if (alert.urgent) {
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

  // The banner's 6-second timer must not outlive the screen
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  useEffect(() => {
    if (!token) {
      stopRealtime();
      return;
    }
    startRealtime({
      baseUrl: SERVER_ROOT,
      getToken: () => useAuth.getState().token,
      refreshSession: () => api.get('/staff-app/me'),
      onAlert: showAlert,
    });
    return () => {
      stopRealtime();
      stopAlertSound();
    };
  }, [token, showAlert]);

  const close = useCallback(() => {
    stopAlertSound();
    setUrgent(null);
  }, []);

  return (
    <>
      {banner ? (
        <SafeAreaView edges={['top']} style={s.bannerWrap} pointerEvents="box-none">
          <View>
            <Pressable style={s.banner} onPress={() => { setBanner(null); if (!isEmergencyKind(banner.data?.type)) open(banner.data?.type); }} accessibilityRole="button">
              <View style={s.bannerIcon}><Ionicons name="notifications" size={20} color={Colors.ink} /></View>
              <View style={s.bannerCopy}>
                <Text style={s.bannerTitle} numberOfLines={1}>{banner.title}</Text>
                <Text style={s.bannerBody} numberOfLines={2}>{banner.body}</Text>
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      ) : null}

      <Modal visible={!!urgent} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <View style={s.backdrop}>
          <View style={s.card}>
            {urgent?.data?.type === 'EMERGENCY_ALERT' ? (
              <>
                <View style={[s.ringIcon, s.emergencyIcon]}><Ionicons name="warning" size={34} color="#FFFFFF" /></View>
                <Text style={[s.kicker, s.emergencyKicker]}>EMERGENCY</Text>
                <Text style={s.title}>{urgent?.title}</Text>
                <Text style={s.body}>{urgent?.body}</Text>
                <View style={s.actions}>
                  <Pressable style={[s.btn, s.emergencyOk]} onPress={close} accessibilityRole="button"><Text style={s.emergencyOkText}>OK, I understand</Text></Pressable>
                </View>
              </>
            ) : urgent?.data?.type === 'STAFF_TASK_NEW' ? (
              <>
                <View style={s.ringIcon}><Ionicons name="checkbox" size={32} color={Colors.ink} /></View>
                <Text style={s.kicker}>NEW TASK</Text>
                <Text style={s.title}>{urgent?.body}</Text>
                <Text style={s.body}>Given by security or the admin. Open it to accept or finish it.</Text>
                <View style={s.actions}>
                  <Pressable style={[s.btn, s.later]} onPress={close} accessibilityRole="button"><Text style={s.laterText}>Later</Text></Pressable>
                  <Pressable style={[s.btn, s.view]} onPress={() => { close(); open('STAFF_TASK_NEW'); }} accessibilityRole="button"><Text style={s.viewText}>View task</Text></Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={s.ringIcon}><Ionicons name="briefcase" size={32} color={Colors.ink} /></View>
                <Text style={s.kicker}>NEW WORK REQUEST</Text>
                <Text style={s.title}>{urgent?.title}</Text>
                <Text style={s.body}>{urgent?.body}</Text>
                <View style={s.actions}>
                  <Pressable style={[s.btn, s.later]} onPress={close} accessibilityRole="button"><Text style={s.laterText}>Later</Text></Pressable>
                  <Pressable style={[s.btn, s.view]} onPress={() => { close(); open(); }} accessibilityRole="button"><Text style={s.viewText}>View request</Text></Pressable>
                </View>
              </>
            )}
            <Pressable onPress={stopAlertSound} hitSlop={12} accessibilityRole="button"><Text style={s.silence}>Silence the ring</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, zIndex: 50 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, padding: 14, borderRadius: 20, backgroundColor: Colors.ink, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  bannerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  bannerBody: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(18,21,29,0.72)', justifyContent: 'center', padding: 22 },
  card: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 26, alignItems: 'center' },
  ringIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  kicker: { marginTop: 18, fontSize: 12, fontWeight: '900', letterSpacing: 2, color: '#D39200' },
  title: { marginTop: 8, fontSize: 24, fontWeight: '900', color: Colors.ink, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 15, lineHeight: 22, color: Colors.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24, alignSelf: 'stretch' },
  btn: { flex: 1, minHeight: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  emergencyIcon: { backgroundColor: '#D93636' },
  emergencyKicker: { color: '#D93636' },
  emergencyOk: { backgroundColor: '#D93636' },
  emergencyOkText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  later: { backgroundColor: Colors.bg },
  laterText: { fontSize: 16, fontWeight: '800', color: Colors.muted },
  view: { backgroundColor: Colors.gold },
  viewText: { fontSize: 16, fontWeight: '900', color: Colors.ink },
  silence: { marginTop: 16, fontSize: 13, fontWeight: '700', color: Colors.soft },
});
