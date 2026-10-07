import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { AppAlert } from '@/components/ui/AppAlert';
import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

import { SheetShell } from '../SheetShell';
import { StepHeader } from '../parts/StepHeader';
import { PrimaryAction } from '../parts/PrimaryAction';

export type Guest = { name: string; phone: string };
type SelectedGuest = Guest & { key: string };
type Tab = 'contacts' | 'recent' | 'manual';

const TABS: { key: Tab; label: string }[] = [
    { key: 'contacts', label: 'Contacts' },
    { key: 'recent', label: 'Recent' },
    { key: 'manual', label: 'Add Manually' },
];

/** Normalise any phone format to a bare 10-digit number. */
export function cleanPhone(raw: string) {
    let p = (raw ?? '').replace(/\D/g, '');
    if (p.startsWith('0091') && p.length > 10) p = p.slice(4);
    else if (p.startsWith('91') && p.length > 10) p = p.slice(2);
    if (p.startsWith('0') && p.length > 10) p = p.slice(1);
    return p;
}

interface SelectGuestsStepProps {
    initialGuests?: Guest[];
    onBack: () => void;
    onNext: (guests: Guest[]) => void;
    bottomClearance: number;
}

/**
 * Pick guests from contacts, recents, or by typing them in.
 *
 * Uses `fill` height: this step is a list, and seeing more rows at once is the
 * whole point — the previous version sized itself to its content and ended up
 * showing four contacts on a tall phone.
 */
export function SelectGuestsStep({ initialGuests = [], onBack, onNext, bottomClearance }: SelectGuestsStepProps) {
    const [tab, setTab] = useState<Tab>('contacts');
    const [search, setSearch] = useState('');
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [loading, setLoading] = useState(false);

    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    const [selected, setSelected] = useState<SelectedGuest[]>(() =>
        initialGuests.map((guest, index) => ({
            ...guest,
            key: `initial:${cleanPhone(guest.phone)}:${index}`,
        })),
    );

    const loadContacts = useCallback(async () => {
        setLoading(true);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                AppAlert.show(
                    'Permission Required',
                    'Please allow S-Gate to access your contacts via your device settings to select guests easily.',
                    [
                        { text: 'CANCEL', style: 'cancel' },
                        { text: 'OPEN SETTINGS', style: 'default', onPress: () => Linking.openSettings() },
                    ],
                );
                return;
            }
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            });
            if (data.length) setContacts(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab === 'contacts' && contacts.length === 0) loadContacts();
    }, [tab, contacts.length, loadContacts]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return contacts.filter(contact => {
            const phone = cleanPhone(contact.phoneNumbers?.[0]?.number ?? '');
            if (!phone) return false;
            const name = contact.name?.trim() ?? '';
            return (name || phone).toLowerCase().includes(query);
        });
    }, [contacts, search]);

    const isSelected = useCallback((key: string) => selected.some(g => g.key === key), [selected]);

    const toggle = useCallback((key: string, name: string, phone: string) => {
        const normalised = cleanPhone(phone);
        if (!normalised) return;
        setSelected(prev => prev.some(g => g.key === key)
            ? prev.filter(g => g.key !== key)
            : [...prev, { key, name: name.trim() || normalised, phone: normalised }]);
    }, []);

    const addManual = () => {
        if (!manualName.trim() || !manualPhone.trim()) {
            AppAlert.show('Required', 'Enter guest name and mobile number.');
            return;
        }
        toggle(`manual:${cleanPhone(manualPhone)}`, manualName, manualPhone);
        setManualName('');
        setManualPhone('');
    };

    const handleNext = () => {
        if (selected.length === 0) {
            AppAlert.show('Required', 'Select at least one guest.');
            return;
        }
        onNext(selected.map(({ name, phone }) => ({ name, phone })));
    };

    return (
        <SheetShell
            height="fill"
            bottomClearance={bottomClearance}
            header={<StepHeader title="Select Guests" onBack={onBack} />}
            subHeader={
                <View style={S.tabBar}>
                    {TABS.map(({ key, label }) => (
                        <TouchableOpacity key={key} style={S.tabItem} onPress={() => setTab(key)} activeOpacity={0.8}>
                            <Text style={[S.tabLabel, tab === key && S.tabLabelActive]}>{label}</Text>
                            {tab === key ? <View style={S.tabLine} /> : null}
                        </TouchableOpacity>
                    ))}
                </View>
            }
            contentContainerStyle={S.body}
            footer={
                <PrimaryAction
                    label={selected.length > 0 ? `Next  ·  ${selected.length} selected` : 'Next'}
                    onPress={handleNext}
                />
            }
        >
            {tab === 'contacts' && (
                <>
                    <View style={S.searchBox}>
                        <Feather name="search" size={18} color={SgateColors.t3} />
                        <TextInput
                            style={S.searchInput}
                            placeholder="Search from contacts"
                            placeholderTextColor={SgateColors.t4}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
                                <Feather name="x" size={16} color={SgateColors.t3} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <View style={S.loading}><ActivityIndicator color={SgateColors.gold} /></View>
                    ) : filtered.length === 0 ? (
                        <Text style={S.empty}>
                            {search ? 'No contacts match that search' : 'No contacts available'}
                        </Text>
                    ) : (
                        filtered.map((contact, index) => {
                            const phone = cleanPhone(contact.phoneNumbers?.[0]?.number ?? '');
                            const key = `contact:${index}:${phone}`;
                            const name = contact.name?.trim() || phone;
                            const checked = isSelected(key);
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={S.row}
                                    onPress={() => toggle(key, name, phone)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[S.avatar, checked && S.avatarOn]}>
                                        {checked
                                            ? <Feather name="check" size={16} color={SgateColors.card} />
                                            : <Text style={S.avatarText}>{name.charAt(0).toUpperCase()}</Text>}
                                    </View>
                                    <View style={S.rowText}>
                                        <Text style={S.rowName} numberOfLines={1}>{name}</Text>
                                        <Text style={S.rowPhone} numberOfLines={1}>{phone}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </>
            )}

            {tab === 'recent' && <Text style={S.empty}>No recent contacts</Text>}

            {tab === 'manual' && (
                <>
                    <Text style={S.label}>GUEST NAME</Text>
                    <TextInput
                        style={S.input}
                        placeholder="Enter guest name"
                        placeholderTextColor={SgateColors.t4}
                        value={manualName}
                        onChangeText={setManualName}
                    />
                    <Text style={S.label}>MOBILE NUMBER</Text>
                    <TextInput
                        style={S.input}
                        placeholder="Enter mobile number"
                        placeholderTextColor={SgateColors.t4}
                        value={manualPhone}
                        onChangeText={setManualPhone}
                        keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                        style={[S.addBtn, (!manualName || !manualPhone) && S.addBtnOff]}
                        onPress={addManual}
                        activeOpacity={0.8}
                    >
                        <Text style={S.addBtnText}>Add Guest</Text>
                    </TouchableOpacity>
                </>
            )}

            {selected.length > 0 && tab !== 'contacts' && (
                <View style={S.selectedWrap}>
                    <Text style={S.label}>SELECTED GUESTS</Text>
                    {selected.map(guest => (
                        <View key={guest.key} style={S.pill}>
                            <Text style={S.pillText} numberOfLines={1}>{guest.name}</Text>
                            <TouchableOpacity onPress={() => toggle(guest.key, guest.name, guest.phone)} hitSlop={10}>
                                <Feather name="x" size={16} color={SgateColors.t3} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </SheetShell>
    );
}

const S = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: SgateLayout.screenGutter,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabLabel: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    tabLabelActive: { color: SgateColors.t1, fontFamily: SgateFonts.bold },
    tabLine: {
        position: 'absolute',
        bottom: -1,
        height: 2,
        left: 12,
        right: 12,
        borderRadius: 2,
        backgroundColor: SgateColors.gold,
    },

    body: { paddingHorizontal: SgateLayout.screenGutter, paddingTop: 12, paddingBottom: 8 },

    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 46,
        paddingHorizontal: 12,
        marginBottom: 6,
        borderRadius: SgateLayout.controlHeight / 4,
        backgroundColor: SgateColors.surface,
    },
    searchInput: { flex: 1, fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t1 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: SgateColors.surface,
    },
    avatarOn: { backgroundColor: SgateColors.green },
    avatarText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    rowText: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    rowPhone: { marginTop: 1, fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    loading: { paddingVertical: 28, alignItems: 'center' },
    empty: {
        paddingVertical: 28,
        textAlign: 'center',
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    label: {
        marginTop: 14,
        marginBottom: 6,
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.6,
        color: SgateColors.t3,
    },
    input: {
        height: SgateLayout.controlHeight,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SgateColors.border,
        backgroundColor: SgateColors.card,
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
    },
    addBtn: {
        marginTop: 16,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SgateColors.goldPale,
    },
    addBtnOff: { opacity: 0.5 },
    addBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },

    selectedWrap: { marginTop: 10 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: SgateColors.surface,
    },
    pillText: { flex: 1, fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
});
