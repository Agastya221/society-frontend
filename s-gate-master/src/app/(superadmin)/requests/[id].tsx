import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
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
    updatedAt?: string;
    user: { name: string; phone: string };
}

export default function RequestDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [request, setRequest] = useState<RegistrationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Reject modal
    const [rejectVisible, setRejectVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const res = await api.get(`/society-registration/requests/${id}`);
            setRequest(res.data?.data?.request ?? res.data?.data ?? null);
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to load request');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = () => {
        if (!request) return;
        AppAlert.show(
            'Approve Society',
            `Approve "${request.societyName}"? The contact person will become an ADMIN.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await api.post(`/society-registration/requests/${id}/approve`);
                            AppAlert.show('Success', 'Society approved successfully', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (err: any) {
                            AppAlert.show('Error', err?.response?.data?.message || 'Failed to approve');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading(true);
        try {
            await api.post(`/society-registration/requests/${id}/reject`, {
                rejectionReason: rejectReason.trim(),
            });
            setRejectVisible(false);
            AppAlert.show('Done', 'Registration rejected', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return d;
        }
    };

    if (loading) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 items-center justify-center">
                <AppLoader />
            </SafeAreaView>
        );
    }

    if (!request) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 items-center justify-center">
                <Feather name="alert-circle" size={48} color="#d1d5db" />
                <Text className="text-slate-500 mt-4">Request not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-indigo-600 font-semibold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const isPending = request.status === 'PENDING';
    const isApproved = request.status === 'APPROVED';
    const isRejected = request.status === 'REJECTED';

    const InfoRow = ({ label, value }: { label: string; value: string }) => (
        <View className="flex-row justify-between py-2.5 border-b border-slate-50">
            <Text className="text-slate-400 text-sm">{label}</Text>
            <Text className="text-slate-900 text-sm font-medium text-right flex-1 ml-4">{value}</Text>
        </View>
    );

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-4 border-b border-slate-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-slate-900" numberOfLines={1}>
                            {request.societyName}
                        </Text>
                    </View>
                    <View
                        className={`px-3 py-1 rounded-full ${
                            isPending ? 'bg-amber-100' : isApproved ? 'bg-emerald-100' : 'bg-red-100'
                        }`}
                    >
                        <Text
                            className={`text-xs font-bold ${
                                isPending ? 'text-amber-700' : isApproved ? 'text-emerald-700' : 'text-red-700'
                            }`}
                        >
                            {request.status}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: isPending ? 140 : 40 }} showsVerticalScrollIndicator={false}>
                {/* Status Banners */}
                {isApproved && (
                    <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
                        <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center">
                            <Feather name="check-circle" size={20} color="#059669" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-emerald-800 font-bold text-sm">Approved</Text>
                            <Text className="text-emerald-600 text-xs mt-0.5">This society is now live on S-Gate.</Text>
                        </View>
                    </View>
                )}

                {isRejected && (
                    <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                        <View className="flex-row items-center gap-3 mb-2">
                            <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                                <Feather name="x-circle" size={20} color="#dc2626" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-red-800 font-bold text-sm">Rejected</Text>
                            </View>
                        </View>
                        {request.rejectionReason && (
                            <View className="bg-white border border-red-100 rounded-xl p-3 mt-1">
                                <Text className="text-red-700 text-sm">{request.rejectionReason}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Society Info */}
                <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Feather name="home" size={16} color="#4f46e5" />
                        <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Society Details</Text>
                    </View>
                    <InfoRow label="Name" value={request.societyName} />
                    <InfoRow label="Address" value={request.address} />
                    <InfoRow label="City" value={request.city} />
                    <InfoRow label="State" value={request.state} />
                    <InfoRow label="Pincode" value={request.pincode} />
                    <InfoRow label="Total Flats" value={String(request.totalFlats)} />
                    <InfoRow label="Monthly Fee" value={`₹${request.monthlyFee}`} />
                </View>

                {/* Contact Info */}
                <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Feather name="user" size={16} color="#4f46e5" />
                        <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Contact Person</Text>
                    </View>
                    <InfoRow label="Name" value={request.contactName} />
                    <InfoRow label="Phone" value={request.contactPhone} />
                    {request.contactEmail && <InfoRow label="Email" value={request.contactEmail} />}
                </View>

                {/* Submitted By */}
                <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                    <View className="flex-row items-center gap-2 mb-3">
                        <Feather name="send" size={16} color="#4f46e5" />
                        <Text className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Submitted By</Text>
                    </View>
                    <InfoRow label="User" value={request.user.name} />
                    <InfoRow label="Phone" value={request.user.phone} />
                    <InfoRow label="Submitted" value={formatDate(request.createdAt)} />
                </View>
            </ScrollView>

            {/* Action Buttons — only for PENDING */}
            {isPending && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 pb-8">
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={handleApprove}
                            disabled={actionLoading}
                            className="flex-1 bg-emerald-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                            activeOpacity={0.8}
                        >
                            {actionLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="check-circle" size={18} color="#fff" />
                                    <Text className="text-white font-bold text-base">Approve</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setRejectVisible(true); setRejectReason(''); }}
                            disabled={actionLoading}
                            className="flex-1 bg-red-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
                            activeOpacity={0.8}
                        >
                            <Feather name="x-circle" size={18} color="#fff" />
                            <Text className="text-white font-bold text-base">Reject</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Reject Modal */}
            <Modal visible={rejectVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl font-bold text-slate-900">Reject Registration</Text>
                            <TouchableOpacity onPress={() => setRejectVisible(false)}>
                                <Feather name="x" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-slate-500 text-sm mb-4">
                            Rejecting "{request.societyName}"
                        </Text>
                        <Text className="text-slate-700 font-medium text-sm mb-2">Reason for rejection *</Text>
                        <TextInput
                            className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 mb-4"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={{ minHeight: 100 }}
                            placeholder="Explain why this registration is being rejected..."
                            placeholderTextColor="#94a3b8"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />
                        <TouchableOpacity
                            onPress={handleRejectSubmit}
                            disabled={!rejectReason.trim() || actionLoading}
                            className={`rounded-xl py-3.5 items-center flex-row justify-center gap-2 ${
                                rejectReason.trim() && !actionLoading ? 'bg-red-600' : 'bg-slate-200'
                            }`}
                            activeOpacity={0.8}
                        >
                            {actionLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="x-circle" size={18} color={rejectReason.trim() ? '#fff' : '#94a3b8'} />
                                    <Text className={`font-bold text-base ${rejectReason.trim() ? 'text-white' : 'text-slate-400'}`}>
                                        Reject Registration
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
