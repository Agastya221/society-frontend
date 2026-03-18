import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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
import type { Entry, EntryType } from '../../types/api';
import * as gateService from '../../services/gate.service';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TYPE_LABELS: Record<EntryType, string> = {
    VISITOR: 'Guest',
    DELIVERY: 'Delivery',
    DOMESTIC_STAFF: 'Staff',
    CAB: 'Cab',
    VENDOR: 'Vendor',
};

const TYPE_COLORS: Record<EntryType, { bg: string; fg: string }> = {
    VISITOR:        { bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    DELIVERY:       { bg: '#E8F0FE',           fg: '#3B82F6' },
    DOMESTIC_STAFF: { bg: SgateColors.greenBg,  fg: SgateColors.green },
    CAB:            { bg: '#FFF3E0',            fg: '#F57C00' },
    VENDOR:         { bg: '#F3E5F5',            fg: '#8E24AA' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Section types ───────────────────────────────────────────────────────────

type SectionHeader = { kind: 'header'; title: string };
type SectionItem = { kind: 'item'; entry: Entry };
type ListRow = SectionHeader | SectionItem;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitorsScreen() {
    const insets = useSafeAreaInsets();

    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);

    // ── Fetch page ───────────────────────────────────────────────────────
    const fetchPage = useCallback(async (page: number, replace: boolean) => {
        try {
            const data = await gateService.getEntries({ page, limit: PAGE_SIZE });
            if (replace) {
                setEntries(data);
            } else {
                setEntries((prev) => [...prev, ...data]);
            }
            hasMoreRef.current = data.length === PAGE_SIZE;
        } catch (err) {
            console.error('fetchEntries failed:', err);
        }
    }, []);

    // ── Initial load ─────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            await fetchPage(1, true);
            setLoading(false);
        })();
    }, [fetchPage]);

    // ── Pull-to-refresh ──────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        pageRef.current = 1;
        hasMoreRef.current = true;
        await fetchPage(1, true);
        setRefreshing(false);
    }, [fetchPage]);

    // ── Load more ────────────────────────────────────────────────────────
    const onEndReached = useCallback(async () => {
        if (loadingMore || !hasMoreRef.current || search) return;
        setLoadingMore(true);
        const next = pageRef.current + 1;
        await fetchPage(next, false);
        pageRef.current = next;
        setLoadingMore(false);
    }, [loadingMore, search, fetchPage]);

    // ── Filter + group ───────────────────────────────────────────────────
    const rows = useMemo<ListRow[]>(() => {
        const q = search.toLowerCase().trim();
        const filtered = q
            ? entries.filter(
                  (e) =>
                      e.visitorName.toLowerCase().includes(q) ||
                      (e.flat?.number ?? '').toLowerCase().includes(q),
              )
            : entries;

        const result: ListRow[] = [];
        let lastDate = '';

        for (const entry of filtered) {
            const dl = dateLabel(entry.createdAt);
            if (dl !== lastDate) {
                lastDate = dl;
                result.push({ kind: 'header', title: dl });
            }
            result.push({ kind: 'item', entry });
        }
        return result;
    }, [entries, search]);

    // ── Key extractor ────────────────────────────────────────────────────
    const keyExtractor = useCallback(
        (row: ListRow, index: number) =>
            row.kind === 'header' ? `hdr-${row.title}-${index}` : row.entry.id,
        [],
    );

    // ── Render item ──────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item, index }: { item: ListRow; index: number }) => {
            if (item.kind === 'header') {
                return <Text style={styles.sectionTitle}>{item.title}</Text>;
            }

            const e = item.entry;
            const typeColor = TYPE_COLORS[e.type] ?? TYPE_COLORS.VISITOR;
            const isInside = e.status === 'CHECKED_IN';

            return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify()}>
                    <View style={styles.row}>
                        <SgateAvatar name={e.visitorName} size={42} />

                        <View style={styles.rowBody}>
                            <View style={styles.rowTop}>
                                <Text style={styles.rowName} numberOfLines={1}>
                                    {e.visitorName}
                                </Text>
                                <Text style={styles.rowTime}>
                                    {timeOnly(e.createdAt)}
                                </Text>
                            </View>

                            <View style={styles.rowBottom}>
                                {/* Type pill */}
                                <View
                                    style={[
                                        styles.typePill,
                                        { backgroundColor: typeColor.bg },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.typePillText,
                                            { color: typeColor.fg },
                                        ]}
                                    >
                                        {TYPE_LABELS[e.type] ?? e.type}
                                    </Text>
                                </View>

                                {/* Status */}
                                <View style={styles.statusWrap}>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            {
                                                backgroundColor: isInside
                                                    ? SgateColors.green
                                                    : SgateColors.t3,
                                            },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.statusText,
                                            {
                                                color: isInside
                                                    ? SgateColors.green
                                                    : SgateColors.t3,
                                            },
                                        ]}
                                    >
                                        {isInside ? 'Inside' : 'Left'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            );
        },
        [],
    );

    // ── Footer ───────────────────────────────────────────────────────────
    const ListFooter = useMemo(() => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={SgateColors.gold} />
            </View>
        );
    }, [loadingMore]);

    // ── Empty ────────────────────────────────────────────────────────────
    const ListEmpty = useCallback(
        () => (
            <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                    <Feather name="user-check" size={32} color={SgateColors.t3} />
                </View>
                <Text style={styles.emptyTitle}>
                    {search ? 'No matches' : 'No visitors yet'}
                </Text>
                <Text style={styles.emptySub}>
                    {search
                        ? 'Try a different search term'
                        : 'Visitor entries will appear here'}
                </Text>
            </View>
        ),
        [search],
    );

    // ── Loading state ────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={SgateColors.gold} />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Visitors</Text>
                <Text style={styles.headerCount}>
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </Text>
            </View>

            {/* ── Search bar ──────────────────────────────────────────── */}
            <View style={styles.searchWrap}>
                <View
                    style={[
                        styles.searchBar,
                        searchFocused && styles.searchBarFocused,
                    ]}
                >
                    <Feather
                        name="search"
                        size={16}
                        color={searchFocused ? SgateColors.gold : SgateColors.t3}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or flat…"
                        placeholderTextColor={SgateColors.t4}
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearch('')}
                            hitSlop={8}
                        >
                            <Feather name="x" size={16} color={SgateColors.t3} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── List ────────────────────────────────────────────────── */}
            <FlatList
                data={rows}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={ListEmpty}
                ListFooterComponent={ListFooter}
                contentContainerStyle={
                    rows.length === 0 ? styles.emptyContainer : styles.listContent
                }
                refreshing={refreshing}
                onRefresh={onRefresh}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.3}
                showsVerticalScrollIndicator={false}
            />
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
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    headerCount: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },

    // ── Search ──────────────────────────────────────────────────────────
    searchWrap: {
        paddingHorizontal: 20,
        paddingTop: 12,
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

    // ── List ────────────────────────────────────────────────────────────
    listContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // ── Section header ──────────────────────────────────────────────────
    sectionTitle: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 6,
    },

    // ── Row ─────────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    rowBody: {
        flex: 1,
        marginLeft: 12,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    rowName: {
        flex: 1,
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginRight: 8,
    },
    rowTime: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    rowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    // ── Type pill ───────────────────────────────────────────────────────
    typePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typePillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },

    // ── Status ──────────────────────────────────────────────────────────
    statusWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
    },

    // ── Footer ──────────────────────────────────────────────────────────
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
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
});
