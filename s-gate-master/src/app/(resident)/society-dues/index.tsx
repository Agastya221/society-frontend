import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Constants ──────────────────────────────────────────────────────────────
const BRAND_YELLOW = '#FFD60A';
const BRAND_YELLOW_BG = '#FFFBE6';

type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE';

interface DueItem {
  id: string; 
  month: string; 
  year: number; 
  dueDate: string;
  status: DueStatus; 
  totalAmount: number; 
  paidOn?: string;
}

interface DuesSummary {
  totalOutstanding: number; 
  currentMonth: number; 
  overdue: number;
}

function normaliseDue(raw: any): DueItem {
  const d = new Date(raw.dueDate ?? raw.date ?? new Date());
  
  // Logic for status based on isPaid boolean
  let status: DueStatus = 'PENDING';
  if (raw.isPaid || raw.status === 'PAID') status = 'PAID';
  else if (new Date(raw.dueDate) < new Date()) status = 'OVERDUE';

  return {
    id:          raw.id,
    month:       d.toLocaleString('default', { month: 'long' }),
    year:        d.getFullYear(),
    dueDate:     raw.dueDate || raw.date || new Date().toISOString(),
    status:      status,
    totalAmount: raw.amount ?? raw.totalAmount ?? 0,
    paidOn:      raw.paidAt ?? raw.paidOn ?? undefined,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '---';
  // Handle ISO string or simple YYYY-MM-DD
  const dateStr = iso.split('T')[0];
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return '---';
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
      return { bg: BRAND_YELLOW_BG, text: '#996300' };
    case 'OVERDUE':
      return { bg: SgateColors.redBg, text: SgateColors.red };
    default:
      return { bg: SgateColors.surface, text: SgateColors.t3 };
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
        activeOpacity={0.7}
      >
        <View style={styles.dueCardRow}>
          <View style={styles.dueCardLeft}>
            <View style={styles.dueTitleRow}>
              <Text style={styles.dueTitle}>
                {item.month} {item.year}
              </Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.dueMeta} numberOfLines={1}>
              Due: {formatDate(item.dueDate)}
            </Text>

            {item.status === 'PAID' && item.paidOn && (
              <Text style={[styles.dueMeta, { color: SgateColors.green }]}>
                Paid on {formatDate(item.paidOn)}
              </Text>
            )}
          </View>

          <View style={styles.dueCardRight}>
            <Text style={[styles.dueAmount, item.status === 'OVERDUE' && { color: SgateColors.red }]}>
              {formatAmount(item.totalAmount)}
            </Text>
            <Feather name="chevron-right" size={16} color={SgateColors.t4} style={styles.chevron} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SocietyDuesScreen() {
  const router = useRouter();
  const [dues, setDues]       = useState<DueItem[]>([]);
  const [summary, setSummary] = useState<DuesSummary>({ totalOutstanding: 0, currentMonth: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get('/resident/dues');
        const raw = res.data?.data ?? res.data;
        const list: any[] = Array.isArray(raw) ? raw : raw?.dues ?? raw?.items ?? [];
        setDues(list.map(normaliseDue));
        
        const s = raw?.summary;
        if (s) {
          setSummary({ 
            totalOutstanding: s.totalOutstanding ?? 0, 
            currentMonth: s.currentMonth ?? 0, 
            overdue: s.overdue ?? 0 
          });
        } else {
          const pendingList = list.filter(d => (d.status || d.state) !== 'PAID');
          setSummary({
            totalOutstanding: pendingList.reduce((a, d) => a + (d.totalAmount ?? d.amount ?? 0), 0),
            currentMonth: list[0]?.totalAmount ?? list[0]?.amount ?? 0,
            overdue: list.filter(d => (d.status || d.state) === 'OVERDUE').reduce((a, d) => a + (d.totalAmount ?? d.amount ?? 0), 0),
          });
        }
      } catch (err) {
        console.error('Failed to fetch dues:', err);
      } finally { setLoading(false); }
    })();
  }, []));

  function handlePayOutstanding() {
    AppAlert.show('Payment Gateway', 'Redirecting to payment gateway...', [{ text: 'OK' }]);
  }

  const ListHeader = (
    <View style={styles.headerContainer}>
      <Text style={styles.summaryLabel}>Total Outstanding</Text>
      <Text style={styles.summaryAmount}>{formatAmount(summary.totalOutstanding)}</Text>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.boxLabel}>Current Month</Text>
          <Text style={styles.boxValue}>{formatAmount(summary.currentMonth)}</Text>
        </View>
        <View style={[styles.summaryBox, { borderLeftWidth: 1, borderLeftColor: '#F0F0F0' }]}>
          <Text style={styles.boxLabel}>Overdue</Text>
          <Text style={[styles.boxValue, { color: SgateColors.red }]}>{formatAmount(summary.overdue)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.payButton} onPress={handlePayOutstanding} activeOpacity={0.7}>
        <Text style={styles.payButtonText}>Pay Outstanding</Text>
        <Feather name="arrow-right" size={18} color={SgateColors.black} />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Payment History</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header Bar */}
      <SafeAreaView edges={['top']} style={styles.headerBar}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="arrow-left" size={24} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Society Dues</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={BRAND_YELLOW} />
        </View>
      ) : (
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
              onPress={() => router.push(`/(resident)/society-dues/${item.id}` as any)}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 38,
    fontFamily: SgateFonts.extrabold,
    color: SgateColors.t1,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 24,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 11,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  boxValue: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  payButton: {
    backgroundColor: BRAND_YELLOW,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    shadowColor: BRAND_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginTop: 40,
    marginBottom: 16,
  },

  // Due Card
  dueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginTop: 6,
  },
  dueCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueAmount: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  chevron: {
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 40,
  },
});
