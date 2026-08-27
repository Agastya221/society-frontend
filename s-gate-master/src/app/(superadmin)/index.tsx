import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

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

export default function SuperAdminDashboard() {
    const router = useRouter();
    const logout = useAuthStore((s) => s.logout);
    const user = useAuthStore((s) => s.user);

    const [pendingCount, setPendingCount] = useState(0);
    const [approvedCount, setApprovedCount] = useState(0);
    const [rejectedCount, setRejectedCount] = useState(0);
    const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Reject modal
    const [rejectTarget, setRejectTarget] = useState<RegistrationRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchAll();
        }, [])
    );

    const fetchAll = async () => {
        try {
            const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
                api.get('/society-registration/requests', { params: { status: 'PENDING', page: 1, limit: 5 } }),
                api.get('/society-registration/requests', { params: { status: 'APPROVED', page: 1, limit: 1 } }),
                api.get('/society-registration/requests', { params: { status: 'REJECTED', page: 1, limit: 1 } }),
            ]);
            setPendingRequests(pendingRes.data?.data?.requests ?? pendingRes.data?.data ?? []);
            setPendingCount(pendingRes.data?.data?.pagination?.total ?? pendingRes.data?.pagination?.total ?? 0);
            setApprovedCount(approvedRes.data?.data?.pagination?.total ?? approvedRes.data?.pagination?.total ?? 0);
            setRejectedCount(rejectedRes.data?.data?.pagination?.total ?? rejectedRes.data?.pagination?.total ?? 0);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    const handleApprove = (req: RegistrationRequest) => {
        AppAlert.show(
            'Approve Society',
            `Approve "${req.societyName}"? The contact person will become an ADMIN.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await api.post(`/society-registration/requests/${req.id}/approve`);
                            setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                            setPendingCount((c) => Math.max(0, c - 1));
                            setApprovedCount((c) => c + 1);
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
        if (!rejectReason.trim() || !rejectTarget) return;
        setActionLoading(true);
        try {
            await api.post(`/society-registration/requests/${rejectTarget.id}/reject`, {
                rejectionReason: rejectReason.trim(),
            });
            setPendingRequests((prev) => prev.filter((r) => r.id !== rejectTarget.id));
            setPendingCount((c) => Math.max(0, c - 1));
            setRejectedCount((c) => c + 1);
            setRejectTarget(null);
            setRejectReason('');
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        AppAlert.show('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => logout() },
        ]);
    };

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return d;
        }
    };

    const StatCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: keyof typeof Feather.glyphMap }) => {
        const bgMap: Record<string, string> = { amber: 'bg-amber-50', emerald: 'bg-emerald-50', red: 'bg-red-50' };
        const iconBgMap: Record<string, string> = { amber: 'bg-amber-100', emerald: 'bg-emerald-100', red: 'bg-red-100' };
        const textMap: Record<string, string> = { amber: '#d97706', emerald: '#059669', red: '#dc2626' };
        const labelMap: Record<string, string> = { amber: 'text-amber-700', emerald: 'text-emerald-700', red: 'text-red-700' };

        return (
            <View className={`flex-1 ${bgMap[color]} rounded-2xl p-4 border border-slate-100`}>
                <View className={`w-9 h-9 ${iconBgMap[color]} rounded-xl items-center justify-center mb-3`}>
                    <Feather name={icon} size={18} color={textMap[color]} />
                </View>
                <Text className="text-2xl font-bold text-slate-900">{loading ? '—' : value}</Text>
                <Text className={`text-xs font-semibold ${labelMap[color]} mt-0.5`}>{label}</Text>
            </View>
        );
    };

    const renderHeader = () => (
        <View>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
                <View>
                    <Text className="text-2xl font-bold text-slate-900">S-Gate Platform</Text>
                    <Text className="text-slate-400 text-sm mt-0.5">Super Admin Dashboard</Text>
                </View>
                <TouchableOpacity
                    onPress={handleLogout}
                    className="w-10 h-10 bg-white rounded-xl items-center justify-center border border-slate-200"
                >
                    <Feather name="log-out" size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {/* Stats Row */}
            <View className="flex-row gap-3 mb-8">
                <StatCard label="Pending" value={pendingCount} color="amber" icon="clock" />
                <StatCard label="Approved" value={approvedCount} color="emerald" icon="check-circle" />
                <StatCard label="Rejected" value={rejectedCount} color="red" icon="x-circle" />
            </View>

            {/* Section Header */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-slate-900">Pending Approvals</Text>
                {pendingCount > 5 && (
                    <TouchableOpacity onPress={() => router.push('/(superadmin)/requests')}>
                        <Text className="text-indigo-600 text-sm font-semibold">View All</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderFooter = () => (
        <View className="mt-4 mb-8">
            <TouchableOpacity
                onPress={() => router.push('/(superadmin)/requests')}
                className="bg-white border border-slate-200 rounded-2xl py-4 items-center flex-row justify-center gap-2"
                activeOpacity={0.7}
            >
                <Feather name="list" size={18} color="#4f46e5" />
                <Text className="text-indigo-600 font-semibold text-base">View All Requests</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View className="bg-white rounded-2xl border border-slate-100 p-8 items-center">
                <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-4">
                    <Feather name="check-circle" size={32} color="#059669" />
                </View>
                <Text className="text-slate-700 font-semibold text-base mb-1">All caught up!</Text>
                <Text className="text-slate-400 text-sm text-center">No pending requests right now.</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 items-center justify-center">
                <AppLoader />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
            <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => router.push(`/(superadmin)/requests/${item.id}`)}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-start justify-between mb-2">
                            <View className="flex-1 mr-3">
                                <Text className="text-base font-bold text-slate-900">{item.societyName}</Text>
                                <Text className="text-slate-400 text-sm mt-0.5">{item.city}, {item.state}</Text>
                            </View>
                            <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                                <Text className="text-amber-700 text-xs font-bold">PENDING</Text>
                            </View>
                        </View>

                        <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2 mb-3">
                            <View className="flex-row items-center gap-1">
                                <Feather name="user" size={12} color="#94a3b8" />
                                <Text className="text-slate-500 text-xs">{item.contactName}</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Feather name="phone" size={12} color="#94a3b8" />
                                <Text className="text-slate-500 text-xs">{item.contactPhone}</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Feather name="grid" size={12} color="#94a3b8" />
                                <Text className="text-slate-500 text-xs">{item.totalFlats} flats</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <Feather name="calendar" size={12} color="#94a3b8" />
                                <Text className="text-slate-500 text-xs">{formatDate(item.createdAt)}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => handleApprove(item)}
                                className="flex-1 bg-emerald-600 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5"
                                activeOpacity={0.8}
                            >
                                <Feather name="check" size={16} color="#fff" />
                                <Text className="text-white font-semibold text-sm">Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setRejectTarget(item); setRejectReason(''); }}
                                className="flex-1 bg-red-50 border border-red-200 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5"
                                activeOpacity={0.8}
                            >
                                <Feather name="x" size={16} color="#dc2626" />
                                <Text className="text-red-600 font-semibold text-sm">Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* Reject Modal */}
            <Modal visible={!!rejectTarget} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl font-bold text-slate-900">Reject Registration</Text>
                            <TouchableOpacity onPress={() => setRejectTarget(null)}>
                                <Feather name="x" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        {rejectTarget && (
                            <Text className="text-slate-500 text-sm mb-4">
                                Rejecting “{rejectTarget.societyName}” by {rejectTarget.contactName}
                            </Text>
                        )}
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
