import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    textClassName?: string;
}

export function Button({ title, variant = 'primary', className, textClassName, ...props }: ButtonProps) {
    const baseStyles = 'p-4 rounded-xl items-center justify-center active:opacity-80';

    const variants = {
        primary: 'bg-blue-600',
        secondary: 'bg-gray-200 dark:bg-gray-800',
        outline: 'border border-gray-300 dark:border-gray-700 bg-transparent',
        ghost: 'bg-transparent',
    };

    const textBaseStyles = 'font-bold text-base';

    const textVariants = {
        primary: 'text-white',
        secondary: 'text-gray-900 dark:text-white',
        outline: 'text-gray-900 dark:text-white',
        ghost: 'text-blue-600',
    };

    return (
        <TouchableOpacity
            className={cn(baseStyles, variants[variant], className)}
            {...props}
        >
            <Text className={cn(textBaseStyles, textVariants[variant], textClassName)}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}
