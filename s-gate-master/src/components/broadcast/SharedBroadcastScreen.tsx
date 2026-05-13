import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function SharedBroadcastScreen({ isTab = false }: { isTab?: boolean }) {
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
                    <MaterialCommunityIcons name="information-outline" size={18} color={SgateColors.goldDeep} />
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
                    placeholderTextColor={SgateColors.t4}
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
                        trackColor={{ false: SgateColors.border, true: SgateColors.gold }}
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
                            <MaterialCommunityIcons name="send" size={18} color={SgateColors.t1} />
                            <Text style={styles.submitText}>Send Notification</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );

    const renderIntercomTab = () => (
        <View style={styles.intercomWrap}>
            {/* Search */}
            <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={16} color={SgateColors.t3} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or flat"
                    placeholderTextColor={SgateColors.t4}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <MaterialCommunityIcons name="close" size={16} color={SgateColors.t3} />
                    </TouchableOpacity>
                )}
            </View>

            {/* List */}
            <FlatList
                data={filteredIntercom}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
                        <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
                            <Avatar name={item.name} size={44} color={item.isGuard ? SgateColors.blue : SgateColors.gold} />
                            <View style={styles.contactMid}>
                                <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                                <View style={styles.contactMeta}>
                                    <MaterialCommunityIcons name={item.isGuard ? 'shield-outline' : 'home-outline'} size={12} color={SgateColors.t3} />
                                    <Text style={styles.contactFlat}>
                                        {item.isGuard ? 'Security' : `Flat ${item.flat}`}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.callBtn}
                                onPress={() => handleCall(item.phone)}
                                activeOpacity={0.6}
                            >
                                <MaterialCommunityIcons name="phone" size={16} color={SgateColors.green} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIcon}>
                            <MaterialCommunityIcons name="account-group-outline" size={28} color={SgateColors.t3} />
                        </View>
                        <Text style={styles.emptyTitle}>No residents found</Text>
                        <Text style={styles.emptySub}>Try searching a different name or flat</Text>
                    </View>
                }
            />
        </View>
    );

    return (
        <View style={styles.safe}>
            {/* Header */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 10) }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitleMain, isTab && { marginLeft: 0 }]}>Alerts</Text>
                </View>

                {/* Segmented Control */}
                <View style={styles.tabWrapper}>
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={[styles.segment, activeTab === 'BROADCAST' && styles.segmentActive]}
                            onPress={() => { Haptics.selectionAsync(); setActiveTab('BROADCAST'); }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, activeTab === 'BROADCAST' && styles.segmentTextActive]}>Broadcast</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segment, activeTab === 'INTERCOM' && styles.segmentActive]}
                            onPress={() => { Haptics.selectionAsync(); setActiveTab('INTERCOM'); }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.segmentText, activeTab === 'INTERCOM' && styles.segmentTextActive]}>Intercom</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {activeTab === 'BROADCAST' ? renderBroadcastTab() : renderIntercomTab()}
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },

    // ── Header + Tabs (unified block) ────────────────────────────
    headerWrapper: {
        backgroundColor: '#FFF',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerIconBtn: {
        width: 32,
        height: 32,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitleMain: {
        flex: 1,
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginLeft: 12,
    },

    // ── Tabs ─────────────────────────────────────────────────────
    tabWrapper: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentActive: {
        backgroundColor: SgateColors.gold,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    segmentTextActive: {
        color: SgateColors.t1,
        fontFamily: SgateFonts.bold,
    },

    // ── Broadcast Form ───────────────────────────────────────────
    formWrap: { padding: 20, paddingTop: 12, paddingBottom: 40 },

    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        lineHeight: 20,
    },

    formLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
        marginBottom: 8,
    },
    requiredStar: { color: SgateColors.red },

    input: {
        backgroundColor: SgateColors.card,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
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
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetChipActive: {
        backgroundColor: SgateColors.gold,
    },
    targetText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    targetTextActive: { fontFamily: SgateFonts.semibold, color: SgateColors.t1 },

    // ── Emergency Toggle ────────────────────────────────────────
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: SgateColors.card,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 24,
    },
    switchTitle: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    switchSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // ── Primary Button ──────────────────────────────────────────
    submitBtn: {
        backgroundColor: SgateColors.gold,
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
    submitText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // ── Intercom Tab ─────────────────────────────────────────────
    intercomWrap: { flex: 1 },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 46,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 6,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    contactMid: { flex: 1, marginLeft: 12 },
    contactName: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    contactMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    contactFlat: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, textAlign: 'center', marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center' },
});
