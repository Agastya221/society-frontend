import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import EmptyState from '@/components/ui/EmptyState';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeBottomSheetSurface } from '@/components/ui/SafeBottomSheetSurface';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { StatusPill, statusColors } from '@/components/ui/StatusPill';
import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';
import api from '@/services/api';
import * as billingService from '@/services/billingService';

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

const DARK_GREEN = '#1A8D5F';
const DARK_GREEN_BG = '#E8F5EF';

const STATUS_LABEL: Record<DueStatus, string> = {
    PAID: 'Paid',
    PENDING: 'Pending',
    OVERDUE: 'Overdue',
};

const FILTER_TABS: FilterTab[] = ['ALL', 'PENDING', 'OVERDUE', 'PAID'];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PaymentsScreen() {

    const router = useRouter();

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
        } catch {
            setDues([]);
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
            AppAlert.show('Success', `Auto-generated invoices for all flats at ₹${billingAmount} each.`);
            fetchDues();
        }
    };

    const handleApplyPenalty = async () => {
        setIsProcessing(true);
        const success = await billingService.applyLatePenalty(parseInt(penaltyAmount));
        setIsProcessing(false);
        if (success) {
            setShowPenaltyModal(false);
            AppAlert.show('Success', `Late payment penalty of ₹${penaltyAmount} added to overdue accounts.`);
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
        AppAlert.show(
            'Send Reminder',
            `Send a payment reminder to ${due.residentName} (${due.block}-${due.flatNumber})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send', onPress: () => {
                        AppAlert.show('Reminder Sent', `Notification sent to ${due.residentName}`);
                    }
                },
            ]
        );
    };

    const handleMarkPaid = async (due: FlatDue) => {
        try {
            await billingService.markInvoicePaid(due.id);
            AppAlert.show('Success', 'Invoice marked as paid.');
            setSelectedDue(null);
            fetchDues();
        } catch {
            AppAlert.show('Error', 'Failed to mark invoice as paid.');
        }
    };

    const handleWaive = async (due: FlatDue) => {
        AppAlert.show(
            'Waive Invoice',
            `Are you sure you want to waive this invoice for ${due.residentName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Waive', onPress: async () => {
                        try {
                            await billingService.waiveInvoice(due.id);
                            AppAlert.show('Success', 'Invoice waived.');
                            setSelectedDue(null);
                            fetchDues();
                        } catch {
                            AppAlert.show('Error', 'Failed to waive invoice.');
                        }
                    }
                },
            ]
        );
    };

    const renderDue = ({ item, index }: { item: FlatDue; index: number }) => {
        const conf = statusColors(item.status);
        return (
            <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                <TouchableOpacity style={styles.card} onPress={() => setSelectedDue(item)} activeOpacity={0.8}>
                    {/* Accent bar */}
                    <View style={[styles.cardAccent, { backgroundColor: conf.text }]} />
                    {/* Left: avatar + info */}
                    <View style={styles.cardBody}>
                        <View style={styles.cardLeft}>
                            <View style={[styles.avatarWrap, { backgroundColor: conf.bg }]}>
                                <Text style={[styles.avatarBlock, { color: conf.text }]}>{item.block}</Text>
                                <Text style={[styles.avatarFlat, { color: conf.text }]}>{item.flatNumber}</Text>
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.residentName} numberOfLines={1}>{item.residentName}</Text>
                                <Text style={styles.cardMeta}>
                                    {item.month}{item.status === 'PAID' && item.paidAt ? ` · Paid ${new Date(item.paidAt).toLocaleDateString()}` : ` · Due ${item.dueDate}`}
                                </Text>
                            </View>
                        </View>
                        {/* Right: amount + badge */}
                        <View style={styles.cardRight}>
                            <Text style={styles.cardAmount}>₹{item.amount.toLocaleString()}</Text>
                            <StatusPill status={item.status} size="sm" />
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    if (loading) {
        return (
            <View style={styles.safe}>
                <ScreenHeader
                    title="Finance & Billing"
                    subtitle="Dues, payments & invoices"
                    onBack={() => router.back()}
                />
                <AppLoader />
            </View>
        );
    }

    return (
        <View style={styles.safe}>
            {/* ── Header (matches Emergency Alerts) ─────────────────────── */}
            <ScreenHeader
                title="Finance & Billing"
                subtitle="Dues, payments & invoices"
                onBack={() => router.back()}
                rightAction={(
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.navActionBtn} onPress={() => setShowGenerateModal(true)}>
                            <MaterialCommunityIcons name="file-plus-outline" size={18} color={SgateColors.goldDeep} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navActionBtn} onPress={() => setShowPenaltyModal(true)}>
                            <MaterialCommunityIcons name="alert-outline" size={18} color={SgateColors.red} />
                        </TouchableOpacity>
                    </View>
                )}
            >
                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {FILTER_TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                            onPress={() => setActiveFilter(tab)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.filterText, activeFilter === tab && styles.filterTextActive]}>
                                {tab === 'ALL' ? 'All' : STATUS_LABEL[tab as DueStatus]}
                                {tab !== 'ALL' && ` (${dues.filter(d => d.status === tab).length})`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ScreenHeader>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

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
                        {/* Summary strip */}
                        <View style={styles.summaryStrip}>
                            <SummaryCard label="Collected" amount={totalCollected} color={DARK_GREEN}          bg={DARK_GREEN_BG}        icon="trending-up" />
                            <View style={styles.summaryDivider} />
                            <SummaryCard label="Pending"   amount={totalPending}   color={SgateColors.goldDeep} bg={SgateColors.goldPale} icon="clock-outline" />
                            <View style={styles.summaryDivider} />
                            <SummaryCard label="Overdue"   amount={totalOverdue}   color={SgateColors.red}      bg={SgateColors.redBg}    icon="alert-circle-outline" />
                        </View>

                        <Text style={styles.sectionLabel}>
                            {filtered.length} {activeFilter === 'ALL' ? 'TOTAL' : activeFilter} RECORDS
                        </Text>
                    </Animated.View>
                }
                ListEmptyComponent={
                    <EmptyState
                        iconName="credit-card-outline"
                        title="No Records"
                        description="No dues found for the selected filter."
                    />
                }
            />

            {/* ── Detail Modal ─────────────────────────────────────────────── */}
            <Modal visible={!!selectedDue} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setSelectedDue(null)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedDue(null)}>
                    <SafeBottomSheetSurface showHandle>
                        {selectedDue && (
                            <>
                                <View style={styles.detailHeader}>
                                    <View>
                                        <Text style={styles.detailFlat}>{selectedDue.block}-{selectedDue.flatNumber}</Text>
                                        <Text style={styles.detailName}>{selectedDue.residentName}</Text>
                                    </View>
                                    <StatusPill status={selectedDue.status} />
                                </View>

                                <View style={styles.detailRows}>
                                    <DetailRow label="Month"    value={selectedDue.month} />
                                    <DetailRow label="Amount"   value={`₹${selectedDue.amount.toLocaleString()}`} />
                                    <DetailRow label="Due Date" value={selectedDue.dueDate} />
                                    {selectedDue.paidAt    && <DetailRow label="Paid On" value={selectedDue.paidAt} />}
                                    {selectedDue.paymentRef && <DetailRow label="Ref #"   value={selectedDue.paymentRef} />}
                                </View>

                                {selectedDue.status !== 'PAID' && (
                                    <View style={{ gap: 8, flexDirection: 'row', marginTop: 12 }}>
                                        <TouchableOpacity style={[styles.reminderBtn, { flex: 1 }]} onPress={() => handleMarkPaid(selectedDue)}>
                                            <MaterialCommunityIcons name="check" size={16} color={SgateColors.card} style={{ marginRight: 8 }} />
                                            <Text style={styles.reminderBtnText}>Mark Paid</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.reminderBtn, { flex: 1, backgroundColor: SgateColors.red }]} onPress={() => handleWaive(selectedDue)}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={SgateColors.card} style={{ marginRight: 8 }} />
                                            <Text style={styles.reminderBtnText}>Waive</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                {selectedDue.status !== 'PAID' && (
                                    <TouchableOpacity style={[styles.reminderBtn, { marginTop: 8 }]} onPress={() => handleSendReminder(selectedDue)}>
                                        <MaterialCommunityIcons name="bell-outline" size={16} color={SgateColors.card} style={{ marginRight: 8 }} />
                                        <Text style={styles.reminderBtnText}>Send Reminder</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={styles.dismissBtn} onPress={() => setSelectedDue(null)}>
                                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </SafeBottomSheetSurface>
                </TouchableOpacity>
            </Modal>

            {/* ── Generate Invoices Modal ──────────────────────────────────────── */}
            <Modal visible={showGenerateModal} transparent animationType="fade" onRequestClose={() => setShowGenerateModal(false)}>
                <TouchableOpacity style={styles.overlayCenter} activeOpacity={1} onPress={() => setShowGenerateModal(false)}>
                    <View style={styles.dialogBox} onStartShouldSetResponder={() => true}>
                        <View style={[styles.dialogIconWrap, { backgroundColor: SgateColors.goldPale }]}>
                            <MaterialCommunityIcons name="file-plus-outline" size={24} color={SgateColors.goldDeep} />
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
                            <MaterialCommunityIcons name="alert-outline" size={24} color={SgateColors.red} />
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
    label: string; amount: number; color: string; bg: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
    return (
        <View style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={16} color={color} />
            </View>
            <Text style={styles.summaryAmount}>
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

    // Header (matches Emergency Alerts)
    headerWrapper: {
        backgroundColor: SgateColors.card,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SgateLayout.screenGutter, marginBottom: 16 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 8 },

    listContent: { padding: 20, flexGrow: 1 },

    // Summary
    summaryStrip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingVertical: 16, paddingHorizontal: 8,
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1, alignItems: 'center', gap: 4,
    },
    summaryIconWrap: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    summaryAmount: { fontSize: 16, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, letterSpacing: -0.5 },
    summaryLabel: { fontSize: 10, fontFamily: SgateFonts.bold, marginTop: 1, letterSpacing: 0.3 },
    summaryDivider: { width: 1, height: 40, backgroundColor: SgateColors.borderSoft },

    // Filter
    filterRow: { paddingHorizontal: 20, gap: 8 },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    sectionLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t4, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },

    // Card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 10,
    },
    cardAccent: { width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
    cardBody: {
        flex: 1, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
        padding: 16,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
    avatarWrap: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    avatarBlock: { fontSize: 10, fontFamily: SgateFonts.bold, letterSpacing: 0.3 },
    avatarFlat: { fontSize: 14, fontFamily: SgateFonts.extrabold },
    cardInfo: { flex: 1 },
    residentName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 3 },
    cardMeta: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    cardRight: { alignItems: 'flex-end', gap: 8 },
    cardAmount: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
    detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    detailFlat: { fontSize: 22, fontFamily: SgateFonts.extrabold, color: SgateColors.t1, letterSpacing: -0.5 },
    detailName: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    detailRows: { backgroundColor: SgateColors.bg, borderRadius: 16, paddingHorizontal: SgateLayout.screenGutter, marginBottom: 16 },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    detailLabel: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    detailValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    reminderBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    reminderBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    dismissBtn: { paddingVertical: 12, alignItems: 'center' },
    dismissBtnText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },

    // Modals and Nav
    navActionBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', padding: 20 },
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
    inputLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
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
        backgroundColor: SgateColors.gold,
        paddingVertical: 16, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    dialogBtnPrimaryText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
