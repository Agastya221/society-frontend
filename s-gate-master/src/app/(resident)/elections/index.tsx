import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';

type Tab = 'ACTIVE' | 'COMPLETED';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function calcPct(votes: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface ElectionItem {
  id: string;
  type: 'ELECTION' | 'SURVEY';
  status: 'ACTIVE' | 'COMPLETED';
  title: string;
  society: string;
  totalVotes: number;
  deadline: string;
  hasVoted: boolean;
  // ELECTION
  candidates?: { id: string; name: string; subtitle: string; votes: number }[];
  // SURVEY / POLL
  question?: string;
  options?: PollOption[];
}

// Maps backend status values → our UI status
const STATUS_MAP: Record<string, 'ACTIVE' | 'COMPLETED'> = {
  OPEN:      'ACTIVE',
  ACTIVE:    'ACTIVE',
  CLOSED:    'COMPLETED',
  COMPLETED: 'COMPLETED',
  ENDED:     'COMPLETED',
};

function normaliseItem(raw: any): ElectionItem {
  const isOldFormat = raw.candidates !== undefined;
  const rawStatus = (raw.status ?? '').toUpperCase();
  const mappedStatus = STATUS_MAP[rawStatus]
    ?? (new Date(raw.votingEndsAt ?? raw.deadline) > new Date() ? 'ACTIVE' : 'COMPLETED');

  return {
    id:         raw.id ?? raw._id,
    type:       raw.type === 'ELECTION' && isOldFormat ? 'ELECTION' : 'SURVEY',
    status:     mappedStatus,
    title:      raw.title ?? '',
    society:    raw.society ?? raw.societyName ?? '',
    totalVotes: raw.totalVotes ?? 0,
    deadline:   raw.deadline ?? raw.votingEndsAt ?? new Date().toISOString(),
    hasVoted:   raw.hasVoted ?? false,
    candidates: raw.candidates,
    question:   raw.description ?? raw.question,
    options:    raw.options?.map((o: any) => ({
      id:    o.id,
      text:  o.text ?? o.label ?? '',
      votes: o.votes ?? o.voteCount ?? 0,
    })),
  };
}

// ── Election Card ─────────────────────────────────────────────────────────────
function ElectionCard({ item, index }: { item: ElectionItem; index: number }) {
  const router = useRouter();
  const isElection = item.type === 'ELECTION';
  const isActive   = item.status === 'ACTIVE';
  const showVoteBtn = isActive && !item.hasVoted;

  const badgeIcon  = isElection ? 'award' : 'bar-chart-2';
  const badgeLabel = isElection ? 'Election' : 'Survey';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={S.card}
        onPress={() => router.push(`/(resident)/elections/${item.id}` as any)}
      >
        {/* Row 1: Badge + Deadline */}
        <View style={S.cardTopRow}>
          <View style={S.badge}>
            <Feather name={badgeIcon as any} size={12} color={SgateColors.goldDeep} />
            <Text style={S.badgeText}>{badgeLabel}</Text>
          </View>
          {isActive && !item.hasVoted && (
            <View style={S.deadlineChip}>
              <Feather name="clock" size={11} color={SgateColors.t3} />
              <Text style={S.deadlineText}>{getDeadlineText(item.deadline)}</Text>
            </View>
          )}
        </View>

        {/* Row 2: Title */}
        <Text style={S.cardTitle} numberOfLines={3}>{item.title}</Text>
        {!!item.question && <Text style={S.cardQuestion} numberOfLines={2}>{item.question}</Text>}

        {/* Row 3: Votes + Action */}
        <View style={S.cardBottomRow}>
          <View style={S.votesChip}>
            <Feather name="users" size={13} color={SgateColors.t3} />
            <Text style={S.votesText}>{item.totalVotes} vote{item.totalVotes !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.8}
            style={[S.actionBtn, showVoteBtn ? S.actionBtnVote : S.actionBtnView]}
            onPress={() => router.push(`/(resident)/elections/${item.id}` as any)}
          >
            <Feather
              name={showVoteBtn ? 'check-circle' : 'eye'}
              size={14}
              color={showVoteBtn ? SgateColors.goldDeep : SgateColors.t2}
            />
            <Text style={[S.actionBtnText, showVoteBtn ? S.actionBtnTextVote : S.actionBtnTextView]}>
              {showVoteBtn ? 'Vote Now' : 'View Results'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ElectionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('ACTIVE');
  const [items, setItems] = useState<ElectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const res = await api.get('/resident/polls');
      const raw = res.data;

      // Handle every possible nesting the backend might use
      const rawList: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data?.polls)
          ? raw.data.polls
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.polls)
              ? raw.polls
              : [];

      console.log('[Elections] raw keys:', Object.keys(raw ?? {}));
      console.log('[Elections] rawList length:', rawList.length);
      if (rawList.length > 0) console.log('[Elections] first item:', JSON.stringify(rawList[0]).slice(0, 200));

      setItems(rawList.map(normaliseItem));
    } catch (err) {
      console.error('Failed to fetch elections/polls:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPolls(); }, []));

  const filtered = items.filter(e => e.status === activeTab);

  return (
    <View style={S.root}>
      {/* Header — bg extends behind status bar */}
      <View style={S.headerContainer}>
        <SafeAreaView edges={['top']}>
          <View style={S.header}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Elections & Surveys</Text>
            <View style={S.headerSpacer} />
          </View>
        </SafeAreaView>

        <View style={S.tabRow}>
          {(['ACTIVE', 'COMPLETED'] as Tab[]).map(tab => (
            <TouchableOpacity key={tab} activeOpacity={0.75}
              style={[S.tabBtn, activeTab === tab ? S.tabBtnActive : S.tabBtnInactive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[S.tabBtnText, activeTab === tab ? S.tabBtnTextActive : S.tabBtnTextInactive]}>
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Persistent spacer */}
      <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

      {loading ? (
        <AppLoader />
      ) : (
        <FlatList<ElectionItem>
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={S.listContent}
          renderItem={({ item, index }) => <ElectionCard item={item} index={index} />}
          ListEmptyComponent={
            <View style={S.emptyContainer}>
              <View style={S.emptyIconWrap}>
                <Feather name="bar-chart-2" size={32} color={SgateColors.goldDeep} />
              </View>
              <Text style={S.emptyTitle}>No {activeTab.toLowerCase()} polls</Text>
              <Text style={S.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? 'Active polls and surveys will show up here when available.'
                  : "You haven't participated in any polls yet. Completed ones will appear here."}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: {
    backgroundColor: SgateColors.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginLeft: 8, flex: 1 },
  headerSpacer: { width: 36 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  tabBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  tabBtnActive: { backgroundColor: SgateColors.gold },
  tabBtnInactive: { backgroundColor: SgateColors.bg },
  tabBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold },
  tabBtnTextActive: { color: SgateColors.t1, fontFamily: SgateFonts.bold },
  tabBtnTextInactive: { color: SgateColors.t2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // ── Card ──
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: SgateColors.goldPale,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.goldDeep,
    letterSpacing: 0.3,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    lineHeight: 23,
    marginBottom: 4,
  },
  cardQuestion: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    lineHeight: 19,
    marginBottom: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  votesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  votesText: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnVote: {
    backgroundColor: SgateColors.goldPale,
  },
  actionBtnView: {
    backgroundColor: SgateColors.surface,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
  },
  actionBtnTextVote: {
    color: SgateColors.goldDeep,
  },
  actionBtnTextView: {
    color: SgateColors.t2,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
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
