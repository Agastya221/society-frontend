import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';

type OnboardingStatus = 'PENDING_APPROVAL' | 'RESUBMIT_REQUESTED' | 'REJECTED' | 'APPROVED' | 'DRAFT' | 'PENDING_DOCS' | null;

export default function OnboardingIndex() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkExistingStatus();
    }, []);

    const checkExistingStatus = async () => {
        try {
            const res = await api.get('/resident/onboarding/status');
            const status: OnboardingStatus = res.data?.data?.status ?? null;

            if (status === 'PENDING_APPROVAL' || status === 'RESUBMIT_REQUESTED' || status === 'REJECTED') {
                router.replace('/(onboarding)/status');
                return;
            }
            if (status === 'APPROVED') {
                router.replace('/(onboarding)/status');
                return;
            }
        } catch {
            // No existing request — show choice screen
        } finally {
            setChecking(false);
        }
    };

    if (checking) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-white items-center justify-center">
                <AppLoader />
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1">
            <LinearGradient
                colors={['#4f46e5', '#6366f1', '#818cf8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            <SafeAreaView edges={['top']} className="flex-1">
                <View className="flex-1 px-6 justify-center">
                    {/* Header */}
                    <Animated.View entering={FadeInUp.delay(100).springify()} className="items-center mb-12">
                        <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-6">
                            <Feather name="home" size={48} color="white" />
                        </View>
                        <Text className="text-white text-3xl font-bold mb-2">Welcome to S-Gate</Text>
                        <Text className="text-indigo-200 text-base text-center leading-6">
                            Your community management starts here.{'\n'}How would you like to get started?
                        </Text>
                    </Animated.View>

                    {/* Option Cards */}
                    <Animated.View entering={FadeInDown.delay(250).springify()}>
                        <TouchableOpacity
                            onPress={() => router.push('/(onboarding)/society-search')}
                            className="bg-white rounded-2xl p-5 mb-4 shadow-lg"
                            activeOpacity={0.8}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="w-14 h-14 bg-indigo-100 rounded-xl items-center justify-center">
                                    <Feather name="search" size={26} color="#4f46e5" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-lg">Join Existing Society</Text>
                                    <Text className="text-gray-500 text-sm mt-1">Search and request to join your society</Text>
                                </View>
                                <Feather name="chevron-right" size={22} color="#9ca3af" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/(onboarding)/register-society')}
                            className="bg-white/15 border-2 border-white/30 rounded-2xl p-5"
                            activeOpacity={0.8}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="w-14 h-14 bg-white/20 rounded-xl items-center justify-center">
                                    <Feather name="plus-circle" size={26} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-bold text-lg">Register My Society</Text>
                                    <Text className="text-indigo-200 text-sm mt-1">Set up a new society on S-Gate</Text>
                                </View>
                                <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.5)" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}
