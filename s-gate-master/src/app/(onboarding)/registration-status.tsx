import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

interface RegistrationStatusData {
    status: string;
    request?: {
        id: string;
        societyName: string;
        rejectionReason?: string;
    };
}

export default function RegistrationStatusScreen() {
    const router = useRouter();
    const [data, setData] = useState<RegistrationStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchStatus();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/v1/society-registration/my-status');
            const statusData: RegistrationStatusData = res.data?.data;
            setData(statusData);

            if (statusData?.status === 'NOT_SUBMITTED') {
                router.replace('/(onboarding)/register-society');
                return;
            }

            if (statusData?.status === 'APPROVED') {
                await handleApproved(statusData);
            }

            if (statusData?.status === 'PENDING') {
                startPolling();
            }
        } catch (err) {
            console.error('Failed to fetch registration status:', err);
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await api.get('/api/v1/society-registration/my-status');
                const statusData: RegistrationStatusData = res.data?.data;
                setData(statusData);

                if (statusData?.status === 'APPROVED') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    await handleApproved(statusData);
                } else if (statusData?.status !== 'PENDING') {
                    if (pollRef.current) clearInterval(pollRef.current);
                }
            } catch {
                // Silently retry on next poll
            }
        }, 30000);
    };

    const handleApproved = async (_data: RegistrationStatusData) => {
        await SecureStore.setItemAsync('requiresOnboarding', 'false');
        await SecureStore.setItemAsync('onboardingStatus', 'COMPLETED');
        useAuthStore.setState({
            requiresOnboarding: false,
            onboardingStatus: 'COMPLETED',
            role: 'ADMIN',
        });
        // Refresh JWT so it contains the new ADMIN role
        await useAuthStore.getState().refreshAccessToken();
    };

    const handleGoToAdmin = () => {
        router.replace('/(admin)');
    };

    if (loading) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text className="text-gray-400 mt-4 text-sm">Checking registration status...</Text>
            </SafeAreaView>
        );
    }

    const status = data?.status ?? 'PENDING';
    const societyName = data?.request?.societyName ?? 'Your Society';
    const rejectionReason = data?.request?.rejectionReason;

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            <View className="flex-1 items-center justify-center px-6">
                {/* PENDING */}
                {status === 'PENDING' && (
                    <>
                        <View className="w-24 h-24 bg-amber-100 rounded-full items-center justify-center mb-6">
                            <Feather name="clock" size={48} color="#d97706" />
                        </View>
                        <View className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-6 items-center mb-6">
                            <Text className="text-amber-800 font-bold text-xl mb-3">Under Review</Text>
                            <Text className="text-amber-700 text-center text-sm leading-5 mb-3">
                                Your society registration for{' '}
                                <Text className="font-bold">{societyName}</Text>
                                {' '}is being reviewed by the S-Gate team.
                            </Text>
                            <Text className="text-amber-600 text-center text-xs leading-5">
                                This usually takes 1-2 business days. We'll notify you when it's approved.
                            </Text>
                            <View className="flex-row items-center gap-2 mt-4 bg-amber-100 px-4 py-2 rounded-full">
                                <ActivityIndicator size="small" color="#d97706" />
                                <Text className="text-amber-700 text-xs font-medium">Auto-refreshing...</Text>
                            </View>
                        </View>
                    </>
                )}

                {/* APPROVED */}
                {status === 'APPROVED' && (
                    <>
                        <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                            <Feather name="check-circle" size={48} color="#16a34a" />
                        </View>
                        <View className="w-full bg-green-50 border border-green-200 rounded-2xl p-6 items-center mb-6">
                            <Text className="text-green-800 font-bold text-xl mb-3">Society Approved!</Text>
                            <Text className="text-green-700 text-center text-sm leading-5">
                                You are now the admin of{' '}
                                <Text className="font-bold">{societyName}</Text>.
                                {'\n'}Start managing your society from the admin dashboard.
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleGoToAdmin}
                            className="bg-green-600 w-full py-4 rounded-2xl items-center"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-base">Go to Admin Dashboard</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* REJECTED */}
                {status === 'REJECTED' && (
                    <>
                        <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-6">
                            <Feather name="x-circle" size={48} color="#dc2626" />
                        </View>
                        <View className="w-full bg-red-50 border border-red-200 rounded-2xl p-6 items-center mb-6">
                            <Text className="text-red-800 font-bold text-xl mb-3">Request Rejected</Text>
                            <Text className="text-red-700 text-center text-sm leading-5">
                                Your society registration request has been rejected.
                            </Text>
                            {rejectionReason && (
                                <View className="bg-white border border-red-100 rounded-xl p-3 mt-3 w-full">
                                    <Text className="text-red-600 text-sm">{rejectionReason}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => router.replace('/(onboarding)/register-society')}
                            className="bg-indigo-600 w-full py-4 rounded-2xl items-center"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-bold text-base">Apply Again</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Logout */}
            <View className="px-6 pb-8">
                <TouchableOpacity
                    onPress={() => useAuthStore.getState().logout()}
                    className="py-3 items-center"
                >
                    <Text className="text-gray-400 text-sm">Sign out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
