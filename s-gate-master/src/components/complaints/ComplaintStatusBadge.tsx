import { Text, View } from 'react-native';
import { ComplaintStatus } from '../../services/complaints';

interface ComplaintStatusBadgeProps {
    status: ComplaintStatus;
}

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
    const getStyles = () => {
        switch (status) {
            case 'OPEN':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
            case 'IN_PROGRESS':
                return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
            case 'RESOLVED':
                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            case 'CLOSED':
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
            default:
                return 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-400';
        }
    };

    return (
        <View className={`px-2 py-1 rounded-full ${getStyles().split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
            <Text className={`text-[10px] font-bold uppercase ${getStyles().split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                {status.replace('_', ' ')}
            </Text>
        </View>
    );
}
