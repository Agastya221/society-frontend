import { Text, View } from 'react-native';
import { ComplaintUrgency } from '../../services/complaints';

interface PriorityBadgeProps {
    priority: ComplaintUrgency;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    const getStyles = () => {
        switch (priority) {
            case 'CRITICAL':
                return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
            case 'HIGH':
                return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
            case 'MEDIUM':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case 'LOW':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
            default:
                return 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-zinc-700';
        }
    };

    return (
        <View className={`px-2 py-1 rounded-full border ${getStyles().split(' ').filter(c => c.startsWith('bg-') || c.startsWith('border-')).join(' ')}`}>
            <Text className={`text-[10px] font-bold uppercase ${getStyles().split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                {priority} Priority
            </Text>
        </View>
    );
}
