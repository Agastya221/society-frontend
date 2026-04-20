import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
    id: string;
    name: string;
    staffType: string;
    phone: string;
    photoUrl?: string;
    isVerified: boolean;
    overallRating?: number;
    status: 'INSIDE' | 'OUTSIDE';
    lastCheckIn?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
    MAID: 'Maid',
    COOK: 'Cook',
    NANNY: 'Nanny',
    DRIVER: 'Driver',
    CLEANER: 'Cleaner',
    GARDENER: 'Gardener',
    LAUNDRY: 'Laundry',
    CARETAKER: 'Caretaker',
    SECURITY_GUARD: 'Security Guard',
    OTHER: 'Other',
};

const TYPE_ICON: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
    MAID: 'broom',
    COOK: 'chef-hat',
    NANNY: 'baby-carriage',
    DRIVER: 'car',
    CLEANER: 'spray-bottle',
    GARDENER: 'flower-tulip',
    LAUNDRY: 'washing-machine',
    CARETAKER: 'medical-bag',
    SECURITY_GUARD: 'shield-account',
    OTHER: 'account-question',
};

const TYPE_COLOR: Record<string, { bg: string; icon: string; pill: string; pillText: string }> = {
    MAID:           { bg: '#f0fdf4', icon: '#16a34a', pill: '#dcfce7', pillText: '#15803d' },
    COOK:           { bg: '#fff7ed', icon: '#ea580c', pill: '#ffedd5', pillText: '#c2410c' },
    NANNY:          { bg: '#fdf2f8', icon: '#db2777', pill: '#fce7f3', pillText: '#be185d' },
    DRIVER:         { bg: '#eff6ff', icon: '#2563eb', pill: '#dbeafe', pillText: '#1d4ed8' },
    CLEANER:        { bg: '#f0f9ff', icon: '#0284c7', pill: '#e0f2fe', pillText: '#0369a1' },
    GARDENER:       { bg: '#f7fee7', icon: '#65a30d', pill: '#ecfccb', pillText: '#4d7c0f' },
    LAUNDRY:        { bg: '#f0fdfa', icon: '#0d9488', pill: '#ccfbf1', pillText: '#0f766e' },
    CARETAKER:      { bg: '#fefce8', icon: '#ca8a04', pill: '#fef9c3', pillText: '#a16207' },
    SECURITY_GUARD: { bg: '#fff1f2', icon: '#e11d48', pill: '#ffe4e6', pillText: '#be123c' },
    OTHER:          { bg: '#f8fafc', icon: '#64748b', pill: '#e2e8f0', pillText: '#475569' },
};

function getTypeTheme(type: string) {
    return TYPE_COLOR[type.toUpperCase()] ?? TYPE_COLOR.OTHER;
}

function formatType(type: string): string {
    return TYPE_LABEL[type.toUpperCase()] ?? type.replace(/_/g, ' ');
}

function getTypeIcon(type: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
    return TYPE_ICON[type.toUpperCase()] ?? 'account-circle-outline';
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({ item }: { item: StaffMember }) {
    const isInside = item.status === 'INSIDE';
    const theme = getTypeTheme(item.staffType);
    const initials = item.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const handleCall = () => {
        if (item.phone) Linking.openURL(`tel:${item.phone}`);
    };

    return (
        <View style={styles.card}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.bg }]}>
                    {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.avatarImg} />
                    ) : (
                        <Text style={[styles.avatarInitials, { color: theme.icon }]}>{initials}</Text>
                    )}
                </View>
                {/* Status dot */}
                <View style={[styles.statusDot, isInside ? styles.dotOnline : styles.dotOffline]} />
            </View>

            {/* Name */}
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

            {/* Role pill */}
            <View style={[styles.rolePill, { backgroundColor: theme.pill }]}>
                <Text style={[styles.roleText, { color: theme.pillText }]}>{formatType(item.staffType)}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.7}>
                    <Ionicons name="call" size={20} color="#22c55e" />
                </TouchableOpacity>
                <View style={styles.actionSep} />
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name="notifications-outline" size={20} color="#374151" />
                </TouchableOpacity>
                <View style={styles.actionSep} />
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Ionicons name="star-outline" size={20} color="#374151" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Category Section Header ──────────────────────────────────────────────────

function CategoryHeader({ type, count }: { type: string; count: number }) {
    const theme = getTypeTheme(type);
    const icon = getTypeIcon(type);
    return (
        <View style={styles.catHeader}>
            <View style={[styles.catIconBox, { backgroundColor: theme.bg }]}>
                <MaterialCommunityIcons name={icon} size={20} color={theme.icon} />
            </View>
            <Text style={styles.catTitle}>{formatType(type)}</Text>
            <View style={[styles.catCountPill, { backgroundColor: theme.pill }]}>
                <Text style={[styles.catCount, { color: theme.pillText }]}>{count}</Text>
            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StaffScreen() {
    const router = useRouter();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff/domestic');
            const d = res.data;
            setStaff(d?.data?.staff ?? d?.data?.members ?? d?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchStaff(); }, []));

    const onRefresh = () => {
        setRefreshing(true);
        fetchStaff();
    };

    // Group staff by staffType, preserving a stable order
    const grouped = useMemo(() => {
        const map: Record<string, StaffMember[]> = {};
        staff.forEach((s) => {
            const key = s.staffType.toUpperCase();
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        // Sort keys by TYPE_LABEL order, then alphabetically for unknowns
        const order = Object.keys(TYPE_LABEL);
        return Object.entries(map).sort(([a], [b]) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
    }, [staff]);

    return (
        <View style={styles.root}>
            {/* Header */}
            <SafeAreaView edges={['top']} style={{ backgroundColor: 'white' }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My House Help</Text>
                    <View style={styles.badgeTotal}>
                        <Text style={styles.badgeTotalText}>{staff.length}</Text>
                    </View>
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#ca8a04" />
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#ca8a04"
                            colors={['#ca8a04']}
                        />
                    }
                >
                    {grouped.length === 0 ? (
                        <View style={styles.centered}>
                            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No staff registered yet.</Text>
                        </View>
                    ) : (
                        grouped.map(([type, members]) => (
                            <View key={type} style={styles.section}>
                                <CategoryHeader type={type} count={members.length} />
                                <View style={styles.grid}>
                                    {members.map((item) => (
                                        <StaffCard key={item.id} item={item} />
                                    ))}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    // Header
    header: {
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backBtn: {
        height: 40,
        width: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontFamily: 'Sora-Bold',
        color: '#111827',
        fontWeight: '700',
    },
    badgeTotal: {
        backgroundColor: '#FEF9C3',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#FDE047',
    },
    badgeTotalText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#a16207',
    },

    // Scroll
    scrollContent: {
        padding: 16,
        paddingBottom: 48,
    },

    // Section
    section: {
        marginBottom: 28,
    },

    // Category header
    catHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    catIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: 'Sora-Bold',
        fontWeight: '700',
        color: '#111827',
    },
    catCountPill: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    catCount: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },

    // Card
    card: {
        width: '47.5%',
        backgroundColor: 'white',
        borderRadius: 20,
        alignItems: 'center',
        paddingTop: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 14,
    },
    avatarCircle: {
        width: 86,
        height: 86,
        borderRadius: 43,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: 86,
        height: 86,
        borderRadius: 43,
    },
    avatarInitials: {
        fontSize: 30,
        fontWeight: '700',
        fontFamily: 'Sora-Bold',
    },
    statusDot: {
        position: 'absolute',
        bottom: 4,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'white',
    },
    dotOnline: { backgroundColor: '#22c55e' },
    dotOffline: { backgroundColor: '#94a3b8' },
    name: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        fontFamily: 'Sora-Bold',
        marginBottom: 10,
        paddingHorizontal: 10,
        textAlign: 'center',
    },
    rolePill: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 5,
        marginBottom: 18,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#f1f5f9',
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionSep: {
        width: 1,
        backgroundColor: '#f1f5f9',
    },

    // Empty / loading
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
});
