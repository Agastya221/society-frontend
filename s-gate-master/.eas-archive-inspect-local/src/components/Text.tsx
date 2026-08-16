import clsx, { ClassValue } from 'clsx';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TextProps extends RNTextProps {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
}

export function Text({ variant = 'body', className, ...props }: TextProps) {
    const variants = {
        h1: 'text-3xl font-bold text-gray-900 dark:text-white',
        h2: 'text-2xl font-bold text-gray-900 dark:text-white',
        h3: 'text-xl font-bold text-gray-900 dark:text-white',
        body: 'text-base text-gray-700 dark:text-gray-300',
        caption: 'text-sm text-gray-500 dark:text-gray-400',
    };

    return (
        <RNText
            className={cn(variants[variant], className)}
            {...props}
        />
    );
}
