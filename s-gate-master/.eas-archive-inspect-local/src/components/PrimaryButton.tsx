import clsx from 'clsx';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
    title: string;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

export function PrimaryButton({ title, loading, className, variant = 'primary', disabled, ...props }: PrimaryButtonProps) {
    let bgClass = "bg-indigo-600";
    let textClass = "text-white";
    let borderClass = "";

    if (variant === 'secondary') {
        bgClass = "bg-zinc-200 dark:bg-zinc-800";
        textClass = "text-zinc-900 dark:text-zinc-100";
    } else if (variant === 'danger') {
        bgClass = "bg-red-600";
        textClass = "text-white";
    } else if (variant === 'outline') {
        bgClass = "bg-transparent";
        textClass = "text-indigo-600 dark:text-indigo-400";
        borderClass = "border border-indigo-600 dark:border-indigo-400";
    }

    if (disabled) {
        bgClass = "bg-zinc-300 dark:bg-zinc-700";
        textClass = "text-zinc-500 dark:text-zinc-400";
        borderClass = "border-zinc-300 dark:border-zinc-700";
    }

    return (
        <TouchableOpacity
            className={clsx(
                "py-3 px-4 rounded-xl items-center justify-center flex-row",
                bgClass,
                borderClass,
                className
            )}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? '#4f46e5' : '#fff'} size="small" />
            ) : (
                <Text className={clsx("font-semibold text-base", textClass)}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}
