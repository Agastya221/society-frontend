import React from 'react';
import { Text as RNText, TextInput, TextInputProps, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, containerClassName, className, leftIcon, rightIcon, ...props }: InputProps) {
  return (
    <View className={twMerge('mb-4', containerClassName)}>
      {label && (
        <RNText className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </RNText>
      )}
      <View className="relative">
        {leftIcon && (
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            {leftIcon}
          </View>
        )}
        <TextInput
          className={twMerge(
            'bg-white border border-gray-300 rounded-lg px-4 py-3',
            'text-gray-900',
            'focus:border-blue-500',
            leftIcon ? 'pl-11' : '',
            rightIcon ? 'pr-11' : '',
            error ? 'border-red-500' : '',
            className
          )}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
        {rightIcon && (
          <View className="absolute right-3 top-0 bottom-0 justify-center z-10">
            {rightIcon}
          </View>
        )}
      </View>
      {error && <RNText className="text-xs text-red-500 mt-1">{error}</RNText>}
    </View>
  );
}
