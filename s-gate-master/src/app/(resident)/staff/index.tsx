import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Linking,
    Pressable,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateRadius, SgateShadows } from '@/constants/Sgate-theme';
import api from '../../../services/api';

const C = SgateColors;
const F = SgateFonts;

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

function StaffCard({ item, onOpen }: { item: StaffMember; onOpen: () => void }) {
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
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}'s profile`}
                onPress={onOpen}
                style={styles.profileButton}
                android_ripple={{ color: C.surface }}
            >
                <View style={styles.avatarWrapper}>
                    <View style={[styles.avatarCircle, { backgroundColor: theme.bg }]}>
                        {item.photoUrl ? (
                            <Image source={item.photoUrl} style={styles.avatarImg} contentFit="cover" transition={120} />
                        ) : (
                            <Text style={[styles.avatarInitials, { color: theme.icon }]}>{initials}</Text>
                        )}
                    </View>
                    <View style={[styles.statusDot, isInside ? styles.dotOnline : styles.dotOffline]} />
                </View>

                <View style={styles.staffInfo}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.rolePill, { backgroundColor: theme.pill }]}>
                            <Text style={[styles.roleText, { color: theme.pillText }]}>{formatType(item.staffType)}</Text>
                        </View>
                        <View style={styles.metaDot} />
                        <Text style={[styles.statusText, isInside && styles.statusTextInside]}>
                            {isInside ? 'Inside society' : 'Outside'}
                        </Text>
                    </View>
                </View>
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call ${item.name}`}
                hitSlop={8}
                onPress={handleCall}
                style={styles.callButton}
                android_ripple={{ color: C.border }}
            >
                <Ionicons name="call-outline" size={20} color={C.green} />
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={C.t4} />
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
                <MaterialCommunityIcons name={icon} size={18} color={theme.icon} />
            </View>
            <Text style={styles.catTitle}>{formatType(type)}</Text>
            <Text style={styles.catCount}>{count} {count === 1 ? 'helper' : 'helpers'}</Text>
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
    const sections = useMemo(() => {
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
        }).map(([type, data]) => ({ type, data }));
    }, [staff]);

    return (
        <View style={styles.root}>
            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn} android_ripple={{ color: C.border }}>
                        <Ionicons name="arrow-back" size={22} color={C.t1} />
                    </Pressable>
                    <Text style={styles.headerTitle}>My House Help</Text>
                    <Text style={styles.totalText}>{staff.length} total</Text>
                </View>
            </SafeAreaView>

            {loading ? (
                <AppLoader />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderSectionHeader={({ section }) => <CategoryHeader type={section.type} count={section.data.length} />}
                    renderItem={({ item }) => (
                        <StaffCard
                            item={item}
                            onOpen={() => router.push({ pathname: '/(resident)/daily-help/profile/[id]' as any, params: { id: item.id } })}
                        />
                    )}
                    ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                    SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={C.goldDeep}
                            colors={[C.goldDeep]}
                        />
                    }
                    ListEmptyComponent={(
                        <View style={styles.centered}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="people-outline" size={30} color={C.goldDeep} />
                            </View>
                            <Text style={styles.emptyText}>No staff registered yet.</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    headerSafeArea: { backgroundColor: C.card },

    // Header
    header: {
        minHeight: 58,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.borderSoft,
    },
    backBtn: {
        height: 38,
        width: 38,
        borderRadius: 19,
        backgroundColor: C.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnPressed: { opacity: 0.65 },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: F.bold,
        color: C.t1,
    },
    totalText: { fontSize: 12, fontFamily: F.semibold, color: C.goldDeep, backgroundColor: C.goldPale, paddingHorizontal: 10, paddingVertical: 6, borderRadius: SgateRadius.full },

    // Scroll
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 48,
    },

    // Category header
    catHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginBottom: 10,
    },
    catIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catTitle: {
        flex: 1,
        fontSize: 15,
        fontFamily: F.bold,
        color: C.t1,
    },
    catCount: {
        fontSize: 11,
        fontFamily: F.medium,
        color: C.t3,
    },
    sectionSeparator: { height: 22 },
    cardSeparator: { height: 8 },

    // Card
    card: {
        minHeight: 82,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
        backgroundColor: C.card,
        borderRadius: SgateRadius.lg,
        borderWidth: 1,
        borderColor: C.borderSoft,
        ...SgateShadows.minimal,
    },
    profileButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
    cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
    avatarWrapper: {
        position: 'relative',
    },
    avatarCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    avatarInitials: {
        fontSize: 19,
        fontFamily: F.bold,
    },
    statusDot: {
        position: 'absolute',
        bottom: 1,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: C.card,
    },
    dotOnline: { backgroundColor: C.green },
    dotOffline: { backgroundColor: C.t4 },
    staffInfo: { flex: 1, minWidth: 0 },
    name: {
        fontSize: 14,
        color: C.t1,
        fontFamily: F.bold,
        marginBottom: 7,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    rolePill: {
        borderRadius: SgateRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    roleText: {
        fontSize: 10,
        fontFamily: F.semibold,
    },
    metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.t4 },
    statusText: { fontSize: 10, fontFamily: F.medium, color: C.t3 },
    statusTextInside: { color: C.green },
    callButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callButtonPressed: { opacity: 0.65 },

    // Empty / loading
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center' },
    emptyText: {
        fontSize: 14,
        color: C.t3,
        fontFamily: F.medium,
    },
});
