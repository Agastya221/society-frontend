import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import {
    clearGateLocation, listGates, listViolations, saveGateLocation, VIOLATION_TEXT,
    type GateLocation, type GeofenceViolation,
} from '@/services/geofence';

const RADII = [50, 100, 150, 200, 300];

/** The admin stands at the gate and saves its location; guards can then only act from near it. */
export default function GateLocationScreen() {
    const router = useRouter();
    const [gates, setGates] = useState<GateLocation[]>([]);
    const [violations, setViolations] = useState<GeofenceViolation[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [radius, setRadius] = useState(100);

    const load = useCallback(async () => {
        try {
            const [g, v] = await Promise.all([listGates(), listViolations()]);
            setGates(g);
            setViolations(v);
            const located = g.find((x) => x.latitude != null);
            if (located) setRadius(located.radiusMeters);
        } catch {
            AppAlert.show('Could not load', 'Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const located = gates.find((g) => g.latitude != null) ?? null;

    const saveHere = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (!perm.granted) {
                AppAlert.show('Location is off', 'Allow location for S-Gate in your phone settings, then try again.');
                return;
            }
            const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            if ((here.coords.accuracy ?? 999) > 60) {
                AppAlert.show('Position not clear yet', `Your phone is only sure to within ${Math.round(here.coords.accuracy ?? 999)} m. Stand at the gate with a clear view of the sky and try again.`);
                return;
            }
            await saveGateLocation(located?.id ?? gates[0]?.id ?? null, {
                latitude: here.coords.latitude,
                longitude: here.coords.longitude,
                radiusMeters: radius,
            });
            AppAlert.show('Gate location saved', `Guards can now only let visitors in from within ${radius} m of this spot.`);
            await load();
        } catch (err: any) {
            AppAlert.show('Could not save', err?.response?.data?.message || 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const turnOff = () => {
        if (!located) return;
        AppAlert.show('Turn off the check?', 'Guards will be able to act from anywhere again.', [
            { text: 'Keep it on', style: 'cancel' },
            { text: 'Turn off', style: 'destructive', onPress: async () => {
                try { await clearGateLocation(located.id); await load(); }
                catch { AppAlert.show('Could not turn off', 'Please try again.'); }
            } },
        ]);
    };

    return (
        <View style={styles.root}>
            <ScreenHeader title="Gate location" onBack={() => router.back()} />
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={SgateColors.gold} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.statusCard, located ? styles.on : styles.off]}>
                        <Ionicons name={located ? 'shield-checkmark' : 'shield-outline'} size={28} color={located ? SgateColors.green : SgateColors.t2} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusTitle}>{located ? 'Guards are checked at the gate' : 'Guards are not checked yet'}</Text>
                            <Text style={styles.statusText}>
                                {located
                                    ? `${located.name}: visitors can only be let in within ${located.radiusMeters} m of the saved spot.`
                                    : 'Stand at the gate and tap the button below. Until then a guard can act from anywhere.'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.label}>HOW CLOSE THE GUARD MUST BE</Text>
                    <View style={styles.radiusRow}>
                        {RADII.map((r) => (
                            <TouchableOpacity key={r} onPress={() => setRadius(r)} style={[styles.radiusChip, radius === r && styles.radiusOn]} accessibilityRole="button">
                                <Text style={styles.radiusText}>{r} m</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.hint}>Phone GPS can be off by 10 to 50 m, so keep at least 100 m unless the gate is out in the open.</Text>

                    <TouchableOpacity style={styles.primary} onPress={saveHere} disabled={saving} accessibilityRole="button">
                        {saving ? <ActivityIndicator color={SgateColors.ink} /> : (
                            <>
                                <Ionicons name="locate" size={20} color={SgateColors.ink} />
                                <Text style={styles.primaryText}>{located ? 'Update to where I am standing' : 'Set the gate location here'}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    {located ? (
                        <TouchableOpacity onPress={turnOff} hitSlop={10} accessibilityRole="button">
                            <Text style={styles.turnOff}>Turn the check off</Text>
                        </TouchableOpacity>
                    ) : null}

                    <Text style={[styles.label, { marginTop: 28 }]}>BLOCKED ATTEMPTS</Text>
                    {violations.length === 0 ? (
                        <Text style={styles.hint}>Nobody has tried to act away from the gate.</Text>
                    ) : violations.map((v) => (
                        <View key={v.id} style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowTitle} numberOfLines={1}>{v.guard?.name || 'Guard'} · {v.action}</Text>
                                <Text style={styles.rowSub}>
                                    {VIOLATION_TEXT[v.code] ?? 'Blocked'}{v.distanceMeters != null ? ` (${v.distanceMeters} m away)` : ''}
                                </Text>
                            </View>
                            <Text style={styles.rowTime}>{new Date(v.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingBottom: 120 },
    statusCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
    on: { backgroundColor: '#E5FAF4', borderColor: '#BFEBDD' },
    off: { backgroundColor: '#F4F4F2', borderColor: SgateColors.border },
    statusTitle: { fontFamily: SgateFonts.bold, fontSize: 15, color: SgateColors.ink },
    statusText: { fontFamily: SgateFonts.regular, fontSize: 13, lineHeight: 19, color: SgateColors.t2, marginTop: 3 },
    label: { marginTop: 24, marginBottom: 10, fontFamily: SgateFonts.extrabold, fontSize: 12, letterSpacing: 1.5, color: SgateColors.t3 },
    radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    radiusChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: SgateColors.border },
    radiusOn: { backgroundColor: SgateColors.gold, borderColor: SgateColors.gold },
    radiusText: { fontFamily: SgateFonts.bold, fontSize: 14, color: SgateColors.ink },
    hint: { marginTop: 10, fontFamily: SgateFonts.regular, fontSize: 13, lineHeight: 19, color: SgateColors.t2 },
    primary: { marginTop: 20, minHeight: 56, borderRadius: 18, backgroundColor: SgateColors.gold, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
    primaryText: { fontFamily: SgateFonts.bold, fontSize: 16, color: SgateColors.ink },
    turnOff: { marginTop: 16, textAlign: 'center', fontFamily: SgateFonts.bold, fontSize: 14, color: '#C62828' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: SgateColors.border, marginBottom: 8 },
    rowTitle: { fontFamily: SgateFonts.bold, fontSize: 14, color: SgateColors.ink },
    rowSub: { fontFamily: SgateFonts.regular, fontSize: 12, color: '#C62828', marginTop: 2 },
    rowTime: { fontFamily: SgateFonts.regular, fontSize: 11, color: SgateColors.t3 },
});
