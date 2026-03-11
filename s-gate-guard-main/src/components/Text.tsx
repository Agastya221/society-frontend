import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'title' | 'subtitle' | 'caption' | 'link';
  className?: string;
}

export function Text({ variant = 'default', className, style, ...props }: ThemedTextProps) {
  const baseStyles = 'text-gray-900';

  const variants = {
    default: 'text-base',
    title: 'text-2xl font-bold',
    subtitle: 'text-xl font-semibold',
    caption: 'text-sm text-gray-500',
    link: 'text-base text-blue-600 underline',
  };

  return (
    <RNText
      className={twMerge(baseStyles, variants[variant], className)}
      style={style}
      {...props}
    />
  );
}
