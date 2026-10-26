import { HomeButton } from '@/components/gate/HomeButton';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { GuardFonts } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/gate/AppAlert';

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
    /** Group visits: people who came in together and how many have already left */
    peopleCount?: number;
    peopleLeft?: number;
    vehicleNumber?: string | null;
}

const AVATAR_CONFIG: Record<string, { bg: string; iconColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
    VISITOR:        { bg: '#F1F5F9', iconColor: '#475569', icon: 'person' },
    DELIVERY:       { bg: '#FEF3C7', iconColor: '#D97706', icon: 'cube' },
    DOMESTIC_STAFF: { bg: '#CCFBF1', iconColor: '#0F766E', icon: 'people' },
    VENDOR:         { bg: '#EDE9FE', iconColor: '#7C3AED', icon: 'construct' },
    CAB:            { bg: '#D1FAE5', iconColor: '#059669', icon: 'car' },
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

const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    const day = date.getDate();
    const month = date.toLocaleString('en-IN', { month: 'short' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day} ${month}, ${timeStr}`;
};

const getDurationInside = (checkInIso: string, checkOutIso?: string | null) => {
    const start = new Date(checkInIso).getTime();
    const end = checkOutIso ? new Date(checkOutIso).getTime() : Date.now();
    const totalMinutes = Math.max(0, Math.round((end - start) / 60000));

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;

    if (days > 0) {
        return `${days}d ${hours}h ${mins}m`;
    }
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
};

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

const getInitials = (name?: string): string | null => {
    if (!name) return null;
    const clean = name.trim();
    if (!clean || clean.toLowerCase() === 'visitor') return null;
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && /^[a-zA-Z]/i.test(parts[0]) && /^[a-zA-Z]/i.test(parts[parts.length - 1])) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && /^[a-zA-Z]/i.test(parts[0])) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return null;
};

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
    // Cards show "inside for N min": tick once a minute so the time (and the delivery warning) keeps moving
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick((x) => x + 1), 60_000);
        return () => clearInterval(timer);
    }, []);

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
                peopleCount: entry.peopleCount ?? 1,
                peopleLeft: entry.peopleLeft ?? 0,
                vehicleNumber: entry.vehicleNumber ?? null,
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

            const allEntries = [...visitorEntries, ...staffEntries]
                .filter((entry) => entry.checkInTime)
                .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

            setEntries(allEntries);
        } catch (err: any) {
            console.error('Failed to fetch entries:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const insideCount = useMemo(
        () => entries.filter((e) => e.status === 'CHECKED_IN').length,
        [entries]
    );

    const visibleEntries = useMemo(() => {
        if (!showAll) {
            const inside = entries.filter((entry) => entry.status === 'CHECKED_IN');
            return filter === 'ALL' ? inside : inside.filter((entry) => entry.type === filter);
        }
        const today = entries.filter((entry) => isToday(entry.checkInTime) || (entry.checkOutTime && isToday(entry.checkOutTime)));
        // When there is no today-specific activity yet (e.g. testing / start of day),
        // fallback to all active entries so guards can view and filter entries.
        const source = today.length > 0 ? today : entries;
        return filter === 'ALL' ? source : source.filter((entry) => entry.type === filter);
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
    const doCheckOut = useCallback(async (id: string, count?: number) => {
        if (checkoutBusy.current) return;
        checkoutBusy.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCheckingOut(id);
        try {
            await api.patch(`/api/v1/guard/entries/${id}/checkout`, count ? { count } : {});
            setEntries((prev) =>
                prev.map((e) => {
                    if (e.id !== id) return e;
                    const inside = (e.peopleCount ?? 1) - (e.peopleLeft ?? 0);
                    if (count && count < inside) return { ...e, peopleLeft: (e.peopleLeft ?? 0) + count };
                    return { ...e, peopleLeft: e.peopleCount ?? 1, checkOutTime: new Date().toISOString(), status: 'CHECKED_OUT' as const };
                })
            );
        } catch (err: any) {
            AppAlert.show(t('inside.exitFailed'), err?.response?.data?.message ?? t('waiting.tryAgain'));
            fetchEntries();
        } finally {
            checkoutBusy.current = false;
            setCheckingOut(null);
        }
    }, [fetchEntries, t]);

    const handleCheckOut = useCallback((id: string) => {
        const entry = entries.find((e) => e.id === id);
        const inside = entry ? (entry.peopleCount ?? 1) - (entry.peopleLeft ?? 0) : 1;
        if (inside <= 1) { void doCheckOut(id); return; }
        const some = Array.from({ length: Math.min(inside - 1, 4) }, (_, i) => i + 1).map((n) => ({
            text: t('inside.leavingSome', { n }), onPress: () => doCheckOut(id, n),
        }));
        AppAlert.show(t('inside.leavingTitle'), t('inside.stillInside', { n: inside }), [
            { text: t('inside.leavingAll', { n: inside }), onPress: () => doCheckOut(id) },
            ...some,
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    }, [entries, doCheckOut, t]);

    // A delivery that has been inside a while: tell the flat's residents, or call them
    const pokeFlat = useCallback(async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await api.post(`/api/v1/guard/entries/${id}/nudge`, {});
            AppAlert.show(t('inside.pokedTitle'), t('inside.pokedText'));
        } catch (err: any) {
            AppAlert.show(t('inside.pokeFailed'), err?.response?.data?.message ?? t('waiting.tryAgain'));
        }
    }, [t]);

    const callFlat = useCallback(async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const res = await api.get(`/api/v1/guard/entries/${id}/contact`);
            const contact = res.data?.data?.contact as { name?: string; phone?: string } | null | undefined;
            if (!contact?.phone) {
                AppAlert.show(t('inside.noContactTitle'), t('inside.noContactText'));
                return;
            }
            await Linking.openURL(`tel:${contact.phone}`);
        } catch (err: any) {
            AppAlert.show(t('inside.noContactTitle'), err?.response?.data?.message ?? t('waiting.tryAgain'));
        }
    }, [t]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEntries();
    };

    const renderEntry = useCallback(({ item }: { item: Entry }) => (
        <EntryCard
            entry={item}
            checkingOut={checkingOut === item.id}
            onCheckOut={handleCheckOut}
            onPoke={pokeFlat}
            onCall={callFlat}
            tick={tick}
        />
    ), [checkingOut, handleCheckOut, pokeFlat, callFlat, tick]);

    return (
        <View style={styles.container}>
            {/* Top iOS/macOS-style Segmented Container */}
            <View style={styles.switchWrap}>
                <View style={styles.switchTrack}>
                    {[
                        { all: false, label: t('inside.insideOnly'), count: insideCount },
                        { all: true, label: t('inside.allToday'), count: entries.length },
                    ].map((o) => {
                        const active = showAll === o.all;
                        return (
                            <TouchableOpacity
                                key={String(o.all)}
                                testID={o.all ? 'view-all' : 'view-inside'}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                onPress={() => {
                                    if (!active) {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowAll(o.all);
                                    }
                                }}
                                style={[styles.switchBtn, active && styles.switchBtnActive]}
                            >
                                <Text style={[styles.switchText, active && styles.switchTextActive]}>
                                    {o.label}
                                </Text>
                                {o.count !== undefined ? (
                                    <View style={[styles.switchBadge, active && styles.switchBadgeActive]}>
                                        <Text style={[styles.switchBadgeText, active && styles.switchBadgeTextActive]}>
                                            {o.count}
                                        </Text>
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Category Filter Chips (Low-profile, sleek pills) */}
            {showAll && (
                <View style={styles.filterContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.filterScroll}
                    >
                        {FILTERS.map((f) => {
                            const isActive = filter === f.value;
                            return (
                                <TouchableOpacity
                                    key={f.value}
                                    testID={`filter-${f.value}`}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: isActive }}
                                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                    activeOpacity={0.7}
                                    onPress={() => handleFilterChange(f.value)}
                                    style={[styles.filterTab, isActive && styles.filterTabActive]}
                                >
                                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                        {t(f.labelKey)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <ScreenLoading label={t('inside.loading')} />
            ) : (
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D97706" />}
                />
            )}
            <HomeButton />
        </View>
    );
}

// ── Entry Card ────────────────────────────────────────────────────────────────
/** A delivery person inside for this long is worth a question to the flat. */
const OVERSTAY_MINUTES = 15;

const EntryCard = memo(function EntryCard({
    entry, checkingOut, onCheckOut, onPoke, onCall,
}: {
    entry: Entry; checkingOut: boolean; onCheckOut: (id: string) => void;
    onPoke?: (id: string) => void; onCall?: (id: string) => void;
    /** Changes every minute so the card redraws its "inside for" time */
    tick?: number;
}) {
    const t = useT();
    const avatarConfig = AVATAR_CONFIG[entry.type] ?? AVATAR_CONFIG.VISITOR;

    const isInside = entry.status === 'CHECKED_IN';
    const minutesInside = entry.checkInTime ? Math.floor((Date.now() - new Date(entry.checkInTime).getTime()) / 60000) : 0;
    const overstaying = isInside && entry.type === 'DELIVERY' && entry.recordKind === 'ENTRY' && minutesInside >= OVERSTAY_MINUTES;
    const isExited = entry.status === 'CHECKED_OUT';
    const isApproved = entry.status === 'APPROVED';
    const isDenied = entry.status === 'REJECTED';

    const statusMeta = isInside
        ? { label: t('inside.status.inside'), color: '#047857', bg: '#ECFDF5', border: '#D1FAE5', dot: '#10B981' }
        : isExited
        ? { label: t('inside.status.exited'), color: '#64748B', bg: '#F8F9FA', border: '#E2E8F0', dot: '#94A3B8' }
        : isApproved
        ? { label: t('inside.approved'), color: '#1D4ED8', bg: '#EFF6FF', border: '#DBEAFE', dot: '#3B82F6' }
        : isDenied
        ? { label: t('inside.denied'), color: '#BE123C', bg: '#FFF1F2', border: '#FFE4E6', dot: '#E11D48' }
        : { label: t('inside.waiting'), color: '#B45309', bg: '#FFFBEB', border: '#FEF3C7', dot: '#F59E0B' };

    const flatLabel = entry.flatNumber === 'OFFICE' ? t('scan.office') : entry.flatNumber;
    const locationLabel = flatLabel
        ? `${t('common.flat')} ${flatLabel}`
        : entry.type === 'DOMESTIC_STAFF' ? t('inside.societyStaff') : t('inside.noFlat');

    const typeLabel = entry.type === 'DOMESTIC_STAFF'
        ? cleanLabel(entry.staffType) ?? t('inside.filterStaff')
        : entry.companyName ?? cleanLabel(entry.visitorType) ?? cleanLabel(entry.type);

    // Defensive name fallback to prevent broken/empty-header cards
    const displayName = entry.visitorName?.trim()
        || entry.companyName?.trim()
        || (entry.recordKind === 'STAFF_ATTENDANCE' ? 'Staff Member' : 'Visitor');

    const subtitleMeta = [locationLabel, typeLabel].filter(Boolean).join(' • ');

    // Initials for guest or clean vector icons
    const initials = entry.type === 'VISITOR' ? getInitials(displayName) : null;

    return (
        <View style={styles.card}>
            {/* Header Row: 40x40 Avatar + Name & Meta + Status Micro-Badge */}
            <View style={styles.cardHeader}>
                <View style={[styles.avatarBox, { backgroundColor: avatarConfig.bg }]}>
                    {initials ? (
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    ) : (
                        <Ionicons name={avatarConfig.icon} size={18} color={avatarConfig.iconColor} />
                    )}
                </View>

                <View style={styles.cardHeaderMiddle}>
                    <Text style={styles.visitorName} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={styles.visitorSubtitle} numberOfLines={1}>
                        {subtitleMeta}
                    </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                    <Text style={[styles.statusText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                    </Text>
                </View>
            </View>

            {/* Secondary Row: Entry Context (Date, Time, Duration Inside) */}
            <View style={styles.contextRow}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.timeValue}>
                    {entry.checkInTime ? formatDateTime(entry.checkInTime) : '—'}
                </Text>

                <View style={styles.durationBadge}>
                    <Ionicons name="hourglass-outline" size={11} color="#B45309" />
                    <Text style={styles.durationBadgeText}>
                        {isInside
                            ? `${getDurationInside(entry.checkInTime)} inside`
                            : `${getDurationInside(entry.checkInTime, entry.checkOutTime)} total`}
                    </Text>
                </View>

                {entry.checkOutTime ? (
                    <Text style={styles.checkOutText}>
                        • Out {formatTime(entry.checkOutTime)}
                    </Text>
                ) : null}
            </View>

            {/* Delivery inside for a while: ask the flat, or call them */}
            {overstaying ? (
                <View style={styles.overstayBox} testID={`overstay-${entry.id}`}>
                    <View style={styles.overstayHead}>
                        <Ionicons name="alarm-outline" size={16} color="#B45309" />
                        <Text style={styles.overstayText}>{t('inside.overstay', { n: minutesInside })}</Text>
                    </View>
                    <View style={styles.overstayActions}>
                        <TouchableOpacity
                            testID={`poke-${entry.id}`}
                            accessibilityRole="button"
                            activeOpacity={0.8}
                            onPress={() => onPoke?.(entry.id)}
                            style={styles.overstayBtn}
                        >
                            <Ionicons name="notifications-outline" size={16} color="#92400E" />
                            <Text style={styles.overstayBtnText}>{t('inside.poke')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            testID={`call-${entry.id}`}
                            accessibilityRole="button"
                            activeOpacity={0.8}
                            onPress={() => onCall?.(entry.id)}
                            style={styles.overstayBtn}
                        >
                            <Ionicons name="call-outline" size={16} color="#92400E" />
                            <Text style={styles.overstayBtnText}>{t('inside.call')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            {/* Optional Purpose or Vehicle notes */}
            {(entry.purpose || entry.vehicleNumber) ? (
                <View style={styles.notesRow}>
                    <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
                    <Text style={styles.notesText} numberOfLines={1}>
                        {[entry.purpose, entry.vehicleNumber].filter(Boolean).join(' • ')}
                    </Text>
                </View>
            ) : null}

            {/* Action Row: Full-width Exit button taking all horizontal space */}
            {isInside && entry.recordKind === 'ENTRY' && (
                <View style={styles.actionSection}>
                    {(entry.peopleCount ?? 1) > 1 ? (
                        <View style={styles.groupBanner}>
                            <Ionicons name="people" size={12} color="#B45309" />
                            <Text style={styles.groupBannerText}>
                                {t('inside.ofGroup', { n: (entry.peopleCount ?? 1) - (entry.peopleLeft ?? 0) })}
                            </Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        testID={`exit-${entry.id}`}
                        accessibilityLabel={t('inside.exit')}
                        disabled={checkingOut}
                        activeOpacity={0.8}
                        onPress={() => onCheckOut(entry.id)}
                        style={styles.exitBtnFull}
                    >
                        {checkingOut ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.exitTextFull}>{t('inside.exit')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {isInside && entry.recordKind === 'STAFF_ATTENDANCE' && (
                <View style={styles.staffHint}>
                    <Ionicons name="qr-code-outline" size={14} color="#64748B" />
                    <Text style={styles.staffHintText}>{t('inside.staffHint')}</Text>
                </View>
            )}
        </View>
    );
});

// ── Stylesheet ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overstayBox: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', gap: 8 },
    overstayHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    overstayText: { flex: 1, color: '#92400E', fontFamily: GuardFonts.bold, fontSize: 13, fontWeight: '700' },
    overstayActions: { flexDirection: 'row', gap: 8 },
    overstayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, borderRadius: 10, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D' },
    overstayBtnText: { color: '#92400E', fontFamily: GuardFonts.bold, fontSize: 13, fontWeight: '800' },

    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    // Sleek Segmented Switch Container
    switchWrap: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    switchTrack: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 3,
        height: 44,
    },
    switchBtn: {
        flex: 1,
        borderRadius: 9,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    switchBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    switchText: {
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 13,
        fontWeight: '500',
    },
    switchTextActive: {
        color: '#0F172A',
        fontFamily: GuardFonts.bold,
        fontWeight: '600',
    },
    switchBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 99,
        marginLeft: 2,
    },
    switchBadgeActive: {
        backgroundColor: '#FEF3C7',
    },
    switchBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    switchBadgeTextActive: {
        color: '#B45309',
    },

    // Category Filter Chips
    filterContainer: {
        paddingBottom: 8,
        paddingTop: 2,
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterTab: {
        height: 32,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterTabActive: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
    },
    filterText: {
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 12,
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFFFFF',
        fontFamily: GuardFonts.bold,
        fontWeight: '600',
    },

    // Visitor List
    listContent: {
        padding: 16,
        paddingBottom: 20,
        gap: 12,
    },
    listEmpty: {
        flexGrow: 1,
    },

    // Visitor Card: Pure white, 16px radius, subtle border & ambient shadow
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        gap: 10,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1.5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        color: '#475569',
        fontFamily: GuardFonts.bold,
        fontSize: 13,
        fontWeight: '700',
    },
    cardHeaderMiddle: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
        gap: 2,
    },
    visitorName: {
        color: '#0F172A',
        fontFamily: GuardFonts.bold,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
        letterSpacing: -0.2,
    },
    visitorSubtitle: {
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },

    // Micro-badge status
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontFamily: GuardFonts.bold,
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
    },

    // Context Row
    contextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    timeValue: {
        color: '#334155',
        fontFamily: GuardFonts.medium,
        fontSize: 12,
        fontWeight: '500',
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    durationBadgeText: {
        color: '#B45309',
        fontFamily: GuardFonts.bold,
        fontSize: 11,
        fontWeight: '600',
    },
    checkOutText: {
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 12,
        fontWeight: '400',
    },
    notesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: -2,
    },
    notesText: {
        flex: 1,
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 12,
        fontWeight: '400',
    },

    // Action Section & Full-width Exit button
    actionSection: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 10,
        marginTop: 4,
        gap: 8,
    },
    groupBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    groupBannerText: {
        color: '#B45309',
        fontFamily: GuardFonts.bold,
        fontSize: 11,
        fontWeight: '600',
    },
    exitBtnFull: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    exitTextFull: {
        color: '#FFFFFF',
        fontFamily: GuardFonts.bold,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // Staff check-out hint
    staffHint: {
        borderTopWidth: 1,
        borderTopColor: '#F8F9FA',
        paddingTop: 8,
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    staffHintText: {
        flex: 1,
        color: '#64748B',
        fontFamily: GuardFonts.medium,
        fontSize: 12,
        fontWeight: '500',
    },
});
