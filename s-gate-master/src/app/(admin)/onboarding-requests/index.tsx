import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/Card';
import { PrimaryButton } from '../../../components/PrimaryButton';
import api from '../../../services/api';

interface OnboardingRequest {
    id: string;
    userId: string;
    societyId: string;
    flatId: string;
    residentType: string;
    status: string;
    documents: { type: string; s3Key: string }[];
    user: { name: string; phone: string };
    flat: { number: string; block: { name: string } };
    createdAt: string;
}

type StatusTab = 'PENDING_APPROVAL' | 'RESUBMIT_REQUESTED' | 'APPROVED' | 'REJECTED';

const TABS: { key: StatusTab; label: string }[] = [
    { key: 'PENDING_APPROVAL', label: 'Pending' },
    { key: 'RESUBMIT_REQUESTED', label: 'Resubmit' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING_APPROVAL: { bg: 'bg-amber-100', text: 'text-amber-700' },
    RESUBMIT_REQUESTED: { bg: 'bg-orange-100', text: 'text-orange-700' },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-700' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function OnboardingRequestsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<StatusTab>('PENDING_APPROVAL');
    const [requests, setRequests] = useState<OnboardingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail modal
    const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);

    // Reject / Resubmit modal
    const [actionType, setActionType] = useState<'reject' | 'resubmit' | null>(null);
    const [reason, setReason] = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchRequests(activeTab);
        }, [activeTab])
    );

    const fetchRequests = async (status: StatusTab) => {
        try {
            const res = await api.get('/api/v1/resident/onboarding/admin/pending', {
                params: { status, page: 1, limit: 20 },
            });
            setRequests(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch onboarding requests:', err);
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchRequests(activeTab);
    };

    const handleTabChange = (tab: StatusTab) => {
        setActiveTab(tab);
        setLoading(true);
        fetchRequests(tab);
    };

    const openDetail = (req: OnboardingRequest) => {
        setSelectedRequest(req);
        setDetailVisible(true);
    };

    const handleApprove = (req: OnboardingRequest) => {
        Alert.alert('Approve Request', `Approve ${req.user.name}'s request to join?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    try {
                        await api.patch(`/api/v1/resident/onboarding/admin/${req.id}/approve`, {});
                        // Optimistic remove from pending list
                        setRequests(prev => prev.filter(r => r.id !== req.id));
                        setDetailVisible(false);
                        Alert.alert('Success', 'Request approved successfully');
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message || 'Failed to approve request');
                    }
                },
            },
        ]);
    };

    const openActionModal = (type: 'reject' | 'resubmit') => {
        setActionType(type);
        setReason('');
    };

    const handleActionSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert('Error', 'Please provide a reason');
            return;
        }
        if (!selectedRequest) return;

        setActionSubmitting(true);
        try {
            if (actionType === 'reject') {
                await api.patch(`/api/v1/resident/onboarding/admin/${selectedRequest.id}/reject`, {
                    reason: reason.trim(),
                });
            } else {
                await api.patch(`/api/v1/resident/onboarding/admin/${selectedRequest.id}/request-resubmit`, {
                    reason: reason.trim(),
                    documentsToResubmit: selectedRequest.documents.map(d => d.type),
                });
            }
            setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
            setActionType(null);
            setDetailVisible(false);
            Alert.alert('Success', actionType === 'reject' ? 'Request rejected' : 'Resubmission requested');
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Action failed');
        } finally {
            setActionSubmitting(false);
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

    const formatDocType = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="bg-white dark:bg-zinc-900 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-3 mb-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Onboarding Requests</Text>
                </View>

                {/* Tab Bar */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => handleTabChange(tab.key)}
                            className={`px-4 py-2 rounded-full ${
                                activeTab === tab.key ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-zinc-800'
                            }`}
                        >
                            <Text className={`text-sm font-medium ${
                                activeTab === tab.key ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center py-16">
                            <Feather name="inbox" size={48} color="#d1d5db" />
                            <Text className="text-gray-500 mt-4 text-base font-medium">No {activeTab === 'PENDING_APPROVAL' ? 'pending' : activeTab.toLowerCase().replace('_', ' ')} requests</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.PENDING_APPROVAL;
                        return (
                            <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.7}>
                                <Card className="mb-3">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-row items-center gap-3 flex-1">
                                            <View className="w-11 h-11 bg-indigo-100 rounded-full items-center justify-center">
                                                <Text className="text-indigo-700 font-bold text-base">
                                                    {item.user.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-base font-bold text-zinc-900 dark:text-white">{item.user.name}</Text>
                                                <Text className="text-zinc-500 text-sm">{item.user.phone}</Text>
                                            </View>
                                        </View>
                                        <View className={`px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                                            <Text className={`text-xs font-bold ${statusStyle.text}`}>
                                                {item.residentType}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center gap-4 mt-1">
                                        <View className="flex-row items-center gap-1">
                                            <Feather name="home" size={12} color="#71717a" />
                                            <Text className="text-zinc-500 text-xs">
                                                {item.flat.block.name} - {item.flat.number}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            <Feather name="calendar" size={12} color="#71717a" />
                                            <Text className="text-zinc-500 text-xs">{formatDate(item.createdAt)}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            <Feather name="file" size={12} color="#71717a" />
                                            <Text className="text-zinc-500 text-xs">{item.documents.length} docs</Text>
                                        </View>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {/* Detail Modal */}
            <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6" edges={['top']}>
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Request Details</Text>
                        <TouchableOpacity onPress={() => { setDetailVisible(false); setActionType(null); }}>
                            <Feather name="x" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    {selectedRequest && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Resident Info */}
                            <Card className="p-4 mb-4">
                                <Text className="text-xs text-gray-500 uppercase font-bold mb-3">Resident</Text>
                                <View className="gap-2">
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-500">Name</Text>
                                        <Text className="text-gray-900 dark:text-white font-medium">{selectedRequest.user.name}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-500">Phone</Text>
                                        <Text className="text-gray-900 dark:text-white font-medium">{selectedRequest.user.phone}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-500">Type</Text>
                                        <Text className="text-gray-900 dark:text-white font-medium">{selectedRequest.residentType}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-500">Flat</Text>
                                        <Text className="text-gray-900 dark:text-white font-medium">
                                            {selectedRequest.flat.block.name} - {selectedRequest.flat.number}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-500">Submitted</Text>
                                        <Text className="text-gray-900 dark:text-white font-medium">{formatDate(selectedRequest.createdAt)}</Text>
                                    </View>
                                </View>
                            </Card>

                            {/* Documents */}
                            <Card className="p-4 mb-4">
                                <Text className="text-xs text-gray-500 uppercase font-bold mb-3">Documents</Text>
                                {selectedRequest.documents.map((doc, i) => (
                                    <View key={i} className="flex-row items-center gap-3 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
                                        <View className="w-8 h-8 bg-indigo-100 rounded-lg items-center justify-center">
                                            <Feather name="file-text" size={16} color="#4f46e5" />
                                        </View>
                                        <Text className="text-gray-900 dark:text-white font-medium flex-1">
                                            {formatDocType(doc.type)}
                                        </Text>
                                        <View className="bg-green-100 px-2 py-0.5 rounded">
                                            <Text className="text-green-700 text-xs font-medium">Uploaded</Text>
                                        </View>
                                    </View>
                                ))}
                            </Card>

                            {/* Action Buttons - only for pending */}
                            {selectedRequest.status === 'PENDING_APPROVAL' && !actionType && (
                                <View className="gap-3 mb-6">
                                    <PrimaryButton
                                        title="Approve"
                                        onPress={() => handleApprove(selectedRequest)}
                                    />
                                    <PrimaryButton
                                        title="Reject"
                                        variant="danger"
                                        onPress={() => openActionModal('reject')}
                                    />
                                    <PrimaryButton
                                        title="Request Resubmit"
                                        variant="outline"
                                        onPress={() => openActionModal('resubmit')}
                                    />
                                </View>
                            )}

                            {/* Reject/Resubmit reason input */}
                            {actionType && (
                                <Card className="p-4 mb-6">
                                    <Text className="font-bold text-zinc-900 dark:text-white mb-2">
                                        {actionType === 'reject' ? 'Rejection Reason' : 'Resubmission Reason'}
                                    </Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 mb-4 text-zinc-900 dark:text-white h-24"
                                        multiline
                                        textAlignVertical="top"
                                        placeholder={actionType === 'reject' ? 'Why is this request being rejected?' : 'What needs to be corrected?'}
                                        value={reason}
                                        onChangeText={setReason}
                                        placeholderTextColor="#a1a1aa"
                                    />
                                    <View className="flex-row gap-3">
                                        <PrimaryButton
                                            title="Cancel"
                                            variant="secondary"
                                            onPress={() => setActionType(null)}
                                            className="flex-1"
                                        />
                                        <PrimaryButton
                                            title="Submit"
                                            variant={actionType === 'reject' ? 'danger' : 'primary'}
                                            onPress={handleActionSubmit}
                                            loading={actionSubmitting}
                                            disabled={actionSubmitting}
                                            className="flex-1"
                                        />
                                    </View>
                                </Card>
                            )}

                            <View className="h-10" />
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
