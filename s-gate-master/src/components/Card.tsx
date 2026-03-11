import clsx from 'clsx';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
    className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <View
            className={clsx("bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800", className)}
            {...props}
        >
            {children}
        </View>
    );
}
