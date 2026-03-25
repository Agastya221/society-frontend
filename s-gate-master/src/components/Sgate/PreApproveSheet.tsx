'use no memo';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector, NativeViewGestureHandler } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    interpolate,
    runOnJS,
    SlideInRight,
    SlideOutRight,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { createInvitePass, DELIVERY_COMPANIES } from '@/services/gate.service';
import { useAuthStore } from '@/store/useAuthStore';
import { SelectGuestsPanel } from './SelectGuestsPanel';

// ─── Types ───────────────────────────────────────────────────────────────────

type InviteType = 'GUEST' | 'CAB' | 'DELIVERY' | 'SERVICE';
type FreqTab    = 'once' | 'frequently';

export interface PreApproveSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: (result: { type: InviteType; id?: string }) => void;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const { height: SH, width: SW } = Dimensions.get('window');
const EO = Easing.bezier(0.16, 1, 0.3, 1);
const EI = Easing.bezier(0.55, 0, 1, 0.45);

// Spring configs for premium feel
const SPRING_SMOOTH  = { damping: 22, stiffness: 200, mass: 0.8 };
const SPRING_SNAPPY  = { damping: 18, stiffness: 280, mass: 0.6 };

const TYPES: {
    key: InviteType;
    label: string;
    desc: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    iconColor: string;
    iconBg: string;
}[] = [
    { key: 'GUEST',    label: 'Guest',    desc: 'Friends, family visiting',      icon: 'users',      iconColor: SgateColors.goldDeep, iconBg: SgateColors.goldPale },
    { key: 'CAB',      label: 'Cab',      desc: 'Uber, Ola, booked taxi',       icon: 'navigation', iconColor: SgateColors.blue,     iconBg: SgateColors.blueBg   },
    { key: 'DELIVERY', label: 'Delivery', desc: 'Amazon, Swiggy, packages',     icon: 'package',    iconColor: SgateColors.green,    iconBg: SgateColors.greenBg  },
    { key: 'SERVICE',  label: 'Service',  desc: 'Plumber, electrician, repairs', icon: 'tool',       iconColor: SgateColors.t2,       iconBg: SgateColors.surface  },
];

const DURATIONS = ['1 hour', '2 hours', '3 hours', '4 hours', '6 hours', '8 hours', '12 hours'];
const VALIDITY  = [{ label: '1 week', days: 7 }, { label: '1 month', days: 30 }, { label: '3 months', days: 90 }];
const DAYS_OPTS = ['All days of Week', 'Weekdays only', 'Weekends only'];
const ENTRIES   = ['One Entry', 'Two Entries', 'Unlimited'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt12(d: Date) {
    const h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

function fmtDateShort(d: Date) {
    return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}

function isToday(d: Date) {
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function addDays(d: Date, n: number) {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Picker modal ────────────────────────────────────────────────────────────
function PickerSheet({ visible, title, options, selected, onSelect, onClose }: {
    visible: boolean; title: string; options: string[];
    selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
    if (!visible) return null;
    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <Pressable style={S.pickerBg} onPress={onClose}>
                <View style={S.pickerBox}>
                    <View style={S.pickerHandleRow}><View style={S.handle} /></View>
                    <Text style={S.pickerTitle}>{title}</Text>
                    <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                        {options.map(o => (
                            <TouchableOpacity key={o} style={S.pickerRow} onPress={() => { onSelect(o); onClose(); }} activeOpacity={0.6}>
                                <Text style={[S.pickerRowText, o === selected && S.pickerRowTextActive]}>{o}</Text>
                                {o === selected && <Feather name="check" size={16} color={SgateColors.goldDeep} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
}

// ─── Dropdown row ────────────────────────────────────────────────────────────
function Dropdown({ value, options, onSelect, icon = 'chevron-down', title }: {
    value: string; options: string[]; onSelect: (v: string) => void;
    icon?: React.ComponentProps<typeof Feather>['name']; title?: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <TouchableOpacity style={S.dropRow} onPress={() => setOpen(true)} activeOpacity={0.7}>
                <Text style={S.dropText}>{value}</Text>
                <Feather name={icon} size={18} color={SgateColors.t3} />
            </TouchableOpacity>
            <PickerSheet visible={open} title={title ?? 'Select'} options={options}
                selected={value} onSelect={onSelect} onClose={() => setOpen(false)} />
        </>
    );
}

// ─── Check card (Make it private / Surprise Delivery) ────────────────────────
function CheckCard({ checked, onToggle, title, desc, rightIcon, rightIconBg, rightIconColor, cardStyle }: {
    checked: boolean; onToggle: () => void; title: string; desc: string;
    rightIcon?: React.ComponentProps<typeof Feather>['name'];
    rightIconBg?: string; rightIconColor?: string;
    cardStyle?: object;
}) {
    return (
        <TouchableOpacity style={[S.checkCard, cardStyle]} onPress={onToggle} activeOpacity={0.7}>
            <View style={[S.checkbox, checked && S.checkboxOn]}>
                {checked && <Feather name="check" size={11} color="#fff" />}
            </View>
            <View style={S.checkTexts}>
                <Text style={S.checkTitle}>{title}</Text>
                <Text style={S.checkDesc}>{desc}</Text>
            </View>
            {rightIcon && (
                <View style={[S.checkIconCircle, { backgroundColor: rightIconBg ?? SgateColors.surface }]}>
                    <Feather name={rightIcon} size={16} color={rightIconColor ?? SgateColors.t3} />
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Animated type card ───────────────────────────────────────────────────────
function TypeCard({ opt, onPress, anim }: {
    opt: typeof TYPES[0]; onPress: () => void; anim: SharedValue<number>;
}) {
    const style = useAnimatedStyle(() => ({
        opacity: anim.value,
        transform: [
            { translateY: interpolate(anim.value, [0, 1], [20, 0]) },
            { scale:      interpolate(anim.value, [0, 1], [0.97, 1]) },
        ],
    }));
    return (
        <Animated.View style={style}>
            <TouchableOpacity style={S.typeCard} onPress={onPress} activeOpacity={0.65}>
                <View style={[S.typeIconWrap, { backgroundColor: opt.iconBg }]}>
                    <Feather name={opt.icon} size={22} color={opt.iconColor} />
                </View>
                <View style={S.typeTexts}>
                    <Text style={S.typeLabel}>{opt.label}</Text>
                    <Text style={S.typeDesc}>{opt.desc}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={SgateColors.t4} />
            </TouchableOpacity>
        </Animated.View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — TYPE SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

function TypeSelector({ onSelect, anims }: {
    onSelect: (t: InviteType) => void; anims: SharedValue<number>[];
}) {
    return (
        <View style={S.selectorWrap}>
            <Text style={S.sheetTitle}>Allow Future Entries</Text>
            <Text style={S.sheetSub}>Who do you want to pre-approve?</Text>
            <View style={S.typeList}>
                {TYPES.map((t, i) => (
                    <TypeCard key={t.key} opt={t} onPress={() => onSelect(t.key)} anim={anims[i]} />
                ))}
            </View>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — FORM PANELS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Guest Once ──────────────────────────────────────────────────────────────
function GuestOnce({ state }: { state: FormState }) {
    return (
        <View style={S.formBody}>
            {/* Make it private */}
            <CheckCard
                checked={state.isPrivate}
                onToggle={() => state.setIsPrivate(!state.isPrivate)}
                title="Make it private"
                desc="Silent entry — flat members not notified"
                rightIcon="lock"
                rightIconBg={SgateColors.surface}
                rightIconColor={SgateColors.t3}
                cardStyle={S.checkCardBordered}
            />

            {/* Date */}
            <Text style={S.fieldLabel}>SELECT DATE</Text>
            <TouchableOpacity style={S.dropRow} onPress={state.openDate} activeOpacity={0.7}>
                <Text style={S.dropText}>{isToday(state.date) ? 'Today' : fmtDateShort(state.date)}</Text>
                <Feather name="calendar" size={18} color={SgateColors.t3} />
            </TouchableOpacity>

            {/* Time + Duration */}
            <View style={S.twoCol}>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>STARTING FROM</Text>
                    <TouchableOpacity style={S.dropRow} onPress={state.openTime} activeOpacity={0.7}>
                        <Text style={S.dropText}>{fmt12(state.time)}</Text>
                        <Feather name="clock" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>VALID FOR</Text>
                    <Dropdown value={state.duration} options={DURATIONS}
                        onSelect={state.setDuration} icon="clock" title="Valid For" />
                </View>
            </View>
        </View>
    );
}

// ─── Cab Once ────────────────────────────────────────────────────────────────
function CabOnce({ state }: { state: FormState }) {
    return (
        <View style={S.formBody}>

            {/* Duration text */}
            <Text style={S.bodyLine}>
                Allow my cab to enter{' '}
                <Text style={S.bodyUnderline}>today</Text>
                {' '}once in next
            </Text>
            <Dropdown value={state.duration} options={DURATIONS.slice(0, 5)}
                onSelect={state.setDuration} title="Duration" />

            {/* Vehicle digits */}
            <Text style={S.fieldLabel}>ADD LAST 4-DIGITS OF VEHICLE NO.</Text>
            <View style={S.digitRow}>
                {state.digits.map((d, i) => (
                    <TextInput
                        key={i}
                        ref={r => { state.digitRefs.current[i] = r; }}
                        style={[S.digitBox, d ? S.digitBoxFilled : null]}
                        value={d}
                        onChangeText={v => state.onDigit(i, v)}
                        maxLength={1}
                        autoCapitalize="characters"
                        textAlign="center"
                        keyboardType="default"
                    />
                ))}
            </View>

            <TouchableOpacity style={S.advLink}>
                <Text style={S.advText}>Advanced Options »</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Delivery Once ───────────────────────────────────────────────────────────
function DeliveryOnce({ state }: { state: FormState }) {
    return (
        <View style={S.formBody}>
            <CheckCard
                checked={state.surpriseDelivery}
                onToggle={() => state.setSurpriseDelivery(!state.surpriseDelivery)}
                title="Surprise Delivery"
                desc="Deliveries without notifying flat members."
                cardStyle={S.checkCardBordered}
            />

            <Text style={S.bodyLine}>
                Allow delivery executive to enter{' '}
                <Text style={S.bodyUnderline}>today</Text>
                {' '}once in next
            </Text>
            <Dropdown value={state.duration} options={DURATIONS.slice(0, 5)}
                onSelect={state.setDuration} title="Duration" />

            <TouchableOpacity style={S.advLink}>
                <Text style={S.advText}>Advanced Options</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Service Once ────────────────────────────────────────────────────────────
function ServiceOnce({ state }: { state: FormState }) {
    return (
        <View style={S.formBody}>
            <Text style={S.fieldLabel}>SELECT DATE</Text>
            <TouchableOpacity style={S.dropRow} onPress={state.openDate} activeOpacity={0.7}>
                <Text style={S.dropText}>{isToday(state.date) ? 'Today' : fmtDateShort(state.date)}</Text>
                <Feather name="calendar" size={18} color={SgateColors.t3} />
            </TouchableOpacity>

            <View style={S.twoCol}>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>STARTING FROM</Text>
                    <TouchableOpacity style={S.dropRow} onPress={state.openTime} activeOpacity={0.7}>
                        <Text style={S.dropText}>{fmt12(state.time)}</Text>
                        <Feather name="clock" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>VALID FOR</Text>
                    <Dropdown value={state.duration} options={DURATIONS}
                        onSelect={state.setDuration} icon="clock" title="Valid For" />
                </View>
            </View>

            <TouchableOpacity style={S.advLink}>
                <Text style={S.advText}>Advanced Options »</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Guest Frequently ────────────────────────────────────────────────────────
function GuestFrequently({ state }: { state: FormState }) {
    const start = new Date();
    const end   = addDays(start, state.validityDays);
    return (
        <View style={S.formBody}>
            <Text style={S.fieldLabel}>ALLOW ENTRY FOR NEXT</Text>
            <View style={S.chipRow}>
                {VALIDITY.map(v => (
                    <TouchableOpacity
                        key={v.days}
                        style={[S.chip, state.validityDays === v.days && S.chipActive]}
                        onPress={() => state.setValidityDays(v.days)}
                    >
                        <Text style={[S.chipText, state.validityDays === v.days && S.chipTextActive]}>
                            {v.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={S.twoCol}>
                <View style={S.col}>
                    <Text style={S.fieldLabelMuted}>Start date</Text>
                    <View style={S.dropRow}>
                        <Text style={S.dropText}>{fmtDateShort(start)}</Text>
                        <Feather name="calendar" size={18} color={SgateColors.t3} />
                    </View>
                </View>
                <View style={S.col}>
                    <Text style={S.fieldLabelMuted}>End date</Text>
                    <View style={S.dropRow}>
                        <Text style={S.dropText}>{fmtDateShort(end)}</Text>
                        <Feather name="calendar" size={18} color={SgateColors.t3} />
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Standing Frequently (Cab / Delivery / Service) ──────────────────────────
function StandingFrequently({ state }: { state: FormState }) {
    return (
        <View style={S.formBody}>
            <Text style={S.fieldLabel}>SELECT DAYS OF WEEK</Text>
            <Dropdown value={state.selectedDays} options={DAYS_OPTS}
                onSelect={state.setSelectedDays} title="Days of Week" />

            <Text style={S.fieldLabel}>SELECT VALIDITY</Text>
            <Dropdown
                value={VALIDITY.find(v => v.days === state.validityDays)?.label ?? `${state.validityDays} days`}
                options={VALIDITY.map(v => v.label)}
                onSelect={l => { const f = VALIDITY.find(v => v.label === l); if (f) state.setValidityDays(f.days); }}
                title="Validity" />

            <Text style={S.fieldLabel}>SELECT TIME SLOT</Text>
            <View style={S.twoCol}>
                <View style={S.col}>
                    <Dropdown value={state.timeFrom} options={['00:00 am','06:00 am','08:00 am','09:00 am','10:00 am']}
                        onSelect={state.setTimeFrom} icon="clock" title="From" />
                </View>
                <View style={S.col}>
                    <Dropdown value={state.timeUntil} options={['06:00 pm','08:00 pm','10:00 pm','11:59 pm']}
                        onSelect={state.setTimeUntil} icon="clock" title="Until" />
                </View>
            </View>

            <Text style={S.fieldLabel}>SELECT ENTRIES PER DAY</Text>
            <Dropdown value={state.entriesLabel} options={ENTRIES}
                onSelect={state.setEntriesLabel} title="Entries Per Day" />

            {(state.inviteType === 'DELIVERY') && (
                <>
                    <Text style={S.fieldLabel}>COMPANY NAME</Text>
                    <Dropdown value={state.company || 'Select company'}
                        options={DELIVERY_COMPANIES} onSelect={state.setCompany} title="Company" />
                </>
            )}
        </View>
    );
}

// ─── Form state type ─────────────────────────────────────────────────────────
interface FormState {
    inviteType: InviteType;
    isPrivate: boolean; setIsPrivate: (v: boolean) => void;
    date: Date; openDate: () => void;
    time: Date; openTime: () => void;
    duration: string; setDuration: (v: string) => void;
    digits: string[]; onDigit: (i: number, v: string) => void;
    digitRefs: React.MutableRefObject<(TextInput | null)[]>;
    surpriseDelivery: boolean; setSurpriseDelivery: (v: boolean) => void;
    validityDays: number; setValidityDays: (v: number) => void;
    selectedDays: string; setSelectedDays: (v: string) => void;
    entriesLabel: string; setEntriesLabel: (v: string) => void;
    company: string; setCompany: (v: string) => void;
    timeFrom: string; setTimeFrom: (v: string) => void;
    timeUntil: string; setTimeUntil: (v: string) => void;
    nativeScrollRef: React.RefObject<any>;
}

// ─── Form panel wrapper ───────────────────────────────────────────────────────
function FormPanel({ inviteType, tab, setTab, onBack, state, submitting, onSubmit }: {
    inviteType: InviteType; tab: FreqTab; setTab: (t: FreqTab) => void;
    onBack: () => void; state: FormState; submitting: boolean; onSubmit: () => void;
}) {
    const isGuest = inviteType === 'GUEST';
    const ctaText = isGuest ? 'Select Guest(s)' : undefined;

    function renderContent() {
        if (tab === 'once') {
            if (inviteType === 'GUEST')    return <GuestOnce state={state} />;
            if (inviteType === 'CAB')      return <CabOnce state={state} />;
            if (inviteType === 'DELIVERY') return <DeliveryOnce state={state} />;
            return <ServiceOnce state={state} />;
        } else {
            if (inviteType === 'GUEST') return <GuestFrequently state={state} />;
            return <StandingFrequently state={state} />;
        }
    }

    return (
        <View style={S.formPanel}>
            {/* Tab header */}
            <View style={S.tabHeader}>
                <TouchableOpacity onPress={onBack} style={S.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t2} />
                </TouchableOpacity>
                {(['once', 'frequently'] as FreqTab[]).map(t => (
                    <TouchableOpacity key={t} style={S.tabItem} onPress={() => setTab(t)} activeOpacity={0.7}>
                        <Text style={[S.tabText, tab === t && S.tabTextActive]}>
                            {t === 'once' ? 'Once' : 'Frequently'}
                        </Text>
                        {tab === t && <View style={S.tabLine} />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Scrollable content — wrapped so pan-to-dismiss and scroll work simultaneously */}
            <NativeViewGestureHandler ref={state.nativeScrollRef}>
                <ScrollView
                    style={S.formScroll}
                    contentContainerStyle={S.formScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    {renderContent()}
                </ScrollView>
            </NativeViewGestureHandler>

            {/* Fixed CTA */}
            <View style={S.ctaWrap}>
                <TouchableOpacity
                    style={[S.ctaBtn, submitting && S.ctaBtnDisabled]}
                    onPress={onSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                >
                    {ctaText
                        ? <Text style={S.ctaText}>{ctaText}</Text>
                        : <Feather name="check" size={26} color={SgateColors.black} />
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUEST INVITE FLOW
// ═══════════════════════════════════════════════════════════════════════════════


const INVITE_THEMES: { icon: React.ComponentProps<typeof Feather>['name']; color: string; bg: string }[] = [
    { icon: 'home',     color: SgateColors.goldDeep, bg: SgateColors.goldPale },
    { icon: 'gift',     color: SgateColors.blue,     bg: SgateColors.blueBg   },
    { icon: 'music',    color: SgateColors.green,    bg: SgateColors.greenBg  },
    { icon: 'film',     color: SgateColors.violet,   bg: '#F0EBFF'            },
    { icon: 'coffee',   color: SgateColors.t2,       bg: SgateColors.surface  },
];

const MOCK_GUESTS = [
    { id: '1', name: 'Ag Bhai',  phone: '+91 74848 27530' },
    { id: '2', name: 'Agastya',  phone: '+91 62029 23165' },
];

interface GuestEntry { id: string; name: string; phone: string; }

// ─── Guest List Panel (final step: guests + theme + note → Create Invite) ────
function GuestListPanel({ validFrom, validUntil, initialGuests, onBack, onSubmit }: {
    validFrom: string; validUntil: string;
    initialGuests: GuestEntry[];
    onBack: () => void;
    onSubmit: (data: { theme: number; note: string; guests: GuestEntry[] }) => void;
}) {
    const [selectedTheme, setSelectedTheme] = useState(0);
    const [note, setNote]     = useState('');
    const [guests, setGuests] = useState<GuestEntry[]>(initialGuests);
    const [showAdd, setShowAdd] = useState(false);
    const [addName, setAddName] = useState('');
    const [addPhone, setAddPhone] = useState('');

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtDt = (iso: string) => {
        if (!iso) return '—';
        const d = new Date(iso), h = d.getHours(), m = d.getMinutes();
        return `${d.getDate()} ${months[d.getMonth()]} | ${String(h%12||12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
    };

    const addGuest = () => {
        if (!addName.trim() || !addPhone.trim()) return;
        setGuests(g => [...g, { id: Date.now().toString(), name: addName.trim(), phone: addPhone.trim() }]);
        setAddName(''); setAddPhone(''); setShowAdd(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={S.tabHeader}>
                <TouchableOpacity onPress={onBack} style={S.backBtn} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t2} />
                </TouchableOpacity>
                <Text style={S.panelTitle}>Manage Guests</Text>
            </View>

            <View style={S.inviteSummaryBar}>
                <Feather name="calendar" size={13} color={SgateColors.goldDeep} />
                <Text style={S.inviteSummaryText} numberOfLines={1}>
                    {fmtDt(validFrom)}  →  {fmtDt(validUntil)}
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                <Text style={[S.fieldLabel, { marginTop: 14 }]}>Guest list</Text>
                {guests.map(g => (
                    <View key={g.id} style={S.guestRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={S.guestName}>{g.name}</Text>
                            <Text style={S.guestPhone}>{g.phone}</Text>
                        </View>
                        <TouchableOpacity style={S.guestActionBtn} onPress={() => setGuests(g2 => g2.filter(x => x.id !== g.id))}>
                            <Feather name="trash-2" size={15} color={SgateColors.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={S.addGuestBtn} onPress={() => setShowAdd(v => !v)} activeOpacity={0.7}>
                    <Feather name="plus-circle" size={18} color={SgateColors.goldDeep} />
                    <Text style={S.addGuestBtnText}>Add Guest</Text>
                </TouchableOpacity>
                {showAdd && (
                    <View style={S.addGuestBox}>
                        <TextInput style={S.addGuestInput} placeholder="Name" placeholderTextColor={SgateColors.t4} value={addName} onChangeText={setAddName} />
                        <TextInput style={S.addGuestInput} placeholder="+91 xxxxxxxxxx" placeholderTextColor={SgateColors.t4} value={addPhone} onChangeText={setAddPhone} keyboardType="phone-pad" />
                        <TouchableOpacity style={S.addGuestConfirm} onPress={addGuest}>
                            <Text style={{ fontFamily: SgateFonts.semibold, color: SgateColors.black, fontSize: 14 }}>Add</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={[S.fieldLabel, { marginTop: 20 }]}>Select a theme</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 6 }}>
                    {INVITE_THEMES.map((t, i) => (
                        <TouchableOpacity key={i} style={[S.themeChip, { backgroundColor: t.bg }, selectedTheme === i && S.themeChipActive]} onPress={() => setSelectedTheme(i)} activeOpacity={0.7}>
                            <Feather name={t.icon} size={22} color={t.color} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={[S.fieldLabel, { marginTop: 14 }]}>Add a Note (optional)</Text>
                <TextInput
                    style={S.noteInput}
                    placeholder="e.g. Ring the bell twice"
                    placeholderTextColor={SgateColors.t4}
                    value={note} onChangeText={setNote}
                    multiline
                />
            </ScrollView>

            <View style={S.ctaWrap}>
                <TouchableOpacity style={S.ctaBtn} onPress={() => onSubmit({ theme: selectedTheme, note, guests })} activeOpacity={0.85}>
                    <Text style={S.ctaText}>Create Invite</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PreApproveSheet({ visible, onClose, onSuccess }: PreApproveSheetProps) {
    const { user } = useAuthStore();
    
    // Nested sheet state
    const [guestSheetConfig, setGuestSheetConfig] = useState<any>();

    // ── Step / tab ────────────────────────────────────────────────────────────
    const [step,            setStep]           = useState<'select' | 'guest_type' | 'guest_form' | 'guest_list' | 'form' | 'guests' | 'success'>('select');
    const [inviteType,      setInviteType]     = useState<InviteType>('GUEST');
    const [tab,             setTab]            = useState<FreqTab>('once');
    const [inviteValidFrom, setInviteValidFrom]= useState('');
    const [inviteValidUntil,setInviteValidUntil]= useState('');
    const [selectedGuestsToManage, setSelectedGuestsToManage] = useState<GuestEntry[]>([]);
    const [generatedOTP,    setGeneratedOTP]   = useState('');

    // ── Form state ────────────────────────────────────────────────────────────
    const [isPrivate,        setIsPrivate]        = useState(false);
    const [date,             setDate]             = useState(new Date());
    const [time,             setTime]             = useState(new Date());
    const [duration,         setDuration]         = useState('8 hours');
    const [digits,           setDigits]           = useState(['','','','']);
    const [surpriseDelivery, setSurpriseDelivery] = useState(false);
    const [validityDays,     setValidityDays]     = useState(30);
    const [selectedDays,     setSelectedDays]     = useState('All days of Week');
    const [entriesLabel,     setEntriesLabel]     = useState('One Entry');
    const [company,          setCompany]          = useState('');
    const [timeFrom,         setTimeFrom]         = useState('00:00 am');
    const [timeUntil,        setTimeUntil]        = useState('11:59 pm');
    const [submitting,       setSubmitting]       = useState(false);

    // ── Date/time picker ──────────────────────────────────────────────────────
    const [showPicker,   setShowPicker]   = useState(false);
    const [pickerMode,   setPickerMode]   = useState<'date' | 'time'>('date');
    const [pickerTarget, setPickerTarget] = useState<'date' | 'time'>('date');

    const openDate = () => { setPickerTarget('date'); setPickerMode('date'); setShowPicker(true); };
    const openTime = () => { setPickerTarget('time'); setPickerMode('time'); setShowPicker(true); };

    const onPickerChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (d) { if (pickerTarget === 'date') setDate(d); else setTime(d); }
    };

    // ── Digit refs ────────────────────────────────────────────────────────────
    const digitRefs = useRef<(TextInput | null)[]>([]);
    const onDigit   = (i: number, v: string) => {
        const s = v.slice(-1).toUpperCase();
        const nd = [...digits]; nd[i] = s; setDigits(nd);
        if (s && i < 3) digitRefs.current[i + 1]?.focus();
    };

    // ── Animations ────────────────────────────────────────────────────────────
    const sheetY     = useSharedValue(SH);
    const backdropOp = useSharedValue(0);
    const floatScale = useSharedValue(0);
    const sheetH     = useSharedValue(SH * 0.62);

    // Per-step layer visibility
    const selectOp    = useSharedValue(1);
    const formOp      = useSharedValue(0);
    const formX       = useSharedValue(0);
    const guestsOp    = useSharedValue(0);
    const guestsX     = useSharedValue(0);
    const guestListOp = useSharedValue(0);
    const guestListX  = useSharedValue(0);
    const successOp   = useSharedValue(0);
    const successSc   = useSharedValue(0.85);

    const isClosing       = useRef(false);
    const nativeScrollRef = useRef<any>(null);
    const onCloseRef      = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const a0 = useSharedValue(0), a1 = useSharedValue(0),
          a2 = useSharedValue(0), a3 = useSharedValue(0);
    const anims = [a0, a1, a2, a3];

    // Step snap heights
    const H_SELECT     = SH * 0.62;
    const H_GUEST_TYPE = SH * 0.72;
    const H_GUEST_FORM = SH * 0.80;
    const H_GUEST_LIST = SH * 0.92;
    const H_FORM       = SH * 0.76;
    const H_GUESTS     = SH * 0.88;
    const H_SUCCESS    = SH * 0.50;

    useEffect(() => {
        if (visible) {
            isClosing.current = false;
            sheetY.value      = SH;
            sheetH.value      = H_SELECT;
            selectOp.value    = 1;
            sheetY.value      = withSpring(0, SPRING_SMOOTH);
            backdropOp.value  = withTiming(1, { duration: 280 });
            anims.forEach((a, i) => {
                a.value = 0;
                a.value = withDelay(i * 60, withSpring(1, SPRING_SNAPPY));
            });
        } else if (!isClosing.current) {
            sheetY.value     = withTiming(SH, { duration: 260, easing: EI });
            backdropOp.value = withTiming(0, { duration: 220 });
        }
    }, [visible]);

    // Reset state after close
    useEffect(() => {
        if (!visible) {
            const t = setTimeout(() => {
                setStep('select'); setTab('once'); setIsPrivate(false);
                setDigits(['','','','']);
                setSurpriseDelivery(false); setCompany('');
                setValidityDays(30); setDuration('8 hours');
                setEntriesLabel('One Entry');
                floatScale.value = 0;
                selectOp.value = 1; formOp.value = 0; formX.value = 0;
                guestListOp.value = 0; guestListX.value = 0;
                guestsOp.value = 0; guestsX.value = 0;
                successOp.value = 0; successSc.value = 0.85;
                sheetH.value = H_SELECT;
                setSubmitting(false);
            }, 380);
            return () => clearTimeout(t);
        }
    }, [visible]);

    const sheetStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
    const backdropStyle  = useAnimatedStyle(() => ({ opacity: backdropOp.value }));
    const sheetSizeStyle = useAnimatedStyle(() => ({ height: sheetH.value }));
    const floatStyle     = useAnimatedStyle(() => ({
        opacity:   floatScale.value,
        transform: [{ scale: interpolate(floatScale.value, [0, 1], [0.5, 1]) }],
    }));
    const selectAnimStyle  = useAnimatedStyle(() => ({
        opacity: selectOp.value,
        transform: [{ scale: interpolate(selectOp.value, [0, 1], [0.96, 1]) }],
    }));

    const formAnimStyle    = useAnimatedStyle(() => ({
        opacity: formOp.value,
        transform: [{ translateX: formX.value }],
    }));
    const guestsAnimStyle  = useAnimatedStyle(() => ({
        opacity: guestsOp.value,
        transform: [{ translateX: guestsX.value }],
    }));
    const guestListAnimStyle = useAnimatedStyle(() => ({
        opacity: guestListOp.value,
        transform: [{ translateX: guestListX.value }],
    }));
    const successAnimStyle = useAnimatedStyle(() => ({
        opacity: successOp.value,
        transform: [{ scale: successSc.value }],
    }));

    // ── Swipe to close (RNGH Gesture.Pan — works from anywhere on the sheet) ──
    const doClose = useCallback(() => {
        isClosing.current = true;
        setTimeout(() => { isClosing.current = false; onCloseRef.current(); }, 280);
    }, []);

    const panGesture = useMemo(() => Gesture.Pan()
        // Allow this gesture to run at the same time as the ScrollView's native gesture
        .simultaneousWithExternalGesture(nativeScrollRef)
        .onUpdate((e) => {
            // Only drag the sheet down (never up — leave upward motion to the scroll view)
            if (e.translationY > 0) {
                sheetY.value = e.translationY;
            }
        })
        .onEnd((e) => {
            if (e.translationY > 90 || e.velocityY > 500) {
                sheetY.value     = withTiming(SH, { duration: 260, easing: EI });
                backdropOp.value = withTiming(0,  { duration: 220 });
                runOnJS(doClose)();
            } else {
                sheetY.value = withTiming(0, { duration: 220, easing: EO });
            }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doClose]);

    // ── Step transitions ──────────────────────────────────────────────────────
    const goToForm = (type: InviteType) => {
        setInviteType(type);
        setTab('once');
        setStep('form');
        // Cross-fade: selector fades out, sheet expands, form fades in — all simultaneous
        selectOp.value   = withTiming(0, { duration: 200 });
        sheetH.value     = withSpring(H_FORM, SPRING_SMOOTH);
        formX.value      = SW * 0.06;
        formOp.value     = withDelay(80, withSpring(1, SPRING_SMOOTH));
        formX.value      = withDelay(80, withSpring(0, SPRING_SMOOTH));
        floatScale.value = withDelay(120, withSpring(1, SPRING_SNAPPY));
    };



    const goBack = () => {
        // Cross-fade: form → selector, sheet shrinks
        formOp.value     = withTiming(0, { duration: 180 });
        floatScale.value = withTiming(0, { duration: 150 });
        sheetH.value     = withSpring(H_SELECT, SPRING_SMOOTH);
        setTimeout(() => {
            setStep('select');
            selectOp.value = withSpring(1, SPRING_SNAPPY);
            anims.forEach((a, i) => { a.value = 0; a.value = withDelay(i * 40, withSpring(1, SPRING_SNAPPY)); });
        }, 140);
    };



    const goBackFromGuests = () => {
        guestsOp.value = withTiming(0, { duration: 180 });
        sheetH.value   = withSpring(H_FORM, SPRING_SMOOTH);
        setTimeout(() => {
            setStep('form');
            formX.value      = -SW * 0.04;
            formOp.value     = withSpring(1, SPRING_SMOOTH);
            formX.value      = withSpring(0, SPRING_SMOOTH);
            floatScale.value = withDelay(60, withSpring(1, SPRING_SNAPPY));
        }, 160);
    };

    const goToGuestListFromGuests = (guestsList: {name: string, phone: string}[]) => {
        const entries = guestsList.map(g => ({ id: Math.random().toString(), ...g }));
        setSelectedGuestsToManage(entries);
        guestsOp.value = withTiming(0, { duration: 180 });
        sheetH.value      = withSpring(H_GUEST_LIST, SPRING_SMOOTH);
        setTimeout(() => {
            setStep('guest_list');
            guestListX.value  = SW * 0.06;
            guestListOp.value = withSpring(1, SPRING_SMOOTH);
            guestListX.value  = withSpring(0, SPRING_SMOOTH);
        }, 160);
    };

    const goBackFromGuestListToGuests = () => {
        guestListOp.value = withTiming(0, { duration: 180 });
        sheetH.value      = withSpring(H_GUESTS, SPRING_SMOOTH);
        setTimeout(() => {
            setStep('guests');
            guestsX.value  = -SW * 0.04;
            guestsOp.value = withSpring(1, SPRING_SMOOTH);
            guestsX.value  = withSpring(0, SPRING_SMOOTH);
        }, 160);
    };

    const showSuccess = () => {
        // Cross-fade: current → success, sheet shrinks
        formOp.value      = withTiming(0, { duration: 150 });
        guestsOp.value    = withTiming(0, { duration: 150 });
        guestListOp.value = withTiming(0, { duration: 150 });
        floatScale.value  = withTiming(0, { duration: 150 });
        sheetH.value     = withSpring(H_SUCCESS, SPRING_SMOOTH);
        setTimeout(() => {
            setStep('success');
            successSc.value = 0.85;
            successOp.value = withSpring(1, SPRING_SMOOTH);
            successSc.value = withSpring(1, SPRING_SNAPPY);
        }, 180);
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!user?.flatId) { Alert.alert('Error', 'Your flat is not set up.'); return; }
        setSubmitting(true);
        try {
            const flatId = user.flatId;

            const durationHours = (() => {
                const n = parseInt(duration); return isNaN(n) ? 1 : n;
            })();

            const buildOnceWindow = () => {
                const vF = new Date(date);
                vF.setHours(time.getHours(), time.getMinutes(), 0, 0);
                const vU = new Date(vF); vU.setHours(vU.getHours() + durationHours);
                return { validFrom: vF.toISOString(), validUntil: vU.toISOString() };
            };

            const buildFreqWindow = () => {
                const vF = new Date();
                const vU = addDays(vF, validityDays);
                return { validFrom: vF.toISOString(), validUntil: vU.toISOString() };
            };

            const mapDays = (l: string) =>
                l === 'Weekdays only' ? ['MON','TUE','WED','THU','FRI']
                : l === 'Weekends only' ? ['SAT','SUN']
                : ['MON','TUE','WED','THU','FRI','SAT','SUN'];

            const maxUses = entriesLabel === 'Unlimited' ? -1 : entriesLabel === 'Two Entries' ? 2 : 1;

            let result: { id: string };

            if (inviteType === 'GUEST') {
                const w = tab === 'once' ? buildOnceWindow() : buildFreqWindow();
                
                // Cross-fade: form → guests, sheet expands
                setGuestSheetConfig({ type: 'GUEST', flatId, isPrivate, validFrom: w.validFrom, validUntil: w.validUntil, maxUses: tab === 'once' ? 1 : maxUses });
                setInviteValidFrom(w.validFrom);
                setInviteValidUntil(w.validUntil);
                formOp.value     = withTiming(0, { duration: 180 });
                floatScale.value = withTiming(0, { duration: 150 });
                sheetH.value     = withSpring(H_GUESTS, SPRING_SMOOTH);
                setTimeout(() => {
                    setStep('guests');
                    guestsX.value  = SW * 0.06;
                    guestsOp.value = withSpring(1, SPRING_SMOOTH);
                    guestsX.value  = withSpring(0, SPRING_SMOOTH);
                }, 160);
                setSubmitting(false);
                return;

            } else if (inviteType === 'CAB') {
                if (tab === 'once') {
                    const digs = digits.join('');
                    if (digs.length < 4) { Alert.alert('Required', 'Enter the last 4 digits of the vehicle number.'); setSubmitting(false); return; }
                    const vF = new Date(), vU = new Date(vF); vU.setHours(vU.getHours() + durationHours);
                    result = await createInvitePass({ type: 'CAB', flatId, vehicleNumber: digs, validFrom: vF.toISOString(), validUntil: vU.toISOString() });
                } else {
                    const w = buildFreqWindow();
                    result = await createInvitePass({ type: 'CAB', flatId, allowedDays: mapDays(selectedDays), timeFrom, timeUntil, ...w, maxUses });
                }

            } else if (inviteType === 'DELIVERY') {
                if (tab === 'once') {
                    const vF = new Date(), vU = new Date(vF); vU.setHours(vU.getHours() + durationHours);
                    result = await createInvitePass({ type: 'DELIVERY_ONCE', flatId, isPrivate: surpriseDelivery, companyName: company || undefined, validFrom: vF.toISOString(), validUntil: vU.toISOString() });
                } else {
                    if (!company) { Alert.alert('Required', 'Select a delivery company.'); setSubmitting(false); return; }
                    const w = buildFreqWindow();
                    result = await createInvitePass({ type: 'DELIVERY_STANDING', flatId, companies: [company], allowedDays: mapDays(selectedDays), timeFrom, timeUntil, ...w, maxUses });
                }

            } else {
                const w = tab === 'once' ? buildOnceWindow() : buildFreqWindow();
                result = await createInvitePass({ type: 'SERVICE', flatId, allowedDays: tab === 'frequently' ? mapDays(selectedDays) : undefined, timeFrom: tab === 'frequently' ? timeFrom : undefined, timeUntil: tab === 'frequently' ? timeUntil : undefined, ...w, maxUses: tab === 'frequently' ? maxUses : 1 });
            }

            onSuccess?.({ type: inviteType, id: result.id });
            showSuccess();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    const typeConfig = TYPES.find(t => t.key === inviteType);

    const formState: FormState = {
        inviteType, isPrivate, setIsPrivate, date, openDate, time, openTime,
        duration, setDuration, digits, onDigit, digitRefs,
        surpriseDelivery, setSurpriseDelivery, validityDays, setValidityDays,
        selectedDays, setSelectedDays, entriesLabel, setEntriesLabel,
        company, setCompany, timeFrom, setTimeFrom, timeUntil, setTimeUntil,
        nativeScrollRef,
    };

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            {/* Backdrop */}
            <Animated.View style={[S.backdrop, backdropStyle]}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>

            {/* Sheet container */}
            <Animated.View style={[S.sheetWrap, sheetStyle]}>

                {/* Floating icon — always rendered, opacity-controlled */}
                {typeConfig && (
                    <Animated.View style={[S.floatWrap, floatStyle]}>
                        <View style={[S.floatCircle, { backgroundColor: typeConfig.iconBg }]}>
                            <Feather name={typeConfig.icon} size={24} color={typeConfig.iconColor} />
                        </View>
                    </Animated.View>
                )}

                {/* THE SINGLE CONTAINER — never unmounts, height animated with spring */}
                <GestureDetector gesture={panGesture}>
                <Animated.View style={[S.sheet, sheetSizeStyle]}>
                    {/* Drag handle — always visible, anchors continuity */}
                    <View style={S.handleRow}>
                        <View style={S.handle} />
                    </View>

                    {/* All steps stacked absolutely — only active one is visible */}
                    <View style={S.contentArea}>
                        {/* Layer 1: Type selector */}
                        <Animated.View style={[S.stepLayer, selectAnimStyle]} pointerEvents={step === 'select' ? 'auto' : 'none'}>
                            <TypeSelector onSelect={goToForm} anims={anims} />
                        </Animated.View>



                        {/* Layer X: Select Guests */}
                        <Animated.View style={[S.stepLayer, guestsAnimStyle]} pointerEvents={step === 'guests' ? 'auto' : 'none'}>
                            {step === 'guests' && (
                                <SelectGuestsPanel
                                    onBack={goBackFromGuests}
                                    onNext={goToGuestListFromGuests}
                                />
                            )}
                        </Animated.View>

                        {/* Layer 3b: Guest list (final preview: guests + theme + note) */}
                        <Animated.View style={[S.stepLayer, guestListAnimStyle]} pointerEvents={step === 'guest_list' ? 'auto' : 'none'}>
                            {step === 'guest_list' && (
                                <GuestListPanel
                                    validFrom={inviteValidFrom}
                                    validUntil={inviteValidUntil}
                                    initialGuests={selectedGuestsToManage}
                                    onBack={goBackFromGuestListToGuests}
                                    onSubmit={async (data) => {
                                        if (data.guests.length === 0) { Alert.alert('Error', 'Add at least one guest.'); return; }
                                        setSubmitting(true);
                                        try {
                                            for (const g of data.guests) {
                                                await createInvitePass({
                                                    ...guestSheetConfig,
                                                    visitorName: g.name,
                                                    visitorPhone: g.phone,
                                                    note: data.note,
                                                    theme: data.theme
                                                });
                                            }
                                            const otp = String(Math.floor(1000 + Math.random() * 9000));
                                            setGeneratedOTP(otp);
                                            onSuccess?.({ type: 'GUEST' });
                                            showSuccess();
                                        } catch (err: any) {
                                            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to create pass');
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                />
                            )}
                        </Animated.View>

                        {/* Layer 4: Cab/Delivery/Service form */}
                        <Animated.View style={[S.stepLayer, formAnimStyle]} pointerEvents={step === 'form' ? 'auto' : 'none'}>
                            <FormPanel
                                inviteType={inviteType}
                                tab={tab} setTab={setTab}
                                onBack={goBack}
                                state={formState}
                                submitting={submitting}
                                onSubmit={handleSubmit}
                            />
                        </Animated.View>

                        {/* Layer 5: Success confirmation */}
                        <Animated.View style={[S.stepLayer, successAnimStyle]} pointerEvents={step === 'success' ? 'auto' : 'none'}>
                            {step === 'success' && (
                                inviteType === 'GUEST' ? (
                                    <ScrollView contentContainerStyle={S.otpCardWrap} showsVerticalScrollIndicator={false}>
                                        <View style={S.otpCard}>
                                            <Text style={S.otpCardTitle}>{user?.name || 'You'} has invited you.</Text>
                                            
                                            {/* Optional Note snippet if applicable */}
                                            {guestSheetConfig?.note ? (
                                                <Text style={S.otpCardHint}>"{guestSheetConfig.note}"</Text>
                                            ) : null}

                                            <Text style={S.otpCardInstruction}>Show this QR code or OTP to the guard at gate</Text>
                                            
                                            <View style={S.qrWrap}>
                                                <QRCode value={generatedOTP} size={150} color="#1A1A1A" backgroundColor="#FAF6F0" />
                                            </View>
                                            
                                            <View style={S.dividerWithText}>
                                                <View style={S.dividerLine} />
                                                <Text style={S.dividerText}>OR</Text>
                                                <View style={S.dividerLine} />
                                            </View>
                                            
                                            <View style={S.otpBox}>
                                                <Text style={S.otpText}>{generatedOTP}</Text>
                                            </View>
                                            
                                            <Text style={S.otpDate}>
                                                {new Date(inviteValidFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date(inviteValidFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}  to 
                                                {"\n"}
                                                {new Date(inviteValidUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date(inviteValidUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>

                                            {user?.flatId ? (
                                                <Text style={S.otpAddress}>
                                                    {user?.flatId}{"\n"}
                                                    Society Address, City - Pincode
                                                </Text>
                                            ) : null}

                                            {/* Sgate logo text replacing mygate */}
                                            <Text style={S.otpLogoText}>
                                                <Feather name="grid" size={16} /> sgate
                                            </Text>
                                        </View>
                                        
                                        <Text style={S.otpShareHint}>Share this invite with your guest for a hassle-free entry</Text>
                                        
                                        <TouchableOpacity style={[S.ctaBtn, S.shareBtn]} activeOpacity={0.85} onPress={onClose}>
                                            <Feather name="share" size={18} color="#000" />
                                            <Text style={[S.ctaText, { marginLeft: 8, color: '#000' }]}>Share</Text>
                                        </TouchableOpacity>
                                        
                                    </ScrollView>
                                ) : (
                                    <View style={S.successContent}>
                                        <View style={S.successCircle}>
                                            <Feather name="check" size={40} color={SgateColors.green} />
                                        </View>
                                        <Text style={S.successTitle}>Pass Created!</Text>
                                        <Text style={S.successDesc}>Your gate pass has been successfully{"\n"}created and saved.</Text>
                                        <TouchableOpacity style={[S.ctaBtn, S.successBtn]} onPress={onClose} activeOpacity={0.85}>
                                            <Text style={S.ctaText}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            )}
                        </Animated.View>
                    </View>
                </Animated.View>
                </GestureDetector>

                {/* Native date/time picker */}
                {showPicker && (
                    <DateTimePicker
                        value={pickerTarget === 'date' ? date : time}
                        mode={pickerMode}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={(e, d) => {
                            onPickerChange(e, d);
                            if (Platform.OS === 'ios') return;
                            setShowPicker(false);
                        }}
                    />
                )}
            </Animated.View>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const S = StyleSheet.create({
    // ── Overlay ───────────────────────────────────────────────────────────────
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
    sheetWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },

    // ── Floating icon ─────────────────────────────────────────────────────────
    floatWrap: {
        alignSelf: 'center',
        marginBottom: -26,
        zIndex: 10,
    },
    floatCircle: {
        width: 54, height: 54, borderRadius: 27,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: SgateColors.card,
    },

    // ── Sheet (the ONE container) ──────────────────────────────────────────────
    sheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingTop: 0,
        paddingBottom: 34,
        overflow: 'hidden',
    },
    contentArea: {
        flex: 1,
    },
    stepLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    stepLayerCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Guest Type Panel ────────────────────────────────────────────────────────────
    panelTitle: {
        flex: 1, fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1,
    },
    guestTypeSub: {
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        paddingHorizontal: 20, paddingBottom: 14, lineHeight: 20,
    },
    guestTypeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    guestTypeCardPrivate: { backgroundColor: '#F0EBFF', borderColor: '#C9B8FF' },
    guestTypeTitle: {
        fontSize: 15, fontFamily: SgateFonts.semibold,
        color: SgateColors.t1, marginBottom: 4,
    },
    guestTypeTitlePrivate: { color: SgateColors.violet },
    guestTypeDesc: {
        fontSize: 13, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, lineHeight: 18,
    },
    guestTypeDescPrivate: { color: '#7C5CC4' },

    // ── Guest Invite Form ─────────────────────────────────────────────────────
    themeBanner: {
        backgroundColor: SgateColors.goldPale, paddingVertical: 14, marginBottom: 4,
    },
    themeScroll: {
        paddingHorizontal: 20, gap: 10, alignItems: 'center',
    },
    themeLabel: {
        fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginRight: 4,
    },
    themeChip: {
        width: 48, height: 48, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    themeChipActive: {
        borderWidth: 2.5, borderColor: SgateColors.goldDeep,
    },
    noteInput: {
        backgroundColor: SgateColors.bg,
        borderRadius: 12, borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, fontFamily: SgateFonts.regular,
        color: SgateColors.t1, minHeight: 56,
    },
    guestRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    guestName: {
        fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1,
    },
    guestPhone: {
        fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2,
    },
    guestActionBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: SgateColors.bg,
        alignItems: 'center', justifyContent: 'center', marginLeft: 6,
    },
    addGuestBox: {
        backgroundColor: SgateColors.bg, borderRadius: 14, padding: 14, gap: 10, marginTop: 10,
    },
    addGuestInput: {
        backgroundColor: SgateColors.card,
        borderRadius: 10, borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1,
    },
    addGuestConfirm: {
        backgroundColor: SgateColors.gold, borderRadius: 10, paddingVertical: 10,
        alignItems: 'center',
    },
    addGuestBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 4,
    },
    addGuestBtnText: {
        fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep,
    },

    // ── OTP Invite Card (success for GUEST) ────────────────────────────────────────────
    otpCardWrap: {
        padding: 20, paddingBottom: 40,
    },
    otpCard: {
        backgroundColor: '#FAF6F0', borderRadius: 20,
        padding: 24, alignItems: 'center', marginBottom: 20,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    otpCardTitle: {
        fontSize: 20, fontFamily: SgateFonts.extrabold,
        color: '#1A1A1A', textAlign: 'center', marginBottom: 6,
    },
    otpCardHint: {
        fontSize: 14, fontFamily: SgateFonts.regular,
        color: '#4A4A4A', textAlign: 'center', marginBottom: 20,
    },
    otpCardInstruction: {
        fontSize: 13, fontFamily: SgateFonts.medium,
        color: '#8F7351', textAlign: 'center', marginBottom: 16,
    },
    qrWrap: {
        marginBottom: 16,
    },
    dividerWithText: {
        flexDirection: 'row', alignItems: 'center', width: '60%', 
        justifyContent: 'center', marginBottom: 16,
    },
    dividerLine: {
        flex: 1, height: 1, backgroundColor: '#D9CDBF',
    },
    dividerText: {
        marginHorizontal: 12, fontSize: 13, fontFamily: SgateFonts.medium, color: '#8F7351',
    },
    otpBox: {
        backgroundColor: '#083B32',
        borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14, marginBottom: 20,
    },
    otpText: {
        fontSize: 34, fontFamily: SgateFonts.bold, color: '#FFFFFF', letterSpacing: 4,
    },
    otpDate: {
        fontSize: 14, fontFamily: SgateFonts.semibold,
        color: '#6E4D2B', textAlign: 'center', marginBottom: 14, lineHeight: 20,
    },
    otpAddress: {
        fontSize: 13, fontFamily: SgateFonts.medium,
        color: '#4A4A4A', textAlign: 'center', marginBottom: 20, lineHeight: 18,
    },
    otpLogoText: {
        fontSize: 18, fontFamily: SgateFonts.extrabold, color: '#1A1A1A', letterSpacing: -0.5,
    },
    otpShareHint: {
        fontSize: 14, fontFamily: SgateFonts.medium,
        color: '#F9F9F9', textAlign: 'center', marginBottom: 16,
    },
    shareBtn: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FDE12A', // Vibrant yellow from image
    },

    // ── Guest invite form tabs / dropdown pickers ───────────────────────────────────────────
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: 20, marginBottom: 6,
        backgroundColor: SgateColors.bg,
        borderRadius: 14, padding: 4,
    },
    tabBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 11,
        alignItems: 'center',
    },
    tabBtnActive: {
        backgroundColor: SgateColors.card,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    tabBtnText: {
        fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3,
    },
    tabBtnTextActive: {
        fontFamily: SgateFonts.semibold, color: SgateColors.t1,
    },
    pickerDropdown: {
        backgroundColor: SgateColors.card,
        borderRadius: 14, borderWidth: 1, borderColor: SgateColors.borderSoft,
        overflow: 'hidden', marginTop: -6,
    },
    pickerOption: {
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    pickerOptionText: {
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t2,
    },
    pickerOptionActive: {
        fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep,
    },
    inviteSummaryBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 20, paddingVertical: 10,
        marginBottom: 4,
    },
    inviteSummaryText: {
        flex: 1, fontSize: 13, fontFamily: SgateFonts.semibold,
        color: SgateColors.goldDeep,
    },

    successContent: {
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 24, paddingTop: 30, paddingBottom: 20,
    },

    successCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 24, fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1, marginBottom: 8,
    },
    successDesc: {
        fontSize: 15, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, textAlign: 'center', marginBottom: 28,
        lineHeight: 22,
    },
    successBtn: { width: '100%' },
    handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
    handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: SgateColors.border },

    // ── Step 1: selector ──────────────────────────────────────────────────────
    selectorWrap: { paddingHorizontal: 20, paddingBottom: 16 },
    sheetTitle: {
        fontSize: 26, fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1, marginBottom: 4,
    },
    sheetSub: {
        fontSize: 14, fontFamily: SgateFonts.regular,
        color: SgateColors.t3, marginBottom: 20,
    },
    typeList: { gap: 10 },
    typeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft,
        padding: 14,
    },
    typeIconWrap: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
    },
    typeTexts: { flex: 1, marginLeft: 14 },
    typeLabel: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    typeDesc:  { fontSize: 13, fontFamily: SgateFonts.regular,  color: SgateColors.t3, marginTop: 2 },

    // ── Step 2: form panel ────────────────────────────────────────────────────
    formPanel: { flex: 1 },

    // Tab header (underline style)
    tabHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        paddingHorizontal: 20,
    },
    backBtn: { paddingRight: 16, paddingBottom: 12 },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabText: {
        fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t3,
    },
    tabTextActive: {
        fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1,
    },
    tabLine: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, borderRadius: 1, backgroundColor: SgateColors.gold,
    },

    // Scroll + content
    formScroll: { flex: 1 },
    formScrollContent: { paddingTop: 16, paddingBottom: 12 },

    formBody: { paddingHorizontal: 20, gap: 0 },

    // ── Fields ────────────────────────────────────────────────────────────────
    fieldLabel: {
        fontSize: 11, fontFamily: SgateFonts.bold,
        color: SgateColors.t3, letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginTop: 16, marginBottom: 8,
    },
    fieldLabelMuted: {
        fontSize: 12, fontFamily: SgateFonts.regular,
        color: SgateColors.t4, marginBottom: 6,
    },

    // Dropdown row
    dropRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: SgateColors.bg,
        borderRadius: 12, borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14, paddingVertical: 13,
    },
    dropText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },

    // Two-column layout
    twoCol: { flexDirection: 'row', gap: 10, marginTop: 4 },
    col:    { flex: 1 },

    // ── Check card ────────────────────────────────────────────────────────────
    checkCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.bg,
        borderRadius: 14, padding: 14,
    },
    checkCardBordered: {
        backgroundColor: SgateColors.card,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 5,
        borderWidth: 1.5, borderColor: SgateColors.border,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    checkboxOn: { backgroundColor: SgateColors.goldDeep, borderColor: SgateColors.goldDeep },
    checkTexts: { flex: 1 },
    checkTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    checkDesc:  { fontSize: 12, fontFamily: SgateFonts.regular,  color: SgateColors.t3, marginTop: 2 },
    checkIconCircle: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 8,
    },

    // ── Feature card (cab) ────────────────────────────────────────────────────
    featureCard: {
        backgroundColor: SgateColors.goldPale,
        borderRadius: 14, padding: 14, marginTop: 4,
    },
    recommendedRow: { marginBottom: 8 },
    recommendedBadge: {
        alignSelf: 'flex-start',
        backgroundColor: SgateColors.gold,
        borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
    },
    recommendedText: {
        fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.black,
    },

    // ── Body text ─────────────────────────────────────────────────────────────
    bodyLine: {
        fontSize: 14, fontFamily: SgateFonts.regular,
        color: SgateColors.t2, marginTop: 16, marginBottom: 8,
    },
    bodyUnderline: {
        fontFamily: SgateFonts.bold, textDecorationLine: 'underline', color: SgateColors.t1,
    },

    // ── Vehicle digits ────────────────────────────────────────────────────────
    digitRow: { flexDirection: 'row', gap: 10 },
    digitBox: {
        flex: 1, height: 56, borderRadius: 12,
        backgroundColor: SgateColors.bg,
        borderWidth: 1.5, borderColor: SgateColors.border,
        fontSize: 20, fontFamily: SgateFonts.bold,
        color: SgateColors.t1, textAlign: 'center',
    },
    digitBoxFilled: {
        borderColor: SgateColors.goldDeep, backgroundColor: SgateColors.goldPale,
    },

    // Advanced Options
    advLink: { marginTop: 18, alignItems: 'center' },
    advText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.blue },

    // ── Chips ─────────────────────────────────────────────────────────────────
    chipRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 4 },
    chip: {
        flex: 1, paddingVertical: 11, alignItems: 'center',
        borderRadius: 999,
        backgroundColor: SgateColors.card,
        borderWidth: 1.5, borderColor: SgateColors.border,
    },
    chipActive: { borderColor: SgateColors.goldDeep, backgroundColor: SgateColors.goldPale },
    chipText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    chipTextActive: { fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },

    // ── CTA button ────────────────────────────────────────────────────────────
    ctaWrap: { paddingHorizontal: 20, paddingTop: 12 },
    ctaBtn: {
        height: 54, borderRadius: 14,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnDisabled: { opacity: 0.5 },
    ctaText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.black },

    // ── Picker modal ──────────────────────────────────────────────────────────
    pickerBg: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.42)',
        justifyContent: 'flex-end',
    },
    pickerBox: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        paddingBottom: 34, maxHeight: SH * 0.5,
    },
    pickerHandleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    pickerTitle: {
        fontSize: 15, fontFamily: SgateFonts.semibold,
        color: SgateColors.t1, paddingHorizontal: 20, marginBottom: 6,
    },
    pickerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    pickerRowText: { fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t2 },
    pickerRowTextActive: { fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },
});
