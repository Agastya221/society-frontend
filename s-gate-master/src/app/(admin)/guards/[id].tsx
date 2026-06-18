import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { AppAlert } from '@/components/ui/AppAlert';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Guard {
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
    photoUrl?: string;
    createdAt: string;
    society?: { name: string };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function GuardDetailScreen() {
    const { id, guardData } = useLocalSearchParams<{ id: string; guardData?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [guard, setGuard] = useState<Guard | null>(
        guardData ? JSON.parse(guardData) : null,
    );
    const [loading, setLoading] = useState(!guardData);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        if (!guard && id) {
            fetchGuard();
        }
    }, [id]);

    const fetchGuard = async () => {
        try {
            const res = await api.get('/auth/resident-app/guards');
            const list: Guard[] = res.data?.data ?? [];
            const found = list.find(g => g.id === id);
            if (found) setGuard(found);
        } catch (err) {
            console.error('Failed to fetch guard:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async () => {
        if (!guard) return;
        const newActive = !guard.isActive;
        const action = newActive ? 'Activate' : 'Deactivate';

        AppAlert.show(
            `${action} Guard?`,
            `Are you sure you want to ${action.toLowerCase()} ${guard.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action,
                    style: newActive ? 'default' : 'destructive',
                    onPress: async () => {
                        setToggling(true);
                        try {
                            await api.patch(`/auth/resident-app/users/${guard.id}/status`, { isActive: newActive });
                            setGuard(prev => prev ? { ...prev, isActive: newActive } : null);
                        } catch {
                            AppAlert.show('Error', 'Failed to update guard status');
                        } finally {
                            setToggling(false);
                        }
                    },
                },
            ],
        );
    };

    const handleCall = () => {
        if (!guard?.phone) return;
        Linking.openURL(`tel:${guard.phone}`);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
            });
        } catch { return dateStr; }
    };

    const formatTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return ''; }
    };

    if (loading) {
        return (
            <View style={styles.root}>
                <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Guard Details</Text>
                </View>
                <AppLoader />
            </View>
        );
    }

    if (!guard) {
        return (
            <View style={styles.root}>
                <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Guard Details</Text>
                </View>
                <View style={styles.errorWrap}>
                    <MaterialCommunityIcons name="shield-alert-outline" size={48} color={SgateColors.t4} />
                    <Text style={styles.errorTitle}>Guard not found</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
                        <Text style={styles.errorBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const initial = guard.name.charAt(0).toUpperCase();

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Guard Details</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Profile Header (matches Resident Profile) ─────── */}
                <View style={styles.profileHeader}>
                    <View style={[styles.avatarCircle, !guard.isActive && styles.avatarCircleInactive]}>
                        <Text style={[styles.avatarLetter, !guard.isActive && styles.avatarLetterInactive]}>{initial}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName} numberOfLines={1}>{guard.name}</Text>
                        <View style={styles.roleRow}>
                            <View style={styles.roleBadge}>
                                <MaterialCommunityIcons name="shield-check" size={14} color={SgateColors.goldDeep} style={{ marginRight: 4 }} />
                                <Text style={styles.roleBadgeText}>{guard.role || 'Security Guard'}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusPill, guard.isActive ? styles.statusPillActive : styles.statusPillInactive]}>
                            <View style={[styles.statusDot, { backgroundColor: guard.isActive ? SgateColors.green : SgateColors.red }]} />
                            <Text style={[styles.statusPillText, { color: guard.isActive ? SgateColors.green : SgateColors.red }]}>
                                {guard.isActive ? 'Currently Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Quick Actions ────────────────────────────────────── */}
                <View style={styles.quickActionsCard}>
                    <TouchableOpacity style={styles.quickAction} onPress={handleCall} activeOpacity={0.75}>
                        <View style={[styles.quickActionIcon, { backgroundColor: SgateColors.greenBg }]}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color={SgateColors.green} />
                        </View>
                        <Text style={styles.quickActionLabel}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction} activeOpacity={0.75}>
                        <View style={[styles.quickActionIcon, { backgroundColor: SgateColors.blueBg }]}>
                            <MaterialCommunityIcons name="message-text-outline" size={20} color={SgateColors.blue} />
                        </View>
                        <Text style={styles.quickActionLabel}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAction} activeOpacity={0.75}>
                        <View style={[styles.quickActionIcon, { backgroundColor: '#F3EEFF' }]}>
                            <MaterialCommunityIcons name="history" size={20} color={SgateColors.violet} />
                        </View>
                        <Text style={styles.quickActionLabel}>Logs</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Contact Information ─────────────────────────────── */}
                <Text style={styles.sectionLabel}>CONTACT INFORMATION</Text>
                <View style={styles.infoCard}>
                    <InfoRow icon="phone-outline" label="Phone" value={guard.phone} />
                    <InfoRow icon="shield-account-outline" label="Role" value={guard.role || 'Guard'} />
                    {guard.society?.name && (
                        <InfoRow icon="office-building-outline" label="Society" value={guard.society.name} last />
                    )}
                    <InfoRow
                        icon="calendar-check-outline"
                        label="Joined"
                        value={formatDate(guard.createdAt)}
                        last={!guard.society?.name}
                    />
                </View>

                {/* ── Account Status ──────────────────────────────────── */}
                <Text style={styles.sectionLabel}>ACCOUNT STATUS</Text>
                <View style={styles.infoCard}>
                    <View style={styles.statusRow}>
                        <View>
                            <Text style={styles.statusRowLabel}>Guard Status</Text>
                            <Text style={[styles.statusRowValue, { color: guard.isActive ? SgateColors.green : SgateColors.red }]}>
                                {guard.isActive ? 'Active & On Duty' : 'Deactivated'}
                            </Text>
                        </View>
                        <View style={[styles.statusIndicator, { backgroundColor: guard.isActive ? SgateColors.green : SgateColors.red }]} />
                    </View>
                </View>

                {/* ── Action Buttons ──────────────────────────────────── */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.toggleStatusBtn, guard.isActive ? styles.toggleStatusBtnDeactivate : styles.toggleStatusBtnActivate]}
                        onPress={toggleStatus}
                        activeOpacity={0.8}
                        disabled={toggling}
                    >
                        <MaterialCommunityIcons
                            name={guard.isActive ? 'account-cancel-outline' : 'account-check-outline'}
                            size={18}
                            color={guard.isActive ? SgateColors.red : '#FFFFFF'}
                        />
                        <Text style={[styles.toggleStatusBtnText, { color: guard.isActive ? SgateColors.red : '#FFFFFF' }]}>
                            {toggling ? 'Updating...' : guard.isActive ? 'Deactivate Guard' : 'Activate Guard'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="delete-outline" size={18} color={SgateColors.red} />
                        <Text style={styles.deleteBtnText}>Remove Guard</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

// ── InfoRow sub-component ────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
    return (
        <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
            <View style={styles.infoRowLeft}>
                <View style={styles.infoRowIcon}>
                    <MaterialCommunityIcons name={icon as any} size={18} color={SgateColors.goldDeep} />
                </View>
                <Text style={styles.infoRowLabel}>{label}</Text>
            </View>
            <Text style={styles.infoRowValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },

    scroll: { flex: 1 },
    scrollContent: { padding: 20 },

    // ── Profile Header (horizontal row, matching Resident Profile) ─────
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarCircleInactive: {
        backgroundColor: '#6B7FAD',
    },
    avatarLetter: {
        fontSize: 24,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
    avatarLetterInactive: {
        color: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 6,
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.goldPale,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    roleBadgeText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
        textTransform: 'uppercase',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusPillActive: { backgroundColor: SgateColors.greenBg },
    statusPillInactive: { backgroundColor: SgateColors.redBg },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusPillText: { fontSize: 12, fontFamily: SgateFonts.semibold },

    // Quick Actions (separate card below header)
    quickActionsCard: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        paddingVertical: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    quickAction: { alignItems: 'center', gap: 6 },
    quickActionIcon: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    // ── Section ──────────────────────────────────────────────────────
    sectionLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 10, paddingLeft: 4 },

    // ── Info Card ────────────────────────────────────────────────────
    infoCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    infoRowIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoRowLabel: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    infoRowValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, maxWidth: '45%', textAlign: 'right' },

    // ── Account Status ───────────────────────────────────────────────
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    statusRowLabel: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 4 },
    statusRowValue: { fontSize: 15, fontFamily: SgateFonts.bold },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },

    // ── Action Buttons ───────────────────────────────────────────────
    actionButtons: { gap: 10 },
    toggleStatusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
    },
    toggleStatusBtnActivate: { backgroundColor: SgateColors.green },
    toggleStatusBtnDeactivate: { backgroundColor: SgateColors.redBg, borderWidth: 1, borderColor: 'rgba(255,92,92,0.15)' },
    toggleStatusBtnText: { fontSize: 15, fontFamily: SgateFonts.bold },

    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: SgateColors.card,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    deleteBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.red },

    // Error
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    errorBtn: { backgroundColor: SgateColors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    errorBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
