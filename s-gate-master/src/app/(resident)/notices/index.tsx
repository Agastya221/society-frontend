import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PriorityBadge } from '../../../components/ui/PriorityBadge';
import { MOCK_NOTICES } from '../../../mocks/notices';

export default function NoticesScreen() {
    const router = useRouter();

    const renderItem = ({ item }: { item: typeof MOCK_NOTICES[0] }) => (
        <Card className="mb-4 p-4 border-l-4 border-l-indigo-500 dark:border-l-indigo-500">
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 mr-2">{item.title}</Text>
                {item.isPinned && <Ionicons name="pin" size={16} color="#6366f1" className="bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-1" />}
            </View>
            
            <View className="flex-row gap-2 mb-3">
                <PriorityBadge priority={item.priority} />
                <Text className="text-xs text-gray-500 dark:text-gray-400 self-center">
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <Text className="text-gray-600 dark:text-gray-300 leading-5 text-sm">
                {item.content}
            </Text>

            <View className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800 flex-row items-center gap-1">
                <Ionicons name="person-circle-outline" size={16} color="#9ca3af" />
                <Text className="text-xs text-gray-400 italic">Posted by {item.postedBy}</Text>
            </View>
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Notice Board</Text>
            </View>

            <FlatList
                data={MOCK_NOTICES}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
            />
        </SafeAreaView>
    );
}
