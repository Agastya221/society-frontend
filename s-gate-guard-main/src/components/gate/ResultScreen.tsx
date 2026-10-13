import { GuardFonts, GuardSemantic, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
}

const BG: Record<ResultKind, string> = { allow: GuardSemantic.allowBg, deny: GuardSemantic.denyBg, wait: '#B98600' };
const ICON: Record<ResultKind, keyof typeof Ionicons.glyphMap> = { allow: 'checkmark-circle', deny: 'close-circle', wait: 'time' };

/**
 * Full-screen verdict: the colour alone tells the guard what to do
 * (green = let in, red = stop), the text only confirms it.
 */
export function ResultScreen({
  kind, title, reason, name, flat, typeLabel, photoUrl, primaryLabel, onPrimary, secondaryLabel, onSecondary,
  autoReturnSeconds, onAutoReturn, busy, children,
}: ResultScreenProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [left, setLeft] = useState(autoReturnSeconds ?? 0);
  const returned = useRef(false);

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

  return (
    <View style={[styles.root, { backgroundColor: BG[kind], paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG[kind]} />
      <View style={styles.center}>
        <Ionicons name={ICON[kind]} size={132} color="#FFFFFF" />
        <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2}>{title}</Text>
        {!!reason && <Text style={styles.reason}>{reason}</Text>}
        {children}

        {(!!name || !!flat || !!photoUrl) && (
          <View style={styles.person}>
            {!!photoUrl && <Image source={{ uri: photoUrl }} style={styles.photo} />}
            {!!name && <Text style={styles.name} numberOfLines={2}>{name}</Text>}
            {!!flat && <Text style={styles.flat}>{flat}</Text>}
            {!!typeLabel && <View style={styles.pill}><Text style={styles.pillText}>{typeLabel}</Text></View>}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          disabled={busy}
          onPress={onPrimary}
          style={[styles.primary, busy && { opacity: 0.6 }]}
        >
          <Text style={[styles.primaryText, { color: BG[kind] }]}>{primaryLabel}</Text>
        </TouchableOpacity>
        {!!secondaryLabel && !!onSecondary && (
          <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" disabled={busy} onPress={onSecondary} style={[styles.secondary, busy && { opacity: 0.6 }]}>
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
        {!!autoReturnSeconds && left > 0 && <Text style={styles.countdown}>{t('common.returningIn', { n: left })}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 12, color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: GuardType.result, lineHeight: 52, fontWeight: '900', textAlign: 'center' },
  reason: { marginTop: 10, color: 'rgba(255,255,255,0.92)', fontFamily: GuardFonts.medium, fontSize: GuardType.body + 2, lineHeight: 26, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
  person: { marginTop: 28, alignItems: 'center', gap: 6 },
  photo: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#FFFFFF', marginBottom: 6 },
  name: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: 32, lineHeight: 38, fontWeight: '900', textAlign: 'center' },
  flat: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: 26, fontWeight: '800' },
  pill: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99 },
  pillText: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: GuardType.body, fontWeight: '800' },
  actions: { gap: 12 },
  primary: { minHeight: 76, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: GuardFonts.bold, fontSize: 24, fontWeight: '900' },
  secondary: { minHeight: 60, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#FFFFFF', fontFamily: GuardFonts.bold, fontSize: GuardType.button, fontWeight: '800' },
  countdown: { textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, fontWeight: '600' },
});
