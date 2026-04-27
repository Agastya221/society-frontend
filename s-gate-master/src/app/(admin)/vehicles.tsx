import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vehicle {
    id: string;
    plateNumber: string;
    type: 'CAR' | 'BIKE' | 'OTHER';
    makeModel?: string;
    color?: string;
    stickerNumber?: string;
    parkingSlot?: string;
    flat: {
        id: string;
        number: string;
        block?: { name: string };
        isAdminFlat: boolean;
    };
    resident: {
        id: string;
        name: string;
        phone: string;
    };
    status: 'ACTIVE' | 'SUSPENDED';
}

interface Violation {
    id: string;
    vehicleNumber: string;
    type: string;
    source: 'OFFICIAL' | 'COMPLAINT';
    status: 'OPEN' | 'NOTIFIED' | 'RESOLVED' | 'DISMISSED';
    penaltyAmount?: number;
    addedToInvoice?: boolean;
    description?: string;
    reportedBy?: { id: string; name: string; role: string };
    vehicle?: any;
    resolutionNote?: string;
    createdAt: string;
}

const VIOLATION_TYPES = [
    'WRONG_PARKING', 'DOUBLE_PARKING', 'BLOCKING_GATE',
    'UNAUTHORIZED_SPOT', 'NO_STICKER', 'OTHER',
];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AdminVehiclesScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<'LOOKUP' | 'VIOLATIONS'>('LOOKUP');

    // Lookup State
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [lookupResults, setLookupResults] = useState<Vehicle[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Violations State
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loadingVios, setLoadingVios] = useState(false);

    // Modals
    const [issueTarget, setIssueTarget] = useState<Vehicle | string | null>(null); // Vehicle if known, plate string if unknown
    const [vType, setVType] = useState('WRONG_PARKING');
    const [vDesc, setVDesc] = useState('');
    const [vPenalty, setVPenalty] = useState('500');
    const [vInvoice, setVInvoice] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [resolveTarget, setResolveTarget] = useState<{ id: string, type: 'RESOLVED' | 'DISMISSED' } | null>(null);
    const [resNote, setResNote] = useState('');

    // ─── API: Lookup ──────────────────────────────────────────────────────────
    const handleSearch = async () => {
        if (!query.trim()) {
            Alert.alert('Empty', 'Please enter a license plate or sticker (min 2 chars).');
            return;
        }
        setSearching(true);
        setHasSearched(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const res = await api.get('/admin/parking/lookup', {
                params: { q: query.trim().toUpperCase() }
            });
            const data = res.data?.data ?? [];
            setLookupResults(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Lookup error:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to lookup vehicle.');
            setLookupResults([]);
        } finally {
            setSearching(false);
        }
    };

    // ─── API: Violations List ─────────────────────────────────────────────────
    const fetchViolations = async () => {
        setLoadingVios(true);
        try {
            const res = await api.get('/admin/parking/violations');
            const data = res.data?.data?.violations ?? [];
            setViolations(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Violations fetch error:', error);
        } finally {
            setLoadingVios(false);
        }
    };

    useFocusEffect(useCallback(() => {
        if (tab === 'VIOLATIONS') fetchViolations();
    }, [tab]));

    // ─── API: Issue Violation ─────────────────────────────────────────────────
    const submitViolation = async () => {
        setSubmitting(true);
        try {
            const payload: any = {
                type: vType,
                description: vDesc.trim(),
                penaltyAmount: vPenalty ? parseInt(vPenalty, 10) : undefined,
                addToInvoice: vInvoice,
            };

            if (typeof issueTarget === 'string') {
                // Unknown vehicle
                payload.vehicleNumber = issueTarget;
                await api.post('/admin/parking/violations', payload);
            } else if (issueTarget) {
                // Known vehicle
                payload.vehicleNumber = issueTarget.plateNumber;
                await api.post(`/admin/parking/vehicles/${issueTarget.id}/violations`, payload);
            }

            Alert.alert('Success', 'Parking violation issued and notification sent.');
            setIssueTarget(null); setVDesc(''); setVPenalty('500'); setVInvoice(true);
            if (tab === 'VIOLATIONS') fetchViolations();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to issue violation.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── API: Resolve / Dismiss ───────────────────────────────────────────────
    const submitResolution = async () => {
        if (!resolveTarget) return;
        setSubmitting(true);
        try {
            await api.patch(`/admin/parking/violations/${resolveTarget.id}/resolve`, {
                status: resolveTarget.type,
                resolutionNote: resNote.trim() || 'Resolved by admin'
            });
            Alert.alert('Success', `Violation ${resolveTarget.type.toLowerCase()}`);
            setResolveTarget(null); setResNote('');
            fetchViolations();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update violation status.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── UI Renderers ─────────────────────────────────────────────────────────
    const renderLookupItem = ({ item }: { item: Vehicle }) => {
        const isOffice = item.flat?.isAdminFlat;
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.plateWrap}>
                        <Text style={styles.plateText}>{item.plateNumber}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <MaterialCommunityIcons name={item.type === 'BIKE' ? 'car-outline' : 'truck-outline'} size={14} color={SgateColors.t3} />
                    <Text style={styles.detailsText}>
                        {item.makeModel ?? item.type} {item.color ? `· ${item.color}` : ''}
                    </Text>
                    {!!item.parkingSlot && (
                        <>
                            <Text style={styles.detailsText}>·</Text>
                            <MaterialCommunityIcons name="map-marker-outline" size={13} color={SgateColors.t3} />
                            <Text style={styles.detailsText}>Slot {item.parkingSlot}</Text>
                        </>
                    )}
                </View>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Owner / Manager</Text>
                        <Text style={styles.infoValue}>{item.resident?.name || 'Unknown'}</Text>
                        <Text style={styles.infoSub}>{item.resident?.phone}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Destination</Text>
                        <Text style={styles.infoValue}>
                            {isOffice ? 'Admin Office' : `${item.flat?.block?.name ? item.flat.block.name + ' ' : ''}${item.flat?.number}`}
                        </Text>
                        {!!item.stickerNumber && <Text style={styles.infoSub}>Sticker: {item.stickerNumber}</Text>}
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={styles.callBtn} 
                        onPress={() => Alert.alert('Call', `Calling ${item.resident?.phone}...`)}
                    >
                        <MaterialCommunityIcons name="phone-outline" size={14} color={SgateColors.blue} />
                        <Text style={styles.callText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.violationBtn}
                        onPress={() => setIssueTarget(item)}
                    >
                        <MaterialCommunityIcons name="alert-outline" size={14} color={SgateColors.red} />
                        <Text style={styles.violationText}>Issue Ticket</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderViolation = ({ item, index }: { item: Violation; index: number }) => {
        const isOpen = item.status === 'OPEN' || item.status === 'NOTIFIED';
        return (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={styles.violationPlate}>{item.vehicleNumber}</Text>
                        <View style={[styles.statusBadge, !isOpen && { backgroundColor: SgateColors.surface }]}>
                            <Text style={[styles.statusText, !isOpen && { color: SgateColors.t3 }]}>{item.status}</Text>
                        </View>
                    </View>
                    
                    <Text style={styles.vioTypeLabel}>{item.type.replace('_', ' ')}</Text>
                    {!!item.description && <Text style={styles.vioDesc}>{item.description}</Text>}

                    <View style={styles.vioMetaRow}>
                        <Text style={styles.vioMetaText}>By: {item.reportedBy?.name || item.source}</Text>
                        <Text style={styles.vioMetaText}>•</Text>
                        <Text style={styles.vioMetaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    
                    {!!item.penaltyAmount && isOpen && (
                        <View style={styles.penaltyRow}>
                            <MaterialCommunityIcons name="alert-octagon-outline" size={13} color={SgateColors.red} />
                            <Text style={styles.penaltyText}>Penalty: {item.penaltyAmount} INR {item.addedToInvoice ? '(Invoiced)' : ''}</Text>
                        </View>
                    )}

                    {isOpen && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.dismissBtn} onPress={() => setResolveTarget({ id: item.id, type: 'DISMISSED' })}>
                                <Text style={styles.dismissText}>Dismiss</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.resolveBtn} onPress={() => setResolveTarget({ id: item.id, type: 'RESOLVED' })}>
                                <Text style={styles.resolveText}>Mark Resolved</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Parking Enforcement</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tab, tab === 'LOOKUP' && styles.tabActive]} onPress={() => setTab('LOOKUP')}>
                    <Text style={[styles.tabText, tab === 'LOOKUP' && styles.tabTextActive]}>Lookup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'VIOLATIONS' && styles.tabActive]} onPress={() => setTab('VIOLATIONS')}>
                    <Text style={[styles.tabText, tab === 'VIOLATIONS' && styles.tabTextActive]}>Violations</Text>
                </TouchableOpacity>
            </View>

            {/* Lookup Tab */}
            {tab === 'LOOKUP' && (
                <>
                    <View style={styles.searchSection}>
                        <View style={styles.searchBox}>
                            <MaterialCommunityIcons name="magnify" size={18} color={SgateColors.t3} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search plate (e.g. MH12AB) or sticker"
                                placeholderTextColor={SgateColors.t4}
                                value={query}
                                onChangeText={setQuery}
                                autoCapitalize="characters"
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                            />
                        </View>
                        <TouchableOpacity style={[styles.searchBtn, !query.trim() && { opacity: 0.5 }]} onPress={handleSearch} disabled={!query.trim() || searching}>
                            {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={lookupResults}
                        keyExtractor={(item) => item.id}
                        renderItem={renderLookupItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            hasSearched && !searching ? (
                                <View style={styles.emptyWrap}>
                                    <MaterialCommunityIcons name="shield-off-outline" size={48} color={SgateColors.t4} />
                                    <Text style={styles.emptyTitle}>Vehicle Not Found</Text>
                                    <Text style={styles.emptySub}>Not registered in society directory.</Text>
                                    <TouchableOpacity 
                                        style={styles.issueUnknownBtn} 
                                        onPress={() => setIssueTarget(query.toUpperCase())}
                                    >
                                        <Text style={styles.issueUnknownText}>Issue Ticket to "{query.toUpperCase()}"</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }
                    />
                </>
            )}

            {/* Violations Tab */}
            {tab === 'VIOLATIONS' && (
                <FlatList
                    data={violations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderViolation}
                    contentContainerStyle={styles.listContent}
                    refreshing={loadingVios}
                    onRefresh={fetchViolations}
                    ListEmptyComponent={
                        !loadingVios ? (
                            <View style={styles.emptyWrap}>
                                <MaterialCommunityIcons name="check-circle-outline" size={48} color={SgateColors.t4} />
                                <Text style={styles.emptyTitle}>All Clear</Text>
                                <Text style={styles.emptySub}>No active parking violations.</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Issue Violation Modal */}
            <Modal visible={!!issueTarget} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Issue Violation</Text>
                        <Text style={styles.modalSub}>
                            Target: {typeof issueTarget === 'string' ? issueTarget : issueTarget?.plateNumber}
                        </Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.fieldLabel}>Violation Type</Text>
                            <View style={styles.tagsContainer}>
                                {VIOLATION_TYPES.map(vt => (
                                    <TouchableOpacity key={vt} style={[styles.tag, vType === vt && styles.tagActive]} onPress={() => setVType(vt)}>
                                        <Text style={[styles.tagText, vType === vt && styles.tagTextActive]}>{vt.replace('_', ' ')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Description (Optional)</Text>
                            <TextInput
                                style={styles.inputArea}
                                placeholder="Details..."
                                placeholderTextColor={SgateColors.t4}
                                value={vDesc}
                                onChangeText={setVDesc}
                                multiline
                            />

                            <View style={styles.rowFields}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Penalty (INR)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={vPenalty} onChangeText={setVPenalty} />
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={styles.fieldLabel}>Add to Invoice</Text>
                                    <Switch value={vInvoice} onValueChange={setVInvoice} trackColor={{ true: SgateColors.green }} />
                                </View>
                            </View>

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity style={styles.modalCancel} onPress={() => setIssueTarget(null)}>
                                    <Text style={styles.modalCancelTxt}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSubmit} onPress={submitViolation} disabled={submitting}>
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitTxt}>Confirm Issue</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Resolve/Dismiss Modal */}
            <Modal visible={!!resolveTarget} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.smallModal}>
                        <Text style={styles.modalTitle}>{resolveTarget?.type === 'RESOLVED' ? 'Mark Resolved' : 'Dismiss Violation'}</Text>
                        <TextInput
                            style={styles.inputArea}
                            placeholder="Reason / Note..."
                            placeholderTextColor={SgateColors.t4}
                            value={resNote}
                            onChangeText={setResNote}
                            multiline
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setResolveTarget(null)}>
                                <Text style={styles.modalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSubmit, resolveTarget?.type === 'DISMISSED' && { backgroundColor: SgateColors.t3 }]} onPress={submitResolution} disabled={submitting}>
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitTxt}>Submit</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    header: {
        backgroundColor: SgateColors.card, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    
    tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: SgateColors.card },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: SgateColors.black },
    tabText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    tabTextActive: { color: SgateColors.black },

    searchSection: { padding: 20 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: SgateColors.surface, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: SgateColors.border, marginBottom: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    searchBtn: { backgroundColor: SgateColors.black, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontSize: 15, fontFamily: SgateFonts.bold },

    listContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },

    card: { backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    plateWrap: { backgroundColor: SgateColors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: SgateColors.border },
    plateText: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, letterSpacing: 1 },
    statusBadge: { backgroundColor: SgateColors.redBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.red },

    detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    detailsText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    divider: { height: 1, backgroundColor: SgateColors.borderSoft, marginBottom: 14 },

    infoGrid: { flexDirection: 'row', marginBottom: 16 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t4, marginBottom: 4, textTransform: 'uppercase' },
    infoValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    infoSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: SgateColors.blueBg, borderRadius: 10, paddingVertical: 12, gap: 6 },
    callText: { color: SgateColors.blue, fontSize: 13, fontFamily: SgateFonts.semibold },
    violationBtn: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: SgateColors.redBg, borderRadius: 10, paddingVertical: 12, gap: 6 },
    violationText: { color: SgateColors.red, fontSize: 13, fontFamily: SgateFonts.semibold },

    emptyWrap: { alignItems: 'center', marginTop: 40 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', marginBottom: 16 },
    issueUnknownBtn: { backgroundColor: SgateColors.black, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    issueUnknownText: { color: '#fff', fontSize: 14, fontFamily: SgateFonts.bold },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: SgateColors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    smallModal: { backgroundColor: SgateColors.card, margin: 24, padding: 24, borderRadius: 24, marginBottom: 'auto', marginTop: 'auto' },
    modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 20 },
    
    fieldLabel: { fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
    input: { backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    inputArea: { backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, height: 80, textAlignVertical: 'top' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: SgateColors.surface, borderWidth: 1, borderColor: SgateColors.border },
    tagActive: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },
    tagText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    tagTextActive: { color: '#fff' },
    rowFields: { flexDirection: 'row', gap: 16, alignItems: 'center' },

    modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: SgateColors.surface, alignItems: 'center' },
    modalCancelTxt: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    modalSubmit: { flex: 1.2, paddingVertical: 14, borderRadius: 14, backgroundColor: SgateColors.red, alignItems: 'center' },
    modalSubmitTxt: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },

    // Violations ListItem Styles
    violationPlate: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    vioTypeLabel: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.red, marginBottom: 6 },
    vioDesc: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, marginBottom: 10, lineHeight: 18 },
    vioMetaRow: { flexDirection: 'row', gap: 6 },
    vioMetaText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },
    penaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SgateColors.redBg, padding: 10, borderRadius: 8, marginTop: 12 },
    penaltyText: { color: SgateColors.red, fontSize: 13, fontFamily: SgateFonts.bold },
    
    dismissBtn: { flex: 1, alignItems: 'center', backgroundColor: SgateColors.surface, paddingVertical: 12, borderRadius: 10 },
    dismissText: { color: SgateColors.t2, fontSize: 13, fontFamily: SgateFonts.semibold },
    resolveBtn: { flex: 1.5, alignItems: 'center', backgroundColor: SgateColors.greenBg, paddingVertical: 12, borderRadius: 10 },
    resolveText: { color: SgateColors.green, fontSize: 13, fontFamily: SgateFonts.semibold },
});
