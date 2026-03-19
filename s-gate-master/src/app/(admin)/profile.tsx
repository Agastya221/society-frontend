import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface ProfileData {
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
    societyId?: string;
    flatId?: string;
    flat?: { number: string; block: { name: string } };
    society?: { name: string; address: string; city: string };
}

export default function AdminProfile() {
    const router = useRouter();
    const { user: authUser, logout } = useAuthStore();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit modal
    const [editVisible, setEditVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        try {
            const res = await api.get('/api/v1/auth/resident-app/profile');
            setProfile(res.data?.data ?? null);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            // Fall back to auth store user
        } finally {
            setLoading(false);
        }
    };

    // Use profile from API, fall back to Zustand store
    const user = profile || authUser;

    if (loading && !authUser) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black items-center justify-center" edges={['top']}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
                <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-500">Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const displayName = profile?.name ?? authUser?.name ?? '';
    const displayRole = profile?.role ?? authUser?.role ?? '';
    const displayEmail = profile?.email ?? authUser?.email ?? '';
    const displayPhone = profile?.phone ?? authUser?.phone ?? '';
    const displaySociety = profile?.society?.name ?? authUser?.society?.name ?? 'N/A';
    const displaySocietyAddress = profile?.society
        ? `${profile.society.address}, ${profile.society.city}`
        : '';
    const displayFlat = profile?.flat
        ? `${profile.flat.block.name} - ${profile.flat.number}`
        : authUser?.flat
            ? `${authUser.flat.block?.name ?? ''} - ${authUser.flat.number}`
            : '';

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => await logout(),
            },
        ]);
    };

    const openEditModal = () => {
        setEditName(displayName);
        setEditEmail(displayEmail);
        setEditVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        setSaving(true);
        try {
            const res = await api.patch('/api/v1/auth/resident-app/profile', {
                name: editName.trim(),
                email: editEmail.trim() || undefined,
            });
            const updated = res.data?.data;
            if (updated) {
                setProfile(updated);
                // Sync to Zustand store
                useAuthStore.setState({
                    user: {
                        ...authUser!,
                        name: updated.name,
                        email: updated.email,
                    },
                });
            }
            setEditVisible(false);
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const MenuItem = ({ icon, label, onPress, isDanger = false }: any) => (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-zinc-800"
        >
            <View className="flex-row items-center gap-3">
                <View className={`h-8 w-8 rounded-full items-center justify-center ${
                    isDanger ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-100 dark:bg-zinc-800'
                }`}>
                    <Ionicons
                        name={icon}
                        size={16}
                        color={isDanger ? '#ef4444' : '#6b7280'}
                    />
                </View>
                <Text className={`font-medium ${
                    isDanger ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                }`}>
                    {label}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} color="#6b7280" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Profile</Text>
            </View>

            <ScrollView className="flex-1 p-5">
                {/* Profile Header */}
                <View className="items-center mb-8">
                    <View className="h-24 w-24 bg-indigo-500 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-zinc-900 shadow-sm">
                        <Text className="text-4xl font-bold text-white">
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                        <View className="bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 rounded-full">
                            <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">{displayRole}</Text>
                        </View>
                        <Text className="text-gray-500 dark:text-gray-400">{displaySociety}</Text>
                    </View>
                    {displaySocietyAddress ? (
                        <Text className="text-gray-400 text-xs mt-1">{displaySocietyAddress}</Text>
                    ) : null}

                    <TouchableOpacity
                        onPress={openEditModal}
                        className="mt-4 bg-indigo-50 px-4 py-2 rounded-full flex-row items-center gap-1.5"
                    >
                        <Ionicons name="pencil" size={14} color="#4f46e5" />
                        <Text className="text-indigo-600 font-semibold text-sm">Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Info Card */}
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Account Information</Text>
                <Card className="p-4 mb-6">
                    <View className="gap-4">
                        <View>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</Text>
                            <Text className="text-base text-gray-900 dark:text-white font-medium">{displayEmail || 'Not set'}</Text>
                        </View>
                        <View>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</Text>
                            <Text className="text-base text-gray-900 dark:text-white font-medium">{displayPhone}</Text>
                        </View>
                        {displayFlat ? (
                            <View>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Flat</Text>
                                <Text className="text-base text-gray-900 dark:text-white font-medium">{displayFlat}</Text>
                            </View>
                        ) : null}
                        <View>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">User ID</Text>
                            <Text className="text-base text-gray-900 dark:text-white font-medium font-mono">{profile?.id ?? authUser?.id ?? ''}</Text>
                        </View>
                    </View>
                </Card>

                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Settings & Support</Text>
                <Card className="p-0 mb-6 px-4">
                    <MenuItem
                        icon="notifications"
                        label="Notifications"
                        onPress={() => {}}
                    />
                    <MenuItem
                        icon="shield-checkmark"
                        label="Security"
                        onPress={() => {}}
                    />
                    <MenuItem
                        icon="help-circle"
                        label="Help & Support"
                        onPress={() => {}}
                    />
                    <View className="h-[1px] bg-gray-100 dark:bg-zinc-800 my-1" />
                    <MenuItem
                        icon="log-out"
                        label="Logout"
                        isDanger
                        onPress={handleLogout}
                    />
                </Card>

                <Text className="text-center text-xs text-gray-400 mb-8">
                    Version 1.0.0 (Build 124)
                </Text>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6" edges={['top']}>
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Edit Profile</Text>
                        <TouchableOpacity onPress={() => setEditVisible(false)}>
                            <Ionicons name="close" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Name</Text>
                    <TextInput
                        className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Your name"
                        placeholderTextColor="#a1a1aa"
                    />

                    <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Email</Text>
                    <TextInput
                        className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 text-zinc-900 dark:text-white"
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="email@example.com"
                        placeholderTextColor="#a1a1aa"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <PrimaryButton
                        title="Save Changes"
                        onPress={handleSaveProfile}
                        loading={saving}
                        disabled={saving}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
