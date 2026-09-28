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
            className={clsx("flex-row items-center justify-between p-4 bg-white border-b border-zinc-100", className)}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View className="flex-1 mr-4">
                <Text className="text-base font-sora-medium text-zinc-900">{title}</Text>
                {subtitle && (
                    <Text className="font-sora text-sm text-zinc-500 mt-0.5">{subtitle}</Text>
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
