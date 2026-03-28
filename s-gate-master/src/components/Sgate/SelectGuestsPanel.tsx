import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

type Tab = 'contacts' | 'recent' | 'manual';

export function SelectGuestsPanel({ 
    initialGuests = [],
    scrollRef,
    onNext, 
    onBack 
}: {
    initialGuests?: {name: string, phone: string}[];
    scrollRef?: any;
    onNext?: (guests: {name: string, phone: string}[]) => void;
    onBack: () => void;
}) {
    const [activeTab, setActiveTab] = useState<Tab>('contacts');
    
    // Contacts
    const [search, setSearch] = useState('');
    const [allContacts, setAllContacts] = useState<Contacts.Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    
    // Manual
    const [guestName, setGuestName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');

    // Selection
    const [selectedGuests, setSelectedGuests] = useState<{name: string, phone: string}[]>(initialGuests);

    useEffect(() => {
        if (activeTab === 'contacts' && allContacts.length === 0) {
            loadContacts();
        }
    }, [activeTab]);

    const loadContacts = async () => {
        setLoadingContacts(true);
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            });
            if (data.length > 0) {
                setAllContacts(data);
            }
        } else {
            Alert.alert("Permission", "Allow mygate to access your contacts via device settings?");
        }
        setLoadingContacts(false);
    };

    const filteredContacts = allContacts.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    /** Normalise any phone format → 10-digit number */
    const cleanPhone = (raw: string) => {
        let p = raw.replace(/[\s\-()]/g, '');
        p = p.replace(/^(\+91|0091|91)/, '');
        p = p.replace(/^0/, '');
        return p;
    };

    const toggleSelection = (name: string, phone: string) => {
        const normalised = cleanPhone(phone);
        const exists = selectedGuests.find(g => g.phone === normalised);
        if (exists) {
            setSelectedGuests(prev => prev.filter(g => g.phone !== normalised));
        } else {
            setSelectedGuests(prev => [...prev, { name, phone: normalised }]);
        }
    };

    const handleAddManual = () => {
        if (!guestName || !mobileNumber) {
            Alert.alert("Required", "Enter name and mobile number.");
            return;
        }
        toggleSelection(guestName, mobileNumber);
        setGuestName('');
        setMobileNumber('');
    };

    const handleNext = () => {
        if (selectedGuests.length === 0) {
            Alert.alert("Required", "Select at least one guest.");
            return;
        }
        onNext?.(selectedGuests);
    };

    return (
        <View style={S.container}>
            <View style={S.headerRow}>
                <TouchableOpacity onPress={onBack} style={S.backBtn} hitSlop={{top:12,bottom:12,left:12,right:12}}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t2} />
                </TouchableOpacity>
                <Text style={S.headerTitle}>Select Guests</Text>
            </View>

            <View style={S.tabBar}>
                {(['contacts', 'recent', 'manual'] as Tab[]).map((t) => {
                    const isActive = activeTab === t;
                    const label = t === 'contacts' ? 'Contacts' : t === 'recent' ? 'Recent' : 'Add Manually';
                    return (
                        <TouchableOpacity 
                            key={t} 
                            style={S.tabItem}
                            onPress={() => setActiveTab(t)}
                        >
                            <Text style={[S.tabLabel, isActive && S.tabLabelActive]}>{label}</Text>
                            {isActive && <View style={S.tabLine} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={S.content}>
                {activeTab === 'contacts' && (
                    <View style={S.tabFlex}>
                        <View style={S.searchBox}>
                            <Feather name="search" size={20} color={SgateColors.t3} style={{marginRight: 8}} />
                            <TextInput 
                                style={S.searchInput}
                                placeholder="Search from contacts"
                                placeholderTextColor={SgateColors.t4}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                        
                        {loadingContacts ? (
                            <ActivityIndicator color={SgateColors.goldDeep} style={{marginTop: 50}} />
                        ) : filteredContacts.length === 0 ? (
                            <View style={S.emptyWrap}>
                                <Text style={S.emptyText}>No contacts found!</Text>
                            </View>
                        ) : (
                            <FlatList
                                ref={scrollRef}
                                data={filteredContacts}
                                keyExtractor={i => (i as any).id || Math.random().toString()}
                                showsVerticalScrollIndicator={false}
                                renderItem={({item}) => {
                                    const phone = item.phoneNumbers?.[0]?.number || '';
                                    const isSelected = selectedGuests.some(g => g.phone === cleanPhone(phone));
                                    return (
                                        <TouchableOpacity style={S.contactRow} onPress={() => toggleSelection(item.name || 'Unknown', phone)} activeOpacity={0.7}>
                                            <View style={S.contactAvatar}>
                                                <Text style={S.contactInitial}>{item.name?.[0]?.toUpperCase()}</Text>
                                            </View>
                                            <View style={S.contactInfo}>
                                                <Text style={S.contactName}>{item.name}</Text>
                                            </View>
                                            {isSelected && <Feather name="check" size={20} color={SgateColors.t1} />}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                )}

                {activeTab === 'recent' && (
                    <View style={S.emptyWrap}>
                        <Text style={S.emptyText}>No recent contacts</Text>
                    </View>
                )}

                {activeTab === 'manual' && (
                    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={S.tabFlex}>
                        <Text style={S.inputLabel}>GUEST NAME</Text>
                        <TextInput 
                            style={S.manualInput}
                            placeholder="Enter guest name"
                            value={guestName}
                            onChangeText={setGuestName}
                            placeholderTextColor={SgateColors.t4}
                        />

                        <Text style={S.inputLabel}>MOBILE NUMBER</Text>
                        <TextInput 
                            style={S.manualInput}
                            placeholder="Enter mobile number"
                            value={mobileNumber}
                            onChangeText={setMobileNumber}
                            keyboardType="phone-pad"
                            placeholderTextColor={SgateColors.t4}
                        />

                        <TouchableOpacity style={[S.addBtn, (!guestName || !mobileNumber) && S.addBtnDis]} onPress={handleAddManual}>
                            <Text style={S.addBtnText}>Add Guest</Text>
                        </TouchableOpacity>

                        {selectedGuests.length > 0 && (
                            <View style={{marginTop: 30}}>
                                <Text style={[S.inputLabel, {marginBottom: 12}]}>SELECTED GUESTS</Text>
                                {selectedGuests.map((g, i) => (
                                    <View key={i} style={S.selectedPill}>
                                        <Text style={S.pillText}>{g.name}</Text>
                                        <TouchableOpacity onPress={() => toggleSelection(g.name, g.phone)}>
                                            <Feather name="x" size={16} color={SgateColors.t3} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            <View style={S.bottomWrap}>
                <TouchableOpacity style={S.nextBtn} onPress={handleNext}>
                    <Text style={S.nextText}>Next {'>'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const S = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SgateColors.card,
    },
    headerRow: { 
        flexDirection: 'row', alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingBottom: 16,
    },
    backBtn: { paddingRight: 16 },
    headerTitle: { 
        fontSize: 18, fontFamily: SgateFonts.bold, 
        color: SgateColors.t1 
    },
    
    tabBar: { 
        flexDirection: 'row', 
        borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
        paddingHorizontal: 20
    },
    tabItem: { 
        flex: 1, alignItems: 'center', paddingVertical: 12 
    },
    tabLabel: { 
        fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t3 
    },
    tabLabelActive: { 
        color: SgateColors.t1, fontFamily: SgateFonts.semibold 
    },
    tabLine: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, borderRadius: 1, backgroundColor: SgateColors.gold,
    },
    
    content: {
        flex: 1,
        paddingTop: 16
    },
    tabFlex: { flex: 1, paddingHorizontal: 20 },
    
    searchBox: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: SgateColors.bg, 
        borderRadius: 12, borderWidth: 1, borderColor: SgateColors.borderSoft,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 
    },
    searchInput: { 
        flex: 1, fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t1 
    },
    emptyWrap: { 
        flex: 1, justifyContent: 'center', alignItems: 'center'
    },
    emptyText: { 
        fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t3 
    },
    
    contactRow: { 
        flexDirection: 'row', alignItems: 'center', 
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft 
    },
    contactAvatar: { 
        width: 44, height: 44, borderRadius: 22, 
        backgroundColor: SgateColors.surface, 
        alignItems: 'center', justifyContent: 'center', marginRight: 14 
    },
    contactInitial: { 
        fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t2 
    },
    contactInfo: { flex: 1 },
    contactName: { 
        fontSize: 16, fontFamily: SgateFonts.medium, color: SgateColors.t1 
    },
    
    inputLabel: { 
        fontSize: 11, fontFamily: SgateFonts.bold, 
        color: SgateColors.t3, letterSpacing: 0.8,
        textTransform: 'uppercase', marginBottom: 8 
    },
    manualInput: { 
        borderWidth: 1, borderColor: SgateColors.borderSoft, borderRadius: 12, 
        padding: 14, fontSize: 15, fontFamily: SgateFonts.regular, 
        marginBottom: 20, backgroundColor: SgateColors.bg
    },
    addBtn: { 
        backgroundColor: SgateColors.surface, borderRadius: 12, paddingVertical: 12, 
        alignItems: 'center', borderWidth: 1, borderColor: SgateColors.borderSoft
    },
    addBtnDis: { opacity: 0.5 },
    addBtnText: { color: SgateColors.t2, fontFamily: SgateFonts.semibold, fontSize: 15 },
    
    selectedPill: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
        backgroundColor: SgateColors.bg, padding: 14, borderRadius: 12, 
        borderWidth: 1, borderColor: SgateColors.borderSoft,
        marginBottom: 8
    },
    pillText: { color: SgateColors.t1, fontFamily: SgateFonts.medium, fontSize: 15 },
    
    bottomWrap: { 
        padding: 20, paddingTop: 12
    },
    nextBtn: { 
        backgroundColor: SgateColors.gold, borderRadius: 14, 
        paddingVertical: 16, alignItems: 'center' 
    },
    nextText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.black }
});
