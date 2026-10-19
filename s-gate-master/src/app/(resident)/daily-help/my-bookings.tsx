import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { addStaffReview, cancelStaffBooking, getStaffBookings } from '@/services/staffDomesticService';

interface BookingRow {
    id: string;
    flatId: string;
    bookingDate: string;
    startTime?: string;
    endTime?: string;
    workType?: string;
    status: string;
    rejectionReason?: string | null;
    domesticStaff?: { id: string; name: string; staffType?: string };
}

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
    PENDING: { label: 'Waiting for a reply', bg: '#FFF4DC', fg: '#B07A00' },
    CONFIRMED: { label: 'Confirmed', bg: '#E8F1FF', fg: '#2563EB' },
    IN_PROGRESS: { label: 'In progress', bg: '#E8F1FF', fg: '#2563EB' },
    COMPLETED: { label: 'Done', bg: '#E5FAF4', fg: '#078463' },
    CANCELLED: { label: 'Cancelled', bg: '#F1F1F1', fg: '#6B7280' },
    REJECTED: { label: 'Declined', bg: '#FDECEC', fg: '#C62828' },
};

const when = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

/** The resident's daily-help bookings: cancel one that is still to come, rate one that is done. */
export default function MyStaffBookingsScreen() {
    const router = useRouter();
    const [rows, setRows] = useState<BookingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [rating, setRating] = useState<BookingRow | null>(null);
    const [stars, setStars] = useState(0);
    const [note, setNote] = useState('');
    const [reviewed, setReviewed] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        try {
            setRows((await getStaffBookings()) as unknown as BookingRow[]);
        } catch {
            AppAlert.show('Could not load', 'Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const cancel = (b: BookingRow) => {
        AppAlert.show('Cancel this booking?', `${b.domesticStaff?.name ?? 'The helper'} will be told.`, [
            { text: 'Keep it', style: 'cancel' },
            { text: 'Cancel booking', style: 'destructive', onPress: async () => {
                setBusy(b.id);
                try { await cancelStaffBooking(b.id); await load(); }
                catch (err: any) { AppAlert.show('Could not cancel', err?.response?.data?.message || 'Please try again.'); await load(); }
                finally { setBusy(null); }
            } },
        ]);
    };

    const openRate = (b: BookingRow) => { setRating(b); setStars(0); setNote(''); };

    const sendReview = async () => {
        if (!rating?.domesticStaff || sending) return;
        if (stars < 1) { AppAlert.show('Pick a rating', 'Tap the stars to rate the work.'); return; }
        setSending(true);
        try {
            await addStaffReview(rating.domesticStaff.id, rating.flatId, stars, note.trim() || undefined);
            setReviewed((cur) => [...cur, rating.id]);
            setRating(null);
            AppAlert.show('Thank you', 'Your review was saved.');
        } catch (err: any) {
            AppAlert.show('Could not save', err?.response?.data?.message || 'Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={styles.root}>
            <ScreenHeader title="My bookings" onBack={() => router.back()} />
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={SgateColors.gold} /></View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(b) => b.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<EmptyState iconName="shield-outline" title="No bookings yet" description="Bookings you make with daily help appear here." />}
                    renderItem={({ item: b }) => {
                        const st = STATUS[b.status] ?? STATUS.CANCELLED;
                        const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
                        const canRate = b.status === 'COMPLETED' && !reviewed.includes(b.id) && !!b.domesticStaff;
                        return (
                            <View style={styles.card}>
                                <View style={styles.top}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name} numberOfLines={1}>{b.domesticStaff?.name ?? 'Helper'}</Text>
                                        <Text style={styles.sub} numberOfLines={1}>{[b.workType, when(b.bookingDate), b.startTime && b.endTime ? `${b.startTime}–${b.endTime}` : null].filter(Boolean).join(' · ')}</Text>
                                    </View>
                                    <View style={[styles.pill, { backgroundColor: st.bg }]}><Text style={[styles.pillText, { color: st.fg }]}>{st.label}</Text></View>
                                </View>
                                {b.status === 'REJECTED' && b.rejectionReason ? <Text style={styles.reason}>{b.rejectionReason}</Text> : null}
                                {canCancel ? (
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(b)} disabled={busy === b.id} accessibilityRole="button">
                                        {busy === b.id ? <ActivityIndicator size="small" color="#C62828" /> : <Text style={styles.cancelText}>Cancel booking</Text>}
                                    </TouchableOpacity>
                                ) : null}
                                {canRate ? (
                                    <TouchableOpacity style={styles.rateBtn} onPress={() => openRate(b)} accessibilityRole="button">
                                        <Ionicons name="star" size={16} color={SgateColors.ink} />
                                        <Text style={styles.rateText}>Rate this work</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        );
                    }}
                />
            )}

            <Modal visible={!!rating} transparent animationType="slide" onRequestClose={() => setRating(null)}>
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>Rate {rating?.domesticStaff?.name ?? 'the helper'}</Text>
                        <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <TouchableOpacity key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                                    <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={38} color={n <= stars ? SgateColors.gold : SgateColors.t4} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput style={styles.note} value={note} onChangeText={setNote} placeholder="Anything to add? (optional)" placeholderTextColor={SgateColors.t4} multiline maxLength={300} textAlignVertical="top" />
                        <View style={styles.sheetButtons}>
                            <TouchableOpacity style={styles.sheetCancel} onPress={() => setRating(null)} accessibilityRole="button"><Text style={styles.sheetCancelText}>Not now</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.sheetSend} onPress={sendReview} disabled={sending} accessibilityRole="button">
                                {sending ? <ActivityIndicator color={SgateColors.ink} /> : <Text style={styles.sheetSendText}>Send review</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 20, paddingBottom: 100, gap: 12, flexGrow: 1 },
    card: { padding: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: SgateColors.border, gap: 10 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.ink },
    sub: { fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t2, marginTop: 2 },
    pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, maxWidth: 130 },
    pillText: { fontFamily: SgateFonts.bold, fontSize: 11 },
    reason: { fontFamily: SgateFonts.regular, fontSize: 12, color: '#C62828' },
    cancelBtn: { minHeight: 44, borderRadius: 14, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontFamily: SgateFonts.bold, fontSize: 14, color: '#C62828' },
    rateBtn: { minHeight: 44, borderRadius: 14, backgroundColor: SgateColors.gold, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
    rateText: { fontFamily: SgateFonts.bold, fontSize: 14, color: SgateColors.ink },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30 },
    sheetTitle: { fontFamily: SgateFonts.extrabold, fontSize: 20, color: SgateColors.ink, textAlign: 'center' },
    stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 18 },
    note: { minHeight: 90, borderRadius: 16, backgroundColor: '#F4F4F2', padding: 14, fontFamily: SgateFonts.regular, fontSize: 15, color: SgateColors.ink },
    sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
    sheetCancel: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: '#F3F3F1', alignItems: 'center', justifyContent: 'center' },
    sheetCancelText: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.t2 },
    sheetSend: { flex: 2, minHeight: 52, borderRadius: 16, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
    sheetSendText: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.ink },
});
