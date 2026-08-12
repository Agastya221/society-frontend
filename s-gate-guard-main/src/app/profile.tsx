import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface Society {
    name: string;
    address: string;
    city: string;
    state?: string;
    pincode?: string;
}

interface GuardProfile {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
    lastLogin?: string;
    society?: Society;
    createdAt?: string;
}

export default function ProfileScreen() {
    const { logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<GuardProfile | null>(null);

    // Fetch latest profile from API
    useEffect(() => {
        api.get('/api/v1/auth/guard-app/profile')
            .then((res) => {
                const u = res.data?.data;
                if (!u) return;
                setProfile({
                    name: u.name,
                    id: u.id,
                    phone: u.phone,
                    role: u.role,
                    isActive: u.isActive,
                    photoUrl: u.photoUrl,
                    lastLogin: u.lastLogin,
                    society: u.society,
                    createdAt: u.createdAt,
                });
            })
            .catch((err) => {
                console.error('Failed to fetch profile', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        // Navigation handled by root layout
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.scrollContent}>
                    {/* Skeleton Header */}
                    <View style={styles.profileHeader}>
                        <View style={[styles.avatarContainer, { backgroundColor: '#F3F4F6', width: 96, height: 96, borderRadius: 48 }]} />
                        <View style={{ width: 140, height: 24, backgroundColor: '#F3F4F6', borderRadius: 12, marginBottom: 8 }} />
                        <View style={{ width: 100, height: 16, backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 12 }} />
                        <View style={{ width: 80, height: 28, backgroundColor: '#F3F4F6', borderRadius: 14 }} />
                    </View>
                    
                    {/* Skeleton Card */}
                    <View style={styles.infoCard}>
                        <View style={{ width: 120, height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, marginBottom: 20 }} />
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6' }} />
                                <View style={{ flex: 1 }}>
                                    <View style={{ width: 80, height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, marginBottom: 6 }} />
                                    <View style={{ width: '80%', height: 18, backgroundColor: '#F3F4F6', borderRadius: 9 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.errorText}>Could not load profile</Text>
                <Pressable onPress={handleLogout} style={styles.logoutButtonSmall}>
                    <Text style={styles.logoutButtonText}>Return to Login</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View>

                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={48} color={GuardColors.goldDeep} />
                            </View>
                            <View style={styles.statusIndicator}>
                                <View style={[styles.statusDot, { backgroundColor: profile.isActive ? '#10B981' : '#6B7280' }]} />
                            </View>
                        </View>

                        <View style={styles.profileIdentity}>
                            <Text style={styles.guardName}>{profile.name}</Text>
                            <Text style={styles.guardId}>Security team · ID {profile.id.slice(0, 8).toUpperCase()}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: profile.isActive ? '#D1FAE5' : '#F3F4F6', borderColor: profile.isActive ? '#A7F3D0' : '#E5E7EB' }]}>
                                <Text style={[styles.statusText, { color: profile.isActive ? '#047857' : '#374151' }]}>
                                    {profile.isActive ? 'ON DUTY' : 'INACTIVE'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ASSIGNMENT DETAILS */}
                    <View style={styles.infoCard}>
                        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="call" size={20} color={GuardColors.goldDeep} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Contact Number</Text>
                                <Text style={styles.infoValue}>{profile.phone}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="shield-checkmark" size={20} color={GuardColors.goldDeep} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Role</Text>
                                <Text style={styles.infoValue}>{profile.role}</Text>
                            </View>
                        </View>
                        
                        {profile.createdAt && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIcon}>
                                        <Ionicons name="calendar-outline" size={20} color={GuardColors.goldDeep} />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Join Date</Text>
                                        <Text style={styles.infoValue}>{new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                        
                        {profile.lastLogin && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <View style={styles.infoIcon}>
                                        <Ionicons name="time" size={20} color={GuardColors.goldDeep} />
                                    </View>
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoLabel}>Last Logged In</Text>
                                        <Text style={styles.infoValue}>{new Date(profile.lastLogin).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    {/* SOCIETY DETAILS */}
                    {profile.society && (
                        <View style={styles.infoCard}>
                            <Text style={styles.sectionLabel}>SOCIETY DETAILS</Text>

                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="business" size={20} color={GuardColors.goldDeep} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Society Name</Text>
                                    <Text style={styles.infoValue}>{profile.society.name}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="location" size={20} color={GuardColors.goldDeep} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Address</Text>
                                    <Text style={styles.infoValue}>{profile.society.address}, {profile.society.city}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <Pressable
                        onPress={handleLogout}
                        style={styles.logoutButton}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </Pressable>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GuardColors.bg,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: GuardColors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: GuardColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 4,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    profileIdentity: { flex: 1, alignItems: 'flex-start' },
    guardName: {
        fontSize: 21,
        fontWeight: '900',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    guardId: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 9,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: GuardColors.border,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    infoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: GuardColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
        letterSpacing: -0.2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
    },
    actionButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    actionButtonPressed: {
        backgroundColor: '#F9FAFB',
        transform: [{ scale: 0.98 }],
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
    },
    logoutButton: {
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 12,
        borderWidth: 1.5,
        borderColor: '#FEE2E2',
    },
    logoutButtonSmall: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 14,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutButtonPressed: {
        backgroundColor: '#FEE2E2',
        transform: [{ scale: 0.98 }],
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#DC2626',
    },
});
