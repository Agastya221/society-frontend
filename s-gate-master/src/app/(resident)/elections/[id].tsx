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
  return {
    id:         raw.id,
    type:       isElection ? 'ELECTION' : 'SURVEY',
    status:     raw.status ?? (new Date(raw.votingEndsAt ?? raw.deadline) > new Date() ? 'ACTIVE' : 'COMPLETED'),
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
    <TouchableOpacity activeOpacity={hasVoted ? 1 : 0.75} onPress={hasVoted ? undefined : onSelect}
      style={[D.candidateCard, selected && D.candidateCardSelected]}>
      <View style={D.avatarCircle}>
        <Text style={D.avatarInitials}>{getInitials(candidate.name)}</Text>
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
    <TouchableOpacity activeOpacity={hasVoted ? 1 : 0.75} onPress={hasVoted ? undefined : onSelect}
      style={[D.surveyCard, selected && D.surveyCardSelected]}>
      <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={SgateColors.violet} />
      <View style={D.surveyOptionBody}>
        <Text style={D.surveyOptionText}>{option.text}</Text>
        {hasVoted && (
          <View style={D.progressContainer}>
            <View style={D.progressBar}>
              <View style={[D.progressFillViolet, { width: `${pct}%` }]} />
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
      <SafeAreaView style={D.root} edges={['top', 'bottom']}>
        <View style={D.notFound}><ActivityIndicator size="large" color={SgateColors.gold} /></View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={D.root} edges={['top', 'bottom']}>
        <View style={D.notFound}><Text style={D.notFoundText}>Not found</Text></View>
      </SafeAreaView>
    );
  }

  const isActive    = item.status === 'ACTIVE';
  const isElection  = item.type === 'ELECTION';
  const showFooter  = isActive && !hasVoted;
  const candidates  = item.candidates ?? [];
  const options     = item.options ?? [];
  const maxVotes    = candidates.length > 0 ? Math.max(...candidates.map(c => c.votes)) : 0;

  const badgeBg    = isElection ? SgateColors.blueBg : '#F3EEFF';
  const badgeText  = isElection ? SgateColors.blue   : SgateColors.violet;
  const badgeLabel = isElection ? 'ELECTION' : 'SURVEY';
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
    <SafeAreaView style={D.root} edges={['top', 'bottom']}>
      <View style={D.header}>
        <TouchableOpacity onPress={() => router.back()} style={D.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={D.headerTitle} numberOfLines={1}>{item.title}</Text>
        <View style={D.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={D.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={D.infoCard}>
          <View style={D.infoTopRow}>
            <View style={[D.badge, { backgroundColor: badgeBg }]}>
              <Text style={[D.badgeText, { color: badgeText }]}>{badgeLabel}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[D.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[D.statusPillText, { color: statusTx }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={D.infoTitle}>{item.title}</Text>
          <View style={D.infoMetaRow}>
            <Feather name="users" size={14} color={SgateColors.t3} />
            <Text style={D.infoMetaText}> {item.totalVotes} total votes</Text>
          </View>
          <View style={[D.infoMetaRow, { marginTop: 4 }]}>
            <Feather name="clock" size={14} color={SgateColors.t3} />
            <Text style={D.infoMetaText}> {getDeadlineLabel(item.deadline)}</Text>
          </View>
        </View>

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

        {!isElection && options.length > 0 && (
          <View>
            {!!item.question && <Text style={D.questionText}>{item.question}</Text>}
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
        )}
      </ScrollView>

      {showFooter && (
        <View style={D.footer}>
          {isElection ? (
            <TouchableOpacity
              activeOpacity={castVoteDisabled || submitting ? 1 : 0.8}
              style={[D.footerBtn, { backgroundColor: castVoteDisabled ? SgateColors.surface : SgateColors.green }]}
              onPress={castVoteDisabled || submitting ? undefined : handleCastVote}>
              <Text style={[D.footerBtnText, { color: castVoteDisabled ? SgateColors.t3 : SgateColors.card }]}>
                {submitting ? 'Submitting…' : 'Cast Vote'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={submitDisabled || submitting ? 1 : 0.8}
              style={[D.footerBtn, { backgroundColor: submitDisabled ? SgateColors.surface : SgateColors.green }]}
              onPress={submitDisabled || submitting ? undefined : handleSubmitSurvey}>
              <Text style={[D.footerBtnText, { color: submitDisabled ? SgateColors.t3 : SgateColors.card }]}>
                {submitting ? 'Submitting…' : 'Submit Response'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const D = StyleSheet.create({
  root: { flex: 1, backgroundColor: SgateColors.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SgateColors.bg },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
  headerSpacer: { width: 36 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  infoCard: { backgroundColor: SgateColors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: SgateColors.borderSoft },
  infoTopRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
  infoTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 10, lineHeight: 24 },
  infoMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  infoMetaText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
  sectionTitle: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 12 },
  candidateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SgateColors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: SgateColors.borderSoft },
  candidateCardSelected: { backgroundColor: SgateColors.blueBg, borderColor: SgateColors.blue, borderWidth: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: SgateColors.blueBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarInitials: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.blue },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
  candidateSubtitle: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: SgateColors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioOuterSelected: { borderColor: SgateColors.blue },
  radioInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: SgateColors.blue },
  progressContainer: { marginTop: 8 },
  progressBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: SgateColors.blue, borderRadius: 2 },
  progressFillViolet: { height: 4, backgroundColor: SgateColors.violet, borderRadius: 2 },
  progressEmpty: { flex: 1, height: 4, backgroundColor: SgateColors.surface },
  progressLabel: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginTop: 4 },
  surveyCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: SgateColors.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: SgateColors.borderSoft },
  surveyCardSelected: { backgroundColor: '#F3EEFF', borderColor: SgateColors.violet, borderWidth: 2 },
  surveyOptionBody: { flex: 1, marginLeft: 10 },
  surveyOptionText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
  questionText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 16, lineHeight: 22 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: SgateColors.card, borderTopWidth: 1, borderTopColor: SgateColors.borderSoft },
  footerBtn: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold },
});
