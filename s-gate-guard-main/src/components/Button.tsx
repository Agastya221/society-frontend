import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string; // Container class
  textClassName?: string; // Text class
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'flex-row items-center justify-center rounded-lg active:opacity-70';
  
  const variants = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-200',
    outline: 'border border-gray-300 bg-transparent',
    ghost: 'bg-transparent',
    destructive: 'bg-red-600',
  };

  const sizes = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const textBaseStyles = 'font-semibold text-center';
  
  const textVariants = {
    primary: 'text-white',
    secondary: 'text-gray-900',
    outline: 'text-gray-900',
    ghost: 'text-blue-600',
    destructive: 'text-white',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <Pressable
      className={twMerge(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled || loading ? 'opacity-50' : '',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? 'white' : 'gray'} className="mr-2" />
      ) : null}
      <Text
        className={twMerge(
          textBaseStyles,
          textVariants[variant],
          textSizes[size],
          textClassName
        )}
      >
        {title}
      </Text>
    </Pressable>
  );
}
