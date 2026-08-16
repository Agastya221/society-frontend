import React, { ReactNode } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'outline' | 'danger';
  isLoading?: boolean;
  leftIcon?: ReactNode;
}

export function PrimaryButton({ 
  title, 
  variant = 'primary', 
  isLoading, 
  className = '',
  disabled,
  leftIcon,
  ...props 
}: PrimaryButtonProps) {
  let baseClass = 'py-3.5 px-4 rounded-xl items-center justify-center flex-row';
  let textClass = 'font-semibold text-[16px]';
  
  if (variant === 'primary') {
    baseClass += ' bg-yellow-400 active:bg-yellow-500';
    textClass += ' text-gray-900';
  } else if (variant === 'outline') {
    baseClass += ' bg-transparent border border-gray-300 dark:border-gray-700 active:bg-gray-100 dark:active:bg-gray-800';
    textClass += ' text-gray-900 dark:text-gray-100';
  } else if (variant === 'danger') {
    baseClass += ' bg-red-600 active:bg-red-700';
    textClass += ' text-white';
  }

  if (disabled || isLoading) {
    baseClass += ' opacity-60';
  }

  return (
    <TouchableOpacity 
      className={`${baseClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? '#000' : '#fff'} className="mr-2" />
      ) : leftIcon ? (
        <View className="mr-2 flex-row items-center justify-center">{leftIcon}</View>
      ) : null}
      <Text className={textClass}>{title}</Text>
    </TouchableOpacity>
  );
}
