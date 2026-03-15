import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';

interface RegistrationRequest {
    id: string;
    societyName: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    totalFlats: number;
    monthlyFee: number;
    status: string;
    rejectionReason?: string;
    createdAt: string;
    user: { name: string; phone: string };
}

type StatusTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const TABS: { key: StatusTab; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function RequestsListScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadInitial(activeTab);
        }, [activeTab])
    );

    const loadInitial = async (tab: StatusTab) => {
        setLoading(true);
        setPage(1);
        setHasMore(true);
        try {
            const params: Record<string, any> = { page: 1, limit: 20 };
            if (tab !== 'ALL') params.status = tab;
            const res = await api.get('/api/v1/society-registration/requests', { params });
            const data = res.data?.data ?? [];
            const pagination = res.data?.pagination;
            setRequests(data);
            setHasMore(pagination ? pagination.page < pagination.pages : false);
        } catch (err) {
            console.error('Failed to fetch requests:', err);
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMore = async () => {
        if (!hasMore || loadingMore || loading) return;
        const nextPage = page + 1;
        setLoadingMore(true);
        try {
            const params: Record<string, any> = { page: nextPage, limit: 20 };
            if (activeTab !== 'ALL') params.status = activeTab;
            const res = await api.get('/api/v1/society-registration/requests', { params });
            const data = res.data?.data ?? [];
            const pagination = res.data?.pagination;
            setRequests((prev) => [...prev, ...data]);
            setPage(nextPage);
            setHasMore(pagination ? pagination.page < pagination.pages : false);
        } catch (err) {
            console.error('Failed to load more:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleTabChange = (tab: StatusTab) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        loadInitial(tab);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadInitial(activeTab);
    };

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return d;
        }
    };

    const getStatusStyle = (status: string) => STATUS_STYLE[status] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100">
                <View className="flex-row items-center gap-3 mb-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-900">All Requests</Text>
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => handleTabChange(tab.key)}
                            className={`px-4 py-2 rounded-full ${
                                activeTab === tab.key ? 'bg-indigo-600' : 'bg-slate-100'
                            }`}
                        >
                            <Text
                                className={`text-sm font-medium ${
                                    activeTab === tab.key ? 'text-white' : 'text-slate-500'
                                }`}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View className="items-center py-20">
                            <Feather name="inbox" size={48} color="#d1d5db" />
                            <Text className="text-slate-500 mt-4 text-base font-medium">No requests found</Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4 items-center">
                                <ActivityIndicator size="small" color="#4f46e5" />
                            </View>
                        ) : null
                    }
                    renderItem={({ item }) => {
                        const statusStyle = getStatusStyle(item.status);
                        return (
                            <TouchableOpacity
                                onPress={() => router.push(`/(superadmin)/requests/${item.id}`)}
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-start justify-between mb-2">
                                    <View className="flex-1 mr-3">
                                        <Text className="text-base font-bold text-slate-900">{item.societyName}</Text>
                                        <Text className="text-slate-400 text-sm mt-0.5">
                                            {item.city}, {item.state}
                                        </Text>
                                    </View>
                                    <View className={`${statusStyle.bg} px-2.5 py-1 rounded-full`}>
                                        <Text className={`${statusStyle.text} text-xs font-bold`}>{item.status}</Text>
                                    </View>
                                </View>

                                <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-1">
                                    <View className="flex-row items-center gap-1">
                                        <Feather name="grid" size={12} color="#94a3b8" />
                                        <Text className="text-slate-500 text-xs">{item.totalFlats} flats</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Feather name="credit-card" size={12} color="#94a3b8" />
                                        <Text className="text-slate-500 text-xs">₹{item.monthlyFee}/mo</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Feather name="user" size={12} color="#94a3b8" />
                                        <Text className="text-slate-500 text-xs">{item.contactName}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Feather name="phone" size={12} color="#94a3b8" />
                                        <Text className="text-slate-500 text-xs">{item.contactPhone}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Feather name="calendar" size={12} color="#94a3b8" />
                                        <Text className="text-slate-500 text-xs">{formatDate(item.createdAt)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}
