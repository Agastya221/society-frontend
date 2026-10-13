import { GuardColors, GuardFonts, GuardRadius, GuardSemantic, GuardTouch, GuardType } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

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

const TONES: Record<GiantTone, { bg: string; fg: string; sub: string; iconBg: string; border?: string }> = {
  gold: { bg: GuardColors.gold, fg: GuardColors.black, sub: '#5E4900', iconBg: 'rgba(255,255,255,0.45)' },
  dark: { bg: GuardColors.ink, fg: '#FFFFFF', sub: '#C4C7D0', iconBg: '#2B2F3A' },
  allow: { bg: GuardSemantic.allowBg, fg: '#FFFFFF', sub: '#D6F5E8', iconBg: 'rgba(255,255,255,0.22)' },
  deny: { bg: GuardSemantic.denyBg, fg: '#FFFFFF', sub: '#FFE0E0', iconBg: 'rgba(255,255,255,0.22)' },
  light: { bg: GuardColors.card, fg: GuardColors.t1, sub: GuardColors.t2, iconBg: GuardColors.surface, border: GuardColors.border },
};

/**
 * The one button style for the guard app: big, icon + word, haptic on press.
 * Ignores presses while loading/disabled so a double tap sends one request.
 */
export function GiantButton({
  label, icon, onPress, sub, tone = 'gold', size = 'large', loading, disabled, style, accessibilityLabel,
}: GiantButtonProps) {
  const t = TONES[tone];
  const height = size === 'giant' ? GuardTouch.giant : GuardTouch.button;
  const inactive = !!(loading || disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        { minHeight: height, backgroundColor: t.bg, borderColor: t.border ?? t.bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <>
          <View style={[styles.iconWrap, { backgroundColor: t.iconBg, width: size === 'giant' ? 64 : 48, height: size === 'giant' ? 64 : 48 }]}>
            <Ionicons name={icon} size={size === 'giant' ? 36 : 28} color={t.fg} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: t.fg, fontSize: size === 'giant' ? 28 : GuardType.button }]} numberOfLines={2}>{label}</Text>
            {!!sub && <Text style={[styles.sub, { color: t.sub }]} numberOfLines={2}>{sub}</Text>}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: '100%', flexDirection: 'row', alignItems: 'center', borderRadius: GuardRadius.xl, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 12 },
  iconWrap: { borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 16 },
  label: { fontFamily: GuardFonts.bold, fontWeight: '900', letterSpacing: -0.2 },
  sub: { marginTop: 2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, fontWeight: '600' },
});
