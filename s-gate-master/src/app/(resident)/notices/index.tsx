import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, FlatList, ScrollView, StyleSheet,
    Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../services/api';
import { SgateColors, SgateFonts, SgateRadius } from '../../../constants/Sgate-theme';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'GENERAL' | 'ALERT' | 'EVENT' | 'MAINTENANCE';
    isPinned: boolean;
    createdAt: string;
    expiresAt?: string;
    author?: string;
    location?: string;
    attachment?: string;
}

const TYPE_CFG = {
    ALERT:       { label: 'URGENT ALERT',   bg: '#FFEBEB', text: '#CC3333', border: '#FFCCCC', bar: '#FF5C5C', icon: 'alert-circle' },
    EVENT:       { label: 'UPCOMING EVENT', bg: '#EBF0FF', text: '#3355CC', border: '#CCDDFF', bar: '#4C9AFF', icon: 'calendar'     },
    MAINTENANCE: { label: 'MAINTENANCE',    bg: '#FFF8E1', text: '#CC8800', border: '#FFE799', bar: '#FFB800', icon: 'tool'         },
    GENERAL:     { label: 'GENERAL',        bg: '#F0F0F4', text: '#555566', border: '#E0E0EA', bar: '#8A8D97', icon: 'info'         },
} as const;

const FILTERS = ['ALL', 'ALERT', 'EVENT', 'MAINTENANCE'] as const;

export default function NoticesScreen() {
    const [notices, setNotices]     = useState<Notice[]>([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter]       = useState<string>('ALL');

    const fetchNotices = async () => {
        try {
            const res = await api.get('/community/notices');
            const raw = res.data;
            const list: Notice[] = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                    ? raw.data
                    : [];
            list.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setNotices(list);
        } catch (err) {
            console.error('Failed to fetch notices:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchNotices(); }, []));
    const onRefresh = () => { setRefreshing(true); fetchNotices(); };

    const pinned = notices.filter(n => n.isPinned);
    const recent = notices.filter(n => !n.isPinned && (filter === 'ALL' || n.type === filter));

    const fmtDate = (iso: string) => {
        const d     = new Date(iso);
        const today = new Date();
        if (d.toDateString() === today.toDateString())
            return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const fmtShort = (iso: string) =>
        new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

    const ListHeader = (
        <>
            {/* ── Pinned Notices ─────────────────────────────────────── */}
            {pinned.length > 0 && (
                <View>
                    <View style={S.sectionRow}>
                        <Feather name="bookmark" size={13} color={SgateColors.t3} />
                        <Text style={S.sectionLabel}>PINNED NOTICES</Text>
                    </View>
                    {pinned.map(item => {
                        const cfg = TYPE_CFG[item.type];
                        return (
                            <View key={item.id} style={[S.pinnedCard, { borderLeftColor: cfg.bar }]}>
                                <View style={S.pinnedTop}>
                                    <View style={[S.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                                        <Text style={[S.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                                    </View>
                                    <Text style={S.pinnedDate}>{fmtDate(item.createdAt)}</Text>
                                </View>
                                <Text style={S.pinnedTitle}>{item.title}</Text>
                                <Text style={S.pinnedContent} numberOfLines={3}>{item.content}</Text>
                                {item.author && (
                                    <View style={S.authorRow}>
                                        <View style={S.authorAvatar}>
                                            <Feather name="user" size={9} color={SgateColors.t3} />
                                        </View>
                                        <Text style={S.authorText}>{item.author.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* ── Recent Updates header + filter ─────────────────────── */}
            <View style={S.recentHeaderRow}>
                <Text style={S.sectionLabel}>RECENT UPDATES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
                    {FILTERS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[S.chip, filter === tab && S.chipActive]}
                            onPress={() => setFilter(tab)}
                            activeOpacity={0.7}
                        >
                            <Text style={[S.chipText, filter === tab && S.chipTextActive]}>
                                {tab === 'ALERT' ? 'URGENT' : tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </>
    );

    return (
        <SafeAreaView style={S.root} edges={['top']}>
            {/* ── Page Header ─────────────────────────────────────────── */}
            <View style={S.header}>
                <Text style={S.headerLabel}>RESIDENT HUB</Text>
                <Text style={S.headerTitle}>Newsletter</Text>
                <Text style={S.headerSub}>Stay informed about the latest happenings and security alerts.</Text>
            </View>

            {loading ? (
                <View style={S.center}>
                    <ActivityIndicator size="large" color={SgateColors.gold} />
                </View>
            ) : (
                <FlatList
                    data={recent}
                    keyExtractor={item => item.id}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    contentContainerStyle={S.listContent}
                    ListHeaderComponent={ListHeader}
                    renderItem={({ item }) => {
                        const cfg       = TYPE_CFG[item.type];
                        const isExpired = item.expiresAt ? new Date(item.expiresAt) < new Date() : false;
                        return (
                            <View style={[S.recentCard, isExpired && { opacity: 0.5 }]}>
                                {/* Icon */}
                                <View style={[S.recentIcon, { backgroundColor: cfg.bg }]}>
                                    <Feather name={cfg.icon as any} size={18} color={cfg.text} />
                                </View>

                                {/* Body */}
                                <View style={S.recentBody}>
                                    <Text style={S.recentTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={S.recentContent} numberOfLines={2}>{item.content}</Text>

                                    {/* Meta row */}
                                    <View style={S.metaRow}>
                                        <Feather name="calendar" size={10} color={SgateColors.t4} />
                                        <Text style={S.metaText}>{fmtShort(item.createdAt)}</Text>
                                        {item.location && (
                                            <>
                                                <Feather name="map-pin" size={10} color={SgateColors.t4} style={S.metaGap} />
                                                <Text style={S.metaText}>{item.location.toUpperCase()}</Text>
                                            </>
                                        )}
                                        {item.attachment && (
                                            <TouchableOpacity style={S.viewBtn} activeOpacity={0.7}>
                                                <Text style={S.viewBtnText}>VIEW</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={S.empty}>
                            <Feather name="file-text" size={44} color={SgateColors.t4} />
                            <Text style={S.emptyText}>No notices yet. Check back later.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const S = StyleSheet.create({
    root:   { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        backgroundColor: SgateColors.card,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerLabel: {
        fontSize: 11, fontFamily: SgateFonts.semibold,
        color: SgateColors.gold, letterSpacing: 1.3, marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24, fontFamily: SgateFonts.bold,
        color: SgateColors.t1, marginBottom: 6,
    },
    headerSub: {
        fontSize: 13, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, lineHeight: 20,
    },

    listContent: { paddingBottom: 40 },

    // ── Section labels ────────────────────────────────────────────────────
    sectionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    },
    sectionLabel: {
        fontSize: 11, fontFamily: SgateFonts.bold,
        color: SgateColors.t3, letterSpacing: 1.1,
    },

    // ── Pinned card ────────────────────────────────────────────────────────
    pinnedCard: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 16, marginBottom: 12,
        borderRadius: SgateRadius.sm,
        borderLeftWidth: 4,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    pinnedTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
    badgeText:  { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
    pinnedDate: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    pinnedTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 6, lineHeight: 22 },
    pinnedContent: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 20, marginBottom: 12 },
    authorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    authorAvatar: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    authorText: { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t3, letterSpacing: 0.6 },

    // ── Recent header ────────────────────────────────────────────────────
    recentHeaderRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20, paddingTop: 20, paddingBottom: 12,
    },
    filterRow:      { flexDirection: 'row', gap: 6, paddingRight: 20 },
    chip:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: SgateColors.surface },
    chipActive:     { backgroundColor: SgateColors.t1 },
    chipText:       { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5 },
    chipTextActive: { color: SgateColors.card },

    // ── Recent card ──────────────────────────────────────────────────────
    recentCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: SgateColors.card,
        marginHorizontal: 16, marginBottom: 10,
        borderRadius: SgateRadius.sm,
        padding: 14, gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    recentIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    recentBody: { flex: 1 },
    recentTitle:   { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
    recentContent: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 18, marginBottom: 8 },
    metaRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    metaText:  { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t4, letterSpacing: 0.3 },
    metaGap:   { marginLeft: 4 },
    viewBtn:     { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: SgateColors.border },
    viewBtnText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t2, letterSpacing: 0.5 },

    // ── Empty ─────────────────────────────────────────────────────────────
    empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
});
