import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import {
    confirmPaymentSubmission,
    listPaymentSubmissions,
    rejectPaymentSubmission,
    type AdminPaymentSubmission,
    type SubmissionStatus,
} from '@/services/duePayments';

const TABS: Array<{ key: SubmissionStatus; label: string }> = [
    { key: 'SUBMITTED', label: 'Waiting' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'REJECTED', label: 'Rejected' },
];

const formatAmount = (amount: number) => '₹' + amount.toLocaleString('en-IN');
const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Residents pay the society's UPI ID and report the reference number. The admin compares it with
 * the society's bank statement here: Confirm marks the due as paid, Reject tells the resident why.
 */
export default function PaymentReviewScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<SubmissionStatus>('SUBMITTED');
    const [items, setItems] = useState<AdminPaymentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<AdminPaymentSubmission | null>(null);
    const [reason, setReason] = useState('');

    const load = useCallback(async (status: SubmissionStatus) => {
        try {
            setItems(await listPaymentSubmissions(status));
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { setLoading(true); void load(tab); }, [load, tab]));

    const confirm = (item: AdminPaymentSubmission) => {
        AppAlert.show(
            'Confirm payment',
            `Did ${formatAmount(item.amount)} with reference ${item.utr} reach the society bank account?`,
            [
                { text: 'Not yet', style: 'cancel' },
                {
                    text: 'Yes, confirm',
                    onPress: async () => {
                        setBusyId(item.id);
                        try {
                            await confirmPaymentSubmission(item.id);
                            await load(tab);
                        } catch (err: any) {
                            AppAlert.show('Could not confirm', err?.response?.data?.message || 'Please try again.');
                        } finally {
                            setBusyId(null);
                        }
                    },
                },
            ],
        );
    };

    const sendRejection = async () => {
        if (!rejecting) return;
        if (reason.trim().length < 3) {
            AppAlert.show('Say why', 'Tell the resident why, for example: reference number not found in the bank statement.');
            return;
        }
        setBusyId(rejecting.id);
        try {
            await rejectPaymentSubmission(rejecting.id, reason.trim());
            setRejecting(null);
            setReason('');
            await load(tab);
        } catch (err: any) {
            AppAlert.show('Could not reject', err?.response?.data?.message || 'Please try again.');
        } finally {
            setBusyId(null);
        }
    };

    const renderItem = ({ item }: { item: AdminPaymentSubmission }) => {
        const flat = `${item.blockName ? `${item.blockName} - ` : ''}${item.flatNumber}`;
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={styles.flatBadge}><Text style={styles.flatBadgeText}>{flat}</Text></View>
                    <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                </View>
                <Text style={styles.who}>{item.residentName}{item.residentPhone ? `  ·  ${item.residentPhone}` : ''}</Text>
                <Text style={styles.meta}>{item.month}  ·  {formatWhen(item.submittedAt)}</Text>

                <TouchableOpacity
                    style={styles.refRow}
                    onPress={() => { void Clipboard.setStringAsync(item.utr); }}
                    accessibilityLabel="Copy reference number"
                >
                    <MaterialCommunityIcons name="pound" size={16} color={SgateColors.t2} />
                    <Text style={styles.refLabel}>Reference</Text>
                    <Text style={styles.refValue}>{item.utr}</Text>
                    <MaterialCommunityIcons name="content-copy" size={15} color={SgateColors.t3} />
                </TouchableOpacity>

                {item.status === 'REJECTED' && item.rejectionReason ? (
                    <Text style={styles.rejectNote}>Rejected: {item.rejectionReason}</Text>
                ) : null}

                {item.status === 'SUBMITTED' ? (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.rejectBtn]}
                            disabled={busyId === item.id}
                            onPress={() => { setReason(''); setRejecting(item); }}
                        >
                            <Text style={styles.rejectText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.confirmBtn]}
                            disabled={busyId === item.id}
                            onPress={() => confirm(item)}
                        >
                            {busyId === item.id
                                ? <ActivityIndicator size="small" color={SgateColors.ink} />
                                : <Text style={styles.confirmText}>Confirm payment</Text>}
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.safe}>
            <ScreenHeader title="Review payments" subtitle="Check UPI payments against the bank statement" onBack={() => router.back()}>
                <View style={styles.tabs}>
                    {TABS.map((t) => (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.tab, tab === t.key && styles.tabActive]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScreenHeader>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={SgateColors.goldDeep} />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(tab); }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="check-decagram-outline" size={44} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>{tab === 'SUBMITTED' ? 'Nothing waiting' : 'Nothing here yet'}</Text>
                            <Text style={styles.emptyText}>
                                {tab === 'SUBMITTED'
                                    ? 'When a resident pays by UPI and enters the reference number, it shows up here.'
                                    : 'Payments you have handled appear here.'}
                            </Text>
                        </View>
                    }
                />
            )}

            <Modal visible={!!rejecting} transparent animationType="slide" onRequestClose={() => setRejecting(null)}>
                <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRejecting(null)} />
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>Why can't you confirm it?</Text>
                        <Text style={styles.sheetText}>
                            The resident gets this message and can submit the payment again with the correct reference number.
                        </Text>
                        <TextInput
                            style={styles.sheetInput}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="e.g. Reference number not found in the bank statement"
                            placeholderTextColor={SgateColors.t4}
                            multiline
                            maxLength={200}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.btn, styles.rejectSolid, busyId === rejecting?.id && { opacity: 0.6 }]}
                            disabled={busyId === rejecting?.id}
                            onPress={sendRejection}
                        >
                            <Text style={styles.rejectSolidText}>Send to resident</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F3F1' },
    tabActive: { backgroundColor: SgateColors.gold },
    tabText: { fontFamily: SgateFonts.semibold, fontSize: 13, color: SgateColors.t2 },
    tabTextActive: { fontFamily: SgateFonts.bold, color: SgateColors.ink },
    list: { padding: 16, paddingBottom: 120, gap: 12 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: SgateColors.border, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    flatBadge: { backgroundColor: SgateColors.goldPale, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    flatBadgeText: { fontFamily: SgateFonts.bold, fontSize: 13, color: SgateColors.ink },
    amount: { fontFamily: SgateFonts.extrabold, fontSize: 20, color: SgateColors.ink },
    who: { fontFamily: SgateFonts.semibold, fontSize: 14, color: SgateColors.t1, marginTop: 4 },
    meta: { fontFamily: SgateFonts.regular, fontSize: 12, color: SgateColors.t3 },
    refRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#F7F7F5', padding: 12, borderRadius: 14 },
    refLabel: { fontFamily: SgateFonts.regular, fontSize: 12, color: SgateColors.t2 },
    refValue: { flex: 1, fontFamily: SgateFonts.bold, fontSize: 15, letterSpacing: 1, color: SgateColors.ink },
    rejectNote: { marginTop: 6, fontFamily: SgateFonts.medium, fontSize: 12, color: SgateColors.red },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    btn: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { backgroundColor: SgateColors.redBg, borderWidth: 1, borderColor: SgateColors.redBorder },
    rejectText: { fontFamily: SgateFonts.bold, fontSize: 14, color: SgateColors.red },
    confirmBtn: { flex: 2, backgroundColor: SgateColors.gold },
    confirmText: { fontFamily: SgateFonts.extrabold, fontSize: 14, color: SgateColors.ink },
    empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30, gap: 8 },
    emptyTitle: { fontFamily: SgateFonts.bold, fontSize: 17, color: SgateColors.t1 },
    emptyText: { fontFamily: SgateFonts.regular, fontSize: 13, lineHeight: 19, color: SgateColors.t2, textAlign: 'center' },
    backdrop: { flex: 1, backgroundColor: 'rgba(17,19,24,0.55)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30, gap: 12 },
    sheetTitle: { fontFamily: SgateFonts.extrabold, fontSize: 19, color: SgateColors.t1 },
    sheetText: { fontFamily: SgateFonts.regular, fontSize: 13, lineHeight: 19, color: SgateColors.t2 },
    sheetInput: {
        minHeight: 84, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, padding: 14, textAlignVertical: 'top',
        fontFamily: SgateFonts.regular, fontSize: 15, color: SgateColors.t1, backgroundColor: '#FAFAF8',
    },
    rejectSolid: { backgroundColor: SgateColors.red, flex: 0, alignSelf: 'stretch' },
    rejectSolidText: { fontFamily: SgateFonts.extrabold, fontSize: 15, color: '#FFFFFF' },
});
