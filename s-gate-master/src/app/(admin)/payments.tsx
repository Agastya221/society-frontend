import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';
import * as billingService from '@/services/billingService';
import { TextInput } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────
type DueStatus = 'PAID' | 'PENDING' | 'OVERDUE';
type FilterTab = 'ALL' | DueStatus;

interface FlatDue {
    id: string;
    flatNumber: string;
    block: string;
    residentName: string;
    amount: number;
    status: DueStatus;
    dueDate: string;
    month: string;
    paidAt?: string;
    paymentRef?: string;
}

// ─── Mock data (replace fetchDues body when backend is ready) ─────────────────
const MOCK_DUES: FlatDue[] = [
    { id: '1',  flatNumber: '101', block: 'A', residentName: 'Rajesh Kumar',   amount: 2500, status: 'PAID',    dueDate: '2026-04-10', month: 'Apr 2026', paidAt: '2026-04-06', paymentRef: 'PAY_001' },
    { id: '2',  flatNumber: '102', block: 'A', residentName: 'Priya Sharma',   amount: 2500, status: 'PENDING', dueDate: '2026-04-10', month: 'Apr 2026' },
    { id: '3',  flatNumber: '201', block: 'A', residentName: 'Anil Mehta',     amount: 2500, status: 'OVERDUE', dueDate: '2026-03-10', month: 'Mar 2026' },
    { id: '4',  flatNumber: '202', block: 'A', residentName: 'Sunita Patel',   amount: 2500, status: 'PAID',    dueDate: '2026-04-10', month: 'Apr 2026', paidAt: '2026-04-05' },
    { id: '5',  flatNumber: '101', block: 'B', residentName: 'Vikram Singh',   amount: 3000, status: 'PENDING', dueDate: '2026-04-10', month: 'Apr 2026' },
    { id: '6',  flatNumber: '102', block: 'B', residentName: 'Deepa Nair',     amount: 3000, status: 'OVERDUE', dueDate: '2026-02-10', month: 'Feb 2026' },
    { id: '7',  flatNumber: '201', block: 'B', residentName: 'Suresh Reddy',   amount: 3000, status: 'PAID',    dueDate: '2026-04-10', month: 'Apr 2026', paidAt: '2026-04-03' },
    { id: '8',  flatNumber: '301', block: 'A', residentName: 'Kavitha Iyer',   amount: 2500, status: 'PENDING', dueDate: '2026-04-10', month: 'Apr 2026' },
    { id: '9',  flatNumber: '302', block: 'A', residentName: 'Mohit Agarwal',  amount: 2500, status: 'OVERDUE', dueDate: '2026-01-10', month: 'Jan 2026' },
    { id: '10', flatNumber: '401', block: 'C', residentName: 'Neeha Gupta',    amount: 3500, status: 'PAID',    dueDate: '2026-04-10', month: 'Apr 2026', paidAt: '2026-04-07' },
];

const STATUS_CONFIG: Record<DueStatus, { label: string; color: string; bg: string }> = {
    PAID:    { label: 'Paid',    color: SgateColors.green,    bg: SgateColors.greenBg  },
    PENDING: { label: 'Pending', color: SgateColors.goldDeep, bg: SgateColors.goldPale },
    OVERDUE: { label: 'Overdue', color: SgateColors.red,      bg: SgateColors.redBg    },
};

const FILTER_TABS: FilterTab[] = ['ALL', 'PENDING', 'OVERDUE', 'PAID'];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PaymentsScreen() {
    const insets = useSafeAreaInsets();

    const [dues, setDues]                 = useState<FlatDue[]>([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [isMock, setIsMock]             = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
    const [selectedDue, setSelectedDue]   = useState<FlatDue | null>(null);

    // Billing Modals
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showPenaltyModal, setShowPenaltyModal]   = useState(false);
    const [billingAmount, setBillingAmount] = useState('2500');
    const [penaltyAmount, setPenaltyAmount] = useState('500');
    const [isProcessing, setIsProcessing]   = useState(false);

    const fetchDues = async () => {
        try {
            const res = await api.get('/admin/dues');
            const data: FlatDue[] = res.data?.data ?? [];
            setDues(data);
            setIsMock(false);
        } catch {
            setDues(MOCK_DUES);
            setIsMock(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchDues(); }, []));
    const onRefresh = () => { setRefreshing(true); fetchDues(); };

    const handleGenerateInvoices = async () => {
        setIsProcessing(true);
        const success = await billingService.generateBulkInvoices('Next Month', parseInt(billingAmount));
        setIsProcessing(false);
        if (success) {
            setShowGenerateModal(false);
            Alert.alert('Success', `Auto-generated invoices for all flats at ₹${billingAmount} each.`);
            fetchDues();
        }
    };

    const handleApplyPenalty = async () => {
        setIsProcessing(true);
        const success = await billingService.applyLatePenalty(parseInt(penaltyAmount));
        setIsProcessing(false);
        if (success) {
            setShowPenaltyModal(false);
            Alert.alert('Success', `Late payment penalty of ₹${penaltyAmount} added to overdue accounts.`);
            fetchDues();
        }
    };

    const filtered = useMemo(() =>
        activeFilter === 'ALL' ? dues : dues.filter(d => d.status === activeFilter),
        [dues, activeFilter]
    );

    const totalCollected = dues.filter(d => d.status === 'PAID').reduce((s, d) => s + d.amount, 0);
    const totalPending   = dues.filter(d => d.status === 'PENDING').reduce((s, d) => s + d.amount, 0);
    const totalOverdue   = dues.filter(d => d.status === 'OVERDUE').reduce((s, d) => s + d.amount, 0);

    const handleSendReminder = (due: FlatDue) => {
        setSelectedDue(null);
        Alert.alert(
            'Send Reminder',
            `Send a payment reminder to ${due.residentName} (${due.block}-${due.flatNumber})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send', onPress: () => {
                        Alert.alert('Reminder Sent', `Notification sent to ${due.residentName}`);
                    }
                },
            ]
        );
    };

    const renderDue = ({ item }: { item: FlatDue }) => {
        const conf = STATUS_CONFIG[item.status];
        return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedDue(item)} activeOpacity={0.8}>
                <View style={styles.cardLeft}>
                    <View style={[styles.flatBubble, { backgroundColor: conf.bg }]}>
                        <Text style={[styles.flatBubbleText, { color: conf.color }]}>{item.block}</Text>
                        <Text style={[styles.flatBubbleNumber, { color: conf.color }]}>{item.flatNumber}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.residentName} numberOfLines={1}>{item.residentName}</Text>
                        <Text style={styles.cardMonth}>{item.month}</Text>
                        {item.status === 'PAID' && item.paidAt ? (
                            <Text style={styles.cardDate}>Paid on {item.paidAt}</Text>
                        ) : (
                            <Text style={[styles.cardDate, item.status === 'OVERDUE' && styles.overdueDate]}>
                                Due {item.dueDate}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>₹{item.amount.toLocaleString()}</Text>
                    <View style={[styles.badge, { backgroundColor: conf.bg }]}>
                        <Text style={[styles.badgeText, { color: conf.color }]}>{conf.label}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.safe, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Finance & Billing</Text>
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={SgateColors.gold} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.safe, { paddingTop: insets.top }]}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Finance & Billing</Text>
                <TouchableOpacity style={styles.navActionBtn} onPress={() => setShowGenerateModal(true)}>
                    <Feather name="file-plus" size={20} color={SgateColors.goldDeep} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navActionBtn} onPress={() => setShowPenaltyModal(true)}>
                    <Feather name="alert-triangle" size={20} color={SgateColors.red} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={renderDue}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        tintColor={SgateColors.gold} colors={[SgateColors.gold]} />
                }
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <Animated.View entering={FadeInDown.delay(0).springify()}>
                        {/* Summary */}
                        <View style={styles.summaryRow}>
                            <SummaryCard label="Collected" amount={totalCollected} color={SgateColors.green}    bg={SgateColors.greenBg}  icon="trending-up" />
                            <SummaryCard label="Pending"   amount={totalPending}   color={SgateColors.goldDeep} bg={SgateColors.goldPale} icon="clock" />
                            <SummaryCard label="Overdue"   amount={totalOverdue}   color={SgateColors.red}      bg={SgateColors.redBg}    icon="alert-circle" />
                        </View>

                        {/* Filter chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                            {FILTER_TABS.map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(tab)}
                                >
                                    <Text style={[styles.filterChipText, activeFilter === tab && styles.filterChipTextActive]}>
                                        {tab === 'ALL' ? 'All' : STATUS_CONFIG[tab as DueStatus].label}
                                        {tab !== 'ALL' && ` (${dues.filter(d => d.status === tab).length})`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.sectionLabel}>
                            {filtered.length} {activeFilter === 'ALL' ? 'TOTAL' : activeFilter} RECORDS
                        </Text>
                    </Animated.View>
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Feather name="credit-card" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No Records</Text>
                        <Text style={styles.emptySubtitle}>No dues found for the selected filter.</Text>
                    </View>
                }
            />

            {/* ── Detail Modal ─────────────────────────────────────────────── */}
            <Modal visible={!!selectedDue} transparent animationType="slide" onRequestClose={() => setSelectedDue(null)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedDue(null)}>
                    <View style={styles.detailSheet}>
                        <View style={styles.sheetHandle} />
                        {selectedDue && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View>
                                        <Text style={styles.detailFlat}>{selectedDue.block}-{selectedDue.flatNumber}</Text>
                                        <Text style={styles.detailName}>{selectedDue.residentName}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: STATUS_CONFIG[selectedDue.status].bg }]}>
                                        <Text style={[styles.badgeText, { color: STATUS_CONFIG[selectedDue.status].color }]}>
                                            {STATUS_CONFIG[selectedDue.status].label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailRows}>
                                    <DetailRow label="Month"    value={selectedDue.month} />
                                    <DetailRow label="Amount"   value={`₹${selectedDue.amount.toLocaleString()}`} />
                                    <DetailRow label="Due Date" value={selectedDue.dueDate} />
                                    {selectedDue.paidAt    && <DetailRow label="Paid On" value={selectedDue.paidAt} />}
                                    {selectedDue.paymentRef && <DetailRow label="Ref #"   value={selectedDue.paymentRef} />}
                                </View>

                                {selectedDue.status !== 'PAID' && (
                                    <TouchableOpacity style={styles.reminderBtn} onPress={() => handleSendReminder(selectedDue)}>
                                        <Feather name="bell" size={16} color={SgateColors.card} style={{ marginRight: 8 }} />
                                        <Text style={styles.reminderBtnText}>Send Reminder</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={styles.dismissBtn} onPress={() => setSelectedDue(null)}>
                                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Generate Invoices Modal ──────────────────────────────────────── */}
            <Modal visible={showGenerateModal} transparent animationType="fade" onRequestClose={() => setShowGenerateModal(false)}>
                <TouchableOpacity style={styles.overlayCenter} activeOpacity={1} onPress={() => setShowGenerateModal(false)}>
                    <View style={styles.dialogBox} onStartShouldSetResponder={() => true}>
                        <View style={[styles.dialogIconWrap, { backgroundColor: SgateColors.goldPale }]}>
                            <Feather name="file-plus" size={24} color={SgateColors.goldDeep} />
                        </View>
                        <Text style={styles.dialogTitle}>Generate Invoices</Text>
                        <Text style={styles.dialogSub}>Bulk generate maintenance bills for all occupied flats in the society.</Text>
                        
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputLabel}>Maintenance Amount (₹)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={billingAmount}
                                onChangeText={setBillingAmount}
                            />
                        </View>

                        <View style={styles.dialogActions}>
                            <TouchableOpacity style={styles.dialogBtnGhost} onPress={() => setShowGenerateModal(false)}>
                                <Text style={styles.dialogBtnGhostText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dialogBtnPrimary} onPress={handleGenerateInvoices} disabled={isProcessing}>
                                {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.dialogBtnPrimaryText}>Generate</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Apply Penalty Modal ─────────────────────────────────────────── */}
            <Modal visible={showPenaltyModal} transparent animationType="fade" onRequestClose={() => setShowPenaltyModal(false)}>
                <TouchableOpacity style={styles.overlayCenter} activeOpacity={1} onPress={() => setShowPenaltyModal(false)}>
                    <View style={styles.dialogBox} onStartShouldSetResponder={() => true}>
                        <View style={[styles.dialogIconWrap, { backgroundColor: SgateColors.redBg }]}>
                            <Feather name="alert-triangle" size={24} color={SgateColors.red} />
                        </View>
                        <Text style={styles.dialogTitle}>Apply Late Penalty</Text>
                        <Text style={styles.dialogSub}>Bulk apply a fast late penalty to all flats currently marked as Overdue.</Text>
                        
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputLabel}>Penalty Amount (₹)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={penaltyAmount}
                                onChangeText={setPenaltyAmount}
                            />
                        </View>

                        <View style={styles.dialogActions}>
                            <TouchableOpacity style={styles.dialogBtnGhost} onPress={() => setShowPenaltyModal(false)}>
                                <Text style={styles.dialogBtnGhostText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.dialogBtnPrimary, { backgroundColor: SgateColors.red }]} onPress={handleApplyPenalty} disabled={isProcessing}>
                                {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.dialogBtnPrimaryText}>Apply to Overdue</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCard({ label, amount, color, bg, icon }: {
    label: string; amount: number; color: string; bg: string; icon: keyof typeof Feather.glyphMap;
}) {
    return (
        <View style={[styles.summaryCard, { backgroundColor: bg }]}>
            <Feather name={icon} size={16} color={color} style={{ marginBottom: 6 }} />
            <Text style={[styles.summaryAmount, { color }]}>
                ₹{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : String(amount)}
            </Text>
            <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
        </View>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        gap: 10,
    },
    headerTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, flex: 1 },
    mockChip: { backgroundColor: SgateColors.goldPale, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    mockChipText: { fontSize: 11, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 16, flexGrow: 1 },

    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
    summaryAmount: { fontSize: 15, fontFamily: SgateFonts.extrabold, letterSpacing: -0.5 },
    summaryLabel: { fontSize: 10, fontFamily: SgateFonts.semibold, marginTop: 2 },

    filterRow: { paddingBottom: 16, gap: 8 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: SgateColors.card,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    filterChipActive: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },
    filterChipText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    filterChipTextActive: { color: SgateColors.card },

    sectionLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 10 },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    flatBubble: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    flatBubbleText: { fontSize: 12, fontFamily: SgateFonts.bold },
    flatBubbleNumber: { fontSize: 14, fontFamily: SgateFonts.extrabold },
    cardInfo: { flex: 1 },
    residentName: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    cardMonth: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    cardDate: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },
    overdueDate: { color: SgateColors.red },
    cardRight: { alignItems: 'flex-end', gap: 6 },
    cardAmount: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.4 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 8 },
    emptySubtitle: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    detailSheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 36,
    },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: SgateColors.border, alignSelf: 'center', marginBottom: 20 },
    detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    detailFlat: { fontSize: 22, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, letterSpacing: -0.5 },
    detailName: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    detailRows: { backgroundColor: SgateColors.bg, borderRadius: 16, paddingHorizontal: 16, marginBottom: 16 },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    detailLabel: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    detailValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    reminderBtn: {
        backgroundColor: SgateColors.black,
        borderRadius: 16, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    reminderBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.card },
    dismissBtn: { paddingVertical: 12, alignItems: 'center' },
    dismissBtnText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },

    // Modals and Nav
    navActionBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    dialogBox: {
        backgroundColor: SgateColors.card,
        borderRadius: 28,
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    dialogIconWrap: {
        width: 60, height: 60, borderRadius: 30,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    dialogTitle: { fontSize: 20, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, marginBottom: 8, textAlign: 'center' },
    dialogSub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
    
    inputWrap: { width: '100%', marginBottom: 24 },
    inputLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8 },
    input: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 16,
        fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1,
        textAlign: 'center',
    },
    
    dialogActions: { flexDirection: 'row', width: '100%', gap: 12 },
    dialogBtnGhost: {
        flex: 1,
        paddingVertical: 16, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: SgateColors.border,
    },
    dialogBtnGhostText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    dialogBtnPrimary: {
        flex: 1,
        backgroundColor: SgateColors.black,
        paddingVertical: 16, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    dialogBtnPrimaryText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.card },
});
