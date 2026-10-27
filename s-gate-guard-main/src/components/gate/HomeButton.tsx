import { GuardColors, GuardFonts, GuardRadius, GuardTouch, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Sticky "Home" bar for the bottom of every screen — a guard can always get out. */
export function HomeButton({ onPress }: { onPress?: () => void }) {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('common.home')}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); (onPress ?? (() => router.replace('/')))(); }}
        style={styles.btn}
      >
        <Ionicons name="home-outline" size={18} color="#0F172A" />
        <Text style={styles.text}>{t('common.home')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontFamily: GuardFonts.bold,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});
