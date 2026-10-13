import { GiantButton } from '@/components/gate/GiantButton';
import { LanguageSwitch } from '@/components/gate/LanguageSwitch';
import { GuardBrandMark } from '@/components/GuardBrandMark';
import { GuardColors, GuardFonts, GuardRadius, GuardSemantic, GuardTouch, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
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

/**
 * Emergency needs a 2 second press so it can't be set off by accident.
 * A short tap only explains what to do.
 */
function EmergencyHold({ onTrigger }: { onTrigger: () => void }) {
  const t = useT();
  const progress = useRef(new Animated.Value(0)).current;
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.emergency')}
        accessibilityHint={t('home.emergencyHint')}
        delayLongPress={HOLD_MS}
        onPressIn={() => {
          progress.setValue(0);
          Animated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start();
        }}
        onPressOut={() => { progress.stopAnimation(); progress.setValue(0); }}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); showHint(); }}
        onLongPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setHint(false); onTrigger(); }}
        style={styles.emergency}
      >
        <Animated.View style={[styles.emergencyFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        <Ionicons name="warning" size={28} color={GuardSemantic.deny} />
        <View style={styles.emergencyCopy}>
          <Text style={styles.emergencyTitle}>{t('home.emergency')}</Text>
          <Text style={styles.emergencySub}>{t('home.emergencyHold')}</Text>
        </View>
      </Pressable>
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={GuardColors.bg} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <GuardBrandMark compact />
          <LanguageSwitch compact />
        </View>

        <Text style={styles.greeting} numberOfLines={2}>{t('home.greeting', { name: firstName, gate: user?.gate ?? 'Main Gate' })}</Text>

        <View style={styles.primary}>
          <GiantButton
            size="giant"
            tone="gold"
            icon="qr-code-outline"
            label={t('home.scan')}
            sub={t('home.scanSub')}
            onPress={() => open('/scan-verify')}
          />
          <GiantButton
            size="giant"
            tone="dark"
            icon="person-add-outline"
            label={t('home.newVisitor')}
            sub={t('home.newVisitorSub')}
            onPress={() => open('/new-entry')}
          />
        </View>

        {pendingCount > 0 && (
          <Pressable accessibilityRole="button" style={[styles.strip, styles.stripWait]} onPress={() => open('/approvals')}>
            <Ionicons name="time" size={30} color={GuardColors.black} />
            <View style={styles.stripCopy}>
              <Text style={styles.stripTitle}>{pendingCount === 1 ? t('home.waitingOne') : t('home.waiting', { n: pendingCount })}</Text>
              <Text style={styles.stripSub}>{t('home.waitingSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={26} color={GuardColors.black} />
          </Pressable>
        )}

        <Pressable accessibilityRole="button" style={[styles.strip, styles.stripInside]} onPress={() => open('/today-entries')}>
          <Ionicons name="people" size={30} color={GuardColors.t1} />
          <View style={styles.stripCopy}>
            <Text style={styles.stripTitle}>{t('home.inside', { n: insideCount })}</Text>
            <Text style={styles.stripSub}>{t('home.insideSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={26} color={GuardColors.t1} />
        </Pressable>

        <View style={styles.bottomRow}>
          <EmergencyHold onTrigger={() => open('/emergencies')} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('home.profile')} style={styles.profile} onPress={() => open('/profile')}>
            <Ionicons name="person-circle-outline" size={30} color={GuardColors.t1} />
            <Text style={styles.profileText}>{t('home.profile')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GuardColors.bg },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  topbar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { marginTop: 18, marginBottom: 18, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 22, lineHeight: 30, fontWeight: '800' },
  primary: { gap: 14 },
  strip: { marginTop: 14, minHeight: GuardTouch.button, borderRadius: GuardRadius.xl, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  stripWait: { backgroundColor: GuardSemantic.wait },
  stripInside: { backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border },
  stripCopy: { flex: 1 },
  stripTitle: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.button, fontWeight: '900' },
  stripSub: { marginTop: 2, color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min, fontWeight: '600' },
  bottomRow: { marginTop: 22, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emergencyCol: { flex: 1.3 },
  emergency: { minHeight: GuardTouch.button, borderRadius: GuardRadius.xl, borderWidth: 2, borderColor: GuardSemantic.deny, backgroundColor: GuardColors.redBg, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  emergencyFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(240,68,68,0.28)' },
  emergencyCopy: { flex: 1 },
  emergencyTitle: { color: GuardSemantic.deny, fontFamily: GuardFonts.bold, fontSize: GuardType.button, fontWeight: '900' },
  emergencySub: { color: '#9B5454', fontFamily: GuardFonts.medium, fontSize: GuardType.min, fontWeight: '600' },
  hint: { marginTop: 8, color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 21, fontWeight: '600' },
  profile: { flex: 1, minHeight: GuardTouch.button, borderRadius: GuardRadius.xl, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center', gap: 2 },
  profileText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, fontWeight: '800' },
});
