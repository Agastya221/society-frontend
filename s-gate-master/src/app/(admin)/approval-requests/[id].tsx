import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SourceBadge } from '../../../components/SourceBadge';
import { StatusBadge } from '../../../components/StatusBadge';
import { MOCK_APPROVAL_REQUESTS } from '../../../data';

export default function ApprovalRequestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const request = MOCK_APPROVAL_REQUESTS.find(r => r.id === id);

    if (!request) {
        return (
            <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-[#0f0f11]">
                <Text className="text-zinc-500">Request not found</Text>
            </View>
        );
    }

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ENTRY': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
            case 'GATE_PASS': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
            case 'SPECIAL_ACCESS': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
            default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-[#0f0f11]">
            {/* Header */}
            <View className="bg-white dark:bg-zinc-900 px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center gap-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} className="text-zinc-900 dark:text-white" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-zinc-900 dark:text-white flex-1">
                    Request Details
                </Text>
            </View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}
            >
                {/* Status Header */}
                <View className="bg-white dark:bg-zinc-900 rounded-2xl p-6 mb-4 border border-zinc-200 dark:border-zinc-800">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-2">
                            <View className={`px-3 py-1.5 rounded-lg ${getTypeColor(request.type)}`}>
                                <Text className="text-sm font-bold uppercase">
                                    {request.type.replace('_', ' ')}
                                </Text>
                            </View>
                            <SourceBadge source={request.source} />
                        </View>
                        <StatusBadge status={request.status} />
                    </View>

                    <Text className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        {request.title}
                    </Text>
                    <Text className="text-base text-zinc-600 dark:text-zinc-400">
                        {request.description}
                    </Text>
                </View>

                {/* Request Information */}
                <View className="bg-white dark:bg-zinc-900 rounded-2xl p-6 mb-4 border border-zinc-200 dark:border-zinc-800">
                    <Text className="text-sm font-bold text-zinc-900 dark:text-white mb-4 uppercase tracking-wide">
                        Request Information
                    </Text>

                    <InfoRow icon="home" label="Flat Number" value={request.flatNumber} />
                    <InfoRow icon="user" label="Requested By" value={request.requestedBy} />
                    <InfoRow icon="clock" label="Created At" value={formatDate(request.createdAt)} />
                    <InfoRow icon="refresh-cw" label="Updated At" value={formatDate(request.updatedAt)} />
                </View>

                {/* Decision Information (if approved/rejected) */}
                {request.status !== 'PENDING' && (
                    <View className="bg-white dark:bg-zinc-900 rounded-2xl p-6 mb-4 border border-zinc-200 dark:border-zinc-800">
                        <Text className="text-sm font-bold text-zinc-900 dark:text-white mb-4 uppercase tracking-wide">
                            Decision Information
                        </Text>

                        {request.approvedBy && (
                            <InfoRow 
                                icon={request.status === 'APPROVED' ? 'check-circle' : 'x-circle'} 
                                label={request.status === 'APPROVED' ? 'Approved By' : 'Rejected By'} 
                                value={request.approvedBy} 
                            />
                        )}
                        
                        {request.decisionAt && (
                            <InfoRow 
                                icon="calendar" 
                                label="Decision Date" 
                                value={formatDate(request.decisionAt)} 
                            />
                        )}

                        {request.rejectionReason && (
                            <View className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                                <Text className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                                    REJECTION REASON
                                </Text>
                                <Text className="text-sm text-red-900 dark:text-red-100">
                                    {request.rejectionReason}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Action Buttons for PENDING requests */}
                {request.status === 'PENDING' && request.source === 'ADMIN' && (
                    <View className="gap-3">
                        <TouchableOpacity
                            className="bg-indigo-600 py-4 rounded-xl items-center shadow-sm"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-base">
                                Edit Request
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900 py-4 rounded-xl items-center"
                            activeOpacity={0.8}
                        >
                            <Text className="text-red-700 dark:text-red-400 font-bold text-base">
                                Cancel Request
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View className="flex-row items-center py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <View className="flex-row items-center gap-2 flex-1">
                <Feather name={icon as any} size={16} className="text-zinc-400" />
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {label}
                </Text>
            </View>
            <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                {value}
            </Text>
        </View>
    );
}
