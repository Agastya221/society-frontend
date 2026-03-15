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
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import api from '../../services/api';

interface Guard {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
    createdAt: string;
    society?: { name: string };
}

export default function GuardsScreen() {
    const [guards, setGuards] = useState<Guard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const resetForm = () => {
        setName('');
        setPhone('');
    };

    useFocusEffect(
        useCallback(() => {
            fetchGuards();
        }, [])
    );

    const fetchGuards = async () => {
        try {
            const res = await api.get('/api/v1/auth/resident-app/guards');
            setGuards(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch guards:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchGuards();
    };

    const toggleStatus = async (guard: Guard) => {
        const newActive = !guard.isActive;
        // Optimistic
        setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isActive: newActive } : g));
        try {
            await api.patch(`/api/v1/auth/resident-app/users/${guard.id}/status`, { isActive: newActive });
        } catch {
            // Revert
            setGuards(prev => prev.map(g => g.id === guard.id ? { ...g, isActive: !newActive } : g));
            Alert.alert('Error', 'Failed to update guard status');
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        const cleaned = phone.trim().replace(/\D/g, '');
        if (cleaned.length !== 10) {
            Alert.alert('Error', 'Enter a valid 10-digit phone number');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/api/v1/auth/resident-app/create-guard', {
                name: name.trim(),
                phone: `+91${cleaned}`,
            });
            setModalVisible(false);
            resetForm();
            fetchGuards();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create guard');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
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
                data={guards}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
                ListHeaderComponent={
                    <PrimaryButton
                        title="+ Add New Guard"
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        className="mb-6"
                    />
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <Feather name="shield-off" size={48} color="#d1d5db" />
                        <Text className="text-gray-500 mt-4 text-base font-medium">No guards yet</Text>
                        <Text className="text-gray-400 text-sm mt-1">Add your first guard.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <Card className="mb-3">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-row items-center gap-3 flex-1">
                                <View className="w-11 h-11 bg-indigo-100 rounded-full items-center justify-center">
                                    <Text className="text-indigo-700 font-bold text-base">
                                        {item.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">{item.name}</Text>
                                    <Text className="text-zinc-500 text-sm">{item.phone}</Text>
                                </View>
                            </View>
                            <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${
                                item.isActive ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                                <View className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <Text className={`text-xs font-bold ${
                                    item.isActive ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                    {item.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-4 mb-4 mt-1">
                            <View className="flex-row items-center gap-1">
                                <Feather name="calendar" size={12} color="#71717a" />
                                <Text className="text-zinc-500 text-xs">Joined {formatDate(item.createdAt)}</Text>
                            </View>
                        </View>

                        <PrimaryButton
                            title={item.isActive ? 'Deactivate' : 'Activate'}
                            onPress={() => toggleStatus(item)}
                            variant={item.isActive ? 'secondary' : 'primary'}
                            className="py-2"
                        />
                    </Card>
                )}
            />

            {/* Add Guard Modal */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View
                    style={{ paddingBottom: insets.bottom }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">New Guard</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Feather name="x" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex-row items-start gap-3">
                            <Feather name="info" size={16} color="#4f46e5" />
                            <Text className="text-indigo-700 text-sm flex-1">
                                Guards log in via OTP only. No password is needed.
                            </Text>
                        </View>

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Full Name *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Suresh Kumar"
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Mobile Number *</Text>
                        <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6">
                            <View className="px-4 border-r border-zinc-200 dark:border-zinc-800">
                                <Text className="text-zinc-500 font-medium">+91</Text>
                            </View>
                            <TextInput
                                className="flex-1 p-4 text-zinc-900 dark:text-white"
                                value={phone}
                                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                                keyboardType="phone-pad"
                                placeholder="10-digit number"
                                placeholderTextColor="#a1a1aa"
                                maxLength={10}
                            />
                        </View>

                        <PrimaryButton
                            title="Add Guard"
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
