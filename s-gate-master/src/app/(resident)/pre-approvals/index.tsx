import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import api from '../../../services/api';

interface PreApproval {
    id: string;
    visitorName: string;
    visitorPhone?: string;
    visitorType: string;
    validFrom: string;
    validUntil: string;
    status: 'ACTIVE' | 'EXPIRED' | 'USED' | 'CANCELLED';
    qrToken: string;
    qrCodeUrl: string;
    usedCount: number;
    maxUses: number;
}

export default function PreApprovalsScreen() {
    const router = useRouter();
    const [preApprovals, setPreApprovals] = useState<PreApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedQr, setSelectedQr] = useState<string | null>(null);

    const fetchPreApprovals = async () => {
        try {
            setError(null);
            const res = await api.get('/gate/preapprovals');
            setPreApprovals(res.data?.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || 'Failed to fetch pre-approvals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchPreApprovals();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchPreApprovals();
    };

    const handleCancel = (id: string) => {
        Alert.alert(
            'Cancel Pre-Approval?',
            'Are you sure you want to cancel this pre-approval? The QR code will no longer work.',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel It',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.patch(`/gate/preapprovals/${id}/cancel`);
                            // Optimistic UI update
                            setPreApprovals(prev => prev.map(p => p.id === id ? { ...p, status: 'CANCELLED' } : p));
                        } catch (err: any) {
                            console.error(err);
                            Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel pre-approval');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: PreApproval['status']) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'USED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'EXPIRED': default: return 'bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:text-gray-400';
        }
    };

    const renderItem = ({ item }: { item: PreApproval }) => {
        const isActive = item.status === 'ACTIVE';

        return (
            <Card className="mb-4 overflow-hidden border-0 shadow-md">
                <View className="p-4 flex-row items-start justify-between bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                    <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                            <Text className={`font-bold text-lg ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                {item.visitorName}
                            </Text>
                            <View className={`px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                                <Text className={`text-[10px] font-bold tracking-wider ${getStatusColor(item.status)}`}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-2 mt-1">
                            <Text className="text-xs font-medium bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 self-start px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 capitalize">
                                {item.visitorType.toLowerCase().replace('_', ' ')}
                            </Text>
                            <Text className="text-xs text-gray-400 line-clamp-1 flex-1">
                                valid until {new Date(item.validUntil).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>

                {isActive && (
                    <View className="flex-row p-3 bg-gray-50 dark:bg-zinc-900/50 gap-3 border-t border-gray-100 dark:border-zinc-800">
                        <TouchableOpacity
                            onPress={() => setSelectedQr(item.qrCodeUrl)}
                            className="flex-1 flex-row items-center justify-center py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50"
                        >
                            <Ionicons name="qr-code" size={18} className="text-indigo-600 dark:text-indigo-400 mr-2" />
                            <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400">View QR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleCancel(item.id)}
                            className="flex-1 flex-row items-center justify-center py-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30"
                        >
                            <Ionicons name="close-circle" size={18} className="text-red-600 dark:text-red-400 mr-2" />
                            <Text className="text-sm font-bold text-red-600 dark:text-red-400">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Card>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center" edges={['top']}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </SafeAreaView>
        );
    }

    if (error && preApprovals.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center p-6 gap-4" edges={['top']}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-gray-600 dark:text-gray-400 text-center">{error}</Text>
                <PrimaryButton title="Retry" onPress={() => { setLoading(true); fetchPreApprovals(); }} />
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
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Pre-Approvals</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(resident)/pre-approvals/create')} className="bg-indigo-600 h-9 w-9 rounded-full items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={preApprovals}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                onRefresh={onRefresh}
                refreshing={refreshing}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    preApprovals.length > 0 ? (
                        <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4 px-1">
                            Pre-approved visitors can enter by showing their QR code to the guard.
                        </Text>
                    ) : null
                }
                ListEmptyComponent={
                    <View className="flex-1 items-center justify-center py-20 opacity-70">
                        <Ionicons name="qr-code-outline" size={64} className="text-gray-300 dark:text-zinc-700 mb-4" />
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No Pre-approvals</Text>
                        <Text className="text-sm text-gray-500 text-center px-10">No pre-approvals yet. Create one to effortlessly invite guests without manual approvals!</Text>
                        <View className="mt-6 w-full px-10">
                            <PrimaryButton title="Create Pre-Approval" onPress={() => router.push('/(resident)/pre-approvals/create')} />
                        </View>
                    </View>
                }
            />

            {/* QR Code Modal */}
            <Modal
                visible={!!selectedQr}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedQr(null)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center p-6">
                    <View className="bg-white rounded-3xl p-8 items-center border border-gray-100 shadow-xl w-full max-w-[340px]">
                        <Text className="text-lg font-bold text-gray-900 mb-1">Gate Pass QR Cache</Text>
                        <Text className="text-xs font-medium text-gray-500 mb-6 text-center">Share this QR code with your visitor</Text>
                        
                        <View className="p-4 border border-gray-200 rounded-2xl bg-white shadow-sm mb-8">
                            {selectedQr && (
                                <Image 
                                    source={{ uri: selectedQr }} 
                                    style={{ width: 220, height: 220 }}
                                    resizeMode="contain"
                                />
                            )}
                        </View>

                        <PrimaryButton 
                            title="Close" 
                            className="w-full"
                            onPress={() => setSelectedQr(null)} 
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
