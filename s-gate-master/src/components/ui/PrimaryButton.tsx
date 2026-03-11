import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export function PrimaryButton({ 
  title, 
  variant = 'primary', 
  isLoading, 
  className = '',
  disabled,
  ...props 
}: PrimaryButtonProps) {
  let baseClass = 'py-3.5 px-4 rounded-xl items-center justify-center flex-row';
  let textClass = 'font-semibold text-[16px]';
  
  if (variant === 'primary') {
    baseClass += ' bg-indigo-600 active:bg-indigo-700';
    textClass += ' text-white';
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
      ) : null}
      <Text className={textClass}>{title}</Text>
    </TouchableOpacity>
  );
}
