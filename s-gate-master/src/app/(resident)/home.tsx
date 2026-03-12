import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MOCK_APPROVALS } from '../../mocks/approvals';
import { MOCK_NOTICES } from '../../mocks/notices';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';

// --- Reusable Components (Copied from Admin Dashboard for consistency) ---

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

function QuickAction({ icon, label, route, badge, color, delay }: any) {
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

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(delay).springify()}
            style={[animatedStyle, { width: '48%' }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push(route)}
            className="mb-4"
        >
            <GlassCard className="p-4 items-center gap-3">
                 <View className={clsx("h-14 w-14 rounded-full items-center justify-center bg-white shadow-sm", color ? 'bg-red-50' : '')}>
                    <Ionicons 
                        name={icon} 
                        size={26} 
                        className={color || "text-slate-600"} 
                    />
                </View>
                <Text className="font-bold text-slate-700 text-sm text-center">{label}</Text>
                {badge > 0 ? (
                    <View className="absolute top-3 right-3 bg-rose-500 min-w-[20px] h-5 rounded-full items-center justify-center px-1.5 shadow-sm">
                        <Text className="text-white text-[10px] font-bold">{badge}</Text>
                    </View>
                ) : null}
            </GlassCard>
        </AnimatedPressable>
    );
}

// --- Main Screen ---

export default function ResidentHomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    
    // API State
    const [pendingApprovals, setPendingApprovals] = useState(0);

    const pulseValue = useSharedValue(1);

    React.useEffect(() => {
        if (pendingApprovals > 0) {
            pulseValue.value = withRepeat(
                withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            pulseValue.value = withTiming(1);
        }
    }, [pendingApprovals]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseValue.value }],
    }));

    useFocusEffect(
        useCallback(() => {
            const fetchPendingCount = async () => {
                try {
                    const res = await api.get('/gate/requests/pending-count');
                    setPendingApprovals(res.data?.data?.pendingCount || 0);
                } catch (err: any) {
                    console.error('Failed to fetch pending count:', err);
                }
            };
            fetchPendingCount();
        }, [])
    );

    const recentNotices = MOCK_NOTICES.slice(0, 2);

    const quickActions = [
        { 
            icon: 'checkmark-circle-outline', 
            label: 'Approvals', 
            route: '/(resident)/approvals',
            badge: pendingApprovals 
        },
        { 
            icon: 'alert-circle-outline', 
            label: 'Complaints', 
            route: '/(resident)/complaints',
        },
        { 
            icon: 'qr-code-outline', 
            label: 'Gate Pass', 
            route: '/(resident)/gate-passes' 
        },
        { 
            icon: 'people-outline', 
            label: 'Pre-Approve', 
            route: '/(resident)/pre-approvals/create' 
        },
        { 
            icon: 'warning-outline', 
            label: 'Emergency', 
            route: '/(resident)/emergency',
            color: 'text-red-500' 
        },
    ];

    const renderHeader = () => (
        <View className="pb-6">
            {/* Urgent Emergency Button */}
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push('/(resident)/emergency/create')}
                className="mb-8 flex-row items-center justify-center bg-red-600 p-4 rounded-2xl shadow-lg shadow-red-200"
            >
                <View className="bg-red-500 h-10 w-10 rounded-full items-center justify-center mr-3 border border-red-400">
                    <Ionicons name="warning" size={24} color="white" />
                </View>
                <View>
                    <Text className="text-white font-bold text-lg leading-tight uppercase tracking-wider">Raise Emergency</Text>
                    <Text className="text-red-100 text-xs font-medium">Alert guards instantly</Text>
                </View>
                <View className="ml-auto">
                    <Ionicons name="chevron-forward" size={24} color="white" />
                </View>
            </TouchableOpacity>

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).springify()} className="mb-8 mt-2 flex-row justify-between items-center">
                <View>
                    <Text className="text-slate-500 font-medium text-lg mb-1">Welcome back,</Text>
                    <Text className="text-3xl font-bold text-slate-900 tracking-tight">{user?.name || 'Resident'}</Text>
                    <Text className="text-indigo-600 font-semibold text-xs mt-1 bg-indigo-50 self-start px-2 py-1 rounded-lg border border-indigo-100">
                        Block A-101 • Owner
                    </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(resident)/profile')} className="bg-white h-12 w-12 rounded-full items-center justify-center shadow-sm border border-slate-100">
                     <Ionicons name="person" size={22} color="#475569" />
                </TouchableOpacity>
            </Animated.View>

            {/* Quick Stats: Pending Approvals */}
            {pendingApprovals > 0 && (
                <AnimatedPressable 
                    entering={FadeInDown.delay(200).springify()}
                    onPress={() => router.push('/(resident)/approvals')} 
                    className="mb-8"
                >
                    <Animated.View style={pulseStyle}>
                        <GlassCard className="flex-row items-center justify-between p-5 border-l-4 border-l-red-500 bg-red-50/80 shadow-md">
                            <View className="flex-row items-center gap-4">
                                <View className="bg-red-100 p-3 rounded-full">
                                    <Ionicons name="notifications" size={24} className="text-red-600" />
                                </View>
                                <View>
                                    <Text className="text-slate-900 font-bold text-xl">{pendingApprovals} Pending</Text>
                                    <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide">Visitor approvals waiting</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} className="text-red-400" />
                        </GlassCard>
                    </Animated.View>
                </AnimatedPressable>
            )}

            {/* Quick Actions Grid */}
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Quick Actions</Text>
            <View className="flex-row flex-wrap justify-between mb-8">
                {quickActions.map((action, index) => (
                    <QuickAction 
                        key={index}
                        {...action}
                        delay={300 + (index * 100)}
                    />
                ))}
            </View>

            {/* Recent Notices */}
            <View className="flex-row justify-between items-center mb-4 px-1">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Community Board</Text>
                <TouchableOpacity onPress={() => router.push('/(resident)/notices')}>
                    <Text className="text-indigo-600 text-xs font-bold">View All</Text>
                </TouchableOpacity>
            </View>
            
            <View className="gap-4 mb-8">
                {recentNotices.map((notice, index) => (
                    <Animated.View key={notice.id} entering={FadeInRight.delay(500 + (index * 100)).springify()}>
                        <GlassCard className="p-4">
                            <View className="flex-row justify-between items-start mb-2">
                                 <View className="flex-1 mr-2 opacity-90">
                                    <Text className="font-bold text-slate-800 text-base mb-1" numberOfLines={1}>{notice.title}</Text>
                                    <Text className="text-slate-400 text-[10px] font-medium uppercase">{new Date(notice.createdAt).toLocaleDateString()}</Text>
                                 </View>
                                 <PriorityBadge priority={notice.priority} />
                            </View>
                            <Text className="text-slate-600 text-sm leading-relaxed" numberOfLines={2}>
                                {notice.content}
                            </Text>
                        </GlassCard>
                    </Animated.View>
                ))}
            </View>

            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 ml-1">Recent Entries</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-50">
            {/* Animated Background */}
            <LinearGradient
                colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
             
             {/* Ambient Background Glows */}
             <View className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none">
                  <View className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
                  <View className="absolute top-[100px] -left-[50px] w-[300px] h-[300px] bg-sky-200/40 rounded-full blur-3xl opacity-50" />
             </View>

            <FlatList
                data={MOCK_APPROVALS.slice(0, 5)}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                     <Animated.View entering={FadeInDown.delay(700 + (index * 100)).springify()} className="mb-3">
                        <GlassCard className="flex-row items-center p-4 gap-4">
                            <View className="h-12 w-12 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
                                <Ionicons name="person" size={20} color="#94a3b8" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-slate-900 text-base">{item.visitorName}</Text>
                                <Text className="text-slate-500 text-xs font-medium capitalize mt-0.5">{item.visitorType.toLowerCase()}</Text>
                            </View>
                            <View className="items-end gap-1.5">
                                <StatusBadge status={item.status} />
                                <Text className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}
            />
        </View>
    );
}
