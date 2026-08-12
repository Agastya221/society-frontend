import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Entry {
    id: string;
    visitorName: string;
    type: string;
    flatNumber?: string;
    flat?: { flatNumber: string; resident?: { name: string } };
    purpose?: string;
    checkInTime: string;
    checkOutTime: string | null;
    status: 'INSIDE' | 'EXITED' | 'WAITING_APPROVAL' | 'WAITING' | 'DENIED' | 'APPROVED';
    approvedBy?: string;
}

const TYPE_COLORS: Record<string, string> = {
    GUEST: '#3B82F6',
    DELIVERY_PERSON: '#F59E0B',
    SERVICE_PROVIDER: '#8B5CF6',
    CAB_DRIVER: '#10B981',
};

type FilterType = 'ALL' | 'GUEST' | 'DELIVERY_PERSON' | 'SERVICE_PROVIDER' | 'CAB_DRIVER';
const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Guests', value: 'GUEST' },
    { label: 'Deliveries', value: 'DELIVERY_PERSON' },
    { label: 'Workers', value: 'SERVICE_PROVIDER' },
    { label: 'Cabs', value: 'CAB_DRIVER' },
];

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDuration = (checkIn: string, checkOut: string) => {
    const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TodayEntriesScreen() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [checkingOut, setCheckingOut] = useState<string | null>(null);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<FilterType>('ALL');

    const fetchEntries = useCallback(async (fetchPage: number, currentFilter: FilterType, append = false) => {
        try {
            const typeQuery = currentFilter !== 'ALL' ? `&type=${currentFilter}` : '';
            const res = await api.get(`/api/v1/gate/entries?limit=10&page=${fetchPage}${typeQuery}`);
            
            const newEntries = res.data?.data?.entries ?? [];
            const pagination = res.data?.data?.pagination;

            if (append) {
                setEntries(prev => [...prev, ...newEntries]);
            } else {
                setEntries(newEntries);
            }

            setPage(fetchPage);
            setHasMore(pagination?.page < pagination?.pages);
        } catch (err: any) {
            console.error('Failed to fetch entries:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setFetchingMore(false);
        }
    }, []);

    // Refresh every time screen is focused (resets everything)
    useFocusEffect(useCallback(() => {
        setLoading(true);
        fetchEntries(1, filter);
    }, [fetchEntries, filter]));

    const handleFilterChange = (f: FilterType) => {
        if (f === filter) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(f);
        setLoading(true);
        fetchEntries(1, f);
    };

    const handleCheckOut = async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCheckingOut(id);
        try {
            await api.patch(`/api/v1/gate/entries/${id}/checkout`);
            // Optimistic update
            setEntries((prev) =>
                prev.map((e) =>
                    e.id === id ? { ...e, checkOutTime: new Date().toISOString(), status: 'EXITED' } : e
                )
            );
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to check out. Please try again.');
        } finally {
            setCheckingOut(null);
        }
    };

    const onRefresh = () => { 
        setRefreshing(true); 
        fetchEntries(1, filter);
    };

    const onLoadMore = () => {
        if (!hasMore || fetchingMore || loading) return;
        setFetchingMore(true);
        fetchEntries(page + 1, filter, true);
    };

    return (
        <View style={styles.container}>
            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTERS.map((f) => {
                        const isActive = filter === f.value;
                        return (
                            <Pressable
                                key={f.value}
                                onPress={() => handleFilterChange(f.value)}
                                style={[styles.filterTab, isActive && styles.filterTabActive]}
                            >
                                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <ScreenLoading label="Loading gate activity…" />
            ) : entries.length === 0 ? (
                <ScreenEmpty icon="calendar-outline" title="No entries yet" message="Visitors checked in at this gate will appear here." />
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <EntryCard
                            entry={item}
                            checkingOut={checkingOut === item.id}
                            onCheckOut={() => handleCheckOut(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GuardColors.goldDeep} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={fetchingMore ? <ActivityIndicator size="small" color={GuardColors.goldDeep} style={{ marginVertical: 20 }} /> : null}
                />
            )}
        </View>
    );
}

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({
    entry, checkingOut, onCheckOut,
}: {
    entry: Entry; checkingOut: boolean; onCheckOut: () => void;
}) {
    const color = TYPE_COLORS[entry.type] ?? '#6B7280';
    
    // Status Logic
    const isInside = entry.status === 'INSIDE';
    const isExited = entry.status === 'EXITED';
    const isWaiting = ['WAITING_APPROVAL', 'WAITING'].includes(entry.status);

    let statusColor = '#374151'; // default text
    let statusBg = '#F3F4F6'; // default bg
    let statusDot = '#6B7280'; // default dot

    if (isInside) {
        statusBg = '#D1FAE5';
        statusColor = '#047857';
        statusDot = '#10B981';
    } else if (isExited) {
        statusBg = '#F3F4F6';
        statusColor = '#374151';
        statusDot = '#6B7280';
    } else if (isWaiting) {
        statusBg = '#FEF3C7';
        statusColor = '#D97706';
        statusDot = '#F59E0B';
    }

    const rawFlat = entry.flat?.flatNumber ?? entry.flatNumber ?? '—';
    const flatLabel = rawFlat === 'OFFICE' ? 'Admin Office' : rawFlat;
    const residentName = entry.flat?.resident?.name;

    // Infer Icon
    let iconName: any = 'person';
    if (entry.type === 'DELIVERY_PERSON') iconName = 'cube';
    else if (entry.type === 'SERVICE_PROVIDER') iconName = 'construct';
    else if (entry.type === 'CAB_DRIVER') iconName = 'car';

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
                        <Ionicons name={iconName} size={20} color={color} />
                    </View>
                    <View style={styles.cardHeaderText}>
                        <Text style={styles.visitorName}>{entry.visitorName}</Text>
                        <Text style={styles.visitorDetails}>
                            Flat {flatLabel}{residentName ? ` • ${residentName}` : ''}
                            {entry.purpose ? ` • ${entry.purpose}` : ''}
                        </Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {isInside ? 'INSIDE' : isExited ? 'EXITED' : 'WAITING'}
                    </Text>
                </View>
            </View>

            {/* Times */}
            <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                    <Ionicons name="enter-outline" size={16} color="#10B981" />
                    <Text style={styles.timeLabel}>Check-In:</Text>
                    <Text style={styles.timeValue}>{entry.checkInTime ? formatTime(entry.checkInTime) : '—'}</Text>
                </View>
                <View style={styles.timeRow}>
                    <Ionicons name="exit-outline" size={16} color="#6B7280" />
                    <Text style={styles.timeLabel}>Check-Out:</Text>
                    <Text style={styles.timeValue}>{entry.checkOutTime ? formatTime(entry.checkOutTime) : '—'}</Text>
                </View>
                {entry.checkInTime && entry.checkOutTime && (
                    <View style={styles.durationBanner}>
                        <Ionicons name="time-outline" size={16} color={GuardColors.goldDeep} />
                        <Text style={styles.durationText}>
                            Duration: <Text style={styles.durationValue}>{formatDuration(entry.checkInTime, entry.checkOutTime)}</Text>
                        </Text>
                    </View>
                )}
            </View>

            {/* Check-out button */}
            {isInside && (
                <Pressable
                    onPress={onCheckOut}
                    disabled={checkingOut}
                    style={[styles.checkOutButton, checkingOut && styles.checkOutButtonPressed]}
                >
                    {checkingOut ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="exit-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.checkOutButtonText}>Check Out</Text>
                        </>
                    )}
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GuardColors.bg },
    filterContainer: { backgroundColor: '#FFFFFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterScroll: { paddingHorizontal: 20, gap: 10 },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
    filterTabActive: { backgroundColor: GuardColors.ink },
    filterText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
    filterTextActive: { color: '#FFFFFF' },
    listContent: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: GuardColors.card, borderRadius: 18, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderWidth: 1, borderColor: GuardColors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardHeaderText: { flex: 1 },
    visitorName: { fontSize: 17, fontWeight: '800', color: '#1F2937', marginBottom: 2 },
    visitorDetails: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    timeSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16 },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    timeLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', width: 90 },
    timeValue: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
    durationBanner: { marginTop: 4, backgroundColor: GuardColors.goldPale, borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    durationText: { fontSize: 13, fontWeight: '600', color: GuardColors.t2 },
    durationValue: { fontWeight: '900', color: GuardColors.t1 },
    checkOutButton: { backgroundColor: GuardColors.red, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    checkOutButtonPressed: { backgroundColor: '#B91C1C', transform: [{ scale: 0.97 }] },
    checkOutButtonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
