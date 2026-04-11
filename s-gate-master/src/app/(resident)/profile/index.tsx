import React, { useCallback, useState } from 'react';
import {
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { SgateColors, SgateFonts, SgateRadius } from '../../../constants/Sgate-theme';
import { useAuthStore } from '../../../store/useAuthStore';
import { useProfileStore } from '../../../store/useProfileStore';
import * as profileService from '../../../services/profile.service';
import { AppAlert } from '../../../components/ui/AppAlert';

// Components
import { ProfileHeader } from './_components/ProfileHeader';
import { ProfileCompletion, calcCompletion } from './_components/ProfileCompletion';
import { HouseholdGrid } from './_components/HouseholdGrid';
import { AddressCard } from './_components/AddressCard';
import { SettingRow } from './_components/SettingRow';
import { ProfileHeaderSkeleton, SectionSkeleton } from './_components/SectionSkeleton';
import { ProfileQrModal } from './_components/ProfileQrModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function showToast(message: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    }
}

function safePush(router: any, route: string) {
    try {
        router.push(route as any);
    } catch {
        AppAlert.show('Navigation Error', 'This screen is not available yet.');
    }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();

    // Store
    const {
        profile,
        familyMembers,
        staffList,
        vehicles,
        loading,
        errors,
        fetchAll,
        fetchSection,
    } = useProfileStore();

    // Edit modal
    const [refreshing, setRefreshing] = useState(false);
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [isQrModalVisible, setQrModalVisible] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [saving, setSaving] = useState(false);

    // ── Data loading ──────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            fetchAll(); // respects stale check
        }, [fetchAll]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAll(true); // force refresh
        setRefreshing(false);
    }, [fetchAll]);

    // ── Derived data ──────────────────────────────────────────────────────
    const displayUser = profile ?? user ?? ({} as any);
    const completionPct = calcCompletion(displayUser, {
        familyCount: familyMembers.length,
        vehicleCount: vehicles.length,
    });

    const flatInfo = displayUser.flat?.number
        ? `${displayUser.flat.block?.name ?? ''} ${displayUser.flat.number}`.trim()
        : null;

    const firstStaffName = staffList.length > 0 ? staffList[0].name : null;

    // ── Edit profile ──────────────────────────────────────────────────────
    const openEditModal = () => {
        setEditData({
            name: displayUser.name ?? '',
            email: displayUser.email ?? '',
        });
        setEditModalVisible(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await profileService.updateProfile({
                name: editData.name.trim() || undefined,
                email: editData.email.trim() || undefined,
            });
            useProfileStore.getState().invalidate();
            await fetchAll(true);
            setEditModalVisible(false);
            showToast('Profile updated');
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────
    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        AppAlert.show('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    // ── Navigation ────────────────────────────────────────────────────────
    const handleNavigate = (target: 'family' | 'staff' | 'vehicles' | 'pets' | 'household') => {
        switch (target) {
            case 'household': safePush(router, '/(resident)/household'); break;
            case 'family':   safePush(router, '/(resident)/family'); break;
            case 'staff':    safePush(router, '/(resident)/staff'); break;
            case 'vehicles': safePush(router, '/(resident)/vehicles'); break;
            case 'pets':
                AppAlert.show('Coming Soon', 'Pets management will be available in a future update.');
                break;
        }
    };

    const handleRetry = (section: 'family' | 'staff' | 'vehicles') => {
        fetchSection(section);
    };

    const handleShareApp = async () => {
        try {
            await Share.share({
                message: 'Check out S-Gate — the smart society management app! Download now.',
            });
        } catch { /* cancelled */ }
    };

    // ── Skeleton while first load ─────────────────────────────────────────
    const isFirstLoad = loading && !profile && !user;

    return (
        <View style={styles.root}>
            {/* ── Header Bar ──────────────────────────────────────────── */}
            <View 
                className="px-5 flex-row items-center justify-between bg-white border-b border-gray-100"
                style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Profile</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL('mailto:support@sgate.app')} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100" hitSlop={8}>
                    <Feather name="headphones" size={20} className="text-gray-700" />
                </TouchableOpacity>
            </View>

            {/* ── Content ─────────────────────────────────────────────── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={SgateColors.gold}
                        colors={[SgateColors.gold]}
                    />
                }
            >
                {/* ── Profile Header ──────────────────────────────────── */}
                {isFirstLoad ? (
                    <ProfileHeaderSkeleton />
                ) : (
                    <ProfileHeader 
                        user={displayUser} 
                        onEditPress={openEditModal} 
                        onQrPress={() => setQrModalVisible(true)}
                    />
                )}

                {/* ── Profile Completion ──────────────────────────────── */}
                {!isFirstLoad && (
                    <ProfileCompletion percentage={completionPct} onViewProfile={openEditModal} />
                )}

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Household ───────────────────────────────────────── */}
                {isFirstLoad ? (
                    <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                        <SectionSkeleton hasGrid />
                    </View>
                ) : (
                    <HouseholdGrid
                        familyCount={familyMembers.length}
                        firstStaffName={firstStaffName}
                        vehicleCount={vehicles.length}
                        errors={errors}
                        onNavigate={handleNavigate}
                        onRetry={handleRetry}
                    />
                )}

                {/* ── Address Card ────────────────────────────────────── */}
                <AddressCard
                    flatNumber={displayUser.flat?.number}
                    blockName={displayUser.flat?.block?.name}
                    societyName={displayUser.society?.name}
                    societyAddress={displayUser.society?.address}
                />

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Security & Notifications ────────────────────────── */}
                <Text style={styles.sectionTitle}>Security & Notifications</Text>

                <View style={styles.notifBanner}>
                    <Text style={styles.notifBannerText}>Not Getting Notifications ?</Text>
                    <TouchableOpacity
                        style={styles.notifBannerBtn}
                        activeOpacity={0.7}
                        onPress={() => safePush(router, '/(resident)/notifications')}
                    >
                        <Text style={styles.notifBannerBtnText}>Test Now</Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t1} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <SettingRow
                        icon="bell-outline"
                        title="Notification Preferences"
                        onPress={() => safePush(router, '/(resident)/notifications')}
                    />
                    <SettingRow
                        icon="clipboard-text-clock-outline"
                        title="Visitor List"
                        onPress={() => safePush(router, '/(resident)/visitors')}
                    />
                    <SettingRow
                        icon="shield-alert-outline"
                        title="Security Alert List"
                        showDivider={false}
                        onPress={() => safePush(router, '/(resident)/emergency')}
                    />
                </View>

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Manage Flats ────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Manage Flats</Text>
                <View style={styles.card}>
                    <SettingRow
                        icon="home-city-outline"
                        title={flatInfo ?? 'No flat assigned'}
                        subtitle={displayUser.society?.name}
                        badge={flatInfo ? { label: 'Active', color: SgateColors.green, bg: SgateColors.greenBg } : undefined}
                        showChevron={false}
                    />
                    <SettingRow
                        icon="plus-circle-outline"
                        title="Add Flat/Villa/Office"
                        showDivider={false}
                        showChevron={false}
                        onPress={() => AppAlert.show('Coming Soon', 'Multi-flat management will be available soon.')}
                    />
                </View>

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── General Settings ────────────────────────────────── */}
                <Text style={styles.sectionTitle}>General Settings</Text>
                <View style={styles.card}>
                    <SettingRow
                        icon="headphones"
                        title="Support & Feedback"
                        onPress={() => Linking.openURL('mailto:support@sgate.app')}
                    />
                    <SettingRow
                        icon="share-variant-outline"
                        title="Tell a friend about S-Gate"
                        onPress={handleShareApp}
                    />
                    <SettingRow
                        icon="account-outline"
                        title="Account Information"
                        onPress={openEditModal}
                    />
                    <SettingRow
                        icon="logout"
                        title="Logout"
                        danger
                        showDivider={false}
                        onPress={handleLogout}
                    />
                </View>

                {/* ── Footer ──────────────────────────────────────────── */}
                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>s-gate</Text>
                    <View style={styles.footerLinks}>
                        <Text style={styles.footerLink}>Terms & Conditions</Text>
                        <Text style={styles.footerSep}> | </Text>
                        <Text style={styles.footerLink}>Privacy Policy</Text>
                    </View>
                    <Text style={styles.footerVersion}>Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* ── Edit Profile Modal ──────────────────────────────────── */}
            <Modal
                visible={isEditModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalClose} hitSlop={8}>
                                <MaterialCommunityIcons name="close" size={22} color={SgateColors.t2} />
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

            {/* ── QR Pass Modal ───────────────────────────────────────── */}
            {displayUser && (
                <ProfileQrModal
                    visible={isQrModalVisible}
                    onClose={() => setQrModalVisible(false)}
                    user={displayUser as any}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },



    // Scroll
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // Dividers
    divider: {
        height: 8,
        backgroundColor: SgateColors.bg,
    },

    // Section titles
    sectionTitle: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },

    // Card wrapper for grouped rows
    card: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 16,
        borderRadius: SgateRadius.sm,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        overflow: 'hidden',
    },

    // Notification banner
    notifBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#F0EDE6',
        borderRadius: SgateRadius.sm,
    },
    notifBannerText: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
        flex: 1,
    },
    notifBannerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notifBannerBtnText: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginRight: 2,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    footerBrand: {
        fontSize: 22,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    footerLink: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.blue,
        textDecorationLine: 'underline',
    },
    footerSep: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    footerVersion: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // Modal
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
        backgroundColor: SgateColors.gold,
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
        color: SgateColors.black,
    },
});
