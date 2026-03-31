import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { QRCarousel } from '@/components/Sgate/QRCarousel';
import { createPreApproved } from '@/services/gate.service';
import type {
    CreatePreApprovedPayload,
    DayOfWeek,
    HelpCategory,
    PreApprovedDuplicateWarning,
    PreApprovedEntry,
    PreApprovedMode,
    PreApprovedScheduleType,
    PreApprovedType,
} from '@/types/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const HELP_CATEGORIES: { label: string; value: HelpCategory }[] = [
    { label: 'Plumber',            value: 'PLUMBER'           },
    { label: 'Electrician',        value: 'ELECTRICIAN'       },
    { label: 'Carpenter',          value: 'CARPENTER'         },
    { label: 'Painter',            value: 'PAINTER'           },
    { label: 'Tutor',              value: 'TUTOR'             },
    { label: 'Beautician',         value: 'BEAUTICIAN'        },
    { label: 'Fitness Trainer',    value: 'FITNESS_TRAINER'   },
    { label: 'Physiotherapist',    value: 'PHYSIOTHERAPIST'   },
    { label: 'Cook',               value: 'COOK'              },
    { label: 'Pest Control',       value: 'PEST_CONTROL'      },
    { label: 'Appliance Repair',   value: 'APPLIANCE_REPAIR'  },
    { label: 'Other',              value: 'OTHER'             },
];

const DAYS: { label: string; short: string; value: DayOfWeek }[] = [
    { label: 'Mon', short: 'M', value: 'MON' },
    { label: 'Tue', short: 'T', value: 'TUE' },
    { label: 'Wed', short: 'W', value: 'WED' },
    { label: 'Thu', short: 'T', value: 'THU' },
    { label: 'Fri', short: 'F', value: 'FRI' },
    { label: 'Sat', short: 'S', value: 'SAT' },
    { label: 'Sun', short: 'S', value: 'SUN' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHHMM(date: Date): string {
    return date.toTimeString().slice(0, 5); // "HH:MM"
}

function toDateStr(date: Date): string {
    // "YYYY-MM-DD"
    return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDisplayTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isDuplicateWarning(r: PreApprovedEntry | PreApprovedDuplicateWarning): r is PreApprovedDuplicateWarning {
    return 'warning' in r && r.warning === 'DUPLICATE_EXISTS';
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreatePreApprovalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ prefill?: string }>();

    // ── Step state ───────────────────────────────────────────────────────────
    const [step, setStep] = useState<'type' | 'details'>('type');
    const [selectedType, setSelectedType] = useState<PreApprovedType>('CAB');

    // ── Mode ────────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<PreApprovedMode>('NORMAL');

    // ── Schedule ─────────────────────────────────────────────────────────────
    const [scheduleType, setScheduleType] = useState<PreApprovedScheduleType>('ONCE');

    // ONCE fields
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [onceDate, setOnceDate]           = useState(tomorrow);
    const [onceStart, setOnceStart]         = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
    const [onceEnd, setOnceEnd]             = useState(() => { const d = new Date(); d.setHours(11, 0, 0, 0); return d; });

    // RECURRING fields
    const [recurFrom, setRecurFrom]         = useState(new Date());
    const [recurUntil, setRecurUntil]       = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; });
    const [recurDays, setRecurDays]         = useState<DayOfWeek[]>([]);
    const [recurTimeFrom, setRecurTimeFrom] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
    const [recurTimeTo, setRecurTimeTo]     = useState(() => { const d = new Date(); d.setHours(11, 0, 0, 0); return d; });
    const [entriesPerDay, setEntriesPerDay] = useState(1);

    // ── Common fields ────────────────────────────────────────────────────────
    const [visitorName, setVisitorName]     = useState('');
    const [visitorPhone, setVisitorPhone]   = useState('');

    // CAB SAFE
    const [vehicleLast4, setVehicleLast4]   = useState('');

    // DELIVERY
    const [companyName, setCompanyName]     = useState('');

    // HELP
    const [helpCategory, setHelpCategory]   = useState<HelpCategory | null>(null);
    const [customCategory, setCustomCategory] = useState('');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    // ── Advanced (grace) ─────────────────────────────────────────────────────
    const [showAdvanced, setShowAdvanced]   = useState(false);
    const [graceBefore, setGraceBefore]     = useState(15);
    const [graceAfter, setGraceAfter]       = useState(30);

    // ── Date picker ──────────────────────────────────────────────────────────
    type PickerTarget = 'onceDate' | 'onceStart' | 'onceEnd' | 'recurFrom' | 'recurUntil' | 'recurTimeFrom' | 'recurTimeTo';
    const [pickerTarget, setPickerTarget]   = useState<PickerTarget | null>(null);
    const [pickerMode, setPickerMode]       = useState<'date' | 'time'>('date');

    // ── API state ────────────────────────────────────────────────────────────
    const [submitting, setSubmitting]       = useState(false);
    const [successEntry, setSuccessEntry]   = useState<PreApprovedEntry | null>(null);
    const [dupWarning, setDupWarning]       = useState<PreApprovedDuplicateWarning | null>(null);

    // ── Pre-fill from "repeat" template ─────────────────────────────────────
    useEffect(() => {
        if (params.prefill) {
            try {
                const t: Partial<CreatePreApprovedPayload> = JSON.parse(params.prefill);
                if (t.type) setSelectedType(t.type);
                if (t.mode) setMode(t.mode);
                if (t.scheduleType) setScheduleType(t.scheduleType);
                if (t.visitorName)  setVisitorName(t.visitorName);
                if (t.visitorPhone) setVisitorPhone(t.visitorPhone);
                if (t.vehicleLast4Digits) setVehicleLast4(t.vehicleLast4Digits);
                if (t.companyName)  setCompanyName(t.companyName);
                if (t.category)     setHelpCategory(t.category);
                if (t.customCategory) setCustomCategory(t.customCategory);
                if (t.daysOfWeek)   setRecurDays(t.daysOfWeek);
                if (t.timeFrom) {
                    const d = new Date(); const [h, m] = t.timeFrom.split(':').map(Number);
                    d.setHours(h, m, 0, 0); setRecurTimeFrom(d);
                }
                if (t.timeTo) {
                    const d = new Date(); const [h, m] = t.timeTo.split(':').map(Number);
                    d.setHours(h, m, 0, 0); setRecurTimeTo(d);
                }
                if (t.entriesPerDay) setEntriesPerDay(t.entriesPerDay);
                // Go to details step directly
                setStep('details');
            } catch {}
        }
    }, []);

    // ── Picker handler ───────────────────────────────────────────────────────
    const openPicker = (target: PickerTarget, mode: 'date' | 'time') => {
        setPickerTarget(target);
        setPickerMode(mode);
    };

    const onPickerChange = (_: any, date?: Date) => {
        if (Platform.OS === 'android') setPickerTarget(null);
        if (!date) return;
        switch (pickerTarget) {
            case 'onceDate':      setOnceDate(date); break;
            case 'onceStart':     setOnceStart(date); break;
            case 'onceEnd':       setOnceEnd(date); break;
            case 'recurFrom':     setRecurFrom(date); break;
            case 'recurUntil':    setRecurUntil(date); break;
            case 'recurTimeFrom': setRecurTimeFrom(date); break;
            case 'recurTimeTo':   setRecurTimeTo(date); break;
        }
    };

    const currentPickerValue = (): Date => {
        switch (pickerTarget) {
            case 'onceDate':      return onceDate;
            case 'onceStart':     return onceStart;
            case 'onceEnd':       return onceEnd;
            case 'recurFrom':     return recurFrom;
            case 'recurUntil':    return recurUntil;
            case 'recurTimeFrom': return recurTimeFrom;
            case 'recurTimeTo':   return recurTimeTo;
            default:              return new Date();
        }
    };

    // ── Toggle recurring day ──────────────────────────────────────────────────
    const toggleDay = (d: DayOfWeek) => {
        setRecurDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    };

    // ── Validation ───────────────────────────────────────────────────────────
    const canSubmit = (): boolean => {
        if (selectedType === 'CAB' && vehicleLast4.length !== 4) return false;
        if (selectedType === 'HELP' && !helpCategory) return false;
        if (selectedType === 'HELP' && helpCategory === 'OTHER' && !customCategory.trim()) return false;
        if (scheduleType === 'RECURRING' && recurDays.length === 0) return false;
        return true;
    };

    // ── Build payload ────────────────────────────────────────────────────────
    const buildPayload = (skipDup?: boolean): CreatePreApprovedPayload => {
        const base: CreatePreApprovedPayload = {
            type: selectedType,
            mode: selectedType === 'HELP' ? 'NORMAL' : mode,
            scheduleType,
        };

        if (visitorName.trim())  base.visitorName  = visitorName.trim();
        if (visitorPhone.trim()) {
            const p = visitorPhone.replace(/\D/g, '').replace(/^(91|0091|\+91)/, '').replace(/^0/, '');
            if (p.length >= 10) base.visitorPhone = p;
        }

        if (scheduleType === 'ONCE') {
            base.date      = toDateStr(onceDate);
            base.startTime = toHHMM(onceStart);
            base.endTime   = toHHMM(onceEnd);
        } else {
            base.validFrom     = recurFrom.toISOString();
            base.validUntil    = recurUntil.toISOString();
            base.daysOfWeek    = recurDays;
            base.timeFrom      = toHHMM(recurTimeFrom);
            base.timeTo        = toHHMM(recurTimeTo);
            base.entriesPerDay = entriesPerDay;
        }

        if (selectedType === 'CAB') {
            base.vehicleLast4Digits = vehicleLast4;
        }
        if (selectedType === 'DELIVERY') {
            if (companyName.trim()) base.companyName = companyName.trim();
            if (mode === 'SURPRISE') base.isSurprise = true;
        }
        if (selectedType === 'HELP' && helpCategory) {
            base.category = helpCategory;
            if (helpCategory === 'OTHER' && customCategory.trim()) {
                base.customCategory = customCategory.trim();
            }
        }

        base.graceBeforeMinutes = graceBefore;
        base.graceAfterMinutes  = graceAfter;
        if (skipDup) base.skipDuplicateCheck = true;

        return base;
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (skipDup = false) => {
        if (!canSubmit()) {
            if (selectedType === 'CAB' && vehicleLast4.length !== 4) {
                Alert.alert('Required', 'Please enter the last 4 digits of the vehicle number.');
            } else if (selectedType === 'HELP' && !helpCategory) {
                Alert.alert('Required', 'Please select a service category.');
            } else if (scheduleType === 'RECURRING' && recurDays.length === 0) {
                Alert.alert('Required', 'Please select at least one day of the week.');
            }
            return;
        }

        setSubmitting(true);
        setDupWarning(null);
        try {
            const result = await createPreApproved(buildPayload(skipDup));
            if (isDuplicateWarning(result)) {
                setDupWarning(result);
            } else {
                setSuccessEntry(result);
            }
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create pre-approval');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render helpers ────────────────────────────────────────────────────────

    const PickerButton = ({
        label, value, onPress,
    }: { label: string; value: string; onPress: () => void }) => (
        <View style={styles.pickerBlock}>
            <Text style={styles.microLabel}>{label}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={onPress}>
                <Feather
                    name={label.toLowerCase().includes('time') ? 'clock' : 'calendar'}
                    size={14}
                    color={SgateColors.goldDeep}
                />
                <Text style={styles.pickerBtnText}>{value}</Text>
            </TouchableOpacity>
        </View>
    );

    const SectionLabel = ({ title }: { title: string }) => (
        <Text style={styles.sectionLabel}>{title}</Text>
    );

    const InputField = ({
        label, placeholder, value, onChangeText, keyboardType, autoCapitalize, maxLength,
    }: {
        label: string;
        placeholder: string;
        value: string;
        onChangeText: (v: string) => void;
        keyboardType?: any;
        autoCapitalize?: any;
        maxLength?: number;
    }) => (
        <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text style={styles.microLabel}>{label}</Text>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.inputField}
                    placeholder={placeholder}
                    placeholderTextColor={SgateColors.t4}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    maxLength={maxLength}
                />
            </View>
        </Animated.View>
    );

    // ── STEP 1: Type selector ─────────────────────────────────────────────────
    if (step === 'type') {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pre-Approve</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.delay(0).springify()}>
                        <Text style={styles.stepTitle}>Who are you expecting?</Text>
                        <Text style={styles.stepSub}>Choose the type of visitor</Text>
                    </Animated.View>

                    {/* CAB */}
                    <Animated.View entering={FadeInDown.delay(80).springify()}>
                        <TouchableOpacity
                            style={[styles.typeCard, selectedType === 'CAB' && styles.typeCardActive]}
                            onPress={() => { setSelectedType('CAB'); setMode('NORMAL'); }}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.typeCardIcon, { backgroundColor: SgateColors.blueBg }]}>
                                <Feather name="navigation" size={26} color={SgateColors.blue} />
                            </View>
                            <View style={styles.typeCardInfo}>
                                <Text style={styles.typeCardTitle}>Cab</Text>
                                <Text style={styles.typeCardSub}>Ola, Uber, or any ride</Text>
                            </View>
                            {selectedType === 'CAB' && (
                                <Feather name="check-circle" size={22} color={SgateColors.blue} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* DELIVERY */}
                    <Animated.View entering={FadeInDown.delay(140).springify()}>
                        <TouchableOpacity
                            style={[styles.typeCard, selectedType === 'DELIVERY' && styles.typeCardActive]}
                            onPress={() => { setSelectedType('DELIVERY'); setMode('NORMAL'); }}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.typeCardIcon, { backgroundColor: SgateColors.greenBg }]}>
                                <Feather name="package" size={26} color={SgateColors.green} />
                            </View>
                            <View style={styles.typeCardInfo}>
                                <Text style={styles.typeCardTitle}>Delivery</Text>
                                <Text style={styles.typeCardSub}>Amazon, Swiggy, Zomato, etc.</Text>
                            </View>
                            {selectedType === 'DELIVERY' && (
                                <Feather name="check-circle" size={22} color={SgateColors.green} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* HELP */}
                    <Animated.View entering={FadeInDown.delay(200).springify()}>
                        <TouchableOpacity
                            style={[styles.typeCard, selectedType === 'HELP' && styles.typeCardActive]}
                            onPress={() => { setSelectedType('HELP'); setMode('NORMAL'); }}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.typeCardIcon, { backgroundColor: SgateColors.goldPale }]}>
                                <Feather name="tool" size={26} color={SgateColors.goldDeep} />
                            </View>
                            <View style={styles.typeCardInfo}>
                                <Text style={styles.typeCardTitle}>Help / Service</Text>
                                <Text style={styles.typeCardSub}>Plumber, electrician, tutor, etc.</Text>
                            </View>
                            {selectedType === 'HELP' && (
                                <Feather name="check-circle" size={22} color={SgateColors.goldDeep} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(260).springify()}>
                        <TouchableOpacity
                            style={styles.nextBtn}
                            onPress={() => setStep('details')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.nextBtnText}>Continue</Text>
                            <Feather name="arrow-right" size={18} color={SgateColors.card} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── STEP 2: Details form ──────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep('type')} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {selectedType === 'CAB' ? 'Cab Details' : selectedType === 'DELIVERY' ? 'Delivery Details' : 'Service Details'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Mode selector (CAB / DELIVERY) ──────────────────────── */}
                {selectedType !== 'HELP' && (
                    <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.section}>
                        <SectionLabel title="ACCESS MODE" />
                        <View style={styles.modeRow}>
                            <TouchableOpacity
                                style={[styles.modeChip, mode === 'NORMAL' && styles.modeChipActive]}
                                onPress={() => setMode('NORMAL')}
                            >
                                <Feather name="shield" size={14} color={mode === 'NORMAL' ? SgateColors.card : SgateColors.t3} style={{ marginRight: 5 }} />
                                <Text style={[styles.modeChipText, mode === 'NORMAL' && styles.modeChipTextActive]}>Normal</Text>
                            </TouchableOpacity>

                            {selectedType === 'CAB' && (
                                <TouchableOpacity
                                    style={[styles.modeChip, mode === 'SAFE' && styles.modeChipActive, mode === 'SAFE' && { backgroundColor: SgateColors.blue }]}
                                    onPress={() => setMode('SAFE')}
                                >
                                    <Feather name="lock" size={14} color={mode === 'SAFE' ? SgateColors.card : SgateColors.t3} style={{ marginRight: 5 }} />
                                    <Text style={[styles.modeChipText, mode === 'SAFE' && styles.modeChipTextActive]}>Safe Mode</Text>
                                </TouchableOpacity>
                            )}

                            {selectedType === 'DELIVERY' && (
                                <TouchableOpacity
                                    style={[styles.modeChip, mode === 'SURPRISE' && styles.modeChipActive, mode === 'SURPRISE' && { backgroundColor: '#9B6DFF' }]}
                                    onPress={() => setMode('SURPRISE')}
                                >
                                    <Feather name="gift" size={14} color={mode === 'SURPRISE' ? SgateColors.card : SgateColors.t3} style={{ marginRight: 5 }} />
                                    <Text style={[styles.modeChipText, mode === 'SURPRISE' && styles.modeChipTextActive]}>Surprise</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Safe mode hint */}
                        {mode === 'SAFE' && (
                            <View style={styles.hintBox}>
                                <Feather name="info" size={13} color={SgateColors.blue} style={{ marginRight: 6, marginTop: 1 }} />
                                <Text style={[styles.hintText, { color: SgateColors.blue }]}>
                                    Safe mode hides your flat info from guard display. Only a validated last-4 of the vehicle plate is checked.
                                </Text>
                            </View>
                        )}
                        {mode === 'SURPRISE' && (
                            <View style={styles.hintBox}>
                                <Feather name="info" size={13} color={'#9B6DFF'} style={{ marginRight: 6, marginTop: 1 }} />
                                <Text style={[styles.hintText, { color: '#9B6DFF' }]}>
                                    Surprise delivery — the guard won't be notified of the sender or company details.
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* ── CAB: vehicle last 4 (always required for gate verification) */}
                {selectedType === 'CAB' && (
                    <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.section}>
                        <Text style={styles.microLabel}>VEHICLE LAST 4 DIGITS</Text>
                        <View style={styles.inputRow}>
                            <Feather name="hash" size={16} color={SgateColors.t4} style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="e.g. 1234"
                                placeholderTextColor={SgateColors.t4}
                                value={vehicleLast4}
                                onChangeText={t => setVehicleLast4(t.replace(/\D/g, '').slice(0, 4))}
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                            <Text style={styles.charCount}>{vehicleLast4.length}/4</Text>
                        </View>
                    </Animated.View>
                )}

                {/* ── HELP: Category picker ────────────────────────────────── */}
                {selectedType === 'HELP' && (
                    <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.section}>
                        <Text style={styles.microLabel}>SERVICE CATEGORY *</Text>
                        <TouchableOpacity
                            style={styles.selectRow}
                            onPress={() => setShowCategoryPicker(true)}
                        >
                            <Feather name="briefcase" size={16} color={SgateColors.t4} style={{ marginRight: 8 }} />
                            <Text style={[styles.selectRowText, !helpCategory && { color: SgateColors.t4 }]}>
                                {helpCategory
                                    ? HELP_CATEGORIES.find(c => c.value === helpCategory)?.label ?? helpCategory
                                    : 'Select category'}
                            </Text>
                            <Feather name="chevron-down" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>

                        {helpCategory === 'OTHER' && (
                            <View style={[styles.inputRow, { marginTop: 10 }]}>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Describe the service"
                                    placeholderTextColor={SgateColors.t4}
                                    value={customCategory}
                                    onChangeText={setCustomCategory}
                                    maxLength={100}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* ── Visitor name + phone ─────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.section}>
                    <SectionLabel title="VISITOR DETAILS (OPTIONAL)" />
                    <View style={styles.inputRow}>
                        <Feather name="user" size={16} color={SgateColors.t4} style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.inputField}
                            placeholder="Visitor name"
                            placeholderTextColor={SgateColors.t4}
                            value={visitorName}
                            onChangeText={setVisitorName}
                            autoCapitalize="words"
                        />
                    </View>
                    <View style={[styles.inputRow, { marginTop: 10 }]}>
                        <Feather name="phone" size={16} color={SgateColors.t4} style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.inputField}
                            placeholder="Phone number"
                            placeholderTextColor={SgateColors.t4}
                            value={visitorPhone}
                            onChangeText={setVisitorPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* DELIVERY: company name */}
                    {selectedType === 'DELIVERY' && (
                        <View style={[styles.inputRow, { marginTop: 10 }]}>
                            <Feather name="truck" size={16} color={SgateColors.t4} style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Company name (e.g. Amazon)"
                                placeholderTextColor={SgateColors.t4}
                                value={companyName}
                                onChangeText={setCompanyName}
                                autoCapitalize="words"
                            />
                        </View>
                    )}
                </Animated.View>

                {/* ── Schedule type ────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
                    <SectionLabel title="SCHEDULE" />
                    <View style={styles.modeRow}>
                        <TouchableOpacity
                            style={[styles.modeChip, scheduleType === 'ONCE' && styles.modeChipActive]}
                            onPress={() => setScheduleType('ONCE')}
                        >
                            <Text style={[styles.modeChipText, scheduleType === 'ONCE' && styles.modeChipTextActive]}>One-time</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeChip, scheduleType === 'RECURRING' && styles.modeChipActive]}
                            onPress={() => setScheduleType('RECURRING')}
                        >
                            <Feather name="repeat" size={13} color={scheduleType === 'RECURRING' ? SgateColors.card : SgateColors.t3} style={{ marginRight: 5 }} />
                            <Text style={[styles.modeChipText, scheduleType === 'RECURRING' && styles.modeChipTextActive]}>Recurring</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── ONCE: date + times ───────────────────────────────────── */}
                {scheduleType === 'ONCE' && (
                    <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
                        <View style={styles.pickerRow}>
                            <PickerButton
                                label="DATE"
                                value={formatDisplayDate(onceDate)}
                                onPress={() => openPicker('onceDate', 'date')}
                            />
                            <PickerButton
                                label="START TIME"
                                value={formatDisplayTime(onceStart)}
                                onPress={() => openPicker('onceStart', 'time')}
                            />
                            <PickerButton
                                label="END TIME"
                                value={formatDisplayTime(onceEnd)}
                                onPress={() => openPicker('onceEnd', 'time')}
                            />
                        </View>
                    </Animated.View>
                )}

                {/* ── RECURRING ─────────────────────────────────────────────── */}
                {scheduleType === 'RECURRING' && (
                    <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
                        {/* Validity range */}
                        <Text style={styles.microLabel}>VALID PERIOD</Text>
                        <View style={styles.pickerRow}>
                            <PickerButton
                                label="FROM DATE"
                                value={formatDisplayDate(recurFrom)}
                                onPress={() => openPicker('recurFrom', 'date')}
                            />
                            <PickerButton
                                label="UNTIL DATE"
                                value={formatDisplayDate(recurUntil)}
                                onPress={() => openPicker('recurUntil', 'date')}
                            />
                        </View>

                        {/* Days of week */}
                        <Text style={[styles.microLabel, { marginTop: 14 }]}>DAYS OF WEEK *</Text>
                        <View style={styles.daysRow}>
                            {DAYS.map(d => {
                                const active = recurDays.includes(d.value);
                                return (
                                    <TouchableOpacity
                                        key={d.value}
                                        style={[styles.dayChip, active && styles.dayChipActive]}
                                        onPress={() => toggleDay(d.value)}
                                    >
                                        <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Time range */}
                        <Text style={[styles.microLabel, { marginTop: 14 }]}>TIME WINDOW</Text>
                        <View style={styles.pickerRow}>
                            <PickerButton
                                label="FROM TIME"
                                value={formatDisplayTime(recurTimeFrom)}
                                onPress={() => openPicker('recurTimeFrom', 'time')}
                            />
                            <PickerButton
                                label="TO TIME"
                                value={formatDisplayTime(recurTimeTo)}
                                onPress={() => openPicker('recurTimeTo', 'time')}
                            />
                        </View>

                        {/* Entries per day */}
                        <Text style={[styles.microLabel, { marginTop: 14 }]}>ENTRIES PER DAY</Text>
                        <View style={styles.stepperRow}>
                            <TouchableOpacity
                                style={styles.stepperBtn}
                                onPress={() => setEntriesPerDay(Math.max(1, entriesPerDay - 1))}
                                disabled={entriesPerDay <= 1}
                            >
                                <Feather name="minus" size={18} color={entriesPerDay <= 1 ? SgateColors.t4 : SgateColors.t1} />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{entriesPerDay}</Text>
                            <TouchableOpacity
                                style={styles.stepperBtn}
                                onPress={() => setEntriesPerDay(Math.min(10, entriesPerDay + 1))}
                                disabled={entriesPerDay >= 10}
                            >
                                <Feather name="plus" size={18} color={entriesPerDay >= 10 ? SgateColors.t4 : SgateColors.t1} />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* ── Advanced (grace) ─────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                    <TouchableOpacity
                        style={styles.advancedToggle}
                        onPress={() => setShowAdvanced(v => !v)}
                    >
                        <Text style={styles.advancedToggleText}>Advanced Settings</Text>
                        <Feather name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color={SgateColors.t3} />
                    </TouchableOpacity>

                    {showAdvanced && (
                        <View style={styles.advancedBody}>
                            <View style={styles.graceRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.microLabel}>GRACE BEFORE (min)</Text>
                                    <View style={styles.stepperRow}>
                                        <TouchableOpacity style={styles.stepperBtn} onPress={() => setGraceBefore(Math.max(0, graceBefore - 5))}>
                                            <Feather name="minus" size={16} color={SgateColors.t2} />
                                        </TouchableOpacity>
                                        <Text style={styles.stepperValue}>{graceBefore}</Text>
                                        <TouchableOpacity style={styles.stepperBtn} onPress={() => setGraceBefore(Math.min(60, graceBefore + 5))}>
                                            <Feather name="plus" size={16} color={SgateColors.t2} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={{ width: 16 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.microLabel}>GRACE AFTER (min)</Text>
                                    <View style={styles.stepperRow}>
                                        <TouchableOpacity style={styles.stepperBtn} onPress={() => setGraceAfter(Math.max(0, graceAfter - 5))}>
                                            <Feather name="minus" size={16} color={SgateColors.t2} />
                                        </TouchableOpacity>
                                        <Text style={styles.stepperValue}>{graceAfter}</Text>
                                        <TouchableOpacity style={styles.stepperBtn} onPress={() => setGraceAfter(Math.min(120, graceAfter + 5))}>
                                            <Feather name="plus" size={16} color={SgateColors.t2} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* ── Duplicate warning banner ─────────────────────────────── */}
                {dupWarning && (
                    <Animated.View entering={FadeInDown.springify()} style={styles.dupWarning}>
                        <Feather name="alert-triangle" size={16} color={SgateColors.goldDeep} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dupWarningTitle}>Similar entry already exists</Text>
                            <Text style={styles.dupWarningText}>{dupWarning.message}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.dupCreateBtn}
                            onPress={() => handleSubmit(true)}
                        >
                            <Text style={styles.dupCreateBtnText}>Create Anyway</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* ── Submit ──────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(240).springify()}>
                    <TouchableOpacity
                        style={[styles.submitBtn, (!canSubmit() || submitting) && styles.submitBtnDisabled]}
                        onPress={() => handleSubmit(false)}
                        disabled={!canSubmit() || submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={SgateColors.gold} />
                        ) : (
                            <>
                                <Feather name="shield" size={17} color={SgateColors.gold} style={{ marginRight: 8 }} />
                                <Text style={styles.submitBtnText}>Generate Pre-Approval</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Native date/time picker ──────────────────────────────────── */}
            {pickerTarget && (
                <DateTimePicker
                    value={currentPickerValue()}
                    mode={pickerMode}
                    is24Hour
                    display="default"
                    onChange={onPickerChange}
                />
            )}

            {/* ── Category picker modal ────────────────────────────────────── */}
            <Modal
                visible={showCategoryPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCategoryPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCategoryPicker(false)}
                >
                    <View style={styles.catSheet}>
                        <View style={styles.catSheetHandle} />
                        <Text style={styles.catSheetTitle}>Select Category</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {HELP_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.value}
                                    style={[styles.catItem, helpCategory === cat.value && styles.catItemActive]}
                                    onPress={() => { setHelpCategory(cat.value); setShowCategoryPicker(false); }}
                                >
                                    <Text style={[styles.catItemText, helpCategory === cat.value && styles.catItemTextActive]}>
                                        {cat.label}
                                    </Text>
                                    {helpCategory === cat.value && (
                                        <Feather name="check" size={16} color={SgateColors.gold} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Success modal ────────────────────────────────────────────── */}
            <Modal
                visible={!!successEntry}
                transparent
                animationType="slide"
                onRequestClose={() => { setSuccessEntry(null); router.back(); }}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.88)', padding: 0 }]}>
                    {successEntry && (
                        <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                            <QRCarousel
                                passes={[{
                                    id: successEntry.id,
                                    code: successEntry.qrToken ?? successEntry.id,
                                    name: successEntry.meta.visitorName ?? successEntry.type,
                                    type: successEntry.type,
                                    validUntil: scheduleType === 'ONCE'
                                        ? `${toDateStr(onceDate)} ${toHHMM(onceEnd)}`
                                        : `Until ${formatDisplayDate(recurUntil)}`,
                                }]}
                                hostName="You"
                                onDone={() => { setSuccessEntry(null); router.back(); }}
                            />
                        </View>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        flex: 1, textAlign: 'center',
        fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1,
    },

    scrollContent: { padding: 20 },

    stepTitle: {
        fontSize: 22, fontFamily: SgateFonts.bold,
        color: SgateColors.t1, marginBottom: 4,
    },
    stepSub: {
        fontSize: 14, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, marginBottom: 24,
    },

    // ── Type cards ───────────────────────────────────────────────────────────
    typeCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 18, borderWidth: 1.5,
        borderColor: SgateColors.borderSoft,
        flexDirection: 'row', alignItems: 'center',
        padding: 16, marginBottom: 12, gap: 14,
    },
    typeCardActive: { borderColor: SgateColors.black },
    typeCardIcon: {
        width: 52, height: 52, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    typeCardInfo: { flex: 1 },
    typeCardTitle: {
        fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1,
    },
    typeCardSub: {
        fontSize: 12, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, marginTop: 3,
    },

    nextBtn: {
        backgroundColor: SgateColors.black, borderRadius: 16,
        paddingVertical: 16, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', marginTop: 8,
    },
    nextBtnText: {
        fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.card,
    },

    // ── Section ──────────────────────────────────────────────────────────────
    section: { marginBottom: 20 },
    sectionLabel: {
        fontSize: 11, fontFamily: SgateFonts.bold,
        color: SgateColors.t3, letterSpacing: 1, marginBottom: 10,
        textTransform: 'uppercase',
    },
    microLabel: {
        fontSize: 11, fontFamily: SgateFonts.bold,
        color: SgateColors.t3, letterSpacing: 1, marginBottom: 8,
        textTransform: 'uppercase',
    },

    // ── Mode chips ───────────────────────────────────────────────────────────
    modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    modeChip: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 12, backgroundColor: SgateColors.surface,
        borderWidth: 1.5, borderColor: SgateColors.border,
    },
    modeChipActive: {
        backgroundColor: SgateColors.black, borderColor: SgateColors.black,
    },
    modeChipText: {
        fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3,
    },
    modeChipTextActive: { color: SgateColors.card },

    hintBox: {
        flexDirection: 'row', alignItems: 'flex-start',
        marginTop: 10, backgroundColor: SgateColors.blueBg,
        borderRadius: 12, padding: 10,
    },
    hintText: {
        flex: 1, fontSize: 12, fontFamily: SgateFonts.regular, lineHeight: 18,
    },

    // ── Input ────────────────────────────────────────────────────────────────
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 14, paddingHorizontal: 14,
    },
    inputField: {
        flex: 1, paddingVertical: 13,
        fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1,
    },
    charCount: {
        fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4,
    },

    // ── Select row ───────────────────────────────────────────────────────────
    selectRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    },
    selectRowText: {
        flex: 1, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1,
    },

    // ── Picker row ───────────────────────────────────────────────────────────
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pickerBlock: { flex: 1, minWidth: 100 },
    pickerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 12, padding: 11,
    },
    pickerBtnText: {
        fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t1, flex: 1,
    },

    // ── Days ─────────────────────────────────────────────────────────────────
    daysRow: { flexDirection: 'row', gap: 6 },
    dayChip: {
        flex: 1, alignItems: 'center', paddingVertical: 9,
        borderRadius: 10, backgroundColor: SgateColors.surface,
        borderWidth: 1.5, borderColor: SgateColors.border,
    },
    dayChipActive: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },
    dayChipText: {
        fontSize: 11, fontFamily: SgateFonts.semibold, color: SgateColors.t3,
    },
    dayChipTextActive: { color: SgateColors.card },

    // ── Stepper ──────────────────────────────────────────────────────────────
    stepperRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 12, borderWidth: 1.5, borderColor: SgateColors.border,
        overflow: 'hidden',
    },
    stepperBtn: {
        width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
    },
    stepperValue: {
        flex: 1, textAlign: 'center',
        fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1,
    },

    // ── Advanced ─────────────────────────────────────────────────────────────
    advancedToggle: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: SgateColors.borderSoft,
    },
    advancedToggleText: {
        fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3,
    },
    advancedBody: { paddingTop: 12 },
    graceRow: { flexDirection: 'row' },

    // ── Duplicate warning ────────────────────────────────────────────────────
    dupWarning: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: SgateColors.goldPale,
        borderRadius: 14, padding: 14, marginBottom: 16,
        borderWidth: 1.5, borderColor: '#FFB80050',
    },
    dupWarningTitle: {
        fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2,
    },
    dupWarningText: {
        fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3,
    },
    dupCreateBtn: {
        backgroundColor: SgateColors.goldDeep, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8, marginTop: 2,
        alignSelf: 'flex-start',
    },
    dupCreateBtnText: {
        fontSize: 12, fontFamily: SgateFonts.bold, color: '#FFFFFF',
    },

    // ── Submit ───────────────────────────────────────────────────────────────
    submitBtn: {
        backgroundColor: SgateColors.black, borderRadius: 16,
        paddingVertical: 17, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: {
        fontSize: 16, fontFamily: SgateFonts.bold, color: '#FFFFFF',
    },

    // ── Modals ───────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    catSheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 36, maxHeight: '75%',
    },
    catSheetHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center', marginBottom: 16,
    },
    catSheetTitle: {
        fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 12,
    },
    catItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    catItemActive: { backgroundColor: SgateColors.goldPale + '88', borderRadius: 10, paddingHorizontal: 8 },
    catItemText: {
        fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1,
    },
    catItemTextActive: { color: SgateColors.goldDeep, fontFamily: SgateFonts.semibold },
});
