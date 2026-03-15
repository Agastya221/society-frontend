import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import api from '../../services/api';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
    isPinned: boolean;
    createdAt: string;
    expiresAt?: string;
}

type NoticeType = 'GENERAL' | 'URGENT' | 'EVENT' | 'MAINTENANCE' | 'MEETING' | 'EMERGENCY';
type NoticePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const TYPES: NoticeType[] = ['GENERAL', 'URGENT', 'EVENT', 'MAINTENANCE', 'MEETING', 'EMERGENCY'];
const PRIORITIES: NoticePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    GENERAL: { bg: 'bg-gray-100', text: 'text-gray-700' },
    URGENT: { bg: 'bg-red-100', text: 'text-red-700' },
    EVENT: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    MAINTENANCE: { bg: 'bg-amber-100', text: 'text-amber-700' },
    MEETING: { bg: 'bg-blue-100', text: 'text-blue-700' },
    EMERGENCY: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function NoticesScreen() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const insets = useSafeAreaInsets();

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<NoticeType>('GENERAL');
    const [priority, setPriority] = useState<NoticePriority>('LOW');
    const [isPinned, setIsPinned] = useState(false);

    const resetForm = () => {
        setTitle('');
        setContent('');
        setType('GENERAL');
        setPriority('LOW');
        setIsPinned(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotices();
        }, [])
    );

    const fetchNotices = async () => {
        try {
            const res = await api.get('/api/v1/community/notices', { params: { page: 1, limit: 50 } });
            const data: Notice[] = res.data?.data ?? [];
            // Sort: pinned first, then by createdAt desc
            data.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
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

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotices();
    };

    const handleTogglePin = async (id: string) => {
        // Optimistic
        setNotices(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
            updated.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            return updated;
        });
        try {
            await api.patch(`/api/v1/community/notices/${id}/toggle-pin`);
        } catch {
            fetchNotices(); // Revert on failure
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Notice', 'Are you sure you want to delete this notice?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    // Optimistic
                    setNotices(prev => prev.filter(n => n.id !== id));
                    try {
                        await api.delete(`/api/v1/community/notices/${id}`);
                    } catch {
                        fetchNotices();
                    }
                },
            },
        ]);
    };

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Error', 'Title and content are required');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/api/v1/community/notices', {
                title: title.trim(),
                content: content.trim(),
                type,
                priority,
                isPinned,
            });
            setModalVisible(false);
            resetForm();
            fetchNotices();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create notice');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeStyle = (t: string) => TYPE_COLORS[t] ?? TYPE_COLORS.GENERAL;
    const getPriorityDot = (p: string) => {
        if (p === 'CRITICAL' || p === 'HIGH') return 'bg-red-500';
        if (p === 'MEDIUM') return 'bg-amber-500';
        return 'bg-gray-400';
    };

    if (loading) {
        return (
            <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
            <FlatList
                data={notices}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
                ListHeaderComponent={
                    <PrimaryButton
                        title="+ Create New Notice"
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        className="mb-6"
                    />
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <Feather name="bell-off" size={48} color="#d1d5db" />
                        <Text className="text-gray-500 mt-4 text-base font-medium">No notices yet</Text>
                        <Text className="text-gray-400 text-sm mt-1">Create the first one.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const typeStyle = getTypeStyle(item.type);
                    return (
                        <Card className="mb-4">
                            <View className="flex-row justify-between mb-2">
                                <View className="flex-row gap-2 items-center flex-1">
                                    {item.isPinned && (
                                        <View className="bg-indigo-100 p-1 rounded">
                                            <Feather name="bookmark" size={12} color="#4f46e5" />
                                        </View>
                                    )}
                                    <View className={`px-2 py-0.5 rounded ${typeStyle.bg}`}>
                                        <Text className={`text-xs font-bold ${typeStyle.text}`}>{item.type}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <View className={`w-2 h-2 rounded-full ${getPriorityDot(item.priority)}`} />
                                        <Text className="text-xs text-gray-500">{item.priority}</Text>
                                    </View>
                                </View>
                                <View className="flex-row gap-3">
                                    <TouchableOpacity onPress={() => handleTogglePin(item.id)}>
                                        <Feather
                                            name={item.isPinned ? 'bookmark' : 'bookmark'}
                                            size={18}
                                            color={item.isPinned ? '#4f46e5' : '#71717a'}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                        <Feather name="trash-2" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{item.title}</Text>
                            <Text className="text-zinc-600 dark:text-zinc-300 mb-3 leading-5">{item.content}</Text>

                            <View className="border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-2">
                                <Text className="text-zinc-400 text-xs">
                                    {new Date(item.createdAt).toLocaleString()}
                                </Text>
                            </View>
                        </Card>
                    );
                }}
            />

            {/* Create Modal */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View
                    style={{ paddingBottom: insets.bottom }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">New Notice</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Feather name="x" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Title *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            placeholder="Notice Title"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Content *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 h-32 text-zinc-900 dark:text-white"
                            multiline
                            textAlignVertical="top"
                            placeholder="Notice details..."
                            value={content}
                            onChangeText={setContent}
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Type</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    className={`px-3 py-2 rounded-lg border ${type === t ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white' : 'border-zinc-300 dark:border-zinc-700'}`}
                                >
                                    <Text className={type === t ? 'text-white dark:text-black font-bold text-xs' : 'text-zinc-600 dark:text-zinc-400 text-xs'}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Priority</Text>
                        <View className="flex-row flex-wrap gap-2 mb-6">
                            {PRIORITIES.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPriority(p)}
                                    className={`px-3 py-2 rounded-lg border ${priority === p ? 'border-blue-600 bg-blue-50' : 'border-zinc-300'}`}
                                >
                                    <Text className={priority === p ? 'text-blue-700 font-bold' : 'text-zinc-600'}>
                                        {p}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="flex-row items-center justify-between mb-8 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <Text className="font-medium text-zinc-700 dark:text-zinc-300">Pin this notice</Text>
                            <Switch
                                value={isPinned}
                                onValueChange={setIsPinned}
                                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                                thumbColor={isPinned ? '#4f46e5' : '#f4f4f5'}
                            />
                        </View>

                        <PrimaryButton
                            title="Publish Notice"
                            onPress={handleCreate}
                            loading={submitting}
                            disabled={submitting}
                        />
                        <View className="h-10" />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
