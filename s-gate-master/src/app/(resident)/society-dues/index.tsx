import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { DUES, DUES_SUMMARY, DueItem, DueStatus } from '../../../mocks/societyDues';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  // '2026-03-31' → '31-03-26'
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year.slice(2)}`;
}

function formatAmount(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

// ─── Badge helpers ───────────────────────────────────────────────────────────

type BadgeStyle = { bg: string; text: string };

function getBadgeStyle(status: DueStatus): BadgeStyle {
  switch (status) {
    case 'PAID':
      return { bg: SgateColors.greenBg, text: SgateColors.green };
    case 'PENDING':
      return { bg: SgateColors.goldPale, text: '#CC8800' };
    case 'OVERDUE':
      return { bg: SgateColors.redBg, text: SgateColors.red };
  }
}

function getStatusLabel(status: DueStatus): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Pending';
    case 'OVERDUE':
      return 'Overdue';
  }
}

// ─── Due Card ────────────────────────────────────────────────────────────────

interface DueCardProps {
  item: DueItem;
  index: number;
  onPress: () => void;
}

function DueCard({ item, index, onPress }: DueCardProps) {
  const badge = getBadgeStyle(item.status);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity
        style={styles.dueCard}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={styles.dueCardRow}>
          {/* Left */}
          <View style={styles.dueCardLeft}>
            {/* Title + Badge */}
            <View style={styles.dueTitleRow}>
              <Text style={styles.dueTitle}>
                {item.month} {item.year}
              </Text>
              <View
                style={[styles.badge, { backgroundColor: badge.bg }]}
              >
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            {/* Due date */}
            <Text style={styles.dueMeta} numberOfLines={1}>
              Due: {formatDate(item.dueDate)}
            </Text>

            {/* Paid on (if applicable) */}
            {item.status === 'PAID' && item.paidOn ? (
              <Text style={styles.dueMeta}>
                Paid on {formatDate(item.paidOn)}
              </Text>
            ) : null}
          </View>

          {/* Right */}
          <View style={styles.dueCardRight}>
            <Text
              style={[
                styles.dueAmount,
                item.status === 'OVERDUE' && { color: SgateColors.red },
              ]}
            >
              {formatAmount(item.totalAmount)}
            </Text>
            <Feather
              name="chevron-right"
              size={18}
              color={SgateColors.t4}
              style={styles.chevron}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SocietyDuesScreen() {
  const router = useRouter();
  const [dues] = useState<DueItem[]>(DUES);

  function handlePayOutstanding() {
    Alert.alert('Pay Outstanding', 'Redirecting to payment gateway...', [
      { text: 'OK' },
    ]);
  }

  const ListHeader = (
    <>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Outstanding</Text>
        <Text style={styles.summaryAmount}>
          {formatAmount(DUES_SUMMARY.totalOutstanding)}
        </Text>

        <View style={styles.summaryDivider} />

        {/* Current Month */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Current Month</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.summaryRowValue}>
            {formatAmount(DUES_SUMMARY.currentMonth)}
          </Text>
        </View>

        {/* Overdue */}
        <View style={[styles.summaryRow, { marginTop: 8 }]}>
          <Text style={styles.summaryRowLabel}>Overdue</Text>
          <View style={{ flex: 1 }} />
          <Text
            style={[styles.summaryRowValue, { color: SgateColors.red }]}
          >
            {formatAmount(DUES_SUMMARY.overdue)}
          </Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayOutstanding}
          activeOpacity={0.85}
        >
          <Text style={styles.payButtonText}>Pay Outstanding</Text>
        </TouchableOpacity>
      </View>

      {/* Section header */}
      <Text style={styles.sectionHeader}>Payment History</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={SgateColors.t1} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Society Dues</Text>

        {/* Spacer same width as back button */}
        <View style={styles.headerBackBtn} />
      </View>

      <FlatList
        data={dues}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <DueCard
            item={item}
            index={index}
            onPress={() =>
              router.push(`/(resident)/society-dues/${item.id}` as any)
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SgateColors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackBtn: {
    width: 36,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginLeft: 12,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: SgateColors.black,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t4,
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 32,
    fontFamily: SgateFonts.extrabold,
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 16,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
  },
  summaryRowValue: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: '#FFFFFF',
  },
  payButton: {
    backgroundColor: SgateColors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  payButtonText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },

  // Section header
  sectionHeader: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },

  // Due Card
  dueCard: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  dueCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueCardLeft: {
    flex: 1,
  },
  dueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueTitle: {
    fontSize: 15,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: SgateFonts.bold,
  },
  dueMeta: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    marginTop: 4,
  },
  dueCardRight: {
    alignItems: 'flex-end',
  },
  dueAmount: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  chevron: {
    marginTop: 4,
  },

  // List
  listContent: {
    paddingBottom: 32,
  },
});
