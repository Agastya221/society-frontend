import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import api from '../../../services/api';

interface EntryRequest {
    id: string;
    type: string;
    visitorName: string;
    visitorPhone?: string;
    providerTag?: string;
    photoKey?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    flat: { flatNumber: string };
    createdAt: string;
    expiresAt: string;
}

export default function ApprovalsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<EntryRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedRequest, setSelectedRequest] = useState<EntryRequest | null>(null);
    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        type: 'APPROVE' | 'REJECT';
    }>({ visible: false, type: 'APPROVE' });
    const [rejectReason, setRejectReason] = useState('');

    const fetchRequests = async () => {
        try {
            setError(null);
            const res = await api.get('/gate/requests?status=PENDING');
            setRequests(res.data?.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || 'Failed to fetch pending requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchRequests();
            const interval = setInterval(fetchRequests, 60000);
            return () => clearInterval(interval);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const handleAction = (request: EntryRequest, type: 'APPROVE' | 'REJECT') => {
        setSelectedRequest(request);
        setRejectReason('');
        setModalConfig({ visible: true, type });
    };

    const confirmApprove = async () => {
        if (!selectedRequest) return;
        const requestId = selectedRequest.id;

        // Optimistic UI update
        const previousRequests = [...requests];
        setRequests(prev => prev.filter(req => req.id !== requestId));
        setModalConfig({ ...modalConfig, visible: false });
        setSelectedRequest(null);

        try {
            await api.patch(`/gate/requests/${requestId}/approve`);
            // Toast could be added here if there was a toast library
        } catch (err: any) {
            console.error(err);
            setRequests(previousRequests); // Revert on failure
            Alert.alert('Error', err?.response?.data?.message || 'Failed to approve request');
        }
    };

    const confirmReject = async () => {
        if (!selectedRequest) return;
        const requestId = selectedRequest.id;
        const reason = rejectReason.trim() || 'Not expecting anyone';

        const previousRequests = [...requests];
        setRequests(prev => prev.filter(req => req.id !== requestId));
        setModalConfig({ ...modalConfig, visible: false });
        setSelectedRequest(null);
        setRejectReason('');

        try {
            await api.patch(`/gate/requests/${requestId}/reject`, { reason });
        } catch (err: any) {
            console.error(err);
            setRequests(previousRequests);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to reject request');
        }
    };

    const renderItem = ({ item }: { item: EntryRequest }) => {
        // Simple countdown logic (display minutes left)
        const expiresAt = new Date(item.expiresAt).getTime();
        const now = new Date().getTime();
        const minsLeft = Math.max(0, Math.floor((expiresAt - now) / 60000));

        return (
            <Card className="mb-4 overflow-hidden border-0 shadow-md">
                <View className="flex-row p-4 gap-4 items-center bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                    <View className="h-14 w-14 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center overflow-hidden">
                        <Ionicons name="person" size={28} color="#9ca3af" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.visitorName}</Text>
                            {minsLeft > 0 ? (
                                <View className="bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md">
                                    <Text className="text-red-600 dark:text-red-400 text-xs font-bold">{minsLeft}m left</Text>
                                </View>
                            ) : (
                                <StatusBadge status={item.status} />
                            )}
                        </View>
                        <Text className="text-gray-500 dark:text-gray-400 capitalize font-medium">{item.type.toLowerCase().replace('_', ' ')}</Text>
                        <Text className="text-xs text-gray-400 mt-1">
                            Requested {new Date(item.createdAt).toLocaleTimeString()}
                        </Text>
                    </View>
                </View>

                {item.status === 'PENDING' && minsLeft > 0 && (
                    <View className="flex-row p-4 bg-gray-50 dark:bg-zinc-900/50 gap-3">
                        <View className="flex-1">
                            <PrimaryButton
                                title="Reject"
                                variant="danger"
                                className="bg-red-50 dark:bg-red-900/20 py-3"
                                onPress={() => handleAction(item, 'REJECT')}
                            />
                        </View>
                        <View className="flex-1">
                            <PrimaryButton
                                title="Approve"
                                className="bg-green-600 active:bg-green-700 py-3"
                                onPress={() => handleAction(item, 'APPROVE')}
                            />
                        </View>
                    </View>
                )}
            </Card>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </SafeAreaView>
        );
    }

    if (error && requests.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center p-6 gap-4">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-gray-600 dark:text-gray-400 text-center">{error}</Text>
                <PrimaryButton title="Retry" onPress={() => { setLoading(true); fetchRequests(); }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Visitor Approvals</Text>
            </View>

            <FlatList
                data={requests}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20, paddingBottom: 100, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                onRefresh={onRefresh}
                refreshing={refreshing}
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-10 opacity-70">
                        <Ionicons name="shield-checkmark-outline" size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">All Caught Up!</Text>
                        <Text className="text-sm text-gray-500 text-center">No pending approvals at the moment.</Text>
                    </View>
                }
            />

            <Modal
                visible={modalConfig.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalConfig({ ...modalConfig, visible: false })}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-6">
                    <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                        {modalConfig.type === 'APPROVE' ? (
                            <>
                                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Approve Entry?</Text>
                                <Text className="text-gray-500 dark:text-gray-400 mb-6">
                                    Allow {selectedRequest?.visitorName} to enter?
                                </Text>
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => setModalConfig({ ...modalConfig, visible: false })}
                                        className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-zinc-800 items-center"
                                    >
                                        <Text className="font-semibold text-gray-600 dark:text-gray-300">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmApprove}
                                        className="flex-1 py-3.5 rounded-xl bg-green-600 items-center"
                                    >
                                        <Text className="font-bold text-white">Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reject Entry?</Text>
                                <Text className="text-gray-500 dark:text-gray-400 mb-4">
                                    Provide a reason for rejecting {selectedRequest?.visitorName}.
                                </Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-gray-900 dark:text-white mb-4 h-24"
                                    multiline
                                    textAlignVertical="top"
                                    placeholder="e.g. Not expecting anyone"
                                    placeholderTextColor="#9ca3af"
                                    value={rejectReason}
                                    onChangeText={setRejectReason}
                                />
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => setModalConfig({ ...modalConfig, visible: false })}
                                        className="flex-1 py-3.5 rounded-xl bg-gray-100 dark:bg-zinc-800 items-center"
                                    >
                                        <Text className="font-semibold text-gray-600 dark:text-gray-300">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmReject}
                                        className="flex-1 py-3.5 rounded-xl bg-red-600 items-center"
                                    >
                                        <Text className="font-bold text-white">Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
