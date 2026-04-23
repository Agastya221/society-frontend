import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

function getDeadlineLabel(deadline: string): string {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const diffMs = end - now;
  if (diffMs <= 0) {
    return `Ended ${new Date(deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 24) {
    const hrs = Math.floor(diffHrs);
    return hrs <= 0 ? 'Ends today' : `Ends in ${hrs} hr${hrs !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(diffHrs / 24);
  if (days === 0) return 'Ends today';
  return `Ends in ${days} day${days !== 1 ? 's' : ''}`;
}

function calcPct(votes: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
}

// Maps backend status → UI status
const STATUS_MAP: Record<string, 'ACTIVE' | 'COMPLETED'> = {
  OPEN: 'ACTIVE', ACTIVE: 'ACTIVE',
  CLOSED: 'COMPLETED', COMPLETED: 'COMPLETED', ENDED: 'COMPLETED',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string; name: string; subtitle: string; votes: number;
}
interface PollOption {
  id: string; text: string; votes: number;
}
interface ElectionDetail {
  id: string;
  type: 'ELECTION' | 'SURVEY';
  status: 'ACTIVE' | 'COMPLETED';
  title: string;
  totalVotes: number;
  deadline: string;
  hasVoted: boolean;
  question?: string;
  candidates?: Candidate[];
  options?: PollOption[];
}

function normaliseDetail(raw: any): ElectionDetail {
  const isElection = raw.type === 'ELECTION' && Array.isArray(raw.candidates);
  const rawStatus = (raw.status ?? '').toUpperCase();
  const mappedStatus = STATUS_MAP[rawStatus]
    ?? (new Date(raw.votingEndsAt ?? raw.deadline) > new Date() ? 'ACTIVE' : 'COMPLETED');

  return {
    id:         raw.id ?? raw._id,
    type:       isElection ? 'ELECTION' : 'SURVEY',
    status:     mappedStatus,
    title:      raw.title ?? '',
    totalVotes: raw.totalVotes ?? 0,
    deadline:   raw.deadline ?? raw.votingEndsAt ?? new Date().toISOString(),
    hasVoted:   raw.hasVoted ?? false,
    question:   raw.description ?? raw.question,
    candidates: raw.candidates?.map((c: any) => ({
      id: c.id, name: c.name ?? '', subtitle: c.subtitle ?? c.position ?? '', votes: c.votes ?? c.voteCount ?? 0,
    })),
    options: raw.options?.map((o: any) => ({
      id: o.id, text: o.text ?? o.label ?? '', votes: o.votes ?? o.voteCount ?? 0,
    })),
  };
}

// ── Candidate Card ─────────────────────────────────────────────────────────────

function CandidateCard({ candidate, selected, hasVoted, totalVotes, isWinner, onSelect }: {
  candidate: Candidate; selected: boolean; hasVoted: boolean; totalVotes: number; isWinner: boolean; onSelect: () => void;
}) {
  const pct = calcPct(candidate.votes, totalVotes);
  return (
    <TouchableOpacity activeOpacity={hasVoted ? 1 : 0.85} onPress={hasVoted ? undefined : onSelect}
      style={[D.candidateCard, selected && D.candidateCardSelected]}>
      <View style={[D.avatarCircle, selected && { backgroundColor: SgateColors.gold }]}>
        <Text style={[D.avatarInitials, selected && { color: '#FFFFFF' }]}>{getInitials(candidate.name)}</Text>
      </View>
      <View style={D.candidateInfo}>
        <Text style={D.candidateName}>{candidate.name}</Text>
        <Text style={D.candidateSubtitle}>{candidate.subtitle}</Text>
        {hasVoted && (
          <View style={D.progressContainer}>
            <View style={D.progressBar}>
              <View style={[D.progressFill, { width: `${pct}%` }]} />
              <View style={D.progressEmpty} />
            </View>
            <Text style={D.progressLabel}>{candidate.votes} vote{candidate.votes !== 1 ? 's' : ''} ({pct}%)</Text>
          </View>
        )}
      </View>
      {!hasVoted ? (
        <View style={[D.radioOuter, selected && D.radioOuterSelected]}>
          {selected && <View style={D.radioInner} />}
        </View>
      ) : isWinner ? (
        <Feather name="award" size={20} color={SgateColors.goldDeep} />
      ) : null}
    </TouchableOpacity>
  );
}

// ── Survey Option Card ─────────────────────────────────────────────────────────

function SurveyOptionCard({ option, selected, hasVoted, totalVotes, onSelect }: {
  option: PollOption; selected: boolean; hasVoted: boolean; totalVotes: number; onSelect: () => void;
}) {
  const pct = calcPct(option.votes, totalVotes);
  return (
    <TouchableOpacity
      activeOpacity={hasVoted ? 1 : 0.85}
      onPress={hasVoted ? undefined : onSelect}
      style={[D.surveyCard, selected && D.surveyCardSelected]}
    >
      {/* Radio indicator */}
      <View style={[D.radioOuter, selected && D.radioOuterSelected]}>
        {selected && <View style={D.radioInner} />}
      </View>

      <View style={D.surveyOptionBody}>
        <Text style={D.surveyOptionText}>{option.text}</Text>
        {hasVoted && (
          <View style={D.progressContainer}>
            <View style={D.progressBar}>
              <View style={[D.progressFill, { width: `${pct}%` }]} />
              <View style={D.progressEmpty} />
            </View>
            <Text style={D.progressLabel}>{option.votes} vote{option.votes !== 1 ? 's' : ''} ({pct}%)</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ElectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<ElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);

  useFocusEffect(useCallback(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/resident/polls/${id}`);
        const raw = res.data?.data ?? res.data;
        const detail = normaliseDetail(raw);
        setItem(detail);
        setHasVoted(detail.hasVoted);
      } catch (err) {
        console.error('Failed to fetch poll detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SgateColors.bg }}>
        <View style={D.headerContainer}><SafeAreaView edges={['top']} /></View>
        <View style={D.notFound}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: SgateColors.bg }}>
        <View style={D.headerContainer}><SafeAreaView edges={['top']} /></View>
        <View style={D.notFound}><Text style={D.notFoundText}>Not found</Text></View>
      </View>
    );
  }

  const isActive    = item.status === 'ACTIVE';
  const isElection  = item.type === 'ELECTION';
  const showFooter  = isActive && !hasVoted;
  const candidates  = item.candidates ?? [];
  const options     = item.options ?? [];
  const maxVotes    = candidates.length > 0 ? Math.max(...candidates.map(c => c.votes)) : 0;

  const badgeIcon  = isElection ? 'award' : 'bar-chart-2';
  const badgeLabel = isElection ? 'Election' : 'Survey';
  const statusLabel = isActive ? 'Active' : 'Closed';
  const statusBg   = isActive ? SgateColors.greenBg : SgateColors.surface;
  const statusTx   = isActive ? SgateColors.green    : SgateColors.t3;

  const castVoteDisabled   = selectedCandidate === null;
  const submitDisabled     = selectedOptions.length === 0;

  const handleCastVote = () => {
    if (!selectedCandidate) return;
    const name = candidates.find(c => c.id === selectedCandidate)?.name ?? '';
    AppAlert.show('Confirm Vote', `Vote for ${name}? This cannot be changed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Cast Vote', onPress: async () => {
        try {
          setSubmitting(true);
          await api.post(`/resident/polls/${id}/vote`, { optionId: selectedCandidate });
          setHasVoted(true);
        } catch (err) {
          AppAlert.show('Error', 'Could not submit vote. Please try again.');
        } finally {
          setSubmitting(false);
        }
      }},
    ]);
  };

  const handleSubmitSurvey = () => {
    if (selectedOptions.length === 0) return;
    AppAlert.show('Submit Survey', 'Submit your response? This cannot be changed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: async () => {
        try {
          setSubmitting(true);
          // Backend spec uses { optionId } (singular) — send first selected for standard polls
          // For allowMultiple polls the backend may accept array, but spec only shows optionId
          await api.post(`/resident/polls/${id}/vote`, { optionId: selectedOptions[0] });
          setHasVoted(true);
        } catch (err) {
          AppAlert.show('Error', 'Could not submit response. Please try again.');
        } finally {
          setSubmitting(false);
        }
      }},
    ]);
  };

  const toggleSurveyOption = (optionId: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionId) ? prev.filter(o => o !== optionId) : [...prev, optionId],
    );
  };

  return (
    <View style={D.root}>
      {/* Header — extends behind status bar */}
      <View style={D.headerContainer}>
        <SafeAreaView edges={['top']}>
          <View style={D.header}>
            <TouchableOpacity onPress={() => router.back()} style={D.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={D.headerTitle} numberOfLines={1}>{item.title}</Text>
            <View style={D.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* Persistent spacer */}
      <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

      <ScrollView contentContainerStyle={D.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={D.infoCard}>
          <View style={D.infoTopRow}>
            <View style={D.badge}>
              <Feather name={badgeIcon as any} size={12} color={SgateColors.goldDeep} />
              <Text style={D.badgeText}>{badgeLabel}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[D.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[D.statusPillText, { color: statusTx }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={D.infoTitle}>{item.title}</Text>
          <View style={D.metaRow}>
            <View style={D.metaChip}>
              <Feather name="users" size={13} color={SgateColors.t3} />
              <Text style={D.metaChipText}>{item.totalVotes} total vote{item.totalVotes !== 1 ? 's' : ''}</Text>
            </View>
            <View style={D.metaChip}>
              <Feather name="clock" size={13} color={SgateColors.t3} />
              <Text style={D.metaChipText}>{getDeadlineLabel(item.deadline)}</Text>
            </View>
          </View>
        </View>

        {/* Election — Candidates */}
        {isElection && candidates.length > 0 && (
          <View>
            <Text style={D.sectionTitle}>Candidates</Text>
            {candidates.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                selected={selectedCandidate === candidate.id}
                hasVoted={hasVoted}
                totalVotes={item.totalVotes}
                isWinner={hasVoted && candidate.votes === maxVotes}
                onSelect={() => setSelectedCandidate(candidate.id)}
              />
            ))}
          </View>
        )}

        {/* Survey — Options */}
        {!isElection && options.length > 0 && (
          <View>
            {!!item.question && (
              <View style={D.descriptionCard}>
                <Text style={D.questionText}>{item.question}</Text>
              </View>
            )}
            <Text style={D.sectionTitle}>Options</Text>
            <View style={{ gap: 10 }}>
              {options.map(option => (
                <SurveyOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedOptions.includes(option.id)}
                  hasVoted={hasVoted}
                  totalVotes={item.totalVotes}
                  onSelect={() => toggleSurveyOption(option.id)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {showFooter && (
        <View style={D.footer}>
          {isElection ? (
            <TouchableOpacity
              activeOpacity={castVoteDisabled || submitting ? 1 : 0.8}
              style={[D.footerBtn, { backgroundColor: castVoteDisabled ? SgateColors.surface : SgateColors.gold }]}
              onPress={castVoteDisabled || submitting ? undefined : handleCastVote}>
              <Feather name="check-circle" size={18} color={castVoteDisabled ? SgateColors.t4 : SgateColors.t1} style={{ marginRight: 8 }} />
              <Text style={[D.footerBtnText, { color: castVoteDisabled ? SgateColors.t3 : SgateColors.t1 }]}>
                {submitting ? 'Submitting…' : 'Cast Vote'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={submitDisabled || submitting ? 1 : 0.8}
              style={[D.footerBtn, { backgroundColor: submitDisabled ? SgateColors.surface : SgateColors.gold }]}
              onPress={submitDisabled || submitting ? undefined : handleSubmitSurvey}>
              <Feather name="send" size={16} color={submitDisabled ? SgateColors.t4 : SgateColors.t1} style={{ marginRight: 8 }} />
              <Text style={[D.footerBtnText, { color: submitDisabled ? SgateColors.t3 : SgateColors.t1 }]}>
                {submitting ? 'Submitting…' : 'Submit Response'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const D = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

  // ── Header ──
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginLeft: 8, flex: 1 },
  headerSpacer: { width: 36 },

  // ── Scroll ──
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // ── Info Card ──
  infoCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
    letterSpacing: 0.3,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    lineHeight: 26,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: SgateColors.bg,
  },
  metaChipText: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },

  // ── Description ──
  descriptionCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  questionText: {
    fontSize: 15,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    lineHeight: 23,
  },

  // ── Sections ──
  sectionTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginBottom: 12,
  },

  // ── Candidate Card ──
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  candidateCardSelected: {
    backgroundColor: SgateColors.goldPale,
    borderColor: SgateColors.gold,
    borderWidth: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SgateColors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
  candidateSubtitle: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

  // ── Radio ──
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: SgateColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterSelected: { borderColor: SgateColors.gold },
  radioInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: SgateColors.gold },

  // ── Progress ──
  progressContainer: { marginTop: 8 },
  progressBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: SgateColors.gold, borderRadius: 2 },
  progressEmpty: { flex: 1, height: 4, backgroundColor: SgateColors.surface },
  progressLabel: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginTop: 4 },

  // ── Survey Option Card ──
  surveyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: SgateColors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  surveyCardSelected: {
    backgroundColor: SgateColors.goldPale,
    borderColor: SgateColors.gold,
    borderWidth: 2,
  },
  surveyOptionBody: { flex: 1 },
  surveyOptionText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, lineHeight: 22 },

  // ── Footer ──
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 3,
  },
  footerBtn: {
    flexDirection: 'row',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: { fontSize: 15, fontFamily: SgateFonts.bold },
});
