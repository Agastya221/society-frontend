import { Text, View } from 'react-native';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let bgClass = 'bg-gray-100 dark:bg-gray-800';
  let textClass = 'text-gray-700 dark:text-gray-300';
  const label = status?.replace('_', ' ') || 'UNKNOWN';

  switch (status) {
    case 'APPROVED':
    case 'RESOLVED':
    case 'IN':
      bgClass = 'bg-green-100 dark:bg-green-900/30';
      textClass = 'text-green-700 dark:text-green-400';
      break;
    case 'REJECTED':
    case 'OUT':
    case 'EXPIRED':
    case 'TRIGGERED':
    case 'ACKNOWLEDGED':
    case 'ACTIVE':
      bgClass = 'bg-red-100 dark:bg-red-900/30';
      textClass = 'text-red-700 dark:text-red-400';
      break;
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'OPEN':
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30';
      textClass = 'text-yellow-700 dark:text-yellow-400';
      break;
    case 'USED':
      bgClass = 'bg-blue-100 dark:bg-blue-900/30';
      textClass = 'text-blue-700 dark:text-blue-400';
      break;
    case 'FALSE_ALARM':
      bgClass = 'bg-gray-200 dark:bg-gray-800';
      textClass = 'text-gray-700 dark:text-gray-300';
      break;
  }

  return (
    <View className={`px-2 py-1 rounded-md self-start ${bgClass}`}>
      <Text className={`text-xs font-medium uppercase ${textClass}`}>
        {label}
      </Text>
    </View>
  );
}
