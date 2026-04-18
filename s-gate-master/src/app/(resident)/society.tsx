import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/ui/Avatar';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';
import type { Entry, EntryType, Notice } from '../../types/api';
import { useAuthStore } from '../../store/useAuthStore';
import * as communityService from '../../services/community.service';
import * as gateService from '../../services/gate.service';
import api from '../../services/api';


// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'Visitors' | 'Notices' | 'Residents';
const TABS: Tab[] = ['Visitors', 'Notices', 'Residents'];

// ─── Resident types ───────────────────────────────────────────────────────────

interface Resident {
    id: string;
    name: string;
    phone: string;
    flat: string;
    block: string;
    role: 'Owner' | 'Tenant' | 'Family';
}

function normaliseResident(raw: any): Resident {
    return {
        id:    raw.id,
        name:  raw.user?.name ?? raw.name ?? '',
        phone: raw.user?.phone ?? raw.phone ?? '',
        flat:  raw.flat?.number ?? raw.flatNumber ?? raw.flat ?? '',
        block: raw.flat?.block?.name ?? raw.block ?? raw.blockName ?? '',
        role:  raw.residentType ?? raw.role ?? 'Owner',
    };
}

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
    Owner:  { bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    Tenant: { bg: '#E8F0FE',           fg: '#3B82F6' },
    Family: { bg: SgateColors.greenBg,  fg: SgateColors.green },
};

// ─── Visitor helpers ─────────────────────────────────────────────────────────

const VISITOR_PAGE_SIZE = 50;

const VISITOR_TYPE_LABELS: Record<EntryType, string> = {
    VISITOR: 'Guest',
    DELIVERY: 'Delivery',
    DOMESTIC_STAFF: 'Staff',
    CAB: 'Cab',
    VENDOR: 'Vendor',
};

const VISITOR_TYPE_COLORS: Record<EntryType, { bg: string; fg: string }> = {
    VISITOR:        { bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    DELIVERY:       { bg: '#E8F0FE',           fg: '#3B82F6' },
    DOMESTIC_STAFF: { bg: SgateColors.greenBg,  fg: SgateColors.green },
    CAB:            { bg: '#FFF3E0',            fg: '#F57C00' },
    VENDOR:         { bg: '#F3E5F5',            fg: '#8E24AA' },
};

function timeOnly(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = today.getTime() - target.getTime();
    const dayMs = 86_400_000;
    if (diff === 0) return 'Today';
    if (diff === dayMs) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type VisitorSectionHeader = { kind: 'header'; title: string };
type VisitorSectionItem   = { kind: 'item'; entry: Entry };
type VisitorListRow       = VisitorSectionHeader | VisitorSectionItem;

// ─── Notice helpers ──────────────────────────────────────────────────────────

const TYPE_CFG: Record<string, { label: string; bg: string; text: string; border: string; bar: string; icon: keyof typeof Feather.glyphMap }> = {
    ALERT:       { label: 'URGENT ALERT',   bg: '#FFEBEB', text: '#CC3333', border: '#FFCCCC', bar: '#FF5C5C', icon: 'alert-circle' },
    EVENT:       { label: 'UPCOMING EVENT', bg: '#EBF0FF', text: '#3355CC', border: '#CCDDFF', bar: '#4C9AFF', icon: 'calendar'     },
    MAINTENANCE: { label: 'MAINTENANCE',    bg: '#FFF8E1', text: '#CC8800', border: '#FFE799', bar: '#FFB800', icon: 'tool'         },
    GENERAL:     { label: 'GENERAL',        bg: '#F0F0F4', text: '#555566', border: '#E0E0EA', bar: '#8A8D97', icon: 'info'         },
};

const NOTICE_FILTERS = ['ALL', 'ALERT', 'EVENT', 'MAINTENANCE'] as const;

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SocietyScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    const [activeTab, setActiveTab] = useState<Tab>('Visitors');
    const [search, setSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [blockFilter, setBlockFilter] = useState('All');
    const [noticeFilter, setNoticeFilter] = useState<string>('ALL');

    // ── Notices state ────────────────────────────────────────────────────
    const [notices, setNotices] = useState<Notice[]>([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [noticesRefreshing, setNoticesRefreshing] = useState(false);

    const fetchNotices = useCallback(async () => {
        try {
            const data = await communityService.getNotices({ page: 1, limit: 30 });
            setNotices(data);
        } catch (err) {
            console.error('fetchNotices failed:', err);
        }
    }, []);

    useEffect(() => {
        (async () => {
            await fetchNotices();
            setNoticesLoading(false);
        })();
    }, [fetchNotices]);

    const onRefreshNotices = useCallback(async () => {
        setNoticesRefreshing(true);
        await fetchNotices();
        setNoticesRefreshing(false);
    }, [fetchNotices]);

    // ── Visitors state ───────────────────────────────────────────────────
    const [entries, setEntries] = useState<Entry[]>([]);
    const [visitorsLoading, setVisitorsLoading] = useState(true);
    const [visitorsRefreshing, setVisitorsRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);

    const fetchVisitorPage = useCallback(async (page: number, replace: boolean) => {
        try {
            const data = await gateService.getEntries({ page, limit: VISITOR_PAGE_SIZE });
            if (replace) setEntries(data);
            else setEntries(prev => [...prev, ...data]);
            hasMoreRef.current = data.length === VISITOR_PAGE_SIZE;
        } catch (err) {
            console.error('fetchEntries failed:', err);
        }
    }, []);

    useEffect(() => {
        (async () => {
            await fetchVisitorPage(1, true);
            setVisitorsLoading(false);
        })();
    }, [fetchVisitorPage]);

    const onRefreshVisitors = useCallback(async () => {
        setVisitorsRefreshing(true);
        pageRef.current = 1;
        hasMoreRef.current = true;
        await fetchVisitorPage(1, true);
        setVisitorsRefreshing(false);
    }, [fetchVisitorPage]);

    const onEndReachedVisitors = useCallback(async () => {
        if (loadingMore || !hasMoreRef.current || search) return;
        setLoadingMore(true);
        const next = pageRef.current + 1;
        await fetchVisitorPage(next, false);
        pageRef.current = next;
        setLoadingMore(false);
    }, [loadingMore, search, fetchVisitorPage]);

    // ── Residents state ──────────────────────────────────────────────────
    const [residents, setResidents] = useState<Resident[]>([]);
    const [residentsLoading, setResidentsLoading] = useState(false);

    const fetchResidents = useCallback(async () => {
        setResidentsLoading(true);
        try {
            const res = await api.get('/resident/society/residents', { params: { page: 1, limit: 100 } });
            const list: any[] = res.data?.data ?? res.data ?? [];
            setResidents((Array.isArray(list) ? list : []).map(normaliseResident));
        } catch (err) {
            console.error('fetchResidents failed:', err);
        } finally { setResidentsLoading(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'Residents' && residents.length === 0) fetchResidents();
    }, [activeTab]);


    // ── Filtered notices ─────────────────────────────────────────────────
    const pinnedNotices = useMemo(() => notices.filter(n => n.isPinned), [notices]);
    const filteredNotices = useMemo(() => {
        const q = search.toLowerCase().trim();
        let list = notices.filter(n => !n.isPinned);
        if (noticeFilter !== 'ALL') list = list.filter(n => n.type === noticeFilter);
        if (q) list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
        return list;
    }, [notices, search, noticeFilter]);

    // ── Block pills ──────────────────────────────────────────────────────
    const blocks = useMemo(() => {
        const set = new Set(residents.map((r) => r.block).filter(Boolean));
        return ['All', ...Array.from(set).sort()];
    }, [residents]);

    // ── Filtered residents ───────────────────────────────────────────────
    const filteredResidents = useMemo(() => {
        let list = residents;
        if (blockFilter !== 'All') list = list.filter((r) => r.block === blockFilter);
        const q = search.toLowerCase().trim();
        if (q) list = list.filter(r => r.name.toLowerCase().includes(q) || r.flat.toLowerCase().includes(q));
        return list;
    }, [residents, blockFilter, search]);


    const visitorRows = useMemo<VisitorListRow[]>(() => {
        const q = search.toLowerCase().trim();
        const filtered = q
            ? entries.filter(e => e.visitorName.toLowerCase().includes(q) || (e.flat?.number ?? '').toLowerCase().includes(q))
            : entries;
        const result: VisitorListRow[] = [];
        let lastDate = '';
        for (const entry of filtered) {
            const dl = dateLabel(entry.createdAt);
            if (dl !== lastDate) { lastDate = dl; result.push({ kind: 'header', title: dl }); }
            result.push({ kind: 'item', entry });
        }
        return result;
    }, [entries, search]);

    // ── Call handler ─────────────────────────────────────────────────────
    const handleCall = useCallback((phone: string) => { Linking.openURL(`tel:${phone}`); }, []);

    // ── Render pinned notice card ────────────────────────────────────────
    const renderPinnedNotice = useCallback((item: Notice) => {
        const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.GENERAL;
        return (
            <View key={item.id} style={[S.pinnedCard, { borderLeftColor: cfg.bar }]}>
                <View style={S.pinnedCardTop}>
                    <View style={[S.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <Text style={[S.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                    <Text style={S.pinnedDate}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={S.noticeTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={S.noticeContent} numberOfLines={3}>{item.content}</Text>
            </View>
        );
    }, []);

    // ── Render recent notice row ─────────────────────────────────────────
    const renderNotice = useCallback(({ item, index }: { item: Notice; index: number }) => {
        const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.GENERAL;
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
                <View style={S.noticeCard}>
                    <View style={[S.noticeIcon, { backgroundColor: cfg.bg }]}>
                        <Feather name={cfg.icon} size={18} color={cfg.text} />
                    </View>
                    <View style={S.noticeBody}>
                        <Text style={S.noticeTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={S.noticeContent} numberOfLines={2}>{item.content}</Text>
                        <View style={S.noticeMeta}>
                            <Feather name="calendar" size={10} color={SgateColors.t4} />
                            <Text style={S.noticeTime}>{timeAgo(item.createdAt)}</Text>
                            <View style={[S.noticeTypePill, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1 }]}>
                                <Text style={[S.noticeTypeText, { color: cfg.text }]}>{cfg.label}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    }, []);

    // ── Render visitor row ───────────────────────────────────────────────
    const renderVisitorItem = useCallback(({ item, index }: { item: VisitorListRow; index: number }) => {
        if (item.kind === 'header') {
            return <Text style={S.visitorSectionTitle}>{item.title}</Text>;
        }
        const e = item.entry;
        const typeColor = VISITOR_TYPE_COLORS[e.type] ?? VISITOR_TYPE_COLORS.VISITOR;
        const isInside = e.status === 'CHECKED_IN';
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify()}>
                <View style={S.visitorRow}>
                    <Avatar name={e.visitorName} size={42} />
                    <View style={S.visitorBody}>
                        <View style={S.visitorTop}>
                            <Text style={S.visitorName} numberOfLines={1}>{e.visitorName}</Text>
                            <Text style={S.visitorTime}>{timeOnly(e.createdAt)}</Text>
                        </View>
                        <View style={S.visitorBottom}>
                            <View style={[S.typePill, { backgroundColor: typeColor.bg }]}>
                                <Text style={[S.typePillText, { color: typeColor.fg }]}>
                                    {VISITOR_TYPE_LABELS[e.type] ?? e.type}
                                </Text>
                            </View>
                            <View style={S.statusWrap}>
                                <View style={[S.statusDot, { backgroundColor: isInside ? SgateColors.green : SgateColors.t3 }]} />
                                <Text style={[S.statusText, { color: isInside ? SgateColors.green : SgateColors.t3 }]}>
                                    {isInside ? 'Inside' : 'Left'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    }, []);

    // ── Render resident row ──────────────────────────────────────────────
    const renderResident = useCallback(({ item, index }: { item: Resident; index: number }) => {
        const role = ROLE_COLORS[item.role] ?? ROLE_COLORS.Owner;
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
                <View style={S.residentRow}>
                    <Avatar name={item.name} size={44} />
                    <View style={S.residentBody}>
                        <Text style={S.residentName} numberOfLines={1}>{item.name}</Text>
                        <Text style={S.residentFlat}>{item.block}-{item.flat}</Text>
                    </View>
                    <View style={[S.roleBadge, { backgroundColor: role.bg }]}>
                        <Text style={[S.roleText, { color: role.fg }]}>{item.role}</Text>
                    </View>
                    <TouchableOpacity style={S.callBtn} onPress={() => handleCall(item.phone)} hitSlop={8}>
                        <Feather name="phone" size={16} color={SgateColors.green} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }, [handleCall]);

    // ── Empty states ─────────────────────────────────────────────────────
    const VisitorsEmpty = useCallback(() => (
        <View style={S.empty}>
            <View style={S.emptyIcon}><Feather name="user-check" size={32} color={SgateColors.t3} /></View>
            <Text style={S.emptyTitle}>{search ? 'No matches' : 'No visitors yet'}</Text>
            <Text style={S.emptySub}>{search ? 'Try a different search term' : 'Visitor entries will appear here'}</Text>
        </View>
    ), [search]);

    const NoticesEmpty = useCallback(() => (
        <View style={S.empty}>
            <View style={S.emptyIcon}><Feather name="file-text" size={32} color={SgateColors.t3} /></View>
            <Text style={S.emptyTitle}>{search ? 'No matching notices' : 'No notices yet'}</Text>
            <Text style={S.emptySub}>Society notices will appear here</Text>
        </View>
    ), [search]);

    const ResidentsEmpty = useCallback(() => (
        <View style={S.empty}>
            <View style={S.emptyIcon}><Feather name="users" size={32} color={SgateColors.t3} /></View>
            <Text style={S.emptyTitle}>{search ? 'No matching residents' : 'No residents found'}</Text>
            <Text style={S.emptySub}>Resident directory coming soon</Text>
        </View>
    ), [search]);

    // ── Search placeholder ───────────────────────────────────────────────
    const searchPlaceholder = activeTab === 'Visitors'
        ? 'Search by name or flat…'
        : activeTab === 'Notices'
            ? 'Search notices…'
            : 'Search by name or flat…';

    // ── Loading ──────────────────────────────────────────────────────────
    const isTabLoading = (activeTab === 'Notices' && noticesLoading) || (activeTab === 'Visitors' && visitorsLoading);
    if (isTabLoading) {
        return (
            <View style={[S.root, S.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={SgateColors.gold} />
            </View>
        );
    }

    return (
        <View style={S.root}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={[S.header, { paddingTop: insets.top + 16, paddingBottom: 14 }]}>
                <TouchableOpacity 
                    onPress={() => router.push('/(resident)/home' as any)}
                    style={S.backButton}
                    accessibilityLabel="Go back to Home"
                >
                    <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={S.headerTitle} numberOfLines={1}>
                        {user?.society?.name ?? 'My Society'}
                    </Text>
                    {user?.society?.address ? (
                        <Text style={S.headerSub} numberOfLines={1}>
                            {user.society.address}
                            {user.society.city ? `, ${user.society.city}` : ''}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* ── Tab switcher ────────────────────────────────────────── */}
            <View style={S.tabWrap}>
                <View style={S.tabRow}>
                    {TABS.map((tab) => {
                        const active = tab === activeTab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[S.tabPill, active && S.tabPillActive]}
                                activeOpacity={0.7}
                                onPress={() => { setActiveTab(tab); setSearch(''); }}
                            >
                                <Text style={[S.tabLabel, active && S.tabLabelActive]}>{tab}</Text>
                                {tab === 'Visitors' && entries.length > 0 && (
                                    <View style={[S.tabBadge, active && S.tabBadgeActive]}>
                                        <Text style={[S.tabBadgeText, active && S.tabBadgeTextActive]}>{entries.length}</Text>
                                    </View>
                                )}
                                {tab === 'Notices' && notices.length > 0 && (
                                    <View style={[S.tabBadge, active && S.tabBadgeActive]}>
                                        <Text style={[S.tabBadgeText, active && S.tabBadgeTextActive]}>{notices.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Search ──────────────────────────────────────────────── */}
            <View style={S.searchWrap}>
                <View style={[S.searchBar, searchFocused && S.searchBarFocused]}>
                    <Feather name="search" size={16} color={searchFocused ? SgateColors.gold : SgateColors.t3} />
                    <TextInput
                        style={S.searchInput}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={SgateColors.t4}
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                            <Feather name="x" size={16} color={SgateColors.t3} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Search Vehicle shortcut (Visitors tab only) ─────────── */}
            {activeTab === 'Visitors' && (
                <TouchableOpacity
                    style={S.searchVehicleBtn}
                    onPress={() => router.push('/(resident)/search-vehicle' as any)}
                    activeOpacity={0.75}
                >
                    <Feather name="truck" size={14} color={SgateColors.t2} />
                    <Text style={S.searchVehicleText}>Search Vehicle in Society</Text>
                    <Feather name="chevron-right" size={14} color={SgateColors.t3} />
                </TouchableOpacity>
            )}

            {/* ── Block filter pills (Residents only) ─────────────────── */}
            {activeTab === 'Residents' && (
                <View style={S.blockWrap}>
                    {blocks.map((block) => {
                        const active = block === blockFilter;
                        return (
                            <TouchableOpacity
                                key={block}
                                style={[S.blockPill, active && S.blockPillActive]}
                                activeOpacity={0.7}
                                onPress={() => setBlockFilter(block)}
                            >
                                <Text style={[S.blockLabel, active && S.blockLabelActive]}>
                                    {block === 'All' ? 'All' : `Block ${block}`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* ── Visitors List ────────────────────────────────────────── */}
            {activeTab === 'Visitors' && (
                <FlatList
                    data={visitorRows}
                    keyExtractor={(row, i) => row.kind === 'header' ? `hdr-${row.title}-${i}` : row.entry.id}
                    renderItem={renderVisitorItem}
                    ListEmptyComponent={VisitorsEmpty}
                    ListFooterComponent={loadingMore ? <View style={S.footer}><ActivityIndicator size="small" color={SgateColors.gold} /></View> : null}
                    contentContainerStyle={visitorRows.length === 0 ? S.emptyContainer : S.listContent}
                    refreshing={visitorsRefreshing}
                    onRefresh={onRefreshVisitors}
                    onEndReached={onEndReachedVisitors}
                    onEndReachedThreshold={0.3}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ── Notices List ─────────────────────────────────────────── */}
            {activeTab === 'Notices' && (
                <FlatList
                    data={filteredNotices}
                    keyExtractor={(n) => n.id}
                    renderItem={renderNotice}
                    ListEmptyComponent={NoticesEmpty}
                    contentContainerStyle={filteredNotices.length === 0 && pinnedNotices.length === 0 ? S.emptyContainer : S.listContent}
                    refreshing={noticesRefreshing}
                    onRefresh={onRefreshNotices}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                            {pinnedNotices.length > 0 && (
                                <View style={S.sectionBlock}>
                                    <View style={S.sectionRow}>
                                        <Feather name="bookmark" size={12} color={SgateColors.t3} />
                                        <Text style={S.sectionLabel}>PINNED NOTICES</Text>
                                    </View>
                                    {pinnedNotices.map(renderPinnedNotice)}
                                </View>
                            )}
                            <View style={S.recentHeaderRow}>
                                <Text style={S.sectionLabel}>RECENT UPDATES</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
                                    {NOTICE_FILTERS.map(tab => (
                                        <TouchableOpacity
                                            key={tab}
                                            style={[S.filterChip, noticeFilter === tab && S.filterChipActive]}
                                            onPress={() => setNoticeFilter(tab)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[S.filterChipText, noticeFilter === tab && S.filterChipTextActive]}>
                                                {tab === 'ALERT' ? 'URGENT' : tab}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </>
                    }
                />
            )}

            {/* ── Residents List ───────────────────────────────────────── */}
            {activeTab === 'Residents' && (
                <FlatList
                    data={filteredResidents}
                    keyExtractor={(r) => r.id}
                    renderItem={renderResident}
                    ListEmptyComponent={ResidentsEmpty}
                    contentContainerStyle={filteredResidents.length === 0 ? S.emptyContainer : S.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={fetchResidents}
                    refreshing={residentsLoading}
                />
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root:   { flex: 1, backgroundColor: SgateColors.bg },
    center: { alignItems: 'center', justifyContent: 'center' },

    // ── Header ──────────────────────────────────────────────────────────
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    headerSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // ── Tab switcher ────────────────────────────────────────────────────
    tabWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
    tabRow: { flexDirection: 'row', backgroundColor: SgateColors.surface, borderRadius: 12, padding: 3 },
    tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
    tabPillActive: { backgroundColor: SgateColors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
    tabLabel: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    tabLabelActive: { color: SgateColors.t1 },
    tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: SgateColors.borderSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabBadgeActive: { backgroundColor: SgateColors.gold },
    tabBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3 },
    tabBadgeTextActive: { color: SgateColors.black },

    // ── Search ──────────────────────────────────────────────────────────
    searchWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1.5, borderColor: 'transparent', gap: 8 },
    searchBarFocused: { borderColor: SgateColors.gold, backgroundColor: SgateColors.card },
    searchInput: { flex: 1, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, paddingVertical: 0 },

    // ── Search vehicle shortcut ─────────────────────────────────────────
    searchVehicleBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 2, backgroundColor: SgateColors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
    searchVehicleText: { flex: 1, fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    // ── Block filter ────────────────────────────────────────────────────
    blockWrap: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 8 },
    blockPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: SgateColors.surface },
    blockPillActive: { backgroundColor: SgateColors.black },
    blockLabel: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    blockLabelActive: { color: '#FFFFFF' },

    // ── List ────────────────────────────────────────────────────────────
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

    // ── Section headers (notices) ───────────────────────────────────────
    sectionBlock: { marginBottom: 4 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 1.1 },
    recentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    filterRow: { flexDirection: 'row', gap: 6 },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: SgateColors.surface },
    filterChipActive: { backgroundColor: SgateColors.t1 },
    filterChipText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5 },
    filterChipTextActive: { color: SgateColors.card },

    // ── Pinned notice card ──────────────────────────────────────────────
    pinnedCard: { backgroundColor: SgateColors.card, borderRadius: 14, borderLeftWidth: 4, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    pinnedCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
    badgeText: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
    pinnedDate: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // ── Recent notice card ──────────────────────────────────────────────
    noticeCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: SgateColors.card, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
    noticeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    noticeBody: { flex: 1 },
    noticeTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
    noticeContent: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 18, marginBottom: 8 },
    noticeMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    noticeTime: { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t4, letterSpacing: 0.3 },
    noticeTypePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
    noticeTypeText: { fontSize: 9, fontFamily: SgateFonts.bold, letterSpacing: 0.4 },

    // ── Visitor row ─────────────────────────────────────────────────────
    visitorSectionTitle: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 1, textTransform: 'uppercase', paddingTop: 14, paddingBottom: 6 },
    visitorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: SgateColors.borderSoft },
    visitorBody: { flex: 1, marginLeft: 12 },
    visitorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    visitorName: { flex: 1, fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginRight: 8 },
    visitorTime: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    visitorBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    typePillText: { fontSize: 11, fontFamily: SgateFonts.semibold },
    statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.medium },

    // ── Resident row ────────────────────────────────────────────────────
    residentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: SgateColors.borderSoft },
    residentBody: { flex: 1, marginLeft: 12 },
    residentName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    residentFlat: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 10 },
    roleText: { fontSize: 10, fontFamily: SgateFonts.bold },
    callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SgateColors.greenBg, alignItems: 'center', justifyContent: 'center' },

    // ── Empty ───────────────────────────────────────────────────────────
    empty: { alignItems: 'center', gap: 8 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },

    // ── Footer / Banner ─────────────────────────────────────────────────
    footer: { paddingVertical: 20, alignItems: 'center' },
    comingSoonBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: SgateColors.surface, borderTopWidth: 1, borderTopColor: SgateColors.borderSoft },
    comingSoonText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
});
