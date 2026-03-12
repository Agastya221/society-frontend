import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { GatePass, getAllGatePasses } from '../../../services/gatePass';
import { useAuthStore } from '../../../store/useAuthStore';

export default function GatePassesScreen() {
    const router = useRouter();
    const token = useAuthStore(state => state.accessToken);
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadPasses = useCallback(async () => {
        try {
            const data = await getAllGatePasses();
            setPasses(data);
        } catch (error) {
            console.error('Failed to load gate passes:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadPasses();
        }, [loadPasses])
    );

    const onRefresh = () => {
        setIsRefreshing(true);
        loadPasses();
    };

    const renderItem = ({ item }: { item: GatePass }) => (
        <Card className="mb-4 p-4">
            <View className="flex-row justify-between items-start mb-3">
                <View>
                    <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.title}</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">{item.type.replace('_', ' ')}</Text>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <View className="flex-row gap-4 mb-4 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 border-dashed">
                <View className="items-center justify-center bg-white dark:bg-zinc-800 p-2 rounded shadow-sm h-16 w-16">
                     <Ionicons name="qr-code" size={40} color="#000" className="dark:text-white" />
                </View>
                <View className="justify-center flex-1">
                     <Text className="text-xs text-gray-500 dark:text-gray-400">Pass Code</Text>
                     <Text className="text-xl font-mono font-bold text-gray-900 dark:text-white tracking-widest">
                        {item.code?.split('-')[1] || item.code || '----'}
                     </Text>
                </View>
            </View>

            <View className="flex-row justify-between items-center text-xs">
                 <View>
                    <Text className="text-gray-400 text-[10px] uppercase">Valid From</Text>
                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                        {new Date(item.validFrom).toLocaleDateString()}
                    </Text>
                 </View>
                 <View className="items-end">
                    <Text className="text-gray-400 text-[10px] uppercase">Valid Until</Text>
                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-medium">
                        {new Date(item.validUntil).toLocaleDateString()}
                    </Text>
                 </View>
            </View>

            {item.description ? (
                <Text className="mt-3 text-gray-500 dark:text-gray-400 text-sm border-t border-gray-100 dark:border-zinc-800 pt-2">
                    {item.description}
                </Text>
            ) : null}
        </Card>
    );

    if (isLoading && !isRefreshing) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Gate Passes</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(resident)/gate-passes/create')} className="bg-indigo-600 h-9 w-9 rounded-full items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

             <FlatList
                data={passes}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Ionicons name="ticket-outline" size={64} color="#d1d5db" />
                        <Text className="text-gray-400 mt-4 text-center">No active gate passes</Text>
                        <PrimaryButton 
                            title="Create New Pass" 
                            className="mt-6"
                            onPress={() => router.push('/(resident)/gate-passes/create')}
                        />
                    </View>
                }
            />
        </SafeAreaView>
    );
}
