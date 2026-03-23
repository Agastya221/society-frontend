import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { COMMUNITY_POSTS, CommunityPost, PostCategory } from '../../../mocks/communication';

// ─── Category config ───────────────────────────────────────────────────────────
const CATEGORY_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  GENERAL:     { label: 'General',      bg: SgateColors.blueBg,   fg: SgateColors.blue },
  MAINTENANCE: { label: 'Maintenance',  bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
  EVENTS:      { label: 'Events',       bg: SgateColors.greenBg,  fg: SgateColors.green },
  LOST_FOUND:  { label: 'Lost & Found', bg: '#F3EEFF',            fg: '#9B6DFF' },
  SAFETY:      { label: 'Safety',       bg: SgateColors.redBg,    fg: SgateColors.red },
  FOR_SALE:    { label: 'For Sale',     bg: SgateColors.surface,  fg: SgateColors.t2 },
};

const ALL_CATEGORIES: Array<PostCategory | 'ALL'> = [
  'ALL', 'GENERAL', 'MAINTENANCE', 'EVENTS', 'LOST_FOUND', 'SAFETY', 'FOR_SALE',
];

// ─── Post Card ────────────────────────────────────────────────────────────────
interface PostCardProps {
  item: CommunityPost;
  index: number;
  onPress: () => void;
  onLike: () => void;
}

function PostCard({ item, index, onPress, onLike }: PostCardProps) {
  const cfg = CATEGORY_CFG[item.category];
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {/* Top row */}
        <View style={styles.cardTopRow}>
          {item.isPinned && (
            <Feather name="bookmark" size={14} color={SgateColors.goldDeep} style={styles.pinIcon} />
          )}
          <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
          <View style={styles.flex1} />
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle}>{item.title}</Text>

        {/* Preview */}
        <Text style={styles.cardPreview} numberOfLines={2}>
          {item.body}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom row */}
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
              <Text style={styles.statText}> {item.comments.length}</Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={onLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather
                name="heart"
                size={14}
                color={item.isLiked ? SgateColors.red : SgateColors.t3}
              />
              <Text style={[styles.statText, item.isLiked && styles.likedText]}>
                {' '}{item.likes}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CommunicationScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>(COMMUNITY_POSTS);
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'ALL'>('ALL');

  const filtered = (
    activeCategory === 'ALL' ? posts : posts.filter(p => p.category === activeCategory)
  ).slice().sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  function toggleLike(id: string) {
    setPosts(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity
          onPress={() => router.push('/(resident)/communication/create' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="edit" size={20} color={SgateColors.t1} />
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {ALL_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            const label =
              cat === 'ALL' ? 'All' : CATEGORY_CFG[cat]?.label ?? cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Post list */}
      <FlatList
        data={filtered}
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
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SgateColors.card,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: SgateFonts.bold,
    fontSize: 18,
    color: SgateColors.t1,
    flex: 1,
    marginLeft: 12,
  },

  // Filter
  filterContainer: {
    backgroundColor: SgateColors.card,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: SgateColors.black,
  },
  chipInactive: {
    backgroundColor: SgateColors.surface,
  },
  chipText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
  },
  chipTextActive: {
    color: SgateColors.card,
  },
  chipTextInactive: {
    color: SgateColors.t2,
  },

  // List
  list: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // Card
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinIcon: {
    marginRight: 6,
  },
  categoryBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
  },
  flex1: {
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginBottom: 4,
  },
  cardPreview: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: SgateColors.borderSoft,
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SgateColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t2,
  },
  posterName: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    flex: 1,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  likedText: {
    color: SgateColors.red,
  },
});
