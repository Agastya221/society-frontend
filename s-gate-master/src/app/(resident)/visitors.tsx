import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Avatar } from '../../components/ui/Avatar';
import { SgateColors } from '../../constants/Sgate-theme';
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

const TYPE_COLORS: Record<EntryType, string> = {
    VISITOR:        'bg-yellow-100 text-yellow-800 border-yellow-200',
    DELIVERY:       'bg-blue-50 text-blue-700 border-blue-100',
    DOMESTIC_STAFF: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    CAB:            'bg-orange-50 text-orange-700 border-orange-100',
    VENDOR:         'bg-purple-50 text-purple-700 border-purple-100',
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
    const router = useRouter();

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
                return <Text className="text-[11px] font-bold text-gray-400 tracking-widest uppercase px-5 pt-6 pb-2">{item.title}</Text>;
            }

            const e = item.entry;
            const bgClass = TYPE_COLORS[e.type] ?? TYPE_COLORS.VISITOR;
            const isInside = e.status === 'CHECKED_IN';

            return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify()}>
                    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
                        <Avatar name={e.visitorName} size={42} />

                        <View className="flex-1 ml-3">
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className="flex-1 text-[15px] font-semibold text-gray-900 mr-2" numberOfLines={1}>
                                    {e.visitorName}
                                </Text>
                                <Text className="text-xs font-medium text-gray-500">
                                    {timeOnly(e.createdAt)}
                                </Text>
                            </View>

                            <View className="flex-row items-center gap-3">
                                {/* Type pill */}
                                <View className={`px-2 py-[2px] rounded border ${bgClass}`}>
                                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${bgClass.split(' ')[1]}`}>
                                        {TYPE_LABELS[e.type] ?? e.type}
                                    </Text>
                                </View>

                                {/* Status */}
                                <View className="flex-row items-center gap-[4px]">
                                    <View className={`w-1.5 h-1.5 rounded-full ${isInside ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    <Text className={`text-[11px] font-medium ${isInside ? 'text-emerald-600' : 'text-gray-500'}`}>
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
            <View className="py-5 items-center">
                <ActivityIndicator size="small" color="#ca8a04" />
            </View>
        );
    }, [loadingMore]);

    // ── Empty ────────────────────────────────────────────────────────────
    const ListEmpty = useCallback(
        () => (
            <View className="flex-1 justify-center items-center py-24 opacity-70">
                <Ionicons name="shield-checkmark-outline" size={64} className="text-gray-300 mb-4" />
                <Text className="text-lg font-bold text-gray-700">
                    {search ? 'No matches' : 'No visitors yet'}
                </Text>
                <Text className="text-gray-500 text-sm mt-1 text-center px-10 leading-5">
                    {search
                        ? 'Try a different search term or check your spelling'
                        : 'Gate entry records and visitor passes will appear here automatically.'}
                </Text>
            </View>
        ),
        [search],
    );

    // ── Loading state ────────────────────────────────────────────────────
    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50" style={{ paddingTop: insets.top }}>
                <ActivityIndicator size="large" color="#ca8a04" />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View className="flex-1 bg-gray-50">
            {/* ── Header ──────────────────────────────────────────────── */}
            <View 
                className="px-5 flex-row items-center justify-between bg-white border-b border-gray-100"
                style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Visitors</Text>
                </View>
                <Text className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </Text>
            </View>

            {/* ── Search bar ──────────────────────────────────────────── */}
            <View className="px-4 pt-4 pb-2 bg-gray-50">
                <View className={`flex-row items-center bg-white border rounded-xl px-3 h-12 gap-2 shadow-sm ${searchFocused ? 'border-yellow-400' : 'border-gray-100'}`}>
                    <Feather name="search" size={18} color={searchFocused ? '#ca8a04' : '#9ca3af'} />
                    <TextInput
                        className="flex-1 text-[15px] font-medium text-gray-900 h-full py-0"
                        placeholder="Search by name or flat…"
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                            <Feather name="x-circle" size={18} color="#9ca3af" />
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
                    rows.length === 0 ? { flexGrow: 1, paddingBottom: 40 } : { paddingBottom: 40 }
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
