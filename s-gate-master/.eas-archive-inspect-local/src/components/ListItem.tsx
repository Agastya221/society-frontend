import { Feather } from '@expo/vector-icons';
import clsx from 'clsx';
import { Text, TouchableOpacity, View } from 'react-native';

interface ListItemProps {
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    className?: string;
    showChevron?: boolean;
}

export function ListItem({ title, subtitle, rightElement, onPress, className, showChevron = true }: ListItemProps) {
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            className={clsx("flex-row items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800", className)}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View className="flex-1 mr-4">
                <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">{title}</Text>
                {subtitle && (
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</Text>
                )}
            </View>

            <View className="flex-row items-center gap-2">
                {rightElement}
                {onPress && showChevron && (
                    <Feather name="chevron-right" size={20} color="#a1a1aa" />
                )}
            </View>
        </Container>
    );
}
