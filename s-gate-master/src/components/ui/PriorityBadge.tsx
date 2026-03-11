import { Text, View } from 'react-native';
import { NoticePriority } from '../../mocks/types';

interface PriorityBadgeProps {
    priority: NoticePriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    let bgClass = 'bg-gray-100 dark:bg-gray-800';
    let textClass = 'text-gray-600 dark:text-gray-400';

    switch (priority) {
        case 'URGENT':
            bgClass = 'bg-red-100 dark:bg-red-900/40';
            textClass = 'text-red-700 dark:text-red-400';
            break;
        case 'HIGH':
            bgClass = 'bg-orange-100 dark:bg-orange-900/40';
            textClass = 'text-orange-700 dark:text-orange-400';
            break;
        case 'MEDIUM':
            bgClass = 'bg-blue-100 dark:bg-blue-900/40';
            textClass = 'text-blue-700 dark:text-blue-400';
            break;
        case 'LOW':
            bgClass = 'bg-gray-100 dark:bg-gray-800';
            textClass = 'text-gray-600 dark:text-gray-400';
            break;
    }

    return (
        <View className={`px-1.5 py-0.5 rounded flex-row items-center ${bgClass}`}>
            <Text className={`text-[10px] font-bold uppercase ${textClass}`}>
                {priority}
            </Text>
        </View>
    );
}
