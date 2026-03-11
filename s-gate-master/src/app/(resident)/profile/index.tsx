import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/useAuthStore';

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

function MenuItem({ icon, label, sublabel, onPress, isDanger = false, delay = 0 }: any) {
    const scale = useSharedValue(1);

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
            entering={FadeInUp.delay(delay).springify()}
            style={[animatedStyle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            className="mb-3"
        >
            <GlassCard className="flex-row items-center justify-between p-4 bg-white/60">
                <View className="flex-row items-center gap-4">
                    <View className={clsx("h-10 w-10 rounded-xl items-center justify-center", isDanger ? "bg-red-50" : "bg-indigo-50")}>
                        <Ionicons 
                            name={icon} 
                            size={20} 
                            color={isDanger ? '#ef4444' : '#6366f1'} 
                        />
                    </View>
                    <View>
                        <Text className={clsx("font-semibold text-base", isDanger ? "text-red-600" : "text-slate-800")}>{label}</Text>
                        {sublabel && <Text className="text-slate-400 text-xs">{sublabel}</Text>}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </GlassCard>
        </AnimatedPressable>
    );
}

export default function ResidentProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { logout, user } = useAuthStore();

    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Logout', 
                style: 'destructive', 
                onPress: () => logout()
            }
        ]);
    };

    const renderHeader = () => (
        <View className="px-5 pt-2 pb-6 flex-row items-center gap-4 z-10">
             <TouchableOpacity 
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/80 shadow-sm border border-slate-200 items-center justify-center active:scale-95"
            >
                <Ionicons name="arrow-back" size={20} color="#64748b" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-slate-900 tracking-tight">My Profile</Text>
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
                  <View className="absolute top-[100px] right-[50px] w-[300px] h-[300px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
             </View>

            <View style={{ paddingTop: insets.top + 10 }} className="flex-1">
                {renderHeader()}

                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Profile Header */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} className="items-center mb-10 mt-2">
                        <View className="relative">
                            <View className="h-28 w-28 bg-white rounded-full items-center justify-center overflow-hidden border-4 border-white shadow-lg shadow-indigo-100">
                                <Image 
                                    source={{ uri: `https://avatar.iran.liara.run/public/boy?username=${user?.name || 'Resident'}` }} 
                                    className="h-full w-full"
                                />
                            </View>
                            <View className="absolute bottom-0 right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-50" />
                        </View>
                        
                        <Text className="text-2xl font-bold text-slate-900 mt-4">{user?.name || 'Resident'}</Text>
                        
                        <View className="flex-row items-center gap-2 mt-2">
                            <View className="bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
                                <Text className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{user?.role || 'RESIDENT'}</Text>
                            </View>
                            <Text className="text-slate-500 font-medium">Flat A-101 • S-Gate Residency</Text>
                        </View>
                    </Animated.View>

                    {/* Menu Sections */}
                    <View className="mb-2 ml-1">
                         <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">My Household</Text>
                    </View>
                   
                    <MenuItem 
                        icon="people" 
                        label="Family Members" 
                        sublabel="Manage updates and permissions"
                        delay={200}
                        onPress={() => router.push('/(resident)/family')} 
                    />
                     <MenuItem 
                        icon="key" 
                        label="My Vehicles" 
                        sublabel="Register cars and bikes"
                        delay={300}
                        onPress={() => {}} 
                    />
                     <MenuItem 
                        icon="paw" 
                        label="Pets" 
                        sublabel="Pet details and vaccination"
                        delay={400}
                        onPress={() => {}} 
                    />

                    <View className="mb-2 mt-6 ml-1">
                         <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Settings & Support</Text>
                    </View>

                    <MenuItem 
                        icon="notifications" 
                        label="Notifications" 
                        sublabel="Customize alert preferences"
                        delay={500}
                        onPress={() => {}} 
                    />
                    <MenuItem 
                        icon="document-text" 
                        label="Agreements" 
                        sublabel="Rental and ownership docs"
                        delay={600}
                        onPress={() => {}} 
                    />
                    <MenuItem 
                        icon="help-circle" 
                        label="Help & Support" 
                        sublabel="FAQs and support chat"
                        delay={700}
                        onPress={() => {}} 
                    />
                    
                    <View className="h-6" />

                    <MenuItem 
                        icon="log-out" 
                        label="Logout" 
                        isDanger 
                        delay={800}
                        onPress={handleLogout} 
                    />

                    <Text className="text-center text-xs text-slate-400 mt-6 mb-8 font-medium">
                        Version 1.0.0 (Build 124)
                    </Text>
                </ScrollView>
            </View>
        </View>
    );
}
