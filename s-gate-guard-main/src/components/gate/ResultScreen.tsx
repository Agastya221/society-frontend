import { GuardColors, GuardFonts, GuardGradients, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ResultKind = 'allow' | 'deny' | 'wait';

interface ResultScreenProps {
  kind: ResultKind;
  /** One short verdict line, e.g. "अंदर जाने दें". */
  title: string;
  /** One short reason line (server message for denials). */
  reason?: string;
  /** Person / pass details, shown big. */
  name?: string;
  /** Full text, e.g. "फ्लैट A-101". */
  flat?: string;
  /** e.g. "Guest", "Maid" — shown as a pill. */
  typeLabel?: string;
  photoUrl?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Goes back Home on its own after this many seconds (shows a countdown). */
  autoReturnSeconds?: number;
  onAutoReturn?: () => void;
  /** Disables the buttons while a request is in flight (double-tap guard). */
  busy?: boolean;
  /** Extra lines under the reason (e.g. why each pass was refused). */
  children?: React.ReactNode;
  /** Replaces the badge icon (the default is a tick, cross or clock to match `kind`). */
  icon?: keyof typeof Ionicons.glyphMap;
}

const GRADIENT: Record<ResultKind, readonly [string, string, ...string[]]> = {
  allow: GuardGradients.allow,
  deny: GuardGradients.deny,
  wait: ['#E0A100', '#C98A00', '#A87000'],
};
const ACCENT: Record<ResultKind, string> = { allow: '#0A9A62', deny: '#C42B2B', wait: '#A87000' };
const SOFT: Record<ResultKind, string> = { allow: '#E5FBF3', deny: '#FFF0F0', wait: '#FFF3CC' };
const ICON: Record<ResultKind, keyof typeof Ionicons.glyphMap> = { allow: 'checkmark', deny: 'close', wait: 'time' };

/**
 * Full-screen verdict: the colour alone tells the guard what to do
 * (green = let in, red = stop), the text only confirms it.
 */
export function ResultScreen({
  kind, title, reason, name, flat, typeLabel, photoUrl, primaryLabel, onPrimary, secondaryLabel, onSecondary,
  autoReturnSeconds, onAutoReturn, busy, children, icon,
}: ResultScreenProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [left, setLeft] = useState(autoReturnSeconds ?? 0);
  const returned = useRef(false);

  // The badge pops in, the rings breathe out behind it, the countdown bar drains.
  const pop = useSharedValue(0.4);
  const rings = useSharedValue(0);
  const bar = useSharedValue(1);
  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 140 });
    rings.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [pop, rings]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: Math.min(1, pop.value * 1.4) }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: rings.value, transform: [{ scale: 0.7 + rings.value * 0.3 }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  // One long buzz = allow, three short = stop.
  useEffect(() => {
    if (kind === 'allow') { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); return; }
    if (kind !== 'deny') return;
    const timers = [0, 160, 320].map((ms) => setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), ms));
    return () => timers.forEach(clearTimeout);
  }, [kind]);

  useEffect(() => {
    if (!autoReturnSeconds || !onAutoReturn) return;
    returned.current = false;
    setLeft(autoReturnSeconds);
    bar.value = 1;
    bar.value = withTiming(0, { duration: autoReturnSeconds * 1000, easing: Easing.linear });
    const timer = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          clearInterval(timer);
          if (!returned.current) { returned.current = true; onAutoReturn(); }
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReturnSeconds]);

  const hasPerson = !!name || !!flat || !!photoUrl;
  const accent = ACCENT[kind];

  return (
    <LinearGradient
      colors={GRADIENT[kind]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.center}>
        <View style={styles.hero}>
          <Animated.View style={[styles.ring, styles.ringOuter, ringStyle]} />
          <Animated.View style={[styles.ring, styles.ringInner, ringStyle]} />
          <Animated.View style={[styles.badge, guardShadow('#000000', 3), badge]}>
            <Ionicons name={icon ?? ICON[kind]} size={78} color={accent} />
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInDown.delay(120).duration(360)} style={styles.title} adjustsFontSizeToFit numberOfLines={2}>{title}</Animated.Text>
        {!!reason && (
          <Animated.View entering={FadeInDown.delay(200).duration(360)} style={styles.reasonPill}>
            <Text style={styles.reason}>{reason}</Text>
          </Animated.View>
        )}
        {children}

        {hasPerson && (
          <Animated.View entering={FadeInDown.delay(280).duration(420)} style={[styles.card, guardShadow('#000000', 3)]}>
            {!!photoUrl && <Image source={{ uri: photoUrl }} style={[styles.photo, { borderColor: accent }]} />}
            <View style={styles.cardCopy}>
              {!!name && <Text style={styles.name} numberOfLines={2}>{name}</Text>}
              <View style={styles.cardRow}>
                {!!flat && (
                  <View style={styles.flatRow}>
                    <Ionicons name="home" size={18} color={GuardColors.t2} />
                    <Text style={styles.flat}>{flat}</Text>
                  </View>
                )}
                {!!typeLabel && (
                  <View style={[styles.pill, { backgroundColor: SOFT[kind] }]}>
                    <Text style={[styles.pillText, { color: accent }]}>{typeLabel}</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.88}
          accessibilityRole="button"
          disabled={busy}
          onPress={onPrimary}
          style={[styles.primary, guardShadow('#000000', 2), busy && { opacity: 0.6 }]}
        >
          <Text style={[styles.primaryText, { color: accent }]}>{primaryLabel}</Text>
        </TouchableOpacity>
        {!!secondaryLabel && !!onSecondary && (
          <TouchableOpacity activeOpacity={0.88} accessibilityRole="button" disabled={busy} onPress={onSecondary} style={[styles.secondary, busy && { opacity: 0.6 }]}>
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
        {!!autoReturnSeconds && left > 0 && (
          <View style={styles.countdownWrap}>
            <View style={styles.track}><Animated.View style={[styles.fill, barStyle]} /></View>
            <Text style={styles.countdown}>{t('common.returningIn', { n: left })}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { width: 300, height: 220, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  ringOuter: { width: 300, height: 300 },
  ringInner: { width: 218, height: 218, backgroundColor: 'rgba(255,255,255,0.16)' },
  badge: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: GuardType.result, lineHeight: 56, fontWeight: '900', textAlign: 'center', letterSpacing: -0.8 },
  reasonPill: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, maxWidth: '100%' },
  reason: { color: '#FFFFFF', fontFamily: GuardFonts.medium, fontSize: GuardType.body, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  card: { marginTop: 24, alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  photo: { width: 72, height: 72, borderRadius: 36, borderWidth: 3 },
  cardCopy: { flex: 1, gap: 8 },
  name: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: -0.4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  flatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flat: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  pillText: { fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '800' },
  actions: { gap: 12 },
  primary: { minHeight: 76, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: GuardFonts.bold, fontSize: 24, lineHeight: 32, fontWeight: '900' },
  secondary: { minHeight: 60, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },
  countdownWrap: { gap: 8, paddingTop: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  countdown: { textAlign: 'center', color: 'rgba(255,255,255,0.88)', fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '600' },
});
