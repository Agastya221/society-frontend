import React, { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';
import { SgateColors, SgateFonts, SgateLayout, SgateRadius } from '@/constants/Sgate-theme';

interface PrimaryButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
}

export function PrimaryButton({ 
  title, 
  variant = 'primary', 
  isLoading,
  loading,
  disabled,
  leftIcon,
  style,
  ...props 
}: PrimaryButtonProps) {
  const busy = Boolean(isLoading || loading);
  const isDisabled = Boolean(disabled || busy);
  const variantStyle = buttonVariants[variant];
  const textStyle = textVariants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(13,15,20,0.10)' }}
      style={[
        styles.button,
        variantStyle,
        isDisabled && styles.disabled,
        typeof style === 'function' ? undefined : style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      <View style={styles.content}>
        {busy ? (
          <ActivityIndicator color={variant === 'danger' ? '#FFFFFF' : SgateColors.t1} />
        ) : leftIcon ? (
          <View style={styles.icon}>{leftIcon}</View>
        ) : null}
        <Text style={[styles.text, textStyle]} numberOfLines={1}>{title}</Text>
      </View>
    </Pressable>
  );
}

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: SgateColors.gold },
  secondary: { backgroundColor: SgateColors.surface },
  outline: { backgroundColor: SgateColors.card, borderWidth: 1, borderColor: SgateColors.border },
  danger: { backgroundColor: SgateColors.red },
  ghost: { backgroundColor: 'transparent' },
});

const textVariants = StyleSheet.create({
  primary: { color: SgateColors.t1 },
  secondary: { color: SgateColors.t1 },
  outline: { color: SgateColors.t1 },
  danger: { color: '#FFFFFF' },
  ghost: { color: SgateColors.t2 },
});

const styles = StyleSheet.create({
  button: {
    minHeight: SgateLayout.controlHeight,
    paddingHorizontal: SgateLayout.compactGutter,
    borderRadius: SgateRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { fontSize: 15, fontFamily: SgateFonts.bold },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  disabled: { opacity: 1, backgroundColor: SgateColors.surface },
});
