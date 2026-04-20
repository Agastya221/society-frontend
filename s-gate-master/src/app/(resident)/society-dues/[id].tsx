import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';
import api from '../../../services/api';
import { AppAlert } from '../../../components/ui/AppAlert';
import { useAuthStore } from '../../../store/useAuthStore';

// ─── Constants ──────────────────────────────────────────────────────────────
const BRAND_YELLOW = '#FFD60A';
const BRAND_YELLOW_BG = '#FFFBE6';

type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE';
interface DueLineItem { label: string; amount: number; isRed?: boolean }
interface PaymentRecord { date: string; method: string; amount: number; txnId: string }

interface DueItem {
  id: string; 
  month: string; 
  year: number; 
  dueDate: string; 
  flat: string; 
  society: string;
  status: DueStatus; 
  totalAmount: number; 
  lineItems: DueLineItem[];
  paidOn?: string; 
  paidVia?: string; 
  paymentHistory?: PaymentRecord[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '---';
  const dateStr = iso.split('T')[0];
  const parts = dateStr.split('-');
  if (parts.length < 3) return '---';
  const [year, month, day] = parts;
  return `${day}-${month}-${year.slice(2)}`;
}

function formatAmount(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

function normaliseDetailedDue(raw: any, userProfile: any): DueItem {
  const d = new Date(raw.dueDate || raw.date || new Date());
  
  // Logic for status based on isPaid boolean
  let status: DueStatus = 'PENDING';
  if (raw.isPaid || raw.status === 'PAID') status = 'PAID';
  else if (new Date(raw.dueDate) < new Date()) status = 'OVERDUE';

  const defaultLineItems: DueLineItem[] = [
    { label: 'Society Maintenance', amount: raw.amount ?? raw.totalAmount ?? 0 }
  ];

  // Resolve real clear data from user profile if not in bill
  const flatNumber = userProfile?.flat?.number 
    ? `${userProfile.flat.block?.name ? userProfile.flat.block.name + '-' : ''}${userProfile.flat.number}`
    : raw.flatNo || raw.unit || '---';

  return {
    id: raw.id,
    month: d.toLocaleString('default', { month: 'long' }),
    year: d.getFullYear(),
    dueDate: raw.dueDate || raw.date || new Date().toISOString(),
    flat: flatNumber,
    society: userProfile?.society?.name || raw.societyName || 'Your Society',
    status: status,
    totalAmount: raw.amount ?? raw.totalAmount ?? 0,
    lineItems: raw.lineItems || raw.items || defaultLineItems,
    paidOn: raw.paidAt ?? raw.paidOn ?? undefined,
    paidVia: raw.paidVia || raw.paymentMethod || undefined,
    paymentHistory: raw.paymentHistory || raw.history || [],
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function LineItemRow({ item }: { item: DueLineItem }) {
  return (
    <View style={styles.lineItemRow}>
      <View style={styles.lineItemLabelRow}>
        {item.isRed && <Feather name="alert-triangle" size={12} color={SgateColors.red} style={{ marginRight: 6 }} />}
        <Text style={[styles.lineItemLabel, item.isRed && { color: SgateColors.red }]}>
          {item.label}
        </Text>
      </View>
      <Text style={[styles.lineItemAmount, item.isRed && { color: SgateColors.red }]}>
        {formatAmount(item.amount)}
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SocietyDueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [due, setDue] = useState<DueItem | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        setLoading(true);
        let rawData = null;
        
        try {
          const res = await api.get(`/resident/dues/${id}`);
          rawData = res.data?.data ?? res.data;
        } catch (e) {
          const listRes = await api.get('/resident/dues');
          const listRaw = listRes.data?.data ?? listRes.data;
          const list: any[] = Array.isArray(listRaw) ? listRaw : listRaw?.dues ?? listRaw?.items ?? [];
          rawData = list.find(it => it.id === id);
        }

        if (rawData) {
          setDue(normaliseDetailedDue(rawData, user));
        }
      } catch (err) {
        console.error('Failed to fetch due detail from list fallback:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]));

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={BRAND_YELLOW} />
      </View>
    );
  }

  if (!due) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.headerBar}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={SgateColors.t1} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Details</Text>
          </View>
        </SafeAreaView>
        <View style={styles.emptyContent}>
          <Feather name="alert-circle" size={48} color={SgateColors.t4} />
          <Text style={styles.emptyText}>Due record not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: SgateColors.t2, fontFamily: SgateFonts.bold }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPaid = due.status === 'PAID';
  const isActionable = due.status === 'PENDING' || due.status === 'OVERDUE';

  const bannerConfig = {
    PAID: { bg: SgateColors.greenBg, text: 'Payment Completed', color: SgateColors.green, icon: 'check-circle' },
    PENDING: { bg: BRAND_YELLOW_BG, text: `Due by ${formatDate(due.dueDate)}`, color: '#996300', icon: 'clock' },
    OVERDUE: { bg: SgateColors.redBg, text: 'Overdue · Pay immediately', color: SgateColors.red, icon: 'alert-circle' },
  }[due.status];

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerBar}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="arrow-left" size={24} color={SgateColors.t1} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{due.month} {due.year}</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Strip */}
        <View style={[styles.statusStrip, { backgroundColor: bannerConfig.bg }]}>
          <Feather name={bannerConfig.icon as any} size={16} color={bannerConfig.color} />
          <Text style={[styles.statusText, { color: bannerConfig.color }]}>{bannerConfig.text}</Text>
        </View>

        {/* Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Bill Breakdown</Text>
          {due.lineItems.map((item, idx) => <LineItemRow key={idx} item={item} />)}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatAmount(due.totalAmount)}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Bill Details</Text>
          <DetailRow label="Flat" value={due.flat} />
          <DetailRow label="Society" value={due.society} />
          <DetailRow label="Bill ID" value={due.id.slice(0, 8).toUpperCase()} />
          
          {isPaid && (
            <>
              <View style={styles.divider} />
              <DetailRow label="Paid On" value={formatDate(due.paidOn!)} />
              <DetailRow label="Payment Method" value={due.paidVia || 'UPI'} />
            </>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      {isActionable && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.payMainBtn} activeOpacity={0.8} onPress={() => {
            AppAlert.show('Confirm Payment', `Pay ${formatAmount(due.totalAmount)} for ${due.month}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Pay Now', onPress: () => router.back() }
            ]);
          }}>
            <Text style={styles.payMainBtnText}>Pay {formatAmount(due.totalAmount)}</Text>
            <Feather name="arrow-right" size={20} color={SgateColors.black} />
          </TouchableOpacity>
        </View>
      )}

      {isPaid && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7} onPress={() => AppAlert.show('Success', 'Receipt download initiated.')}>
            <Feather name="download" size={18} color={SgateColors.t1} style={{ marginRight: 8 }} />
            <Text style={styles.downloadBtnText}>Download Receipt</Text>
          </TouchableOpacity>
        </View>
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
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
    marginLeft: 8,
  },
  
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontFamily: SgateFonts.semibold,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 12,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },

  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lineItemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lineItemLabel: {
    fontSize: 14,
    fontFamily: SgateFonts.regular,
    color: SgateColors.t2,
  },
  lineItemAmount: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: SgateFonts.bold,
    color: SgateColors.t1,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: SgateFonts.extrabold,
    color: SgateColors.t1,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  payMainBtn: {
    backgroundColor: BRAND_YELLOW,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: BRAND_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payMainBtnText: {
    fontSize: 16,
    fontFamily: SgateFonts.bold,
    color: SgateColors.black,
  },

  downloadBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnText: {
    fontSize: 14,
    fontFamily: SgateFonts.semibold,
    color: SgateColors.t1,
  },

  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: SgateFonts.medium,
    color: SgateColors.t3,
  },
});
