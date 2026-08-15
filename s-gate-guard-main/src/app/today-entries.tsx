import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
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
    recordKind: 'ENTRY' | 'STAFF_ATTENDANCE';
    visitorName: string;
    type: 'VISITOR' | 'DELIVERY' | 'DOMESTIC_STAFF' | 'CAB' | 'VENDOR';
    flatNumber?: string;
    purpose?: string;
    companyName?: string;
    visitorType?: string;
    staffType?: string;
    checkInTime: string;
    checkOutTime: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_IN' | 'CHECKED_OUT';
}

const TYPE_COLORS: Record<string, string> = {
    VISITOR: '#3B82F6',
    DELIVERY: '#F59E0B',
    DOMESTIC_STAFF: '#0D9488',
    VENDOR: '#8B5CF6',
    CAB: '#10B981',
};

type FilterType = 'ALL' | Entry['type'];
const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Guests', value: 'VISITOR' },
    { label: 'Deliveries', value: 'DELIVERY' },
    { label: 'Staff', value: 'DOMESTIC_STAFF' },
    { label: 'Services', value: 'VENDOR' },
    { label: 'Cabs', value: 'CAB' },
];

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDuration = (checkIn: string, checkOut: string) => {
    const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const isToday = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
};

const cleanLabel = (value?: string) => value?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TodayEntriesScreen() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [checkingOut, setCheckingOut] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('ALL');

    const fetchEntries = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/guard/today');
            const rawEntries = res.data?.data?.entries ?? [];
            const staffAttendances = res.data?.data?.staffAttendances ?? [];

            const visitorEntries: Entry[] = rawEntries.map((entry: any) => ({
                id: entry.id,
                recordKind: 'ENTRY',
                visitorName: entry.visitorName ?? entry.companyName ?? 'Visitor',
                type: entry.type,
                flatNumber: entry.flat?.flatNumber ?? entry.flat?.number ?? entry.flatNumber,
                purpose: entry.purpose,
                companyName: entry.companyName,
                visitorType: entry.visitorType,
                checkInTime: entry.checkInTime ?? entry.createdAt,
                checkOutTime: entry.checkOutTime ?? entry.checkOutAt ?? null,
                status: entry.status,
            }));

            const staffEntries: Entry[] = staffAttendances.map((attendance: any) => ({
                id: attendance.id,
                recordKind: 'STAFF_ATTENDANCE',
                visitorName: attendance.domesticStaff?.name ?? attendance.staffName ?? 'Staff member',
                type: 'DOMESTIC_STAFF',
                flatNumber: attendance.flat?.flatNumber ?? attendance.flatNumber,
                staffType: attendance.domesticStaff?.staffType ?? attendance.staffType,
                checkInTime: attendance.checkInTime,
                checkOutTime: attendance.checkOutTime ?? null,
                status: attendance.checkOutTime ? 'CHECKED_OUT' : 'CHECKED_IN',
            }));

            const todayEntries = [...visitorEntries, ...staffEntries]
                .filter((entry) => entry.checkInTime && isToday(entry.checkInTime))
                .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

            setEntries(todayEntries);
        } catch (err: any) {
            console.error('Failed to fetch entries:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const visibleEntries = useMemo(
        () => filter === 'ALL' ? entries : entries.filter((entry) => entry.type === filter),
        [entries, filter]
    );

    // Refresh every time screen is focused (resets everything)
    useFocusEffect(useCallback(() => {
        setLoading(true);
        fetchEntries();
    }, [fetchEntries]));

    const handleFilterChange = (f: FilterType) => {
        if (f === filter) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(f);
    };

    const handleCheckOut = useCallback(async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCheckingOut(id);
        try {
            await api.patch(`/api/v1/guard/entries/${id}/checkout`);
            // Optimistic update
            setEntries((prev) =>
                prev.map((e) =>
                    e.id === id ? { ...e, checkOutTime: new Date().toISOString(), status: 'CHECKED_OUT' } : e
                )
            );
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to check out. Please try again.');
        } finally {
            setCheckingOut(null);
        }
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEntries();
    };

    const renderEntry = useCallback(({ item }: { item: Entry }) => (
        <EntryCard
            entry={item}
            checkingOut={checkingOut === item.id}
            onCheckOut={handleCheckOut}
        />
    ), [checkingOut, handleCheckOut]);

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
            ) : visibleEntries.length === 0 ? (
                <ScreenEmpty icon="calendar-outline" title="No entries yet" message="Today’s matching gate activity will appear here." />
            ) : (
                <FlatList
                    data={visibleEntries}
                    keyExtractor={(item) => `${item.recordKind}:${item.id}`}
                    renderItem={renderEntry}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GuardColors.goldDeep} />}
                />
            )}
        </View>
    );
}

// ── Entry Card ────────────────────────────────────────────────────────────────
const EntryCard = memo(function EntryCard({
    entry, checkingOut, onCheckOut,
}: {
    entry: Entry; checkingOut: boolean; onCheckOut: (id: string) => void;
}) {
    const color = TYPE_COLORS[entry.type] ?? '#6B7280';
    
    // Status Logic
    const isInside = entry.status === 'CHECKED_IN';
    const isExited = entry.status === 'CHECKED_OUT';
    const isWaiting = entry.status === 'PENDING';
    const isApproved = entry.status === 'APPROVED';
    const isDenied = entry.status === 'REJECTED';

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
    } else if (isApproved) {
        statusBg = '#DBEAFE';
        statusColor = '#1D4ED8';
        statusDot = '#3B82F6';
    } else if (isDenied) {
        statusBg = '#FEE2E2';
        statusColor = '#B91C1C';
        statusDot = '#EF4444';
    }

    const flatLabel = entry.flatNumber === 'OFFICE' ? 'Admin Office' : entry.flatNumber;
    const locationLabel = flatLabel
        ? `Flat ${flatLabel}`
        : entry.type === 'DOMESTIC_STAFF' ? 'Society staff' : 'Flat not assigned';
    const typeLabel = entry.type === 'DOMESTIC_STAFF'
        ? cleanLabel(entry.staffType) ?? 'Staff'
        : entry.companyName ?? cleanLabel(entry.visitorType) ?? cleanLabel(entry.type);
    const statusLabel = isInside ? 'INSIDE'
        : isExited ? 'EXITED'
        : isApproved ? 'APPROVED'
        : isDenied ? 'DENIED'
        : 'WAITING';

    // Infer Icon
    let iconName: any = 'person';
    if (entry.type === 'DELIVERY') iconName = 'cube';
    else if (entry.type === 'VENDOR') iconName = 'construct';
    else if (entry.type === 'CAB') iconName = 'car';
    else if (entry.type === 'DOMESTIC_STAFF') iconName = 'people';

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
                            {locationLabel}{typeLabel ? ` • ${typeLabel}` : ''}
                            {entry.purpose ? ` • ${entry.purpose}` : ''}
                        </Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabel}
                    </Text>
                </View>
            </View>

            {/* Times */}
            <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                    <Ionicons name="enter-outline" size={16} color="#10B981" />
                    <Text style={styles.timeLabel}>{isInside || isExited ? 'Check-In:' : 'Arrived:'}</Text>
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
            {isInside && entry.recordKind === 'ENTRY' && (
                <Pressable
                    onPress={() => onCheckOut(entry.id)}
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
});

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
