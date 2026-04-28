import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/services/api';

// Mock data for intercom directory
const MOCK_INTERCOM = [
    { id: '1', flat: 'A-101', name: 'Alok Pandey', phone: '+91 9876543210' },
    { id: '2', flat: 'A-102', name: 'Ravi Verma', phone: '+91 9876543211' },
    { id: '3', flat: 'B-201', name: 'Geeta Sharma', phone: '+91 9876543212' },
    { id: '4', flat: 'B-205', name: 'Vivek Singh', phone: '+91 9876543213' },
    { id: '5', flat: 'C-301', name: 'Raj Patel', phone: '+91 9876543214' },
    { id: '6', flat: 'Main Gate', name: 'Gate Security', phone: '+91 9000000001', isGuard: true },
];

export default function BroadcastAndIntercomScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'BROADCAST' | 'INTERCOM'>('BROADCAST');
    
    // Broadcast State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'ALL' | 'BLOCK_A' | 'BLOCK_B'>('ALL');
    const [isEmergency, setIsEmergency] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Intercom State
    const [searchQuery, setSearchQuery] = useState('');

    const handleBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Error', 'Please enter a title and message.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/admin/broadcast', { title, message, isEmergency, target });
            Alert.alert('Success', `Broadcast sent to ${target.replace('_', ' ')} successfully.`);
            setTitle('');
            setMessage('');
            setIsEmergency(false);
        } catch {
            Alert.alert('Error', 'Failed to send broadcast.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const filteredIntercom = MOCK_INTERCOM.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.flat.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderBroadcastTab = () => (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.formWrap}>
            <View style={styles.infoBox}>
                <MaterialCommunityIcons name="flash-outline" size={20} color={SgateColors.goldDeep} />
                <Text style={styles.infoText}>
                    Broadcasts instantly send Push Notifications directly to residents' mobile devices.
                </Text>
            </View>

            <Text style={styles.formLabel}>TARGET AUDIENCE</Text>
            <View style={styles.targetRow}>
                {['ALL', 'BLOCK_A', 'BLOCK_B'].map(t => (
                    <TouchableOpacity key={t} onPress={() => setTarget(t as any)}
                        style={[styles.targetChip, target === t && styles.targetChipActive]}>
                        <Text style={[styles.targetText, target === t && styles.targetTextActive]}>{t.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.formLabel}>TITLE *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Water supply interruption"
                placeholderTextColor={SgateColors.t4}
                value={title}
                onChangeText={setTitle}
            />

            <Text style={styles.formLabel}>MESSAGE *</Text>
            <TextInput
                style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
                placeholder="Type the broadcast message..."
                placeholderTextColor={SgateColors.t4}
                multiline
                value={message}
                onChangeText={setMessage}
            />

            <View style={styles.switchRow}>
                <View>
                    <Text style={styles.switchTitle}>Emergency Override</Text>
                    <Text style={styles.switchSub}>Bypass 'Do Not Disturb' settings</Text>
                </View>
                <Switch 
                    value={isEmergency} 
                    onValueChange={setIsEmergency}
                    trackColor={{ false: SgateColors.border, true: SgateColors.red + '60' }}
                    thumbColor={isEmergency ? SgateColors.red : SgateColors.surface}
                />
            </View>

            <TouchableOpacity 
                style={[styles.submitBtn, submitting && { opacity: 0.6 }, isEmergency && { backgroundColor: SgateColors.redBg }]}
                onPress={handleBroadcast}
                disabled={submitting}
                activeOpacity={0.8}
            >
                {submitting ? (
                    <ActivityIndicator color={isEmergency ? SgateColors.red : '#FFF'} />
                ) : (
                    <View style={styles.submitRow}>
                        <MaterialCommunityIcons name="send-outline" size={16} color={isEmergency ? SgateColors.red : '#FFF'} />
                        <Text style={[styles.submitText, isEmergency && { color: SgateColors.red }]}>Send Push Notification</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    const renderIntercomTab = () => (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.intercomWrap}>
            <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={18} color={SgateColors.t4} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Flat or Name..."
                    placeholderTextColor={SgateColors.t4}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredIntercom}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 40)}>
                        <View style={styles.contactRow}>
                            {item.isGuard ? (
                                <View style={[styles.contactAvatar, { backgroundColor: SgateColors.blueBg }]}>
                                    <MaterialCommunityIcons name="shield-outline" size={18} color={SgateColors.blue} />
                                </View>
                            ) : (
                                <Avatar name={item.name} size={42} />
                            )}
                            <View style={styles.contactInfo}>
                                <Text style={styles.contactName}>{item.name}</Text>
                                <Text style={styles.contactFlat}>{item.isGuard ? 'Security' : `Flat ${item.flat}`}</Text>
                            </View>
                            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.phone)}>
                                <MaterialCommunityIcons name="phone-outline" size={18} color={SgateColors.green} />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="account-cancel-outline" size={40} color={SgateColors.t4} />
                        <Text style={styles.emptyText}>No contacts found.</Text>
                    </View>
                }
            />
        </Animated.View>
    );

    return (
        <View style={styles.safe}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Communicate</Text>
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            <View style={styles.tabsWrap}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'BROADCAST' && styles.tabActive]}
                    onPress={() => { Haptics.selectionAsync(); setActiveTab('BROADCAST'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'BROADCAST' && styles.tabTextActive]}>Broadcast</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'INTERCOM' && styles.tabActive]}
                    onPress={() => { Haptics.selectionAsync(); setActiveTab('INTERCOM'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'INTERCOM' && styles.tabTextActive]}>Intercom</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'BROADCAST' ? renderBroadcastTab() : renderIntercomTab()}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    spacer: { height: 6 },

    tabsWrap: {
        flexDirection: 'row',
        backgroundColor: SgateColors.card,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: SgateColors.goldDeep },
    tabText: { fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.t3 },
    tabTextActive: { color: SgateColors.goldDeep },

    formWrap: { padding: 20 },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SgateColors.goldPale, padding: 14, borderRadius: 12, marginBottom: 20 },
    infoText: { flex: 1, fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.goldDeep, lineHeight: 18 },

    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8, marginTop: 4 },
    input: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, marginBottom: 16 },

    targetRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    targetChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: SgateColors.border, alignItems: 'center' },
    targetChipActive: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },
    targetText: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t3 },
    targetTextActive: { color: '#FFF' },

    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, marginTop: 8 },
    switchTitle: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    switchSub: { fontSize: 11, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 2 },

    submitBtn: { backgroundColor: SgateColors.black, borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
    submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    submitText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFF' },

    intercomWrap: { padding: 20, flex: 1 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 20 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    
    contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.card, padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: SgateColors.borderSoft },
    contactAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    contactInfo: { flex: 1, marginLeft: 12 },
    contactName: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    contactFlat: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 2 },
    callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: SgateColors.greenBg, alignItems: 'center', justifyContent: 'center' },

    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 12 },
});
