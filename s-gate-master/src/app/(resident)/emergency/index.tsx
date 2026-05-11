import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '../../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Emergency {
    id: string;
    type: string;
    status: string;
    description?: string;
    location?: string;
    createdAt: string;
    resolvedAt?: string;
    flatId?: string;
    reportedById?: string;
    respondedBy?: { id: string; name: string } | null;
    sender?: { name: string; flat?: string } | null;
    reportedBy?: { name?: string; firstName?: string; lastName?: string; phone?: string };
    flat?: { flatNumber?: string; number?: string };
    notes?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ComponentProps<typeof MaterialIcons>['name']; bg: string; color: string; label: string }> = {
    MEDICAL:       { icon: 'medical-services',      bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Medical' },
    FIRE:          { icon: 'local-fire-department', bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Fire' },
    SECURITY:      { icon: 'security',              bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Security' },
    LIFT_STUCK:    { icon: 'elevator',              bg: SgateColors.blueBg,   color: SgateColors.blue,     label: 'Lift Stuck' },
    ANIMAL_THREAT: { icon: 'pets',                  bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Animal Threat' },
    THEFT:         { icon: 'lock-open',             bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Theft' },
    VIOLENCE:      { icon: 'report-problem',        bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Violence' },
    ACCIDENT:      { icon: 'car-crash',             bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Accident' },
    OTHER:         { icon: 'more-horiz',            bg: SgateColors.surface,  color: SgateColors.t2,       label: 'Other' },
};

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    TRIGGERED:    { bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Active' },
    ACTIVE:       { bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Active' },
    ACKNOWLEDGED: { bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Acknowledged' },
    RESOLVED:     { bg: SgateColors.greenBg,  color: '#065f46',            label: 'Resolved' },
    FALSE_ALARM:  { bg: SgateColors.surface,  color: SgateColors.t3,       label: 'False Alarm' },
};

const FILTERS = [
    { key: 'ALL',      label: 'All' },
    { key: 'ACTIVE',   label: 'Active' },
    { key: 'RESOLVED', label: 'Resolved' },
];

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function EmergencyListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [isLoading, setIsLoading]     = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter]           = useState('ALL');

    const fetchEmergencies = useCallback(async () => {
        try {
            const res = await api.get('/community/emergencies');
            let list: Emergency[] = [];
            if (Array.isArray(res.data?.data?.emergencies)) {
                list = res.data.data.emergencies;
            } else if (Array.isArray(res.data?.data)) {
                list = res.data.data;
            } else if (Array.isArray(res.data?.emergencies)) {
                list = res.data.emergencies;
            }
            setEmergencies(list);
        } catch (err: any) {
            console.error('Failed to fetch emergencies:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchEmergencies(); }, [fetchEmergencies]));

    const onRefresh = () => { setIsRefreshing(true); fetchEmergencies(); };

    const filtered = emergencies.filter((e) => {
        if (filter === 'ALL') return true;
        if (filter === 'ACTIVE') return e.status === 'TRIGGERED' || e.status === 'ACTIVE' || e.status === 'ACKNOWLEDGED';
        if (filter === 'RESOLVED') return e.status === 'RESOLVED' || e.status === 'FALSE_ALARM';
        return true;
    });

    const activeCount = emergencies.filter(
        (e) => e.status === 'TRIGGERED' || e.status === 'ACTIVE' || e.status === 'ACKNOWLEDGED'
    ).length;

    const renderItem = ({ item, index }: { item: Emergency; index: number }) => {
        const meta   = TYPE_META[item.type]   ?? TYPE_META.OTHER;
        const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.TRIGGERED;
        const isActive = item.status === 'TRIGGERED' || item.status === 'ACTIVE';

        const senderName = item.sender?.name || item.reportedBy?.name || item.reportedBy?.firstName || 'Unknown';
        const flatName = item.sender?.flat || item.flat?.flatNumber || item.flat?.number;

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <View style={[styles.card, isActive && styles.cardActive]}>
                    {/* Top row */}
                    <View style={styles.cardTop}>
                        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                            <MaterialIcons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={styles.cardInfo}>
                            <View style={styles.cardTitleRow}>
                                <Text style={styles.typeLabel}>{meta.label}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                </View>
                            </View>
                            {/* Reporter */}
                            <Text style={styles.senderText} numberOfLines={1}>
                                {senderName}
                                {flatName ? ` · Flat ${flatName}` : ''}
                            </Text>
                            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    {!!item.description && (
                        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                    )}

                    {/* Location */}
                    {!!item.location && (
                        <View style={styles.locationRow}>
                            <MaterialIcons name="location-on" size={12} color={SgateColors.t3} />
                            <Text style={styles.locationText}>{item.location}</Text>
                        </View>
                    )}

                    {/* Resolution note */}
                    {!!item.notes && (
                        <View style={styles.resolveNoteWrap}>
                            <Text style={styles.resolveNoteLabel}>Resolution:</Text>
                            <Text style={styles.resolveNoteText}>{item.notes}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    const ListHeader = () => (
        <>
            {/* Hero banner */}
            <View style={styles.heroBanner}>
                <View style={styles.heroBgIcon}>
                    <MaterialIcons name="shield" size={160} color="rgba(255,255,255,0.08)" />
                </View>
                <View style={{ flex: 1, zIndex: 1 }}>
                    <Text style={styles.heroTitle}>Need Help?</Text>
                    <Text style={styles.heroSub}>
                        Instantly alert guards &amp; security teams in case of any emergency.
                    </Text>
                    <TouchableOpacity
                        style={styles.heroBtn}
                        onPress={() => router.push('/(resident)/emergency/create' as any)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.heroBtnIcon}>
                            <MaterialIcons name="warning" size={18} color={SgateColors.red} />
                        </View>
                        <Text style={styles.heroBtnText}>Raise SOS</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Section title */}
            <Text style={styles.sectionTitle}>Society Alerts</Text>
        </>
    );

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Emergency Alerts</Text>
                        <Text style={styles.headerSub}>SOS alerts &amp; incident history</Text>
                    </View>
                    {activeCount > 0 && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{activeCount} ACTIVE</Text>
                        </View>
                    )}
                </View>

                {/* Filter tabs */}
                <View style={styles.filterRow}>
                    {FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                            onPress={() => setFilter(f.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {isLoading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialIcons name="shield" size={56} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>No emergencies</Text>
                            <Text style={styles.emptySub}>Society is safe.</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={SgateColors.red}
                            colors={[SgateColors.red]}
                        />
                    }
                />
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header
    headerWrapper: {
        backgroundColor: SgateColors.card,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub:   { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: SgateColors.redBg,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SgateColors.red },
    liveText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.red, letterSpacing: 0.5 },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    listContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },

    // Hero Banner
    heroBanner: {
        backgroundColor: SgateColors.red,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroBgIcon: {
        position: 'absolute',
        right: -20,
        top: -20,
    },
    heroTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: '#FFFFFF', marginBottom: 6 },
    heroSub: {
        fontSize: 13, fontFamily: SgateFonts.regular, color: 'rgba(255,255,255,0.8)',
        lineHeight: 18, marginBottom: 16,
    },
    heroBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 16,
        paddingVertical: 10, paddingHorizontal: 16,
        alignSelf: 'flex-start', gap: 8,
    },
    heroBtnIcon: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: SgateColors.redBg, alignItems: 'center', justifyContent: 'center',
    },
    heroBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.red },

    sectionTitle: {
        fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t3,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
    },

    // Cards (same design as admin, read-only)
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 10,
    },
    cardActive: { borderColor: SgateColors.red + '50', borderWidth: 1.5 },

    cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    typeLabel: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold },
    senderText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginBottom: 2 },
    timeText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    description: {
        fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        lineHeight: 18, marginBottom: 8,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    locationText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    resolveNoteWrap: {
        backgroundColor: SgateColors.greenBg,
        borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 6,
        marginBottom: 8,
    },
    resolveNoteLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: '#065f46', marginBottom: 2 },
    resolveNoteText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.7 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 12, marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
