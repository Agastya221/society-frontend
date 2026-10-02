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

interface Schedule {
    date?: string | null; startTime?: string | null; endTime?: string | null;
    validFrom?: string | null; validUntil?: string | null; daysOfWeek?: string[];
    timeFrom?: string | null; timeTo?: string | null;
}

interface Match {
    allowed: boolean;
    entryId?: string;
    type?: string;
    mode?: string;
    displayLabel?: string;
    isPrivate: boolean;
    flatNumber?: string;
    residentName?: string;
    reason?: string;
    message?: string;
    matches?: Match[];
}

interface ListedPass {
    id: string; type: string; mode: string; scheduleType: string; displayLabel: string;
    isPrivate: boolean; flatNumber?: string; residentName?: string; visitorName?: string | null;
    schedule?: Schedule | null;
}

type Phase =
    | { kind: 'form' }
    | { kind: 'result'; matches: Match[] }
    | { kind: 'denied'; message: string; related: ListedPass[] }
    | { kind: 'allowed'; match: Match };

const IST_MS = 330 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Schedule dates come back as midnight of the pass day (UTC); shifting to IST keeps that calendar day. */
function istDay(iso: string): string {
    const d = new Date(new Date(iso).getTime() + IST_MS);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function windowLabel(s?: Schedule | null): string | null {
    if (!s) return null;
    if (s.date && s.startTime && s.endTime) return `${istDay(s.date)} · ${s.startTime} – ${s.endTime}`;
    if (s.timeFrom && s.timeTo) {
        const days = s.daysOfWeek?.length ? s.daysOfWeek.map((d) => d.charAt(0) + d.slice(1, 3).toLowerCase()).join(', ') : 'Daily';
        const until = s.validUntil ? ` · until ${istDay(s.validUntil)}` : '';
        return `${days} · ${s.timeFrom} – ${s.timeTo}${until}`;
    }
    return null;
}

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
                api.get(`/api/v1/guard/pre-approved?type=${type}&limit=100`).catch(() => null),
            ]);
            const listed: ListedPass[] = list?.data?.data?.entries ?? [];
            setWindows(Object.fromEntries(listed.map((p) => [p.id, p])));

            const result: Match = res.data?.data ?? { allowed: false, isPrivate: false };
            if (result.allowed) {
                const matches = result.matches?.length ? result.matches : [result];
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setPhase({ kind: 'result', matches });
            } else {
                const related = byVehicle
                    ? []
                    : listed.filter((p) => !p.isPrivate && p.flatNumber === selectedFlat!.flatNumber);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setPhase({ kind: 'denied', message: result.message ?? 'No valid pass found', related });
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPhase({ kind: 'denied', message: errorMessage(err, 'Could not check the pass'), related: [] });
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
            setPhase({ kind: 'denied', message: errorMessage(err, 'Could not record the entry'), related: [] });
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
                            text={phase.matches.length > 1 ? 'Confirm with the visitor, then allow the right one.' : 'Pre-approved by the resident.'} />
                        {phase.matches.map((m) => (
                            <PassCard key={m.entryId} match={m} schedule={m.entryId ? windows[m.entryId]?.schedule : null}
                                visitorName={m.entryId ? windows[m.entryId]?.visitorName : null}>
                                <Pressable
                                    style={[S.allowBtn, !!allowingId && S.btnDisabled]}
                                    onPress={() => handleAllow(m)}
                                    disabled={!!allowingId}
                                >
                                    {allowingId === m.entryId ? <ActivityIndicator color="#fff" /> : (
                                        <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={S.allowText}>Allow entry</Text></>
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
                        <StatusBanner ok={false} title="No valid pass" text={phase.message} />
                        {phase.related.length > 0 && (
                            <>
                                <Text style={S.sectionLabel}>OTHER PASSES FOR THIS FLAT</Text>
                                {phase.related.map((p) => (
                                    <View key={p.id} style={S.relatedRow}>
                                        <Ionicons name="time-outline" size={18} color={GuardColors.t3} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={S.relatedTitle}>{p.displayLabel}{p.visitorName ? ` · ${p.visitorName}` : ''}</Text>
                                            <Text style={S.relatedSub}>{windowLabel(p.schedule) ?? 'No time window'}</Text>
                                        </View>
                                        <Text style={S.relatedTag}>Not now</Text>
                                    </View>
                                ))}
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

function StatusBanner({ ok, title, text }: { ok: boolean; title: string; text: string }) {
    return (
        <View style={[S.banner, ok ? S.bannerOk : S.bannerBad]}>
            <View style={[S.bannerIcon, { backgroundColor: ok ? GuardColors.green : GuardColors.red }]}>
                <Ionicons name={ok ? 'checkmark' : 'close'} size={30} color="#fff" />
            </View>
            <Text style={[S.bannerTitle, { color: ok ? GuardColors.green : GuardColors.red }]}>{title}</Text>
            <Text style={S.bannerText}>{text}</Text>
        </View>
    );
}

function PassCard({ match, schedule, visitorName, children }: {
    match: Match; schedule?: Schedule | null; visitorName?: string | null; children?: React.ReactNode;
}) {
    const window = windowLabel(schedule);
    const rows: [keyof typeof Ionicons.glyphMap, string, string][] = [];
    if (visitorName && !match.displayLabel?.includes(visitorName)) rows.push(['person-outline', 'Visitor', visitorName]);
    if (match.isPrivate) rows.push(['eye-off-outline', 'Flat', 'Hidden (private pickup)']);
    else if (match.flatNumber) rows.push(['home-outline', 'Flat', match.flatNumber]);
    if (match.residentName) rows.push(['person-circle-outline', 'Resident', match.residentName]);
    if (window) rows.push(['time-outline', 'Valid', window]);

    return (
        <View style={S.passCard}>
            <View style={S.passHead}>
                <View style={S.passIcon}>
                    <Ionicons name={match.type === 'CAB' ? 'car' : match.type === 'HELP' ? 'construct' : 'cube'} size={20} color={GuardColors.black} />
                </View>
                <Text style={S.passTitle} numberOfLines={2}>{match.displayLabel ?? 'Pre-approved entry'}</Text>
            </View>
            {rows.map(([icon, label, value]) => (
                <View key={label} style={S.passRow}>
                    <Ionicons name={icon} size={16} color={GuardColors.t3} />
                    <Text style={S.passLabel}>{label}</Text>
                    <Text style={S.passValue} numberOfLines={2}>{value}</Text>
                </View>
            ))}
            {children}
        </View>
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

    banner: { borderRadius: GuardRadius.lg, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 16 },
    bannerOk: { backgroundColor: GuardColors.greenBg, borderColor: '#BDEFD9' },
    bannerBad: { backgroundColor: GuardColors.redBg, borderColor: '#F3CECE' },
    bannerIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    bannerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    bannerText: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '600', color: GuardColors.t2, textAlign: 'center' },

    passCard: { backgroundColor: GuardColors.card, borderRadius: GuardRadius.lg, borderWidth: 1, borderColor: GuardColors.borderSoft, padding: 16, marginBottom: 12, gap: 8 },
    passHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    passIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center' },
    passTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: GuardColors.t1 },
    passRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GuardColors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    passLabel: { fontSize: 13, fontWeight: '600', color: GuardColors.t3, width: 72 },
    passValue: { flex: 1, fontSize: 14, fontWeight: '700', color: GuardColors.t1, textAlign: 'right' },
    allowBtn: { marginTop: 6, height: 52, borderRadius: GuardRadius.md, backgroundColor: GuardColors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    allowText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    relatedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: GuardColors.card, borderRadius: 14, borderWidth: 1, borderColor: GuardColors.borderSoft, padding: 14, marginBottom: 8 },
    relatedTitle: { fontSize: 14, fontWeight: '800', color: GuardColors.t1 },
    relatedSub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: GuardColors.t3 },
    relatedTag: { fontSize: 11, fontWeight: '800', color: GuardColors.red, backgroundColor: GuardColors.redBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
