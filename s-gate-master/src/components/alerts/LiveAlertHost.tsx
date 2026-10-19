import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { startRealtime, stopRealtime, type LiveAlert } from '@/services/realtime';
import { playSingleChime, startAlertSound, stopAlertSound } from '@/services/alertSound';
import { useGateStore } from '@/store/useGateStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getUnreadCount } from '@/services/notification.service';
import { chooseHowManyToAllow } from '@/services/groupApproval';

const SERVER_ROOT = 'https://society-gate-backend-gsrq.onrender.com';
const BANNER_MS = 6000;

interface Props {
  /** Opens the screen the alert is about (the same routing as tapping a push notification) */
  onOpen: (data: Record<string, any>) => void;
}

/**
 * Keeps the live connection to the server and shows alerts that arrive while the app is open:
 *  - urgent (visitor at the gate, emergency...): full-screen card that rings and vibrates until
 *    the person answers
 *  - everything else: a banner at the top with one short chime
 * The server only sends a push notification when this component did NOT show the alert.
 */
export function LiveAlertHost({ onOpen }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [urgent, setUrgent] = useState<LiveAlert | null>(null);
  const [banner, setBanner] = useState<LiveAlert | null>(null);
  const [busy, setBusy] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback(async (alert: LiveAlert): Promise<boolean> => {
    // Keep the list on Home / Approvals in step with what the alert is about
    if (alert.data.type?.startsWith('GATE_')) useGateStore.getState().onGatePush();

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

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtime();
      return;
    }
    startRealtime({
      baseUrl: SERVER_ROOT,
      getToken: () => useAuthStore.getState().accessToken,
      refreshSession: () => getUnreadCount(),
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
    setBusy(false);
  }, []);

  const answer = useCallback(async (kind: 'approve' | 'reject', count?: number) => {
    const id = urgent?.data.entryRequestId;
    if (!id || busy) return;
    setBusy(true);
    stopAlertSound();
    try {
      if (kind === 'approve') await useGateStore.getState().approveRequest(id, count);
      else await useGateStore.getState().rejectRequest(id);
    } catch {
      // The request may already be answered (by another family member or the gate timing out);
      // the lists below refresh either way.
    }
    void useGateStore.getState().fetchPendingRequests();
    close();
  }, [urgent, busy, close]);

  const isGateRequest = urgent?.data.type === 'GATE_REQUEST' && !!urgent.data.entryRequestId;

  return (
    <>
      {banner ? (
        <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="box-none">
          <Animated.View entering={FadeInUp.duration(220)}>
            <Pressable
              style={styles.banner}
              onPress={() => { setBanner(null); onOpen(banner.data); }}
              accessibilityRole="button"
            >
              <View style={styles.bannerIcon}><Ionicons name="notifications" size={20} color={SgateColors.ink} /></View>
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
              <Ionicons name={isGateRequest ? 'person' : 'alert-circle'} size={34} color={SgateColors.ink} />
            </View>
            <Text style={styles.kicker}>{isGateRequest ? 'VISITOR AT THE GATE' : 'IMPORTANT ALERT'}</Text>
            <Text style={styles.title}>{urgent?.title}</Text>
            <Text style={styles.body}>{urgent?.body}</Text>

            {isGateRequest ? (
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.decline]} onPress={() => answer('reject')} disabled={busy} accessibilityRole="button">
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.allow]} onPress={() => chooseHowManyToAllow({ name: urgent?.data.visitorName, peopleCount: Number(urgent?.data.peopleCount) || 1 }, (count) => answer('approve', count))} disabled={busy} accessibilityRole="button">
                  <Text style={styles.allowText}>Allow</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.decline]} onPress={close} accessibilityRole="button">
                  <Text style={styles.declineText}>Dismiss</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.allow]}
                  onPress={() => { const data = urgent?.data ?? {}; close(); onOpen(data); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.allowText}>Open</Text>
                </Pressable>
              </View>
            )}

            <Pressable onPress={stopAlertSound} hitSlop={12} accessibilityRole="button">
              <Text style={styles.silence}>Silence the ring</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, padding: 14, borderRadius: 20,
    backgroundColor: SgateColors.ink, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  bannerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: '#FFFFFF', fontFamily: SgateFonts.bold, fontSize: 14 },
  bannerBody: { color: 'rgba(255,255,255,0.78)', fontFamily: SgateFonts.regular, fontSize: 12, marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(17,19,24,0.72)', justifyContent: 'center', padding: 22 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 26, alignItems: 'center' },
  ringIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
  kicker: { marginTop: 18, fontFamily: SgateFonts.extrabold, fontSize: 12, letterSpacing: 2, color: SgateColors.goldDeep },
  title: { marginTop: 8, fontFamily: SgateFonts.extrabold, fontSize: 24, color: SgateColors.ink, textAlign: 'center' },
  body: { marginTop: 8, fontFamily: SgateFonts.regular, fontSize: 15, lineHeight: 22, color: '#4B5160', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24, alignSelf: 'stretch' },
  btn: { flex: 1, minHeight: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: '#F3F3F1' },
  declineText: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.red },
  allow: { backgroundColor: SgateColors.gold },
  allowText: { fontFamily: SgateFonts.extrabold, fontSize: 17, color: SgateColors.ink },
  silence: { marginTop: 16, fontFamily: SgateFonts.semibold, fontSize: 13, color: '#8A8F9C' },
});
