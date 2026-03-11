import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { MOCK_ADMIN_PROFILE } from '../../data';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminProfile() {
    const router = useRouter();
    const { user: authUser, logout } = useAuthStore();
    
    // Use authenticated user or fall back to mock data for testing
    const user = authUser || MOCK_ADMIN_PROFILE;

    // Safety check - should never happen but prevents crash
    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
                <View className="flex-1 items-center justify-center">
                    <Text className="text-gray-500">Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Logout', 
                style: 'destructive', 
                onPress: async () => await logout()
            }
        ]);
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
                            {user.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white">{String(user.name)}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                        <View className="bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 rounded-full">
                            <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">{String(user.role)}</Text>
                        </View>
                        <Text className="text-gray-500 dark:text-gray-400">{String(user.society || 'N/A')}</Text>
                    </View>
                </View>

                {/* Account Info Card */}
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Account Information</Text>
                <Card className="p-4 mb-6">
                    <View className="gap-4">
                        <View>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</Text>
                            <Text className="text-base text-gray-900 dark:text-white font-medium">{String(user.email)}</Text>
                        </View>
                        {user.phone && (
                            <View>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</Text>
                                <Text className="text-base text-gray-900 dark:text-white font-medium">{String(user.phone)}</Text>
                            </View>
                        )}
                        <View>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">User ID</Text>
                            <Text className="text-base text-gray-900 dark:text-white font-medium font-mono">{String(user.id)}</Text>
                        </View>
                        {user.societyId && (
                            <View>
                                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Society ID</Text>
                                <Text className="text-base text-gray-900 dark:text-white font-medium font-mono">{String(user.societyId)}</Text>
                            </View>
                        )}
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
        </SafeAreaView>
    );
}
