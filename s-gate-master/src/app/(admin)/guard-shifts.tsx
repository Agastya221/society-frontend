import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import {
    deleteShift, listShiftsAndGuards, saveShift, setShiftGuards,
    type ShiftGuard, type ShiftItem,
} from '@/services/geofence';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Turns what the admin types into HH:MM: "6" -> "06:00" is not guessed, digits are just grouped as they type. */
const formatTime = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

/** The admin sets shift times and says which guards work which shift; attendance then flags late and early. */
export default function GuardShiftsScreen() {
    const router = useRouter();
    const [shifts, setShifts] = useState<ShiftItem[]>([]);
    const [guards, setGuards] = useState<ShiftGuard[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<ShiftItem | 'new' | null>(null);
    const [name, setName] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [grace, setGrace] = useState('15');
    const [picked, setPicked] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await listShiftsAndGuards();
            setShifts(data.shifts);
            setGuards(data.guards);
        } catch {
            AppAlert.show('Could not load', 'Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const open = (shift: ShiftItem | 'new') => {
        setEditing(shift);
        if (shift === 'new') {
            setName(''); setStart(''); setEnd(''); setGrace('15'); setPicked([]);
        } else {
            setName(shift.name); setStart(shift.startTime); setEnd(shift.endTime);
            setGrace(String(shift.graceMinutes)); setPicked(shift.guards.map((g) => g.id));
        }
    };

    const save = async () => {
        if (saving || !editing) return;
        if (!name.trim()) { AppAlert.show('Name needed', 'Give the shift a name, for example Morning.'); return; }
        if (!TIME.test(start) || !TIME.test(end)) { AppAlert.show('Check the times', 'Type the time as 4 digits, for example 0600 for 06:00 or 1430 for 14:30.'); return; }
        setSaving(true);
        try {
            const body = { name: name.trim(), startTime: start, endTime: end, graceMinutes: Math.min(120, Number(grace) || 0) };
            const id = await saveShift(editing === 'new' ? null : editing.id, body);
            await setShiftGuards(id, picked);
            setEditing(null);
            await load();
        } catch (err: any) {
            AppAlert.show('Could not save', err?.response?.data?.message || 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const remove = (shift: ShiftItem) => {
        AppAlert.show(`Remove ${shift.name}?`, 'Its guards will have no scheduled shift. Past attendance is kept.', [
            { text: 'Keep', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: async () => {
                try { await deleteShift(shift.id); await load(); }
                catch { AppAlert.show('Could not remove', 'Please try again.'); }
            } },
        ]);
    };

    const togglePick = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    const overnight = TIME.test(start) && TIME.test(end) && end <= start;

    return (
        <View style={styles.root}>
            <ScreenHeader title="Guard shifts" onBack={() => router.back()} />
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={SgateColors.gold} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.intro}>Set when each shift starts and ends and who works it. Attendance marks a guard late or early when they start or end duty outside these times.</Text>
                    {shifts.length === 0 ? <Text style={styles.empty}>No shifts yet.</Text> : shifts.map((s) => (
                        <TouchableOpacity key={s.id} style={styles.card} onPress={() => open(s)} accessibilityRole="button">
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{s.name}</Text>
                                <Text style={styles.time}>{s.startTime} – {s.endTime}{s.endTime <= s.startTime ? ' (next morning)' : ''} · {s.graceMinutes} min grace</Text>
                                <Text style={styles.guards} numberOfLines={2}>{s.guards.length ? s.guards.map((g) => g.name || 'Guard').join(', ') : 'No guards assigned'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => remove(s)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${s.name}`}>
                                <Ionicons name="trash-outline" size={20} color="#C62828" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.add} onPress={() => open('new')} accessibilityRole="button">
                        <Ionicons name="add" size={20} color={SgateColors.ink} />
                        <Text style={styles.addText}>Add a shift</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>{editing === 'new' ? 'New shift' : 'Edit shift'}</Text>
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>NAME</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Morning" placeholderTextColor={SgateColors.t4} maxLength={40} />
                            <View style={styles.timeRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>STARTS</Text>
                                    <TextInput style={styles.input} value={start} onChangeText={(v) => setStart(formatTime(v))} placeholder="0600" placeholderTextColor={SgateColors.t4} keyboardType="number-pad" maxLength={5} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>ENDS</Text>
                                    <TextInput style={styles.input} value={end} onChangeText={(v) => setEnd(formatTime(v))} placeholder="1400" placeholderTextColor={SgateColors.t4} keyboardType="number-pad" maxLength={5} />
                                </View>
                                <View style={{ width: 84 }}>
                                    <Text style={styles.label}>GRACE (MIN)</Text>
                                    <TextInput style={styles.input} value={grace} onChangeText={(v) => setGrace(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} />
                                </View>
                            </View>
                            {overnight ? <Text style={styles.hint}>This shift ends the next morning.</Text> : null}

                            <Text style={styles.label}>GUARDS ON THIS SHIFT</Text>
                            {guards.length === 0 ? <Text style={styles.hint}>Add guards first, then assign them here.</Text> : (
                                <View style={styles.chips}>
                                    {guards.map((g) => {
                                        const on = picked.includes(g.id);
                                        const elsewhere = !on && g.guardShiftId && (editing === 'new' || g.guardShiftId !== (editing as ShiftItem).id);
                                        return (
                                            <TouchableOpacity key={g.id} onPress={() => togglePick(g.id)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button">
                                                <Text style={styles.chipText}>{g.name || 'Guard'}{elsewhere ? ' (other shift)' : ''}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>
                        <View style={styles.sheetButtons}>
                            <TouchableOpacity style={styles.cancel} onPress={() => setEditing(null)} accessibilityRole="button"><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.save} onPress={save} disabled={saving} accessibilityRole="button">
                                {saving ? <ActivityIndicator color={SgateColors.ink} /> : <Text style={styles.saveText}>Save</Text>}
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
    content: { padding: 20, paddingBottom: 120, gap: 12 },
    intro: { fontFamily: SgateFonts.regular, fontSize: 13, lineHeight: 19, color: SgateColors.t2 },
    empty: { fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t2, textAlign: 'center', marginTop: 20 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: SgateColors.border },
    name: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.ink },
    time: { fontFamily: SgateFonts.medium, fontSize: 13, color: SgateColors.t2, marginTop: 2 },
    guards: { fontFamily: SgateFonts.regular, fontSize: 12, color: SgateColors.t3, marginTop: 4 },
    add: { minHeight: 52, borderRadius: 18, backgroundColor: SgateColors.gold, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
    addText: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.ink },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 },
    sheetTitle: { fontFamily: SgateFonts.extrabold, fontSize: 20, color: SgateColors.ink, marginBottom: 4 },
    label: { marginTop: 16, marginBottom: 6, fontFamily: SgateFonts.extrabold, fontSize: 11, letterSpacing: 1.4, color: SgateColors.t3 },
    input: { minHeight: 48, borderRadius: 14, backgroundColor: '#F4F4F2', paddingHorizontal: 14, fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.ink },
    timeRow: { flexDirection: 'row', gap: 10 },
    hint: { marginTop: 8, fontFamily: SgateFonts.regular, fontSize: 12, color: SgateColors.t2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F4F4F2', borderWidth: 1, borderColor: SgateColors.border },
    chipOn: { backgroundColor: SgateColors.gold, borderColor: SgateColors.gold },
    chipText: { fontFamily: SgateFonts.bold, fontSize: 13, color: SgateColors.ink },
    sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 18 },
    cancel: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: '#F3F3F1', alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.t2 },
    save: { flex: 2, minHeight: 52, borderRadius: 16, backgroundColor: SgateColors.gold, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.ink },
});
