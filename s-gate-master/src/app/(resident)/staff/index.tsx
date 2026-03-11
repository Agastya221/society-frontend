import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { MOCK_STAFF } from '../../../mocks/staff';

export default function StaffScreen() {
    const router = useRouter();

    const renderItem = ({ item }: { item: typeof MOCK_STAFF[0] }) => (
        <Card className="mb-4 p-4 flex-row items-center gap-4">
             <View className="h-14 w-14 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center overflow-hidden">
                {/* <Image source={{ uri: item.photoUrl }} className="h-full w-full" /> */}
                <Ionicons name="person" size={28} color="#9ca3af" />
            </View>
            <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.name}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-xs font-semibold">{item.role}</Text>
                
                <View className="flex-row items-center gap-1 mt-2">
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text className="text-gray-400 text-xs">
                        {item.currentStatus === 'IN' 
                            ? `Entered ${new Date(item.lastEntry!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : item.lastExit 
                                ? `Left ${new Date(item.lastExit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : 'Not inside'
                        }
                    </Text>
                </View>
            </View>
            <StatusBadge status={item.currentStatus} />
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">My House Help</Text>
            </View>

            <FlatList
                data={MOCK_STAFF}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
            />
        </SafeAreaView>
    );
}
