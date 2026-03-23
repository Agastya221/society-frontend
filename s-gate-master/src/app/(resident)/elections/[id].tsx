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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { ELECTIONS, ElectionItem, Candidate, SurveyOption } from '../../../mocks/elections';

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
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

function getMaxVotes(candidates: Candidate[]): number {
  return Math.max(...candidates.map((c) => c.votes));
}

// ── Candidate Card ─────────────────────────────────────────────────────────

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  hasVoted: boolean;
  totalVotes: number;
  isWinner: boolean;
  onSelect: () => void;
}

function CandidateCard({
  candidate,
  selected,
  hasVoted,
  totalVotes,
  isWinner,
  onSelect,
}: CandidateCardProps) {
  const pct = calcPct(candidate.votes, totalVotes);

  return (
    <TouchableOpacity
      activeOpacity={hasVoted ? 1 : 0.75}
      onPress={hasVoted ? undefined : onSelect}
      style={[
        D.candidateCard,
        selected && D.candidateCardSelected,
      ]}
    >
      {/* Avatar */}
      <View style={D.avatarCircle}>
        <Text style={D.avatarInitials}>{getInitials(candidate.name)}</Text>
      </View>

      {/* Info */}
      <View style={D.candidateInfo}>
        <Text style={D.candidateName}>{candidate.name}</Text>
        <Text style={D.candidateSubtitle}>{candidate.subtitle}</Text>

        {hasVoted && (
          <View style={D.progressContainer}>
            <View style={D.progressBar}>
              <View style={[D.progressFill, { width: `${pct}%` }]} />
              <View style={D.progressEmpty} />
            </View>
            <Text style={D.progressLabel}>
              {candidate.votes} vote{candidate.votes !== 1 ? 's' : ''} ({pct}%)
            </Text>
          </View>
        )}
      </View>

      {/* Right indicator */}
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

// ── Survey Option Card ─────────────────────────────────────────────────────

interface SurveyOptionCardProps {
  option: SurveyOption;
  selected: boolean;
  hasVoted: boolean;
  totalVotes: number;
  onSelect: () => void;
}

function SurveyOptionCard({
  option,
  selected,
  hasVoted,
  totalVotes,
  onSelect,
}: SurveyOptionCardProps) {
  const pct = calcPct(option.votes, totalVotes);

  return (
    <TouchableOpacity
      activeOpacity={hasVoted ? 1 : 0.75}
      onPress={hasVoted ? undefined : onSelect}
      style={[
        D.surveyCard,
        selected && D.surveyCardSelected,
      ]}
    >
      {/* Check icon */}
      <Feather
        name={selected ? 'check-circle' : 'circle'}
        size={20}
        color={SgateColors.violet}
      />

      {/* Text + progress */}
      <View style={D.surveyOptionBody}>
        <Text style={D.surveyOptionText}>{option.text}</Text>

        {hasVoted && (
          <View style={D.progressContainer}>
            <View style={D.progressBar}>
              <View style={[D.progressFillViolet, { width: `${pct}%` }]} />
              <View style={D.progressEmpty} />
            </View>
            <Text style={D.progressLabel}>
              {option.votes} vote{option.votes !== 1 ? 's' : ''} ({pct}%)
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function ElectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const found = ELECTIONS.find((e) => e.id === id) ?? null;

  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState<boolean>(found?.hasVoted ?? false);

  if (!found) {
    return (
      <SafeAreaView style={D.root} edges={['top', 'bottom']}>
        <View style={D.notFound}>
          <Text style={D.notFoundText}>Not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const item: ElectionItem = found;
  const isActive = item.status === 'ACTIVE';
  const isElection = item.type === 'ELECTION';
  const showFooter = isActive && !hasVoted;

  const isElectionBadgeBg = isElection ? SgateColors.blueBg : '#F3EEFF';
  const isElectionBadgeText = isElection ? SgateColors.blue : SgateColors.violet;
  const badgeLabel = isElection ? 'ELECTION' : 'SURVEY';

  const statusBg = isActive ? SgateColors.greenBg : SgateColors.surface;
  const statusText = isActive ? SgateColors.green : SgateColors.t3;
  const statusLabel = isActive ? 'ACTIVE' : 'COMPLETED';

  // Election helpers
  const candidates = item.candidates ?? [];
  const maxVotes = candidates.length > 0 ? getMaxVotes(candidates) : 0;

  // Survey helpers
  const options = item.options ?? [];

  // Cast vote handler
  const handleCastVote = () => {
    if (!selectedCandidate) return;
    const candidateName = candidates.find((c) => c.id === selectedCandidate)?.name ?? '';
    Alert.alert(
      'Confirm Vote',
      `Are you sure you want to vote for ${candidateName}? This cannot be changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cast Vote',
          onPress: () => {
            setHasVoted(true);
          },
        },
      ],
    );
  };

  // Submit survey handler
  const handleSubmitSurvey = () => {
    if (selectedOptions.length === 0) return;
    Alert.alert(
      'Submit Survey',
      'Submit your response? This cannot be changed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            setHasVoted(true);
          },
        },
      ],
    );
  };

  const toggleSurveyOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((o) => o !== optionId)
        : [...prev, optionId],
    );
  };

  const castVoteDisabled = selectedCandidate === null;
  const submitDisabled = selectedOptions.length === 0;

  return (
    <SafeAreaView style={D.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={D.header}>
        <TouchableOpacity onPress={() => router.back()} style={D.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>
        <Text style={D.headerTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={D.headerSpacer} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={D.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={D.infoCard}>
          {/* Badge + status row */}
          <View style={D.infoTopRow}>
            <View style={[D.badge, { backgroundColor: isElectionBadgeBg }]}>
              <Text style={[D.badgeText, { color: isElectionBadgeText }]}>{badgeLabel}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[D.statusPill, { backgroundColor: statusBg }]}>
              <Text style={[D.statusPillText, { color: statusText }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={D.infoTitle}>{item.title}</Text>

          {/* Total votes row */}
          <View style={D.infoMetaRow}>
            <Feather name="users" size={14} color={SgateColors.t3} />
            <Text style={D.infoMetaText}> {item.totalVotes} total votes</Text>
          </View>

          {/* Deadline row */}
          <View style={[D.infoMetaRow, { marginTop: 4 }]}>
            <Feather name="clock" size={14} color={SgateColors.t3} />
            <Text style={D.infoMetaText}> {getDeadlineLabel(item.deadline)}</Text>
          </View>
        </View>

        {/* Election: candidates */}
        {isElection && (
          <View>
            <Text style={D.sectionTitle}>Candidates</Text>
            {candidates.map((candidate) => (
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

        {/* Survey: question + options */}
        {!isElection && (
          <View>
            <Text style={D.questionText}>{item.question}</Text>
            {options.map((option) => (
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

      {/* Footer: vote/submit button */}
      {showFooter && (
        <View style={D.footer}>
          {isElection ? (
            <TouchableOpacity
              activeOpacity={castVoteDisabled ? 1 : 0.8}
              style={[
                D.footerBtn,
                { backgroundColor: castVoteDisabled ? SgateColors.surface : SgateColors.green },
              ]}
              onPress={castVoteDisabled ? undefined : handleCastVote}
            >
              <Text
                style={[
                  D.footerBtnText,
                  { color: castVoteDisabled ? SgateColors.t3 : SgateColors.card },
                ]}
              >
                Cast Vote
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={submitDisabled ? 1 : 0.8}
              style={[
                D.footerBtn,
                { backgroundColor: submitDisabled ? SgateColors.surface : SgateColors.green },
              ]}
              onPress={submitDisabled ? undefined : handleSubmitSurvey}
            >
              <Text
                style={[
                  D.footerBtnText,
                  { color: submitDisabled ? SgateColors.t3 : SgateColors.card },
                ]}
              >
                Submit Response
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const D = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
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
    fontSize: 16,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Info card
  infoCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  infoTopRow: {
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
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
    letterSpacing: 0.5,
  },
  infoTitle: {
    fontSize: 17,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginTop: 10,
    lineHeight: 24,
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoMetaText: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginBottom: 12,
  },

  // Candidate card
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  candidateCardSelected: {
    backgroundColor: SgateColors.blueBg,
    borderColor: SgateColors.blue,
    borderWidth: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SgateColors.blueBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.blue,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  candidateSubtitle: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 2,
  },

  // Radio button
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
  radioOuterSelected: {
    borderColor: SgateColors.blue,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SgateColors.blue,
  },

  // Progress bar (shared)
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: SgateColors.blue,
    borderRadius: 2,
  },
  progressFillViolet: {
    height: 4,
    backgroundColor: SgateColors.violet,
    borderRadius: 2,
  },
  progressEmpty: {
    flex: 1,
    height: 4,
    backgroundColor: SgateColors.surface,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t2,
    marginTop: 4,
  },

  // Survey card
  surveyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SgateColors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  surveyCardSelected: {
    backgroundColor: '#F3EEFF',
    borderColor: SgateColors.violet,
    borderWidth: 2,
  },
  surveyOptionBody: {
    flex: 1,
    marginLeft: 10,
  },
  surveyOptionText: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },

  // Survey question
  questionText: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
    marginBottom: 16,
    lineHeight: 22,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
  },
  footerBtn: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
  },
});
