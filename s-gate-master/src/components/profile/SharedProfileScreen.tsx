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

import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useProfileStore } from '@/store/useProfileStore';
import * as profileService from '@/services/profile.service';
import type {
    ResidentContext,
    ResidentContextRequest,
    ResidentContextsResponse,
    ResidentRequestDetails,
} from '@/services/profile.service';
import { AppAlert } from '@/components/ui/AppAlert';
import { ResidentContextPicker } from '@/components/context/ResidentContextPicker';
import { ResidentRequestDetailsSheet } from '@/components/context/ResidentRequestDetailsSheet';
import { SettingRow } from '@/components/ui/SettingRow';
import { buildOnboardingDraftFromRequest } from '@/utils/onboardingRequestDraft';
import {
    getActiveContextForRole,
    getAdminContexts,
    getContextSubtitleForRole,
    getContextTitleForRole,
    getResidentContexts,
} from '@/utils/contextGuards';

// Sub-components (from Resident profile)
import { ProfileHeader } from '@/app/(resident)/profile/_components/ProfileHeader';
import { ProfileCompletion, calcCompletion } from '@/app/(resident)/profile/_components/ProfileCompletion';
import { HouseholdGrid } from '@/app/(resident)/profile/_components/HouseholdGrid';
import { AddressCard } from '@/app/(resident)/profile/_components/AddressCard';
import { ProfileHeaderSkeleton, SectionSkeleton } from '@/app/(resident)/profile/_components/SectionSkeleton';
import { ProfileQrModal } from '@/app/(resident)/profile/_components/ProfileQrModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileRole = 'resident' | 'admin';

interface SharedProfileScreenProps {
    role: ProfileRole;
}

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

function shouldOpenAdminArea(redirectTo?: string, nextRole?: string | null): boolean {
    const normalizedRole = nextRole?.toUpperCase();
    return redirectTo === 'ADMIN_PANEL' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SharedProfileScreen({ role }: SharedProfileScreenProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        user,
        logout,
        login,
        selectedResidentContextId,
        selectedAdminContextId,
        setSelectedContextForRole,
    } = useAuthStore();
    const startAddMembershipFlow = useOnboardingStore((s) => s.startAddMembershipFlow);
    const startRequestCorrectionFlow = useOnboardingStore((s) => s.startRequestCorrectionFlow);
    const isAdmin = role === 'admin';

    // Route prefix for navigation
    const routePrefix = isAdmin ? '/(admin)' : '/(resident)';

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
    const [contextsData, setContextsData] = useState<ResidentContextsResponse | null>(null);
    const [contextsLoading, setContextsLoading] = useState(false);
    const [showContextSheet, setShowContextSheet] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ResidentContextRequest | null>(null);
    const [showRequestDetails, setShowRequestDetails] = useState(false);
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

    // ── Data loading ──────────────────────────────────────────────────────
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

    // ── Derived data ──────────────────────────────────────────────────────
    const displayUser = profile ?? user ?? ({} as any);
    const completionPct = calcCompletion(displayUser, {
        familyCount: familyMembers.length,
        vehicleCount: vehicles.length,
    });

    const flatInfo = displayUser.flat?.number
        ? `${displayUser.flat.block?.name ?? ''} ${displayUser.flat.number}`.trim()
        : null;

    const scopedContexts = isAdmin
        ? getAdminContexts(contextsData?.contexts ?? [])
        : getResidentContexts(contextsData?.contexts ?? []);
    const activeContext = getActiveContextForRole(
        role,
        scopedContexts,
        isAdmin ? selectedAdminContextId : selectedResidentContextId,
    );
    const activeHomeLabel = activeContext
        ? getContextTitleForRole(role, activeContext)
        : flatInfo ?? (isAdmin ? 'No society assigned' : 'No flat assigned');
    const activeHomeSociety = activeContext
        ? getContextSubtitleForRole(role, activeContext)
        : displayUser.society?.name ?? null;
    const contextCount = scopedContexts.length;
    const requestCount = isAdmin ? 0 : (contextsData?.requests?.length ?? 0);
    const manageHomesSubtitle = activeHomeSociety
        ? `${activeHomeLabel} - ${activeHomeSociety}`
        : activeHomeLabel;

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

    // ── Navigation (role-aware) ───────────────────────────────────────────
    const handleNavigate = (target: 'family' | 'staff' | 'vehicles' | 'pets' | 'household') => {
        switch (target) {
            case 'household': safePush(router, `${routePrefix}/household`); break;
            case 'family':    safePush(router, `${routePrefix}/family`); break;
            case 'staff':     safePush(router, `${routePrefix}/staff`); break;
            case 'vehicles':  safePush(router, `${routePrefix}/vehicles`); break;
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

    const handleOpenContextSheet = useCallback(() => {
        setShowContextSheet(true);
        fetchContexts();
    }, [fetchContexts]);

    const handleAddFlat = useCallback(() => {
        setShowContextSheet(false);
        if (isAdmin) {
            safePush(router, '/(admin)/settings');
            return;
        }
        startAddMembershipFlow(`${routePrefix}/profile`);
        safePush(router, '/(onboarding)/select-city');
    }, [isAdmin, routePrefix, router, startAddMembershipFlow]);

    const handleSwitchContext = useCallback(async (context: ResidentContext) => {
        if (context.isActiveContext || switchingContextId) {
            setShowContextSheet(false);
            return;
        }

        setSwitchingContextId(context.membershipId);
        try {
            const result = await profileService.switchResidentContext(context.membershipId);
            await setSelectedContextForRole(role, context.membershipId);
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

            if (nextIsAdmin !== isAdmin) {
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
        isAdmin,
        login,
        role,
        router,
        setSelectedContextForRole,
        switchingContextId,
    ]);

    const handleRequestPress = useCallback((request: ResidentContextRequest) => {
        setShowContextSheet(false);
        setSelectedRequest(request);
        setShowRequestDetails(true);
    }, []);

    const handleRequestDeleted = useCallback(() => {
        setSelectedRequest(null);
        setShowRequestDetails(false);
        fetchContexts();
    }, [fetchContexts]);

    const handleRequestApplyAgain = useCallback((request: ResidentContextRequest | ResidentRequestDetails) => {
        const draft = buildOnboardingDraftFromRequest(request);
        if (!draft) {
            AppAlert.show('Could not continue', 'This request is missing flat details. Please apply again.');
            return;
        }

        setShowRequestDetails(false);
        setSelectedRequest(null);
        startRequestCorrectionFlow({
            ...draft,
            returnTo: `${routePrefix}/profile`,
            sourceRequestId: request.requestId,
            sourceRequestStatus: draft.sourceRequestStatus,
        });
        safePush(router, '/(onboarding)/document-upload');
    }, [routePrefix, router, startRequestCorrectionFlow]);

    const handleRequestEditSelection = useCallback((request: ResidentContextRequest | ResidentRequestDetails) => {
        const draft = buildOnboardingDraftFromRequest(request);
        if (!draft) {
            AppAlert.show('Could not continue', 'This request is missing flat details. Please apply again.');
            return;
        }

        setShowRequestDetails(false);
        setSelectedRequest(null);
        startRequestCorrectionFlow({
            ...draft,
            returnTo: `${routePrefix}/profile`,
            sourceRequestId: request.requestId,
            sourceRequestStatus: draft.sourceRequestStatus,
        });
        safePush(router, '/(onboarding)/select-block');
    }, [routePrefix, router, startRequestCorrectionFlow]);

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
                        role={role}
                        onEditPress={openEditModal} 
                        onQrPress={isAdmin ? undefined : () => setQrModalVisible(true)}
                    />
                )}

                {/* ── Profile Completion (residents only) ─────────────── */}
                {!isFirstLoad && !isAdmin && (
                    <ProfileCompletion percentage={completionPct} onViewProfile={openEditModal} />
                )}

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Household (residents only) ──────────────────────── */}
                {!isAdmin && (
                    isFirstLoad ? (
                        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                            <SectionSkeleton hasGrid />
                        </View>
                    ) : (
                        <HouseholdGrid
                            familyCount={familyMembers.length}
                            staffCount={staffList.length}
                            vehicleCount={vehicles.length}
                            errors={errors}
                            onNavigate={handleNavigate}
                            onRetry={handleRetry}
                        />
                    )
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

                {/* ── Admin Controls (admin only) ─────────────────────── */}
                {isAdmin && (
                    <>
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
                    </>
                )}

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
                        title={isAdmin ? 'Visitor Log' : 'Visitor List'}
                        onPress={() => safePush(router, isAdmin ? '/(admin)/approval-requests' : '/(resident)/visitors')}
                    />
                    {isAdmin && (
                        <SettingRow
                            icon="car-outline"
                            title="Parking & Vehicles"
                            onPress={() => safePush(router, '/(admin)/vehicles')}
                        />
                    )}
                    <SettingRow
                        icon="shield-alert-outline"
                        title="Security Alert List"
                        showDivider={false}
                        onPress={() => safePush(router, isAdmin ? '/(admin)/emergencies' : '/(resident)/emergency')}
                    />
                </View>

                {/* ── Divider ─────────────────────────────────────────── */}
                <View style={styles.divider} />

                {/* ── Manage Flats ────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>{isAdmin ? 'Society Workspace' : 'Manage Flats'}</Text>
                <View style={styles.card}>
                    <SettingRow
                        icon={isAdmin ? 'shield-home' : 'home-city-outline'}
                        title={isAdmin ? 'Manage Admin Societies' : 'Manage My Flats'}
                        subtitle={manageHomesSubtitle}
                        badge={
                            contextCount > 1
                                ? {
                                    label: `${contextCount} ${isAdmin ? 'Societies' : 'Homes'}`,
                                    color: SgateColors.goldDeep,
                                    bg: SgateColors.goldPale,
                                }
                                : requestCount > 0
                                    ? { label: `${requestCount} Pending`, color: '#996300', bg: SgateColors.goldPale }
                                : activeContext
                                    ? { label: 'Active', color: SgateColors.green, bg: SgateColors.greenBg }
                                    : undefined
                        }
                        showChevron={true}
                        onPress={handleOpenContextSheet}
                    />
                    <SettingRow
                        icon="plus-circle-outline"
                        title={isAdmin ? 'Add / Manage Society' : 'Add Flat/Villa/Office'}
                        showDivider={false}
                        showChevron
                        onPress={handleAddFlat}
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
                contexts={scopedContexts}
                requests={isAdmin ? [] : (contextsData?.requests ?? [])}
                activeContext={activeContext}
                isLoading={contextsLoading}
                switchingContextId={switchingContextId}
                onClose={() => setShowContextSheet(false)}
                onRefresh={fetchContexts}
                onSwitch={handleSwitchContext}
                onRequestPress={handleRequestPress}
                onAddAnother={handleAddFlat}
                variant="sheet"
                mode={role}
                title={isAdmin ? 'Your Societies' : 'Your Homes'}
                subtitle={isAdmin ? 'Switch society/admin workspace' : 'Switch flat or society home'}
                addTitle={isAdmin ? 'Add / Manage Society' : 'Add Flat/Villa/Office'}
                addSubtitle={isAdmin ? 'Manage society access or switch admin society' : 'Join another approved society or flat'}
            />

            <ResidentRequestDetailsSheet
                visible={showRequestDetails}
                request={selectedRequest}
                onClose={() => setShowRequestDetails(false)}
                onDeleted={handleRequestDeleted}
                onApplyAgain={handleRequestApplyAgain}
                onEditSelection={handleRequestEditSelection}
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
        paddingBottom: 20,
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
    footerSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
    },
    footerCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        overflow: 'hidden',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 16,
    },
    footerRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    footerRowText: {
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    footerDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.04)',
        marginHorizontal: 16,
    },
    footerVersion: {
        textAlign: 'center',
        marginTop: 10,
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
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
