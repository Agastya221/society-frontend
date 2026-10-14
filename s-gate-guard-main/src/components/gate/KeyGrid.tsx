import { GuardColors, GuardFonts, guardShadow } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SW } = Dimensions.get('window');
/** Digits first (flat numbers and most codes are mostly numbers), then A–Z: six keys per row. */
export const KEYS = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GAP = 8;
const SIDE = 20;
const KEY_WIDTH = (SW - SIDE * 2 - GAP * 5) / 6;

/** Big on-screen keys (digits + A–Z) so a guard never needs the phone keyboard. */
export function KeyGrid({
  onKey, disabled, keyHeight = 58,
}: {
  onKey: (char: string) => void;
  disabled?: boolean;
  keyHeight?: number;
}) {
  return (
    <View style={styles.keys}>
      {KEYS.map((c) => (
        <TouchableOpacity
          key={c}
          activeOpacity={0.6}
          testID={`key-${c}`}
          accessibilityRole="button"
          accessibilityLabel={c}
          disabled={disabled}
          style={[styles.key, { height: keyHeight }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onKey(c); }}
        >
          <Text style={styles.keyText}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  key: { width: KEY_WIDTH, borderRadius: 18, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', ...guardShadow('#0D0F14', 1) },
  keyText: { fontFamily: GuardFonts.bold, fontSize: 24, fontWeight: '800', color: GuardColors.t1 },
});
