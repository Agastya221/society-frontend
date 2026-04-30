import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/services/api';
import { AppAlert } from '@/components/ui/AppAlert';

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
            AppAlert.show('Missing Information', 'Please enter a title and message.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/admin/broadcast', { title, message, isEmergency, target });
            AppAlert.show('Broadcast Sent ✓', `Push notification sent to ${target.replace('_', ' ')}.`);
            setTitle('');
            setMessage('');
            setIsEmergency(false);
        } catch {
            AppAlert.show('Error', 'Failed to send broadcast. Please try again.');
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
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.formWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <Animated.View entering={FadeInDown.duration(300)}>
                {/* Info Banner */}
                <View style={styles.infoBox}>
                    <Feather name="info" size={18} color="#FACC15" />
                    <Text style={styles.infoText}>
                        Broadcast sends push notifications to residents instantly.
                    </Text>
                </View>

                {/* Target Audience */}
                <Text style={styles.formLabel}>
                    Target Audience <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.targetRow}>
                    {['ALL', 'BLOCK_A', 'BLOCK_B'].map(t => (
                        <TouchableOpacity key={t} onPress={() => { Haptics.selectionAsync(); setTarget(t as any); }}
                            style={[styles.targetChip, target === t && styles.targetChipActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.targetText, target === t && styles.targetTextActive]}>
                                {t.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title */}
                <Text style={styles.formLabel}>
                    Title <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Water supply interruption"
                    placeholderTextColor="#AAA"
                    value={title}
                    onChangeText={setTitle}
                />

                {/* Message */}
                <Text style={styles.formLabel}>
                    Message <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Type the broadcast message..."
                    placeholderTextColor="#AAA"
                    multiline
                    value={message}
                    onChangeText={setMessage}
                />

                {/* Emergency Override */}
                <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.switchTitle}>Emergency Override</Text>
                        <Text style={styles.switchSub}>Bypass Do Not Disturb settings</Text>
                    </View>
                    <Switch 
                        value={isEmergency} 
                        onValueChange={setIsEmergency}
                        trackColor={{ false: '#E5E7EB', true: '#FACC15' }}
                        thumbColor="#FFF"
                    />
                </View>

                {/* Submit */}
                <TouchableOpacity 
                    style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleBroadcast}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator color={SgateColors.t1} />
                    ) : (
                        <View style={styles.submitRow}>
                            <Feather name="send" size={18} color={SgateColors.t1} />
                            <Text style={styles.submitText}>Send Notification</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
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
            {/* Header + Tabs (unified block) */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Communicate</Text>
                </View>

                <View style={styles.tabsWrap}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'BROADCAST' && styles.tabActive]}
                        onPress={() => { Haptics.selectionAsync(); setActiveTab('BROADCAST'); }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'BROADCAST' && styles.tabTextActive]}>Broadcast</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'INTERCOM' && styles.tabActive]}
                        onPress={() => { Haptics.selectionAsync(); setActiveTab('INTERCOM'); }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'INTERCOM' && styles.tabTextActive]}>Intercom</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'BROADCAST' ? renderBroadcastTab() : renderIntercomTab()}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    // ── Header + Tabs (unified block) ────────────────────────────
    headerWrapper: {
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginLeft: 12,
        flex: 1,
    },

    // ── Tabs ─────────────────────────────────────────────────────
    tabsWrap: {
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: '#FACC15' },
    tabText: { fontSize: 14, fontFamily: SgateFonts.medium, color: '#888' },
    tabTextActive: { fontFamily: SgateFonts.bold, color: '#111' },

    // ── Broadcast Form ───────────────────────────────────────────
    formWrap: { padding: 20, paddingBottom: 40 },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: '#555',
        lineHeight: 20,
    },

    formLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: '#666',
        marginBottom: 8,
    },
    requiredStar: { color: '#EF4444' },

    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        marginBottom: 16,
    },
    textarea: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingTop: 14,
    },

    // ── Target Audience Chips ────────────────────────────────────
    targetRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    targetChip: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetChipActive: {
        backgroundColor: '#FACC15',
    },
    targetText: { fontSize: 13, fontFamily: SgateFonts.medium, color: '#777' },
    targetTextActive: { fontFamily: SgateFonts.semibold, color: '#111' },

    // ── Emergency Toggle ────────────────────────────────────────
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 24,
    },
    switchTitle: { fontSize: 15, fontFamily: SgateFonts.medium, color: '#111' },
    switchSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: '#777', marginTop: 2 },

    // ── Primary Button ──────────────────────────────────────────
    submitBtn: {
        backgroundColor: '#FACC15',
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    submitText: { fontSize: 16, fontFamily: SgateFonts.bold, color: '#111' },

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
