import { Text, View } from 'react-native';

interface SourceBadgeProps {
    source: 'ADMIN' | 'GUARD' | 'RESIDENT';
}

export function SourceBadge({ source }: SourceBadgeProps) {
    const styles = {
        ADMIN: 'bg-purple-100 dark:bg-purple-900/30',
        GUARD: 'bg-blue-100 dark:bg-blue-900/30',
        RESIDENT: 'bg-green-100 dark:bg-green-900/30'
    };

    const textStyles = {
        ADMIN: 'text-purple-700 dark:text-purple-300',
        GUARD: 'text-blue-700 dark:text-blue-300',
        RESIDENT: 'text-green-700 dark:text-green-300'
    };

    return (
        <View className={`px-2 py-1 rounded ${styles[source]}`}>
            <Text className={`text-xs font-bold uppercase ${textStyles[source]}`}>
                {source}
            </Text>
        </View>
    );
}
