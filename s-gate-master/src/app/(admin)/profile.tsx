import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminProfile() {
    const router = useRouter();
    const { user: authUser, logout } = useAuthStore();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit modal
    const [editVisible, setEditVisible] = useState(false);
    const [editName, setEditName]       = useState('');
    const [editEmail, setEditEmail]     = useState('');
    const [saving, setSaving]           = useState(false);

    useFocusEffect(useCallback(() => { fetchProfile(); }, []));

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/resident-app/profile');
            setProfile(res.data?.data ?? null);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const user = profile || authUser;

    // ── Derived display values ───────────────────────────────────────────────
    const displayName    = profile?.name ?? authUser?.name ?? '';
    const displayRole    = profile?.role ?? authUser?.role ?? '';
    const displayEmail   = profile?.email ?? authUser?.email ?? '';
    const displayPhone   = profile?.phone ?? authUser?.phone ?? '';
    const displaySociety = profile?.society?.name ?? authUser?.society?.name ?? 'N/A';
    const displaySocietyAddress = profile?.society
        ? `${profile.society.address}, ${profile.society.city}` : '';
    const displayFlat = profile?.flat
        ? `${profile.flat.block?.name ?? ''} - ${profile.flat.number}`.trim().replace(/^-\s*/, '')
        : authUser?.flat
            ? `${authUser.flat.block?.name ?? ''} - ${authUser.flat.number}`
            : '';
    const initials = displayName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'A';

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: async () => await logout() },
        ]);
    };

    const openEditModal = () => {
        setEditName(displayName);
        setEditEmail(displayEmail);
        setEditVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) { Alert.alert('Error', 'Name is required'); return; }
        setSaving(true);
        try {
            const res = await api.patch('/auth/resident-app/profile', {
                name: editName.trim(),
                email: editEmail.trim() || undefined,
            });
            const updated = res.data?.data;
            if (updated) {
                setProfile(updated);
                useAuthStore.setState({
                    user: { ...authUser!, name: updated.name, email: updated.email },
                });
            }
            setEditVisible(false);
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // ── Loading / empty ──────────────────────────────────────────────────────
    if (loading && !authUser) {
        return (
            <SafeAreaView edges={['top']} style={styles.centerSafe}>
                <AppLoader />
            </SafeAreaView>
        );
    }
    if (!user) {
        return (
            <SafeAreaView edges={['top']} style={styles.centerSafe}>
                <Text style={{ color: SgateColors.t3, fontFamily: SgateFonts.regular }}>Loading…</Text>
            </SafeAreaView>
        );
    }

    // ── Menu item helper ─────────────────────────────────────────────────────
    const MenuItem = ({ icon, label, onPress, isDanger = false }: {
        icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; isDanger?: boolean;
    }) => (
        <TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
                <View style={[styles.menuIconWrap, isDanger && styles.menuIconDanger]}>
                    <Feather name={icon} size={16} color={isDanger ? SgateColors.red : SgateColors.t3} />
                </View>
                <Text style={[styles.menuLabel, isDanger && styles.menuLabelDanger]}>{label}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={SgateColors.t4} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* ── Hero card ───────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.heroCard}>
                    <View style={styles.heroAvatarWrap}>
                        <View style={styles.heroAvatar}>
                            <Text style={styles.heroAvatarText}>{initials}</Text>
                        </View>
                    </View>
                    <Text style={styles.heroName}>{displayName}</Text>
                    <Text style={styles.heroSociety}>{displaySociety}</Text>
                    <View style={styles.heroBadgeWrap}>
                        <View style={styles.heroBadge}>
                            <Feather name="shield" size={11} color={SgateColors.gold} style={{ marginRight: 4 }} />
                            <Text style={styles.heroBadgeText}>{displayRole}</Text>
                        </View>
                    </View>
                    {displaySocietyAddress ? (
                        <Text style={styles.heroAddress}>{displaySocietyAddress}</Text>
                    ) : null}
                    <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
                        <Feather name="edit-2" size={13} color={SgateColors.gold} />
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Stats row ───────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsRow}>
                    {[
                        { label: 'Role', value: displayRole },
                        { label: 'Society', value: displaySociety },
                        { label: 'Flat', value: displayFlat || '—' },
                    ].map((s, i) => (
                        <View key={i} style={[styles.statItem, i < 2 && styles.statDivider]}>
                            <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </Animated.View>

                {/* ── Account info ────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.sectionLabel}>ACCOUNT INFORMATION</Text>
                    <View style={styles.infoCard}>
                        <InfoRow label="Email" value={displayEmail || 'Not set'} />
                        <InfoRow label="Phone" value={displayPhone} />
                        {displayFlat ? <InfoRow label="Flat" value={displayFlat} /> : null}
                        <InfoRow label="User ID" value={profile?.id ?? authUser?.id ?? ''} mono />
                    </View>
                </Animated.View>

                {/* ── Settings menu ───────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <Text style={styles.sectionLabel}>SETTINGS & SUPPORT</Text>
                    <View style={styles.menuCard}>
                        <MenuItem icon="bell" label="Notifications" onPress={() => {}} />
                        <MenuItem icon="shield" label="Security Settings" onPress={() => {}} />
                        <MenuItem icon="lock" label="Privacy" onPress={() => {}} />
                        <MenuItem icon="users" label="Family Members" onPress={() => {}} />
                        <MenuItem icon="clock" label="Activity History" onPress={() => {}} />
                        <View style={styles.menuDivider} />
                        <MenuItem icon="log-out" label="Logout" onPress={handleLogout} isDanger />
                    </View>
                </Animated.View>

                <Text style={styles.versionText}>Version 1.0.0 (Build 124)</Text>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Edit profile modal ──────────────────────────────────────── */}
            <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView edges={['top']} style={styles.modalSafe}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={() => setEditVisible(false)}>
                            <Feather name="x" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalLabel}>NAME</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Your name"
                        placeholderTextColor={SgateColors.t4}
                    />

                    <Text style={styles.modalLabel}>EMAIL</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="email@example.com"
                        placeholderTextColor={SgateColors.t4}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Info row helper ─────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, mono && styles.infoMono]} numberOfLines={1}>{value}</Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    centerSafe: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },

    // Header
    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Hero
    heroCard: {
        backgroundColor: SgateColors.black,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
    },
    heroAvatarWrap: { marginBottom: 14 },
    heroAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    heroAvatarText: { fontSize: 26, fontFamily: SgateFonts.bold, color: SgateColors.black },
    heroName: { fontSize: 20, fontFamily: SgateFonts.extrabold, color: '#FFFFFF', marginBottom: 2 },
    heroSociety: { fontSize: 13, fontFamily: SgateFonts.regular, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
    heroBadgeWrap: { marginBottom: 6 },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.gold + '20',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    heroBadgeText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.gold, textTransform: 'uppercase' },
    heroAddress: { fontSize: 12, fontFamily: SgateFonts.regular, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'center' },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 14,
    },
    editBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.gold },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        backgroundColor: SgateColors.card,
        marginHorizontal: 20,
        marginTop: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { borderRightWidth: 1, borderRightColor: SgateColors.borderSoft },
    statValue: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 2 },
    statLabel: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    // Section label
    sectionLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, paddingHorizontal: 21, marginTop: 24, marginBottom: 10 },

    // Info card
    infoCard: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    infoLabel: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    infoValue: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1, flex: 1, textAlign: 'right', marginLeft: 16 },
    infoMono: { fontFamily: SgateFonts.regular, fontSize: 12, color: SgateColors.t3 },

    // Menu
    menuCard: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuIconDanger: { backgroundColor: SgateColors.redBg },
    menuLabel: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    menuLabelDanger: { color: SgateColors.red },
    menuDivider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 4 },

    versionText: { textAlign: 'center', fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 28 },

    // Modal
    modalSafe: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    modalLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8 },
    modalInput: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 15,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
        marginBottom: 18,
    },
    saveBtn: {
        backgroundColor: SgateColors.black,
        borderRadius: 16,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    saveBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
