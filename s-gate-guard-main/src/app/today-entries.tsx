import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Platform,
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

    const fetchEntries = useCallback(async (isLoadMore = false, currentFilter = filter) => {
        try {
            const fetchPage = isLoadMore ? page + 1 : 1;
            const typeQuery = currentFilter !== 'ALL' ? `&type=${currentFilter}` : '';
            const res = await api.get(`/api/v1/gate/entries?limit=10&page=${fetchPage}${typeQuery}`);
            
            const newEntries = res.data?.data?.entries ?? [];
            const pagination = res.data?.data?.pagination;

            if (isLoadMore) {
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
    }, [page, filter]);

    // Refresh every time screen is focused (resets everything)
    useFocusEffect(useCallback(() => {
        setLoading(true);
        fetchEntries(false, filter);
    }, [filter]));

    const handleFilterChange = (f: FilterType) => {
        if (f === filter) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(f);
        setLoading(true);
        fetchEntries(false, f);
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
        fetchEntries(false, filter); 
    };

    const onLoadMore = () => {
        if (!hasMore || fetchingMore || loading) return;
        setFetchingMore(true);
        fetchEntries(true, filter);
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
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Loading entries...</Text>
                </View>
            ) : entries.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>No Entries Found</Text>
                    <Text style={styles.emptySubtitle}>Approved visitors will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <EntryCard
                            entry={item}
                            index={index}
                            checkingOut={checkingOut === item.id}
                            onCheckOut={() => handleCheckOut(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={fetchingMore ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 20 }} /> : null}
                />
            )}
        </View>
    );
}

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({
    entry, index, checkingOut, onCheckOut,
}: {
    entry: Entry; index: number; checkingOut: boolean; onCheckOut: () => void;
}) {
    const color = TYPE_COLORS[entry.type] ?? '#6B7280';
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;
    
    // Status Logic
    const isInside = entry.status === 'INSIDE';
    const isExited = entry.status === 'EXITED';
    const isWaiting = ['WAITING_APPROVAL', 'WAITING'].includes(entry.status);

    let statusText: string = entry.status;
    let statusColor = '#374151'; // default text
    let statusBg = '#F3F4F6'; // default bg
    let statusDot = '#6B7280'; // default dot

    if (isInside) {
        statusText = 'INSIDE';
        statusBg = '#D1FAE5';
        statusColor = '#047857';
        statusDot = '#10B981';
    } else if (isExited) {
        statusText = 'EXITED';
        statusBg = '#F3F4F6';
        statusColor = '#374151';
        statusDot = '#6B7280';
    } else if (isWaiting) {
        statusText = 'WAITING';
        statusBg = '#FEF3C7';
        statusColor = '#D97706';
        statusDot = '#F59E0B';
    }

    const flatLabel = entry.flat?.flatNumber ?? entry.flatNumber ?? '—';
    const residentName = entry.flat?.resident?.name;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, delay: Math.min(index * 50, 500), duration: 400, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, delay: Math.min(index * 50, 500), tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    // Infer Icon
    let iconName: any = 'person';
    if (entry.type === 'DELIVERY_PERSON') iconName = 'cube';
    else if (entry.type === 'SERVICE_PROVIDER') iconName = 'construct';
    else if (entry.type === 'CAB_DRIVER') iconName = 'car';

    return (
        <Animated.View style={[styles.card, { borderLeftColor: color, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
                        <Ionicons name="time-outline" size={16} color="#3B82F6" />
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
                    style={({ pressed }) => [styles.checkOutButton, (pressed || checkingOut) && styles.checkOutButtonPressed]}
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
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    filterContainer: { backgroundColor: '#FFFFFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterScroll: { paddingHorizontal: 20, gap: 10 },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
    filterTabActive: { backgroundColor: '#3B82F6' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
    filterTextActive: { color: '#FFFFFF' },
    listContent: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16, borderLeftWidth: 4, borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 }, android: { elevation: 3 } }) },
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
    durationBanner: { marginTop: 4, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    durationText: { fontSize: 13, fontWeight: '600', color: '#1E40AF' },
    durationValue: { fontWeight: '900', color: '#1D4ED8' },
    checkOutButton: { backgroundColor: '#DC2626', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...Platform.select({ ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
    checkOutButtonPressed: { backgroundColor: '#B91C1C', transform: [{ scale: 0.97 }] },
    checkOutButtonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginBottom: 8 },
    emptySubtitle: { fontSize: 15, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },
});
