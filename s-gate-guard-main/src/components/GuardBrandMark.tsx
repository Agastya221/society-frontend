import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GuardColors, GuardFonts } from '@/constants/theme';

export function GuardBrandMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 62;
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: compact ? 13 : 21 }]}>
        <Ionicons name="shield-checkmark" size={compact ? 22 : 34} color={GuardColors.black} />
      </View>
      <View>
        <Text style={[styles.brand, compact && styles.brandCompact]}>S-GATE</Text>
        <Text style={styles.product}>SECURITY</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' },
  brand: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontWeight: '900', fontSize: 25, letterSpacing: -0.8 },
  brandCompact: { fontSize: 20 },
  product: { color: GuardColors.t3, fontFamily: GuardFonts.semibold, fontWeight: '700', fontSize: 9, letterSpacing: 2.2, marginTop: 1 },
});
