import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    StyleSheet
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { useAuthStore } from '../../../store/useAuthStore';
import * as profileService from '../../../services/profile.service';
import { MainLayout } from '../../../layouts/MainLayout';
import * as Haptics from 'expo-haptics';

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();

    const [profile, setProfile] = useState<any>(null);
    const [familyCount, setFamilyCount] = useState(0);

    // Stats
    const [stats, setStats] = useState({ visitors: 0, deliveries: 0, alerts: 0 });

    // Edit modal
    const [editModal, setEditModal] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [saving, setSaving] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                const [profileRes, familyRes] = await Promise.allSettled([
                    profileService.getProfile(),
                    profileService.getFamilyMembers(),
                ]);
                if (cancelled) return;
                if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
                if (familyRes.status === 'fulfilled')
                    setFamilyCount(familyRes.value.length);
            })();
            return () => {
                cancelled = true;
            };
        }, []),
    );

    const displayUser = profile ?? user ?? ({} as any);
    const flatInfo = displayUser.flat?.number
        ? `${displayUser.flat.block?.name ?? ''}${displayUser.flat.block?.name ? '-' : ''}${displayUser.flat.number}${displayUser.society?.name ? ', ' + displayUser.society.name : ''}`
        : displayUser.society?.name ?? 'No flat assigned';

    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await profileService.updateProfile({
                name: editData.name.trim() || undefined,
                email: editData.email.trim() || undefined,
            });
            setProfile(updated);
            setEditModal(false);
        } catch (err: any) {
            Alert.alert(
                'Error',
                err?.response?.data?.message ?? 'Failed to update profile',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F4F5F7' }}>
            <MainLayout
                headerProps={{
                    variant: 'rapido',
                    title: 'Profile'
                }}
                backgroundColor="#F4F5F7"
            >
                <View className="px-4 pt-6 pb-10">
                    {/* Main Avatar Card */}
                    <View className="bg-white rounded-[32px] p-6 items-center shadow-sm mb-6" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 }}>
                        <View className="relative mb-4">
                            <View className="w-[100px] h-[100px] rounded-full border-[3px] border-[#F9C900] bg-gray-100 items-center justify-center">
                                <Text className="text-[32px] font-bold text-black">{getInitials(displayUser.name ?? 'U')}</Text>
                                {/* Uncomment if avatar images are available
                                <Image source={{ uri: 'https://i.pravatar.cc/150?img=47' }} className="w-full h-full rounded-full absolute" />
                                */}
                            </View>
                            <TouchableOpacity 
                                className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-full items-center justify-center border-2 border-white"
                                onPress={() => {
                                    setEditData({
                                        name: displayUser.name ?? '',
                                        email: displayUser.email ?? '',
                                    });
                                    setEditModal(true);
                                }}
                            >
                                <Ionicons name="pencil" size={14} color="#F9C900" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-[26px] font-bold text-[#1A1A1A] mb-1">{displayUser.name ?? 'Resident'}</Text>
                        <Text className="text-[14px] font-medium text-[#6B7280] mb-4 text-center px-4">{flatInfo}</Text>

                        <View className="bg-[#FFF8D6] px-4 py-2 rounded-full flex-row items-center">
                            <Ionicons name="checkmark-circle" size={16} color="#000" className="mr-1.5" />
                            <Text className="ml-1.5 text-black text-[12px] font-bold tracking-wider">PREMIUM RESIDENT</Text>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View className="flex-row justify-between mb-8">
                        <StatBox value={stats.visitors.toString().padStart(2, '0')} label="VISITORS" color="#1A1A1A" />
                        <StatBox value={stats.deliveries.toString().padStart(2, '0')} label="DELIVERIES" color="#1A1A1A" />
                        <StatBox value={stats.alerts.toString().padStart(2, '0')} label="ALERTS" color="#E11D48" />
                    </View>

                    {/* Preferences Section */}
                    <Text className="text-[12px] font-bold text-[#9CA3AF] tracking-widest mb-4 ml-2 mt-2">PREFERENCES</Text>

                    <PreferenceItem
                        icon="person-outline"
                        title="Account Info"
                        subtitle="Personal details and info"
                        onPress={() => {
                            setEditData({
                                name: displayUser.name ?? '',
                                email: displayUser.email ?? '',
                            });
                            setEditModal(true);
                        }}
                    />
                    <PreferenceItem
                        icon="shield-checkmark-outline"
                        title="Security Settings"
                        subtitle="Passwords and biometrics"
                        onPress={() => {}}
                    />
                    <PreferenceItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle="Alerts & push settings"
                        onPress={() => router.push('/(resident)/notifications' as any)}
                    />
                    <PreferenceItem
                        icon="people-outline"
                        title="Family Members"
                        subtitle={`${familyCount} member${familyCount !== 1 ? 's' : ''}`}
                        onPress={() => router.push('/(resident)/family' as any)}
                    />
                    <PreferenceItem
                        icon="time-outline"
                        title="Activity History"
                        subtitle="Visitor & entry log"
                        onPress={() => router.push('/(resident)/visitors' as any)}
                    />
                    <PreferenceItem
                        icon="log-out-outline"
                        title="Sign Out"
                        subtitle="Logout from device"
                        onPress={handleLogout}
                        iconColor="#E11D48"
                        textColor="#E11D48"
                        bgColor="#FFE4E6"
                    />

                </View>
            </MainLayout>

            {/* Edit Profile Modal */}
            <Modal
                visible={editModal}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModal(false)} style={styles.modalClose} hitSlop={8}>
                                <Feather name="x" size={20} color={SgateColors.t2} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>FULL NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={editData.name}
                            onChangeText={(t) => setEditData((p) => ({ ...p, name: t }))}
                            placeholder="Your name"
                            placeholderTextColor={SgateColors.t4}
                        />

                        <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                        <TextInput
                            style={styles.input}
                            value={editData.email}
                            onChangeText={(t) => setEditData((p) => ({ ...p, email: t }))}
                            placeholder="you@example.com"
                            placeholderTextColor={SgateColors.t4}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveBtnText}>
                                {saving ? 'Saving…' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Inline Components
function StatBox({ value, label, color }: { value: string, label: string, color: string }) {
    return (
        <View
            className="bg-white flex-1 mx-1.5 rounded-[24px] py-6 px-1 items-center justify-center shadow-sm"
            style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 }}
        >
            <Text className="text-[32px] font-bold mb-1" style={{ color }}>{value}</Text>
            <Text className="text-[11px] font-bold text-[#6B7280] tracking-wider text-center" numberOfLines={1}>{label}</Text>
        </View>
    );
}

function PreferenceItem({ icon, title, subtitle, onPress, iconColor = "#1A1A1A", textColor = "#1A1A1A", bgColor = "#FFF8D6" }: any) {
    return (
        <TouchableOpacity 
            className="bg-white flex-row items-center p-5 rounded-[24px] mb-3 shadow-sm active:bg-gray-50" 
            style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 }}
            onPress={onPress}
        >
            <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: bgColor }}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View className="flex-1 justify-center">
                <Text className="text-[16px] font-bold mb-0.5" style={{ color: textColor }}>{title}</Text>
                <Text className="text-[13px] text-[#6B7280]">{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
}

// Modal Styles
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    modalClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 0.5,
        marginBottom: 6,
        marginLeft: 2,
    },
    input: {
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        marginBottom: 16,
    },
    saveBtn: {
        backgroundColor: '#F9C900',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: '#000',
    },
});
