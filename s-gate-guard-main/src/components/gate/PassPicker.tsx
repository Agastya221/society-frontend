import type { ListedPass, Match } from '@/components/PreApprovedPass';
import { GuardFonts, GuardGradients, GuardType } from '@/constants/theme';
import { useT } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiantButton } from './GiantButton';

/** Several pre-approved passes are valid: the guard asks the visitor and taps the right one. */
export function PassPicker({
  matches, windows, busy, onAllow, onCancel, cancelLabel,
}: {
  matches: Match[];
  windows: Record<string, ListedPass>;
  busy: boolean;
  onAllow: (m: Match) => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={GuardGradients.allow}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}
    >
      <Ionicons name="checkmark-circle" size={96} color="#FFFFFF" style={{ alignSelf: 'center' }} />
      <Text style={styles.title}>{t('scan.validPasses', { n: matches.length })}</Text>
      <Text style={styles.sub}>{t('scan.pickRight')}</Text>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {matches.map((m) => {
          const visitor = m.entryId ? windows[m.entryId]?.visitorName : null;
          const flat = m.isPrivate ? t('scan.privateFlat') : m.flatNumber === 'OFFICE' ? t('scan.office') : m.flatNumber;
          const sub = [visitor, flat ? `${t('common.flat')} ${flat}` : null].filter(Boolean).join(' · ');
          return (
            <GiantButton
              key={m.entryId ?? m.displayLabel}
              label={m.displayLabel ?? t('scan.validPass')}
              sub={sub || undefined}
              icon={m.type === 'CAB' ? 'car' : m.type === 'HELP' ? 'construct' : 'cube'}
              tone="light"
              disabled={busy}
              onPress={() => onAllow(m)}
            />
          );
        })}
      </ScrollView>
      <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>{cancelLabel ?? t('common.cancel')}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  title: { marginTop: 8, textAlign: 'center', color: '#fff', fontFamily: GuardFonts.bold, fontSize: 34, lineHeight: 44, fontWeight: '900' },
  sub: { marginTop: 6, marginBottom: 16, textAlign: 'center', color: 'rgba(255,255,255,0.92)', fontFamily: GuardFonts.medium, fontSize: GuardType.body, lineHeight: 26, fontWeight: '600' },
  list: { gap: 12, paddingBottom: 12 },
  cancel: { minHeight: 60, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { color: '#fff', fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },
});
