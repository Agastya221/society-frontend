import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderIconButton, ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';
import {
    cancelStaffTask, getTaskPlaces, giveStaffTask, listAssignableStaff, listStaffTasks,
    type AssignableStaff, type StaffTask, type TaskPlaces,
} from '@/services/staffTasks';

/** How often the open screen asks the server for the tasks again */
export const TASK_POLL_MS = 20_000;
const QUICK = ['Clean the lobby', 'Clean the stairs', 'Pick up the garbage', 'Clean the parking', 'Water the plants'];
const typeLabel = (type: string) => type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');

const ago = (iso: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
};

const statusOf = (task: StaffTask) => {
    const name = task.domesticStaff.name;
    switch (task.status) {
        case 'ASSIGNED': return { text: `Waiting for ${name}`, bg: SgateColors.goldPale, fg: SgateColors.goldDeep };
        case 'ACCEPTED': return { text: `${name} is on it`, bg: SgateColors.blueBg, fg: SgateColors.blue };
        case 'DONE': return { text: `${name} finished it`, bg: SgateColors.greenBg, fg: SgateColors.green };
        default: return { text: 'Cancelled', bg: SgateColors.surface, fg: SgateColors.t3 };
    }
};

/** The admin hands a job (clean the lobby...) to a staff member who uses the staff app, and sees where it stands. */
export default function StaffTasksScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [tasks, setTasks] = useState<StaffTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [sheet, setSheet] = useState(false);
    const [staff, setStaff] = useState<AssignableStaff[] | null>(null);
    const [places, setPlaces] = useState<TaskPlaces | null>(null);
    const [pickedStaff, setPickedStaff] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [place, setPlace] = useState<{ blockId?: string; location?: string } | null>(null);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        try { setTasks(await listStaffTasks()); setFailed(false); } catch { setFailed(true); } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        void load();
        const timer = setInterval(() => { void load(); }, TASK_POLL_MS);
        return () => clearInterval(timer);
    }, [load]);

    const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

    const openSheet = async () => {
        setSheet(true);
        if (!staff) { try { setStaff(await listAssignableStaff()); } catch { setStaff([]); } }
        if (!places) { try { setPlaces(await getTaskPlaces()); } catch { /* picking a place is optional */ } }
    };
    const closeSheet = () => { setSheet(false); setPickedStaff(null); setTitle(''); setPlace(null); setNote(''); };

    const give = async () => {
        if (sending || !pickedStaff || title.trim().length < 2) return;
        setSending(true);
        try {
            await giveStaffTask({
                domesticStaffId: pickedStaff,
                title: title.trim(),
                ...(note.trim() ? { note: note.trim() } : {}),
                ...(place?.blockId ? { blockId: place.blockId } : {}),
                ...(place?.location ? { location: place.location } : {}),
            });
            const name = staff?.find((s) => s.id === pickedStaff)?.name ?? 'The staff member';
            closeSheet();
            await load();
            AppAlert.show('Task given', `${name} has been told.`);
        } catch (err: any) {
            AppAlert.show('Could not give the task', err?.response?.data?.message || 'Please try again.');
        } finally {
            setSending(false);
        }
    };

    const cancel = (task: StaffTask) => {
        AppAlert.show('Cancel this task?', 'The staff member will be told it is cancelled.', [
            { text: 'Keep it', style: 'cancel' },
            {
                text: 'Cancel task',
                style: 'destructive',
                onPress: async () => {
                    try { await cancelStaffTask(task.id); await load(); }
                    catch (err: any) { AppAlert.show('Could not cancel', err?.response?.data?.message || 'Please try again.'); void load(); }
                },
            },
        ]);
    };

    const open = tasks.filter((x) => x.status === 'ASSIGNED' || x.status === 'ACCEPTED');
    const closed = tasks.filter((x) => x.status === 'DONE' || x.status === 'CANCELLED');

    const card = (task: StaffTask) => {
        const status = statusOf(task);
        const where = [task.block?.name, task.location].filter(Boolean).join(' · ');
        const isOpen = task.status === 'ASSIGNED' || task.status === 'ACCEPTED';
        return (
            <View key={task.id} style={styles.card} testID={`task-${task.id}`}>
                <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{task.title}</Text>
                    <Text style={styles.cardAgo}>{ago(task.createdAt)}</Text>
                </View>
                {where ? <Text style={styles.cardWhere}>{where}</Text> : null}
                <View style={[styles.status, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.fg }]}>{status.text}</Text></View>
                <Text style={styles.cardMeta}>{task.domesticStaff.name} · {typeLabel(task.domesticStaff.staffType)}{task.createdBy ? ` · given by ${task.createdBy.name}` : ''}</Text>
                {task.note ? <Text style={styles.cardNote}>{task.note}</Text> : null}
                {isOpen ? (
                    <View style={styles.cardActions}>
                        {task.domesticStaff.phone ? (
                            <TouchableOpacity testID={`call-${task.id}`} style={styles.smallBtn} onPress={() => void Linking.openURL(`tel:${task.domesticStaff.phone}`)}>
                                <MaterialCommunityIcons name="phone-outline" size={16} color={SgateColors.t1} /><Text style={styles.smallBtnText}>Call</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity testID={`cancel-${task.id}`} style={styles.smallBtn} onPress={() => cancel(task)}>
                            <MaterialCommunityIcons name="close-circle-outline" size={16} color={SgateColors.t1} /><Text style={styles.smallBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.safe}>
            <ScreenHeader
                title="Tasks for staff"
                onBack={() => router.back()}
                rightAction={<HeaderIconButton icon="plus" accessibilityLabel="Give a task" onPress={() => void openSheet()} />}
            />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={SgateColors.gold} />
                ) : failed && tasks.length === 0 ? (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={SgateColors.t3} />
                        <Text style={styles.emptyTitle}>Could not load tasks</Text>
                        <TouchableOpacity style={styles.primary} onPress={() => void load()}><Text style={styles.primaryText}>Try again</Text></TouchableOpacity>
                    </View>
                ) : tasks.length === 0 ? (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="checkbox-marked-outline" size={40} color={SgateColors.t3} />
                        <Text style={styles.emptyTitle}>No tasks given yet</Text>
                        <Text style={styles.emptyText}>When something needs doing, give the job to a staff member. They see it on their phone and accept it.</Text>
                        <TouchableOpacity style={styles.primary} onPress={() => void openSheet()}><Text style={styles.primaryText}>Give a task</Text></TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {open.length ? <Text style={styles.section}>TO DO</Text> : null}
                        {open.map(card)}
                        {closed.length ? <Text style={styles.section}>FINISHED OR CANCELLED</Text> : null}
                        {closed.map(card)}
                    </>
                )}
            </ScrollView>

            <Modal visible={sheet} transparent animationType="slide" onRequestClose={closeSheet}>
                <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <Text style={styles.sheetTitle}>New task</Text>
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>WHO SHOULD DO IT?</Text>
                            {staff === null ? <ActivityIndicator color={SgateColors.gold} /> : staff.length === 0 ? (
                                <Text style={styles.emptyText}>No staff member who uses the staff app was found. Call them directly.</Text>
                            ) : staff.map((s) => (
                                <TouchableOpacity key={s.id} testID={`staff-${s.id}`} accessibilityState={{ selected: pickedStaff === s.id }} onPress={() => setPickedStaff(pickedStaff === s.id ? null : s.id)} style={[styles.staffRow, pickedStaff === s.id && styles.staffRowOn]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.staffName}>{s.name}</Text>
                                        <Text style={styles.staffType}>{typeLabel(s.staffType)}{s.insideNow ? ' · Inside now' : ''}</Text>
                                    </View>
                                    {pickedStaff === s.id ? <MaterialCommunityIcons name="check-circle" size={22} color={SgateColors.green} /> : null}
                                </TouchableOpacity>
                            ))}

                            <Text style={styles.label}>WHAT NEEDS DOING?</Text>
                            <View style={styles.chips}>
                                {QUICK.map((q) => (
                                    <TouchableOpacity key={q} testID={`quick-${q}`} onPress={() => setTitle(q)} style={[styles.chip, title === q && styles.chipOn]}>
                                        <Text style={[styles.chipText, title === q && styles.chipTextOn]}>{q}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput testID="task-title" value={title} onChangeText={setTitle} placeholder="Or type it" placeholderTextColor={SgateColors.t4} style={styles.input} maxLength={120} />

                            {places && (places.blocks.length || places.commonAreas.length) ? (
                                <>
                                    <Text style={styles.label}>WHERE? (OPTIONAL)</Text>
                                    <View style={styles.chips}>
                                        {places.blocks.map((b) => {
                                            const on = place?.blockId === b.id;
                                            return (
                                                <TouchableOpacity key={b.id} testID={`place-block-${b.id}`} onPress={() => setPlace(on ? null : { blockId: b.id })} style={[styles.chip, on && styles.chipOn]}>
                                                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{b.name}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        {places.commonAreas.map((a) => {
                                            const on = place?.location === a;
                                            return (
                                                <TouchableOpacity key={a} testID={`place-area-${a}`} onPress={() => setPlace(on ? null : { location: a })} style={[styles.chip, on && styles.chipOn]}>
                                                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </>
                            ) : null}

                            <Text style={styles.label}>ANYTHING TO ADD? (OPTIONAL)</Text>
                            <TextInput testID="task-note" value={note} onChangeText={setNote} style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]} multiline maxLength={500} />
                        </ScrollView>
                        <TouchableOpacity testID="give-task" style={[styles.primary, (sending || !pickedStaff || title.trim().length < 2) && styles.primaryOff]} disabled={sending || !pickedStaff || title.trim().length < 2} onPress={() => void give()}>
                            {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Give the task</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={closeSheet} style={{ alignItems: 'center', paddingVertical: 8 }}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    content: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 14, paddingBottom: 40, gap: 12 },
    section: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 1, color: SgateColors.t3, marginTop: 6 },
    card: { backgroundColor: SgateColors.card, borderRadius: 18, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, gap: 6 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    cardTitle: { flex: 1, fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cardAgo: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    cardWhere: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    status: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    statusText: { fontSize: 12, fontFamily: SgateFonts.semibold },
    cardMeta: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    cardNote: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2 },
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    smallBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: SgateColors.surface },
    smallBtnText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 20 },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    emptyText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', lineHeight: 19 },
    primary: { backgroundColor: SgateColors.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
    primaryOff: { opacity: 0.45 },
    primaryText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '92%', backgroundColor: SgateColors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingHorizontal: 20, gap: 12 },
    sheetTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    sheetBody: { gap: 10, paddingBottom: 6 },
    label: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.6, color: SgateColors.t3, marginTop: 6 },
    staffRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, borderRadius: 14, borderWidth: 1.5, borderColor: SgateColors.border, padding: 12 },
    staffRowOn: { borderColor: SgateColors.green, backgroundColor: SgateColors.greenBg },
    staffName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    staffType: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: SgateColors.border, backgroundColor: SgateColors.card },
    chipOn: { backgroundColor: SgateColors.goldPale, borderColor: SgateColors.gold },
    chipText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    chipTextOn: { color: SgateColors.t1 },
    input: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    cancelText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t3 },
});
