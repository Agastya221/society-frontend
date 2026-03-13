import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import api from '../../../services/api';

interface StaffMember {
    id: string;
    name: string;
    staffType: 'MAID' | 'COOK' | 'NANNY' | 'DRIVER' | 'CLEANER' | 'GARDENER' | 'LAUNDRY' | 'CARETAKER' | 'SECURITY_GUARD' | 'OTHER';
    phone: string;
    photoUrl?: string;
    isVerified: boolean;
    overallRating?: number;
    status: 'INSIDE' | 'OUTSIDE';
    lastCheckIn?: string;
}

export default function StaffScreen() {
    const router = useRouter();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff/domestic');
            setStaff(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStaff();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStaff();
    };

    const formatStaffType = (type: string) => {
        return type.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const renderItem = ({ item }: { item: StaffMember }) => {
        return (
            <Card className="mb-4 p-4 flex-row items-center gap-4">
                 <View className="h-14 w-14 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center overflow-hidden border border-gray-200">
                    {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} className="h-full w-full" />
                    ) : (
                        <Ionicons name="person" size={28} color="#9ca3af" />
                    )}
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.name}</Text>
                        {item.isVerified && <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />}
                    </View>

                    <View className="flex-row items-center gap-2">
                        <Text className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                            {formatStaffType(item.staffType)}
                        </Text>
                        {item.overallRating ? (
                            <Text className="text-amber-500 text-xs font-bold">⭐ {item.overallRating.toFixed(1)}</Text>
                        ) : null}
                    </View>
                    
                    {item.lastCheckIn && (
                        <View className="flex-row items-center gap-1 mt-2">
                            <Ionicons name="time-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-400 text-xs">
                                Last seen: {new Date(item.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    )}
                </View>
                
                <View className="items-center justify-center bg-gray-50 dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 flex-row gap-1.5">
                    <View className={`w-2 h-2 rounded-full ${item.status === 'INSIDE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <Text className={`text-xs font-bold ${item.status === 'INSIDE' ? 'text-green-700 dark:text-green-500' : 'text-gray-500'}`}>
                        {item.status}
                    </Text>
                </View>

            </Card>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">My House Help</Text>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={staff}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center py-20 opacity-70">
                            <Ionicons name="people-outline" size={64} className="text-gray-300 mb-4" />
                            <Text className="text-gray-500 font-medium">No staff registered yet.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
