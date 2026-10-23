import { GuardColors, GuardFonts, GuardTouch, GuardType } from '@/constants/theme';
import { useLanguageStore } from '@/i18n';
import type { Lang } from '@/i18n/types';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'hi', label: 'हिंदी' },
  { lang: 'en', label: 'English' },
];

/** Two-button language picker. `compact` is the small version for top bars. */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {OPTIONS.map((o) => {
        const active = o.lang === lang;
        return (
          <Pressable
            key={o.lang}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => { if (!active) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLang(o.lang); } }}
            style={[styles.btn, compact && styles.btnCompact, active && styles.btnActive]}
          >
            <Text style={[styles.text, compact && styles.textCompact, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  rowCompact: { gap: 0, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  btn: { flex: 1, minHeight: GuardTouch.min, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border },
  btnCompact: { flex: 0, minHeight: 40, minWidth: 64, paddingHorizontal: 12, borderRadius: 999, borderWidth: 0, backgroundColor: 'transparent' },
  btnActive: { backgroundColor: GuardColors.gold, borderColor: GuardColors.gold },
  text: { fontFamily: GuardFonts.bold, fontSize: GuardType.button, fontWeight: '800', color: GuardColors.t2 },
  textCompact: { fontSize: GuardType.min },
  textActive: { color: GuardColors.black },
});
