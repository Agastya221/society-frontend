import { Ionicons } from '@expo/vector-icons';
import clsx from 'clsx';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useAuthStore } from '../../../store/useAuthStore';
import api from '../../../services/api';

// --- Reusable Components ---

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

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
    
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [editModal, setEditModal] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                try {
                    const res = await api.get('/auth/resident-app/profile');
                    setProfile(res.data?.data);
                } catch (err) {
                    // Fall back to stored user data implicitly on render
                    console.log(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProfile();
        }, [])
    );

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

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await api.patch('/auth/resident-app/profile', {
                name: editData.name.trim() || undefined,
                email: editData.email.trim() || undefined,
            });
            setProfile(res.data?.data);
            setEditModal(false);
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const displayUser = profile || user || {};

    const renderHeader = () => (
        <View className="px-5 pt-2 pb-6 flex-row items-center justify-between z-10">
            <View className="flex-row items-center gap-4">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white/80 shadow-sm border border-slate-200 items-center justify-center active:scale-95"
                >
                    <Ionicons name="arrow-back" size={20} color="#64748b" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-slate-900 tracking-tight">My Profile</Text>
            </View>
            <TouchableOpacity 
                onPress={() => {
                    setEditData({ name: displayUser.name || '', email: displayUser.email || '' });
                    setEditModal(true);
                }}
                className="w-10 h-10 rounded-full bg-indigo-50 shadow-sm border border-indigo-100 items-center justify-center active:scale-95"
            >
                <Ionicons name="pencil" size={18} color="#4f46e5" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-50">
             <LinearGradient
                colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
             <View className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none">
                  <View className="absolute top-[100px] right-[50px] w-[300px] h-[300px] bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
             </View>

            <View style={{ paddingTop: insets.top + 10 }} className="flex-1">
                {renderHeader()}

                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    <Animated.View entering={FadeInDown.delay(100).springify()} className="items-center mb-10 mt-2">
                        <View className="relative">
                            <View className="h-28 w-28 bg-white rounded-full items-center justify-center overflow-hidden border-4 border-white shadow-lg shadow-indigo-100">
                                {displayUser.photoUrl ? (
                                    <Image source={{ uri: displayUser.photoUrl }} className="h-full w-full" />
                                ) : (
                                    <Image 
                                        source={{ uri: `https://avatar.iran.liara.run/public/boy?username=${displayUser.name || 'Resident'}` }} 
                                        className="h-full w-full"
                                    />
                                )}
                            </View>
                            <View className="absolute bottom-0 right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-50" />
                        </View>
                        
                        <Text className="text-2xl font-bold text-slate-900 mt-4">{displayUser.name || 'Resident'}</Text>
                        
                        <View className="flex-row items-center gap-2 mt-2 flex-wrap justify-center px-4">
                            <View className="bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 mb-1">
                                <Text className="text-xs font-bold text-indigo-700 uppercase tracking-wide">{displayUser.role || 'RESIDENT'}</Text>
                            </View>
                            <Text className="text-slate-500 font-medium mb-1">
                                {displayUser.flat?.number ? `Flat ${displayUser.flat.number} • ${displayUser.flat.block?.name || ''}` : 'No Flat Assigned'}
                            </Text>
                            {displayUser.society?.name && (
                                <Text className="text-slate-500 font-medium w-full text-center">
                                    {displayUser.society.name}
                                </Text>
                            )}
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
                </ScrollView>
            </View>

            {/* Edit Profile Modal */}
            <Modal
                visible={editModal}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModal(false)}
            >
                <View className="flex-1 justify-end bg-black/40">
                    <View className="bg-white rounded-t-3xl p-6 shadow-xl pb-10">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModal(false)} className="p-2 bg-gray-100 rounded-full">
                                <Ionicons name="close" size={20} color="#4b5563" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Full Name</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 font-medium text-gray-900 text-base"
                            value={editData.name}
                            onChangeText={(t) => setEditData({...editData, name: t})}
                            placeholder="John Doe"
                        />

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email Address</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-8 font-medium text-gray-900 text-base"
                            value={editData.email}
                            onChangeText={(t) => setEditData({...editData, email: t})}
                            placeholder="john@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            onPress={handleSaveProfile}
                            disabled={saving}
                            className={`py-4 rounded-xl items-center shadow-sm ${saving ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                        >
                            <Text className="font-bold text-white text-base">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
