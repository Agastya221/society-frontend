import { LanguageSwitch } from '@/components/gate/LanguageSwitch';
import { LiveDot } from '@/components/gate/LiveDot';
import { Pressy } from '@/components/gate/Pressy';
import { GuardColors, GuardFonts, GuardGradients, GuardSemantic, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOLD_MS = 2000;
const POLL_MS = 15000;

type Route = '/new-entry' | '/scan-verify' | '/today-entries' | '/approvals' | '/profile' | '/emergencies';

/** People inside right now: visitors checked in and staff who haven't checked out. */
function countInside(data: any): number {
  const entries: any[] = Array.isArray(data?.entries) ? data.entries : [];
  const staff: any[] = Array.isArray(data?.staffAttendances) ? data.staffAttendances : [];
  return entries.filter((e) => e?.status === 'CHECKED_IN').length + staff.filter((a) => !a?.checkOutTime).length;
}

/** Staggered rise-in so the screen settles instead of popping. */
const rise = (i: number) => FadeInDown.delay(i * 70).duration(420);

/**
 * Emergency needs a 2 second press so it can't be set off by accident.
 * A short tap only explains what to do.
 */
function EmergencyHold({ onTrigger }: { onTrigger: () => void }) {
  const t = useT();
  const progress = useRef(new RNAnimated.Value(0)).current;
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  const showHint = () => {
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 3500);
  };

  return (
    <View style={styles.emergencyCol}>
      <Pressy
        accessibilityLabel={t('home.emergency')}
        accessibilityHint={t('home.emergencyHint')}
        delayLongPress={HOLD_MS}
        scaleTo={0.98}
        onPressIn={() => {
          progress.setValue(0);
          RNAnimated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start();
        }}
        onPressOut={() => { progress.stopAnimation(); progress.setValue(0); }}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); showHint(); }}
        onLongPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setHint(false); onTrigger(); }}
        style={[styles.emergency, guardShadow('#B82424', 2)]}
      >
        <LinearGradient colors={GuardGradients.deny} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
        <RNAnimated.View style={[styles.emergencyFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        <View style={styles.emergencyIcon}><Ionicons name="warning" size={26} color="#FFFFFF" /></View>
        <View style={styles.emergencyCopy}>
          <Text style={styles.emergencyTitle}>{t('home.emergency')}</Text>
          <Text style={styles.emergencySub}>{t('home.emergencyHold')}</Text>
        </View>
      </Pressy>
      {hint && <Text style={styles.hint}>{t('home.emergencyHint')}</Text>}
    </View>
  );
}

export default function GuardDashboard() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [pendingCount, setPendingCount] = useState(0);
  const [insideCount, setInsideCount] = useState(0);
  const focused = useRef(true);

  const refresh = useCallback(() => {
    api.get('/api/v1/gate/entry-requests?status=PENDING').then((res) => {
      const payload = res.data?.data;
      const entries: unknown[] = Array.isArray(payload) ? payload : (payload?.entryRequests ?? payload?.entries ?? []);
      setPendingCount(Array.isArray(entries) ? entries.length : 0);
    }).catch(() => undefined);
    api.get('/api/v1/guard/today').then((res) => {
      setInsideCount(countInside(res.data?.data));
    }).catch(() => undefined);
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    refresh();
    return () => { focused.current = false; };
  }, [refresh]));

  // A visitor can arrive any time, so keep the counts fresh while this screen is showing.
  useEffect(() => {
    const timer = setInterval(() => { if (focused.current) refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const open = (route: Route) => router.push(route);

  const firstName = user?.name?.split(' ')[0] ?? 'Guard';
  const waiting = pendingCount > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={GuardGradients.glow} style={styles.glow} pointerEvents="none" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={rise(0)} style={styles.header}>
          <LinearGradient colors={GuardGradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View style={styles.headerCopy}>
            <Text style={styles.hello}>{t('home.hello')}</Text>
            <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
          </View>
          <LanguageSwitch compact />
        </Animated.View>

        <Animated.View entering={rise(1)} style={styles.dutyChip}>
          <LiveDot color={GuardColors.green} size={8} />
          <Text style={styles.dutyText} numberOfLines={1}>{t('home.onDutyAt', { gate: user?.gate ?? 'Main Gate' })}</Text>
        </Animated.View>

        {/* Hero: scan */}
        <Animated.View entering={rise(2)}>
          <Pressy accessibilityLabel={t('home.scan')} onPress={() => open('/scan-verify')} style={[styles.hero, guardShadow('#FFB300', 3)]}>
            <LinearGradient colors={GuardGradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 34 }]} />
            <Ionicons name="qr-code" size={210} color="rgba(255,255,255,0.22)" style={styles.heroWatermark} />
            <View style={styles.heroIcon}><Ionicons name="qr-code-outline" size={34} color={GuardColors.black} /></View>
            <View style={styles.heroBottom}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{t('home.scan')}</Text>
                <Text style={styles.heroSub}>{t('home.scanSub')}</Text>
              </View>
              <View style={styles.heroGo}><Ionicons name="arrow-forward" size={26} color={GuardColors.gold} /></View>
            </View>
          </Pressy>
        </Animated.View>

        {/* New visitor */}
        <Animated.View entering={rise(3)}>
          <Pressy accessibilityLabel={t('home.newVisitor')} onPress={() => open('/new-entry')} style={[styles.visitor, guardShadow('#0D0F14', 3)]}>
            <LinearGradient colors={GuardGradients.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
            <View style={styles.visitorIcon}><Ionicons name="person-add" size={28} color={GuardColors.gold} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.visitorTitle}>{t('home.newVisitor')}</Text>
              <Text style={styles.visitorSub}>{t('home.newVisitorSub')}</Text>
            </View>
            <View style={styles.visitorGo}><Ionicons name="arrow-forward" size={22} color={GuardColors.black} /></View>
          </Pressy>
        </Animated.View>

        {/* Live numbers */}
        <Animated.View entering={rise(4)} style={styles.stats}>
          <Pressy
            wrapStyle={styles.statWrap}
            accessibilityLabel={`${t('home.statInside')} ${insideCount}`}
            onPress={() => open('/today-entries')}
            style={[styles.stat, guardShadow('#0D0F14', 1)]}
          >
            <View style={[styles.statIcon, { backgroundColor: GuardColors.blueBg }]}><Ionicons name="people" size={24} color={GuardColors.blue} /></View>
            <Text style={styles.statNumber}>{insideCount}</Text>
            <Text style={styles.statLabel}>{t('home.statInside')}</Text>
          </Pressy>
          <Pressy
            wrapStyle={styles.statWrap}
            accessibilityLabel={`${t('home.statWaiting')} ${pendingCount}`}
            onPress={() => open('/approvals')}
            style={[styles.stat, waiting && styles.statAlert, guardShadow(waiting ? '#FFB300' : '#0D0F14', waiting ? 2 : 1)]}
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

        {/* Dock */}
        <Animated.View entering={rise(5)} style={styles.dock}>
          <EmergencyHold onTrigger={() => open('/emergencies')} />
          <Pressy wrapStyle={styles.profileWrap} accessibilityLabel={t('home.profile')} onPress={() => open('/profile')} style={[styles.profile, guardShadow('#0D0F14', 1)]}>
            <Ionicons name="person-circle" size={30} color={GuardColors.t1} />
            <Text style={styles.profileText}>{t('home.profile')}</Text>
          </Pressy>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GuardColors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: GuardColors.black, fontFamily: GuardFonts.bold, fontSize: 24, fontWeight: '900' },
  headerCopy: { flex: 1 },
  hello: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  name: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 30, lineHeight: 38, fontWeight: '900', letterSpacing: -0.6 },

  dutyChip: { marginTop: 14, marginBottom: 20, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingLeft: 10, paddingRight: 16, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  dutyText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 15, lineHeight: 22, fontWeight: '800' },

  hero: { height: 216, borderRadius: 34, backgroundColor: '#FFB800', padding: 22, overflow: 'hidden', justifyContent: 'space-between' },
  heroWatermark: { position: 'absolute', right: -34, top: -26, transform: [{ rotate: '-12deg' }] },
  heroIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end' },
  heroCopy: { flex: 1 },
  heroTitle: { color: GuardColors.black, fontFamily: GuardFonts.bold, fontSize: 32, lineHeight: 42, fontWeight: '900', letterSpacing: -0.6 },
  heroSub: { marginTop: 2, color: 'rgba(60,40,0,0.78)', fontFamily: GuardFonts.medium, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  heroGo: { width: 56, height: 56, borderRadius: 28, backgroundColor: GuardColors.black, alignItems: 'center', justifyContent: 'center' },

  visitor: { marginTop: 14, minHeight: 124, borderRadius: 30, backgroundColor: '#161922', paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  visitorIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,184,0,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  visitorTitle: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: 26, lineHeight: 34, fontWeight: '900', letterSpacing: -0.4 },
  visitorSub: { marginTop: 2, color: 'rgba(255,255,255,0.65)', fontFamily: GuardFonts.medium, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  visitorGo: { width: 48, height: 48, borderRadius: 24, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  stats: { marginTop: 14, flexDirection: 'row', gap: 14 },
  statWrap: { flex: 1 },
  stat: { minHeight: 148, borderRadius: 28, backgroundColor: GuardColors.card, padding: 18, justifyContent: 'space-between' },
  statAlert: { backgroundColor: '#FFC933' },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statNumber: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 46, lineHeight: 54, fontWeight: '900', letterSpacing: -1.5 },
  statLabel: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 16, lineHeight: 22, fontWeight: '700' },

  dock: { marginTop: 20, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  emergencyCol: { flex: 1.4 },
  emergency: { minHeight: 76, borderRadius: 26, backgroundColor: '#E04545', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  emergencyFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.32)' },
  emergencyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  emergencyCopy: { flex: 1 },
  emergencyTitle: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: 20, lineHeight: 26, fontWeight: '900' },
  emergencySub: { color: 'rgba(255,255,255,0.85)', fontFamily: GuardFonts.medium, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  hint: { marginTop: 8, color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  profileWrap: { flex: 1 },
  profile: { minHeight: 76, borderRadius: 26, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', gap: 2 },
  profileText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 15, lineHeight: 20, fontWeight: '800' },
});
