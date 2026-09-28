import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

import { SheetShell } from '../SheetShell';
import { PrimaryAction } from '../parts/PrimaryAction';
import { StepHeader } from '../parts/StepHeader';
import { cleanPhone, type Guest } from './SelectGuestsStep';

export type GuestEntry = Guest & { id: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWhen(iso: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const clock = `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} | ${clock}`;
}

interface ManageGuestsStepProps {
    validFrom: string;
    validUntil: string;
    guests: GuestEntry[];
    onChange: (guests: GuestEntry[]) => void;
    onBack: () => void;
    onAddMore: () => void;
    onSubmit: () => void;
    submitting?: boolean;
    bottomClearance: number;
}

/**
 * Review the guest list before creating the invite.
 *
 * `fill` height with the action in SheetShell's fixed footer: the list grows
 * inside the scrolling body, so adding guests can never push "Create Invite"
 * out of reach — the bug in the previous sheet, where the button slid behind
 * the tab bar once the list got long.
 */
export function ManageGuestsStep({
    validFrom,
    validUntil,
    guests,
    onChange,
    onBack,
    onAddMore,
    onSubmit,
    submitting = false,
    bottomClearance,
}: ManageGuestsStepProps) {
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const phoneRef = useRef<TextInput>(null);

    /**
     * The add form sits under the list, so with a long list it opens below the
     * fold, and with the keyboard up only the focused field was scrolled into
     * view — the phone field and Add stayed hidden behind the footer. Scroll to
     * the whole form once the sheet has settled above the keyboard.
     */
    const revealForm = () => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    };

    // Switching name → phone swaps the keyboard (text → number pad), which
    // Android reports as hide + show; the sheet re-settles, so reveal again.
    useEffect(() => {
        if (!adding) return;
        const sub = Keyboard.addListener('keyboardDidShow', revealForm);
        return () => sub.remove();
    }, [adding]);

    const remove = (id: string) => onChange(guests.filter(g => g.id !== id));

    const add = () => {
        const normalised = cleanPhone(phone);
        if (!name.trim() || !normalised) {
            AppAlert.show('Required', 'Enter a name and mobile number.');
            return;
        }
        onChange([...guests, { id: `manual:${normalised}:${Date.now()}`, name: name.trim(), phone: normalised }]);
        setName('');
        setPhone('');
        setAdding(false);
    };

    const submit = () => {
        if (guests.length === 0) {
            AppAlert.show('Error', 'Add at least one guest.');
            return;
        }
        onSubmit();
    };

    return (
        <SheetShell
            height="fill"
            bottomClearance={bottomClearance}
            scrollRef={scrollRef}
            header={<StepHeader title="Manage Guests" onBack={onBack} />}
            subHeader={
                <View style={S.when}>
                    <Feather name="calendar" size={13} color={SgateColors.goldDeep} />
                    <Text style={S.whenText} numberOfLines={1}>
                        {formatWhen(validFrom)}  →  {formatWhen(validUntil)}
                    </Text>
                </View>
            }
            contentContainerStyle={S.body}
            footer={
                <PrimaryAction
                    label={guests.length > 1 ? `Create ${guests.length} Invites` : 'Create Invite'}
                    onPress={submit}
                    loading={submitting}
                />
            }
        >
            <Text style={S.sectionLabel}>
                GUEST LIST{guests.length > 0 ? `  ·  ${guests.length}` : ''}
            </Text>

            {guests.length === 0 ? (
                <Text style={S.empty}>No guests added yet</Text>
            ) : (
                guests.map(guest => (
                    <View key={guest.id} style={S.row}>
                        <View style={S.rowText}>
                            <Text style={S.name} numberOfLines={1}>{guest.name}</Text>
                            <Text style={S.phone} numberOfLines={1}>{guest.phone}</Text>
                        </View>
                        <TouchableOpacity
                            style={S.removeBtn}
                            onPress={() => remove(guest.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${guest.name}`}
                        >
                            <Feather name="trash-2" size={15} color={SgateColors.red} />
                        </TouchableOpacity>
                    </View>
                ))
            )}

            {adding ? (
                <View style={S.addForm}>
                    <TextInput
                        style={S.input}
                        placeholder="Guest name"
                        placeholderTextColor={SgateColors.t4}
                        value={name}
                        onChangeText={setName}
                        autoFocus
                        onFocus={revealForm}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => phoneRef.current?.focus()}
                    />
                    <TextInput
                        ref={phoneRef}
                        style={S.input}
                        placeholder="Mobile number"
                        placeholderTextColor={SgateColors.t4}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        onFocus={revealForm}
                        returnKeyType="done"
                        onSubmitEditing={add}
                    />
                    <View style={S.addRow}>
                        <TouchableOpacity style={S.ghostBtn} onPress={() => setAdding(false)} activeOpacity={0.8}>
                            <Text style={S.ghostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={S.addBtn} onPress={add} activeOpacity={0.8}>
                            <Text style={S.addText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={S.actions}>
                    <TouchableOpacity style={S.link} onPress={() => setAdding(true)} activeOpacity={0.8}>
                        <Feather name="plus-circle" size={17} color={SgateColors.goldDeep} />
                        <Text style={S.linkText}>Add Guest</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.link} onPress={onAddMore} activeOpacity={0.8}>
                        <Feather name="users" size={16} color={SgateColors.goldDeep} />
                        <Text style={S.linkText}>From contacts</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SheetShell>
    );
}

const S = StyleSheet.create({
    when: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: SgateLayout.screenGutter,
        paddingVertical: 10,
        backgroundColor: SgateColors.goldPale,
    },
    whenText: { flex: 1, fontSize: 12.5, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },

    body: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 14, paddingBottom: 8 },

    sectionLabel: {
        marginBottom: 6,
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.6,
        color: SgateColors.t3,
    },
    empty: {
        paddingVertical: 22,
        textAlign: 'center',
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    rowText: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    phone: { marginTop: 1, fontSize: 12.5, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    removeBtn: {
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: SgateColors.redBg,
    },

    actions: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 14 },
    link: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    linkText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },

    addForm: { paddingTop: 14, gap: 10 },
    input: {
        height: SgateLayout.controlHeight,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SgateColors.border,
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
    },
    addRow: { flexDirection: 'row', gap: 10 },
    ghostBtn: {
        flex: 1, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: SgateColors.surface,
    },
    ghostText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    addBtn: {
        flex: 1, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: SgateColors.goldPale,
    },
    addText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
});
