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
        h1: 'text-3xl font-sora-bold text-gray-900',
        h2: 'text-2xl font-sora-bold text-gray-900',
        h3: 'text-xl font-sora-bold text-gray-900',
        body: 'font-sora text-base text-gray-700',
        caption: 'font-sora text-sm text-gray-500',
    };

    return (
        <RNText
            className={cn(variants[variant], className)}
            {...props}
        />
    );
}
