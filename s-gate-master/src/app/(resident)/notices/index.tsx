import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
Animated, Dimensions, FlatList,
    Modal, PanResponder, Pressable, ScrollView, StyleSheet,
    Text, TouchableOpacity, View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
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
    ALERT:       { label: 'Urgent',      bg: '#FFF0F0', text: '#D32F2F', border: '#FFCCCC', bar: '#FF5C5C', icon: 'alert-circle' },
    EVENT:       { label: 'Event',       bg: '#F0F4FF', text: '#1976D2', border: '#CCDDFF', bar: '#4C9AFF', icon: 'calendar'     },
    MAINTENANCE: { label: 'Maintenance', bg: '#FFF8F0', text: '#D97706', border: '#FFE799', bar: '#FFB800', icon: 'tool'         },
    GENERAL:     { label: 'General',     bg: '#F5F5F7', text: '#4B5563', border: '#E0E0EA', bar: '#8A8D97', icon: 'info'         },
} as const;

const FILTERS = ['ALL', 'PINNED', 'ALERT', 'MAINTENANCE', 'EVENT', 'GENERAL'] as const;

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
        id:        raw.id || raw._id || Math.random().toString(),
        title:     raw.title ?? '',
        content:   raw.content ?? raw.description ?? '',
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
            
            // Helpful debug trace to see where data sits if it drops again
            console.log("Notices Response keys:", Object.keys(raw));

            const rawList: any[] = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.data?.notices)
                    ? raw.data.notices
                    : Array.isArray(raw?.notices)
                        ? raw.notices
                        : Array.isArray(raw?.data)
                            ? raw.data
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

    const filteredNotices = notices.filter(n => {
        if (filter === 'ALL') return true;
        if (filter === 'PINNED') return n.isPinned;
        return n.type === filter;
    });

    const fmtDate = (iso: string) => {
        const d     = new Date(iso);
        const today = new Date();
        if (d.toDateString() === today.toDateString())
            return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderNoticeCard = ({ item }: { item: Notice }) => {
        const cfg = TYPE_CFG[item.type];
        
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelected(item)}
                style={S.card}
            >
                <View style={S.cardHeader}>
                    <View style={S.headerLeft}>
                        {item.isPinned && <Feather name="paperclip" size={12} color={SgateColors.t2} style={S.pinIcon} />}
                        <View style={[S.tagBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[S.tagText, { color: cfg.text }]}>{cfg.label}</Text>
                        </View>
                    </View>
                    <Text style={S.cardDate}>{fmtDate(item.createdAt)}</Text>
                </View>
                
                <Text style={S.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={S.cardDescription} numberOfLines={2}>{item.content}</Text>
                
                <View style={S.cardFooter}>
                    <View style={S.authorBox}>
                        <Feather name="user" size={12} color={SgateColors.t3} />
                        <Text style={S.authorText}>{item.author || 'Society Manager'}</Text>
                    </View>
                    <View style={S.readMoreBox}>
                        <Text style={S.readMoreText}>Read more</Text>
                        <Feather name="arrow-right" size={12} color={SgateColors.t3} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={S.root}>
            {/* 1. Header & Filters */}
            <View style={[S.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={S.headerTop}>
                    <TouchableOpacity onPress={() => router.push('/(resident)/home' as any)} style={S.backButton}>
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={S.headerTitle} numberOfLines={1}>Notices</Text>
                        <Text style={S.headerSub} numberOfLines={1}>Society updates &amp; alerts</Text>
                    </View>
                </View>

                <View style={S.filtersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filtersScroll}>
                        {FILTERS.map(tab => {
                            const filterLabel = tab === 'ALL' ? 'All' : tab === 'PINNED' ? 'Pinned' : tab === 'ALERT' ? 'Urgent' : tab === 'EVENT' ? 'Events' : tab === 'MAINTENANCE' ? 'Maintenance' : 'General';
                            const active = filter === tab;
                            return (
                                <TouchableOpacity key={tab} style={[S.chip, active && S.chipActive]} onPress={() => setFilter(tab)} activeOpacity={0.7}>
                                    <Text style={[S.chipText, active && S.chipTextActive]}>{filterLabel}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            {/* Persistent spacer — content never touches header */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filteredNotices}
                    keyExtractor={item => item.id}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    contentContainerStyle={S.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderNoticeCard}
                    ListEmptyComponent={
                        <View style={S.empty}>
                            <View style={S.emptyIconContainer}>
                                <Feather name="bell" size={32} color={SgateColors.t3} />
                            </View>
                            <Text style={S.emptyTitle}>No notices yet</Text>
                            <Text style={S.emptySub}>You’re all caught up. Check back later for updates.</Text>
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

    // Header & Filters
    headerWrapper: { 
        backgroundColor: SgateColors.card, 
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub:   { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    
    filtersContainer: { paddingLeft: 20 },
    filtersScroll: { flexDirection: 'row', gap: 10, paddingRight: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: SgateColors.surface },
    chipActive: { backgroundColor: SgateColors.gold },
    chipText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    chipTextActive: { color: SgateColors.t1, fontFamily: SgateFonts.bold },

    // Lists
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },

    // Notice Card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    pinIcon: { marginRight: 6 },
    tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    tagText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.2 },
    cardDate: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    
    cardTitle: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 6, lineHeight: 22 },
    cardDescription: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, lineHeight: 20, marginBottom: 20 },
    
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
    authorBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    authorText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    readMoreBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    readMoreText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },

    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: SgateColors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, textAlign: 'center', marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },
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
