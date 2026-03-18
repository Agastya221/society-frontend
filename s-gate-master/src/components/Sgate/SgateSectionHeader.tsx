import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface RightPill {
  text: string;
  color: string;
  bg: string;
}

interface SgateSectionHeaderProps {
  title: string;
  rightLabel?: string;
  rightPill?: RightPill;
  onRightPress?: () => void;
  style?: ViewStyle;
}

export function SgateSectionHeader({
  title,
  rightLabel,
  rightPill,
  onRightPress,
  style,
}: SgateSectionHeaderProps) {
  const hasRight = rightLabel || rightPill;

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>

      {hasRight && (
        <TouchableOpacity
          onPress={onRightPress}
          disabled={!onRightPress}
          activeOpacity={onRightPress ? 0.6 : 1}
        >
          {rightPill ? (
            <View style={[styles.pill, { backgroundColor: rightPill.bg }]}>
              <Text style={[styles.pillText, { color: rightPill.color }]}>
                {rightPill.text}
              </Text>
            </View>
          ) : (
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: SgateFonts.extrabold,
    color: SgateColors.t1,
  },
  rightLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
  },
});
