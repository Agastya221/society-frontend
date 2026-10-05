import {
    ListedPass, Match, PassCard, PassReasonRow, ReasonRowData, StatusBanner, passStyles, reasonRows, conflictTitle, windowLabel,
} from '@/components/PreApprovedPass';
import { GuardColors, GuardRadius } from '@/constants/theme';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Guard-side check for CAB / DELIVERY / HELP passes residents create in the
// main app. Backend: POST /guard/pre-approved/validate, POST /guard/pre-approved/:id/use,
// GET /guard/pre-approved (active list, used only to show each pass's window).

type PassType = 'CAB' | 'DELIVERY' | 'HELP';
type LookupMode = 'FLAT' | 'VEHICLE';

const TYPES: { type: PassType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'CAB', label: 'Cab', icon: 'car-outline' },
    { type: 'DELIVERY', label: 'Delivery', icon: 'cube-outline' },
    { type: 'HELP', label: 'Help', icon: 'construct-outline' },
];

interface FlatResult { id: string; flatNumber: string; block?: { name: string }; residents?: { name: string }[] }

// `message` / per-pass `reasons` are additive on the validate response; when the
// backend doesn't send them the screen falls back to its own copy and the active list.
type Phase =
    | { kind: 'form' }
    | { kind: 'result'; matches: Match[]; message?: string }
    | { kind: 'denied'; message: string; rows: ReasonRowData[]; title?: string }
    | { kind: 'allowed'; match: Match };

function flatLabel(f: FlatResult): string {
    if (f.flatNumber === 'OFFICE') return 'Admin Office';
    return `${f.block?.name ? `${f.block.name}-` : ''}${f.flatNumber}`;
}

function errorMessage(err: any, fallback: string): string {
    return err?.response?.data?.message ?? (err?.response ? fallback : 'Network error. Check the connection and try again.');
}

export default function PreApprovedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [type, setType] = useState<PassType>('DELIVERY');
    const [mode, setMode] = useState<LookupMode>('FLAT');
    const [last4, setLast4] = useState('');

    const [flatSearch, setFlatSearch] = useState('');
    const [selectedFlat, setSelectedFlat] = useState<FlatResult | null>(null);
    const [flatResults, setFlatResults] = useState<FlatResult[]>([]);
    const [searchingFlat, setSearchingFlat] = useState(false);

    const [phase, setPhase] = useState<Phase>({ kind: 'form' });
    const [windows, setWindows] = useState<Record<string, ListedPass>>({});
    const [checking, setChecking] = useState(false);
    const [allowingId, setAllowingId] = useState<string | null>(null);
    // Refs block a second tap that lands before the state update re-renders.
    const busyRef = useRef(false);

    const byVehicle = type === 'CAB' && mode === 'VEHICLE';
    const canCheck = byVehicle ? /^\d{4}$/.test(last4) : !!selectedFlat;

    // Flat search (debounced), same endpoint as New Entry.
    useEffect(() => {
        if (!flatSearch.trim() || (selectedFlat && flatLabel(selectedFlat) === flatSearch)) {
            setFlatResults([]);
            return;
        }
        let cancelled = false;
        const t = setTimeout(async () => {
            setSearchingFlat(true);
            try {
                const res = await api.get(`/api/v1/gate/flats/search?query=${encodeURIComponent(flatSearch.trim())}`);
                if (!cancelled) setFlatResults(res.data?.data ?? []);
            } catch {
                if (!cancelled) setFlatResults([]);
            } finally {
                if (!cancelled) setSearchingFlat(false);
            }
        }, 300);
        return () => { cancelled = true; clearTimeout(t); setSearchingFlat(false); };
    }, [flatSearch, selectedFlat]);

    const resetToForm = () => {
        setPhase({ kind: 'form' });
        setAllowingId(null);
    };

    // Hardware back leaves a result and returns to the lookup form first.
    useEffect(() => {
        if (phase.kind === 'form') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (busyRef.current) return true;
            resetToForm();
            return true;
        });
        return () => sub.remove();
    }, [phase.kind]);

    const handleCheck = async () => {
        if (!canCheck || busyRef.current) return;
        busyRef.current = true;
        setChecking(true);
        Keyboard.dismiss();
        const body = byVehicle ? { vehicleLast4: last4 } : { flatId: selectedFlat!.id, type };
        try {
            // The validate result has no schedule, so pull the active list alongside it
            // to show each pass's window. Failing that list is not fatal.
            const [res, list] = await Promise.all([
                api.post('/api/v1/guard/pre-approved/validate', body),
                // flatId narrows the list on backends that support it; older ones ignore it,
                // so the flat filter below still applies.
                api.get(`/api/v1/guard/pre-approved?type=${type}&limit=100${byVehicle ? '' : `&flatId=${selectedFlat!.id}`}`).catch(() => null),
            ]);
            const listed: ListedPass[] = list?.data?.data?.entries ?? [];
            setWindows(Object.fromEntries(listed.map((p) => [p.id, p])));

            const result: Match = res.data?.data ?? { allowed: false, isPrivate: false };
            if (result.allowed) {
                const matches = result.matches?.length ? result.matches : [result];
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setPhase({ kind: 'result', matches, message: result.message?.trim() || undefined });
            } else {
                const byId = Object.fromEntries(listed.map((p) => [p.id, p]));
                // Per-pass reasons first; any other pass for the flat they don't cover keeps the old "Not now" row.
                const rows = reasonRows(result.reasons, byId);
                const covered = new Set((result.reasons ?? []).map((r) => r.entryId).filter(Boolean));
                if (!byVehicle) {
                    for (const p of listed) {
                        // Match by flatId when the server sends it (flat numbers repeat across blocks).
                        const sameFlat = p.flatId ? p.flatId === selectedFlat!.id : p.flatNumber === selectedFlat!.flatNumber;
                        if (p.isPrivate || !sameFlat || covered.has(p.id)) continue;
                        rows.push({
                            key: p.id,
                            title: `${p.displayLabel}${p.visitorName ? ` · ${p.visitorName}` : ''}`,
                            detail: windowLabel(p.schedule) ?? 'No time window',
                            tag: 'Not now',
                        });
                    }
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setPhase({ kind: 'denied', message: result.message?.trim() || 'No valid pass found', rows });
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPhase({ kind: 'denied', message: errorMessage(err, 'Could not check the pass'), rows: [] });
        } finally {
            busyRef.current = false;
            setChecking(false);
        }
    };

    const handleAllow = async (match: Match) => {
        if (!match.entryId || busyRef.current) return;
        busyRef.current = true;
        setAllowingId(match.entryId);
        try {
            await api.post(`/api/v1/guard/pre-approved/${match.entryId}/use`, {});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPhase({ kind: 'allowed', match });
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPhase({ kind: 'denied', title: conflictTitle(err), message: errorMessage(err, 'Could not record the entry'), rows: [] });
        } finally {
            busyRef.current = false;
            setAllowingId(null);
        }
    };

    const selectType = (t: PassType) => {
        if (t === type) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setType(t);
        if (t !== 'CAB') setMode('FLAT');
    };

    // ── Result states ────────────────────────────────────────────────────────
    if (phase.kind !== 'form') {
        return (
            <ScrollView style={S.root} contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 28 }]}>
                {phase.kind === 'result' && (
                    <>
                        <StatusBanner ok title={phase.matches.length > 1 ? `${phase.matches.length} valid passes` : 'Valid pass'}
                            text={phase.message ?? (phase.matches.length > 1 ? 'Confirm with the visitor, then allow the right one.' : 'Pre-approved by the resident.')} />
                        {phase.matches.map((m) => (
                            <PassCard key={m.entryId} match={m} schedule={m.entryId ? windows[m.entryId]?.schedule : null}
                                visitorName={m.entryId ? windows[m.entryId]?.visitorName : null}>
                                <Pressable
                                    style={[passStyles.allowBtn, !!allowingId && S.btnDisabled]}
                                    onPress={() => handleAllow(m)}
                                    disabled={!!allowingId}
                                >
                                    {allowingId === m.entryId ? <ActivityIndicator color="#fff" /> : (
                                        <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={passStyles.allowText}>Allow entry</Text></>
                                    )}
                                </Pressable>
                            </PassCard>
                        ))}
                    </>
                )}

                {phase.kind === 'allowed' && (
                    <>
                        <StatusBanner ok title="Entry allowed" text="Logged in today's entries. The resident has been notified." />
                        <PassCard match={phase.match} schedule={phase.match.entryId ? windows[phase.match.entryId]?.schedule : null}
                            visitorName={phase.match.entryId ? windows[phase.match.entryId]?.visitorName : null} />
                    </>
                )}

                {phase.kind === 'denied' && (
                    <>
                        <StatusBanner ok={false} title={phase.title ?? 'No valid pass'} text={phase.message} />
                        {phase.rows.length > 0 && (
                            <>
                                <Text style={S.sectionLabel}>OTHER PASSES FOR THIS FLAT</Text>
                                {phase.rows.map(({ key, ...row }) => <PassReasonRow key={key} {...row} />)}
                            </>
                        )}
                        <Pressable style={S.secondaryBtn} onPress={() => router.replace('/new-entry')}>
                            <Ionicons name="notifications-outline" size={19} color={GuardColors.t1} />
                            <Text style={S.secondaryText}>Ask resident instead</Text>
                        </Pressable>
                    </>
                )}

                <Pressable
                    style={[S.primaryBtn, !!allowingId && S.btnDisabled]}
                    onPress={resetToForm}
                    disabled={!!allowingId}
                >
                    <Ionicons name="search" size={19} color={GuardColors.gold} />
                    <Text style={S.primaryText}>Check another pass</Text>
                </Pressable>
            </ScrollView>
        );
    }

    // ── Lookup form ──────────────────────────────────────────────────────────
    const showDropdown = !byVehicle && flatSearch.trim().length > 0 && !selectedFlat;

    return (
        <ScrollView style={S.root} contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
            <Text style={S.sectionLabel}>PASS TYPE</Text>
            <View style={S.typeRow}>
                {TYPES.map((t) => {
                    const active = t.type === type;
                    return (
                        <Pressable key={t.type} style={[S.typeCard, active && S.typeCardActive]} onPress={() => selectType(t.type)}>
                            <View style={[S.typeIcon, active && S.typeIconActive]}>
                                <Ionicons name={t.icon} size={22} color={active ? GuardColors.black : GuardColors.t3} />
                            </View>
                            <Text style={[S.typeLabel, active && S.typeLabelActive]}>{t.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {type === 'CAB' && (
                <View style={S.segment}>
                    {(['FLAT', 'VEHICLE'] as LookupMode[]).map((m) => (
                        <Pressable key={m} style={[S.segmentItem, mode === m && S.segmentActive]} onPress={() => setMode(m)}>
                            <Text style={[S.segmentText, mode === m && S.segmentTextActive]}>{m === 'FLAT' ? 'By flat' : 'Vehicle number'}</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {byVehicle ? (
                <>
                    <Text style={S.sectionLabel}>LAST 4 DIGITS OF VEHICLE</Text>
                    <View style={S.inputRow}>
                        <Ionicons name="car-outline" size={18} color={GuardColors.t3} style={S.inputIcon} />
                        <TextInput
                            style={[S.input, S.digits]}
                            placeholder="e.g. 4521"
                            placeholderTextColor={GuardColors.t4}
                            value={last4}
                            onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
                            keyboardType="number-pad"
                            maxLength={4}
                            returnKeyType="search"
                            onSubmitEditing={handleCheck}
                        />
                    </View>
                    <Text style={S.hint}>For private cab pickups the flat stays hidden — match the plate only.</Text>
                </>
            ) : (
                <>
                    <Text style={S.sectionLabel}>FLAT / UNIT</Text>
                    <View style={S.flatWrap}>
                        <View style={S.inputRow}>
                            <Ionicons name="home-outline" size={18} color={GuardColors.t3} style={S.inputIcon} />
                            <TextInput
                                style={S.input}
                                placeholder="Search flat — A-101, B-204…"
                                placeholderTextColor={GuardColors.t4}
                                value={flatSearch}
                                onChangeText={(t) => { setFlatSearch(t); setSelectedFlat(null); }}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                            {searchingFlat && <ActivityIndicator size="small" color={GuardColors.goldDeep} style={{ marginRight: 12 }} />}
                            {selectedFlat && <Ionicons name="checkmark-circle" size={20} color={GuardColors.green} style={{ marginRight: 14 }} />}
                        </View>
                        {showDropdown && (flatResults.length > 0 || !searchingFlat) && (
                            <View style={S.dropdown}>
                                {flatResults.length === 0 ? <Text style={S.dropdownEmpty}>No flats found</Text> : flatResults.map((f) => (
                                    <Pressable key={f.id} style={S.dropdownItem} onPress={() => {
                                        setSelectedFlat(f);
                                        setFlatSearch(flatLabel(f));
                                        setFlatResults([]);
                                        Keyboard.dismiss();
                                    }}>
                                        <Ionicons name="home" size={15} color={GuardColors.t3} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={S.dropdownFlat}>{flatLabel(f)}</Text>
                                            {!!f.residents?.[0]?.name && <Text style={S.dropdownSub}>{f.residents[0].name}</Text>}
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                </>
            )}

            <Pressable
                style={[S.primaryBtn, (!canCheck || checking) && S.btnDisabled]}
                onPress={handleCheck}
                disabled={!canCheck || checking}
            >
                {checking ? <ActivityIndicator color={GuardColors.gold} /> : (
                    <><Ionicons name="shield-checkmark-outline" size={20} color={GuardColors.gold} /><Text style={S.primaryText}>Check pass</Text></>
                )}
            </Pressable>
        </ScrollView>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: GuardColors.bg },
    scroll: { padding: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: GuardColors.t3, letterSpacing: 1.5, marginBottom: 10, marginLeft: 2 },

    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeCard: { flex: 1, height: 80, borderRadius: GuardRadius.md, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
    typeCardActive: { borderColor: GuardColors.goldDeep, backgroundColor: GuardColors.goldPale },
    typeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: GuardColors.surface, alignItems: 'center', justifyContent: 'center' },
    typeIconActive: { backgroundColor: GuardColors.gold },
    typeLabel: { fontSize: 12, fontWeight: '700', color: GuardColors.t2 },
    typeLabelActive: { color: GuardColors.t1, fontWeight: '900' },

    segment: { flexDirection: 'row', backgroundColor: GuardColors.surface, borderRadius: 14, padding: 4, marginBottom: 18 },
    segmentItem: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: GuardColors.card },
    segmentText: { fontSize: 13, fontWeight: '700', color: GuardColors.t3 },
    segmentTextActive: { color: GuardColors.t1, fontWeight: '900' },

    flatWrap: { zIndex: 10 },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: GuardColors.card, borderRadius: 14, borderWidth: 1, borderColor: GuardColors.border },
    inputIcon: { marginLeft: 14 },
    input: { flex: 1, fontSize: 15, fontWeight: '600', color: GuardColors.t1, paddingVertical: 13, paddingHorizontal: 12 },
    digits: { fontSize: 20, fontWeight: '800', letterSpacing: 6 },
    hint: { marginTop: 8, marginLeft: 2, fontSize: 12, lineHeight: 16, color: GuardColors.t3, fontWeight: '500' },
    dropdown: { marginTop: 4, backgroundColor: GuardColors.card, borderRadius: 14, borderWidth: 1, borderColor: GuardColors.border, overflow: 'hidden' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: GuardColors.borderSoft },
    dropdownFlat: { fontSize: 15, fontWeight: '700', color: GuardColors.t1 },
    dropdownSub: { marginTop: 1, fontSize: 12, fontWeight: '500', color: GuardColors.t3 },
    dropdownEmpty: { padding: 16, fontSize: 14, color: GuardColors.t3, textAlign: 'center' },

    primaryBtn: { marginTop: 22, height: 54, borderRadius: GuardRadius.md, backgroundColor: GuardColors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
    primaryText: { fontSize: 16, fontWeight: '800', color: GuardColors.card },
    btnDisabled: { opacity: 0.45 },
    secondaryBtn: { marginTop: 14, height: 52, borderRadius: GuardRadius.md, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
    secondaryText: { fontSize: 15, fontWeight: '800', color: GuardColors.t1 },
});
