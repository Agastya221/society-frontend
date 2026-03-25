import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { createInvitePass } from '@/services/gate.service';

type Tab = 'contacts' | 'recent' | 'manual';

export default function SelectGuestsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // The pre-approval form state passed as stringified JSON:
    const passConfig = params.data ? JSON.parse(params.data as string) : {};

    const [activeTab, setActiveTab] = useState<Tab>('contacts');

    // Contacts
    const [search, setSearch] = useState('');
    const [allContacts, setAllContacts] = useState<Contacts.Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    
    // Manual tab
    const [guestName, setGuestName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');

    // Selected contacts
    const [selectedGuests, setSelectedGuests] = useState<{name: string, phone: string}[]>([]);

    useEffect(() => {
        if (activeTab === 'contacts') {
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
            // Permission denied
            Alert.alert("Permission Denied", "Allow mygate to access your contacts via device settings.");
        }
        setLoadingContacts(false);
    };

    // Filter contacts based on search
    const filteredContacts = allContacts.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelection = (name: string, phone: string) => {
        const exists = selectedGuests.find(g => g.phone === phone);
        if (exists) {
            setSelectedGuests(prev => prev.filter(g => g.phone !== phone));
        } else {
            setSelectedGuests(prev => [...prev, { name, phone }]);
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

    const handleNext = async () => {
        if (selectedGuests.length === 0) {
            Alert.alert("Required", "Select at least one guest.");
            return;
        }

        try {
            // In a real scenario, you could batch these or use a loop.
            // For now, let's create a pass for each selected guest:
            for (const g of selectedGuests) {
                await createInvitePass({
                    ...passConfig,
                    visitorName: g.name,
                    visitorPhone: g.phone
                });
            }
            // Navigate back 
            router.back(); 
        } catch (err: any) {
             Alert.alert('Error', err?.response?.data?.message || 'Failed to create pass.');
        }
    };

    const renderTabs = () => (
        <View style={styles.tabBar}>
            {(['contacts', 'recent', 'manual'] as Tab[]).map((t) => {
                const isActive = activeTab === t;
                const label = t === 'contacts' ? 'Contacts' : t === 'recent' ? 'Recent' : 'Add Manually';
                return (
                    <TouchableOpacity 
                        key={t} 
                        style={[styles.tabItem, isActive && styles.tabItemActive]}
                        onPress={() => setActiveTab(t)}
                    >
                        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                    <Feather name="arrow-left" size={24} color={SgateColors.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Guests</Text>
            </View>

            {renderTabs()}

            {activeTab === 'contacts' && (
                <View style={styles.tabContent}>
                    <View style={styles.searchBox}>
                        <Feather name="search" size={20} color={SgateColors.t3} style={{marginRight: 8}} />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search from contacts"
                            placeholderTextColor={SgateColors.t4}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    
                    {loadingContacts ? (
                        <ActivityIndicator color="#003333" style={{marginTop: 50}} />
                    ) : filteredContacts.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>No contacts found!</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            keyExtractor={i => (i as any).id || Math.random().toString()}
                            renderItem={({item}) => {
                                const phone = item.phoneNumbers?.[0]?.number || '';
                                const isSelected = selectedGuests.some(g => g.phone === phone);
                                return (
                                    <TouchableOpacity style={styles.contactRow} onPress={() => toggleSelection(item.name || 'Unknown', phone)}>
                                        <View style={styles.contactAvatar}>
                                            <Text style={styles.contactInitial}>{item.name?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.contactInfo}>
                                            <Text style={styles.contactName}>{item.name}</Text>
                                        </View>
                                        {isSelected && <Feather name="check-circle" size={22} color="#003333" />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>
            )}

            {activeTab === 'recent' && (
                <View style={styles.centeredContent}>
                    <Text style={styles.emptyText}>No recent contacts</Text>
                </View>
            )}

            {activeTab === 'manual' && (
                <View style={styles.manualContent}>
                    <Text style={styles.inputLabel}>Guest Name</Text>
                    <TextInput 
                        style={styles.manualInput}
                        placeholder="Enter guest name"
                        value={guestName}
                        onChangeText={setGuestName}
                    />

                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <TextInput 
                        style={styles.manualInput}
                        placeholder="Enter mobile number"
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                        keyboardType="phone-pad"
                    />

                    <TouchableOpacity style={styles.addBtn} onPress={handleAddManual}>
                        <Text style={styles.addBtnText}>Add Guest</Text>
                    </TouchableOpacity>

                    {selectedGuests.length > 0 && (
                        <View style={{marginTop: 30}}>
                            <Text style={styles.inputLabel}>Selected Guests:</Text>
                            {selectedGuests.map((g, i) => (
                                <View key={i} style={styles.selectedPill}>
                                    <Text style={{color: '#fff'}}>{g.name} ({g.phone})</Text>
                                    <TouchableOpacity onPress={() => toggleSelection(g.name, g.phone)}>
                                        <Feather name="x" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            <View style={styles.bottomWrap}>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <Text style={styles.nextText}>Next</Text>
                    <Feather name="chevron-right" size={20} color={SgateColors.black} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff' },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.black, marginLeft: 15 },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabItemActive: { borderBottomWidth: 3, borderBottomColor: '#003333' },
    tabLabel: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    tabLabelActive: { color: '#003333', fontFamily: SgateFonts.bold },
    tabContent: { flex: 1, padding: 20, backgroundColor: '#F9F9F9' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEEEEE', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.black },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
    emptyText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t2 },
    contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
    contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAEAEA', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    contactInitial: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.black },
    contactPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    manualContent: { flex: 1, padding: 20, backgroundColor: '#fff' },
    inputLabel: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginBottom: 8 },
    manualInput: { borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 14, fontSize: 15, fontFamily: SgateFonts.regular, marginBottom: 20 },
    addBtn: { backgroundColor: '#003333', borderRadius: 8, paddingVertical: 14, alignItems: 'center', width: 140 },
    addBtnText: { color: '#fff', fontFamily: SgateFonts.bold, fontSize: 14 },
    selectedPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#003333', padding: 10, borderRadius: 8, marginTop: 8 },
    bottomWrap: { padding: 20, paddingBottom: 30, backgroundColor: '#F9F9F9' },
    nextBtn: { backgroundColor: '#FFCC00', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    nextText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.black, marginRight: 4 }
});
