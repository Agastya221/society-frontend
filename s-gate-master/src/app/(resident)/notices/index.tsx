import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList,
    Modal, PanResponder, Pressable, ScrollView, StyleSheet,
    Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../services/api';
import { SgateColors, SgateFonts, SgateRadius } from '../../../constants/Sgate-theme';

const { height: SH } = Dimensions.get('window');

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
}

const TYPE_CFG = {
    ALERT:       { label: 'URGENT ALERT',   bg: '#FFEBEB', text: '#CC3333', border: '#FFCCCC', bar: '#FF5C5C', icon: 'alert-circle' },
    EVENT:       { label: 'UPCOMING EVENT', bg: '#EBF0FF', text: '#3355CC', border: '#CCDDFF', bar: '#4C9AFF', icon: 'calendar'     },
    MAINTENANCE: { label: 'MAINTENANCE',    bg: '#FFF8E1', text: '#CC8800', border: '#FFE799', bar: '#FFB800', icon: 'tool'         },
    GENERAL:     { label: 'GENERAL',        bg: '#F0F0F4', text: '#555566', border: '#E0E0EA', bar: '#8A8D97', icon: 'info'         },
} as const;

const FILTERS = ['ALL', 'ALERT', 'EVENT', 'MAINTENANCE'] as const;

// Maps every value the backend might send → one of the 4 UI types
const TYPE_MAP: Record<string, 'ALERT' | 'EVENT' | 'MAINTENANCE' | 'GENERAL'> = {
    ALERT:       'ALERT',
    URGENT:      'ALERT',
    EMERGENCY:   'ALERT',
    CRITICAL:    'ALERT',
    EVENT:       'EVENT',
    MAINTENANCE: 'MAINTENANCE',
    MEETING:     'GENERAL',
    GENERAL:     'GENERAL',
};

function normaliseNotice(raw: any): Notice {
    return {
        id:        raw.id,
        title:     raw.title ?? '',
        content:   raw.content ?? '',
        type:      TYPE_MAP[raw.type] ?? 'GENERAL',
        isPinned:  raw.isPinned ?? false,
        createdAt: raw.publishAt ?? raw.createdAt ?? new Date().toISOString(),
        expiresAt: raw.expiresAt ?? undefined,
        // backend returns `postedBy` as a plain string — expose as `author`
        author:    raw.author ?? raw.postedBy ?? undefined,
        location:  raw.location ?? undefined,
    };
}

// ── Notice Detail Bottom Sheet ─────────────────────────────────────────────
function NoticeDetailSheet({ notice, onClose }: { notice: Notice; onClose: () => void }) {
    const insets = useSafeAreaInsets();
    const cfg = TYPE_CFG[notice.type];

    const sheetY    = useRef(new Animated.Value(SH)).current;
    const backdropO = useRef(new Animated.Value(0)).current;
    const scrollY   = useRef(0);

    useCallback(() => {
        Animated.parallel([
            Animated.spring(sheetY, { toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true }),
            Animated.timing(backdropO, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
    }, [])();

    const close = () => {
        Animated.parallel([
            Animated.timing(sheetY, { toValue: SH, duration: 260, useNativeDriver: true }),
            Animated.timing(backdropO, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && gs.vy > 0 && scrollY.current <= 0,
        onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 12 && gs.vy > 0 && scrollY.current <= 0,
        onPanResponderMove: (_, gs) => { if (gs.dy > 0) sheetY.setValue(gs.dy); },
        onPanResponderRelease: (_, gs) => {
            if (gs.dy > 100 || gs.vy > 0.6) {
                close();
            } else {
                Animated.spring(sheetY, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
            }
        },
    })).current;

    const fmtFull = (iso: string) =>
        new Date(iso).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
            <Animated.View style={[M.backdrop, { opacity: backdropO }]}>
                <Pressable style={{ flex: 1 }} onPress={close} />
            </Animated.View>

            <Animated.View
                style={[M.sheet, { transform: [{ translateY: sheetY }], paddingBottom: insets.bottom + 16 }]}
                {...panResponder.panHandlers}
            >
                <View style={[M.typeBanner, { backgroundColor: cfg.bg, borderBottomColor: cfg.border }]}>
                    <View style={M.handleInBanner} />
                    <View style={M.bannerRow}>
                        <View style={[M.typeIconBox, { backgroundColor: cfg.bar }]}>
                            <Feather name={cfg.icon as any} size={16} color="#fff" />
                        </View>
                        <Text style={[M.typeLabel, { color: cfg.text }]}>{cfg.label}</Text>
                        {notice.isPinned && (
                            <View style={M.pinnedBadge}>
                                <Feather name="bookmark" size={11} color={SgateColors.gold} />
                                <Text style={M.pinnedBadgeText}>PINNED</Text>
                            </View>
                        )}
                    </View>
                </View>

                <ScrollView
                    style={M.scroll}
                    contentContainerStyle={M.scrollContent}
                    showsVerticalScrollIndicator={false}
                    onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                >
                    <Text style={M.title}>{notice.title}</Text>

                    <View style={M.metaRow}>
                        <View style={M.metaChip}>
                            <Feather name="calendar" size={11} color={SgateColors.t3} />
                            <Text style={M.metaChipText}>{fmtFull(notice.createdAt)}</Text>
                        </View>
                        {notice.location && (
                            <View style={M.metaChip}>
                                <Feather name="map-pin" size={11} color={SgateColors.t3} />
                                <Text style={M.metaChipText}>{notice.location}</Text>
                            </View>
                        )}
                        {notice.author && (
                            <View style={M.metaChip}>
                                <Feather name="user" size={11} color={SgateColors.t3} />
                                <Text style={M.metaChipText}>{notice.author}</Text>
                            </View>
                        )}
                    </View>

                    <View style={M.divider} />
                    <Text style={M.body}>{notice.content}</Text>

                    {notice.expiresAt && (
                        <View style={M.expiryRow}>
                            <Feather name="clock" size={12} color={SgateColors.t4} />
                            <Text style={M.expiryText}>
                                Expires {new Date(notice.expiresAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

export default function NoticesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notices, setNotices]       = useState<Notice[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter]         = useState<string>('ALL');
    const [selected, setSelected]     = useState<Notice | null>(null);

    const fetchNotices = async () => {
        try {
            const res = await api.get('/community/notices');
            const raw = res.data;
            const rawList: any[] = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data)
                    ? raw.data
                    : Array.isArray(raw?.notices)
                        ? raw.notices
                        : [];

            const list: Notice[] = rawList.map(normaliseNotice);
            list.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setNotices(list);
        } catch (err) {
            console.error('Failed to fetch notices:', err);
            setNotices([]);
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
            {pinned.length > 0 && (
                <View>
                    <View style={S.sectionRow}>
                        <Feather name="bookmark" size={13} color={SgateColors.t3} />
                        <Text style={S.sectionLabel}>PINNED NOTICES</Text>
                    </View>
                    {pinned.map(item => {
                        const cfg = TYPE_CFG[item.type];
                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.75}
                                onPress={() => setSelected(item)}
                                style={[S.pinnedCard, { borderLeftColor: cfg.bar }]}
                            >
                                <View style={S.pinnedTop}>
                                    <View style={[S.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                                        <Text style={[S.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                                    </View>
                                    <Text style={S.pinnedDate}>{fmtDate(item.createdAt)}</Text>
                                </View>
                                <Text style={S.pinnedTitle}>{item.title}</Text>
                                <Text style={S.pinnedContent} numberOfLines={2}>{item.content}</Text>
                                <View style={S.pinnedFooter}>
                                    {item.author && (
                                        <View style={S.authorRow}>
                                            <View style={S.authorAvatar}>
                                                <Feather name="user" size={9} color={SgateColors.t3} />
                                            </View>
                                            <Text style={S.authorText}>{item.author.toUpperCase()}</Text>
                                        </View>
                                    )}
                                    <View style={S.readMore}>
                                        <Text style={S.readMoreText}>Read more</Text>
                                        <Feather name="chevron-right" size={11} color={SgateColors.gold} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

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
        <View style={S.root}>
            {/* ── Header ─ matches Society screen layout ────────────── */}
            <View style={[S.header, { paddingTop: insets.top + 16, paddingBottom: 14 }]}>
                <TouchableOpacity
                    onPress={() => router.push('/(resident)/home' as any)}
                    style={S.backButton}
                    accessibilityLabel="Go back to Home"
                >
                    <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={S.headerTitle} numberOfLines={1}>Notices</Text>
                    <Text style={S.headerSub} numberOfLines={1}>Society updates &amp; alerts</Text>
                </View>
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
                            <TouchableOpacity
                                activeOpacity={0.75}
                                onPress={() => setSelected(item)}
                                style={[S.recentCard, isExpired && { opacity: 0.5 }]}
                            >
                                <View style={[S.recentAccent, { backgroundColor: cfg.bar }]} />
                                <View style={[S.recentIcon, { backgroundColor: cfg.bg }]}>
                                    <Feather name={cfg.icon as any} size={18} color={cfg.text} />
                                </View>
                                <View style={S.recentBody}>
                                    <Text style={S.recentTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={S.recentContent} numberOfLines={2}>{item.content}</Text>
                                    <View style={S.metaRow}>
                                        <Feather name="calendar" size={10} color={SgateColors.t4} />
                                        <Text style={S.metaText}>{fmtShort(item.createdAt)}</Text>
                                        {item.location && (
                                            <>
                                                <Feather name="map-pin" size={10} color={SgateColors.t4} style={S.metaGap} />
                                                <Text style={S.metaText}>{item.location.toUpperCase()}</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                                <Feather name="chevron-right" size={16} color={SgateColors.t4} style={S.chevron} />
                            </TouchableOpacity>
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

            {selected && (
                <NoticeDetailSheet
                    notice={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </View>
    );
}

// ── List Screen Styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
    root:   { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    headerSub:   { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    listContent: { paddingBottom: 40 },

    sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
    sectionLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 1.1 },

    pinnedCard: {
        backgroundColor: SgateColors.card,
        marginHorizontal: 16, marginBottom: 12,
        borderRadius: SgateRadius.sm, borderLeftWidth: 4,
        padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
    },
    pinnedTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
    badgeText:    { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
    pinnedDate:   { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    pinnedTitle:  { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 6, lineHeight: 22 },
    pinnedContent:{ fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 20, marginBottom: 12 },
    pinnedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    authorRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    authorAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center' },
    authorText:   { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t3, letterSpacing: 0.6 },
    readMore:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
    readMoreText: { fontSize: 11, fontFamily: SgateFonts.semibold, color: SgateColors.gold },

    recentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingTop: 20, paddingBottom: 12 },
    filterRow:       { flexDirection: 'row', gap: 6, paddingRight: 20 },
    chip:            { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: SgateColors.surface },
    chipActive:      { backgroundColor: SgateColors.t1 },
    chipText:        { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5 },
    chipTextActive:  { color: SgateColors.card },

    recentCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.card,
        marginHorizontal: 16, marginBottom: 10,
        borderRadius: SgateRadius.sm,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    recentAccent: { width: 3, alignSelf: 'stretch' },
    recentIcon:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 },
    recentBody:   { flex: 1, paddingVertical: 14, paddingLeft: 12, paddingRight: 4 },
    recentTitle:  { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 3 },
    recentContent:{ fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 18, marginBottom: 7 },
    metaRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
    metaText:     { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t4, letterSpacing: 0.3 },
    metaGap:      { marginLeft: 4 },
    chevron:      { paddingRight: 12 },

    empty:     { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
});

// ── Detail Sheet Styles ────────────────────────────────────────────────────
const M = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: SH * 0.88,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12, shadowRadius: 20, elevation: 24,
    },
    typeBanner: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderBottomWidth: 1,
        paddingBottom: 14, overflow: 'hidden',
    },
    handleInBanner: {
        width: 38, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.15)',
        alignSelf: 'center', marginTop: 10, marginBottom: 10,
    },
    bannerRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, gap: 10,
    },
    typeIconBox: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    typeLabel: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.8, flex: 1 },
    pinnedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20, backgroundColor: '#FFF8E1',
        borderWidth: 1, borderColor: '#FFE799',
    },
    pinnedBadgeText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.gold, letterSpacing: 0.5 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

    title: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, lineHeight: 28, marginBottom: 16 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, backgroundColor: SgateColors.surface,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    metaChipText: { fontSize: 11, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginBottom: 20 },

    body: { fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 26 },

    expiryRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 20, padding: 12, borderRadius: SgateRadius.sm,
        backgroundColor: SgateColors.surface,
    },
    expiryText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
});
