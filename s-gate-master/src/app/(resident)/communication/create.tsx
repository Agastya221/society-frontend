import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { PostCategory } from '../../../mocks/communication';

// ─── Category config ───────────────────────────────────────────────────────────
const CATEGORY_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  GENERAL:     { label: 'General',      bg: SgateColors.blueBg,   fg: SgateColors.blue },
  MAINTENANCE: { label: 'Maintenance',  bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
  EVENTS:      { label: 'Events',       bg: SgateColors.greenBg,  fg: SgateColors.green },
  LOST_FOUND:  { label: 'Lost & Found', bg: '#F3EEFF',            fg: '#9B6DFF' },
  SAFETY:      { label: 'Safety',       bg: SgateColors.redBg,    fg: SgateColors.red },
  FOR_SALE:    { label: 'For Sale',     bg: SgateColors.surface,  fg: SgateColors.t2 },
};

const CATEGORIES: PostCategory[] = [
  'GENERAL', 'MAINTENANCE', 'EVENTS', 'LOST_FOUND', 'SAFETY', 'FOR_SALE',
];

const CATEGORY_LABELS: Record<PostCategory, string> = {
  GENERAL:     'General',
  MAINTENANCE: 'Maintenance',
  EVENTS:      'Events',
  LOST_FOUND:  'Lost & Found',
  SAFETY:      'Safety',
  FOR_SALE:    'For Sale',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CreatePostScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<PostCategory | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const isPostDisabled = !title.trim() || !body.trim() || !category;

  function handlePost() {
    if (isPostDisabled) return;
    Alert.alert(
      'Post Created',
      'Your post has been shared with the community.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={isPostDisabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Category ─────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Category *</Text>

          {/* Dropdown trigger */}
          <TouchableOpacity
            style={[
              styles.dropdownRow,
              { borderColor: showCategoryPicker ? SgateColors.blue : SgateColors.border },
            ]}
            onPress={() => setShowCategoryPicker(prev => !prev)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
              {category ? CATEGORY_LABELS[category] : 'Choose Category'}
            </Text>
            <Feather name="chevron-down" size={18} color={SgateColors.t3} />
          </TouchableOpacity>

          {/* Dropdown list */}
          {showCategoryPicker && (
            <View style={styles.dropdownList}>
              {CATEGORIES.map((cat, idx) => {
                const cfg = CATEGORY_CFG[cat];
                const isLast = idx === CATEGORIES.length - 1;
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.dropdownItem,
                      !isLast && styles.dropdownItemBorder,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.dropdownBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.dropdownBadgeText, { color: cfg.fg }]}>
                        {cfg.label}
                      </Text>
                    </View>
                    <Text style={styles.dropdownItemLabel}>{cfg.label}</Text>
                    {isSelected && (
                      <Feather name="check" size={16} color={SgateColors.blue} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Title ────────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Title *</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Write a title..."
            placeholderTextColor={SgateColors.t3}
          />
        </View>

        {/* ── Description ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Description *</Text>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Share details with your community..."
            placeholderTextColor={SgateColors.t3}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
          <View style={styles.counterRow}>
            <Text style={[styles.counterText, body.length > 1800 && styles.counterTextWarn]}>
              {body.length} / 2000
            </Text>
          </View>
        </View>

        {/* ── Anonymous ────────────────────────────────────────────────────── */}
        <View style={[styles.card, styles.anonymousCard]}>
          <View style={styles.flex1}>
            <Text style={styles.anonymousTitle}>Post Anonymously</Text>
            <Text style={styles.anonymousSubtitle}>
              Your name will not be shown on this post.
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: SgateColors.border, true: SgateColors.green }}
            thumbColor={SgateColors.card}
          />
        </View>
      </ScrollView>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
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
  postButton: {
    fontFamily: SgateFonts.semibold,
    fontSize: 15,
    color: SgateColors.blue,
  },
  postButtonDisabled: {
    color: SgateColors.t4,
  },

  // Scroll
  scrollView: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Card base
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  cardLabel: {
    fontFamily: SgateFonts.semibold,
    fontSize: 13,
    color: SgateColors.t1,
    marginBottom: 10,
  },

  // Dropdown
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  dropdownText: {
    flex: 1,
    fontFamily: SgateFonts.medium,
    fontSize: 14,
    color: SgateColors.t1,
  },
  dropdownPlaceholder: {
    color: SgateColors.t3,
  },
  dropdownList: {
    backgroundColor: SgateColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SgateColors.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: SgateColors.borderSoft,
  },
  dropdownBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
  },
  dropdownItemLabel: {
    flex: 1,
    fontFamily: SgateFonts.medium,
    fontSize: 14,
    color: SgateColors.t1,
    marginLeft: 10,
  },

  // Title input
  titleInput: {
    fontFamily: SgateFonts.regular,
    fontSize: 14,
    color: SgateColors.t1,
  },

  // Body input
  bodyInput: {
    fontFamily: SgateFonts.regular,
    fontSize: 14,
    color: SgateColors.t1,
    minHeight: 120,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  counterText: {
    fontFamily: SgateFonts.regular,
    fontSize: 12,
    color: SgateColors.t4,
  },
  counterTextWarn: {
    color: SgateColors.red,
  },

  // Anonymous card
  anonymousCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anonymousTitle: {
    fontFamily: SgateFonts.semibold,
    fontSize: 14,
    color: SgateColors.t1,
  },
  anonymousSubtitle: {
    fontFamily: SgateFonts.regular,
    fontSize: 12,
    color: SgateColors.t3,
    marginTop: 2,
  },
});
