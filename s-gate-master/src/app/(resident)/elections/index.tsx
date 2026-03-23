import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { ELECTIONS, ElectionItem } from '../../../mocks/elections';

type Tab = 'ACTIVE' | 'COMPLETED';

function getDeadlineText(deadline: string): string {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) return 'Ended';
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 24) {
    const hrs = Math.floor(diffHrs);
    if (hrs <= 0) return 'Ends today';
    return `Ends in ${hrs} hr${hrs !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(diffHrs / 24);
  if (days === 0) return 'Ends today';
  return `Ends in ${days} day${days !== 1 ? 's' : ''}`;
}

function ElectionCard({ item, index }: { item: ElectionItem; index: number }) {
  const router = useRouter();

  const isElection = item.type === 'ELECTION';
  const isActive = item.status === 'ACTIVE';
  const showVoteBtn = isActive && !item.hasVoted;

  const badgeBg = isElection ? SgateColors.blueBg : '#F3EEFF';
  const badgeText = isElection ? SgateColors.blue : SgateColors.violet;
  const badgeLabel = isElection ? 'ELECTION' : 'SURVEY';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity
        activeOpacity={0.75}
        style={S.card}
        onPress={() => router.push(`/(resident)/elections/${item.id}` as any)}
      >
        {/* Top row */}
        <View style={S.cardTopRow}>
          <View style={[S.badge, { backgroundColor: badgeBg }]}>
            <Text style={[S.badgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {isActive && !item.hasVoted && (
            <Text style={S.deadlineText}>{getDeadlineText(item.deadline)}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={S.cardTitle}>{item.title}</Text>

        {/* Society */}
        <Text style={S.cardSociety}>{item.society}</Text>

        {/* Bottom row */}
        <View style={S.cardBottomRow}>
          <Text style={S.votesText}>{item.totalVotes} votes cast</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.75}
            style={[
              S.actionBtn,
              showVoteBtn ? S.actionBtnVote : S.actionBtnView,
            ]}
            onPress={() => router.push(`/(resident)/elections/${item.id}` as any)}
          >
            <Text
              style={[
                S.actionBtnText,
                showVoteBtn ? S.actionBtnTextVote : S.actionBtnTextView,
              ]}
            >
              {showVoteBtn ? 'Vote Now' : 'View Results'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View style={S.emptyContainer}>
      <Feather name="bar-chart-2" size={48} color={SgateColors.t4} />
      <Text style={S.emptyTitle}>No active polls</Text>
      <Text style={S.emptySubtitle}>
        Elections and surveys will appear here when available.
      </Text>
    </View>
  );
}

export default function ElectionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('ACTIVE');

  const filtered = ELECTIONS.filter((e) => e.status === activeTab);

  return (
    <SafeAreaView style={S.root} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Elections &amp; Surveys</Text>
        <View style={S.headerSpacer} />
      </View>

      {/* Tab switcher */}
      <View style={S.tabRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={[S.tabBtn, activeTab === 'ACTIVE' ? S.tabBtnActive : S.tabBtnInactive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[S.tabBtnText, activeTab === 'ACTIVE' ? S.tabBtnTextActive : S.tabBtnTextInactive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.75}
          style={[S.tabBtn, activeTab === 'COMPLETED' ? S.tabBtnActive : S.tabBtnInactive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[S.tabBtnText, activeTab === 'COMPLETED' ? S.tabBtnTextActive : S.tabBtnTextInactive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList<ElectionItem>
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={S.listContent}
        renderItem={({ item, index }) => (
          <ElectionCard item={item} index={index} />
        )}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: SgateColors.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  headerSpacer: {
    width: 36,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabBtn: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabBtnActive: {
    backgroundColor: SgateColors.black,
  },
  tabBtnInactive: {
    backgroundColor: SgateColors.surface,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
  },
  tabBtnTextActive: {
    color: SgateColors.card,
  },
  tabBtnTextInactive: {
    color: SgateColors.t2,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
    letterSpacing: 0.5,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginTop: 8,
    marginBottom: 4,
  },
  cardSociety: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  votesText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  actionBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionBtnVote: {
    backgroundColor: SgateColors.greenBg,
  },
  actionBtnView: {
    backgroundColor: SgateColors.surface,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
  },
  actionBtnTextVote: {
    color: SgateColors.green,
  },
  actionBtnTextView: {
    color: SgateColors.t2,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    textAlign: 'center',
    lineHeight: 20,
  },
});
