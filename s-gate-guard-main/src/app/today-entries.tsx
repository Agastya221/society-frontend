import { HomeButton } from '@/components/gate/HomeButton';
import { Pressy } from '@/components/gate/Pressy';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { GuardColors, GuardFonts, GuardSemantic, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
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

const TYPE_META: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    VISITOR:        { color: '#3B82F6', bg: '#EBF3FF', icon: 'person' },
    DELIVERY:       { color: '#F59E0B', bg: '#FFF4DC', icon: 'cube' },
    DOMESTIC_STAFF: { color: '#0D9488', bg: '#DDF7F3', icon: 'people' },
    VENDOR:         { color: '#8657E8', bg: '#F1EBFF', icon: 'construct' },
    CAB:            { color: '#10B981', bg: '#E5FBF3', icon: 'car' },
};

type FilterType = 'ALL' | Entry['type'];
const FILTERS: { labelKey: string; value: FilterType }[] = [
    { labelKey: 'inside.filterAll', value: 'ALL' },
    { labelKey: 'inside.filterGuests', value: 'VISITOR' },
    { labelKey: 'inside.filterDeliveries', value: 'DELIVERY' },
    { labelKey: 'inside.filterStaff', value: 'DOMESTIC_STAFF' },
    { labelKey: 'inside.filterServices', value: 'VENDOR' },
    { labelKey: 'inside.filterCabs', value: 'CAB' },
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
    const t = useT();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [checkingOut, setCheckingOut] = useState<string | null>(null);
    // Default view: only the people inside right now. "All today" brings back the full log and its filters.
    const [showAll, setShowAll] = useState(false);
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

    const visibleEntries = useMemo(() => {
        if (!showAll) return entries.filter((entry) => entry.status === 'CHECKED_IN');
        return filter === 'ALL' ? entries : entries.filter((entry) => entry.type === filter);
    }, [entries, filter, showAll]);

    // Refresh every time the screen is focused; the spinner only shows on the first
    // load so returning to this screen doesn't blank the list.
    useFocusEffect(useCallback(() => {
        fetchEntries();
    }, [fetchEntries]));

    const handleFilterChange = (f: FilterType) => {
        if (f === filter) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(f);
    };

    const checkoutBusy = useRef(false);
    const handleCheckOut = useCallback(async (id: string) => {
        if (checkoutBusy.current) return; // double tap / second card while one is in flight
        checkoutBusy.current = true;
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
            Alert.alert(t('inside.exitFailed'), err?.response?.data?.message ?? t('waiting.tryAgain'));
            fetchEntries();
        } finally {
            checkoutBusy.current = false;
            setCheckingOut(null);
        }
    }, [fetchEntries, t]);

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
            {/* View switch: inside now / everything today */}
            <View style={styles.switchWrap}>
                <View style={styles.switchTrack}>
                    {[
                        { all: false, label: t('inside.insideOnly'), icon: 'people' as const },
                        { all: true, label: t('inside.allToday'), icon: 'list' as const },
                    ].map((o) => {
                        const active = showAll === o.all;
                        return (
                            <TouchableOpacity
                                key={String(o.all)}
                                testID={o.all ? 'view-all' : 'view-inside'}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                onPress={() => { if (!active) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAll(o.all); } }}
                                style={[styles.switchBtn, active && styles.switchBtnActive]}
                            >
                                <Ionicons name={o.icon} size={20} color={active ? GuardColors.black : GuardColors.t2} />
                                <Text style={[styles.switchText, active && styles.switchTextActive]}>{o.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Filters only belong to the full list */}
            {showAll && (
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {FILTERS.map((f) => {
                            const isActive = filter === f.value;
                            return (
                                <TouchableOpacity
                                    key={f.value}
                                    activeOpacity={0.8}
                                    onPress={() => handleFilterChange(f.value)}
                                    style={[styles.filterTab, isActive && styles.filterTabActive]}
                                >
                                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{t(f.labelKey)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <ScreenLoading label={t('inside.loading')} />
            ) : (
                // Empty state lives inside the list so pull-to-refresh still works with no entries.
                <FlatList
                    data={visibleEntries}
                    keyExtractor={(item) => `${item.recordKind}:${item.id}`}
                    renderItem={renderEntry}
                    ListEmptyComponent={
                        <ScreenEmpty
                            icon={showAll ? 'calendar-outline' : 'people-outline'}
                            title={showAll ? t('inside.noEntries') : t('inside.nobody')}
                            message={showAll ? t('inside.noEntriesText') : t('inside.nobodyText')}
                        />
                    }
                    contentContainerStyle={[styles.listContent, visibleEntries.length === 0 && styles.listEmpty]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GuardColors.goldDeep} />}
                />
            )}
            <HomeButton />
        </View>
    );
}

// ── Entry Card ────────────────────────────────────────────────────────────────
const EntryCard = memo(function EntryCard({
    entry, checkingOut, onCheckOut,
}: {
    entry: Entry; checkingOut: boolean; onCheckOut: (id: string) => void;
}) {
    const t = useT();
    const meta = TYPE_META[entry.type] ?? { color: '#6B7280', bg: '#F3F4F6', icon: 'person' as const };

    const isInside = entry.status === 'CHECKED_IN';
    const isExited = entry.status === 'CHECKED_OUT';
    const isWaiting = entry.status === 'PENDING';
    const isApproved = entry.status === 'APPROVED';
    const isDenied = entry.status === 'REJECTED';

    const status = isInside ? { label: t('inside.status.inside'), color: '#047857', bg: '#D1FAE5' }
        : isExited ? { label: t('inside.status.exited'), color: '#374151', bg: '#F3F4F6' }
        : isApproved ? { label: t('inside.approved'), color: '#1D4ED8', bg: '#DBEAFE' }
        : isDenied ? { label: t('inside.denied'), color: '#B91C1C', bg: '#FEE2E2' }
        : { label: t('inside.waiting'), color: '#B45309', bg: '#FEF3C7' };
    void isWaiting;

    const flatLabel = entry.flatNumber === 'OFFICE' ? t('scan.office') : entry.flatNumber;
    const locationLabel = flatLabel
        ? `${t('common.flat')} ${flatLabel}`
        : entry.type === 'DOMESTIC_STAFF' ? t('inside.societyStaff') : t('inside.noFlat');
    const typeLabel = entry.type === 'DOMESTIC_STAFF'
        ? cleanLabel(entry.staffType) ?? t('inside.filterStaff')
        : entry.companyName ?? cleanLabel(entry.visitorType) ?? cleanLabel(entry.type);

    return (
        <View style={[styles.card, guardShadow('#0D0F14', 1)]}>
            <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={28} color={meta.color} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.visitorName} numberOfLines={1}>{entry.visitorName}</Text>
                    <Text style={styles.visitorDetails} numberOfLines={1}>
                        {locationLabel}{typeLabel ? ` · ${typeLabel}` : ''}{entry.purpose ? ` · ${entry.purpose}` : ''}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            <View style={styles.timeRow}>
                <Ionicons name="enter" size={20} color={GuardSemantic.allow} />
                <Text style={styles.timeValue}>{entry.checkInTime ? formatTime(entry.checkInTime) : '—'}</Text>
                {entry.checkOutTime ? (
                    <>
                        <Ionicons name="exit" size={20} color={GuardColors.t3} style={{ marginLeft: 12 }} />
                        <Text style={styles.timeValue}>{formatTime(entry.checkOutTime)}</Text>
                        <Text style={styles.duration}>{formatDuration(entry.checkInTime, entry.checkOutTime)}</Text>
                    </>
                ) : null}
            </View>

            {isInside && entry.recordKind === 'ENTRY' && (
                <Pressy
                    testID={`exit-${entry.id}`}
                    accessibilityLabel={t('inside.exit')}
                    disabled={checkingOut}
                    onPress={() => onCheckOut(entry.id)}
                    style={styles.exitBtn}
                >
                    {checkingOut ? (
                        <ActivityIndicator size="small" color={GuardSemantic.deny} />
                    ) : (
                        <>
                            <Ionicons name="exit-outline" size={26} color={GuardSemantic.deny} />
                            <Text style={styles.exitText}>{t('inside.exit')}</Text>
                        </>
                    )}
                </Pressy>
            )}
            {isInside && entry.recordKind === 'STAFF_ATTENDANCE' && (
                <View style={styles.staffHint}>
                    <Ionicons name="qr-code-outline" size={18} color={GuardColors.t2} />
                    <Text style={styles.staffHintText}>{t('inside.staffHint')}</Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GuardColors.bg },

    switchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    switchTrack: { flexDirection: 'row', backgroundColor: GuardColors.surface, borderRadius: 999, padding: 4 },
    switchBtn: { flex: 1, minHeight: GuardTouch.min, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    switchBtnActive: { backgroundColor: GuardColors.gold },
    switchText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    switchTextActive: { color: GuardColors.black },

    filterContainer: { paddingBottom: 6 },
    filterScroll: { paddingHorizontal: 16, gap: 10 },
    filterTab: { minHeight: 46, paddingHorizontal: 18, borderRadius: 999, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center' },
    filterTabActive: { backgroundColor: GuardColors.ink, borderColor: GuardColors.ink },
    filterText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '800' },
    filterTextActive: { color: '#FFFFFF' },

    listContent: { padding: 16, gap: 12 },
    listEmpty: { flexGrow: 1 },

    card: { backgroundColor: GuardColors.card, borderRadius: 28, padding: 16, gap: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    typeIcon: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    cardHeaderText: { flex: 1, gap: 2 },
    visitorName: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 22, lineHeight: 30, fontWeight: '900', letterSpacing: -0.3 },
    visitorDetails: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
    statusText: { fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 20, fontWeight: '800' },

    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeValue: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    duration: { marginLeft: 'auto', color: GuardColors.goldDeep, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },

    exitBtn: { minHeight: GuardTouch.button - 8, borderRadius: 24, borderWidth: 2, borderColor: GuardSemantic.deny, backgroundColor: GuardColors.redBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    exitText: { color: GuardSemantic.deny, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '900' },
    staffHint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GuardColors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    staffHintText: { flex: 1, color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '600' },
});
