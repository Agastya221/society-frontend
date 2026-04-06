import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    type PartyInviteStatus,
} from '../../../services/gate.service';
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

// Combined list item type for Invites tab
type InviteListItem =
    | { _kind: 'section'; title: string }
    | { _kind: 'guest';   data: InvitePass }
    | { _kind: 'party';   data: PartyInvite };

const DAYS_SHORT: Record<string, string> = {
    MON: 'M', TUE: 'T', WED: 'W', THU: 'T', FRI: 'F', SAT: 'S', SUN: 'S',
};

function scheduleLabel(entry: PreApprovedEntry): string {
    const s = entry.schedule;
    if (s.scheduleType === 'ONCE') {
        if (s.date) return `${s.date}  ${s.startTime ?? ''}–${s.endTime ?? ''}`.trim();
        return 'One-time';
    }
    const days = (s.daysOfWeek ?? []).map(d => DAYS_SHORT[d] ?? d).join(' ');
    return `${days}  ${s.timeFrom ?? ''}–${s.timeTo ?? ''}`.trim();
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Pre-Approvals', 'Invites'] as const;
type Tab = typeof TABS[number];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassesScreen() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('Pre-Approvals');

    // ── Pre-Approvals state ──────────────────────────────────────────────────
    const [paEntries, setPaEntries]         = useState<PreApprovedEntry[]>([]);
    const [paLoading, setPaLoading]         = useState(true);
    const [paRefreshing, setPaRefreshing]   = useState(false);
    const [paMenuEntry, setPaMenuEntry]     = useState<PreApprovedEntry | null>(null);
    const [sheetVisible, setSheetVisible]   = useState(false);

    // ── Invites state ────────────────────────────────────────────────────────
    const [invites, setInvites]             = useState<InvitePass[]>([]);
    const [partyInvites, setPartyInvites]   = useState<PartyInvite[]>([]);
    const [invLoading, setInvLoading]       = useState(false);
    const [invRefreshing, setInvRefreshing] = useState(false);
    const [invMenuEntry, setInvMenuEntry]   = useState<InvitePass | null>(null);
    const [partyMenuEntry, setPartyMenuEntry] = useState<PartyInvite | null>(null);

    const loadedTabs = useRef<Set<Tab>>(new Set(['Pre-Approvals']));

    // ── Fetch ────────────────────────────────────────────────────────────────

    const loadPreApprovals = useCallback(async (isRefresh = false) => {
        if (isRefresh) setPaRefreshing(true);
        try {
            const res = await getPreApprovedList({ limit: 50 });
            setPaEntries(res.entries);
        } catch {
            Alert.alert('Error', 'Failed to load pre-approvals');
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
            Alert.alert('Error', 'Failed to load invites');
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

    // ── Pre-Approval actions ─────────────────────────────────────────────────

    const handlePaCancel = (entry: PreApprovedEntry) => {
        setPaMenuEntry(null);
        Alert.alert('Cancel Pre-Approval?', 'The QR code will stop working.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Cancel It', style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelPreApproved(entry.id);
                        setPaEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'CANCELLED' } : e));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel');
                    }
                },
            },
        ]);
    };

    const handlePaDelete = (entry: PreApprovedEntry) => {
        setPaMenuEntry(null);
        Alert.alert('Delete Entry?', 'This will permanently remove this pre-approval.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deletePreApproved(entry.id);
                        setPaEntries(prev => prev.filter(e => e.id !== entry.id));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete');
                    }
                },
            },
        ]);
    };

    // ── Invite actions ───────────────────────────────────────────────────────

    const handleInvRevoke = (invite: InvitePass) => {
        setInvMenuEntry(null);
        Alert.alert('Revoke Invite?', 'This pass will stop working immediately.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Revoke', style: 'destructive',
                onPress: async () => {
                    try {
                        await revokeInvitePass(invite.id);
                        setInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'REVOKED' } : i));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to revoke');
                    }
                },
            },
        ]);
    };

    const handleInvDelete = (invite: InvitePass) => {
        setInvMenuEntry(null);
        Alert.alert('Delete Invite?', 'This will permanently remove this invite pass.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteInvitePass(invite.id);
                        setInvites(prev => prev.filter(i => i.id !== invite.id));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to delete');
                    }
                },
            },
        ]);
    };

    // ── Party invite actions ─────────────────────────────────────────────────

    const handlePartyCancel = (party: PartyInvite) => {
        setPartyMenuEntry(null);
        Alert.alert('Cancel Party Invite?', 'All guest codes will stop working.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Cancel', style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelPartyInvite(party.id);
                        setPartyInvites(prev => prev.map(p => p.id === party.id ? { ...p, status: 'CANCELLED' } : p));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel');
                    }
                },
            },
        ]);
    };

    // ── Render items ─────────────────────────────────────────────────────────

    const renderPreApproval = useCallback(({ item }: { item: PreApprovedEntry }) => {
        const tc = PA_TYPE[item.type];
        const sc = PA_STATUS[item.status];
        const sched = scheduleLabel(item);
        return (
            <View style={styles.card}>
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
                            {item.mode === 'SURPRISE' && (
                                <View style={[styles.pill, { backgroundColor: '#F3EEFF' }]}>
                                    <Text style={[styles.pillText, { color: '#9B6DFF' }]}>Surprise</Text>
                                </View>
                            )}
                            {item.schedule.scheduleType === 'RECURRING' && (
                                <View style={[styles.pill, { backgroundColor: SgateColors.surface }]}>
                                    <Feather name="repeat" size={10} color={SgateColors.t3} />
                                    <Text style={[styles.pillText, { color: SgateColors.t3 }]}> Recurring</Text>
                                </View>
                            )}
                        </View>
                        {!!sched && (
                            <View style={styles.metaRow}>
                                <Feather name="clock" size={11} color={SgateColors.t4} />
                                <Text style={styles.metaText} numberOfLines={1}> {sched}</Text>
                            </View>
                        )}
                        {item.type === 'HELP' && !!item.meta.category && (
                            <Text style={styles.categoryText}>
                                {(item.meta.customCategory ?? item.meta.category).replace(/_/g, ' ')}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setPaMenuEntry(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, []);

    const renderPartyInvite = useCallback(({ item }: { item: PartyInvite }) => {
        const sc = PARTY_STATUS[item.status] ?? PARTY_STATUS.ACTIVE;
        const filledSlots = item.slots.filter(s => s.phone !== null).length;
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={[styles.typeBubble, { backgroundColor: '#F3EEFF' }]}>
                        <Feather name="users" size={20} color="#9B6DFF" />
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardRow}>
                            <Text style={styles.cardName} numberOfLines={1}>{item.venue}</Text>
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
                        <View style={styles.metaRow}>
                            <Feather name="calendar" size={11} color={SgateColors.t4} />
                            <Text style={styles.metaText}> {fmtDate(item.validFrom)} – {fmtDate(item.validUntil)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setPartyMenuEntry(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, []);

    const renderInvite = useCallback(({ item }: { item: InvitePass }) => {
        const tc = INV_TYPE[item.type] ?? INV_TYPE.QUICK;
        const sc = INV_STATUS[item.status] ?? INV_STATUS.ACTIVE;
        return (
            <View style={styles.card}>
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
                        <View style={styles.metaRow}>
                            <Feather name="calendar" size={11} color={SgateColors.t4} />
                            <Text style={styles.metaText}> Until {fmtDate(item.validUntil)}</Text>
                            {item.maxUses !== null && (
                                <Text style={[styles.metaText, { marginLeft: 10 }]}>
                                    · {item.usedCount}/{item.maxUses} uses
                                </Text>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => setInvMenuEntry(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="more-vertical" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Passes</Text>
                {activeTab === 'Pre-Approvals' ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setSheetVisible(true)}>
                        <Feather name="plus" size={20} color={SgateColors.card} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                        onPress={() => handleTabChange(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Pre-Approvals list */}
            {activeTab === 'Pre-Approvals' && (
                paLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={SgateColors.gold} />
                    </View>
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
                                colors={[SgateColors.gold]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Feather name="shield" size={52} color={SgateColors.t4} />
                                <Text style={styles.emptyTitle}>No Pre-Approvals</Text>
                                <Text style={styles.emptySubtitle}>
                                    Pre-approve cabs, deliveries, or helpers so they can enter without waiting.
                                </Text>
                                <TouchableOpacity style={styles.emptyBtn} onPress={() => setSheetVisible(true)}>
                                    <Text style={styles.emptyBtnText}>Create Pre-Approval</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )
            )}

            {/* Invites list — guest passes + party invites combined */}
            {activeTab === 'Invites' && (
                invLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={SgateColors.gold} />
                    </View>
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
                        renderItem={({ item }: { item: InviteListItem }) => {
                            if (item._kind === 'section') {
                                return (
                                    <Text style={styles.sectionLabel}>{item.title}</Text>
                                );
                            }
                            if (item._kind === 'guest') return renderInvite({ item: item.data } as any);
                            return renderPartyInvite({ item: item.data } as any);
                        }}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={invRefreshing}
                                onRefresh={() => loadInvites(true)}
                                tintColor={SgateColors.gold}
                                colors={[SgateColors.gold]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Feather name="user-check" size={52} color={SgateColors.t4} />
                                <Text style={styles.emptyTitle}>No Invites Yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    Your guest passes and party invites will appear here.
                                </Text>
                            </View>
                        }
                    />
                )
            )}

            {/* ── Pre-Approval action menu ─────────────────────────────────── */}
            <Modal
                visible={!!paMenuEntry}
                transparent
                animationType="slide"
                onRequestClose={() => setPaMenuEntry(null)}
            >
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPaMenuEntry(null)}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle} numberOfLines={1}>
                            {paMenuEntry?.meta.visitorName ?? PA_TYPE[paMenuEntry?.type ?? 'CAB']?.label}
                        </Text>

                        <TouchableOpacity
                            style={styles.sheetItem}
                            onPress={() => { setPaMenuEntry(null); setSheetVisible(true); }}
                        >
                            <View style={[styles.sheetIcon, { backgroundColor: SgateColors.blueBg }]}>
                                <Feather name="refresh-cw" size={18} color={SgateColors.blue} />
                            </View>
                            <Text style={styles.sheetItemLabel}>Repeat This</Text>
                            <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>

                        {paMenuEntry?.status === 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.sheetItem}
                                onPress={() => paMenuEntry && handlePaCancel(paMenuEntry)}
                            >
                                <View style={[styles.sheetIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <Feather name="x-circle" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.sheetItemLabel, { color: SgateColors.red }]}>Cancel Pre-Approval</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        {paMenuEntry?.status !== 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.sheetItem}
                                onPress={() => paMenuEntry && handlePaDelete(paMenuEntry)}
                            >
                                <View style={[styles.sheetIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <Feather name="trash-2" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.sheetItemLabel, { color: SgateColors.red }]}>Delete Entry</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.sheetDismiss} onPress={() => setPaMenuEntry(null)}>
                            <Text style={styles.sheetDismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Invite action menu ───────────────────────────────────────── */}
            <Modal
                visible={!!invMenuEntry}
                transparent
                animationType="slide"
                onRequestClose={() => setInvMenuEntry(null)}
            >
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setInvMenuEntry(null)}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle} numberOfLines={1}>
                            {invMenuEntry?.visitorName ?? `${INV_TYPE[invMenuEntry?.type ?? 'QUICK']?.label} Pass`}
                        </Text>

                        {invMenuEntry?.status === 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.sheetItem}
                                onPress={() => invMenuEntry && handleInvRevoke(invMenuEntry)}
                            >
                                <View style={[styles.sheetIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <Feather name="slash" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.sheetItemLabel, { color: SgateColors.red }]}>Revoke Pass</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        {invMenuEntry?.status !== 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.sheetItem}
                                onPress={() => invMenuEntry && handleInvDelete(invMenuEntry)}
                            >
                                <View style={[styles.sheetIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <Feather name="trash-2" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.sheetItemLabel, { color: SgateColors.red }]}>Delete Pass</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.sheetDismiss} onPress={() => setInvMenuEntry(null)}>
                            <Text style={styles.sheetDismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Party action menu ────────────────────────────────────────── */}
            <Modal
                visible={!!partyMenuEntry}
                transparent
                animationType="slide"
                onRequestClose={() => setPartyMenuEntry(null)}
            >
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPartyMenuEntry(null)}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle} numberOfLines={1}>
                            {partyMenuEntry?.venue ?? 'Party Invite'}
                        </Text>

                        {partyMenuEntry?.status === 'ACTIVE' && (
                            <TouchableOpacity
                                style={styles.sheetItem}
                                onPress={() => partyMenuEntry && handlePartyCancel(partyMenuEntry)}
                            >
                                <View style={[styles.sheetIcon, { backgroundColor: SgateColors.redBg }]}>
                                    <Feather name="x-circle" size={18} color={SgateColors.red} />
                                </View>
                                <Text style={[styles.sheetItemLabel, { color: SgateColors.red }]}>Cancel Party Invite</Text>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.sheetDismiss} onPress={() => setPartyMenuEntry(null)}>
                            <Text style={styles.sheetDismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Pre-Approve creation sheet */}
            <PreApproveSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onSuccess={() => { setSheetVisible(false); loadPreApprovals(); }}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.black,
        alignItems: 'center',
        justifyContent: 'center',
    },

    tabBar: {
        flexDirection: 'row',
        backgroundColor: SgateColors.card,
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: SgateColors.bg,
    },
    tabItemActive: {
        backgroundColor: SgateColors.black,
    },
    tabText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
    tabTextActive: {
        color: SgateColors.card,
    },

    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        gap: 10,
        flexGrow: 1,
    },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        overflow: 'hidden',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        gap: 12,
    },
    typeBubble: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cardInfo: { flex: 1 },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    cardName: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.6,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginBottom: 6,
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
        marginTop: 2,
    },
    metaText: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    passcode: {
        fontFamily: SgateFonts.bold,
        letterSpacing: 1.5,
        color: SgateColors.t1,
    },
    categoryText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        textTransform: 'capitalize',
        marginTop: 2,
    },
    menuBtn: { paddingTop: 2 },

    sectionLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginTop: 8,
        marginBottom: 4,
    },

    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 36,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyBtn: {
        marginTop: 12,
        backgroundColor: SgateColors.black,
        paddingHorizontal: 28,
        paddingVertical: 13,
        borderRadius: 14,
    },
    emptyBtnText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.card,
    },

    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
        marginBottom: 14,
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        gap: 12,
    },
    sheetIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetItemLabel: {
        flex: 1,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    sheetDismiss: {
        paddingTop: 16,
        alignItems: 'center',
    },
    sheetDismissText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
});
