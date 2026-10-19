import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { startRealtime, stopRealtime, type LiveAlert } from '@/services/realtime';
import { playSingleChime, startAlertSound, stopAlertSound } from '@/services/alertSound';
import { useGateStore } from '@/store/useGateStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getUnreadCount } from '@/services/notification.service';
import { withGroup } from '@/services/groupApproval';
import { useVisitorPhoto } from '@/hooks/useVisitorPhoto';

const SERVER_ROOT = 'https://society-gate-backend-gsrq.onrender.com';
const BANNER_MS = 6000;
/** A request older than this is already over on the server (it expires after 15 minutes) */
const REQUEST_LIVE_MS = 14 * 60 * 1000;

/** Requests already put in front of the person, so a dismissed popup does not come back by itself */
const promptedRequests = new Set<string>();

/** Tapping a gate notification shows its approval popup again, even if it was dismissed before. */
export function reopenGateRequest(entryRequestId?: string): void {
  if (entryRequestId) promptedRequests.delete(entryRequestId);
}

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
  // A group is asking how many to let in: shown inside this same card, not in a second dialog on top
  const [choosing, setChoosing] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback(async (alert: LiveAlert): Promise<boolean> => {
    // Keep the list on Home / Approvals in step with what the alert is about
    if (alert.data.type?.startsWith('GATE_')) useGateStore.getState().onGatePush();

    if (alert.urgent) {
      if (alert.data.entryRequestId) promptedRequests.add(alert.data.entryRequestId);
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

  // A visitor is waiting but no live alert reached us (app was closed, push tapped, family switched
  // flats...): when the app is open, show the same approval popup instead of leaving it on the list.
  const pendingRequests = useGateStore((s) => s.pendingRequests);
  useEffect(() => {
    if (!isAuthenticated || urgent || AppState.currentState !== 'active') return;
    const next = pendingRequests.find((r) =>
      !promptedRequests.has(r.id) && Date.now() - new Date(r.createdAt).getTime() < REQUEST_LIVE_MS);
    if (!next) return;
    promptedRequests.add(next.id);
    const flat = next.flat?.number;
    setUrgent({
      title: `${withGroup(next.visitorName || 'A visitor', next.peopleCount)} is at the gate`,
      body: [next.purpose, flat ? `Flat ${flat}` : null].filter(Boolean).join(' · ') || 'Waiting for your answer',
      data: {
        type: 'GATE_REQUEST',
        entryRequestId: next.id,
        visitorName: next.visitorName ?? '',
        peopleCount: String(next.peopleCount ?? 1),
      },
      urgent: true,
    });
    void playSingleChime();
  }, [pendingRequests, isAuthenticated, urgent]);

  // Coming back to the app (or opening it from a notification): look for waiting visitors at once
  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = () => { void useGateStore.getState().fetchPendingRequests(); };
    refresh();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => sub.remove();
  }, [isAuthenticated]);

  const close = useCallback(() => {
    stopAlertSound();
    setUrgent(null);
    setBusy(false);
    setChoosing(false);
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
  const groupSize = Number(urgent?.data.peopleCount) || 1;
  const photo = useVisitorPhoto(isGateRequest ? urgent?.data.entryRequestId : undefined);
  const onAllow = () => {
    if (groupSize > 1) { stopAlertSound(); setChoosing(true); return; }
    void answer('approve');
  };

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
            {isGateRequest && photo ? (
              <Image source={{ uri: photo }} style={styles.photoIcon} resizeMode="cover" accessibilityLabel="Visitor photo" />
            ) : (
              <View style={styles.ringIcon}>
                <Ionicons name={isGateRequest ? 'person' : 'alert-circle'} size={34} color={SgateColors.ink} />
              </View>
            )}
            <Text style={styles.kicker}>{isGateRequest ? (choosing ? 'LET IN HOW MANY?' : 'VISITOR AT THE GATE') : 'IMPORTANT ALERT'}</Text>
            <Text style={styles.title}>{choosing ? `${groupSize} people are at the gate` : urgent?.title}</Text>
            <Text style={styles.body}>{choosing ? 'Choose how many to let in. The others wait outside.' : urgent?.body}</Text>

            {isGateRequest && choosing ? (
              <View style={styles.choices}>
                <Pressable style={[styles.btn, styles.allow, styles.choiceBtn]} onPress={() => answer('approve')} disabled={busy} accessibilityRole="button">
                  <Text style={styles.allowText}>Let all {groupSize} in</Text>
                </Pressable>
                {Array.from({ length: Math.min(groupSize - 1, 4) }, (_, i) => i + 1).map((n) => (
                  <Pressable key={n} style={[styles.btn, styles.allowSoft, styles.choiceBtn]} onPress={() => answer('approve', n)} disabled={busy} accessibilityRole="button">
                    <Text style={styles.allowText}>{n === 1 ? 'Only 1 person' : `Only ${n} people`}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setChoosing(false)} hitSlop={12} accessibilityRole="button">
                  <Text style={styles.silence}>Back</Text>
                </Pressable>
              </View>
            ) : isGateRequest ? (
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.decline]} onPress={() => answer('reject')} disabled={busy} accessibilityRole="button">
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.allow]} onPress={onAllow} disabled={busy} accessibilityRole="button">
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

            {choosing ? null : (
              <Pressable onPress={stopAlertSound} hitSlop={12} accessibilityRole="button">
                <Text style={styles.silence}>Silence the ring</Text>
              </Pressable>
            )}
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
  photoIcon: { width: 96, height: 96, borderRadius: 30, backgroundColor: '#EEE' },
  choices: { alignSelf: 'stretch', gap: 10, marginTop: 20, alignItems: 'center' },
  choiceBtn: { flex: 0, alignSelf: 'stretch' },
  allowSoft: { backgroundColor: SgateColors.goldPale },
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
