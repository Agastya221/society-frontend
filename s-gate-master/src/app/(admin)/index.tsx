import { Feather } from '@expo/vector-icons';
import clsx from 'clsx';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeInDown,
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

interface DashboardStats {
    totalFlats: number;
    occupiedFlats: number;
    activeResidents: number;
    todayEntries: number;
    pendingComplaints: number;
}

// --- Reusable Components ---

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

function GlassCard({ children, className, intensity = 80 }: { children: React.ReactNode, className?: string, intensity?: number }) {
    return (
        <View className={clsx("overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-sm", className)}>
            <BlurView intensity={intensity} tint="light" className="absolute inset-0" />
            <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']}
                className="absolute inset-0"
            />
            {children}
        </View>
    );
}

function ActionButton({ title, icon, route, color, delay, badge }: any) {
    const scale = useSharedValue(1);
    const router = useRouter();

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const handlePress = () => {
        router.push(route);
    };

    // Extract color name for text coloring (simple heuristic)
    const iconColorClass = color.includes('amber') ? 'text-amber-600' :
                          color.includes('indigo') ? 'text-indigo-600' :
                          color.includes('emerald') ? 'text-emerald-600' :
                          color.includes('orange') ? 'text-orange-600' :
                          color.includes('teal') ? 'text-teal-600' :
                          color.includes('rose') ? 'text-rose-600' : 'text-slate-600';

    const iconBgClass = color.replace('bg-', 'bg-opacity-10 bg-');

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(delay).springify()}
            style={[animatedStyle, { width: '48%', aspectRatio: 1.1 }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            className="mb-4"
        >
            <GlassCard className="h-full justify-between p-4">
                <View className={clsx("w-12 h-12 rounded-2xl items-center justify-center", iconBgClass)}>
                    <Feather name={icon} size={24} className={iconColorClass} />
                </View>
                <View>
                    <Text className="text-slate-800 font-bold text-lg">{title}</Text>
                    <Text className="text-slate-500 text-xs mt-1 font-medium">Manage {title}</Text>
                </View>

                {badge ? (
                    <View className="absolute top-3 right-3 bg-rose-500 w-5 h-5 rounded-full items-center justify-center shadow-sm">
                        <Text className="text-white text-[10px] font-bold">{badge}</Text>
                    </View>
                ) : null}
            </GlassCard>
        </AnimatedPressable>
    );
}

function StatsWidget({ title, value, icon, accent, delay, trend }: any) {
    const iconColor = accent === 'blue' ? '#3b82f6' :
                     accent === 'emerald' ? '#10b981' :
                     accent === 'purple' ? '#8b5cf6' : '#f97316';

    return (
        <Animated.View
            entering={FadeInRight.delay(delay).springify()}
            className="w-[48%] mb-3"
        >
            <GlassCard className="p-4" intensity={60}>
                <View className="flex-row justify-between items-start mb-3">
                    <View className="p-2.5 rounded-xl bg-white shadow-sm">
                        <Feather name={icon} size={18} color={iconColor} />
                    </View>
                    {trend && (
                        <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Text className="text-[10px] font-bold text-emerald-700">{trend}</Text>
                        </View>
                    )}
                </View>
                <Text className="text-3xl font-bold text-slate-800 mb-0.5">{value}</Text>
                <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</Text>
            </GlassCard>
        </Animated.View>
    );
}

// --- Main Dashboard ---

export default function AdminDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuthStore();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [])
    );

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/api/v1/admin/reports/dashboard');
            setStats(res.data?.data ?? null);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            // Silently fall back to zeros
            setStats({ totalFlats: 0, occupiedFlats: 0, activeResidents: 0, todayEntries: 0, pendingComplaints: 0 });
        } finally {
            setLoadingStats(false);
        }
    };

    const quickLinks = [
        { title: 'Gate Passes', icon: 'check-circle', route: '/(admin)/gate-passes', color: 'bg-amber-500' },
        { title: 'Residents', icon: 'users', route: '/(admin)/onboarding-requests', color: 'bg-indigo-500', badge: stats?.pendingComplaints ? undefined : undefined },
        { title: 'Guards', icon: 'shield', route: '/(admin)/guards', color: 'bg-emerald-500' },
        { title: 'Complaints', icon: 'alert-circle', route: '/(admin)/complaints', color: 'bg-orange-500', badge: stats?.pendingComplaints || undefined },
        { title: 'Notices', icon: 'bell', route: '/(admin)/notices', color: 'bg-teal-500' },
        { title: 'Profile', icon: 'user', route: '/(admin)/profile', color: 'bg-rose-500' },
    ];

    const displayVal = (val: number | undefined) => loadingStats ? '—' : String(val ?? 0);

    const renderHeader = () => (
        <View className="pb-6">
            <Animated.View entering={FadeInDown.delay(100).springify()} className="mb-8 mt-4">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-slate-500 font-medium text-lg mb-1">Welcome back,</Text>
                        <Text className="text-3xl font-bold text-slate-900 tracking-tight">
                            {user?.name || 'Admin'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/profile')}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center shadow-sm"
                    >
                         <Feather name="user" size={20} color="#475569" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap gap-3 mb-8">
                <StatsWidget title="Total Flats" value={displayVal(stats?.totalFlats)} icon="home" accent="blue" delay={200} />
                <StatsWidget title="Residents" value={displayVal(stats?.activeResidents)} icon="users" accent="emerald" delay={300} trend="Active" />
                <StatsWidget title="Entries Today" value={displayVal(stats?.todayEntries)} icon="activity" accent="orange" delay={400} />
                <StatsWidget title="Complaints" value={displayVal(stats?.pendingComplaints)} icon="alert-circle" accent="purple" delay={500} />
            </View>

            {/* Quick Actions */}
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Quick Actions</Text>
            <View className="flex-row flex-wrap justify-between">
                {quickLinks.map((link, index) => (
                    <ActionButton
                        key={link.title}
                        {...link}
                        delay={600 + (index * 100)}
                    />
                ))}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-50">
             {/* Animated Background */}
            <LinearGradient
                colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0"
            />

            {/* Ambient Background Glows */}
            <View className="absolute top-0 left-0 w-full h-[500px] overflow-hidden">
                 <View className="absolute -top-[100px] -left-[100px] w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
                 <View className="absolute top-[50px] -right-[50px] w-[300px] h-[300px] bg-sky-200/40 rounded-full blur-3xl opacity-50" />
                 <View className="absolute top-[200px] left-[100px] w-[250px] h-[250px] bg-rose-100/40 rounded-full blur-3xl opacity-40" />
            </View>

            <FlatList
                data={[]}
                renderItem={null}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
