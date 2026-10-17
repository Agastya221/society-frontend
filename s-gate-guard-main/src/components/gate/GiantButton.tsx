import { GuardColors, GuardFonts, GuardGradients, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Pressy } from './Pressy';

export type GiantTone = 'gold' | 'dark' | 'allow' | 'deny' | 'light';

interface GiantButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Smaller line under the label. */
  sub?: string;
  tone?: GiantTone;
  /** 'giant' = home-screen size, 'large' = normal primary button. */
  size?: 'giant' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

type Palette = { fg: string; sub: string; iconBg: string; chevronBg: string; glow: string; colors?: readonly [string, string, ...string[]] };

const TONES: Record<GiantTone, Palette> = {
  gold: { colors: GuardGradients.gold, fg: GuardColors.black, sub: 'rgba(60,40,0,0.75)', iconBg: 'rgba(255,255,255,0.45)', chevronBg: GuardColors.black, glow: '#FFB300' },
  dark: { colors: GuardGradients.dark, fg: '#FFFFFF', sub: 'rgba(255,255,255,0.65)', iconBg: 'rgba(255,184,0,0.16)', chevronBg: GuardColors.gold, glow: '#0D0F14' },
  allow: { colors: GuardGradients.allow, fg: '#FFFFFF', sub: 'rgba(255,255,255,0.85)', iconBg: 'rgba(255,255,255,0.22)', chevronBg: 'rgba(255,255,255,0.25)', glow: '#08915F' },
  deny: { colors: GuardGradients.deny, fg: '#FFFFFF', sub: 'rgba(255,255,255,0.85)', iconBg: 'rgba(255,255,255,0.22)', chevronBg: 'rgba(255,255,255,0.25)', glow: '#B82424' },
  light: { fg: GuardColors.t1, sub: GuardColors.t2, iconBg: GuardColors.surface, chevronBg: GuardColors.surface, glow: '#0D0F14' },
};

/**
 * The one button style for the guard app: big, icon + word, soft gradient, haptic on press.
 * Ignores presses while loading/disabled so a double tap sends one request.
 */
export function GiantButton({
  label, icon, onPress, sub, tone = 'gold', size = 'large', loading, disabled, style, accessibilityLabel,
}: GiantButtonProps) {
  const t = TONES[tone];
  const giant = size === 'giant';
  const inactive = !!(loading || disabled);
  const minHeight = giant ? GuardTouch.giant : GuardTouch.button;

  const body = loading ? (
    <ActivityIndicator color={t.fg} />
  ) : (
    <>
      <View style={[styles.iconWrap, { backgroundColor: t.iconBg, width: giant ? 68 : 50, height: giant ? 68 : 50, borderRadius: giant ? 24 : 18 }]}>
        <Ionicons name={icon} size={giant ? 38 : 28} color={tone === 'dark' ? GuardColors.gold : t.fg} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: t.fg, fontSize: giant ? 28 : GuardType.button, lineHeight: giant ? 38 : 28 }]} numberOfLines={2}>{label}</Text>
        {!!sub && <Text style={[styles.sub, { color: t.sub }]} numberOfLines={2}>{sub}</Text>}
      </View>
      {giant && (
        <View style={[styles.chevron, { backgroundColor: t.chevronBg }]}>
          <Ionicons name="arrow-forward" size={22} color={tone === 'gold' ? GuardColors.gold : tone === 'dark' ? GuardColors.black : t.fg} />
        </View>
      )}
    </>
  );

  // Android only draws the elevation shadow of a view that has a background colour.
  const frame = [
    styles.base,
    { minHeight, borderRadius: giant ? 32 : 26, backgroundColor: t.colors ? t.colors[1] : GuardColors.card },
    tone === 'light' ? styles.light : guardShadow(t.glow, giant ? 3 : 2),
  ];

  return (
    <Pressy
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      wrapStyle={[styles.wrap, disabled && { opacity: 0.45 }]}
      style={[frame, style]}
    >
      {t.colors ? (
        <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: giant ? 32 : 26 }]} />
      ) : null}
      {body}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  base: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  light: { backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 16 },
  label: { fontFamily: GuardFonts.bold, fontWeight: '900', letterSpacing: -0.3 },
  sub: { marginTop: 2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
  chevron: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
