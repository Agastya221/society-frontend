import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

interface OnboardingStatusData {
    status: string;
    requestId?: string;
    reason?: string;
    rejectionReason?: string;
}

const STATUS_CONFIG: Record<string, {
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    iconBg: string;
    borderColor: string;
    bgColor: string;
    title: string;
    titleColor: string;
}> = {
    PENDING_APPROVAL: {
        icon: 'clock',
        iconColor: '#d97706',
        iconBg: 'bg-amber-100',
        borderColor: 'border-amber-200',
        bgColor: 'bg-amber-50',
        title: 'Under Review',
        titleColor: 'text-amber-800',
    },
    RESUBMIT_REQUESTED: {
        icon: 'alert-triangle',
        iconColor: '#dc2626',
        iconBg: 'bg-red-100',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        title: 'Action Required',
        titleColor: 'text-red-800',
    },
    REJECTED: {
        icon: 'x-circle',
        iconColor: '#dc2626',
        iconBg: 'bg-red-100',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        title: 'Request Rejected',
        titleColor: 'text-red-800',
    },
    APPROVED: {
        icon: 'check-circle',
        iconColor: '#16a34a',
        iconBg: 'bg-green-100',
        borderColor: 'border-green-200',
        bgColor: 'bg-green-50',
        title: "You're All Set!",
        titleColor: 'text-green-800',
    },
};

export default function StatusScreen() {
    const router = useRouter();
    const [data, setData] = useState<OnboardingStatusData | null>(null);
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
            const res = await api.get('/resident/onboarding/status');
            const statusData: OnboardingStatusData = res.data?.data;
            setData(statusData);

            // Auto-complete if approved
            if (statusData?.status === 'APPROVED') {
                await handleApproved();
            }

            // Start polling for pending
            if (statusData?.status === 'PENDING_APPROVAL') {
                startPolling();
            }
        } catch (err) {
            console.error('Failed to fetch onboarding status:', err);
        } finally {
            setLoading(false);
        }
    };

    const startPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await api.get('/resident/onboarding/status');
                const statusData: OnboardingStatusData = res.data?.data;
                setData(statusData);

                if (statusData?.status === 'APPROVED') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    await handleApproved();
                } else if (statusData?.status !== 'PENDING_APPROVAL') {
                    if (pollRef.current) clearInterval(pollRef.current);
                }
            } catch {
                // Silently retry on next poll
            }
        }, 30000);
    };

    const handleApproved = async () => {
        await SecureStore.setItemAsync('requiresOnboarding', 'false');
        await SecureStore.setItemAsync('onboardingStatus', 'COMPLETED');
        useAuthStore.setState({ requiresOnboarding: false, onboardingStatus: 'COMPLETED' });
        // Refresh JWT so it contains societyId/flatId for society-scoped API calls
        await useAuthStore.getState().refreshAccessToken();
    };

    const handleGoHome = () => {
        router.replace('/(resident)/home');
    };

    if (loading) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50 items-center justify-center">
                <AppLoader />
            </SafeAreaView>
        );
    }

    const status = data?.status ?? 'PENDING_APPROVAL';
    const config = STATUS_CONFIG[status];
    const reason = data?.reason || data?.rejectionReason;

    // Draft / Pending docs — redirect to continue
    if (status === 'DRAFT' || status === 'PENDING_DOCS') {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50 items-center justify-center px-6">
                <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center mb-4">
                    <Feather name="edit-3" size={36} color="#4f46e5" />
                </View>
                <Text className="text-gray-900 font-bold text-xl mb-2">Complete Your Application</Text>
                <Text className="text-gray-500 text-center text-sm mb-8">
                    Your onboarding application is incomplete. Continue where you left off.
                </Text>
                <TouchableOpacity
                    onPress={() => router.replace('/(onboarding)/society-search')}
                    className="bg-indigo-600 px-8 py-4 rounded-2xl"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-base">Continue</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!config) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50 items-center justify-center px-6">
                <Text className="text-gray-500">Unknown status: {status}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            <View className="flex-1 items-center justify-center px-6">
                {/* Status Icon */}
                <View className={`w-24 h-24 ${config.iconBg} rounded-full items-center justify-center mb-6`}>
                    <Feather name={config.icon} size={48} color={config.iconColor} />
                </View>

                {/* Status Card */}
                <View className={`w-full ${config.bgColor} border ${config.borderColor} rounded-2xl p-6 items-center mb-6`}>
                    <Text className={`${config.titleColor} font-bold text-xl mb-2`}>{config.title}</Text>

                    {status === 'PENDING_APPROVAL' && (
                        <>
                            <Text className="text-amber-700 text-center text-sm leading-5">
                                Your request is under review by the society admin.
                            </Text>
                            <Text className="text-amber-600 text-center text-xs mt-3">
                                We'll notify you once it's approved.
                            </Text>
                            <View className="flex-row items-center gap-2 mt-4 bg-amber-100 px-4 py-2 rounded-full">
                                <ActivityIndicator size="small" color="#d97706" />
                                <Text className="text-amber-700 text-xs font-medium">Auto-refreshing...</Text>
                            </View>
                        </>
                    )}

                    {status === 'RESUBMIT_REQUESTED' && (
                        <>
                            <Text className="text-red-700 text-center text-sm leading-5">
                                Please resubmit your documents with the corrections noted below.
                            </Text>
                            {reason && (
                                <View className="bg-white border border-red-100 rounded-xl p-3 mt-3 w-full">
                                    <Text className="text-red-600 text-sm">{reason}</Text>
                                </View>
                            )}
                        </>
                    )}

                    {status === 'REJECTED' && (
                        <>
                            <Text className="text-red-700 text-center text-sm leading-5">
                                Unfortunately, your request has been rejected.
                            </Text>
                            {reason && (
                                <View className="bg-white border border-red-100 rounded-xl p-3 mt-3 w-full">
                                    <Text className="text-red-600 text-sm">{reason}</Text>
                                </View>
                            )}
                        </>
                    )}

                    {status === 'APPROVED' && (
                        <Text className="text-green-700 text-center text-sm leading-5">
                            Your onboarding is complete. Welcome to your society!
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                {status === 'RESUBMIT_REQUESTED' && (
                    <TouchableOpacity
                        onPress={() => router.replace('/(onboarding)/society-search')}
                        className="bg-indigo-600 w-full py-4 rounded-2xl items-center"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-base">Resubmit Documents</Text>
                    </TouchableOpacity>
                )}

                {status === 'REJECTED' && (
                    <TouchableOpacity
                        onPress={() => router.replace('/(onboarding)/index' as any)}
                        className="bg-indigo-600 w-full py-4 rounded-2xl items-center"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-base">Start Over</Text>
                    </TouchableOpacity>
                )}

                {status === 'APPROVED' && (
                    <TouchableOpacity
                        onPress={handleGoHome}
                        className="bg-green-600 w-full py-4 rounded-2xl items-center"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-base">Go to Home</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Logout at bottom */}
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
