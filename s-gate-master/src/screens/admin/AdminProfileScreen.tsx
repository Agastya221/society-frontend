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
    Share,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

import { WorkspaceSwitchButton } from '@/components/ui/WorkspaceSwitchButton';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import * as profileService from '@/services/profile.service';
import type {
    ResidentContext,
    ResidentContextsResponse,
} from '@/services/profile.service';
import { AppAlert } from '@/components/ui/AppAlert';
import { ResidentContextPicker } from '@/components/context/ResidentContextPicker';
import { SettingRow } from '@/components/ui/SettingRow';
import { ProfileHeader } from '@/app/(resident)/profile/_components/ProfileHeader';
import { ProfileHeaderSkeleton } from '@/app/(resident)/profile/_components/SectionSkeleton';
import { AddressCard } from '@/app/(resident)/profile/_components/AddressCard';
import {
    getActiveContextForRole,
    getAdminContexts,
    getContextSubtitleForRole,
    getContextTitleForRole,
} from '@/utils/contextGuards';

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

function shouldOpenAdminArea(redirectTo?: string, nextRole?: string | null): boolean {
    const normalizedRole = nextRole?.toUpperCase();
    return redirectTo === 'ADMIN_PANEL' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

export default function AdminProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        user,
        logout,
        login,
        selectedAdminContextId,
        setSelectedContextForRole,
    } = useAuthStore();
    // Route prefix for navigation
    const routePrefix = '/(admin)';

    // Store
    const {
        profile,
        loading,
        fetchAll,
    } = useProfileStore();

    // Edit modal
    const [refreshing, setRefreshing] = useState(false);
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '' });
    const [saving, setSaving] = useState(false);
    const [contextsData, setContextsData] = useState<ResidentContextsResponse | null>(null);
    const [contextsLoading, setContextsLoading] = useState(false);
    const [showContextSheet, setShowContextSheet] = useState(false);
    const [switchingContextId, setSwitchingContextId] = useState<string | null>(null);

    const fetchContexts = useCallback(async () => {
        if (!user?.id) return;
        setContextsLoading(true);
        try {
            const result = await profileService.getResidentContexts();
            setContextsData(result);
            // Sync contexts into global auth store so WorkspaceSwitchButton can access them
            useAuthStore.getState().setContexts(result.contexts ?? []);
        } catch (error) {
            console.error('Profile contexts fetch failed:', error);
        } finally {
            setContextsLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchAll();
            fetchContexts();
        }, [fetchAll, fetchContexts]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchAll(true),
            fetchContexts(),
        ]);
        setRefreshing(false);
    }, [fetchAll, fetchContexts]);

    const displayUser = profile ?? user ?? ({} as any);

    const flatInfo = displayUser.flat?.number
        ? `${displayUser.flat.block?.name ?? ''} ${displayUser.flat.number}`.trim()
        : null;

    const adminContexts = getAdminContexts(contextsData?.contexts ?? []);
    const activeContext = getActiveContextForRole('admin', adminContexts, selectedAdminContextId);

    const activeHomeLabel = activeContext ? getContextTitleForRole('admin', activeContext) : (displayUser.society?.name ?? flatInfo ?? 'No society assigned');
    const activeHomeSociety = activeContext ? getContextSubtitleForRole('admin', activeContext) : null;
    const contextCount = adminContexts.length;
    const manageHomesSubtitle = activeHomeSociety
        ? `${activeHomeLabel} - ${activeHomeSociety}`
        : activeHomeLabel;

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

    const handleLogout = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        AppAlert.show('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
        ]);
    };

    const handleShareApp = async () => {
        try {
            await Share.share({
                message: 'Check out S-Gate — the smart society management app! Download now.',
            });
        } catch { /* cancelled */ }
    };

    const handleOpenContextSheet = useCallback(() => {
        setShowContextSheet(true);
        fetchContexts();
    }, [fetchContexts]);

    const handleAddFlat = useCallback(() => {
        setShowContextSheet(false);
        safePush(router, '/(admin)/settings');
    }, [router]);

    const handleSwitchContext = useCallback(async (context: ResidentContext) => {
        if (context.isActiveContext || switchingContextId) {
            setShowContextSheet(false);
            return;
        }

        setSwitchingContextId(context.membershipId);
        try {
            const result = await profileService.switchResidentContext(context.membershipId);
            await setSelectedContextForRole('admin', context.membershipId);
            await login(
                result.accessToken,
                result.refreshToken,
                result.user,
                result.appType,
                false,
                null,
                result.contexts?.contexts ?? contextsData?.contexts ?? [],
            );
            setContextsData(result.contexts);
            useProfileStore.getState().invalidate();
            setShowContextSheet(false);

            const nextIsAdmin = shouldOpenAdminArea(result.redirectTo, result.user?.role);
            const targetRoute = nextIsAdmin ? '/(admin)/profile' : '/(resident)/profile';

            if (!nextIsAdmin) {
                router.replace(targetRoute as any);
                return;
            }

            await fetchAll(true);
            await fetchContexts();
        } catch (error: any) {
            AppAlert.show(
                'Could not switch flat',
                error?.response?.data?.message || 'Please try again in a moment.'
            );
        } finally {
            setSwitchingContextId(null);
        }
    }, [
        contextsData?.contexts,
        fetchAll,
        fetchContexts,
        login,
        router,
        setSelectedContextForRole,
        switchingContextId,
    ]);

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
                        role="admin"
                        onEditPress={openEditModal} 
                        onQrPress={undefined}
                    />
                )}

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Address Card ────────────────────────────────────── */}
                <AddressCard
                    flatNumber={displayUser.flat?.number}
                    blockName={displayUser.flat?.block?.name}
                    societyName={displayUser.society?.name}
                    societyAddress={displayUser.society?.address}
                />

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Admin Controls ─────────────────────── */}
                <Text style={styles.sectionTitle}>Admin Controls</Text>
                <View style={styles.card}>
                    <SettingRow
                        icon="cog-outline"
                        title="Society Settings"
                        onPress={() => safePush(router, '/(admin)/settings')}
                    />
                    <SettingRow
                        icon="account-group-outline"
                        title="Manage Residents"
                        onPress={() => safePush(router, '/(admin)/onboarding-requests')}
                    />
                    <SettingRow
                        icon="shield-account-outline"
                        title="Guard Management"
                        onPress={() => safePush(router, '/(admin)/guards')}
                    />
                    <SettingRow
                        icon="clipboard-text-outline"
                        title="Gate Passes"
                        showDivider={false}
                        onPress={() => safePush(router, '/(admin)/gate-passes')}
                    />
                </View>

                {/* ── Divider ─────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Security & Notifications ────────────────────────── */}
                <Text style={styles.sectionTitle}>Security & Notifications</Text>

                <View style={styles.card}>
                    <SettingRow
                        icon="bell-outline"
                        title="Notification Preferences"
                        onPress={() => safePush(router, `${routePrefix}/notifications`)}
                    />
                    <SettingRow
                        icon="clipboard-text-clock-outline"
                        title="Visitor Log"
                        onPress={() => safePush(router, '/(admin)/approval-requests')}
                    />
                    <SettingRow
                        icon="car-outline"
                        title="Parking & Vehicles"
                        onPress={() => safePush(router, '/(admin)/vehicles')}
                    />
                    <SettingRow
                        icon="shield-alert-outline"
                        title="Security Alert List"
                        showDivider={false}
                        onPress={() => safePush(router, '/(admin)/emergencies')}
                    />
                </View>

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Manage Flats ────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Society Workspace</Text>
                <View style={styles.card}>
                    <SettingRow
                        icon="shield-home"
                        title="Manage Admin Societies"
                        subtitle={manageHomesSubtitle}
                        badge={
                            contextCount > 1
                                ? { label: `${contextCount} Societies`, color: SgateColors.goldDeep, bg: SgateColors.goldPale }
                                : activeContext
                                    ? { label: 'Active', color: SgateColors.green, bg: SgateColors.greenBg }
                                    : undefined
                        }
                        showChevron={true}
                        onPress={handleOpenContextSheet}
                    />
                    <SettingRow
                        icon="plus-circle-outline"
                        title="Add / Manage Society"
                        showDivider={false}
                        showChevron
                        onPress={handleAddFlat}
                    />
                </View>

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Workspace Switcher ──────────────────────────────── */}
                <Text style={styles.sectionTitle}>Workspace</Text>
                <View style={styles.card}>
                    <WorkspaceSwitchButton variant="profile" />
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
                <View style={styles.footerSection}>
                    <View style={styles.footerCard}>
                        <TouchableOpacity
                            style={styles.footerRow}
                            activeOpacity={0.6}
                            onPress={() => Linking.openURL('https://sgate.app/terms')}
                        >
                            <View style={styles.footerRowLeft}>
                                <MaterialCommunityIcons name="file-document-outline" size={20} color={SgateColors.t2} />
                                <Text style={styles.footerRowText}>Terms & Conditions</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t4} />
                        </TouchableOpacity>

                        <View style={styles.footerDivider} />

                        <TouchableOpacity
                            style={styles.footerRow}
                            activeOpacity={0.6}
                            onPress={() => Linking.openURL('https://sgate.app/privacy')}
                        >
                            <View style={styles.footerRowLeft}>
                                <MaterialCommunityIcons name="shield-check-outline" size={20} color={SgateColors.t2} />
                                <Text style={styles.footerRowText}>Privacy Policy</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t4} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footerVersion}>Version 1.0.0</Text>
                </View>
            </ScrollView>

            <ResidentContextPicker
                visible={showContextSheet}
                contexts={adminContexts}
                requests={[]}
                activeContext={activeContext}
                isLoading={contextsLoading}
                switchingContextId={switchingContextId}
                onClose={() => setShowContextSheet(false)}
                onRefresh={fetchContexts}
                onSwitch={handleSwitchContext}
                onRequestPress={() => {}}
                onAddAnother={handleAddFlat}
                variant="sheet"
                mode="admin"
                title="Your Societies"
                subtitle="Switch society/admin workspace"
                addTitle="Add / Manage Society"
                addSubtitle="Manage society access or switch admin society"
            />

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
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    divider: {
        height: 8,
        backgroundColor: SgateColors.bg,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    card: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 16,
        borderRadius: SgateRadius.sm,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        overflow: 'hidden',
    },
    footerSection: {
        paddingTop: 24,
        paddingBottom: 32,
        alignItems: 'center',
    },
    footerCard: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 16,
        borderRadius: SgateRadius.sm,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        width: '90%',
        overflow: 'hidden',
        marginBottom: 16,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    footerRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    footerRowText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    footerDivider: {
        height: 1,
        backgroundColor: SgateColors.borderSoft,
        marginHorizontal: 16,
    },
    footerVersion: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: SgateRadius.md,
        borderTopRightRadius: SgateRadius.md,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    modalClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SgateColors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        height: 48,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: SgateRadius.sm,
        paddingHorizontal: 16,
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginBottom: 16,
    },
    saveBtn: {
        backgroundColor: SgateColors.gold,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
});
