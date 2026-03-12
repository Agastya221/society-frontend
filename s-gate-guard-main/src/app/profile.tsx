import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
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
    const router = useRouter();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const { logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<GuardProfile | null>(null);

    React.useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

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
                <Animated.View style={{ opacity: fadeAnim }}>

                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={48} color="#3B82F6" />
                            </View>
                            <View style={styles.statusIndicator}>
                                <View style={[styles.statusDot, { backgroundColor: profile.isActive ? '#10B981' : '#6B7280' }]} />
                            </View>
                        </View>

                        <Text style={styles.guardName}>{profile.name}</Text>
                        <Text style={styles.guardId}>{profile.id}</Text>

                        <View style={[styles.statusBadge, { backgroundColor: profile.isActive ? '#D1FAE5' : '#F3F4F6', borderColor: profile.isActive ? '#A7F3D0' : '#E5E7EB' }]}>
                            <Text style={[styles.statusText, { color: profile.isActive ? '#047857' : '#374151' }]}>
                                {profile.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Text>
                        </View>
                    </View>

                    {/* ASSIGNMENT DETAILS */}
                    <View style={styles.infoCard}>
                        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="call" size={20} color="#3B82F6" />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Contact Number</Text>
                                <Text style={styles.infoValue}>{profile.phone}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
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
                                        <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
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
                                        <Ionicons name="time" size={20} color="#3B82F6" />
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
                                    <Ionicons name="business" size={20} color="#3B82F6" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Society Name</Text>
                                    <Text style={styles.infoValue}>{profile.society.name}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="location" size={20} color="#3B82F6" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Address</Text>
                                    <Text style={styles.infoValue}>{profile.society.address}, {profile.society.city}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionButton,
                            pressed && styles.actionButtonPressed,
                        ]}
                    >
                        <Ionicons name="settings-outline" size={22} color="#374151" />
                        <Text style={styles.actionButtonText}>App Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </Pressable>

                    <Pressable
                        onPress={handleLogout}
                        style={({ pressed }) => [
                            styles.logoutButton,
                            pressed && styles.logoutButtonPressed,
                        ]}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </Pressable>

                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
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
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#1F2937',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
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
    guardName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    guardId: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
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
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        ...Platform.select({
            ios: {
                shadowColor: '#1F2937',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
            },
            android: {
                elevation: 3,
            },
        }),
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
        backgroundColor: '#EFF6FF',
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
