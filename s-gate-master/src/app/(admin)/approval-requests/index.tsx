import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../../components/Card';
import { SourceBadge } from '../../../components/SourceBadge';
import { StatusBadge } from '../../../components/StatusBadge';
import { getAllGatePasses, type GatePass } from '../../../services/gatePass';

export default function ApprovalRequestsListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    // Filter for admin-raised requests only
    const [requests, setRequests] = useState<GatePass[]>([]);

    useEffect(() => {
        getAllGatePasses()
            .then(data => setRequests(data))
            .catch(console.error);
    }, []);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

    const filteredRequests = requests.filter(req => 
        filter === 'ALL' ? true : req.status === filter
    );

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'entry': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            case 'gate_pass': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
            case 'special_access': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
            default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-[#0f0f11]">
            {/* Header */}
            <View className="bg-white dark:bg-zinc-900 px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} className="text-zinc-900 dark:text-white" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-zinc-900 dark:text-white">Approval Requests</Text>
                    <TouchableOpacity onPress={() => router.push('/(admin)/approval-requests/create' as any)}>
                        <Feather name="plus" size={24} className="text-indigo-600 dark:text-indigo-400" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View className="flex-row gap-2">
                    {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
                        <TouchableOpacity
                            key={status}
                            onPress={() => setFilter(status)}
                            className={`px-3 py-1.5 rounded-lg ${
                                filter === status 
                                    ? 'bg-indigo-600' 
                                    : 'bg-zinc-100 dark:bg-zinc-800'
                            }`}
                        >
                            <Text className={`text-xs font-semibold ${
                                filter === status 
                                    ? 'text-white' 
                                    : 'text-zinc-600 dark:text-zinc-400'
                            }`}>
                                {status}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredRequests}
                keyExtractor={item => item.id}
                contentContainerStyle={{ 
                    padding: 16, 
                    paddingBottom: 100 + insets.bottom 
                }}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        onPress={() => router.push(`/(admin)/approval-requests/${item.id}` as any)}
                        activeOpacity={0.7}
                    >
                        <Card className="mb-3">
                            {/* Header Row */}
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2">
                                    <View className={`px-2 py-1 rounded ${getTypeColor(item.type)}`}>
                                        <Text className="text-xs font-bold uppercase">
                                            {item.type.replace('_', ' ')}
                                        </Text>
                                    </View>
                                    <SourceBadge source="ADMIN" />
                                </View>
                                <StatusBadge status={item.status} />
                            </View>

                            {/* Title & Description */}
                            <Text className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                                {item.title}
                            </Text>
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-2" numberOfLines={2}>
                                {item.description}
                            </Text>

                            {/* Meta Info */}
                            <View className="flex-row items-center gap-3">
                                <View className="flex-row items-center gap-1">
                                    <Feather name="home" size={12} className="text-zinc-400" />
                                    <Text className="text-xs text-zinc-500">Flat {item.flat?.flatNumber ?? 'N/A'}</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Feather name="user" size={12} className="text-zinc-400" />
                                    <Text className="text-xs text-zinc-500">{item.requestedBy?.name ?? 'N/A'}</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <Feather name="clock" size={12} className="text-zinc-400" />
                                    <Text className="text-xs text-zinc-500">{formatDate(item.createdAt)}</Text>
                                </View>
                            </View>

                            {/* Actions for PENDING requests */}
                            {item.status === 'PENDING' && (
                                <View className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex-row gap-2">
                                    <TouchableOpacity 
                                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-2 rounded-lg items-center"
                                        onPress={() => {/* Cancel logic */}}
                                    >
                                        <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        className="flex-1 bg-indigo-600 py-2 rounded-lg items-center"
                                        onPress={() => router.push(`/(admin)/approval-requests/${item.id}` as any)}
                                    >
                                        <Text className="text-sm font-semibold text-white">
                                            View Details
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Card>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center py-12">
                        <Feather name="inbox" size={48} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                        <Text className="text-zinc-500 dark:text-zinc-400">No {filter.toLowerCase()} requests</Text>
                    </View>
                }
            />
        </View>
    );
}
