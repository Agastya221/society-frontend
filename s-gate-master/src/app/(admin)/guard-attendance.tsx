import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { getAttendance, type AttendanceReport } from '@/services/geofence';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Who was on duty, on which days, for how long. A guard marks attendance by starting duty at the gate. */
export default function GuardAttendanceScreen() {
    const router = useRouter();
    const [month, setMonth] = useState(() => new Date());
    const [report, setReport] = useState<AttendanceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState<string | null>(null);

    const load = useCallback(async (target: Date) => {
        setLoading(true);
        try {
            setReport(await getAttendance(monthKey(target)));
        } catch {
            AppAlert.show('Could not load', 'Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(month); }, [load, month]));

    const shift = (delta: number) => {
        const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
        setOpen(null);
        setMonth(next);
    };
    const isCurrent = monthKey(month) === monthKey(new Date());

    return (
        <View style={styles.root}>
            <ScreenHeader title="Guard attendance" onBack={() => router.back()} />
            <View style={styles.monthRow}>
                <TouchableOpacity onPress={() => shift(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous month">
                    <Ionicons name="chevron-back" size={24} color={SgateColors.ink} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => shift(1)} disabled={isCurrent} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next month">
                    <Ionicons name="chevron-forward" size={24} color={isCurrent ? SgateColors.t4 : SgateColors.ink} />
                </TouchableOpacity>
            </View>
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={SgateColors.gold} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {(report?.guards ?? []).length === 0 ? (
                        <Text style={styles.empty}>No guards in this society yet.</Text>
                    ) : report!.guards.map((g) => (
                        <View key={g.guardId} style={styles.card}>
                            <TouchableOpacity onPress={() => setOpen(open === g.guardId ? null : g.guardId)} style={styles.cardTop} accessibilityRole="button">
                                <View style={styles.avatar}><Text style={styles.avatarText}>{(g.name || 'G').charAt(0).toUpperCase()}</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name} numberOfLines={1}>{g.name || 'Guard'}</Text>
                                    <Text style={styles.sub}>{g.daysPresent} {g.daysPresent === 1 ? 'day' : 'days'} · {hours(g.totalMinutes)}</Text>
                                </View>
                                {g.onDutyNow ? <View style={styles.live}><Text style={styles.liveText}>On duty</Text></View> : null}
                                <Ionicons name={open === g.guardId ? 'chevron-up' : 'chevron-down'} size={20} color={SgateColors.t3} />
                            </TouchableOpacity>
                            {open === g.guardId ? (
                                g.shifts.length === 0 ? <Text style={styles.sub}>No shifts this month.</Text> : (
                                    <View style={styles.shifts}>
                                        {[...g.shifts].reverse().map((s) => (
                                            <View key={s.id} style={styles.shiftRow}>
                                                <Text style={styles.shiftDate}>{new Date(s.startedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
                                                <Text style={styles.shiftTime}>
                                                    {clock(s.startedAt)} – {s.endedAt ? clock(s.endedAt) : 'now'}{s.endedBy === 'AUTO' ? ' (auto)' : ''}
                                                </Text>
                                                <Text style={styles.shiftHours}>{hours(s.minutes)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )
                            ) : null}
                        </View>
                    ))}
                    <Text style={styles.note}>
                        A guard marks attendance by tapping "Start duty" on the home screen while at the gate, and "End duty" when the shift ends.
                        A shift left open for 16 hours closes by itself and is marked (auto).
                    </Text>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
    monthText: { fontFamily: SgateFonts.bold, fontSize: 17, color: SgateColors.ink },
    content: { padding: 20, paddingBottom: 120, gap: 12 },
    empty: { fontFamily: SgateFonts.regular, fontSize: 14, color: SgateColors.t2, textAlign: 'center', marginTop: 40 },
    card: { padding: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: SgateColors.border },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: SgateFonts.bold, fontSize: 18, color: SgateColors.goldDeep },
    name: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.ink },
    sub: { fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t2, marginTop: 2 },
    live: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#E5FAF4' },
    liveText: { fontFamily: SgateFonts.bold, fontSize: 12, color: '#078463' },
    shifts: { marginTop: 14, gap: 8, borderTopWidth: 1, borderTopColor: SgateColors.border, paddingTop: 12 },
    shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    shiftDate: { width: 56, fontFamily: SgateFonts.bold, fontSize: 13, color: SgateColors.ink },
    shiftTime: { flex: 1, fontFamily: SgateFonts.regular, fontSize: 13, color: SgateColors.t2 },
    shiftHours: { fontFamily: SgateFonts.bold, fontSize: 13, color: SgateColors.ink },
    note: { marginTop: 8, fontFamily: SgateFonts.regular, fontSize: 12, lineHeight: 18, color: SgateColors.t3 },
});
