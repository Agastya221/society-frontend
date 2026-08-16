import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string; // Allow overriding/adding classes
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <View 
      className={`bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 ${className}`}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}
