import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComplaintCard } from '../../../components/complaints/ComplaintCard';
import { Complaint, ComplaintStatus, deleteComplaint, fetchComplaints } from '../../../services/complaints';
import { AppAlert } from '../../../components/ui/AppAlert';

export default function ComplaintsScreen() {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'ALL'>('ALL');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch complaints from API
    const loadComplaints = async (isRefresh = false) => {
        if (!isRefresh) {
            setIsLoading(true);
        }
        setError('');

        try {
            console.log('📥 Fetching complaints...');
            const data = await fetchComplaints();
            console.log('✅ Fetched complaints:', data.length);
            setComplaints(data);
        } catch (err: any) {
            console.error('❌ Failed to fetch complaints:', err);
            setError(err.message || 'Failed to load complaints');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Fetch on screen mount and when focused
    useFocusEffect(
        useCallback(() => {
            loadComplaints();
        }, [])
    );

    // Pull to refresh handler
    const handleRefresh = () => {
        setIsRefreshing(true);
        loadComplaints(true);
    };

    // Delete complaint handler
    const handleDeleteComplaint = (complaint: Complaint) => {
        // Show confirmation alert
        AppAlert.show(
            'Delete Complaint',
            'Are you sure you want to delete this complaint?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingId(complaint.id);
                            
                            // Call delete API
                            const message = await deleteComplaint(complaint.id);
                            
                            // Remove from local state (optimistic update)
                            setComplaints(prev => prev.filter(c => c.id !== complaint.id));
                            
                            // Show success alert
                            AppAlert.show('Success', message || 'Complaint deleted successfully');
                        } catch (err: any) {
                            console.error('Failed to delete complaint:', err);
                            AppAlert.show('Error', err.message || 'Failed to delete complaint');
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    // Filter complaints by status (with safety check to prevent undefined errors)
    const filteredComplaints = Array.isArray(complaints) 
        ? complaints.filter(c => filterStatus === 'ALL' ? true : c.status === filterStatus)
        : [];

    const FilterChip = ({ status, label }: { status: ComplaintStatus | 'ALL', label: string }) => (
        <TouchableOpacity
            onPress={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full mr-2 border ${
                filterStatus === status
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
            }`}
        >
            <Text className={`text-xs font-bold ${
                filterStatus === status ? 'text-white' : 'text-gray-600 dark:text-gray-400'
            }`}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Complaints</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(resident)/complaints/create')} className="bg-indigo-600 h-9 w-9 rounded-full items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {error ? (
                <View className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
                    <Text className="text-red-600 dark:text-red-400 text-sm text-center">{error}</Text>
                </View>
            ) : null}

            <View className="py-4 bg-white dark:bg-zinc-900/50">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    <FilterChip status="ALL" label="All" />
                    <FilterChip status="OPEN" label="Open" />
                    <FilterChip status="IN_PROGRESS" label="In Progress" />
                    <FilterChip status="RESOLVED" label="Resolved" />
                    <FilterChip status="CLOSED" label="Closed" />
                </ScrollView>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text className="text-gray-500 dark:text-gray-400 mt-4">Loading complaints...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredComplaints}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ComplaintCard 
                            complaint={item} 
                            onPress={() => {
                                console.log('📱 Navigating to complaint:', item.id);
                                router.push(`/(resident)/complaints/${item.id}` as any);
                            }}
                            onDelete={handleDeleteComplaint}
                            isDeleting={deletingId === item.id}
                        />
                    )}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor="#4f46e5"
                            colors={['#4f46e5']}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4 text-center">
                                {filterStatus === 'ALL' ? 'No complaints yet' : `No ${filterStatus.toLowerCase().replace('_', ' ')} complaints`}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => router.push('/(resident)/complaints/create')}
                                className="mt-4 bg-indigo-600 px-6 py-3 rounded-xl"
                            >
                                <Text className="text-white font-semibold">Create Complaint</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
