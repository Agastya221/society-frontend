import clsx, { ClassValue } from 'clsx';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
    return (
        <View className="w-full gap-2">
            {label && (
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </Text>
            )}
            <TextInput
                placeholderTextColor="#9CA3AF"
                className={cn(
                    'w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white',
                    error && 'border-red-500',
                    className
                )}
                {...props}
            />
            {error && (
                <Text className="text-xs text-red-500">{error}</Text>
            )}
        </View>
    );
}
