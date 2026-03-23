import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { COMMUNITY_POSTS, CommunityPost, CommunityComment } from '../../../mocks/communication';

// ─── Category config ───────────────────────────────────────────────────────────
const CATEGORY_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  GENERAL:     { label: 'General',      bg: SgateColors.blueBg,   fg: SgateColors.blue },
  MAINTENANCE: { label: 'Maintenance',  bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
  EVENTS:      { label: 'Events',       bg: SgateColors.greenBg,  fg: SgateColors.green },
  LOST_FOUND:  { label: 'Lost & Found', bg: '#F3EEFF',            fg: '#9B6DFF' },
  SAFETY:      { label: 'Safety',       bg: SgateColors.redBg,    fg: SgateColors.red },
  FOR_SALE:    { label: 'For Sale',     bg: SgateColors.surface,  fg: SgateColors.t2 },
};

// ─── Role badge config ────────────────────────────────────────────────────────
type CommentRole = 'RESIDENT' | 'ADMIN' | 'COMMITTEE';

const ROLE_CFG: Record<CommentRole, { label: string; bg: string; fg: string }> = {
  RESIDENT:  { label: 'Resident',  bg: SgateColors.surface,  fg: SgateColors.t2 },
  ADMIN:     { label: 'Admin',     bg: SgateColors.redBg,    fg: SgateColors.red },
  COMMITTEE: { label: 'Committee', bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
};

// ─── Post Header (ListHeaderComponent) ───────────────────────────────────────
interface PostHeaderProps {
  post: CommunityPost;
}

function PostHeader({ post }: PostHeaderProps) {
  const cfg = CATEGORY_CFG[post.category];
  return (
    <View style={styles.postHeader}>
      {/* Category + pin */}
      <View style={styles.postTopRow}>
        {post.isPinned && (
          <Feather name="bookmark" size={14} color={SgateColors.goldDeep} style={styles.pinIcon} />
        )}
        <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.categoryBadgeText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.postTitle}>{post.title}</Text>

      {/* Meta row */}
      <View style={styles.postMetaRow}>
        <View style={styles.avatarCircle32}>
          <Text style={styles.avatarInitials32}>{post.postedBy.initials}</Text>
        </View>
        <Text style={styles.postedByText} numberOfLines={1}>
          Posted by {post.isAnonymous ? 'Anonymous' : post.postedBy.name}
        </Text>
        <View style={styles.flex1} />
        <Text style={styles.timeAgoText}>{post.timeAgo}</Text>
      </View>

      {/* Body */}
      <Text style={styles.postBody}>{post.body}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Feather name="message-circle" size={14} color={SgateColors.t3} />
        <Text style={styles.statsText}> {post.comments.length} Comments</Text>
        <View style={styles.flex1} />
        <Feather
          name="heart"
          size={14}
          color={post.isLiked ? SgateColors.red : SgateColors.t3}
        />
        <Text style={[styles.statsText, post.isLiked && styles.likedText]}>
          {' '}{post.likes}
        </Text>
      </View>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ count }: { count: number }) {
  return (
    <Text style={styles.sectionHeader}>{count} Comments</Text>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: CommunityComment }) {
  const role = comment.role as CommentRole;
  const roleCfg = ROLE_CFG[role] ?? ROLE_CFG.RESIDENT;
  const isAdmin = role === 'ADMIN';

  return (
    <View style={[styles.commentItem, isAdmin && styles.commentItemAdmin]}>
      <View style={styles.commentRow}>
        {/* Avatar */}
        <View style={[styles.commentAvatar, { backgroundColor: roleCfg.bg }]}>
          <Text style={[styles.commentAvatarText, { color: roleCfg.fg }]}>
            {comment.initials}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.commentContent}>
          <View style={styles.commentNameRow}>
            <Text style={styles.commentAuthor}>{comment.author}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleCfg.fg }]}>{roleCfg.label}</Text>
            </View>
            <View style={styles.flex1} />
            <Text style={styles.commentTimeAgo}>{comment.timeAgo}</Text>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CommunicationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<CommunityPost | null>(
    () => COMMUNITY_POSTS.find(p => p.id === id) ?? null,
  );
  const [commentText, setCommentText] = useState('');
  const inputRef = useRef<TextInput>(null);

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  function handleLike() {
    setPost(p =>
      p ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : null,
    );
  }

  function handleSend() {
    if (!commentText.trim()) return;
    const newComment: CommunityComment = {
      id: 'cc_new_' + Date.now(),
      author: 'You',
      initials: 'YO',
      role: 'RESIDENT',
      text: commentText.trim(),
      timeAgo: 'Just now',
    };
    setPost(p => (p ? { ...p, comments: [...p.comments, newComment] } : null));
    setCommentText('');
  }

  const isSendEnabled = commentText.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discussion</Text>
          <View style={styles.flex1} />
          <TouchableOpacity
            onPress={handleLike}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="heart"
              size={22}
              color={post.isLiked ? SgateColors.red : SgateColors.t2}
            />
          </TouchableOpacity>
        </View>

        {/* Comments list */}
        <FlatList
          data={post.comments}
          keyExtractor={item => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <PostHeader post={post} />
              <SectionHeader count={post.comments.length} />
            </>
          }
          renderItem={({ item }) => <CommentItem comment={item} />}
          ListFooterComponent={<View style={styles.listFooter} />}
        />

        {/* Comment input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment..."
            placeholderTextColor={SgateColors.t3}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: isSendEnabled ? SgateColors.black : SgateColors.surface },
            ]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Feather
              name="send"
              size={20}
              color={isSendEnabled ? SgateColors.card : SgateColors.t3}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SgateColors.card,
  },
  flex1: {
    flex: 1,
  },

  // Not found
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontFamily: SgateFonts.medium,
    fontSize: 15,
    color: SgateColors.t3,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  headerTitle: {
    fontFamily: SgateFonts.bold,
    fontSize: 18,
    color: SgateColors.t1,
    marginLeft: 12,
  },

  // List
  list: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  listFooter: {
    height: 16,
  },

  // Post header card
  postHeader: {
    backgroundColor: SgateColors.card,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
    padding: 16,
    marginBottom: 8,
  },
  postTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  postTitle: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginTop: 8,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarCircle32: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SgateColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials32: {
    fontSize: 12,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t2,
  },
  postedByText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    marginLeft: 8,
    flex: 1,
  },
  timeAgoText: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  postBody: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    lineHeight: 22,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
  },
  statsText: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  likedText: {
    color: SgateColors.red,
  },

  // Section header
  sectionHeader: {
    fontFamily: SgateFonts.bold,
    fontSize: 15,
    color: SgateColors.t1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SgateColors.bg,
  },

  // Comment item
  commentItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
    backgroundColor: SgateColors.card,
  },
  commentItemAdmin: {
    backgroundColor: '#FFFBFB',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontFamily: SgateFonts.bold,
  },
  commentContent: {
    flex: 1,
  },
  commentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  roleBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: SgateFonts.bold,
  },
  commentTimeAgo: {
    fontSize: 11,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
  },
  commentText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    lineHeight: 19,
    marginTop: 4,
  },

  // Comment input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t1,
    backgroundColor: SgateColors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
