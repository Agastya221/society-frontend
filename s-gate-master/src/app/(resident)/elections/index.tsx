import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
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

  const badgeBg   = isElection ? SgateColors.blueBg : '#F3EEFF';
  const badgeText = isElection ? SgateColors.blue   : SgateColors.violet;
  const badgeLabel = isElection ? 'ELECTION' : 'SURVEY';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity activeOpacity={0.75} style={S.card}
        onPress={() => router.push(`/(resident)/elections/${item.id}` as any)}>
        <View style={S.cardTopRow}>
          <View style={[S.badge, { backgroundColor: badgeBg }]}>
            <Text style={[S.badgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {isActive && !item.hasVoted && (
            <Text style={S.deadlineText}>{getDeadlineText(item.deadline)}</Text>
          )}
        </View>
        <Text style={S.cardTitle}>{item.title}</Text>
        {!!item.society && <Text style={S.cardSociety}>{item.society}</Text>}
        <View style={S.cardBottomRow}>
          <Text style={S.votesText}>{item.totalVotes} votes cast</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.75}
            style={[S.actionBtn, showVoteBtn ? S.actionBtnVote : S.actionBtnView]}
            onPress={() => router.push(`/(resident)/elections/${item.id}` as any)}>
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
        <View style={S.center}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      ) : (
        <FlatList<ElectionItem>
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={S.listContent}
          renderItem={({ item, index }) => <ElectionCard item={item} index={index} />}
          ListEmptyComponent={
            <View style={S.emptyContainer}>
              <Feather name="bar-chart-2" size={48} color={SgateColors.t4} />
              <Text style={S.emptyTitle}>No {activeTab.toLowerCase()} polls</Text>
              <Text style={S.emptySubtitle}>Elections and surveys will appear here when available.</Text>
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
  tabBtnActive: { backgroundColor: SgateColors.t1 },
  tabBtnInactive: { backgroundColor: SgateColors.bg },
  tabBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold },
  tabBtnTextActive: { color: SgateColors.card },
  tabBtnTextInactive: { color: SgateColors.t2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: SgateColors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SgateColors.borderSoft },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
  deadlineText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
  cardTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginTop: 8, marginBottom: 4 },
  cardSociety: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  votesText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  actionBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  actionBtnVote: { backgroundColor: SgateColors.greenBg },
  actionBtnView: { backgroundColor: SgateColors.surface },
  actionBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold },
  actionBtnTextVote: { color: SgateColors.green },
  actionBtnTextView: { color: SgateColors.t2 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
  emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', lineHeight: 20 },
});
