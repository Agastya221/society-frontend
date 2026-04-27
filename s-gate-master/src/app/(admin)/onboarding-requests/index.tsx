import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface OnboardingRequest {
    id: string;
    userId: string;
    societyId: string;
    flatId: string;
    residentType: string;
    status: string;
    documents: { type: string; s3Key: string }[];
    user: { name: string; phone: string };
    flat: { number: string; block: { name: string } };
    createdAt: string;
}

type StatusTab = 'PENDING_APPROVAL' | 'RESUBMIT_REQUESTED' | 'APPROVED' | 'REJECTED';

const TABS: { key: StatusTab; label: string }[] = [
    { key: 'PENDING_APPROVAL',    label: 'Pending' },
    { key: 'RESUBMIT_REQUESTED',  label: 'Resubmit' },
    { key: 'APPROVED',            label: 'Approved' },
    { key: 'REJECTED',            label: 'Rejected' },
];

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
    PENDING_APPROVAL:   { bg: SgateColors.goldPale, text: SgateColors.goldDeep },
    RESUBMIT_REQUESTED: { bg: SgateColors.goldPale, text: SgateColors.goldDeep },
    APPROVED:           { bg: SgateColors.greenBg,  text: SgateColors.green },
    REJECTED:           { bg: SgateColors.redBg,    text: SgateColors.red },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function OnboardingRequestsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab]   = useState<StatusTab>('PENDING_APPROVAL');
    const [requests, setRequests]     = useState<OnboardingRequest[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail modal
    const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
    const [detailVisible, setDetailVisible]     = useState(false);

    // Reject / Resubmit
    const [actionType, setActionType]           = useState<'reject' | 'resubmit' | null>(null);
    const [reason, setReason]                   = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [selectedDocsForResubmit, setSelectedDocsForResubmit] = useState<string[]>([]);

    // Image Viewer
    const [viewerVisible, setViewerVisible]     = useState(false);
    const [viewerUrl, setViewerUrl]             = useState('');

    const IMAGE_BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

    useFocusEffect(useCallback(() => { fetchRequests(activeTab); }, [activeTab]));

    const fetchRequests = async (status: StatusTab) => {
        try {
            const res = await api.get('/resident/onboarding/admin/pending', {
                params: { status, page: 1, limit: 20 },
            });
            setRequests(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch onboarding requests:', err);
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh  = () => { setRefreshing(true); fetchRequests(activeTab); };
    const handleTabChange = (tab: StatusTab) => { setActiveTab(tab); setLoading(true); fetchRequests(tab); };
    const openDetail     = (req: OnboardingRequest) => { setSelectedRequest(req); setDetailVisible(true); setActionType(null); setSelectedDocsForResubmit([]); };

    const handleApprove = (req: OnboardingRequest) => {
        Alert.alert('Approve Request', `Approve ${req.user.name}'s request to join?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    try {
                        await api.patch(`/resident/onboarding/admin/${req.id}/approve`, {});
                        setRequests(prev => prev.filter(r => r.id !== req.id));
                        setDetailVisible(false);
                        Alert.alert('Success', 'Request approved successfully');
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message || 'Failed to approve request');
                    }
                },
            },
        ]);
    };

    const openActionModal = (type: 'reject' | 'resubmit') => { 
        setActionType(type); 
        setReason(''); 
        setSelectedDocsForResubmit(type === 'resubmit' && selectedRequest ? selectedRequest.documents.map(d => d.type) : []);
    };

    const handleActionSubmit = async () => {
        if (!reason.trim()) { Alert.alert('Error', 'Please provide a reason'); return; }
        if (actionType === 'resubmit' && selectedDocsForResubmit.length === 0) {
            Alert.alert('Error', 'Please select at least one document to resubmit');
            return;
        }
        if (!selectedRequest) return;
        setActionSubmitting(true);
        try {
            if (actionType === 'reject') {
                await api.patch(`/resident/onboarding/admin/${selectedRequest.id}/reject`, { reason: reason.trim() });
            } else {
                await api.patch(`/resident/onboarding/admin/${selectedRequest.id}/request-resubmit`, {
                    reason: reason.trim(),
                    documentsToResubmit: selectedDocsForResubmit,
                });
            }
            setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
            setActionType(null);
            setDetailVisible(false);
            Alert.alert('Success', actionType === 'reject' ? 'Request rejected' : 'Resubmission requested');
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Action failed');
        } finally {
            setActionSubmitting(false);
        }
    };

    const toggleDocSelection = (type: string) => {
        setSelectedDocsForResubmit(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const openDocument = (s3Key: string) => {
        const url = s3Key.startsWith('http') ? s3Key : `${IMAGE_BASE_URL}/${s3Key}`;
        setViewerUrl(url);
        setViewerVisible(true);
    };

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { return dateStr; }
    };
    const formatDocType = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Onboarding Requests</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
                    {TABS.map(tab => (
                        <TouchableOpacity key={tab.key} onPress={() => handleTabChange(tab.key)}
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
                            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
                        tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialCommunityIcons name="inbox-outline" size={48} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>
                                No {activeTab === 'PENDING_APPROVAL' ? 'pending' : activeTab.toLowerCase().replace('_', ' ')} requests
                            </Text>
                        </View>
                    }
                    renderItem={({ item, index }) => {
                        const sp = STATUS_PILL[item.status] ?? STATUS_PILL.PENDING_APPROVAL;
                        const initial = item.user.name.charAt(0).toUpperCase();
                        return (
                            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                                <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.75}>
                                    <View style={styles.card}>
                                        <View style={styles.cardTop}>
                                            <View style={styles.cardLeft}>
                                                <View style={styles.avatar}>
                                                    <Text style={styles.avatarText}>{initial}</Text>
                                                </View>
                                                <View style={styles.cardInfo}>
                                                    <Text style={styles.cardName}>{item.user.name}</Text>
                                                    <Text style={styles.cardPhone}>{item.user.phone}</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.residentTypePill, { backgroundColor: sp.bg }]}>
                                                <Text style={[styles.residentTypeText, { color: sp.text }]}>{item.residentType}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.metaRow}>
                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons name="home-outline" size={12} color={SgateColors.t4} />
                                                <Text style={styles.metaText}>{item.flat.block.name} - {item.flat.number}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons name="calendar-outline" size={12} color={SgateColors.t4} />
                                                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <MaterialCommunityIcons name="file-outline" size={12} color={SgateColors.t4} />
                                                <Text style={styles.metaText}>{item.documents.length} docs</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    }}
                />
            )}

            {/* ── Detail Modal ────────────────────────────────────────────── */}
            <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView edges={['top']} style={styles.modalSafe}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Request Details</Text>
                        <TouchableOpacity onPress={() => { setDetailVisible(false); setActionType(null); }}>
                            <MaterialCommunityIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    {selectedRequest && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Resident info */}
                            <Text style={styles.sectionLabel}>RESIDENT</Text>
                            <View style={styles.detailCard}>
                                <DetailRow label="Name" value={selectedRequest.user.name} />
                                <DetailRow label="Phone" value={selectedRequest.user.phone} />
                                <DetailRow label="Type" value={selectedRequest.residentType} />
                                <DetailRow label="Flat" value={`${selectedRequest.flat.block.name} - ${selectedRequest.flat.number}`} />
                                <DetailRow label="Submitted" value={formatDate(selectedRequest.createdAt)} last />
                            </View>

                            {/* Documents */}
                            <Text style={styles.sectionLabel}>DOCUMENTS</Text>
                            <View style={styles.detailCard}>
                                {selectedRequest.documents.map((doc, i) => {
                                    const isSelected = selectedDocsForResubmit.includes(doc.type);
                                    return (
                                        <View key={i} style={[styles.docRow, i < selectedRequest.documents.length - 1 && styles.docBorder]}>
                                            <TouchableOpacity 
                                                style={styles.docIcon} 
                                                onPress={() => openDocument(doc.s3Key)}
                                            >
                                                <MaterialCommunityIcons name="image-outline" size={15} color={SgateColors.gold} />
                                            </TouchableOpacity>
                                            
                                            <TouchableOpacity 
                                                style={{ flex: 1 }} 
                                                onPress={() => openDocument(doc.s3Key)}
                                            >
                                                <Text style={styles.docName}>{formatDocType(doc.type)}</Text>
                                            </TouchableOpacity>
                                            
                                            {actionType === 'resubmit' ? (
                                                <TouchableOpacity 
                                                    style={[styles.checkbox, isSelected && styles.checkboxActive]}
                                                    onPress={() => toggleDocSelection(doc.type)}
                                                >
                                                    {isSelected && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={styles.docBadge}>
                                                    <Text style={styles.docBadgeText}>Uploaded</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Actions - only for pending */}
                            {selectedRequest.status === 'PENDING_APPROVAL' && !actionType && (
                                <View style={styles.actionBtns}>
                                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(selectedRequest)}>
                                        <Text style={styles.approveBtnText}>Approve</Text>
                                    </TouchableOpacity>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity style={[styles.rejectBtn, { flex: 1 }]} onPress={() => openActionModal('reject')}>
                                            <Text style={styles.rejectBtnText}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.resubmitBtn, { flex: 1.5 }]} onPress={() => openActionModal('resubmit')}>
                                            <Text style={styles.resubmitBtnText}>Request Resubmit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Reason input */}
                            {actionType && (
                                <View style={styles.reasonCard}>
                                    <Text style={styles.reasonTitle}>
                                        {actionType === 'reject' ? 'Rejection Reason' : 'Resubmission Reason'}
                                    </Text>
                                    {actionType === 'resubmit' && (
                                        <Text style={{ fontSize: 13, color: SgateColors.t3, marginBottom: 10 }}>
                                            Select the specific documents above that need to be resubmitted.
                                        </Text>
                                    )}
                                    <TextInput style={styles.reasonInput} multiline textAlignVertical="top"
                                        placeholder={actionType === 'reject' ? 'Why is this request being rejected?' : 'What needs to be corrected?'}
                                        value={reason} onChangeText={setReason} placeholderTextColor={SgateColors.t4} />
                                    <View style={styles.reasonBtnRow}>
                                        <TouchableOpacity style={styles.reasonCancelBtn} onPress={() => setActionType(null)}>
                                            <Text style={styles.reasonCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.reasonSubmitBtn, actionType === 'reject' && { backgroundColor: SgateColors.red }]}
                                            onPress={handleActionSubmit} disabled={actionSubmitting}>
                                            {actionSubmitting ? <ActivityIndicator size="small" color="#FFF" /> :
                                                <Text style={styles.reasonSubmitText}>Submit</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Document Viewer Modal */}
            <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
                <View style={styles.viewerWrapper}>
                    <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
                        <MaterialCommunityIcons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    {viewerUrl ? (
                        <Image source={{ uri: viewerUrl }} style={styles.viewerImage} resizeMode="contain" />
                    ) : (
                        <AppLoader />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Detail row helper ───────────────────────────────────────────────────────
function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
        <View style={[s2.row, !last && s2.border]}>
            <Text style={s2.label}>{label}</Text>
            <Text style={s2.value}>{value}</Text>
        </View>
    );
}
const s2 = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    border: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    label: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    value: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Header
    header: { backgroundColor: SgateColors.card, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft, paddingBottom: 12 },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    headerBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Tabs
    tabRow: { paddingHorizontal: 16, gap: 8 },
    tab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: SgateColors.surface },
    tabActive: { backgroundColor: SgateColors.black },
    tabText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    tabTextActive: { color: '#FFFFFF' },

    // List
    listContent: { padding: 20, paddingBottom: 40, flexGrow: 1 },

    // Card
    card: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 10 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cardPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 1 },
    residentTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    residentTypeText: { fontSize: 10, fontFamily: SgateFonts.bold },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 10 },

    // Modal
    modalSafe: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    sectionLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8, marginTop: 16 },

    detailCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, paddingHorizontal: 16 },

    // Documents
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    docBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    docIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1, flex: 1 },
    docBadge: { backgroundColor: SgateColors.greenBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    docBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.green },

    // Action buttons
    actionBtns: { gap: 10, marginTop: 20 },
    approveBtn: { backgroundColor: SgateColors.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    approveBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
    rejectBtn: { backgroundColor: SgateColors.red, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    rejectBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
    resubmitBtn: { backgroundColor: SgateColors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: SgateColors.border },
    resubmitBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },

    // Reason card
    reasonCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginTop: 16 },
    reasonTitle: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 10 },
    reasonInput: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 14, padding: 14, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, height: 96, marginBottom: 14 },
    reasonBtnRow: { flexDirection: 'row', gap: 10 },
    reasonCancelBtn: { flex: 1, backgroundColor: SgateColors.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    reasonCancelText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    reasonSubmitBtn: { flex: 1, backgroundColor: SgateColors.black, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    reasonSubmitText: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },

    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: SgateColors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },

    viewerWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    viewerImage: { width: '100%', height: '80%' },
});
