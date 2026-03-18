import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateAvatar } from '../../components/Sgate';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';
import type { Notice } from '../../types/api';
import { useAuthStore } from '../../store/useAuthStore';
import * as communityService from '../../services/community.service';

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'Notices' | 'Residents';
const TABS: Tab[] = ['Notices', 'Residents'];

// ─── Mock residents (no API endpoint yet) ────────────────────────────────────

interface Resident {
    id: string;
    name: string;
    phone: string;
    flat: string;
    block: string;
    role: 'Owner' | 'Tenant' | 'Family';
}

const MOCK_RESIDENTS: Resident[] = [
    { id: '1', name: 'Rahul Sharma',   phone: '+919876543210', flat: '101', block: 'A', role: 'Owner' },
    { id: '2', name: 'Priya Patel',    phone: '+919876543211', flat: '202', block: 'A', role: 'Tenant' },
    { id: '3', name: 'Amit Kumar',     phone: '+919876543212', flat: '303', block: 'B', role: 'Owner' },
    { id: '4', name: 'Sneha Gupta',    phone: '+919876543213', flat: '104', block: 'B', role: 'Family' },
    { id: '5', name: 'Vikram Singh',   phone: '+919876543214', flat: '501', block: 'A', role: 'Owner' },
    { id: '6', name: 'Anita Desai',    phone: '+919876543215', flat: '402', block: 'C', role: 'Tenant' },
    { id: '7', name: 'Rajesh Nair',    phone: '+919876543216', flat: '201', block: 'C', role: 'Owner' },
    { id: '8', name: 'Meera Iyer',     phone: '+919876543217', flat: '305', block: 'A', role: 'Family' },
];

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
    Owner:  { bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    Tenant: { bg: '#E8F0FE',           fg: '#3B82F6' },
    Family: { bg: SgateColors.greenBg,  fg: SgateColors.green },
};

// ─── Notice helpers ──────────────────────────────────────────────────────────

const PRIORITY_ICON: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
    HIGH:   { icon: 'alert-circle', color: SgateColors.red },
    MEDIUM: { icon: 'info',         color: SgateColors.gold },
    LOW:    { icon: 'bell',         color: SgateColors.t3 },
};

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
    const user = useAuthStore((s) => s.user);

    const [activeTab, setActiveTab] = useState<Tab>('Notices');
    const [search, setSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [blockFilter, setBlockFilter] = useState('All');

    // ── Notices state ────────────────────────────────────────────────────
    const [notices, setNotices] = useState<Notice[]>([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Fetch notices ────────────────────────────────────────────────────
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotices();
        setRefreshing(false);
    }, [fetchNotices]);

    // ── Block pills ──────────────────────────────────────────────────────
    const blocks = useMemo(() => {
        const set = new Set(MOCK_RESIDENTS.map((r) => r.block));
        return ['All', ...Array.from(set).sort()];
    }, []);

    // ── Filtered residents ───────────────────────────────────────────────
    const filteredResidents = useMemo(() => {
        let list = MOCK_RESIDENTS;
        if (blockFilter !== 'All') {
            list = list.filter((r) => r.block === blockFilter);
        }
        const q = search.toLowerCase().trim();
        if (q) {
            list = list.filter(
                (r) =>
                    r.name.toLowerCase().includes(q) ||
                    r.flat.toLowerCase().includes(q),
            );
        }
        return list;
    }, [blockFilter, search]);

    // ── Filtered notices ─────────────────────────────────────────────────
    const filteredNotices = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return notices;
        return notices.filter(
            (n) =>
                n.title.toLowerCase().includes(q) ||
                n.content.toLowerCase().includes(q),
        );
    }, [notices, search]);

    // ── Call handler ─────────────────────────────────────────────────────
    const handleCall = useCallback((phone: string) => {
        Linking.openURL(`tel:${phone}`);
    }, []);

    // ── Render notice row ────────────────────────────────────────────────
    const renderNotice = useCallback(
        ({ item, index }: { item: Notice; index: number }) => {
            const meta = PRIORITY_ICON[item.priority] ?? PRIORITY_ICON.LOW;
            return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
                    <View style={styles.noticeCard}>
                        {item.isPinned && (
                            <View style={styles.pinnedBadge}>
                                <Feather name="bookmark" size={10} color={SgateColors.gold} />
                                <Text style={styles.pinnedText}>Pinned</Text>
                            </View>
                        )}
                        <View style={styles.noticeRow}>
                            <View style={[styles.noticeIcon, { backgroundColor: meta.color + '18' }]}>
                                <Feather name={meta.icon} size={18} color={meta.color} />
                            </View>
                            <View style={styles.noticeBody}>
                                <Text style={styles.noticeTitle} numberOfLines={2}>
                                    {item.title}
                                </Text>
                                <Text style={styles.noticeContent} numberOfLines={3}>
                                    {item.content}
                                </Text>
                                <View style={styles.noticeMeta}>
                                    <Text style={styles.noticeTime}>{timeAgo(item.createdAt)}</Text>
                                    <View style={styles.noticeTypePill}>
                                        <Text style={styles.noticeTypeText}>{item.type}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            );
        },
        [],
    );

    // ── Render resident row ──────────────────────────────────────────────
    const renderResident = useCallback(
        ({ item, index }: { item: Resident; index: number }) => {
            const role = ROLE_COLORS[item.role] ?? ROLE_COLORS.Owner;
            return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify()}>
                    <View style={styles.residentRow}>
                        <SgateAvatar name={item.name} size={44} />
                        <View style={styles.residentBody}>
                            <Text style={styles.residentName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={styles.residentFlat}>
                                {item.block}-{item.flat}
                            </Text>
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
                            <Text style={[styles.roleText, { color: role.fg }]}>
                                {item.role}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => handleCall(item.phone)}
                            hitSlop={8}
                        >
                            <Feather name="phone" size={16} color={SgateColors.green} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            );
        },
        [handleCall],
    );

    // ── Empty states ─────────────────────────────────────────────────────
    const NoticesEmpty = useCallback(
        () => (
            <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                    <Feather name="file-text" size={32} color={SgateColors.t3} />
                </View>
                <Text style={styles.emptyTitle}>
                    {search ? 'No matching notices' : 'No notices yet'}
                </Text>
                <Text style={styles.emptySub}>
                    Society notices will appear here
                </Text>
            </View>
        ),
        [search],
    );

    const ResidentsEmpty = useCallback(
        () => (
            <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                    <Feather name="users" size={32} color={SgateColors.t3} />
                </View>
                <Text style={styles.emptyTitle}>
                    {search ? 'No matching residents' : 'No residents found'}
                </Text>
                <Text style={styles.emptySub}>
                    Resident directory coming soon
                </Text>
            </View>
        ),
        [search],
    );

    // ── Loading ──────────────────────────────────────────────────────────
    if (noticesLoading && activeTab === 'Notices') {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={SgateColors.gold} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {user?.society?.name ?? 'My Society'}
                </Text>
                {user?.society?.address ? (
                    <Text style={styles.headerSub} numberOfLines={1}>
                        {user.society.address}
                        {user.society.city ? `, ${user.society.city}` : ''}
                    </Text>
                ) : null}
            </View>

            {/* ── Tab switcher ────────────────────────────────────────── */}
            <View style={styles.tabWrap}>
                <View style={styles.tabRow}>
                    {TABS.map((tab) => {
                        const active = tab === activeTab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabPill, active && styles.tabPillActive]}
                                activeOpacity={0.7}
                                onPress={() => { setActiveTab(tab); setSearch(''); }}
                            >
                                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                                    {tab}
                                </Text>
                                {tab === 'Notices' && notices.length > 0 && (
                                    <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                                        <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                                            {notices.length}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Search ──────────────────────────────────────────────── */}
            <View style={styles.searchWrap}>
                <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
                    <Feather
                        name="search"
                        size={16}
                        color={searchFocused ? SgateColors.gold : SgateColors.t3}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={
                            activeTab === 'Notices'
                                ? 'Search notices…'
                                : 'Search by name or flat…'
                        }
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

            {/* ── Block filter pills (Residents only) ─────────────────── */}
            {activeTab === 'Residents' && (
                <View style={styles.blockWrap}>
                    {blocks.map((block) => {
                        const active = block === blockFilter;
                        return (
                            <TouchableOpacity
                                key={block}
                                style={[styles.blockPill, active && styles.blockPillActive]}
                                activeOpacity={0.7}
                                onPress={() => setBlockFilter(block)}
                            >
                                <Text style={[styles.blockLabel, active && styles.blockLabelActive]}>
                                    {block === 'All' ? 'All' : `Block ${block}`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* ── List ────────────────────────────────────────────────── */}
            {activeTab === 'Notices' ? (
                <FlatList
                    data={filteredNotices}
                    keyExtractor={(n) => n.id}
                    renderItem={renderNotice}
                    ListEmptyComponent={NoticesEmpty}
                    contentContainerStyle={
                        filteredNotices.length === 0
                            ? styles.emptyContainer
                            : styles.listContent
                    }
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={filteredResidents}
                    keyExtractor={(r) => r.id}
                    renderItem={renderResident}
                    ListEmptyComponent={ResidentsEmpty}
                    contentContainerStyle={
                        filteredResidents.length === 0
                            ? styles.emptyContainer
                            : styles.listContent
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* ── Coming soon banner (Residents tab) ──────────────────── */}
            {activeTab === 'Residents' && (
                <View style={styles.comingSoonBanner}>
                    <Feather name="info" size={14} color={SgateColors.t3} />
                    <Text style={styles.comingSoonText}>
                        Showing sample data — resident directory coming soon
                    </Text>
                </View>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Header ──────────────────────────────────────────────────────────
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    headerSub: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 2,
    },

    // ── Tab switcher ────────────────────────────────────────────────────
    tabWrap: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 4,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        padding: 3,
    },
    tabPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    tabPillActive: {
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    tabLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
    tabLabelActive: {
        color: SgateColors.t1,
    },
    tabBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: SgateColors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    tabBadgeActive: {
        backgroundColor: SgateColors.gold,
    },
    tabBadgeText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
    },
    tabBadgeTextActive: {
        color: SgateColors.black,
    },

    // ── Search ──────────────────────────────────────────────────────────
    searchWrap: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 42,
        borderWidth: 1.5,
        borderColor: 'transparent',
        gap: 8,
    },
    searchBarFocused: {
        borderColor: SgateColors.gold,
        backgroundColor: SgateColors.card,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        paddingVertical: 0,
    },

    // ── Block filter ────────────────────────────────────────────────────
    blockWrap: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 4,
        gap: 8,
    },
    blockPill: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: SgateColors.surface,
    },
    blockPillActive: {
        backgroundColor: SgateColors.black,
    },
    blockLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
    blockLabelActive: {
        color: '#FFFFFF',
    },

    // ── List ────────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 80,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // ── Notice card ─────────────────────────────────────────────────────
    noticeCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 14,
        marginBottom: 10,
    },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    pinnedText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    noticeRow: {
        flexDirection: 'row',
    },
    noticeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    noticeBody: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginBottom: 4,
    },
    noticeContent: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        lineHeight: 18,
        marginBottom: 8,
    },
    noticeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    noticeTime: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    noticeTypePill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: SgateColors.surface,
    },
    noticeTypeText: {
        fontSize: 10,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
        textTransform: 'uppercase',
    },

    // ── Resident row ────────────────────────────────────────────────────
    residentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    residentBody: {
        flex: 1,
        marginLeft: 12,
    },
    residentName: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    residentFlat: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 10,
    },
    roleText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
    },
    callBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Empty ───────────────────────────────────────────────────────────
    empty: {
        alignItems: 'center',
        gap: 8,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },

    // ── Coming soon banner ──────────────────────────────────────────────
    comingSoonBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: SgateColors.surface,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
    comingSoonText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
});
