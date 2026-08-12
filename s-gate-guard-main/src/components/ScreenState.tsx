import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GuardColors, GuardFonts } from '@/constants/theme';

export function ScreenLoading({ label = 'Loading…' }: { label?: string }) {
  return <View style={styles.wrap}><ActivityIndicator color={GuardColors.goldDeep} /><Text style={styles.body}>{label}</Text></View>;
}

export function ScreenEmpty({ icon = 'checkmark-done-circle-outline', title, message }: { icon?: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return <View style={styles.wrap}><View style={styles.icon}><Ionicons name={icon} size={32} color={GuardColors.t3} /></View><Text style={styles.title}>{title}</Text><Text style={styles.body}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: GuardColors.bg },
  icon: { width: 68, height: 68, borderRadius: 22, backgroundColor: GuardColors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: GuardFonts.bold, fontWeight: '800', fontSize: 19, color: GuardColors.t1, marginBottom: 6 },
  body: { fontFamily: GuardFonts.regular, fontSize: 14, lineHeight: 20, color: GuardColors.t3, textAlign: 'center', marginTop: 8 },
});
