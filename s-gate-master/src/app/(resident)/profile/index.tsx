import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateListItem } from '../../../components/Sgate';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { useAuthStore } from '../../../store/useAuthStore';
import * as profileService from '../../../services/profile.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();

    const [profile, setProfile] = useState<any>(null);
    const [familyCount, setFamilyCount] = useState(0);

    // Stats (hardcoded fallback — replace with real data when available)
    const [stats, setStats] = useState({ visitors: 0, deliveries: 0, alerts: 0 });

    // Edit modal
    const [editModal, setEditModal] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [saving, setSaving] = useState(false);

    // ── Fetch on focus ───────────────────────────────────────────────────
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

    // ── Logout ───────────────────────────────────────────────────────────
    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    // ── Save profile ─────────────────────────────────────────────────────
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

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Dark header with rounded bottom ─────────────────── */}
                <LinearGradient
                    colors={[SgateColors.black, SgateColors.charcoal]}
                    style={[styles.header, { paddingTop: insets.top + 20 }]}
                >
                    {/* Gold accent line at very top */}
                    <LinearGradient
                        colors={[
                            'transparent',
                            'rgba(255,184,0,0.5)',
                            'transparent',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.goldAccentLine}
                    />

                    {/* Gold gradient avatar */}
                    <Animated.View
                        entering={FadeInDown.delay(0).springify()}
                        style={styles.avatarWrap}
                    >
                        <LinearGradient
                            colors={[SgateColors.gold, SgateColors.goldDeep]}
                            style={styles.avatarCircle}
                        >
                            <Text style={styles.avatarInitials}>
                                {getInitials(displayUser.name ?? 'U')}
                            </Text>
                        </LinearGradient>
                    </Animated.View>

                    {/* Name */}
                    <Animated.View
                        entering={FadeInDown.delay(60).springify()}
                        style={styles.headerInfo}
                    >
                        <Text style={styles.headerName}>
                            {displayUser.name ?? 'Resident'}
                        </Text>
                        <Text style={styles.headerFlat}>{flatInfo}</Text>
                    </Animated.View>

                    {/* Premium badge */}
                    <Animated.View
                        entering={FadeInDown.delay(120).springify()}
                        style={styles.premiumBadge}
                    >
                        <Feather name="star" size={12} color={SgateColors.gold} />
                        <Text style={styles.premiumText}>Premium Resident</Text>
                    </Animated.View>
                </LinearGradient>

                {/* ── Scrollable content ───────────────────────────────── */}
                <View style={styles.content}>
                    {/* Stats row */}
                    <Animated.View
                        entering={FadeInDown.delay(180).springify()}
                        style={styles.statsRow}
                    >
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.visitors}</Text>
                            <Text style={styles.statLabel}>Visitors</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.deliveries}</Text>
                            <Text style={styles.statLabel}>Deliveries</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.alerts}</Text>
                            <Text style={styles.statLabel}>Alerts</Text>
                        </View>
                    </Animated.View>

                    {/* Settings list */}
                    <Animated.View
                        entering={FadeInDown.delay(240).springify()}
                        style={styles.settingsCard}
                    >
                        <SgateListItem
                            icon="user"
                            label="Edit Profile"
                            sublabel="Name, email, photo"
                            onPress={() => {
                                setEditData({
                                    name: displayUser.name ?? '',
                                    email: displayUser.email ?? '',
                                });
                                setEditModal(true);
                            }}
                        />
                        <SgateListItem
                            icon="shield"
                            label="Security Settings"
                            sublabel="PIN, biometrics"
                        />
                        <SgateListItem
                            icon="bell"
                            label="Notifications"
                            sublabel="Alerts & push settings"
                            onPress={() =>
                                router.push(
                                    '/(resident)/notifications' as any,
                                )
                            }
                        />
                        <SgateListItem
                            icon="lock"
                            label="Privacy"
                            sublabel="Visibility & data"
                        />
                        <SgateListItem
                            icon="users"
                            label="Family Members"
                            sublabel={`${familyCount} member${familyCount !== 1 ? 's' : ''}`}
                            onPress={() =>
                                router.push('/(resident)/family' as any)
                            }
                        />
                        <SgateListItem
                            icon="clock"
                            label="Activity History"
                            sublabel="Visitor & entry log"
                            onPress={() =>
                                router.push('/(resident)/visitors' as any)
                            }
                        />
                        <SgateListItem
                            icon="settings"
                            label="App Settings"
                            sublabel="Theme, language"
                            hideDivider
                        />
                    </Animated.View>

                    {/* Sign out */}
                    <Animated.View
                        entering={FadeInDown.delay(300).springify()}
                    >
                        <TouchableOpacity
                            style={styles.signOutRow}
                            onPress={handleLogout}
                            activeOpacity={0.7}
                        >
                            <Feather
                                name="log-out"
                                size={16}
                                color={SgateColors.red}
                            />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.version}>sgate v1.0.0</Text>
                </View>
            </ScrollView>

            {/* ── Edit Profile Modal ──────────────────────────────────── */}
            <Modal
                visible={editModal}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalSheet,
                            { paddingBottom: insets.bottom + 20 },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity
                                onPress={() => setEditModal(false)}
                                style={styles.modalClose}
                                hitSlop={8}
                            >
                                <Feather
                                    name="x"
                                    size={20}
                                    color={SgateColors.t2}
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>FULL NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={editData.name}
                            onChangeText={(t) =>
                                setEditData((p) => ({ ...p, name: t }))
                            }
                            placeholder="Your name"
                            placeholderTextColor={SgateColors.t4}
                        />

                        <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                        <TextInput
                            style={styles.input}
                            value={editData.email}
                            onChangeText={(t) =>
                                setEditData((p) => ({ ...p, email: t }))
                            }
                            placeholder="you@example.com"
                            placeholderTextColor={SgateColors.t4}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                saving && styles.saveBtnDisabled,
                            ]}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // ── Dark header ─────────────────────────────────────────────────────
    header: {
        alignItems: 'center',
        paddingBottom: 32,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
    },
    goldAccentLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
    },

    // ── Avatar ──────────────────────────────────────────────────────────
    avatarWrap: {
        marginBottom: 16,
    },
    avatarCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    avatarInitials: {
        fontSize: 24,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.black,
    },

    // ── Header info ─────────────────────────────────────────────────────
    headerInfo: {
        alignItems: 'center',
        marginBottom: 14,
    },
    headerName: {
        fontSize: 20,
        fontFamily: SgateFonts.extrabold,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerFlat: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: 'rgba(255,255,255,0.35)',
    },

    // ── Premium badge ───────────────────────────────────────────────────
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,184,0,0.18)',
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 14,
    },
    premiumText: {
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.gold,
    },

    // ── Content ─────────────────────────────────────────────────────────
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // ── Stats row ───────────────────────────────────────────────────────
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        alignItems: 'center',
        paddingVertical: 16,
    },
    statValue: {
        fontSize: 24,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // ── Settings card ───────────────────────────────────────────────────
    settingsCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 12,
        marginBottom: 24,
        overflow: 'hidden',
    },

    // ── Sign out ────────────────────────────────────────────────────────
    signOutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        marginBottom: 12,
    },
    signOutText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.red,
    },

    version: {
        textAlign: 'center',
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginBottom: 8,
    },

    // ── Modal ───────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalSheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },
});
