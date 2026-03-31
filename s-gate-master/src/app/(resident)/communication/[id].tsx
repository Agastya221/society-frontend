import React, { useCallback, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PostDetail {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  isAnonymous: boolean;
  isLiked: boolean;
  likes: number;
  commentCount: number;
  postedBy: { name: string; initials: string; flat?: string };
  timeAgo: string;
}

interface Comment {
  id: string;
  author: string;
  initials: string;
  role: string;
  text: string;
  timeAgo: string;
  isAnonymous: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toInitials(name?: string): string {
  if (!name) return '??';
  return name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function normalisePost(raw: any): PostDetail {
  const author = raw.author ?? raw.postedBy ?? {};
  const name = raw.isAnonymous ? 'Anonymous' : (author.name ?? 'Unknown');
  return {
    id:          raw.id,
    title:       raw.title ?? '',
    body:        raw.content ?? raw.body ?? '',
    category:    raw.category ?? 'GENERAL',
    isPinned:    raw.isPinned ?? false,
    isAnonymous: raw.isAnonymous ?? false,
    isLiked:     raw.isLikedByMe ?? raw.isLiked ?? false,
    likes:       raw.likesCount ?? raw.likes ?? 0,
    commentCount: raw.commentsCount ?? raw.commentCount ?? 0,
    postedBy: {
      name,
      initials: author.initials ?? toInitials(name),
      flat:     author.flat ?? author.flatNumber ?? undefined,
    },
    timeAgo: raw.timeAgo ?? (raw.createdAt ? timeAgo(raw.createdAt) : ''),
  };
}

function normaliseComment(raw: any): Comment {
  const isAnon = raw.isAnonymous ?? false;
  const name = isAnon ? 'Anonymous' : (raw.author?.name ?? raw.authorName ?? 'Unknown');
  return {
    id:          raw.id,
    author:      name,
    initials:    raw.author?.initials ?? toInitials(name),
    role:        raw.author?.role ?? raw.role ?? 'RESIDENT',
    text:        raw.content ?? raw.text ?? '',
    timeAgo:     raw.timeAgo ?? (raw.createdAt ? timeAgo(raw.createdAt) : ''),
    isAnonymous: isAnon,
  };
}

// ─── Category config ────────────────────────────────────────────────────────────
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

const ROLE_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  RESIDENT:  { label: 'Resident',  bg: SgateColors.surface, fg: SgateColors.t2 },
  ADMIN:     { label: 'Admin',     bg: SgateColors.redBg,   fg: SgateColors.red },
  COMMITTEE: { label: 'Committee', bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
};

// ─── Post Header ───────────────────────────────────────────────────────────────
function PostHeader({ post, onLike }: { post: PostDetail; onLike: () => void }) {
  const cfg = CATEGORY_CFG[post.category] ?? CATEGORY_CFG.GENERAL;
  return (
    <View style={S.postHeader}>
      <View style={S.postTopRow}>
        {post.isPinned && <Feather name="bookmark" size={14} color={SgateColors.goldDeep} style={S.pinIcon} />}
        <View style={[S.categoryBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[S.categoryBadgeText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={S.postTitle}>{post.title}</Text>
      <View style={S.postMetaRow}>
        <View style={S.avatarCircle}>
          <Text style={S.avatarInitials}>{post.postedBy.initials}</Text>
        </View>
        <Text style={S.postedByText} numberOfLines={1}>
          {post.isAnonymous ? 'Anonymous' : post.postedBy.name}
          {post.postedBy.flat ? ` · ${post.postedBy.flat}` : ''}
        </Text>
        <View style={S.flex1} />
        <Text style={S.timeAgoText}>{post.timeAgo}</Text>
      </View>
      <Text style={S.postBody}>{post.body}</Text>
      <View style={S.statsRow}>
        <Feather name="message-circle" size={14} color={SgateColors.t3} />
        <Text style={S.statsText}> {post.commentCount} Comments</Text>
        <View style={S.flex1} />
        <TouchableOpacity onPress={onLike} style={S.likeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="heart" size={14} color={post.isLiked ? SgateColors.red : SgateColors.t3} />
          <Text style={[S.statsText, post.isLiked && S.likedText]}> {post.likes}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Comment Item ───────────────────────────────────────────────────────────────
function CommentItem({ comment }: { comment: Comment }) {
  const roleCfg = ROLE_CFG[comment.role] ?? ROLE_CFG.RESIDENT;
  const isAdmin = comment.role === 'ADMIN';
  return (
    <View style={[S.commentItem, isAdmin && S.commentItemAdmin]}>
      <View style={S.commentRow}>
        <View style={[S.commentAvatar, { backgroundColor: roleCfg.bg }]}>
          <Text style={[S.commentAvatarText, { color: roleCfg.fg }]}>{comment.initials}</Text>
        </View>
        <View style={S.commentContent}>
          <View style={S.commentNameRow}>
            <Text style={S.commentAuthor}>{comment.author}</Text>
            <View style={[S.roleBadge, { backgroundColor: roleCfg.bg }]}>
              <Text style={[S.roleBadgeText, { color: roleCfg.fg }]}>{roleCfg.label}</Text>
            </View>
            <View style={S.flex1} />
            <Text style={S.commentTimeAgo}>{comment.timeAgo}</Text>
          </View>
          <Text style={S.commentText}>{comment.text}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function CommunicationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost]         = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [commentText, setCommentText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const fetchPost = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/resident/posts/${id}`),
        api.get(`/resident/posts/${id}/comments`),
      ]);
      setPost(normalisePost(postRes.data?.data ?? postRes.data));
      const rawComments: any[] = commentsRes.data?.data ?? commentsRes.data ?? [];
      setComments((Array.isArray(rawComments) ? rawComments : []).map(normaliseComment));
    } catch (err) {
      console.error('Failed to fetch post:', err);
      Alert.alert('Error', 'Could not load this post.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPost(); }, [id]));

  const handleLike = async () => {
    if (!post) return;
    // Optimistic
    setPost(p => p ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : null);
    try {
      await api.post(`/resident/posts/${id}/like`);
    } catch {
      // Revert
      setPost(p => p ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : null);
    }
  };

  const handleSend = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/resident/posts/${id}/comments`, {
        content: commentText.trim(),
        isAnonymous: false,
      });
      const newComment = normaliseComment(res.data?.data ?? res.data);
      setComments(prev => [...prev, newComment]);
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : null);
      setCommentText('');
    } catch (err) {
      Alert.alert('Error', 'Could not post comment. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={S.safeArea} edges={['top']}>
        <View style={S.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={S.safeArea} edges={['top']}>
        <View style={S.center}><Text style={S.notFoundText}>Post not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={S.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>Discussion</Text>
          <View style={S.flex1} />
          <TouchableOpacity onPress={handleLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="heart" size={22} color={post.isLiked ? SgateColors.red : SgateColors.t2} />
          </TouchableOpacity>
        </View>

        {/* Comments list */}
        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          style={S.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <PostHeader post={post} onLike={handleLike} />
              <Text style={S.sectionHeader}>{comments.length} Comments</Text>
            </>
          }
          renderItem={({ item }) => <CommentItem comment={item} />}
          ListEmptyComponent={
            <View style={S.emptyComments}>
              <Feather name="message-circle" size={28} color={SgateColors.t4} />
              <Text style={S.emptyCommentsText}>No comments yet. Be the first!</Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 16 }} />}
        />

        {/* Comment input */}
        <View style={S.inputContainer}>
          <TextInput
            ref={inputRef}
            style={S.textInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment..."
            placeholderTextColor={SgateColors.t3}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[S.sendButton, { backgroundColor: commentText.trim() ? SgateColors.black : SgateColors.surface }]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color={SgateColors.card} />
              : <Feather name="send" size={20} color={commentText.trim() ? SgateColors.card : SgateColors.t3} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: SgateColors.card },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontFamily: SgateFonts.medium, fontSize: 15, color: SgateColors.t3 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
  headerTitle: { fontFamily: SgateFonts.bold, fontSize: 18, color: SgateColors.t1, marginLeft: 12 },
  list: { flex: 1, backgroundColor: SgateColors.bg },
  postHeader: { backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft, padding: 16, marginBottom: 8 },
  postTopRow: { flexDirection: 'row', alignItems: 'center' },
  pinIcon: { marginRight: 6 },
  categoryBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: { fontSize: 11, fontFamily: SgateFonts.bold },
  postTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 8 },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: SgateColors.surface, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
  postedByText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, marginLeft: 8, flex: 1 },
  timeAgoText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  postBody: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 22, marginTop: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: SgateColors.borderSoft },
  statsText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
  likeBtn: { flexDirection: 'row', alignItems: 'center' },
  likedText: { color: SgateColors.red },
  sectionHeader: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.t1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: SgateColors.bg },
  commentItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft, backgroundColor: SgateColors.card },
  commentItemAdmin: { backgroundColor: '#FFFBFB' },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 13, fontFamily: SgateFonts.bold },
  commentContent: { flex: 1 },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentAuthor: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold },
  commentTimeAgo: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },
  commentText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 19, marginTop: 4 },
  emptyComments: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyCommentsText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SgateColors.card, borderTopWidth: 1, borderTopColor: SgateColors.borderSoft, paddingHorizontal: 12, paddingVertical: 10 },
  textInput: { flex: 1, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, backgroundColor: SgateColors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
