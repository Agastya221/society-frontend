import { Feather } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';

const AnimatedView = Animated.createAnimatedComponent(View);

interface SgateInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
}

export function SgateInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  error,
  keyboardType,
  secureTextEntry,
  ...rest
}: SgateInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
    rest.onFocus?.(undefined as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
    rest.onBlur?.(undefined as any);
  };

  const borderAnimStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? SgateColors.red
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [SgateColors.border, SgateColors.gold]
        );
    return { borderColor };
  });

  const iconColor = error ? SgateColors.red : isFocused ? SgateColors.gold : SgateColors.t3;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      )}
      <AnimatedView
        style={[
          styles.inputContainer,
          borderAnimStyle,
          error ? styles.errorBorder : null,
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={16}
            color={iconColor}
            style={styles.iconLeft}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={SgateColors.t4}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
          ]}
          {...rest}
        />
      </AnimatedView>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    ...SgateTypography.microLabel,
    color: SgateColors.t3,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.surface,
    borderWidth: 1.5,
    borderColor: SgateColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  iconLeft: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t1,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  errorBorder: {
    borderColor: SgateColors.red,
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.red,
  },
});
