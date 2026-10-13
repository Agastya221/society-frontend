import { GuardColors, GuardFonts, GuardRadius, GuardTouch, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Sticky "Home" bar for the bottom of every screen — a guard can always get out. */
export function HomeButton({ onPress }: { onPress?: () => void }) {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.home')}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); (onPress ?? (() => router.replace('/')))(); }}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="home-outline" size={26} color={GuardColors.t1} />
        <Text style={styles.text}>{t('common.home')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: GuardColors.bg, borderTopWidth: 1, borderTopColor: GuardColors.border },
  btn: { minHeight: GuardTouch.min + 4, borderRadius: GuardRadius.xl, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  text: { fontFamily: GuardFonts.bold, fontSize: GuardType.button, fontWeight: '800', color: GuardColors.t1 },
});
