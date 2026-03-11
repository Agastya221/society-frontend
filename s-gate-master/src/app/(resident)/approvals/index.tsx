import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { MOCK_APPROVALS } from '../../../mocks/approvals';
import { ApprovalRequest, ApprovalStatus } from '../../../mocks/types';

export default function ApprovalsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<ApprovalRequest[]>(MOCK_APPROVALS);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        type: 'APPROVE' | 'REJECT';
    }>({ visible: false, type: 'APPROVE' });

    const handleAction = (request: ApprovalRequest, type: 'APPROVE' | 'REJECT') => {
        setSelectedRequest(request);
        setModalConfig({ visible: true, type });
    };

    const confirmAction = (reason?: string) => {
        if (!selectedRequest) return;

        const newStatus: ApprovalStatus = modalConfig.type === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        
        // Update local state to simulate backend change
        setRequests(prev => prev.map(req => 
            req.id === selectedRequest.id 
                ? { ...req, status: newStatus, rejectionReason: reason } 
                : req
        ));

        setModalConfig({ ...modalConfig, visible: false });
        setSelectedRequest(null);
    };

    const renderItem = ({ item }: { item: ApprovalRequest }) => (
        <Card className="mb-4 overflow-hidden border-0 shadow-md">
            {/* Header / Top Info */}
            <View className="flex-row p-4 gap-4 items-center bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <View className="h-14 w-14 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center overflow-hidden">
                     <Ionicons name="person" size={28} color="#9ca3af" />
                </View>
                <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.visitorName}</Text>
                        <StatusBadge status={item.status} />
                    </View>
                    <Text className="text-gray-500 dark:text-gray-400 capitalize font-medium">{item.visitorType.toLowerCase()}</Text>
                    <Text className="text-xs text-gray-400 mt-1">
                        Requested {new Date(item.requestedAt).toLocaleString()}
                    </Text>
                </View>
            </View>

            {/* Action Buttons - Only for PENDING */}
            {item.status === 'PENDING' && (
                <View className="flex-row p-4 bg-gray-50 dark:bg-zinc-900/50 gap-3">
                    <View className="flex-1">
                        <PrimaryButton 
                            title="Reject" 
                            variant="danger" 
                            className="bg-red-50 dark:bg-red-900/20 py-3"
                            onPress={() => handleAction(item, 'REJECT')}
                        />
                        {/* Custom styled text for the outline button inside to override defaults if needed, 
                            but component handles it. Here we use 'danger' variant on button but maybe we want custom outline style for red text.
                            Actually, PrimaryButton 'danger' gives white text on red bg. 
                            Let's use 'outline' with custom classes for red text to make it less aggressive visually if needed, 
                            OR stick to solid red for clear "Stop" signal. The prompt says "Rejection always requires a reason".
                        */}
                    </View>
                    <View className="flex-1">
                        <PrimaryButton 
                            title="Approve" 
                            className="bg-green-600 active:bg-green-700 py-3" // Override color to green
                            onPress={() => handleAction(item, 'APPROVE')}
                        />
                    </View>
                </View>
            )}

            {/* Show Reason if Rejected */}
            {item.status === 'REJECTED' && item.rejectionReason && (
                <View className="p-3 bg-red-50 dark:bg-red-900/10 m-4 rounded-lg mt-0">
                    <Text className="text-red-800 dark:text-red-300 text-xs font-medium">Rejection Reason:</Text>
                    <Text className="text-red-600 dark:text-red-400 text-sm">{item.rejectionReason}</Text>
                </View>
            )}
        </Card>
    );

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
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            />

            <ConfirmationModal
                visible={modalConfig.visible}
                title={modalConfig.type === 'APPROVE' ? 'Approve Entry?' : 'Reject Entry?'}
                message={modalConfig.type === 'APPROVE' 
                    ? `Are you sure you want to allow ${selectedRequest?.visitorName} to enter?`
                    : `Please provide a reason for rejecting ${selectedRequest?.visitorName}.`
                }
                variant={modalConfig.type === 'APPROVE' ? 'primary' : 'danger'}
                requireReason={modalConfig.type === 'REJECT'}
                confirmText={modalConfig.type === 'APPROVE' ? 'Yes, Approve' : 'Reject Entry'}
                onConfirm={confirmAction}
                onCancel={() => setModalConfig({ ...modalConfig, visible: false })}
            />
        </SafeAreaView>
    );
}
