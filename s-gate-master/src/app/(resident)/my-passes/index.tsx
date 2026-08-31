import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { 
FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    StatusBar,
    Platform,
    Image,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { AnimatedBottomSheetModal } from '@/components/ui/AnimatedBottomSheetModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PreApproveSheet } from '../../../components/pre-approvals/PreApproveSheet';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import {
    cancelPreApproved,
    deleteInvitePass,
    deletePreApproved,
    getMyInvitePasses,
    getMyPartyInvites,
    getPreApprovedList,
    revokeInvitePass,
    cancelPartyInvite,
    type PartyInvite,
} from '../../../services/gate.service';
import { AppAlert } from '../../../components/ui/AppAlert';
import type {
    InvitePass,
    InvitePassStatus,
    InvitePassType,
    PreApprovedEntry,
    PreApprovedStatus,
    PreApprovedType,
} from '../../../types/api';

// ─── Configs ──────────────────────────────────────────────────────────────────

const PA_TYPE: Record<PreApprovedType, { label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string; bg: string }> = {
    CAB:      { label: 'Cab',      icon: 'navigation', color: SgateColors.blue,  bg: SgateColors.blueBg   },
    DELIVERY: { label: 'Delivery', icon: 'package',    color: SgateColors.green, bg: SgateColors.greenBg  },
    HELP:     { label: 'Help',     icon: 'tool',       color: SgateColors.gold,  bg: SgateColors.goldPale },
};

const PA_STATUS: Record<PreApprovedStatus, { label: string; color: string; bg: string }> = {
    ACTIVE:    { label: 'Active',    color: SgateColors.green, bg: SgateColors.greenBg },
    EXPIRED:   { label: 'Expired',   color: SgateColors.t3,    bg: SgateColors.surface  },
    USED:      { label: 'Used',      color: SgateColors.blue,  bg: SgateColors.blueBg   },
    CANCELLED: { label: 'Cancelled', color: SgateColors.red,   bg: SgateColors.redBg    },
};

const INV_TYPE: Record<InvitePassType, { label: string; color: string; bg: string }> = {
    QUICK:    { label: 'Quick',    color: SgateColors.blue,  bg: SgateColors.blueBg   },
    FREQUENT: { label: 'Frequent', color: SgateColors.gold,  bg: SgateColors.goldPale },
    PRIVATE:  { label: 'Private',  color: '#9B6DFF',         bg: '#F3EEFF'            },
};

const INV_STATUS: Record<InvitePassStatus, { label: string; color: string; bg: string }> = {
    ACTIVE:  { label: 'Active',  color: SgateColors.green, bg: SgateColors.greenBg },
    REVOKED: { label: 'Revoked', color: SgateColors.red,   bg: SgateColors.redBg   },
    EXPIRED: { label: 'Expired', color: SgateColors.t3,    bg: SgateColors.surface  },
};

const PARTY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE:    { label: 'Active',    color: SgateColors.green, bg: SgateColors.greenBg },
    EXPIRED:   { label: 'Expired',   color: SgateColors.t3,    bg: SgateColors.surface  },
    CANCELLED: { label: 'Cancelled', color: SgateColors.red,   bg: SgateColors.redBg    },
};

type InviteListItem =
    | { _kind: 'section'; title: string }
    | { _kind: 'guest';   data: InvitePass }
    | { _kind: 'party';   data: PartyInvite };

const DAYS_SHORT: Record<string, string> = {
    MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

function formatDate(value?: string, includeTime = false): string {
    if (!value) return '—';
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('en-IN', includeTime
        ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
        : { day: 'numeric', month: 'short', year: 'numeric' });
}

function scheduleLabel(entry: PreApprovedEntry): string {
    const s = entry.schedule;
    if (!s) return '';
    if (s.scheduleType === 'ONCE') {
        if (s.date) return `${formatDate(s.date)} · ${s.startTime ?? '—'}–${s.endTime ?? '—'}`;
        return 'One-time';
    }
    const days = (s.daysOfWeek ?? []).map(d => DAYS_SHORT[d] ?? d).join(', ');
    return `${days || 'Every day'} · ${s.timeFrom ?? '—'}–${s.timeTo ?? '—'}`;
}

function DetailRow({ icon, label, value }: {
    icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string;
}) {
    return (
        <View style={styles.detailRow}>
            <Feather name={icon} size={14} color={SgateColors.t4} />
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

function SheetActionRow({ icon, label, onPress }: {
    icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.sheetItem} onPress={onPress} activeOpacity={0.75}>
            <View style={styles.sheetItemIcon}>
                <Feather name={icon} size={18} color={SgateColors.red} />
            </View>
            <Text style={styles.sheetItemLabel}>{label}</Text>
            <Feather name="chevron-right" size={18} color={SgateColors.red} />
        </TouchableOpacity>
    );
}

const TABS = ['Pre-Approvals', 'Invites'] as const;
type Tab = typeof TABS[number];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<Tab>('Pre-Approvals');
    const [paEntries, setPaEntries]         = useState<PreApprovedEntry[]>([]);
    const [paLoading, setPaLoading]         = useState(true);
    const [paRefreshing, setPaRefreshing]   = useState(false);
    const [paMenuEntry, setPaMenuEntry]     = useState<PreApprovedEntry | null>(null);
    const [sheetVisible, setSheetVisible]   = useState(false);

    const [invites, setInvites]             = useState<InvitePass[]>([]);
    const [partyInvites, setPartyInvites]   = useState<PartyInvite[]>([]);
    const [invLoading, setInvLoading]       = useState(false);
    const [invRefreshing, setInvRefreshing] = useState(false);
    const [invMenuEntry, setInvMenuEntry]   = useState<InvitePass | null>(null);
    const [partyMenuEntry, setPartyMenuEntry] = useState<PartyInvite | null>(null);

    const loadedTabs = useRef<Set<Tab>>(new Set(['Pre-Approvals']));

    const loadPreApprovals = useCallback(async (isRefresh = false) => {
        if (isRefresh) setPaRefreshing(true);
        try {
            const res = await getPreApprovedList({ limit: 50 });
            setPaEntries(res.entries);
        } catch {
            AppAlert.show('Error', 'Failed to load pre-approvals');
        } finally {
            setPaLoading(false);
            setPaRefreshing(false);
        }
    }, []);

    const loadInvites = useCallback(async (isRefresh = false) => {
        if (isRefresh) setInvRefreshing(true); else setInvLoading(true);
        try {
            const [guestRes, partyRes] = await Promise.allSettled([
                getMyInvitePasses(),
                getMyPartyInvites(),
            ]);
            if (guestRes.status === 'fulfilled') setInvites(guestRes.value);
            if (partyRes.status === 'fulfilled') setPartyInvites(partyRes.value);
        } catch {
            AppAlert.show('Error', 'Failed to load invites');
        } finally {
            setInvLoading(false);
            setInvRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        loadPreApprovals();
    }, [loadPreApprovals]));

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (!loadedTabs.current.has(tab)) {
            loadedTabs.current.add(tab);
            if (tab === 'Invites') loadInvites();
        }
    };

    const handlePaCancel = (entry: PreApprovedEntry) => {
        setPaMenuEntry(null);
        AppAlert.show('Cancel Pre-Approval?', 'The QR code will stop working.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Cancel It', style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelPreApproved(entry.id);
                        setPaEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'CANCELLED' } : e));
                    } catch (err: any) {
                        AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to cancel');
                    }
                },
            },
        ]);
    };

    const handlePaDelete = (entry: PreApprovedEntry) => {
        setPaMenuEntry(null);
        AppAlert.show('Delete Entry?', 'This will permanently remove this pre-approval.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deletePreApproved(entry.id);
                        setPaEntries(prev => prev.filter(e => e.id !== entry.id));
                    } catch (err: any) {
                        AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const handleInvRevoke = (invite: InvitePass) => {
        setInvMenuEntry(null);
        AppAlert.show('Revoke Invite?', 'This pass will stop working immediately.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Revoke', style: 'destructive',
                onPress: async () => {
                    try {
                        await revokeInvitePass(invite.id);
                        setInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'REVOKED' } : i));
                    } catch (err: any) {
                        AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to revoke');
                    }
                },
            },
        ]);
    };

    const handleInvDelete = (invite: InvitePass) => {
        setInvMenuEntry(null);
        AppAlert.show('Delete Invite?', 'This will permanently remove this invite pass.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteInvitePass(invite.id);
                        setInvites(prev => prev.filter(i => i.id !== invite.id));
                    } catch (err: any) {
                        AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const handlePartyCancel = (party: PartyInvite) => {
        setPartyMenuEntry(null);
        AppAlert.show('Cancel Party Invite?', 'All guest codes will stop working.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Cancel', style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelPartyInvite(party.id);
                        setPartyInvites(prev => prev.map(p => p.id === party.id ? { ...p, status: 'CANCELLED' } : p));
                    } catch (err: any) {
                        AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to cancel');
                    }
                },
            },
        ]);
    };

    const renderPreApproval = useCallback(({ item, index }: { item: PreApprovedEntry; index: number }) => {
        const tc = PA_TYPE[item.type] ?? PA_TYPE.HELP;
        const sc = PA_STATUS[item.status] ?? PA_STATUS.ACTIVE;
        const sched = scheduleLabel(item);
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 30).duration(220)} style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={[styles.typeBubble, { backgroundColor: tc.bg }]}>
                        <Feather name={tc.icon} size={20} color={tc.color} />
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardName} numberOfLines={1}>
                                {item.meta.visitorName ?? tc.label}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                            </View>
                        </View>
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: tc.bg }]}>
                                <Text style={[styles.pillText, { color: tc.color }]}>{tc.label}</Text>
                            </View>
                            {item.mode === 'SAFE' && (
                                <View style={[styles.pill, { backgroundColor: SgateColors.blueBg }]}>
                                    <Feather name="shield" size={10} color={SgateColors.blue} />
                                    <Text style={[styles.pillText, { color: SgateColors.blue }]}> Safe</Text>
                                </View>
                            )}
                            {item.schedule.scheduleType === 'RECURRING' && (
                                <View style={[styles.pill, { backgroundColor: SgateColors.surface }]}>
                                    <Feather name="repeat" size={10} color={SgateColors.t3} />
                                    <Text style={[styles.pillText, { color: SgateColors.t3 }]}> Recurring</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setPaMenuEntry(item)}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
                <View style={styles.details}>
                    <DetailRow icon="calendar" label="Created" value={formatDate(item.createdAt, true)} />
                    <DetailRow icon="clock" label="Schedule" value={sched || 'Not provided'} />
                    {item.schedule?.scheduleType === 'RECURRING' && (
                        <DetailRow icon="calendar" label="Valid dates" value={`${formatDate(item.schedule.validFrom)} – ${formatDate(item.schedule.validUntil)}`} />
                    )}
                    {!!item.meta?.vehicleLast4Digits && (
                        <DetailRow icon="truck" label="Vehicle" value={`Ends in ${item.meta.vehicleLast4Digits}`} />
                    )}
                    {!!item.meta?.companyName && <DetailRow icon="shopping-bag" label="Company" value={item.meta.companyName} />}
                    {!!item.meta?.category && (
                        <DetailRow
                            icon="tool"
                            label="Service"
                            value={(item.meta.customCategory || item.meta.category).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        />
                    )}
                    {item.schedule?.entriesPerDay != null && (
                        <DetailRow icon="log-in" label="Entries/day" value={String(item.schedule.entriesPerDay)} />
                    )}
                </View>
            </Animated.View>
        );
    }, []);

    const renderPartyInvite = useCallback(({ item, index = 0 }: { item: PartyInvite; index?: number }) => {
        const sc = PARTY_STATUS[item.status] ?? PARTY_STATUS.ACTIVE;
        const filledSlots = item.usedSlots ?? item.slots?.filter(s => s.phone !== null).length ?? 0;
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 30).duration(220)} style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={[styles.typeBubble, { backgroundColor: '#F3EEFF' }]}>
                        <Feather name="users" size={20} color="#9B6DFF" />
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardName} numberOfLines={1}>{item.venue || 'Party Invite'}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                            </View>
                        </View>
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: '#F3EEFF' }]}>
                                <Text style={[styles.pillText, { color: '#9B6DFF' }]}>Party</Text>
                            </View>
                        </View>
                        <View style={styles.metaRow}>
                            <Feather name="users" size={11} color={SgateColors.t4} />
                            <Text style={styles.metaText}> {filledSlots}/{item.maxGuests} guests</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setPartyMenuEntry(item)}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
                <View style={styles.details}>
                    <DetailRow icon="calendar" label="Valid from" value={formatDate(item.validFrom, true)} />
                    <DetailRow icon="calendar" label="Valid until" value={formatDate(item.validUntil, true)} />
                    {!!item.createdAt && <DetailRow icon="clock" label="Created" value={formatDate(item.createdAt, true)} />}
                    {!!item.inviteCode && <DetailRow icon="hash" label="Invite code" value={item.inviteCode} />}
                    {!!item.note && <DetailRow icon="file-text" label="Note" value={item.note} />}
                </View>
            </Animated.View>
        );
    }, []);

    const renderInvite = useCallback(({ item, index = 0 }: { item: InvitePass; index?: number }) => {
        const tc = INV_TYPE[item.type] ?? INV_TYPE.QUICK;
        const sc = INV_STATUS[item.status] ?? INV_STATUS.ACTIVE;
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 30).duration(220)} style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={[styles.typeBubble, { backgroundColor: tc.bg }]}>
                        <Feather name="user-check" size={20} color={tc.color} />
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardName} numberOfLines={1}>
                                {item.visitorName ?? 'Open Invite'}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                            </View>
                        </View>
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: tc.bg }]}>
                                <Text style={[styles.pillText, { color: tc.color }]}>{tc.label}</Text>
                            </View>
                        </View>
                        {item.passcode ? (
                            <View style={styles.metaRow}>
                                <Feather name="hash" size={11} color={SgateColors.t4} />
                                <Text style={[styles.metaText, styles.passcode]}> {item.passcode}</Text>
                            </View>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setInvMenuEntry(item)}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
                <View style={styles.details}>
                    <DetailRow icon="calendar" label="Valid from" value={formatDate(item.validFrom, true)} />
                    <DetailRow icon="calendar" label="Valid until" value={formatDate(item.validUntil, true)} />
                    <DetailRow icon="clock" label="Created" value={formatDate(item.createdAt, true)} />
                    {!!item.visitorPhone && <DetailRow icon="phone" label="Guest phone" value={item.visitorPhone} />}
                    {!!item.allowedDays?.length && <DetailRow icon="repeat" label="Allowed days" value={item.allowedDays.join(', ')} />}
                    {!!item.timeFrom && <DetailRow icon="clock" label="Entry time" value={`${item.timeFrom} – ${item.timeUntil ?? '—'}`} />}
                    <DetailRow icon="check-circle" label="Uses" value={`${item.usedCount}${item.maxUses == null ? '' : ` / ${item.maxUses}`}`} />
                </View>
            </Animated.View>
        );
    }, []);

    const renderEmptyState = () => (
        <View style={styles.empty}>
            <View style={styles.iconCircle}>
                <Image 
                    source={require('../../../../assets/images/icons/s-gate-logo-without-bg.png')} 
                    style={{ width: 64, height: 64, opacity: 0.6 }} 
                    resizeMode="contain" 
                />
            </View>
            <Text style={styles.emptyTitle}>
                {activeTab === 'Pre-Approvals' ? 'No Pre-Approvals' : 'No Invites Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {activeTab === 'Pre-Approvals' 
                    ? 'Pre-approve cabs, deliveries, or helpers so they can enter without waiting.'
                    : 'Your guest passes and party invites will appear here.'
                }
            </Text>
            {activeTab === 'Pre-Approvals' && (
                <TouchableOpacity 
                    style={styles.primaryBtn} 
                    onPress={() => setSheetVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryBtnText}>Create Pre-Approval</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 10) }]}>
                <View style={styles.headerInner}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleMain}>My Passes</Text>
                    <TouchableOpacity 
                        style={styles.headerIconBtnCircle} 
                        onPress={() => setSheetVisible(true)}
                    >
                        <Feather name="plus" size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Segmented Control */}
            <View style={styles.tabWrapper}>
                <View style={styles.segmentedContainer}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.segment, isActive && styles.segmentActive]}
                                onPress={() => handleTabChange(tab)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {activeTab === 'Pre-Approvals' ? (
                    paLoading ? (
                        <AppLoader />
                    ) : (
                        <FlatList
                            data={paEntries}
                            keyExtractor={item => item.id}
                            renderItem={renderPreApproval}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={paRefreshing}
                                    onRefresh={() => loadPreApprovals(true)}
                                    tintColor={SgateColors.gold}
                                />
                            }
                            ListEmptyComponent={renderEmptyState}
                        />
                    )
                ) : (
                    invLoading ? (
                        <AppLoader />
                    ) : (
                        <FlatList
                            data={[
                                ...(invites.length > 0 ? [{ _kind: 'section' as const, title: 'Guest Passes' }] : []),
                                ...invites.map(d => ({ _kind: 'guest' as const, data: d })),
                                ...(partyInvites.length > 0 ? [{ _kind: 'section' as const, title: 'Party Invites' }] : []),
                                ...partyInvites.map(d => ({ _kind: 'party' as const, data: d })),
                            ] as InviteListItem[]}
                            keyExtractor={item =>
                                item._kind === 'section' ? `section-${item.title}` :
                                item._kind === 'guest'   ? item.data.id :
                                `party-${item.data.id}`
                            }
                            renderItem={({ item, index }: { item: InviteListItem; index: number }) => {
                                if (item._kind === 'section') return <Text style={styles.sectionLabel}>{item.title}</Text>;
                                if (item._kind === 'guest') return renderInvite({ item: item.data, index });
                                return renderPartyInvite({ item: item.data, index });
                            }}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={invRefreshing}
                                    onRefresh={() => loadInvites(true)}
                                    tintColor={SgateColors.gold}
                                />
                            }
                            ListEmptyComponent={renderEmptyState}
                        />
                    )
                )}


            </View>

            {/* ── Pre-Approval action menu ────────────── */}
            <AnimatedBottomSheetModal visible={!!paMenuEntry} onClose={() => setPaMenuEntry(null)} surfaceStyle={styles.sheet} minimumBottomPadding={20}>
                        <Text style={styles.sheetTitle}>
                            {paMenuEntry?.meta.visitorName || (paMenuEntry ? PA_TYPE[paMenuEntry.type]?.label : '') || 'Pre-Approval'}
                        </Text>
                        <Text style={styles.sheetSubtitle}>Manage this pre-approval</Text>

                        {paMenuEntry?.status === 'ACTIVE' && (
                            <SheetActionRow icon="x-circle" label="Cancel pre-approval" onPress={() => handlePaCancel(paMenuEntry)} />
                        )}
                        {paMenuEntry && (
                            <SheetActionRow icon="trash-2" label="Delete entry" onPress={() => handlePaDelete(paMenuEntry)} />
                        )}

                        <TouchableOpacity style={styles.sheetDismiss} onPress={() => setPaMenuEntry(null)}>
                            <Text style={styles.sheetDismissText}>Dismiss</Text>
                        </TouchableOpacity>
            </AnimatedBottomSheetModal>

            {/* ── Invite action menu ─────────────────── */}
            <AnimatedBottomSheetModal visible={!!invMenuEntry} onClose={() => setInvMenuEntry(null)} surfaceStyle={styles.sheet} minimumBottomPadding={20}>
                        <Text style={styles.sheetTitle}>{invMenuEntry?.visitorName ?? 'Guest Pass'}</Text>
                        <Text style={styles.sheetSubtitle}>Manage this guest pass</Text>

                        {invMenuEntry?.status === 'ACTIVE' && (
                            <SheetActionRow icon="slash" label="Revoke pass" onPress={() => handleInvRevoke(invMenuEntry)} />
                        )}

                        {invMenuEntry && <SheetActionRow icon="trash-2" label="Delete pass" onPress={() => handleInvDelete(invMenuEntry)} />}

                        <TouchableOpacity style={styles.sheetDismiss} onPress={() => setInvMenuEntry(null)}>
                            <Text style={styles.sheetDismissText}>Dismiss</Text>
                        </TouchableOpacity>
            </AnimatedBottomSheetModal>

            {/* ── Party action menu ──────────────────── */}
            <AnimatedBottomSheetModal visible={!!partyMenuEntry} onClose={() => setPartyMenuEntry(null)} surfaceStyle={styles.sheet} minimumBottomPadding={20}>
                        <Text style={styles.sheetTitle}>{partyMenuEntry?.venue || 'Party Invite'}</Text>
                        <Text style={styles.sheetSubtitle}>Manage this party invite</Text>

                        {partyMenuEntry?.status === 'ACTIVE' && (
                            <SheetActionRow icon="x-circle" label="Cancel party invite" onPress={() => handlePartyCancel(partyMenuEntry)} />
                        )}

                        <TouchableOpacity style={styles.sheetDismiss} onPress={() => setPartyMenuEntry(null)}>
                            <Text style={styles.sheetDismissText}>Dismiss</Text>
                        </TouchableOpacity>
            </AnimatedBottomSheetModal>

            <PreApproveSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onSuccess={() => { setSheetVisible(false); loadPreApprovals(); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconBtn: {
        width: 32,
        height: 32,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitleMain: {
        flex: 1,
        fontSize: 18,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginLeft: 12,
    },
    headerIconBtnCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabWrapper: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentActive: {
        backgroundColor: SgateColors.gold,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    segmentTextActive: {
        color: SgateColors.t1,
        fontFamily: SgateFonts.bold,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    emptyTitle: {
        fontSize: 22,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        textAlign: 'center',
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    primaryBtn: {
        backgroundColor: SgateColors.gold,
        paddingHorizontal: 32,
        paddingVertical: 18,
        borderRadius: 40,
        width: '100%',
        alignItems: 'center',
    },
    primaryBtnText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    typeBubble: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: { flex: 1 },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cardName: {
        flex: 1,
        fontSize: 16,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        textTransform: 'uppercase',
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    pillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    details: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        gap: 9,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
    },
    detailLabel: {
        width: 82,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    detailValue: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'right',
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    passcode: {
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    menuBtn: {
        padding: 4,
    },
    sectionLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginTop: 20,
        marginBottom: 12,
    },
    sheet: {
        paddingHorizontal: 24,
    },
    sheetTitle: {
        fontSize: 21,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 16,
    },
    sheetItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
        borderRadius: 14,
        backgroundColor: SgateColors.redBg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sheetItemIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    sheetItemLabel: {
        flex: 1,
        flexShrink: 1,
        fontSize: 15,
        lineHeight: 21,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.red,
    },
    sheetDismiss: {
        marginTop: 4,
        marginBottom: 0,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetDismissText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
    },
});
