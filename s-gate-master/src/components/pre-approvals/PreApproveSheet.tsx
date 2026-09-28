'use no memo';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated as RNAnimated,
    Dimensions,
    Image,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Keyboard,
    Linking,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';

import Animated, { FadeIn } from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';
import { createInvitePass, createPartyInvite, addPartyGuest, removePartyGuest, DELIVERY_COMPANIES, createPreApproved } from '@/services/gate.service';
import type { CreatePreApprovedPayload, HelpCategory } from '@/types/api';
import type { PartyInvite, PartySlot } from '@/services/gate.service';
import { useAuthStore } from '@/store/useAuthStore';
import { QRCarousel, type QRPassData } from './QRCarousel';

import { useSheetBottomClearance } from '@/hooks/useSheetBottomClearance';
import { SheetShell } from './sheet/SheetShell';
import { StepSheet } from './sheet/StepSheet';
import { PrimaryAction } from './sheet/parts/PrimaryAction';
import { StepHeader } from './sheet/parts/StepHeader';
import { useSheetStepper } from './sheet/useSheetStepper';
import { ChooseTypeStep } from './sheet/steps/ChooseTypeStep';
import { GuestInviteTypeStep } from './sheet/steps/GuestInviteTypeStep';
import { ManageGuestsStep } from './sheet/steps/ManageGuestsStep';
import { SelectGuestsStep } from './sheet/steps/SelectGuestsStep';
import { SuccessStep } from './sheet/steps/SuccessStep';

// ─── Types ───────────────────────────────────────────────────────────────────

type InviteType = 'GUEST' | 'CAB' | 'DELIVERY' | 'SERVICE';
type FreqTab    = 'once' | 'frequently';
type StepName = 'select' | 'guest_type' | 'guest_form' | 'party_theme' | 'party_form'
    | 'party_success' | 'guest_list' | 'form' | 'guests' | 'success';
type GuestInviteMode = 'quick' | 'group' | 'frequent' | 'private';

export interface PreApproveSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: (result: { type: InviteType; id?: string }) => void;
    initialType?: InviteType;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const { height: SH, width: SW } = Dimensions.get('window');

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
                            <TouchableOpacity key={o} style={S.pickerRow} onPress={() => { onSelect(o); onClose(); }} activeOpacity={0.8}>
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
            <TouchableOpacity style={S.dropRow} onPress={() => setOpen(true)} activeOpacity={0.8}>
                <Text style={S.dropText}>{value}</Text>
                <Feather name={icon} size={18} color={SgateColors.t3} />
            </TouchableOpacity>
            <PickerSheet visible={open} title={title ?? 'Select'} options={options}
                selected={value} onSelect={onSelect} onClose={() => setOpen(false)} />
        </>
    );
}

// ─── Check card (Make it private / Surprise Delivery / Safe Pickup) ──────────
function CheckCard({ checked, onToggle, title, desc, rightIcon, rightIconBg, rightIconColor,
    cardStyle, recommended, activeBg, activeCheckColor, activeTitleColor, knowMore }: {
    checked: boolean; onToggle: () => void; title: string; desc: string;
    rightIcon?: React.ComponentProps<typeof Feather>['name'];
    rightIconBg?: string; rightIconColor?: string;
    cardStyle?: object;
    recommended?: boolean;
    activeBg?: string;
    activeCheckColor?: string;
    activeTitleColor?: string;
    knowMore?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[S.checkCard, cardStyle, checked && activeBg ? { backgroundColor: activeBg } : null]}
            onPress={onToggle}
            activeOpacity={0.8}
        >
            {recommended && (
                <View style={S.recommendedBadge}>
                    <Text style={S.recommendedText}>Recommended</Text>
                </View>
            )}
            <View style={S.checkCardRow}>
                <View style={[S.checkbox, checked && (activeCheckColor ? { backgroundColor: activeCheckColor, borderColor: activeCheckColor } : S.checkboxOn)]}>
                    {checked && <Feather name="check" size={11} color="#fff" />}
                </View>
                <View style={S.checkTexts}>
                    <Text style={[S.checkTitle, checked && activeBg ? { color: activeTitleColor ?? activeCheckColor ?? SgateColors.t1 } : null]}>{title}</Text>
                    <Text style={S.checkDesc}>
                        {desc}
                        {knowMore && (
                            <Text style={[S.knowMoreLink, { color: PRIVATE_PURPLE }]}
                                onPress={e => { e.stopPropagation?.(); knowMore(); }}> Know more</Text>
                        )}
                    </Text>
                </View>
                {rightIcon && (
                    <View style={[S.checkIconCircle, { backgroundColor: rightIconBg ?? SgateColors.surface }]}>
                        <Feather name={rightIcon} size={16} color={rightIconColor ?? SgateColors.t3} />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const PRIVATE_PURPLE    = SgateColors.violet;

/// ─── Private Invite Info Modal ───────────────────────────────────────────────
function PrivateInviteInfoModal({ visible, onClose, onCreatePrivate }: {
    visible: boolean;
    onClose: () => void;
    onCreatePrivate: () => void;
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={PKM.container}>
                {/* Back arrow */}
                <TouchableOpacity style={PKM.backBtn} onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <Feather name="arrow-left" size={24} color="#1A1A2E" />
                </TouchableOpacity>

                <ScrollView
                    contentContainerStyle={PKM.scroll}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Lock icon */}
                    <View style={PKM.iconWrap}>
                        <Feather name="lock" size={30} color={PRIVATE_PURPLE} />
                    </View>

                    {/* Title */}
                    <Text style={PKM.title}>Private Guest Invites</Text>

                    {/* Illustration */}
                    <View style={PKM.imageCard}>
                        <Image
                            source={require('../../../assets/images/private_invite_party.jpg')}
                            style={PKM.image}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Features */}
                    <View style={PKM.features}>
                        <View style={PKM.featureBlock}>
                            <View style={PKM.featureTitleRow}>
                                <Text style={PKM.featureEmoji}>🎉</Text>
                                <Text style={PKM.featureTitle}> Surprise Parties Unleashed</Text>
                            </View>
                            <Text style={PKM.featureDesc}>
                                Plan spontaneous celebrations without tipping off your family! It&apos;s your secret, your surprise.
                            </Text>
                        </View>
                        <View style={PKM.featureBlock}>
                            <View style={PKM.featureTitleRow}>
                                <Text style={PKM.featureEmoji}>🙂</Text>
                                <Text style={PKM.featureTitle}> Undisturbed Invitations</Text>
                            </View>
                            <Text style={PKM.featureDesc}>
                                Invite guests without disrupting your flatmates peace. Your space, your rules!
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* CTA */}
                <View style={PKM.ctaWrap}>
                    <TouchableOpacity style={PKM.ctaBtn} onPress={onCreatePrivate} activeOpacity={0.8}>
                        <Text style={PKM.ctaText}>Create private invite</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const PKM = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F5FA',
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 18,
        zIndex: 20,
        padding: 6,
    },
    scroll: {
        paddingTop: 96,
        paddingHorizontal: 28,
        paddingBottom: 32,
        alignItems: 'center',
    },
    iconWrap: {
        width: 76,
        height: 76,
        borderRadius: 22,
        backgroundColor: SgateColors.violetBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        shadowColor: PRIVATE_PURPLE,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontFamily: SgateFonts.extrabold,
        color: PRIVATE_PURPLE,
        marginBottom: 28,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    imageCard: {
        width: '100%',
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 32,
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    image: {
        width: '100%',
        height: 210,
    },
    features: {
        width: '100%',
        gap: 24,
    },
    featureBlock: {
        alignItems: 'center',
    },
    featureTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    featureEmoji: {
        fontSize: 18,
    },
    featureTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#1A1A2E',
    },
    featureDesc: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: '#666',
        lineHeight: 20,
        textAlign: 'center',
    },
    ctaWrap: {
        paddingHorizontal: 28,
        paddingBottom: 42,
        paddingTop: 12,
        backgroundColor: '#F6F5FA',
    },
    ctaBtn: {
        backgroundColor: PRIVATE_PURPLE,
        borderRadius: 32,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIVATE_PURPLE,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 8,
    },
    ctaText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    // legacy — unused but kept for safety
    featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    featureTexts: { flex: 1 },
});

function GuestOnce({ state }: { state: FormState }) {
    const prv = state.isPrivate;
    return (
        <View style={S.formBody}>
            {/* Make it private */}
            {state.guestMode !== 'private' && (
                <CheckCard
                    checked={prv}
                    onToggle={() => state.setIsPrivate(!prv)}
                    title="Make it private"
                    desc="This allows silent entries of your guests without disturbing others"
                    rightIcon="lock"
                    rightIconBg={prv ? '#F0EBFF' : SgateColors.surface}
                    rightIconColor={prv ? PRIVATE_PURPLE : SgateColors.t3}
                    activeBg="#F5F3FF"
                    activeCheckColor={PRIVATE_PURPLE}
                    activeTitleColor={SgateColors.t1}
                    cardStyle={S.checkCardBordered}
                    knowMore={() => state.setShowPrivateInfo(true)}
                />
            )}

            {/* Date */}
            <Text style={S.fieldLabel}>Select Date</Text>
            <TouchableOpacity style={S.dropRowWhite} onPress={state.openDate} activeOpacity={0.8}>
                <Text style={S.dropText}>{isToday(state.date) ? 'Today' : fmtDateShort(state.date)}</Text>
                <Feather name="calendar" size={18} color={SgateColors.t3} />
            </TouchableOpacity>

            {/* Time + Duration */}
            <View style={S.twoCol}>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>Starting from</Text>
                    <TouchableOpacity style={S.dropRowWhite} onPress={state.openTime} activeOpacity={0.8}>
                        <Text style={S.dropText}>{fmt12(state.time)}</Text>
                        <Feather name="clock" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>
                </View>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>Valid for</Text>
                    <Dropdown value={state.duration} options={DURATIONS}
                        onSelect={state.setDuration} icon="clock" title="Valid For" />
                </View>
            </View>
        </View>
    );
}

/**
 * Last 4 digits of the cab's number plate. The gate matches on digits only
 * (the backend rejects anything else), so this takes a number pad and drops
 * letters. The label and helper stay the same whether or not Safe Pickup is
 * on — swapping them resized the form under the user's finger.
 */
function VehicleDigits({ state }: { state: FormState }) {
    return (
        <>
            <Text style={S.fieldLabel}>Last 4 digits of vehicle number</Text>
            <View style={S.digitRow}>
                {state.digits.map((d, i) => (
                    <TextInput
                        key={i}
                        ref={r => { state.digitRefs.current[i] = r; }}
                        style={[S.digitBox, d ? S.digitBoxFilled : null]}
                        value={d}
                        onChangeText={v => state.onDigit(i, v)}
                        onKeyPress={e => {
                            // Backspace on an empty box steps back to the previous one.
                            if (e.nativeEvent.key === 'Backspace' && !d && i > 0) {
                                state.onDigit(i - 1, '');
                                state.digitRefs.current[i - 1]?.focus();
                            }
                        }}
                        maxLength={1}
                        textAlign="center"
                        keyboardType="number-pad"
                        accessibilityLabel={`Vehicle digit ${i + 1}`}
                    />
                ))}
            </View>
            <Text style={S.digitHelp}>Used by the guard to verify your cab at the gate.</Text>
        </>
    );
}

// ─── Cab Once ────────────────────────────────────────────────────────────────
function CabOnce({ state }: { state: FormState }) {
    const VIOLET = SgateColors.violet;
    const VIOLET_BG = SgateColors.violetBg;

    return (
        <View style={S.formBody}>
            {/* Safe Pickup Mode card */}
            <CheckCard
                checked={state.safeMode}
                onToggle={() => state.setSafeMode(!state.safeMode)}
                title="Safe Pickup Mode"
                desc="No need to share flat details with the cab driver or guard."
                rightIcon="shield"
                rightIconBg={state.safeMode ? VIOLET + '22' : SgateColors.surface}
                rightIconColor={state.safeMode ? VIOLET : SgateColors.t3}
                recommended
                activeBg={VIOLET_BG}
                activeCheckColor={VIOLET}
                cardStyle={S.checkCardBordered}
            />

            {/* Duration text */}
            <Text style={S.bodyLine}>
                Allow my cab to enter{' '}
                <Text style={S.bodyUnderline}>today</Text>
                {' '}once in next
            </Text>
            <Dropdown value={state.duration} options={DURATIONS.slice(0, 5)}
                onSelect={state.setDuration} title="Duration" />

            <VehicleDigits state={state} />

        </View>
    );
}

// ─── Delivery Once ───────────────────────────────────────────────────────────
function DeliveryOnce({ state }: { state: FormState }) {
    const VIOLET = SgateColors.violet;
    const VIOLET_BG = SgateColors.violetBg;

    return (
        <View style={S.formBody}>
            {/* Surprise Delivery card */}
            <CheckCard
                checked={state.surpriseDelivery}
                onToggle={() => state.setSurpriseDelivery(!state.surpriseDelivery)}
                title="Surprise Delivery"
                desc="This allows deliveries without notifying your flat members."
                rightIcon="gift"
                rightIconBg={state.surpriseDelivery ? VIOLET + '22' : SgateColors.surface}
                rightIconColor={state.surpriseDelivery ? VIOLET : SgateColors.t3}
                activeBg={VIOLET_BG}
                activeCheckColor={VIOLET}
                cardStyle={S.checkCardBordered}
            />

            {state.surpriseDelivery ? (
                /* ── Surprise mode: show date + time + company ── */
                <>
                    <Text style={S.fieldLabel}>SELECT DATE</Text>
                    <TouchableOpacity style={S.dropRow} onPress={state.openDate} activeOpacity={0.8}>
                        <Text style={S.dropText}>{isToday(state.date) ? 'Today' : fmtDateShort(state.date)}</Text>
                        <Feather name="calendar" size={18} color={SgateColors.t3} />
                    </TouchableOpacity>

                    <View style={S.twoCol}>
                        <View style={S.col}>
                            <Text style={S.fieldLabel}>STARTING FROM</Text>
                            <TouchableOpacity style={S.dropRow} onPress={state.openTime} activeOpacity={0.8}>
                                <Text style={S.dropText}>{fmt12(state.time)}</Text>
                                <Feather name="clock" size={18} color={SgateColors.t3} />
                            </TouchableOpacity>
                        </View>
                        <View style={S.col}>
                            <Text style={S.fieldLabel}>VALID FOR</Text>
                            <Dropdown value={state.duration} options={DURATIONS.slice(0, 5)}
                                onSelect={state.setDuration} icon="clock" title="Valid For" />
                        </View>
                    </View>

                    <Text style={S.fieldLabel}>COMPANY NAME</Text>
                    <Dropdown
                        value={state.company || 'Select company'}
                        options={DELIVERY_COMPANIES}
                        onSelect={state.setCompany}
                        title="Company"
                    />

                    <Text style={[S.checkDesc, { color: VIOLET, marginTop: 4 }]}>
                        Leave at Gate is disabled for surprise deliveries
                    </Text>
                </>
            ) : (
                /* ── Normal mode: simple duration ── */
                <>
                    <Text style={S.bodyLine}>
                        Allow delivery executive to enter{' '}
                        <Text style={S.bodyUnderline}>today</Text>
                        {' '}once in next
                    </Text>
                    <Dropdown value={state.duration} options={DURATIONS.slice(0, 5)}
                        onSelect={state.setDuration} title="Duration" />
                </>
            )}

        </View>
    );
}

const SERVICE_CATEGORIES: { label: string; value: HelpCategory }[] = [
    { label: 'Plumber',          value: 'PLUMBER'          },
    { label: 'Electrician',      value: 'ELECTRICIAN'      },
    { label: 'Carpenter',        value: 'CARPENTER'        },
    { label: 'Painter',          value: 'PAINTER'          },
    { label: 'Tutor',            value: 'TUTOR'            },
    { label: 'Beautician',       value: 'BEAUTICIAN'       },
    { label: 'Fitness Trainer',  value: 'FITNESS_TRAINER'  },
    { label: 'Physiotherapist',  value: 'PHYSIOTHERAPIST'  },
    { label: 'Cook',             value: 'COOK'             },
    { label: 'Pest Control',     value: 'PEST_CONTROL'     },
    { label: 'Appliance Repair', value: 'APPLIANCE_REPAIR' },
    { label: 'Other',            value: 'OTHER'            },
];

/** Required for every service pass, so both the Once and Frequently tabs show it. */
function ServiceCategoryField({ state }: { state: FormState }) {
    return (
        <>
            <Text style={S.fieldLabel}>SERVICE CATEGORY</Text>
            <Dropdown
                value={state.serviceCategory
                    ? SERVICE_CATEGORIES.find(c => c.value === state.serviceCategory)?.label ?? state.serviceCategory
                    : 'Select category'}
                options={SERVICE_CATEGORIES.map(c => c.label)}
                onSelect={(label) => {
                    const cat = SERVICE_CATEGORIES.find(c => c.label === label);
                    if (cat) state.setServiceCategory(cat.value);
                }}
                title="Service Category"
            />
        </>
    );
}

// ─── Service Once ────────────────────────────────────────────────────────────
function ServiceOnce({ state }: { state: FormState }) {
    return (
        <View style={S.formBody}>
            <ServiceCategoryField state={state} />
            <Text style={S.fieldLabel}>SELECT DATE</Text>
            <TouchableOpacity style={S.dropRow} onPress={state.openDate} activeOpacity={0.8}>
                <Text style={S.dropText}>{isToday(state.date) ? 'Today' : fmtDateShort(state.date)}</Text>
                <Feather name="calendar" size={18} color={SgateColors.t3} />
            </TouchableOpacity>

            <View style={S.twoCol}>
                <View style={S.col}>
                    <Text style={S.fieldLabel}>STARTING FROM</Text>
                    <TouchableOpacity style={S.dropRow} onPress={state.openTime} activeOpacity={0.8}>
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
    const VIOLET = SgateColors.violet;
    const VIOLET_BG = SgateColors.violetBg;
    return (
        <View style={S.formBody}>
            {state.inviteType === 'CAB' && (
                <CheckCard
                    checked={state.safeMode}
                    onToggle={() => state.setSafeMode(!state.safeMode)}
                    title="Safe Pickup Mode"
                    desc="No need to share flat details with the cab driver or guard."
                    rightIcon="shield"
                    rightIconBg={state.safeMode ? VIOLET + '22' : SgateColors.surface}
                    rightIconColor={state.safeMode ? VIOLET : SgateColors.t3}
                    recommended
                    activeBg={VIOLET_BG}
                    activeCheckColor={VIOLET}
                    cardStyle={S.checkCardBordered}
                />
            )}

            {state.inviteType === 'SERVICE' && <ServiceCategoryField state={state} />}

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

            {state.inviteType === 'CAB' && <VehicleDigits state={state} />}

            {state.inviteType === 'DELIVERY' && (
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
    guestMode: GuestInviteMode;
    inviteType: InviteType;
    isPrivate: boolean; setIsPrivate: (v: boolean) => void;
    date: Date; openDate: () => void;
    time: Date; openTime: () => void;
    duration: string; setDuration: (v: string) => void;
    digits: string[]; onDigit: (i: number, v: string) => void;
    digitRefs: React.MutableRefObject<(TextInput | null)[]>;
    surpriseDelivery: boolean; setSurpriseDelivery: (v: boolean) => void;
    safeMode: boolean; setSafeMode: (v: boolean) => void;
    validityDays: number; setValidityDays: (v: number) => void;
    selectedDays: string; setSelectedDays: (v: string) => void;
    entriesLabel: string; setEntriesLabel: (v: string) => void;
    company: string; setCompany: (v: string) => void;
    timeFrom: string; setTimeFrom: (v: string) => void;
    timeUntil: string; setTimeUntil: (v: string) => void;
    serviceCategory: HelpCategory | null; setServiceCategory: (v: HelpCategory | null) => void;
    showPrivateInfo: boolean; setShowPrivateInfo: (v: boolean) => void;
}

// ─── Form panel wrapper ───────────────────────────────────────────────────────
/**
 * The new tab's fields fade in from partly visible, not from nothing, so the
 * body is never blank for a frame while the sheet resizes around it.
 */
const TAB_ENTER = FadeIn.duration(200).withInitialValues({ opacity: 0.3 });

function FormPanel({ inviteType, tab, setTab, onBack, state, submitting, onSubmit, bottomInset = 0 }: {
    inviteType: InviteType; tab: FreqTab; setTab: (t: FreqTab) => void;
    onBack: () => void; state: FormState; submitting: boolean; onSubmit: () => void;
    bottomInset?: number;
}) {
    const isGuest    = inviteType === 'GUEST';
    const isPrivate  = isGuest && state.isPrivate;
    const activeColor = isPrivate ? PRIVATE_PURPLE : SgateColors.gold;
    const typeConfig = TYPES.find(t => t.key === inviteType);

    // CTA label
    let ctaLabel: string;
    if (inviteType === 'GUEST') {
        ctaLabel = isPrivate ? 'Add private guest' : 'Add guest';
    } else if (inviteType === 'CAB') {
        ctaLabel = 'Pre-approve Cab';
    } else if (inviteType === 'DELIVERY') {
        ctaLabel = 'Pre-approve Delivery';
    } else if (inviteType === 'SERVICE') {
        ctaLabel = 'Pre-approve Service';
    } else {
        ctaLabel = 'Create Pre-Approval';
    }

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
        <SheetShell
            height="fit"
            bottomClearance={bottomInset}
            header={<StepHeader title={typeConfig?.label ?? ''} subtitle={typeConfig?.desc} onBack={onBack} />}
            subHeader={
                <View style={S.formTabRow}>
                    {(['once', 'frequently'] as FreqTab[]).map(t => (
                        <TouchableOpacity key={t} style={S.tabItem} onPress={() => setTab(t)} activeOpacity={0.8}>
                            <Text style={[S.tabText, tab === t && S.tabTextActive]}>
                                {t === 'once' ? 'Once' : 'Frequently'}
                            </Text>
                            {tab === t && <View style={[S.tabLine, { backgroundColor: activeColor }]} />}
                        </TouchableOpacity>
                    ))}
                </View>
            }
            contentContainerStyle={S.formScrollContent}
            footer={
                <PrimaryAction
                    label={ctaLabel}
                    onPress={onSubmit}
                    loading={submitting}
                    tone={isPrivate ? 'violet' : 'gold'}
                />
            }
        >
            {/* Keyed by tab so the new tab's fields fade in rather than snap;
                the sheet resizes around them at the same time. */}
            <Animated.View key={tab} entering={TAB_ENTER}>
                {renderContent()}
            </Animated.View>
        </SheetShell>
    );
}

// ─── Party Theme definitions — each with unique bg image + color tokens ───────
const PARTY_THEMES = [
    {
        emoji: '🏠', label: 'Home',
        bgImage: require('../../../assets/images/party_room_bg.jpg'),
        headerBg: '#F5EFE8', headlineColor: '#8B6300', dark: false,
        chipBorder: '#E8564A', chipBg: '#FFE8E2',
        ctaBg: SgateColors.gold, ctaText: SgateColors.t1,
        overlayBg: 'rgba(255,252,240,0.72)',
    },
    {
        emoji: '🍽️', label: 'Dinner',
        bgImage: require('../../../assets/images/theme_dinner_bg.jpg'),
        headerBg: '#FDF4E7', headlineColor: '#7A4210', dark: false,
        chipBorder: '#D97706', chipBg: '#FEF3C7',
        ctaBg: '#D97706', ctaText: '#FFFFFF',
        overlayBg: 'rgba(253,244,231,0.75)',
    },
    {
        emoji: '🎈', label: 'Celebration',
        bgImage: require('../../../assets/images/theme_celebration_bg.jpg'),
        headerBg: '#FFF0F5', headlineColor: '#9D174D', dark: false,
        chipBorder: '#EC4899', chipBg: '#FCE7F3',
        ctaBg: '#EC4899', ctaText: '#FFFFFF',
        overlayBg: 'rgba(255,240,245,0.72)',
    },
    {
        emoji: '📽️', label: 'Movie',
        bgImage: require('../../../assets/images/theme_movie_bg.jpg'),
        headerBg: '#1E2A4A', headlineColor: '#E0EAFF', dark: true,
        chipBorder: '#93C5FD', chipBg: '#1E3A8A',
        ctaBg: '#3B82F6', ctaText: '#FFFFFF',
        overlayBg: 'rgba(10,18,50,0.68)',
    },
    {
        emoji: '🃏', label: 'Cards',
        bgImage: require('../../../assets/images/theme_cards_bg.jpg'),
        headerBg: '#064E3B', headlineColor: '#ECFDF5', dark: true,
        chipBorder: '#34D399', chipBg: '#065F46',
        ctaBg: '#10B981', ctaText: '#FFFFFF',
        overlayBg: 'rgba(4,40,30,0.65)',
    },
    {
        emoji: '🎂', label: 'Birthday',
        bgImage: require('../../../assets/images/theme_birthday_bg.jpg'),
        headerBg: '#FFFBEB', headlineColor: '#92400E', dark: false,
        chipBorder: '#F59E0B', chipBg: '#FEF3C7',
        ctaBg: '#F59E0B', ctaText: SgateColors.t1,
        overlayBg: 'rgba(255,251,235,0.72)',
    },
];

function PartyGroupThemePanel({ onBack, onNext }: {
    onBack: () => void;
    onNext: (data: { theme: number; note: string }) => void;
}) {
    const [selectedTheme, setSelectedTheme] = useState(0);
    const [note, setNote] = useState('');
    const { user } = useAuthStore();
    const displayName = user?.name?.split(' ')[0] ?? 'You';

    // Animated fade values — one per theme image
    const fadeAnims = useRef(PARTY_THEMES.map((_, i) => new RNAnimated.Value(i === 0 ? 1 : 0))).current;

    const handleThemeSelect = (i: number) => {
        const prev = selectedTheme;
        setSelectedTheme(i);
        // Cross-fade: fade out previous, fade in new
        RNAnimated.parallel([
            RNAnimated.timing(fadeAnims[prev], { toValue: 0, duration: 280, useNativeDriver: true }),
            RNAnimated.timing(fadeAnims[i],    { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    };

    const theme = PARTY_THEMES[selectedTheme];
    const sheetClearance = useSheetBottomClearance();

    return (
        <SheetShell
            height="fill"
            bottomClearance={sheetClearance}
            chromeColor={theme.headerBg}
            contentContainerStyle={{ flexGrow: 1, backgroundColor: theme.headerBg }}
            footerStyle={{ backgroundColor: theme.headerBg }}
            header={
                <View style={{ backgroundColor: theme.headerBg }}>
                    <StepHeader
                        title="Party/Group Invite"
                        onBack={onBack}
                        tint={theme.dark ? SgateColors.card : undefined}
                    />
                </View>
            }
            footer={
                <PrimaryAction
                    label="Next"
                    onPress={() => onNext({ theme: selectedTheme, note })}
                    color={theme.ctaBg}
                    textColor={theme.ctaText}
                />
            }
        >

            {/* ── Full-bleed illustration area ─────────────────────── */}
            <View style={{ flex: 1, position: 'relative', backgroundColor: theme.headerBg }}>

                {/* Stacked background images, each fades in/out — contain keeps full image visible */}
                {PARTY_THEMES.map((t, i) => (
                    <RNAnimated.Image
                        key={i}
                        source={t.bgImage}
                        style={[
                            StyleSheet.absoluteFillObject,
                            { opacity: fadeAnims[i] },
                        ]}
                        resizeMode="contain"
                    />
                ))}

                {/* Top overlay: invite text + note input + chips — frosted card for readability */}
                <View style={[PT.overlayCard, { backgroundColor: theme.overlayBg }]}>

                    {/* Invite headline — color adapts; dark themes use light text */}
                    <Text style={[
                        PT.inviteHeadline,
                        { color: theme.headlineColor },
                        theme.dark && PT.inviteHeadlineShadow,
                    ]}>
                        {displayName} has invited you.
                    </Text>

                    {/* Note input — frosted pill */}
                    <TextInput
                        style={[PT.notePill, theme.dark && PT.notePillDark]}
                        placeholder="Add a note"
                        placeholderTextColor={SgateColors.t3}
                        value={note}
                        onChangeText={setNote}
                        maxLength={120}
                    />

                    {/* Theme chips — one row of equal cells spanning the gutter,
                        so the last one is never clipped at the edge. */}
                    <View style={PT.chipRow}>
                        {PARTY_THEMES.map((t, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[
                                    PT.chip,
                                    { backgroundColor: t.chipBg },
                                    selectedTheme === i && {
                                        borderColor: t.chipBorder,
                                        borderWidth: 2.5,
                                        shadowColor: t.chipBorder,
                                        shadowOpacity: 0.4,
                                        shadowRadius: 6,
                                        shadowOffset: { width: 0, height: 2 },
                                        elevation: 4,
                                    },
                                ]}
                                onPress={() => handleThemeSelect(i)}
                                activeOpacity={0.8}
                            >
                                <Text style={PT.chipEmoji}>{t.emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

            </View>
        </SheetShell>
    );
}

const PT = StyleSheet.create({
    overlayCard: {
        paddingHorizontal: SgateLayout.screenGutter,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 14,
        // frosted card blends with theme — backgroundColor set inline
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    // kept for legacy safety
    overlayTop: {
        paddingHorizontal: 20,
        paddingTop: 22,
        gap: 14,
    },
    inviteHeadline: {
        fontSize: 26,
        fontFamily: SgateFonts.extrabold,
        lineHeight: 34,
        maxWidth: '78%',
    },
    inviteHeadlineShadow: {
        textShadowColor: 'rgba(0,0,0,0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    notePill: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.82)',
        borderRadius: 50,
        paddingHorizontal: 22,
        paddingVertical: 10,
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        minWidth: 160,
    },
    notePillDark: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        color: '#E2E8F0',
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    chip: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    chipEmoji: {
        fontSize: 26,
    },
    overlayBottom: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    // legacy stubs (used nowhere — kept for PT reference safety)
    heroBanner: { height: 0 },
    heroOverlay: { ...StyleSheet.absoluteFillObject },
    backBtn: {},
    heroEmoji: { fontSize: 0 },
    themePill: {}, themePillText: { fontSize: 0 },
    decCircle: { position: 'absolute', borderRadius: 999 },
    sectionTitle: { fontSize: 0 }, sectionSub: { fontSize: 0 },
    themeGrid: {}, themeCard: {}, themeCardActive: {},
    themeCheckBadge: {}, themeCardEmoji: { fontSize: 0 },
    themeCardLabel: { fontSize: 0 }, noteBox: {}, noteInput: { fontSize: 0 },
});

interface GuestEntry { id: string; name: string; phone: string; }

// ─── Party/Group: Step 2 — date / venue / guest count ────────────────────────
const PARTY_GUEST_COUNTS = [5, 20, 50];

function PartyGroupFormPanel({ theme, note, onBack, onSubmit, submitting = false }: {
    theme: number; note: string;
    onBack: () => void;
    submitting?: boolean;
    onSubmit: (data: { validFrom: string; validUntil: string; venue: string; maxGuests: number; theme: number; note: string }) => void;
}) {
    const [date, setDate]         = useState(new Date());
    const [time, setTime]         = useState(new Date());
    const [duration, setDuration] = useState('8 hours');
    const [venue, setVenue]       = useState('');
    const [maxGuests, setMaxGuests] = useState(5);
    const [customCount, setCustomCount] = useState('');
    const [showDatePick, setShowDatePick] = useState(false);
    const [showTimePick, setShowTimePick] = useState(false);
    const [showDurPick, setShowDurPick]   = useState(false);
    const sheetClearance = useSheetBottomClearance();

    const handle = () => {
        let vF = new Date(date);
        vF.setHours(time.getHours(), time.getMinutes(), 0, 0);
        // Same rule as the other forms: a start already in the past begins now.
        if (vF < new Date()) vF = new Date();
        const hrs = parseInt(duration) || 8;
        const vU = new Date(vF); vU.setHours(vU.getHours() + hrs);
        const finalCount = maxGuests === -1 ? (parseInt(customCount) || 10) : maxGuests;
        onSubmit({ validFrom: vF.toISOString(), validUntil: vU.toISOString(), venue, maxGuests: finalCount, theme, note });
    };

    return (
        <>
        <SheetShell
            height="fit"
            bottomClearance={sheetClearance}
            header={<StepHeader title="Party/Group Invite" subtitle="When, where and how many" onBack={onBack} />}
            contentContainerStyle={{ paddingHorizontal: SgateLayout.screenGutter, paddingBottom: 16 }}
            footer={<PrimaryAction label="Create Invite" onPress={handle} loading={submitting} />}
        >
                {/* Mini theme banner */}
                <View style={S.partyMiniHeader}>
                    <Text style={S.partyMiniEmoji}>{THEME_ILLUSTRATIONS[theme]}</Text>
                    <TouchableOpacity onPress={onBack} style={S.inlineLink} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Feather name="edit-2" size={14} color={SgateColors.goldDeep} />
                        <Text style={S.partyCustomizeLink}>Customise</Text>
                    </TouchableOpacity>
                </View>

                <Text style={S.fieldLabel}>Select Date</Text>
                <TouchableOpacity style={S.dropRow} onPress={() => setShowDatePick(true)} activeOpacity={0.8}>
                    <Text style={S.dropText}>{isToday(date) ? 'Today' : fmtDateShort(date)}</Text>
                    <Feather name="calendar" size={18} color={SgateColors.t3} />
                </TouchableOpacity>

                <View style={S.twoCol}>
                    <View style={S.col}>
                        <Text style={S.fieldLabel}>Starting from</Text>
                        <TouchableOpacity style={S.dropRow} onPress={() => setShowTimePick(true)} activeOpacity={0.8}>
                            <Text style={S.dropText}>{fmt12(time)}</Text>
                            <Feather name="clock" size={18} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>
                    <View style={S.col}>
                        <Text style={S.fieldLabel}>Valid for</Text>
                        <TouchableOpacity style={S.dropRow} onPress={() => setShowDurPick(true)} activeOpacity={0.8}>
                            <Text style={S.dropText}>{duration}</Text>
                            <Feather name="clock" size={18} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={S.fieldLabel}>Location/Venue</Text>
                <TextInput
                    style={[S.dropRow, { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 }]}
                    placeholder="e.g. Tower 17 706, Clubhouse"
                    placeholderTextColor={SgateColors.t4}
                    value={venue}
                    onChangeText={setVenue}
                />

                <Text style={S.fieldLabel}>How many guests are you expecting? (max 50)*</Text>
                <View style={S.partyCountRow}>
                    {PARTY_GUEST_COUNTS.map(n => (
                        <TouchableOpacity
                            key={n}
                            style={[S.partyCountChip, maxGuests === n && S.partyCountChipActive]}
                            onPress={() => setMaxGuests(n)}
                            activeOpacity={0.8}
                        >
                            <Text style={[S.partyCountText, maxGuests === n && S.partyCountTextActive]}>{n}</Text>
                        </TouchableOpacity>
                    ))}
                    <TextInput
                        style={[S.partyCountChip, S.partyCountCustom, maxGuests === -1 && S.partyCountChipActive]}
                        keyboardType="number-pad"
                        placeholder="Custom"
                        placeholderTextColor={SgateColors.t4}
                        value={maxGuests === -1 ? customCount : ''}
                        onFocus={() => setMaxGuests(-1)}
                        onChangeText={setCustomCount}
                    />
                </View>
        </SheetShell>

            {/* Date / Time / Duration pickers */}
            {showDatePick && (
                <DateTimePicker
                    value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(_, d) => { setShowDatePick(false); if (d) setDate(d); }}
                />
            )}
            {showTimePick && (
                <DateTimePicker
                    value={time} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, d) => { setShowTimePick(false); if (d) setTime(d); }}
                />
            )}
            {showDurPick && (
                <PickerSheet
                    visible title="Valid For" options={DURATIONS}
                    selected={duration} onSelect={setDuration} onClose={() => setShowDurPick(false)}
                />
            )}

        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTY INVITE SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

/** The same emoji the theme picker shows, so the chosen theme is what comes back. */
const THEME_ILLUSTRATIONS = PARTY_THEMES.map(t => t.emoji);

function PartySuccessPanel({ invite, onClose }: { invite: PartyInvite; onClose: () => void }) {
    const sheetClearance = useSheetBottomClearance();
    const [guests, setGuests] = useState<PartySlot[]>(invite.slots?.filter(s => s.phone !== null) || []);
    const [addName, setAddName]   = useState('');
    const [addPhone, setAddPhone] = useState('');
    const [showAdd, setShowAdd]   = useState(false);
    const [adding, setAdding]     = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);

    const bannerColor = PARTY_THEMES[invite.theme]?.headerBg ?? SgateColors.surface;
    const usedSlots  = guests.length;
    const totalSlots = invite.maxGuests;

    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const fmtTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `You're invited! Open this link to get your entry pass:\n${invite.inviteLink}`,
                url: invite.inviteLink,
                title: `${invite.hostName}'s Invite`,
            });
        } catch { /* user dismissed */ }
    };

    const handleAddGuest = async () => {
        if (!addName.trim() || !addPhone.trim()) {
            AppAlert.show('Required', 'Enter both name and phone number.');
            return;
        }
        setAdding(true);
        try {
            const slot = await addPartyGuest(invite.id, addName.trim(), addPhone.trim());
            setGuests(g => [...g, slot]);
            setAddName(''); setAddPhone(''); setShowAdd(false);
        } catch (e: any) {
            AppAlert.show('Error', e.message ?? 'Failed to add guest');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (code: string) => {
        setRemoving(code);
        try {
            await removePartyGuest(invite.id, code);
            setGuests(g => g.filter(s => s.code !== code));
        } finally {
            setRemoving(null);
        }
    };

    return (
        <SheetShell
            height="fill"
            bottomClearance={sheetClearance}
            chromeColor={bannerColor}
            footer={<PrimaryAction label="Done" onPress={onClose} />}
        >
            {/* Theme illustration banner */}
            <View style={[S.partySuccessBanner, { backgroundColor: bannerColor }]}>
                <Text style={S.partySuccessEmoji}>{THEME_ILLUSTRATIONS[invite.theme]}</Text>
            </View>

            {/* Event meta card */}
            <View style={S.partyMetaCard}>
                <Text style={S.partyMetaTitle}>{invite.hostName} has invited you.</Text>
                <Text style={S.partyMetaDate}>
                    {fmtDate(invite.validFrom)}, {fmtTime(invite.validFrom)} - {fmtTime(invite.validUntil)}
                </Text>
                {invite.venue ? <Text style={S.partyMetaVenue}>{invite.venue}</Text> : null}

                <TouchableOpacity style={S.editInviteRow} onPress={() => AppAlert.show('Edit Invite', 'Coming soon!')}>
                    <Feather name="edit-2" size={14} color={SgateColors.goldDeep} />
                    <Text style={S.editInviteText}>Edit Invite</Text>
                </TouchableOpacity>
            </View>

            {/* Share CTA */}
            <View style={S.partySection}>
                <Text style={S.partyShareHint}>
                    Share this link with all guests, and they can generate their own entry codes.
                </Text>
                <TouchableOpacity style={S.partyShareBtn} onPress={handleShare} activeOpacity={0.8}>
                    <Feather name="link" size={18} color={SgateColors.goldDeep} />
                    <Text style={S.partyShareBtnText}>Share invite link</Text>
                </TouchableOpacity>
            </View>

            {/* Guest list */}
            <View style={S.partyGuestListHeader}>
                <Text style={S.partyGuestListTitle}>Guest list ({usedSlots}/{totalSlots})</Text>
                {usedSlots < totalSlots && (
                    <TouchableOpacity onPress={() => setShowAdd(v => !v)}>
                        <Text style={S.partyAddGuestLink}>+ Add guests</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={[S.partySection, { paddingBottom: 24 }]}>
                {/* Inline add form */}
                {showAdd && (
                    <View style={S.partyAddForm}>
                        <TextInput
                            style={S.partyAddInput} placeholder="Guest name"
                            placeholderTextColor={SgateColors.t4}
                            value={addName} onChangeText={setAddName}
                        />
                        <TextInput
                            style={S.partyAddInput} placeholder="+91 XXXXXXXXXX"
                            placeholderTextColor={SgateColors.t4} keyboardType="phone-pad"
                            value={addPhone} onChangeText={setAddPhone}
                        />
                        <TouchableOpacity
                            style={[S.ctaBtn, adding && S.ctaBtnDisabled, { marginTop: 6 }]}
                            onPress={handleAddGuest}
                            disabled={adding}
                            activeOpacity={0.8}
                        >
                            <Text style={S.ctaText}>{adding ? 'Adding…' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {guests.length === 0 && !showAdd && (
                    <View style={S.partyEmptyState}>
                        <Text style={S.partyEmptyText}>All your guests with a valid passcode will appear here.</Text>
                    </View>
                )}

                {guests.map(g => (
                    <View key={g.code}>
                    <View style={S.partyGuestCard}>
                        {/* Avatar circle */}
                        <View style={S.partyGuestAvatar}>
                            <Text style={S.partyGuestAvatarText}>{(g.name ?? 'G')[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={S.partyGuestName}>{g.name ?? g.phone}</Text>
                            {/* Entry code box */}
                            <View style={S.partyEntryCodeBox}>
                                <View>
                                    <Text style={S.partyEntryCodeLabel}>Entry code</Text>
                                    <Text style={S.partyEntryCode}>{g.code}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => Share.share({ message: `Your entry code: ${g.code}` })}
                                >
                                    <Feather name="share" size={18} color={SgateColors.goldDeep} />
                                </TouchableOpacity>
                            </View>
                            {g.addedByResident && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                                    <Feather name="user" size={12} color={SgateColors.t3} />
                                    <Text style={S.partyAddedByYou}>Added by you</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* This guest's actions, directly under their card. */}
                    <View style={S.partyGuestActions}>
                        <TouchableOpacity
                            style={S.partyGuestAction}
                            onPress={() => handleRemove(g.code)}
                            disabled={removing === g.code}
                        >
                            <Feather name="trash-2" size={15} color={SgateColors.red} />
                            <Text style={[S.partyGuestActionText, { color: SgateColors.red }]}>Remove</Text>
                        </TouchableOpacity>
                        <View style={S.partyGuestActionDivider} />
                        <TouchableOpacity
                            style={S.partyGuestAction}
                            onPress={() => { if (g.phone) Linking.openURL(`tel:${g.phone}`); }}
                            disabled={!g.phone}
                        >
                            <Feather name="phone" size={15} color={SgateColors.t2} />
                            <Text style={S.partyGuestActionText}>Call</Text>
                        </TouchableOpacity>
                    </View>
                    </View>
                ))}
            </View>
        </SheetShell>
    );
}

export function PreApproveSheet({ visible, onClose, onSuccess, initialType }: PreApproveSheetProps) {
    const { user, role } = useAuthStore();
    // The sheet renders inline, so it already stops at the top of the tab bar:
    // one gutter is the whole clearance. Padding for the bar as well is what
    // left the dead band under the last row.
    const sheetClearance = useSheetBottomClearance();
    
    // Nested sheet state
    const [guestSheetConfig, setGuestSheetConfig] = useState<any>();
    const [partyInviteResult, setPartyInviteResult] = useState<PartyInvite | null>(null);

    // ── Step / tab ────────────────────────────────────────────────────────────
    /**
     * Navigation is driven by the shared stepper: it records the trail as you
     * move, so "back" is always the step you came from, and the transition knows
     * which way to slide. `setStep` stays as the forward alias so the handlers
     * below read the same as before.
     */
    const { step, direction, go: setStep, back: stepBack, reset: resetStep } = useSheetStepper<StepName>('select');
    const [inviteType,      setInviteType]     = useState<InviteType>('GUEST');
    const [guestMode,       setGuestMode]      = useState<GuestInviteMode>('quick');
    const [tab,             setTab]            = useState<FreqTab>('once');
    const [inviteValidFrom, setInviteValidFrom]= useState('');
    const [inviteValidUntil,setInviteValidUntil]= useState('');
    const [selectedGuestsToManage, setSelectedGuestsToManage] = useState<GuestEntry[]>([]);
    const [generatedPasses, setGeneratedPasses] = useState<QRPassData[]>([]);
    // Refresh the caller's list after the result has been viewed. Several
    // callers close this sheet in onSuccess, so firing it on API success hid
    // the QR carousel before it could be shown.
    const completedResult = useRef<{ type: InviteType; id?: string } | null>(null);
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;
    const [partyThemeData,  setPartyThemeData] = useState<{ theme: number; note: string }>({ theme: 0, note: '' });

    // ── Form state ────────────────────────────────────────────────────────────
    const [isPrivate,        setIsPrivate]        = useState(false);
    const [showPrivateInfo,  setShowPrivateInfo]  = useState(false);
    const [date,             setDate]             = useState(new Date());
    const [time,             setTime]             = useState(new Date());
    const [duration,         setDuration]         = useState('8 hours');
    const [digits,           setDigits]           = useState(['','','','']);
    const [surpriseDelivery, setSurpriseDelivery] = useState(false);
    const [safeMode,         setSafeMode]         = useState(true); // default ON — Safe Pickup recommended
    const [validityDays,     setValidityDays]     = useState(30);
    const [selectedDays,     setSelectedDays]     = useState('All days of Week');
    const [entriesLabel,     setEntriesLabel]     = useState('One Entry');
    const [company,          setCompany]          = useState('');
    const [timeFrom,         setTimeFrom]         = useState('00:00 am');
    const [timeUntil,        setTimeUntil]        = useState('11:59 pm');
    const [serviceCategory,  setServiceCategory]  = useState<HelpCategory | null>(null);
    const [submitting,       setSubmitting]       = useState(false);
    const partyInFlight = useRef(false);

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
        const s = v.replace(/\D/g, '').slice(-1);
        const nd = [...digits]; nd[i] = s; setDigits(nd);
        if (s && i < 3) digitRefs.current[i + 1]?.focus();
    };

    const [closingRequested, setClosingRequested] = useState(false);

    const handleClose = () => {
        const result = completedResult.current;
        completedResult.current = null;
        if (result) onSuccessRef.current?.(result);
        onClose();
    };

    useEffect(() => {
        if (!visible) return;
        setClosingRequested(false);
        resetStep(initialType ? 'form' : 'select');
        setTab('once');
        setIsPrivate(false);
        // The sheet stays mounted between opens, so "now" has to be re-read
        // here or a pass silently starts whenever the sheet was first opened.
        setDate(new Date());
        setTime(new Date());
        setInviteType(initialType ?? 'GUEST');
        setDigits(['', '', '', '']);
        setSurpriseDelivery(false);
        setCompany('');
        setSafeMode(true);
        setServiceCategory(null);
        setSelectedDays('All days of Week');
        setSelectedGuestsToManage([]);
        setValidityDays(30);
        setDuration('8 hours');
        setEntriesLabel('One Entry');
        setSubmitting(false);
        setGeneratedPasses([]);
        completedResult.current = null;
    // Opening the sheet is the reset boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);
    // StepSheet and StepTransition own motion; navigation changes only the step.
    const goBackOrClose = () => {
        if (!stepBack()) setClosingRequested(true);
    };

    const handleTabChange = (newTab: FreqTab) => setTab(newTab);

    const goToForm = (type: InviteType) => {
        setInviteType(type);
        setTab('once');
        setStep(type === 'GUEST' ? 'guest_type' : 'form');
    };

    const goToGuestForm = (mode: GuestInviteMode) => {
        setGuestMode(mode);
        // The picker's choice decides the form: Frequent opens on its tab and
        // Private gets the private treatment. Left alone, both were inherited
        // from whatever the previous visit to the form set.
        setTab(mode === 'frequent' ? 'frequently' : 'once');
        setIsPrivate(mode === 'private');
        setStep(mode === 'group' ? 'party_theme' : 'form');
    };

    const goToPartyForm = (data: { theme: number; note: string }) => {
        setPartyThemeData(data);
        setStep('party_form');
    };

    const goToPartySuccess = (result: PartyInvite) => {
        setPartyInviteResult(result);
        setStep('party_success');
    };

    const goToGuestListFromGuests = (guestsList: { name: string; phone: string }[]) => {
        setSelectedGuestsToManage(guestsList.map(g => ({ id: Math.random().toString(), ...g })));
        setStep('guest_list');
    };

    const goBackToGuestsWithSelections = (currentGuests: { id?: string; name: string; phone: string }[]) => {
        setSelectedGuestsToManage(currentGuests.map(g => ({
            id: g.id || Math.random().toString(),
            name: g.name,
            phone: g.phone,
        })));
        goBackOrClose();
    };

    const showSuccess = () => {
        Keyboard.dismiss();
        setStep('success');
    };
    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!user?.flatId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') { AppAlert.show('Error', 'Your flat is not set up.'); return; }
        setSubmitting(true);
        try {
            const flatId = user?.flatId || user?.societyId || '';

            const durationHours = (() => {
                const n = parseInt(duration); return isNaN(n) ? 1 : n;
            })();

            /**
             * @param fromNow for forms with no start-time field (cab, delivery:
             *   "enter today once in the next N hours") — the window starts at
             *   submission, not at a value the user never saw.
             */
            const buildOnceWindow = (fromNow = false) => {
                const now = new Date();
                let vF = fromNow ? now : new Date(date);
                if (!fromNow) vF.setHours(time.getHours(), time.getMinutes(), 0, 0);
                // A start that has slipped into the past (form left open) begins
                // now instead; the backend rejects windows starting well before.
                if (vF < now) vF = now;
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

            const parseTime = (str: string) => {
                if (!str) return undefined;
                const [timeStr, modifier] = str.toLowerCase().split(' ');
                let [hours, minutes] = timeStr.split(':').map(Number);
                if (modifier === 'pm' && hours < 12) hours += 12;
                if (modifier === 'am' && hours === 12) hours = 0;
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            };

            let result: { id: string } | null;

            /**
             * The backend does not create a second active entry of the same
             * type/mode for a flat: it answers 200 with a DUPLICATE_EXISTS
             * warning and no entry. That used to be treated as success, so the
             * user saw "Pass Created!" for a pass that didn't exist. Ask, and
             * only create when they confirm.
             */
            const createEntry = async (payload: CreatePreApprovedPayload): Promise<{ id: string } | null> => {
                const res = await createPreApproved(payload);
                if (!('warning' in res)) return res;
                const proceed = await new Promise<boolean>(resolve => {
                    AppAlert.show(
                        'Similar pass already active',
                        'Your flat already has an active pass like this one. Create another one anyway?',
                        [
                            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                            { text: 'Create anyway', onPress: () => resolve(true) },
                        ],
                        { cancelable: false },
                    );
                });
                if (!proceed) return null;
                const retry = await createPreApproved({ ...payload, skipDuplicateCheck: true });
                return 'warning' in retry ? null : retry;
            };

            if (inviteType === 'GUEST') {
                const w = tab === 'once' ? buildOnceWindow() : buildFreqWindow();
                
                const finalType = guestMode === 'private' ? 'PRIVATE' : tab === 'once' ? 'QUICK' : 'FREQUENT';
                setGuestSheetConfig({ type: finalType, flatId, isPrivate: guestMode === 'private' || isPrivate, validFrom: w.validFrom, validUntil: w.validUntil, maxUses: tab === 'once' ? 1 : maxUses, timeFrom: tab === 'frequently' ? parseTime(timeFrom) : undefined, timeUntil: tab === 'frequently' ? parseTime(timeUntil) : undefined, allowedDays: tab === 'frequently' ? mapDays(selectedDays) : undefined });
                setInviteValidFrom(w.validFrom);
                setInviteValidUntil(w.validUntil);
                setStep('guests');
                setSubmitting(false);
                return;

            } else if (inviteType === 'CAB') {
                const digs = digits.join('');
                if (digs.length < 4) { AppAlert.show('Required', 'Enter the last 4 digits of the vehicle number for gate verification.'); setSubmitting(false); return; }
                if (tab === 'once') {
                    const w = buildOnceWindow(true);
                    result = await createEntry({
                        type: 'CAB',
                        mode: safeMode ? 'SAFE' : 'NORMAL',
                        scheduleType: 'ONCE',
                        date: w.validFrom.slice(0, 10),
                        startTime: new Date(w.validFrom).toTimeString().slice(0, 5),
                        endTime: new Date(w.validUntil).toTimeString().slice(0, 5),
                        vehicleLast4Digits: digs,
                    });
                } else {
                    const w = buildFreqWindow();
                    result = await createEntry({
                        type: 'CAB',
                        mode: safeMode ? 'SAFE' : 'NORMAL',
                        scheduleType: 'RECURRING',
                        validFrom: w.validFrom,
                        validUntil: w.validUntil,
                        daysOfWeek: mapDays(selectedDays) as any,
                        timeFrom: parseTime(timeFrom),
                        timeTo: parseTime(timeUntil),
                        entriesPerDay: maxUses < 0 ? 10 : maxUses,
                        vehicleLast4Digits: digs,
                    });
                }

            } else if (inviteType === 'DELIVERY') {
                if (tab === 'once') {
                    const w = buildOnceWindow(true);
                    result = await createEntry({
                        type: 'DELIVERY',
                        mode: surpriseDelivery ? 'SURPRISE' : 'NORMAL',
                        scheduleType: 'ONCE',
                        date: w.validFrom.slice(0, 10),
                        startTime: new Date(w.validFrom).toTimeString().slice(0, 5),
                        endTime: new Date(w.validUntil).toTimeString().slice(0, 5),
                        companyName: company || undefined,
                        isSurprise: surpriseDelivery,
                    });
                } else {
                    if (!company) { AppAlert.show('Required', 'Select a delivery company.'); setSubmitting(false); return; }
                    const w = buildFreqWindow();
                    result = await createEntry({
                        type: 'DELIVERY',
                        mode: 'NORMAL',
                        scheduleType: 'RECURRING',
                        validFrom: w.validFrom,
                        validUntil: w.validUntil,
                        daysOfWeek: mapDays(selectedDays) as any,
                        timeFrom: parseTime(timeFrom),
                        timeTo: parseTime(timeUntil),
                        entriesPerDay: maxUses < 0 ? 10 : maxUses,
                        companyName: company,
                    });
                }

            } else {
                // SERVICE → HELP
                if (!serviceCategory) { AppAlert.show('Required', 'Please select a service category.'); setSubmitting(false); return; }
                if (tab === 'once') {
                    const w = buildOnceWindow();
                    result = await createEntry({
                        type: 'HELP',
                        mode: 'NORMAL',
                        scheduleType: 'ONCE',
                        date: w.validFrom.slice(0, 10),
                        startTime: new Date(w.validFrom).toTimeString().slice(0, 5),
                        endTime: new Date(w.validUntil).toTimeString().slice(0, 5),
                        category: serviceCategory,
                    });
                } else {
                    const w = buildFreqWindow();
                    result = await createEntry({
                        type: 'HELP',
                        mode: 'NORMAL',
                        scheduleType: 'RECURRING',
                        validFrom: w.validFrom,
                        validUntil: w.validUntil,
                        daysOfWeek: mapDays(selectedDays) as any,
                        timeFrom: parseTime(timeFrom),
                        timeTo: parseTime(timeUntil),
                        entriesPerDay: maxUses < 0 ? 10 : maxUses,
                        category: serviceCategory,
                    });
                }
            }

            if (!result) return; // user kept the existing pass
            completedResult.current = { type: inviteType, id: result.id };
            showSuccess();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    /** Create the party/group invite, then show its success panel. */
    const handlePartySubmit = async (data: {
        validFrom: string; validUntil: string; venue: string;
        maxGuests: number; theme: number; note: string;
    }) => {
        if (!user?.flatId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            AppAlert.show('Error', 'Your account is not linked to a flat.');
            return;
        }
        // A second tap while the request is in flight would create a second
        // invite. A ref, because two taps can land before a re-render.
        if (partyInFlight.current) return;
        partyInFlight.current = true;
        setSubmitting(true);
        try {
            const result = await createPartyInvite({
                hostName: user?.name ?? 'Resident',
                validFrom: data.validFrom,
                validUntil: data.validUntil,
                venue: data.venue,
                maxGuests: data.maxGuests,
                theme: data.theme,
                note: data.note,
            });
            completedResult.current = { type: 'GUEST', id: result.id };
            goToPartySuccess(result);
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to create invite');
        } finally {
            partyInFlight.current = false;
            setSubmitting(false);
        }
    };

    /** Create one invite pass per guest, then show the QR carousel. */
    const submitGuestList = async (guests: GuestEntry[]) => {
        if (guests.length === 0) { AppAlert.show('Error', 'Add at least one guest.'); return; }
        setSubmitting(true);
        try {
            const newPasses: QRPassData[] = [];
            for (const g of guests) {
                // Build a clean, explicit payload — only fields the backend accepts
                const payload: Parameters<typeof createInvitePass>[0] = {
                    type: guestSheetConfig?.type ?? 'QUICK',
                    flatId: guestSheetConfig?.flatId ?? (user?.flatId || user?.societyId || ''),
                    visitorName: g.name,
                    visitorPhone: g.phone,
                    validFrom: guestSheetConfig?.validFrom,
                    validUntil: guestSheetConfig?.validUntil,
                    isPrivate: guestSheetConfig?.isPrivate ?? false,
                    maxUses: guestSheetConfig?.maxUses ?? 1,
                    timeFrom: guestSheetConfig?.timeFrom,
                    timeUntil: guestSheetConfig?.timeUntil,
                    allowedDays: guestSheetConfig?.allowedDays,
                };
                const res = await createInvitePass(payload);
                if (res.passcode) {
                    newPasses.push({
                        id: res.id || Math.random().toString(),
                        code: res.passcode,
                        name: g.name,
                        type: guestSheetConfig?.type ?? 'GUEST',
                        validUntil: guestSheetConfig?.validUntil ? new Date(guestSheetConfig.validUntil).toLocaleString() : '',
                        note: guestSheetConfig?.note,
                    });
                }
            }
            setGeneratedPasses(newPasses);
            completedResult.current = { type: 'GUEST' };
            showSuccess();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message ?? 'Failed to create pass');
        } finally {
            setSubmitting(false);
        }
    };

    const formState: FormState = {
        guestMode, inviteType, isPrivate, setIsPrivate, date, openDate, time, openTime,
        duration, setDuration, digits, onDigit, digitRefs,
        surpriseDelivery, setSurpriseDelivery, safeMode, setSafeMode, validityDays, setValidityDays,
        selectedDays, setSelectedDays, entriesLabel, setEntriesLabel,
        company, setCompany, timeFrom, setTimeFrom, timeUntil, setTimeUntil,
        serviceCategory, setServiceCategory,
        showPrivateInfo, setShowPrivateInfo,
    };

    if (!visible) return null;

    /**
     * How tall each step wants to be.
     *
     * `fill` — steps built around a list (seeing more rows is the point) and the
     *          full-bleed party screens, whose panels are laid out with flex and
     *          need a definite height to place their header, art and action.
     * `fit`  — pickers and forms, which should hug their content so the sheet
     *          sits low rather than stretching up the screen.
     */
    const FILL_STEPS: StepName[] = [
        'guests', 'guest_list',
        // The theme picker and the party success screen are full-bleed artwork;
        // the party form is an ordinary form and hugs its content.
        'party_theme', 'party_success',
    ];
    const stepHeight =
        // Guest invites end on the QR carousel, which is a full-bleed pager;
        // every other type ends on a short confirmation that should hug.
        step === 'success' ? (inviteType === 'GUEST' ? 'fill' : 'fit')
            : FILL_STEPS.includes(step) ? 'fill' : 'fit';

    return (
        <>
            {/* Know-more info screen */}
            <PrivateInviteInfoModal
                visible={showPrivateInfo}
                onClose={() => setShowPrivateInfo(false)}
                onCreatePrivate={() => {
                    setShowPrivateInfo(false);
                    setIsPrivate(true);
                }}
            />

            <StepSheet
                visible={visible && !closingRequested}
                onClose={handleClose}
                stepKey={step}
                direction={direction}
                height={stepHeight}
                // A result screen closes rather than stepping back into the
                // form that has already been submitted.
                onBackPress={() => (step === 'success' || step === 'party_success' ? false : stepBack())}
            >
                {step === 'select' && (
                    <ChooseTypeStep onSelect={goToForm} bottomClearance={sheetClearance} />
                )}

                {step === 'guest_type' && (
                    <GuestInviteTypeStep
                        onSelect={goToGuestForm}
                        onBack={goBackOrClose}
                        bottomClearance={sheetClearance}
                    />
                )}

                {(step === 'form' || step === 'guest_form') && (
                    <FormPanel
                        inviteType={inviteType}
                        tab={tab}
                        setTab={handleTabChange}
                        onBack={goBackOrClose}
                        state={formState}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        bottomInset={sheetClearance}
                    />
                )}

                {step === 'guests' && (
                    <SelectGuestsStep
                        initialGuests={selectedGuestsToManage}
                        bottomClearance={sheetClearance}
                        onBack={goBackOrClose}
                        onNext={goToGuestListFromGuests}
                    />
                )}

                {step === 'guest_list' && (
                    <ManageGuestsStep
                        validFrom={inviteValidFrom}
                        validUntil={inviteValidUntil}
                        guests={selectedGuestsToManage}
                        onChange={setSelectedGuestsToManage}
                        submitting={submitting}
                        bottomClearance={sheetClearance}
                        onBack={goBackOrClose}
                        onAddMore={() => goBackToGuestsWithSelections(selectedGuestsToManage)}
                        onSubmit={() => submitGuestList(selectedGuestsToManage)}
                    />
                )}

                {step === 'party_theme' && (
                    <PartyGroupThemePanel onBack={goBackOrClose} onNext={goToPartyForm} />
                )}

                {step === 'party_form' && (
                    <PartyGroupFormPanel
                        theme={partyThemeData.theme}
                        note={partyThemeData.note}
                        onBack={goBackOrClose}
                        onSubmit={handlePartySubmit}
                        submitting={submitting}
                    />
                )}

                {step === 'party_success' && partyInviteResult && (
                    <PartySuccessPanel invite={partyInviteResult} onClose={() => setClosingRequested(true)} />
                )}

                {step === 'success' && (
                    inviteType === 'GUEST' ? (
                        <QRCarousel
                            passes={generatedPasses}
                            hostName={user?.name || 'You'}
                            flatInfo={user?.flat ? `${user.flat.block?.name ? user.flat.block.name + ' ' : ''}${user.flat.number}` : ''}
                            societyInfo={user?.society ? { name: user.society.name, address: user.society.address, city: user.society.city } : undefined}
                            onDone={() => setClosingRequested(true)}
                        />
                    ) : (
                        <SuccessStep onDone={() => setClosingRequested(true)} bottomClearance={sheetClearance} />
                    )
                )}
            </StepSheet>

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
        </>
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
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        justifyContent: 'flex-end',
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
        maxHeight: '100%',
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
    },
    contentArea: {
        flex: 1,
    },
    stepLayer: {
        ...StyleSheet.absoluteFillObject,
        top: 24,
    },
    fullBleedLayer: {
        top: 0,
    },
    stepLayerCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Guest Type Panel styles ──────────────────────────────────────────────
    guestTypeHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: SgateLayout.screenGutter,
        paddingTop: 4,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    formBackBtn: {
        marginRight: 16,
        marginTop: 4,
    },
    panelTitle: {
        fontSize: 24, fontFamily: SgateFonts.extrabold, color: SgateColors.t1,
    },
    panelSubtitle: {
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        marginTop: 2,
    },
    guestTypeSub: {
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, lineHeight: 20,
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

    // ── Party/Group styles ────────────────────────────────────────────────────
    partyIllustration: {
        backgroundColor: '#F3EDE3',
        height: SW * 0.55,
        alignItems: 'center', justifyContent: 'center',
    },
    partyIllustrationEmoji: {
        fontSize: 90,
    },
    partyNoteWrap: {
        backgroundColor: SgateColors.bg, borderRadius: 24,
        paddingHorizontal: SgateLayout.screenGutter, paddingVertical: 12,
        alignItems: 'center', marginBottom: 4,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    partyNoteInput: {
        fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t2,
        textAlign: 'center', width: '100%',
    },
    partyMiniHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: SgateColors.surface, borderRadius: 14,
        paddingHorizontal: SgateLayout.screenGutter, marginTop: 12, marginBottom: 4,
    },
    partyMiniEmoji: { fontSize: 36 },
    partyCustomizeLink: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },
    partyCountRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    /** Equal cells: the counts line up with each other and the fields above. */
    partyCountChip: {
        flex: 1, height: SgateLayout.controlHeight, borderRadius: 12,
        borderWidth: 1.5, borderColor: SgateColors.border,
        backgroundColor: SgateColors.card, alignItems: 'center', justifyContent: 'center',
    },
    partyCountCustom: {
        flex: 1.6, paddingHorizontal: 14, textAlign: 'center',
        fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1,
    },
    partyCountChipActive: { borderColor: SgateColors.goldDeep, backgroundColor: SgateColors.goldPale },
    partyCountText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    partyCountTextActive: { color: SgateColors.goldDeep },

    // ── Guest Invite Form ─────────────────────────────────────────────────────
    themeBanner: {
        backgroundColor: SgateColors.goldPale, paddingVertical: 14, marginBottom: 4,
    },
    themeScroll: {
        paddingHorizontal: SgateLayout.screenGutter, gap: 10, alignItems: 'center',
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
        flex: 1,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SgateLayout.screenGutter, paddingTop: 30, paddingBottom: 20,
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
    handleRow: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 6,
        zIndex: 100,
    },
    handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: SgateColors.border },

    // ── Step 1: selector ──────────────────────────────────────────────────────
    selectorWrap: { paddingTop: 32, paddingHorizontal: SgateLayout.screenGutter, paddingBottom: 16 },
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
    // No flex: 1 — the panel hugs its content so the sheet can size to it.
    /** Shrinks (and its scroller with it) only when the sheet caps its height. */
    formPanel: { flexShrink: 1 },

    // Tab header (underline style)
    tabHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    backBtn: { paddingRight: 16, paddingBottom: 12 },
    formTabRow: {
        flexDirection: 'row',
        paddingHorizontal: SgateLayout.screenGutter,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
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
    formScroll: { flexShrink: 1 },
    formScrollContent: { paddingTop: 8, paddingBottom: 12 },

    formBody: { paddingHorizontal: SgateLayout.screenGutter, gap: 0 },

    // ── Fields ────────────────────────────────────────────────────────────────
    fieldLabel: {
        fontSize: 13, fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
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
    // White-background variant for guest form fields
    dropRowWhite: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12, borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14, paddingVertical: 13,
    },
    dropText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },

    // Two-column layout
    twoCol: { flexDirection: 'row', gap: 10, marginTop: 4 },
    col:    { flex: 1 },

    // ── Check card ────────────────────────────────────────────────────────────
    checkCard: {
        backgroundColor: SgateColors.bg,
        borderRadius: 14, padding: 14,
    },
    checkCardRow: {
        flexDirection: 'row', alignItems: 'center',
    },
    checkCardBordered: {
        backgroundColor: SgateColors.card,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    recommendedBadge: {
        alignSelf: 'flex-start',
        backgroundColor: SgateColors.violet,
        borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
        marginBottom: 8,
    },
    recommendedText: {
        fontSize: 11, fontFamily: SgateFonts.bold,
        color: SgateColors.card, letterSpacing: 0.4,
    },
    knowMoreLink: {
        fontSize: 12, fontFamily: SgateFonts.semibold,
        color: PRIVATE_PURPLE, textDecorationLine: 'underline',
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
    digitHelp: {
        marginTop: 8, marginBottom: 8,
        fontSize: 12, lineHeight: 17, fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    digitBoxFilled: {
        borderColor: SgateColors.goldDeep, backgroundColor: SgateColors.goldPale,
    },

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
    ctaWrap: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 12 },
    ctaBtn: {
        height: 54, borderRadius: 14,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnDisabled: { opacity: 0.5 },
    ctaText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.black },

    // ── Picker modal ──────────────────────────────────────────────────────────
    pickerBg: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.48)',
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

    // ── Party Success Screen ────────────────────────────────────────────────────
    partySuccessBanner: {
        height: SW * 0.60, alignItems: 'center', justifyContent: 'center',
    },
    partySuccessEmoji: { fontSize: 100 },
    partyMetaCard: {
        marginHorizontal: SgateLayout.screenGutter, marginTop: -20,
        backgroundColor: SgateColors.card,
        borderRadius: 18, padding: 18,
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.10,
        shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        marginBottom: 16,
    },
    partyMetaTitle: {
        fontSize: 17, fontFamily: SgateFonts.extrabold, color: SgateColors.t1,
        textAlign: 'center', marginBottom: 4,
    },
    partyMetaDate: {
        fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2,
        textAlign: 'center', marginBottom: 6,
    },
    partyMetaVenue: {
        fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3,
        textAlign: 'center', lineHeight: 18, marginBottom: 10,
    },
    editInviteRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingTop: 8,
    },
    editInviteText: {
        fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep,
    },
    partyShareHint: {
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        textAlign: 'center', marginBottom: 14, lineHeight: 20,
    },
    partySection: { paddingHorizontal: SgateLayout.screenGutter, marginBottom: 10 },
    /**
     * Same shape as the footer's Done (PrimaryAction), in the secondary
     * treatment — two identical gold buttons would compete.
     */
    partyShareBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: SgateColors.goldPale, borderRadius: 16,
        height: 54,
    },
    partyShareBtnText: {
        fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep,
    },
    partyGuestListHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SgateLayout.screenGutter, paddingVertical: 14,
    },
    partyGuestListTitle: {
        fontSize: 17, fontFamily: SgateFonts.extrabold, color: SgateColors.t1,
    },
    partyAddGuestLink: {
        fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep,
    },
    inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    partyEmptyState: {
        backgroundColor: SgateColors.surface, borderRadius: 14,
        padding: 24, alignItems: 'center',
    },
    partyEmptyText: {
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        textAlign: 'center', lineHeight: 20,
    },
    partyAddForm: {
        backgroundColor: SgateColors.bg, borderRadius: 14,
        padding: 14, gap: 10, marginBottom: 12,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    partyAddInput: {
        backgroundColor: SgateColors.card, borderRadius: 10,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1,
    },
    partyGuestCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        paddingTop: 16, paddingBottom: 8,
    },
    partyGuestAvatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: SgateColors.violet,
        alignItems: 'center', justifyContent: 'center',
    },
    partyGuestAvatarText: {
        fontSize: 18, fontFamily: SgateFonts.bold, color: '#fff',
    },
    partyGuestName: {
        fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1,
        marginBottom: 8,
    },
    partyEntryCodeBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: SgateColors.bg, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: SgateColors.borderSoft,
    },
    partyEntryCodeLabel: {
        fontSize: 11, fontFamily: SgateFonts.medium, color: SgateColors.t4,
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
    },
    partyEntryCode: {
        fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1, letterSpacing: 2,
    },
    partyAddedByYou: {
        fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3,
    },
    partyGuestActions: {
        flexDirection: 'row', borderTopWidth: 1, borderTopColor: SgateColors.borderSoft,
        marginBottom: 12,
    },
    partyGuestAction: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12,
    },
    partyGuestActionDivider: {
        width: 1, backgroundColor: SgateColors.borderSoft,
    },
    partyGuestActionText: {
        fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2,
    },
});
