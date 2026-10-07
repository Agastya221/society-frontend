import { Text, View } from 'react-native';

interface SourceBadgeProps {
    source: 'ADMIN' | 'GUARD' | 'RESIDENT';
}

export function SourceBadge({ source }: SourceBadgeProps) {
    const styles = {
        ADMIN: 'bg-purple-100',
        GUARD: 'bg-blue-100',
        RESIDENT: 'bg-green-100'
    };

    const textStyles = {
        ADMIN: 'text-purple-700',
        GUARD: 'text-blue-700',
        RESIDENT: 'text-green-700'
    };

    return (
        <View className={`px-2 py-1 rounded ${styles[source]}`}>
            <Text className={`text-xs font-sora-bold uppercase ${textStyles[source]}`}>
                {source}
            </Text>
        </View>
    );
}
