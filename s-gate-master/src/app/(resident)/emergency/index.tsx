import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmergencyResponse, getMyEmergencies } from '../../../services/emergency';

export default function EmergencyListScreen() {
    const router = useRouter();
    const [emergencies, setEmergencies] = useState<EmergencyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadEmergencies = useCallback(async () => {
        try {
            const data = await getMyEmergencies();
            // Sort: Active first, then by date desc
            const sorted = data.sort((a, b) => {
                const isActiveA = a.status === 'TRIGGERED' || a.status === 'ACKNOWLEDGED' || a.status === 'ACTIVE';
                const isActiveB = b.status === 'TRIGGERED' || b.status === 'ACKNOWLEDGED' || b.status === 'ACTIVE';
                if (isActiveA && !isActiveB) return -1;
                if (!isActiveA && isActiveB) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setEmergencies(sorted);
        } catch (error) {
            console.error('Failed to load emergencies:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadEmergencies();
        }, [loadEmergencies])
    );

    const onRefresh = () => {
        setIsRefreshing(true);
        loadEmergencies();
    };

    const renderItem = ({ item }: { item: EmergencyResponse }) => (
        <TouchableOpacity
            onPress={() => router.push(`/(resident)/emergency/${item.id}` as any)}
            className="mb-4 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm"
        >
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center gap-2">
                    <View className={`h-2 w-2 rounded-full ${
                        item.type === 'MEDICAL' ? 'bg-red-500' :
                        item.type === 'FIRE' ? 'bg-orange-500' :
                        'bg-gray-500'
                    }`} />
                    <Text className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
                        {item.type.replace('_', ' ')}
                    </Text>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <Text className="text-gray-600 dark:text-gray-300 text-sm mb-3 font-medium" numberOfLines={2}>
                {item.description}
            </Text>

            <View className="flex-row justify-between items-center border-t border-gray-50 dark:border-zinc-800 pt-3">
                <Text className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
        </TouchableOpacity>
    );

    if (isLoading && !isRefreshing) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#ef4444" />
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
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Emergencies</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => router.push('/(resident)/emergency/create')} 
                    className="bg-red-100 h-9 w-9 rounded-full items-center justify-center"
                >
                    <Ionicons name="warning" size={20} className="text-red-600" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={emergencies}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
                ListHeaderComponent={
                    <View className="mb-6 bg-red-600 rounded-2xl p-5 shadow-lg shadow-red-200">
                        <View className="flex-row items-start justify-between mb-4">
                            <View>
                                <Text className="text-white font-bold text-lg mb-1">Need Urgent Help?</Text>
                                <Text className="text-red-100 text-xs max-w-[200px]">
                                    Notify guards and admins immediately with a single tap.
                                </Text>
                            </View>
                            <View className="bg-white/20 p-2 rounded-lg">
                                <Ionicons name="megaphone" size={32} color="white" />
                            </View>
                        </View>
                        <TouchableOpacity 
                            onPress={() => router.push('/(resident)/emergency/create')}
                            className="bg-white p-3 rounded-xl items-center flex-row justify-center gap-2"
                        >
                            <Text className="font-bold text-red-600 uppercase tracking-widest text-sm">Raise Emergency</Text>
                            <Ionicons name="arrow-forward" size={16} color="#dc2626" />
                        </TouchableOpacity>
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-10">
                        <Ionicons name="checkmark-circle-outline" size={48} color="#d1d5db" />
                        <Text className="text-gray-400 mt-4 text-center">No past emergencies</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
