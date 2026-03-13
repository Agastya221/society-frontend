import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PriorityBadge } from '../../../components/ui/PriorityBadge';
import api from '../../../services/api';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'GENERAL' | 'ALERT' | 'EVENT' | 'MAINTENANCE';
    isPinned: boolean;
    createdAt: string;
    expiresAt?: string;
}

export default function NoticesScreen() {
    const router = useRouter();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotices = async () => {
        try {
            const res = await api.get('/community/notices');
            let data = res.data?.data || [];
            
            // Sort: pinned first, then by createdAt desc
            data.sort((a: Notice, b: Notice) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            setNotices(data);
        } catch (err) {
            console.error('Failed to fetch notices:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotices();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotices();
    };

    const getTypeColor = (type: Notice['type']) => {
        switch (type) {
            case 'ALERT': return 'bg-red-100 text-red-700 border-red-200';
            case 'EVENT': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'MAINTENANCE': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'GENERAL': default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const renderItem = ({ item }: { item: Notice }) => {
        const isExpired = item.expiresAt ? new Date(item.expiresAt) < new Date() : false;

        return (
            <Card className={`mb-4 p-4 border-l-4 shadow-sm ${
                item.type === 'ALERT' ? 'border-l-red-500' : 
                item.type === 'EVENT' ? 'border-l-indigo-500' : 
                item.type === 'MAINTENANCE' ? 'border-l-amber-500' : 
                'border-l-gray-400'
            } ${isExpired ? 'opacity-60' : ''}`}>
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 mr-2">{item.title}</Text>
                    {item.isPinned && <Ionicons name="pin" size={16} color="#6366f1" className="bg-indigo-50 dark:bg-indigo-900/30 rounded-full p-1" />}
                </View>
                
                <View className="flex-row gap-2 mb-3">
                    <View className={`px-2 py-0.5 rounded-md border ${getTypeColor(item.type)}`}>
                        <Text className={`text-[10px] font-bold ${getTypeColor(item.type).split(' ')[1]}`}>
                            {item.type}
                        </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 self-center">
                        {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    {isExpired && (
                        <Text className="text-xs text-red-400 font-bold self-center px-1">Expired</Text>
                    )}
                </View>

                <Text className="text-gray-600 dark:text-gray-300 leading-5 text-sm">
                    {item.content}
                </Text>
            </Card>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Notice Board</Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={notices}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center py-20 opacity-70">
                            <Ionicons name="document-text-outline" size={64} className="text-gray-300 mb-4" />
                            <Text className="text-gray-500 font-medium">No notices yet. Check back later.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
