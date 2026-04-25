import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';

// ─── Types ──────────────────────────────────────────────────────────────────
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
  let status: DueStatus = 'PENDING';
  if (raw.isPaid || raw.status === 'PAID') status = 'PAID';
  else if (new Date(raw.dueDate) < new Date()) status = 'OVERDUE';
  return {
    id:          raw.id,
    month:       d.toLocaleString('default', { month: 'long' }),
    year:        d.getFullYear(),
    dueDate:     raw.dueDate || raw.date || new Date().toISOString(),
    status,
    totalAmount: raw.amount ?? raw.totalAmount ?? 0,
    paidOn:      raw.paidAt ?? raw.paidOn ?? undefined,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  if (!iso) return '---';
  const dateStr = iso.split('T')[0];
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return '---';
  return `${day}-${month}-${year.slice(2)}`;
}

function formatAmount(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

// ─── Badge Config ───────────────────────────────────────────────────────────
const BADGE_CFG: Record<DueStatus, { bg: string; text: string }> = {
  PAID:    { bg: '#FEF9C3', text: '#92400E' },
  PENDING: { bg: '#FEF3C7', text: '#B45309' },
  OVERDUE: { bg: '#FEE2E2', text: '#B91C1C' },
};

// ─── Due Card ───────────────────────────────────────────────────────────────
function DueCard({ item, index, onPress }: { item: DueItem; index: number; onPress: () => void }) {
  const badge = BADGE_CFG[item.status] ?? BADGE_CFG.PENDING;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity style={S.dueCard} onPress={onPress} activeOpacity={0.7}>
        <View style={S.dueCardRow}>
          <View style={{ flex: 1 }}>
            {/* Title + Badge */}
            <View style={S.dueTitleRow}>
              <Text style={S.dueTitle}>{item.month} {item.year}</Text>
              <View style={[S.badge, { backgroundColor: badge.bg }]}>
                <Text style={[S.badgeText, { color: badge.text }]}>
                  {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                </Text>
              </View>
            </View>

            {/* Meta */}
            <Text style={S.dueMeta}>Due: {formatDate(item.dueDate)}</Text>
            {item.status === 'PAID' && item.paidOn && (
              <View style={S.paidOnRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={12} color="#92400E" />
                <Text style={S.paidOnText}>Paid on {formatDate(item.paidOn)}</Text>
              </View>
            )}
          </View>

          {/* Amount */}
          <View style={S.dueCardRight}>
            <Text style={[S.dueAmount, item.status === 'OVERDUE' && { color: '#EF4444' }]}>
              {formatAmount(item.totalAmount)}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={SgateColors.t4} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────
export default function SocietyDuesScreen() {
  const router = useRouter();
  const [dues, setDues]       = useState<DueItem[]>([]);
  const [summary, setSummary] = useState<DuesSummary>({ totalOutstanding: 0, currentMonth: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'ALL' | DueStatus>('ALL');

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get('/resident/dues');
        const raw = res.data?.data ?? res.data;
        const list: any[] = Array.isArray(raw) ? raw : raw?.dues ?? raw?.items ?? [];
        const normalisedList = list.map(normaliseDue);
        setDues(normalisedList);

        const pendingList = normalisedList.filter(d => d.status !== 'PAID');
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const overdueList = normalisedList.filter(d => d.status === 'OVERDUE');
        const currentMonthBill = normalisedList.find(d => {
          const date = new Date(d.dueDate);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        setSummary({
          totalOutstanding: pendingList.reduce((a, d) => a + d.totalAmount, 0),
          currentMonth: currentMonthBill?.totalAmount ?? 0,
          overdue: overdueList.reduce((a, d) => a + d.totalAmount, 0),
        });
      } catch (err) {
        console.error('Failed to fetch dues:', err);
      } finally { setLoading(false); }
    })();
  }, []));

  function handlePayOutstanding() {
    AppAlert.show('Payment Gateway', 'Redirecting to payment gateway...', [{ text: 'OK' }]);
  }

  const filteredDues = filter === 'ALL' ? dues : dues.filter(d => d.status === filter);

  const ListHeader = (
    <View style={S.listHeader}>
      {/* ── Summary Hero ──────────────────────────────────────────────── */}
      <View style={S.heroCard}>
        <Text style={S.heroLabel}>TOTAL OUTSTANDING</Text>
        <Text style={S.heroAmount}>{formatAmount(summary.totalOutstanding)}</Text>

        {/* Yellow accent line */}
        <View style={S.heroAccent} />

        {/* Grid */}
        <View style={S.gridRow}>
          <View style={S.gridItem}>
            <Text style={S.gridLabel}>CURRENT MONTH</Text>
            <Text style={S.gridValue}>{formatAmount(summary.currentMonth)}</Text>
          </View>
          <View style={S.gridDivider} />
          <View style={S.gridItem}>
            <Text style={S.gridLabel}>OVERDUE</Text>
            <Text style={[S.gridValue, summary.overdue > 0 && { color: '#EF4444' }]}>
              {formatAmount(summary.overdue)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Pay Button ────────────────────────────────────────────────── */}
      <TouchableOpacity style={S.payBtn} onPress={handlePayOutstanding} activeOpacity={0.85}>
        <Text style={S.payBtnText}>Pay Outstanding</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#111" />
      </TouchableOpacity>

      {/* ── Payment History ───────────────────────────────────────────── */}
      <Text style={S.sectionTitle}>Payment History</Text>

      {/* ── Filter Chips ──────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
        {(['ALL', 'PAID', 'PENDING', 'OVERDUE'] as const).map(f => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[S.chip, active && S.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[S.chipText, active && S.chipTextActive]}>
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={S.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={S.headerBg}>
        <SafeAreaView edges={['top']}>
          <View style={S.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Society Dues</Text>
            <View style={{ width: 32 }} />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={SgateColors.gold} />
        </View>
      ) : (
        <FlatList
          data={filteredDues}
          keyExtractor={item => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={S.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <DueCard
              item={item}
              index={index}
              onPress={() => router.push(`/(resident)/society-dues/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={S.emptyWrap}>
              <View style={S.emptyIcon}>
                <MaterialCommunityIcons name="receipt-text-check-outline" size={32} color={SgateColors.goldDeep} />
              </View>
              <Text style={S.emptyTitle}>No dues found</Text>
              <Text style={S.emptySub}>
                {filter === 'ALL' ? 'Your payment history will appear here.' : `No ${filter.toLowerCase()} dues.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerBg: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, textAlign: 'center' },

  listContent: { paddingBottom: 40 },
  listHeader: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 },

  // Hero Summary
  heroCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 11, fontFamily: SgateFonts.bold, color: '#9CA3AF',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  heroAmount: {
    fontSize: 36, fontFamily: SgateFonts.extrabold, color: '#111827', marginBottom: 16,
  },
  heroAccent: {
    width: 40, height: 3, borderRadius: 2, backgroundColor: SgateColors.gold, marginBottom: 20,
  },
  gridRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  gridItem: { flex: 1, alignItems: 'center' },
  gridDivider: { width: 1, height: 36, backgroundColor: '#EEEEEE' },
  gridLabel: {
    fontSize: 10, fontFamily: SgateFonts.bold, color: '#9CA3AF',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  gridValue: { fontSize: 17, fontFamily: SgateFonts.bold, color: '#111827' },

  // Pay Button
  payBtn: {
    backgroundColor: SgateColors.gold, borderRadius: 16, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: SgateColors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
    marginBottom: 32,
  },
  payBtnText: { fontSize: 16, fontFamily: SgateFonts.bold, color: '#111' },

  // Section Title
  sectionTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: '#111827', marginBottom: 14 },

  // Filter Chips
  filterRow: { gap: 8, paddingBottom: 16 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: SgateColors.gold,
    shadowColor: SgateColors.gold, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  chipText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: '#6B7280' },
  chipTextActive: { color: '#111', fontFamily: SgateFonts.bold },

  // Due Card
  dueCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 20, marginBottom: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  dueCardRow: { flexDirection: 'row', alignItems: 'center' },
  dueTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dueTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: '#111827' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 10 },
  badgeText: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.3 },
  dueMeta: { fontSize: 12, fontFamily: SgateFonts.regular, color: '#9CA3AF', marginTop: 2 },
  paidOnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  paidOnText: { fontSize: 11, fontFamily: SgateFonts.medium, color: '#92400E' },
  dueCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueAmount: { fontSize: 16, fontFamily: SgateFonts.bold, color: '#111827' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: '#9CA3AF', textAlign: 'center' },
});
