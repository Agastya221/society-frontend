import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

type Status = 'active' | 'pending' | 'approved' | 'denied' | 'expired';
type Size = 'sm' | 'md';

interface SgateStatusPillProps {
  status: Status;
  size?: Size;
}

const STATUS_COLORS: Record<Status, { bg: string; text: string; label: string }> = {
  active:   { bg: SgateColors.greenBg,  text: SgateColors.green,    label: 'Active' },
  approved: { bg: SgateColors.greenBg,  text: SgateColors.green,    label: 'Approved' },
  pending:  { bg: SgateColors.goldPale, text: SgateColors.goldDeep, label: 'Pending' },
  denied:   { bg: SgateColors.redBg,    text: SgateColors.red,      label: 'Denied' },
  expired:  { bg: SgateColors.surface,  text: SgateColors.t3,       label: 'Expired' },
};

const SIZE_STYLES: Record<Size, { fontSize: number; paddingH: number; paddingV: number }> = {
  sm: { fontSize: 10, paddingH: 8,  paddingV: 2 },
  md: { fontSize: 11, paddingH: 10, paddingV: 3 },
};

export function SgateStatusPill({ status, size = 'md' }: SgateStatusPillProps) {
  const { bg, text, label } = STATUS_COLORS[status];
  const s = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: text, fontSize: s.fontSize },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: SgateFonts.semibold,
  },
});
