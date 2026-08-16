import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';
import { AppAlert } from '@/components/ui/AppAlert';

// ─── Types ──────────────────────────────────────────────────────────────────
type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE';
type AdminDueStatus = DueStatus | 'WAIVED';

interface DueItem {
  id: string;
  month: string;
  year: number;
  dueDate: string;
  status: DueStatus;
  totalAmount: number;
  paidOn?: string;
}

interface SocietyDueItem {
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

interface AdminDueItem {
  id: string;
  month: string;
  dueDate: string;
  status: AdminDueStatus;
  totalAmount: number;
  flatNumber: string;
  blockName?: string | null;
  residentName: string;
  residentPhone?: string | null;
  paidOn?: string;
}

interface AdminDuesSummary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  waivedCount: number;
  collectedAmount: number;
  outstandingAmount: number;
}

export interface DuesScreenProps {
  /** Controls header title and detail route prefix */
  role: 'resident' | 'admin';
}

// ─── Helpers ────────────────────────────────────────────────────────────────
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
    totalAmount: raw.totalAmount ?? raw.amount ?? 0,
    paidOn:      raw.paidAt ?? raw.paidOn ?? undefined,
  };
}

function normaliseSocietyDue(raw: any): SocietyDueItem {
  const due = normaliseDue(raw);
  return {
    ...due,
    totalAmount: raw.totalAmount ?? raw.amount ?? due.totalAmount,
  };
}

function normaliseAdminDue(raw: any): AdminDueItem {
  const d = new Date(raw.dueDate ?? raw.date ?? new Date());
  const status = ['PAID', 'PENDING', 'OVERDUE', 'WAIVED'].includes(raw.status)
    ? raw.status as AdminDueStatus
    : raw.isPaid
    ? 'PAID'
    : d < new Date()
    ? 'OVERDUE'
    : 'PENDING';

  return {
    id: raw.id,
    month: raw.month || d.toLocaleString('default', { month: 'long' }),
    dueDate: raw.dueDate || raw.date || new Date().toISOString(),
    status,
    totalAmount: raw.totalAmount ?? raw.amount ?? 0,
    flatNumber: raw.flatNumber || raw.flatNo || raw.unit || '---',
    blockName: raw.blockName ?? null,
    residentName: raw.residentName || 'Unassigned',
    residentPhone: raw.residentPhone ?? null,
    paidOn: raw.paidAt ?? raw.paidOn ?? undefined,
  };
}

function normaliseAdminSummary(raw: any, list: AdminDueItem[]): AdminDuesSummary {
  const paid = list.filter(item => item.status === 'PAID');
  const pending = list.filter(item => item.status === 'PENDING');
  const overdue = list.filter(item => item.status === 'OVERDUE');
  const waived = list.filter(item => item.status === 'WAIVED');

  return {
    totalCount: raw?.totalCount ?? list.length,
    paidCount: raw?.paidCount ?? paid.length,
    pendingCount: raw?.pendingCount ?? pending.length,
    overdueCount: raw?.overdueCount ?? overdue.length,
    waivedCount: raw?.waivedCount ?? waived.length,
    collectedAmount: raw?.collectedAmount ?? paid.reduce((sum, item) => sum + item.totalAmount, 0),
    outstandingAmount: raw?.outstandingAmount
      ?? [...pending, ...overdue].reduce((sum, item) => sum + item.totalAmount, 0),
  };
}

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
const BADGE_CFG: Record<AdminDueStatus, { bg: string; text: string }> = {
  PAID:    { bg: '#FEF9C3', text: '#92400E' },
  PENDING: { bg: '#FEF3C7', text: '#B45309' },
  OVERDUE: { bg: '#FEE2E2', text: '#B91C1C' },
  WAIVED:  { bg: '#E0F2FE', text: '#0369A1' },
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
                <Feather name="check-circle" size={12} color="#92400E" />
                <Text style={S.paidOnText}>Paid on {formatDate(item.paidOn)}</Text>
              </View>
            )}
          </View>

          {/* Amount */}
          <View style={S.dueCardRight}>
            <Text style={[S.dueAmount, item.status === 'OVERDUE' && { color: '#EF4444' }]}>
              {formatAmount(item.totalAmount)}
            </Text>
            <Feather name="chevron-right" size={18} color={SgateColors.t4} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SocietyDueCard({ item, index }: { item: SocietyDueItem; index: number }) {
  const badge = BADGE_CFG[item.status] ?? BADGE_CFG.PENDING;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View style={S.societyDueCard}>
        <View style={{ flex: 1 }}>
          <View style={S.dueTitleRow}>
            <Text style={S.dueTitle}>{item.month} {item.year}</Text>
            <View style={[S.badge, { backgroundColor: badge.bg }]}>
              <Text style={[S.badgeText, { color: badge.text }]}>
                {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
          <Text style={S.dueMeta}>Society account due: {formatDate(item.dueDate)}</Text>
          {item.status === 'PAID' && item.paidOn && (
            <View style={S.paidOnRow}>
              <Feather name="check-circle" size={12} color="#92400E" />
              <Text style={S.paidOnText}>Paid on {formatDate(item.paidOn)}</Text>
            </View>
          )}
        </View>
        <Text style={[S.dueAmount, item.status === 'OVERDUE' && { color: '#EF4444' }]}>
          {formatAmount(item.totalAmount)}
        </Text>
      </View>
    </Animated.View>
  );
}

function AdminCollectionRow({
  item,
  onRemind,
  reminding,
}: {
  item: AdminDueItem;
  onRemind: (item: AdminDueItem) => void;
  reminding: boolean;
}) {
  const badge = BADGE_CFG[item.status] ?? BADGE_CFG.PENDING;
  const canRemind = item.status === 'PENDING' || item.status === 'OVERDUE';
  const flatLabel = `${item.blockName ? `${item.blockName}-` : ''}${item.flatNumber}`;

  return (
    <View style={S.collectionRow}>
      <View style={S.collectionMain}>
        <View style={S.collectionNameRow}>
          <Text style={S.collectionName} numberOfLines={1}>{item.residentName}</Text>
          <View style={[S.miniBadge, { backgroundColor: badge.bg }]}>
            <Text style={[S.miniBadgeText, { color: badge.text }]}>
              {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
            </Text>
          </View>
        </View>
        <Text style={S.collectionMeta} numberOfLines={1}>
          Flat {flatLabel} · {item.month} · Due {formatDate(item.dueDate)}
        </Text>
        {item.status === 'PAID' && item.paidOn && (
          <Text style={S.collectionPaidText}>Paid on {formatDate(item.paidOn)}</Text>
        )}
      </View>

      <View style={S.collectionRight}>
        <Text style={S.collectionAmount}>{formatAmount(item.totalAmount)}</Text>
        {canRemind && (
          <TouchableOpacity
            style={[S.remindBtn, reminding && S.remindBtnDisabled]}
            onPress={() => onRemind(item)}
            disabled={reminding}
            activeOpacity={0.8}
          >
            <Feather name="bell" size={13} color="#111827" />
            <Text style={S.remindBtnText}>{reminding ? 'Sending' : 'Remind'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────
export default function DuesScreen({ role }: DuesScreenProps) {
  const router = useRouter();
  const [dues, setDues]       = useState<DueItem[]>([]);
  const [societyDues, setSocietyDues] = useState<SocietyDueItem[]>([]);
  const [adminDues, setAdminDues] = useState<AdminDueItem[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminDuesSummary | null>(null);
  const [summary, setSummary] = useState<DuesSummary>({ totalOutstanding: 0, currentMonth: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'ALL' | DueStatus>('ALL');
  const [remindingId, setRemindingId] = useState<string | null>(null);

  // ── Config driven by role ─────────────────────────────────────────────
  const TITLE = role === 'admin' ? 'Dues & Collection' : 'Society Dues';
  // Detail always goes to the shared resident detail page (same API, same UI)
  const DETAIL_ROUTE = '/(resident)/society-dues/';

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const [res, societyRes, adminDuesRes] = await Promise.all([
          api.get('/resident/dues'),
          role === 'admin' ? api.get('/resident/society-dues').catch(() => null) : Promise.resolve(null),
          role === 'admin' ? api.get('/admin/dues', { params: { limit: 200 } }).catch(() => null) : Promise.resolve(null),
        ]);
        const raw = res.data?.data ?? res.data;
        const list: any[] = Array.isArray(raw) ? raw : raw?.dues ?? raw?.items ?? [];
        const normalisedList = list.map(normaliseDue);
        setDues(normalisedList);

        const societyRaw = societyRes?.data?.data ?? societyRes?.data;
        const societyList: any[] = Array.isArray(societyRaw) ? societyRaw : [];
        setSocietyDues(role === 'admin' ? societyList.map(normaliseSocietyDue) : []);

        const adminRaw = adminDuesRes?.data?.data ?? [];
        const adminList: AdminDueItem[] = Array.isArray(adminRaw) ? adminRaw.map(normaliseAdminDue) : [];
        setAdminDues(role === 'admin' ? adminList : []);
        setAdminSummary(role === 'admin' ? normaliseAdminSummary(adminDuesRes?.data?.summary, adminList) : null);

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
  }, [role]));

  function handlePayOutstanding() {
    const nextDue = dues.find(d => d.status !== 'PAID');
    if (!nextDue) {
      AppAlert.show('No Outstanding Dues', 'All your personal dues are already paid.', [{ text: 'OK' }]);
      return;
    }

    router.push(`${DETAIL_ROUTE}${nextDue.id}` as any);
  }

  async function handleSendReminder(item: AdminDueItem) {
    try {
      setRemindingId(item.id);
      const res = await api.post(`/admin/billing/invoices/${item.id}/reminder`);
      const message = res.data?.message || 'Reminder sent to the resident.';
      AppAlert.show('Reminder Sent', message, [{ text: 'OK' }]);
    } catch (err: any) {
      AppAlert.show(
        'Reminder Failed',
        err?.response?.data?.message || 'Could not send the reminder. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setRemindingId(null);
    }
  }

  const filteredDues = filter === 'ALL' ? dues : dues.filter(d => d.status === filter);
  const unpaidAdminDues = adminDues.filter(item => item.status === 'PENDING' || item.status === 'OVERDUE');
  const paidAdminDues = adminDues.filter(item => item.status === 'PAID');
  const unpaidCount = (adminSummary?.pendingCount ?? 0) + (adminSummary?.overdueCount ?? 0);

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
        <Feather name="arrow-right" size={20} color="#111" />
      </TouchableOpacity>

      {role === 'admin' && adminSummary && (
        <View style={S.collectionBlock}>
          <View style={S.sectionHeaderRow}>
            <Text style={S.sectionTitle}>Society Collection</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/payments' as any)} activeOpacity={0.7}>
              <Text style={S.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={S.collectionStatsGrid}>
            <View style={S.collectionStat}>
              <Text style={S.collectionStatLabel}>PAID</Text>
              <Text style={S.collectionStatValue}>{adminSummary.paidCount}/{adminSummary.totalCount}</Text>
            </View>
            <View style={S.collectionStat}>
              <Text style={S.collectionStatLabel}>UNPAID</Text>
              <Text style={[S.collectionStatValue, unpaidCount > 0 && { color: '#EF4444' }]}>{unpaidCount}</Text>
            </View>
            <View style={S.collectionStat}>
              <Text style={S.collectionStatLabel}>COLLECTED</Text>
              <Text style={S.collectionStatValue}>{formatAmount(adminSummary.collectedAmount)}</Text>
            </View>
            <View style={S.collectionStat}>
              <Text style={S.collectionStatLabel}>OUTSTANDING</Text>
              <Text style={[S.collectionStatValue, adminSummary.outstandingAmount > 0 && { color: '#EF4444' }]}>
                {formatAmount(adminSummary.outstandingAmount)}
              </Text>
            </View>
          </View>

          {unpaidAdminDues.length > 0 ? (
            <>
              <Text style={S.collectionCaption}>Unpaid residents</Text>
              {unpaidAdminDues.slice(0, 8).map(item => (
                <AdminCollectionRow
                  key={item.id}
                  item={item}
                  onRemind={handleSendReminder}
                  reminding={remindingId === item.id}
                />
              ))}
            </>
          ) : (
            <View style={S.collectionEmpty}>
              <Feather name="check-circle" size={16} color={SgateColors.green} />
              <Text style={S.collectionEmptyText}>All resident invoices are paid or waived.</Text>
            </View>
          )}

          {paidAdminDues.length > 0 && (
            <>
              <Text style={S.collectionCaption}>Recently paid</Text>
              {paidAdminDues.slice(0, 3).map(item => (
                <AdminCollectionRow
                  key={item.id}
                  item={item}
                  onRemind={handleSendReminder}
                  reminding={false}
                />
              ))}
            </>
          )}
        </View>
      )}

      {role === 'admin' && societyDues.length > 0 && (
        <View style={S.societyDuesBlock}>
          <Text style={S.sectionTitle}>Society Account Dues</Text>
          {societyDues.map((item, index) => (
            <SocietyDueCard key={item.id} item={item} index={index} />
          ))}
        </View>
      )}

      {/* ── Payment History ───────────────────────────────────────────── */}
      <Text style={S.sectionTitle}>{role === 'admin' ? 'My Payment History' : 'Payment History'}</Text>

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
              <Feather name="arrow-left" size={22} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>{TITLE}</Text>
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <AppLoader />
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
              onPress={() => router.push(`${DETAIL_ROUTE}${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={S.emptyWrap}>
              <View style={S.emptyIcon}>
                <Feather name="credit-card" size={28} color={SgateColors.goldDeep} />
              </View>
              <Text style={S.emptyTitle}>
                {role === 'admin' ? 'No dues found' : 'No dues found'}
              </Text>
              <Text style={S.emptySub}>
                {filter === 'ALL'
                  ? 'Your payment history will appear here.'
                  : `No ${filter.toLowerCase()} dues.`}
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

  // Header
  headerBg: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12 },

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
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  viewAllText: { fontSize: 13, fontFamily: SgateFonts.bold, color: '#B45309', marginBottom: 14 },

  // Admin Collection
  collectionBlock: { marginBottom: 28 },
  collectionStatsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18,
  },
  collectionStat: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  collectionStatLabel: {
    fontSize: 10, fontFamily: SgateFonts.bold, color: '#9CA3AF',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  collectionStatValue: { fontSize: 16, fontFamily: SgateFonts.extrabold, color: '#111827' },
  collectionCaption: {
    fontSize: 12, fontFamily: SgateFonts.bold, color: '#6B7280',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },
  collectionRow: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  collectionMain: { flex: 1, minWidth: 0 },
  collectionNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  collectionName: { flex: 1, fontSize: 14, fontFamily: SgateFonts.bold, color: '#111827' },
  collectionMeta: { fontSize: 12, fontFamily: SgateFonts.regular, color: '#6B7280' },
  collectionPaidText: { fontSize: 11, fontFamily: SgateFonts.medium, color: SgateColors.green, marginTop: 4 },
  collectionRight: { alignItems: 'flex-end', gap: 8 },
  collectionAmount: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#111827' },
  miniBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  miniBadgeText: { fontSize: 9, fontFamily: SgateFonts.bold, letterSpacing: 0.2 },
  remindBtn: {
    height: 30, paddingHorizontal: 10, borderRadius: 999, backgroundColor: SgateColors.gold,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  remindBtnDisabled: { opacity: 0.65 },
  remindBtnText: { fontSize: 11, fontFamily: SgateFonts.bold, color: '#111827' },
  collectionEmpty: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  collectionEmptyText: { flex: 1, fontSize: 13, fontFamily: SgateFonts.medium, color: '#6B7280' },

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
  societyDuesBlock: { marginBottom: 24 },
  societyDueCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: '#9CA3AF', textAlign: 'center' },
});
