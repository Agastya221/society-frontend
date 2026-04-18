import React, { useState } from 'react';
import { View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Local types ─────────────────────────────────────────────────────────────
type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE';
interface DueLineItem { label: string; amount: number; isRed?: boolean }
interface PaymentRecord { date: string; method: string; amount: number; txnId: string }
interface DueItem {
  id: string; month: string; year: number; dueDate: string; flat: string; society: string;
  status: DueStatus; totalAmount: number; lineItems: DueLineItem[];
  paidOn?: string; paidVia?: string; paymentHistory?: PaymentRecord[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year.slice(2)}`;
}

function formatAmount(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

interface LineItemRowProps {
  item: DueLineItem;
}

function LineItemRow({ item }: LineItemRowProps) {
  return (
    <View style={styles.lineItemRow}>
      {item.isRed ? (
        <View style={styles.lineItemLabelRow}>
          <Feather
            name="alert-triangle"
            size={12}
            color={SgateColors.red}
            style={styles.penaltyIcon}
          />
          <Text style={[styles.lineItemLabel, { color: SgateColors.red }]}>
            {item.label}
          </Text>
        </View>
      ) : (
        <Text style={[styles.lineItemLabel, styles.lineItemLabelNormal]}>
          {item.label}
        </Text>
      )}
      <Text
        style={[
          styles.lineItemAmount,
          item.isRed && { color: SgateColors.red },
        ]}
      >
        {formatAmount(item.amount)}
      </Text>
    </View>
  );
}

interface TimelineRowProps {
  record: PaymentRecord;
}

function TimelineRow({ record }: TimelineRowProps) {
  return (
    <View style={styles.timelineRow}>
      <Feather
        name="check-circle"
        size={16}
        color={SgateColors.green}
        style={styles.timelineIcon}
      />
      <View style={styles.timelineContent}>
        <View style={styles.timelineTopRow}>
          <Text style={styles.timelineDate}>{formatDate(record.date)}</Text>
          <Text style={styles.timelineMethod}>{record.method}</Text>
          <Text style={styles.timelineAmount}>
            {formatAmount(record.amount)}
          </Text>
        </View>
        <Text style={styles.timelineTxn} numberOfLines={1}>
          {record.txnId}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SocietyDueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const original: DueItem | null = null; // Will be fetched by ID when GET /resident/dues/:id is available
  const [due, setDue] = useState<DueItem | null>(original);

  if (!due) {
    return (
      <View style={styles.safeArea}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
            <View style={styles.notFoundContainer}>
              <Text style={styles.notFoundText}>Not found</Text>
            </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Banner config ──────────────────────────────────────────────────────────
  type BannerConfig = {
    bg: string;
    iconName: React.ComponentProps<typeof Feather>['name'];
    iconColor: string;
    text: string;
    textColor: string;
  };

  function getBannerConfig(): BannerConfig {
    switch (due!.status) {
      case 'PAID':
        return {
          bg: SgateColors.greenBg,
          iconName: 'check-circle',
          iconColor: SgateColors.green,
          text: 'Payment Completed',
          textColor: SgateColors.green,
        };
      case 'PENDING':
        return {
          bg: SgateColors.goldPale,
          iconName: 'clock',
          iconColor: '#CC8800',
          text: `Payment Pending · Due ${formatDate(due!.dueDate)}`,
          textColor: '#CC8800',
        };
      case 'OVERDUE':
        return {
          bg: SgateColors.redBg,
          iconName: 'alert-circle',
          iconColor: SgateColors.red,
          text: 'Overdue · Please pay immediately',
          textColor: SgateColors.red,
        };
    }
  }

  const banner = getBannerConfig();

  // ── Payment handler ────────────────────────────────────────────────────────
  function handlePay() {
    const amountStr = formatAmount(due!.totalAmount);
    AppAlert.show(
      'Confirm Payment',
      `Pay ${amountStr} for ${due!.month} ${due!.year}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: () => {
            setDue((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'PAID',
                    paidOn: new Date().toISOString().split('T')[0],
                    paidVia: 'UPI',
                  }
                : null,
            );
            AppAlert.show(
              'Payment Successful',
              `Your payment of ${amountStr} was successful!`,
            );
          },
        },
      ],
    );
  }

  function handleDownloadReceipt() {
    AppAlert.show('Download', 'Receipt download will be available soon.');
  }

  const isPaid = due.status === 'PAID';
  const isActionable = due.status === 'PENDING' || due.status === 'OVERDUE';

  return (
    <View style={styles.safeArea}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: SgateColors.card }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {due.month} {due.year}
          </Text>
          <View style={styles.headerBackBtn} />
        </View>
      </SafeAreaView>

      {/* ── Status Banner ── */}
      <View style={[styles.statusBanner, { backgroundColor: banner.bg }]}>
        <Feather name={banner.iconName} size={16} color={banner.iconColor} />
        <Text style={[styles.bannerText, { color: banner.textColor }]}>
          {'  '}{banner.text}
        </Text>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isActionable && { paddingBottom: 100 },
          isPaid && { paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bill Breakdown</Text>

          {due.lineItems.map((lineItem, idx) => (
            <LineItemRow key={idx} item={lineItem} />
          ))}

          <View style={styles.cardDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatAmount(due.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={[styles.card, styles.cardMarginTop]}>
          <Text style={styles.cardTitle}>Details</Text>

          <DetailRow label="Due Date" value={formatDate(due.dueDate)} />
          <DetailRow label="Flat" value={due.flat} />
          <DetailRow label="Society" value={due.society} />

          {isPaid && due.paidOn ? (
            <DetailRow label="Paid On" value={formatDate(due.paidOn)} />
          ) : null}
          {isPaid && due.paidVia ? (
            <DetailRow label="Paid Via" value={due.paidVia} />
          ) : null}
        </View>

        {/* Payment Timeline (PAID only) */}
        {isPaid &&
          due.paymentHistory &&
          due.paymentHistory.length > 0 && (
            <View style={[styles.card, styles.cardMarginTop]}>
              <Text style={styles.cardTitle}>Payment Timeline</Text>
              {due.paymentHistory.map((record, idx) => (
                <TimelineRow key={idx} record={record} />
              ))}
            </View>
          )}
      </ScrollView>

      {/* ── Bottom Action ── */}
      {isActionable && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={handlePay}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>
              Pay {formatAmount(due.totalAmount)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isPaid && (
        <View style={styles.bottomBarPaid}>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownloadReceipt}
            activeOpacity={0.75}
          >
            <View style={styles.downloadBtnInner}>
              <Feather
                name="download"
                size={16}
                color={SgateColors.t2}
                style={styles.downloadIcon}
              />
              <Text style={styles.downloadBtnText}>Download Receipt</Text>
            </View>
          </TouchableOpacity>
          {due.paidVia ? (
            <Text style={styles.paidViaText}>Paid via {due.paidVia}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SgateColors.bg,
  },

  notFoundContainer: {
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
    backgroundColor: SgateColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackBtn: {
    width: 36,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },

  // Status Banner
  statusBanner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bannerText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Cards
  card: {
    backgroundColor: SgateColors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: SgateColors.borderSoft,
  },
  cardMarginTop: {
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t2,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: SgateColors.borderSoft,
    marginVertical: 12,
  },

  // Line items
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineItemLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  penaltyIcon: {
    marginRight: 4,
  },
  lineItemLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    flex: 1,
  },
  lineItemLabelNormal: {
    color: SgateColors.t2,
  },
  lineItemAmount: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },

  // Total row
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: SgateFonts.extrabold,
    color: SgateColors.t1,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
    textAlign: 'right',
    flexShrink: 1,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineDate: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t1,
  },
  timelineMethod: {
    fontSize: 13,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
    flex: 1,
  },
  timelineAmount: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  timelineTxn: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t4,
    marginTop: 2,
  },

  // Bottom bar — actionable (PENDING / OVERDUE)
  bottomBar: {
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
    padding: 16,
  },
  payBtn: {
    backgroundColor: SgateColors.gold,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },

  // Bottom bar — PAID
  bottomBarPaid: {
    backgroundColor: SgateColors.card,
    borderTopWidth: 1,
    borderTopColor: SgateColors.borderSoft,
    padding: 16,
  },
  downloadBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SgateColors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadIcon: {
    marginRight: 8,
  },
  downloadBtnText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },
  paidViaText: {
    fontSize: 12,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t3,
    textAlign: 'center',
    marginTop: 8,
  },
});
