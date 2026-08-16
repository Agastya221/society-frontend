import clsx from 'clsx';
import { Text, View } from 'react-native';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    let bgClass = "bg-gray-100 dark:bg-gray-800";
    let textClass = "text-gray-700 dark:text-gray-300";

    const lowerStatus = status.toLowerCase();

    if (['active', 'approved', 'paid'].includes(lowerStatus)) {
        bgClass = "bg-green-100 dark:bg-green-900/30";
        textClass = "text-green-700 dark:text-green-400";
    } else if (['pending', 'medium'].includes(lowerStatus)) {
        bgClass = "bg-yellow-100 dark:bg-yellow-900/30";
        textClass = "text-yellow-700 dark:text-yellow-400";
    } else if (['rejected', 'inactive', 'high', 'overdue', 'urgent'].includes(lowerStatus)) {
        bgClass = "bg-red-100 dark:bg-red-900/30";
        textClass = "text-red-700 dark:text-red-400";
    }

    return (
        <View className={clsx("px-2.5 py-0.5 rounded-full self-start", bgClass, className)}>
            <Text className={clsx("text-xs font-medium", textClass)}>
                {status}
            </Text>
        </View>
    );
}
