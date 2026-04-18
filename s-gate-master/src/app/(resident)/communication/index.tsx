import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// Category config — keys match the full PostCategory enum the backend MUST support
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

// Full filter tab list — backend PostCategory enum MUST contain all of these
const ALL_CATEGORIES = [
  'ALL', 'GENERAL', 'ANNOUNCEMENT', 'QUESTION', 'ISSUE',
  'APPRECIATION', 'HELP', 'EVENT', 'MAINTENANCE', 'LOST_FOUND', 'SAFETY', 'FOR_SALE',
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

interface CommunityPost {
  id: string;
  category: string;
  title: string;
  body: string;
  isPinned: boolean;
  isAnonymous: boolean;
  postedBy: { name: string; flat: string; initials: string };
  timeAgo: string;
  likes: number;
  isLiked: boolean;
  commentCount: number;
}

function normalisePost(raw: any): CommunityPost {
  const author = raw.author ?? raw.postedBy ?? {};
  const name = raw.isAnonymous ? 'Anonymous' : (author.name ?? 'Unknown');
  const initials = name === 'Anonymous' ? 'AN'
    : name.trim().split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
  return {
    id:          raw.id,
    category:    raw.category ?? 'GENERAL',
    title:       raw.title ?? '',
    body:        raw.content ?? raw.body ?? '',
    isPinned:    raw.isPinned ?? false,
    isAnonymous: raw.isAnonymous ?? false,
    postedBy: {
      name:     name,
      flat:     author.flat ?? author.flatNumber ?? '',
      initials: author.initials ?? initials,
    },
    timeAgo:      raw.timeAgo ?? (raw.createdAt ? timeAgo(raw.createdAt) : ''),
    likes:        raw.likes ?? raw.likesCount ?? 0,
    isLiked:      raw.isLiked ?? raw.isLikedByMe ?? false,
    commentCount: raw.commentCount ?? raw.commentsCount ?? (raw.comments?.length ?? 0),
  };
}

// ─── Post Card ─────────────────────────────────────────────────────────────
function PostCard({ item, index, onPress, onLike }: { item: CommunityPost; index: number; onPress: () => void; onLike: () => void }) {
  const cfg = CATEGORY_CFG[item.category] ?? CATEGORY_CFG.GENERAL;
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.cardTopRow}>
          {item.isPinned && <Feather name="bookmark" size={14} color={SgateColors.goldDeep} style={styles.pinIcon} />}
          <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
          <View style={styles.flex1} />
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
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
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="message-circle" size={14} color={SgateColors.t3} />
              <Text style={styles.statText}> {item.commentCount}</Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={onLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="heart" size={14} color={item.isLiked ? SgateColors.red : SgateColors.t3} />
              <Text style={[styles.statText, item.isLiked && styles.likedText]}> {item.likes}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────
export default function CommunicationScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const params: any = {};
      if (activeCategory !== 'ALL') params.category = activeCategory;
      const res = await api.get('/resident/posts', { params });
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw) ? raw : raw?.posts ?? [];
      const normalised = list.map(normalisePost);
      normalised.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      setPosts(normalised);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPosts(); }, [activeCategory]));

  const toggleLike = async (id: string) => {
    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
    try {
      await api.post(`/resident/posts/${id}/like`);
    } catch (err) {
      // Revert on failure
      setPosts(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
            : p,
        ),
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity onPress={() => router.push('/(resident)/communication/create' as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="edit" size={20} color={SgateColors.t1} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {ALL_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            const label = cat === 'ALL' ? 'All' : (CATEGORY_CFG[cat]?.label ?? cat);
            return (
              <TouchableOpacity key={cat}
                style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <PostCard
              item={item}
              index={index}
              onPress={() => router.push(`/(resident)/communication/${item.id}` as any)}
              onLike={() => toggleLike(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-square" size={44} color={SgateColors.t4} />
              <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SgateColors.card },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
  filterContainer: { backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipActive: { backgroundColor: SgateColors.black },
  chipInactive: { backgroundColor: SgateColors.surface },
  chipText: { fontSize: 13, fontFamily: SgateFonts.semibold },
  chipTextActive: { color: SgateColors.card },
  chipTextInactive: { color: SgateColors.t2 },
  list: { flex: 1, backgroundColor: SgateColors.bg },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: { backgroundColor: SgateColors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SgateColors.borderSoft },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pinIcon: { marginRight: 6 },
  categoryBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: { fontSize: 11, fontFamily: SgateFonts.bold },
  flex1: { flex: 1 },
  timeAgo: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },
  cardTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
  cardPreview: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 19 },
  divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginVertical: 10 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: SgateColors.surface, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
  posterName: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, flex: 1, marginLeft: 6 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  likedText: { color: SgateColors.red },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
});
