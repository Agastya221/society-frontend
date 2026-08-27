import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeBottomSheetSurface } from '@/components/ui/SafeBottomSheetSurface';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CommunityPost {
    id: string;
    category: string;
    title: string;
    body: string;
    isPinned: boolean;
    isAnonymous: boolean;
    postedBy: { name: string; flat?: string; initials: string };
    timeAgo: string;
    likes: number;
    commentCount: number;
    createdAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORY_CFG: Record<string, { label: string; bg: string; fg: string }> = {
    GENERAL:      { label: 'General',      bg: SgateColors.blueBg,   fg: SgateColors.blue },
    ANNOUNCEMENT: { label: 'Announcement', bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    QUESTION:     { label: 'Question',     bg: SgateColors.blueBg,   fg: SgateColors.blue },
    ISSUE:        { label: 'Issue',        bg: SgateColors.redBg,    fg: SgateColors.red },
    APPRECIATION: { label: 'Appreciation', bg: SgateColors.greenBg,  fg: SgateColors.green },
    HELP:         { label: 'Help',         bg: '#FFF8E1',            fg: '#E5A500' },
    EVENT:        { label: 'Event',        bg: SgateColors.greenBg,  fg: SgateColors.green },
    MAINTENANCE:  { label: 'Maintenance',  bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    LOST_FOUND:   { label: 'Lost & Found', bg: '#F3EEFF',            fg: '#9B6DFF' },
    SAFETY:       { label: 'Safety',       bg: SgateColors.redBg,    fg: SgateColors.red },
    FOR_SALE:     { label: 'For Sale',     bg: SgateColors.surface,  fg: SgateColors.t2 },
};

const ALL_CATEGORIES = [
    'ALL', 'GENERAL', 'ANNOUNCEMENT', 'QUESTION', 'ISSUE',
    'APPRECIATION', 'HELP', 'EVENT', 'MAINTENANCE', 'LOST_FOUND', 'SAFETY', 'FOR_SALE',
] as const;

const POST_CATEGORIES = [
    'GENERAL', 'ANNOUNCEMENT', 'EVENT', 'MAINTENANCE', 'SAFETY',
] as const;

function timeCalc(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`;
}

function normalisePost(raw: any): CommunityPost {
    const author = raw.author ?? raw.postedBy ?? {};
    const name = raw.isAnonymous ? 'Anonymous' : (author.name ?? 'Unknown');
    const initials = name === 'Anonymous' ? 'AN'
        : name.trim().split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
    return {
        id: raw.id,
        category: raw.category ?? 'GENERAL',
        title: raw.title ?? '',
        body: raw.content ?? raw.body ?? '',
        isPinned: raw.isPinned ?? false,
        isAnonymous: raw.isAnonymous ?? false,
        postedBy: { name, flat: author.flat ?? author.flatNumber ?? '', initials },
        timeAgo: raw.timeAgo ?? (raw.createdAt ? timeCalc(raw.createdAt) : ''),
        likes: raw.likes ?? raw.likesCount ?? 0,
        commentCount: raw.commentCount ?? raw.commentsCount ?? 0,
        createdAt: raw.createdAt ?? '',
    };
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminCommunityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [posts, setPosts]               = useState<CommunityPost[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [menuTarget, setMenuTarget]     = useState<CommunityPost | null>(null);

    // Create post form
    const [createVisible, setCreateVisible] = useState(false);
    const [createTitle, setCreateTitle]     = useState('');
    const [createBody, setCreateBody]       = useState('');
    const [createCategory, setCreateCategory] = useState<string>('ANNOUNCEMENT');
    const [submitting, setSubmitting]       = useState(false);

    const fetchPosts = async (silent = false) => {
        try {
            const params: any = {};
            if (activeCategory !== 'ALL') params.category = activeCategory;
            const res = await api.get('/resident/posts', { params });
            const raw = res.data?.data ?? res.data;
            const list: any[] = Array.isArray(raw) ? raw : (raw?.posts ?? []);
            const normalised = list.map(normalisePost);
            normalised.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
            setPosts(normalised);
        } catch (err) {
            console.error('Failed to fetch community posts:', err);
            setPosts([]);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { setLoading(true); fetchPosts(); }, [activeCategory]));
    const onRefresh = () => { setRefreshing(true); fetchPosts(true); };

    const handlePin = async (post: CommunityPost) => {
        setMenuTarget(null);
        const prevPinned = post.isPinned;
        setPosts((prev) =>
            prev.map((p) => (p.id === post.id ? { ...p, isPinned: !p.isPinned } : p))
        );
        try {
            await api.patch(`/resident/posts/${post.id}/pin`, { isPinned: !prevPinned });
        } catch {
            setPosts((prev) =>
                prev.map((p) => (p.id === post.id ? { ...p, isPinned: prevPinned } : p))
            );
            AppAlert.show('Error', 'Failed to update pin status');
        }
    };

    const handleDelete = (post: CommunityPost) => {
        setMenuTarget(null);
        AppAlert.show(
            'Delete Post',
            `Delete "${post.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        setPosts((prev) => prev.filter((p) => p.id !== post.id));
                        try {
                            await api.delete(`/resident/posts/${post.id}`);
                        } catch {
                            fetchPosts(true);
                            AppAlert.show('Error', 'Failed to delete post');
                        }
                    },
                },
            ]
        );
    };

    const handleCreate = async () => {
        if (!createTitle.trim() || !createBody.trim()) {
            AppAlert.show('Error', 'Title and content are required');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/resident/posts', {
                title: createTitle.trim(),
                content: createBody.trim(),
                category: createCategory,
                isPinned: createCategory === 'ANNOUNCEMENT',
            });
            setCreateVisible(false);
            setCreateTitle('');
            setCreateBody('');
            setCreateCategory('ANNOUNCEMENT');
            fetchPosts(true);
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to post');
        } finally {
            setSubmitting(false);
        }
    };

    const renderItem = ({ item, index }: { item: CommunityPost; index: number }) => {
        const cfg = CATEGORY_CFG[item.category] ?? CATEGORY_CFG.GENERAL;
        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <View style={styles.card}>
                    <View style={styles.cardTopRow}>
                        {item.isPinned && (
                            <MaterialCommunityIcons name="bookmark-outline" size={14} color={SgateColors.goldDeep} style={{ marginRight: 4 }} />
                        )}
                        <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.categoryBadgeText, { color: cfg.fg }]}>{cfg.label}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
                        <TouchableOpacity
                            onPress={() => setMenuTarget(item)}
                            hitSlop={8}
                            style={styles.menuBtn}
                        >
                            <MaterialCommunityIcons name="dots-vertical" size={16} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardPreview} numberOfLines={2}>{item.body}</Text>

                    <View style={styles.divider} />
                    <View style={styles.cardBottomRow}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitials}>{item.postedBy.initials}</Text>
                        </View>
                        <Text style={styles.posterName} numberOfLines={1}>
                            {item.isAnonymous ? 'Anonymous' : item.postedBy.name}
                            {item.postedBy.flat ? ` · ${item.postedBy.flat}` : ''}
                        </Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="message-outline" size={13} color={SgateColors.t3} />
                                <Text style={styles.statText}> {item.commentCount}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="heart-outline" size={13} color={SgateColors.t3} />
                                <Text style={styles.statText}> {item.likes}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.root}>
            {/* ── Header (matches Emergency Alerts) ─────────────────────── */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Community</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Posts, discussions & announcements</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setCreateVisible(true)}
                        style={styles.createBtn}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={SgateColors.t1} />
                    </TouchableOpacity>
                </View>
                {/* Category filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {ALL_CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        const label = cat === 'ALL' ? 'All' : (CATEGORY_CFG[cat]?.label ?? cat);
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.filterTab, isActive && styles.filterTabActive]}
                                onPress={() => setActiveCategory(cat)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="message-outline" size={44} color={SgateColors.t4} />
                            <Text style={styles.emptyText}>No posts yet</Text>
                        </View>
                    }
                />
            )}

            {/* 3-dot action menu */}
            <Modal
                visible={!!menuTarget}
                transparent
                animationType="fade"
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => setMenuTarget(null)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuTarget(null)}
                >
                    <SafeBottomSheetSurface style={styles.menuSheet} showHandle minimumBottomPadding={20}>
                        <Text style={styles.menuPostTitle} numberOfLines={1}>
                            {menuTarget?.title}
                        </Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => menuTarget && handlePin(menuTarget)}
                        >
                            <MaterialCommunityIcons
                                name="bookmark-outline"
                                size={18}
                                color={menuTarget?.isPinned ? SgateColors.goldDeep : SgateColors.t2}
                            />
                            <Text style={styles.menuItemText}>
                                {menuTarget?.isPinned ? 'Unpin Post' : 'Pin Post'}
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => menuTarget && handleDelete(menuTarget)}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={SgateColors.red} />
                            <Text style={[styles.menuItemText, { color: SgateColors.red }]}>Delete Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.menuItem, { marginTop: 4 }]} onPress={() => setMenuTarget(null)}>
                            <Text style={[styles.menuItemText, { color: SgateColors.t3, textAlign: 'center', flex: 1 }]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </SafeBottomSheetSurface>
                </TouchableOpacity>
            </Modal>

            {/* Create post modal */}
            <Modal
                visible={createVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setCreateVisible(false)}
            >
                <View style={styles.createModalWrap}>
                    <View style={styles.createModalHeader}>
                        <Text style={styles.createModalTitle}>New Announcement</Text>
                        <TouchableOpacity onPress={() => setCreateVisible(false)}>
                            <MaterialCommunityIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formLabel}>TITLE *</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="Post title"
                            value={createTitle}
                            onChangeText={setCreateTitle}
                            placeholderTextColor={SgateColors.t4}
                        />
                        <Text style={styles.formLabel}>CONTENT *</Text>
                        <TextInput
                            style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}
                            multiline
                            placeholder="What do you want to share?"
                            value={createBody}
                            onChangeText={setCreateBody}
                            placeholderTextColor={SgateColors.t4}
                        />
                        <Text style={styles.formLabel}>CATEGORY</Text>
                        <View style={styles.chipRow}>
                            {POST_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setCreateCategory(cat)}
                                    style={[styles.chip, createCategory === cat ? styles.chipActive : styles.chipInactive]}
                                >
                                    <Text style={[styles.chipText, createCategory === cat ? styles.chipTextActive : styles.chipTextInactive]}>
                                        {CATEGORY_CFG[cat]?.label ?? cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={handleCreate}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Post to Community</Text>
                            )}
                        </TouchableOpacity>
                        <View style={{ height: 24 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header (matches Emergency Alerts)
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
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },

    filterRow: { paddingHorizontal: 20, gap: 8 },
    filterTab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, backgroundColor: SgateColors.bg },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16, padding: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    categoryBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    categoryBadgeText: { fontSize: 11, fontFamily: SgateFonts.bold },
    timeAgo: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginRight: 4 },
    menuBtn: { padding: 2 },
    cardTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
    cardPreview: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 19 },
    divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 10 },
    cardBottomRow: { flexDirection: 'row', alignItems: 'center' },
    avatarCircle: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: SgateColors.surface,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitials: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    posterName: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, flex: 1, marginLeft: 6 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

    // 3-dot menu
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    menuSheet: {
        paddingHorizontal: 20,
    },
    menuPostTitle: {
        fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3,
        marginBottom: 16,
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    menuItemText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    menuDivider: { height: 1, backgroundColor: SgateColors.borderSoft },

    // Create modal
    createModalWrap: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    createModalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 24,
    },
    createModalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8, marginTop: 4 },
    formInput: {
        backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 16, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium,
        color: SgateColors.t1, marginBottom: 14,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chip: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    chipActive: { backgroundColor: SgateColors.goldPale, borderColor: SgateColors.gold },
    chipInactive: { backgroundColor: SgateColors.card, borderColor: SgateColors.border },
    chipText: { fontSize: 13, fontFamily: SgateFonts.semibold },
    chipTextActive: { color: SgateColors.t1 },
    chipTextInactive: { color: SgateColors.t2 },
    submitBtn: {
        backgroundColor: SgateColors.gold, borderRadius: 16,
        paddingVertical: 17, alignItems: 'center',
    },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
