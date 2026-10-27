import { LanguageSwitch } from '@/components/gate/LanguageSwitch';
import { LiveDot } from '@/components/gate/LiveDot';
import { Pressy } from '@/components/gate/Pressy';
import { GuardColors, GuardFonts, GuardGradients, GuardSemantic, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import { loadFlatDirectory } from '@/services/flatDirectory';
import { fetchQueue } from '@/services/gateQueue';
import { endDuty, fetchDuty, fetchGeofence, startDuty, type Duty, type GeofenceStatus } from '@/services/geofence';
import { AppAlert } from '@/components/gate/AppAlert';
import { DutyToggle } from '@/components/gate/DutyToggle';
import { ActiveEmergencyCard } from '@/components/alerts/ActiveEmergencyCard';
import { BottomNavBar } from '@/components/navigation/BottomNavBar';
import { useAuthStore } from '@/store/useAuthStore';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const POLL_MS = 15000;
/** Consecutive failed queue calls before Home shows "No connection". */
const OFFLINE_AFTER_FAILURES = 3;

type Route = '/new-entry' | '/scan-verify' | '/today-entries' | '/approvals' | '/profile' | '/emergencies';

/** Staggered rise-in so the screen settles instead of popping. */
const rise = (i: number) => FadeInDown.delay(i * 70).duration(420);

export default function GuardDashboard() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const user = useAuthStore((state) => state.user);
  const activeEmergencies = useEmergencyStore((state) => state.active);
  const setSheetOpen = useEmergencyStore((state) => state.setSheetOpen);
  const hasActiveEmergency = activeEmergencies.length > 0;
  const [pendingCount, setPendingCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [stoppedCount, setStoppedCount] = useState(0);
  const [insideCount, setInsideCount] = useState(0);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [geo, setGeo] = useState<GeofenceStatus | null>(null);
  // undefined = unknown (older server), null = off duty, object = on duty
  const [duty, setDuty] = useState<Duty | null | undefined>(undefined);
  const dutyBusy = useRef(false);
  const [dutyWorking, setDutyWorking] = useState(false);
  const failures = useRef(0);
  const inFlight = useRef(false);

  // One /queue call for every number on this screen. On failure the last-known
  // counts stay; after a few misses in a row a small "No connection" chip shows.
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const queue = await fetchQueue();
      setPendingCount(queue.waiting.length);
      setReadyCount(queue.ready.length);
      setStoppedCount(queue.stopped.length);
      setInsideCount(queue.insideCount);
      failures.current = 0;
      setOffline(false);
    } catch {
      failures.current += 1;
      if (failures.current >= OFFLINE_AFTER_FAILURES) setOffline(true);
    } finally {
      inFlight.current = false;
    }
  }, []);

  const onPull = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      await checkGate();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Is this phone at the gate? Also keeps a fresh location ready for the next action the guard takes.
  const checkGate = useCallback(async () => {
    try { setGeo(await fetchGeofence()); } catch { /* offline: the chip above already says so */ }
    try { setDuty(await fetchDuty()); } catch { /* keep what we last knew */ }
  }, []);

  const toggleDuty = useCallback(() => {
    if (dutyBusy.current || duty === undefined) return;
    const run = async (action: () => Promise<unknown>, failTitle?: string) => {
      dutyBusy.current = true;
      setDutyWorking(true);
      try {
        await action();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDuty(await fetchDuty());
      } catch (err: any) {
        AppAlert.show(failTitle ?? t('home.dutyFailed'), err?.response?.data?.message ?? err?.message ?? '');
      } finally {
        dutyBusy.current = false;
        setDutyWorking(false);
      }
    };
    if (duty) {
      AppAlert.show(t('home.endDutyTitle'), t('home.endDutyText'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('home.endDuty'), style: 'destructive', onPress: () => { void run(endDuty); } },
      ]);
    } else {
      void run(startDuty);
    }
  }, [duty, t]);

  // A visitor can arrive any time, so keep the counts fresh while this screen is showing.
  useFocusEffect(useCallback(() => {
    void refresh();
    void checkGate();
    const gateTimer = setInterval(() => { if (AppState.currentState === 'active') void checkGate(); }, 20_000);
    if (user?.id) void loadFlatDirectory(user.id).catch(() => undefined);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, POLL_MS);
    return () => { clearInterval(timer); clearInterval(gateTimer); };
  }, [refresh, checkGate, user?.id]));

  const open = (route: Route) => router.push(route);

  const firstName = user?.name?.split(' ')[0] ?? 'Guard';
  const waiting = pendingCount > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={GuardGradients.glow} style={styles.glow} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 96 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} tintColor={GuardColors.goldDeep} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={rise(0)} style={styles.header}>
          <Image source={require('@/assets/images/s-gate-logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="S-Gate" />
          <View style={styles.headerCopy}>
            <Text style={styles.hello}>{t('home.hello')}</Text>
            <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
          </View>
          <LanguageSwitch compact />
        </Animated.View>

        {/* Duty Toggle: On/Off Shift Toggle Row (Just below header) */}
        {duty !== undefined ? (
          <Animated.View
            key="duty-toggle-row"
            entering={rise(1)}
            layout={LinearTransition.springify().damping(25).stiffness(300)}
            style={styles.dutyCardWrap}
          >
            <DutyToggle
              on={!!duty}
              busy={dutyWorking}
              title={duty ? t('home.dutyOn') : t('home.dutyOff')}
              hint={duty
                ? t('home.dutySince', { time: new Date(duty.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
                : t('home.dutyOffHint')}
              gateLine={geo?.enforced
                ? (geo.ok
                  ? t('home.atGate', { gate: geo.gateName ?? '' })
                  : geo.code === 'GEOFENCE_OUTSIDE' ? t('home.notAtGate', { n: geo.distanceMeters ?? 0 })
                  : geo.code === 'LOCATION_FAKED' ? t('home.locationFaked')
                  : geo.code === 'LOCATION_REQUIRED' ? t('home.locationOff')
                  : t('home.locationFinding'))
                : null}
              gateOk={!!geo?.ok}
              onToggle={toggleDuty}
            />
          </Animated.View>
        ) : null}

        {/* System-Level Priority Alert: Active Emergency (Below duty toggle) */}
        {hasActiveEmergency ? (
          <Animated.View
            key="active-emergency-card"
            entering={FadeInDown.springify().damping(25).stiffness(300)}
            exiting={FadeOutUp.springify().damping(25).stiffness(300)}
            layout={LinearTransition.springify().damping(25).stiffness(300)}
            style={styles.emergencyCardWrap}
          >
            <ActiveEmergencyCard
              emergencies={activeEmergencies}
              onPress={() => setSheetOpen(true)}
            />
          </Animated.View>
        ) : null}

        {duty === undefined || offline ? (
          <Animated.View
            entering={rise(1)}
            layout={LinearTransition.springify().damping(25).stiffness(300)}
            style={styles.chipRow}
          >
            {duty === undefined ? (
              <View style={styles.dutyChip}>
                <LiveDot color={GuardColors.green} size={8} />
                <Text style={styles.dutyText} numberOfLines={1}>{t('home.onDutyAt', { gate: user?.gate ?? 'Main Gate' }) + '\u00A0'}</Text>
              </View>
            ) : null}
            {offline ? (
              <View style={styles.offlineChip} accessibilityLabel={t('home.offline')}>
                <Ionicons name="cloud-offline" size={16} color={GuardColors.red} />
                <Text style={styles.offlineText} numberOfLines={1}>{t('home.offline') + '\u00A0'}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {stoppedCount > 0 ? (
          <Pressy accessibilityLabel={t('home.stoppedNow', { n: stoppedCount })} onPress={() => open('/approvals')} style={styles.stoppedBanner}>
            <Ionicons name="close-circle" size={28} color={GuardColors.red} />
            <Text style={styles.readyText}>{t('home.stoppedNow', { n: stoppedCount })}</Text>
            <Ionicons name="arrow-forward" size={24} color={GuardColors.t1} />
          </Pressy>
        ) : null}

        {readyCount > 0 ? (
          <Pressy accessibilityLabel={t('home.readyNow', { n: readyCount })} onPress={() => open('/approvals')} style={styles.readyBanner}>
            <Ionicons name="checkmark-circle" size={28} color={GuardColors.green} />
            <Text style={styles.readyText}>{t('home.readyNow', { n: readyCount })}</Text>
            <Ionicons name="arrow-forward" size={24} color={GuardColors.t1} />
          </Pressy>
        ) : null}

        {/* Primary Action: New Visitor Entry (Reflowed to primary position) */}
        <Animated.View entering={rise(2)}>
          <Pressy accessibilityLabel={t('home.newVisitor')} onPress={() => open('/new-entry')} style={[styles.visitor, guardShadow('#0D0F14', 3)]}>
            <LinearGradient colors={GuardGradients.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
            <View style={styles.visitorIcon}><Ionicons name="person-add" size={28} color={GuardColors.gold} /></View>
            <View style={styles.visitorCopy}>
              <Text style={styles.visitorTitle}>{t('home.newVisitor')}</Text>
              <Text style={styles.visitorSub}>{t('home.newVisitorSub')}</Text>
            </View>
            <View style={styles.visitorGo}><Ionicons name="arrow-forward" size={22} color={GuardColors.black} /></View>
          </Pressy>
        </Animated.View>

        {/* Live numbers: Inside now & Waiting (16px spacing) */}
        <Animated.View entering={rise(3)} layout={LinearTransition.springify().damping(25).stiffness(300)} style={styles.stats}>
          <Pressy
            wrapStyle={styles.statWrap}
            accessibilityLabel={`${t('home.statInside')} ${insideCount}`}
            onPress={() => open('/today-entries')}
            style={styles.stat}
          >
            <View style={[styles.statIcon, { backgroundColor: GuardColors.blueBg }]}><Ionicons name="people" size={24} color={GuardColors.blue} /></View>
            <Text style={styles.statNumber}>{insideCount}</Text>
            <Text style={styles.statLabel}>{t('home.statInside')}</Text>
          </Pressy>
          <Pressy
            wrapStyle={styles.statWrap}
            accessibilityLabel={`${t('home.statWaiting')} ${pendingCount}`}
            onPress={() => open('/approvals')}
            style={[styles.stat, waiting && styles.statAlert]}
          >
            {waiting && <LinearGradient colors={GuardGradients.wait} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />}
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: waiting ? 'rgba(255,255,255,0.55)' : GuardColors.goldPale }]}><Ionicons name="time" size={24} color={GuardColors.goldDeep} /></View>
              {waiting && <LiveDot color={GuardSemantic.deny} size={8} />}
            </View>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>{waiting ? t('home.waitingNow') : t('home.statWaiting')}</Text>
          </Pressy>
        </Animated.View>
      </ScrollView>

      {/* Unified Enterprise Bottom Navigation Bar with Central Scanner FAB */}
      <BottomNavBar
        activeTab="home"
        onScan={() => open('/scan-verify')}
        onEmergency={() => open('/emergencies')}
        onLogs={() => open('/today-entries')}
        onProfile={() => open('/profile')}
        onHome={() => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GuardColors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 60, height: 56 },
  dutyCardWrap: { marginTop: 10, marginBottom: 4 },
  dutyCardWrapWithAlert: { marginTop: 12, marginBottom: 4 },
  emergencyCardWrap: { marginTop: 10, marginBottom: 6 },
  gateChipBad: { backgroundColor: GuardColors.redBg },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: GuardColors.black, fontFamily: GuardFonts.bold, fontSize: 24, fontWeight: '900' },
  headerCopy: { flex: 1 },
  hello: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  name: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -0.6 },

  chipRow: { marginTop: 14, marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  offlineChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GuardColors.redBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: GuardColors.red },
  offlineText: { color: GuardColors.red, fontFamily: GuardFonts.bold, fontSize: 15, lineHeight: 22, fontWeight: '800' },
  dutyChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingLeft: 10, paddingRight: 16, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  dutyText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 15, lineHeight: 22, fontWeight: '800' },
  readyBanner: { minHeight: 72, marginBottom: 14, paddingHorizontal: 18, borderRadius: 22, backgroundColor: GuardColors.greenBg, borderWidth: 2, borderColor: GuardColors.green, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stoppedBanner: { minHeight: 72, marginBottom: 14, paddingHorizontal: 18, borderRadius: 22, backgroundColor: GuardColors.redBg, borderWidth: 2, borderColor: GuardColors.red, flexDirection: 'row', alignItems: 'center', gap: 12 },
  readyText: { flex: 1, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 19 },

  visitor: { marginTop: 16, height: 126, minHeight: 126, borderRadius: 30, backgroundColor: '#161922', paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  visitorIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,184,0,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  visitorCopy: { flex: 1, justifyContent: 'center' },
  visitorTitle: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: 26, lineHeight: 32, fontWeight: '900', letterSpacing: -0.4 },
  visitorSub: { marginTop: 2, color: 'rgba(255,255,255,0.65)', fontFamily: GuardFonts.medium, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  visitorGo: { width: 48, height: 48, borderRadius: 24, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  stats: { marginTop: 16, flexDirection: 'row', gap: 14 },
  statWrap: { flex: 1 },
  stat: { minHeight: 148, borderRadius: 28, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, padding: 18, justifyContent: 'space-between' },
  statAlert: { backgroundColor: '#FFC933' },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statNumber: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 46, lineHeight: 54, fontWeight: '900', letterSpacing: -1.5 },
  statLabel: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
