import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RequestDocument {
    type: string;
    url: string;
    fileName?: string;
}

interface OnboardingRequest {
    id: string;
    residentType: string;
    status: string;
    documents: RequestDocument[];
    documentsCount: number;
    user: { name: string; phone: string; photoUrl?: string };
    flat: { number: string; block: { name: string } };
    createdAt: string;
    submittedAt?: string;
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

function getParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function isStatusTab(value: string | undefined): value is StatusTab {
    return TABS.some((tab) => tab.key === value);
}

function normalizeDocuments(rawDocs: any[] = []): RequestDocument[] {
    return rawDocs.map((doc) => ({
        type: doc.type ?? doc.documentType ?? 'DOCUMENT',
        url: doc.viewUrl ?? doc.url ?? doc.documentUrl ?? doc.s3Key ?? '',
        fileName: doc.fileName,
    }));
}

function normalizeRequest(raw: any): OnboardingRequest {
    const resident = raw.resident ?? raw.user ?? {};
    const documents = normalizeDocuments(raw.documents ?? []);
    const flatNumber = raw.flat?.number ?? raw.flat?.flatNumber ?? raw.flat ?? raw.flatNumber ?? '-';
    const blockName = raw.flat?.block?.name ?? raw.flat?.block ?? raw.block?.name ?? raw.block ?? '-';

    return {
        id: raw.id,
        residentType: raw.residentType ?? '-',
        status: raw.status ?? 'PENDING_APPROVAL',
        documents,
        documentsCount: raw.documentsCount ?? raw._count?.documents ?? documents.length,
        user: {
            name: resident.name?.trim() || 'Unknown Resident',
            phone: resident.phone || 'No phone provided',
            photoUrl: resident.photoUrl || resident.profilePic || resident.avatar || undefined,
        },
        flat: {
            number: flatNumber,
            block: { name: blockName },
        },
        createdAt: raw.createdAt ?? raw.submittedAt ?? new Date().toISOString(),
        submittedAt: raw.submittedAt,
    };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function OnboardingRequestsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab]   = useState<StatusTab>('PENDING_APPROVAL');
    const [requests, setRequests]     = useState<OnboardingRequest[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const autoOpenedRequestId = useRef<string | null>(null);

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
    const routeRequestId = getParam(params.requestId);
    const routeStatus = getParam(params.status);

    useEffect(() => {
        if (isStatusTab(routeStatus) && routeStatus !== activeTab) {
            setActiveTab(routeStatus);
            setLoading(true);
        }
    }, [activeTab, routeStatus]);

    const openDetail = useCallback(async (req: OnboardingRequest) => {
        setSelectedRequest(req);
        setDetailVisible(true);
        setActionType(null);
        setSelectedDocsForResubmit([]);

        try {
            const res = await api.get(`/resident/onboarding/admin/${req.id}`);
            const detail = res.data?.data;
            if (detail) {
                setSelectedRequest(normalizeRequest(detail));
            }
        } catch (err) {
            console.error('Failed to fetch onboarding request details:', err);
        }
    }, []);

    const fetchRequests = useCallback(async (status: StatusTab) => {
        try {
            const res = await api.get('/resident/onboarding/admin/pending', {
                params: { status, page: 1, limit: 20 },
            });
            const payload = res.data?.data ?? res.data;
            const list = Array.isArray(payload) ? payload : (payload?.requests ?? []);
            const normalized: OnboardingRequest[] = list.map(normalizeRequest);
            setRequests(normalized);

            if (routeRequestId && autoOpenedRequestId.current !== routeRequestId) {
                const target = normalized.find((req) => req.id === routeRequestId);
                if (target) {
                    autoOpenedRequestId.current = routeRequestId;
                    void openDetail(target);
                }
            }
        } catch (err) {
            console.error('Failed to fetch onboarding requests:', err);
            setRequests([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [openDetail, routeRequestId]);

    useFocusEffect(useCallback(() => { fetchRequests(activeTab); }, [activeTab, fetchRequests]));

    const handleRefresh  = () => { setRefreshing(true); fetchRequests(activeTab); };
    const handleTabChange = (tab: StatusTab) => { 
        setActiveTab(tab); 
        setLoading(true); 
        router.setParams({ status: tab });
        fetchRequests(tab); 
    };

    const handleApprove = (req: OnboardingRequest) => {
        AppAlert.show('Approve Request', `Approve ${req.user.name}'s request to join?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    try {
                        await api.patch(`/resident/onboarding/admin/${req.id}/approve`, {});
                        setRequests(prev => prev.filter(r => r.id !== req.id));
                        setDetailVisible(false);
                        AppAlert.show('Success', 'Request approved successfully');
                    } catch (err: any) {
                        AppAlert.show('Error', err?.response?.data?.message || 'Failed to approve request');
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
        if (!reason.trim()) { AppAlert.show('Error', 'Please provide a reason'); return; }
        if (actionType === 'resubmit' && selectedDocsForResubmit.length === 0) {
            AppAlert.show('Error', 'Please select at least one document to resubmit');
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
            AppAlert.show('Success', actionType === 'reject' ? 'Request rejected' : 'Resubmission requested');
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Action failed');
        } finally {
            setActionSubmitting(false);
        }
    };

    const toggleDocSelection = (type: string) => {
        setSelectedDocsForResubmit(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const openDocument = (documentUrl: string) => {
        if (!documentUrl) {
            AppAlert.show('Document unavailable', 'This document does not have a viewable URL yet.');
            return;
        }
        const url = documentUrl.startsWith('http') ? documentUrl : `${IMAGE_BASE_URL}/${documentUrl}`;
        setViewerUrl(url);
        setViewerVisible(true);
    };

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { return dateStr; }
    };
    const formatDocType = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const pendingCount = requests.length;

    return (
        <View style={styles.safe}>
            {/* Header */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialIcons name="arrow-back" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Onboarding Requests</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Resident verification & approvals</Text>
                    </View>
                    {activeTab === 'PENDING_APPROVAL' && pendingCount > 0 && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{pendingCount} PENDING</Text>
                        </View>
                    )}
                </View>

                {/* Filter tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {TABS.map(tab => (
                        <TouchableOpacity key={tab.key} onPress={() => handleTabChange(tab.key)}
                            style={[styles.filterTab, activeTab === tab.key && styles.filterTabActive]}
                            activeOpacity={0.75}>
                            <Text style={[styles.filterText, activeTab === tab.key && styles.filterTextActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {/* List */}
            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
                        tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialIcons name="person-search" size={56} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>No requests</Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'PENDING_APPROVAL' ? 'No pending requests right now.' : `No ${activeTab.toLowerCase().replace(/_/g, ' ')} requests found.`}
                            </Text>
                        </View>
                    }
                    renderItem={({ item, index }) => {
                        const sp = STATUS_PILL[item.status] ?? STATUS_PILL.PENDING_APPROVAL;
                        const initial = (item.user.name || 'R').charAt(0).toUpperCase();
                        return (
                            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                                <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.75}>
                                    <View style={styles.card}>
                                        <View style={styles.cardTop}>
                                            <View style={styles.cardLeft}>
                                                <View style={styles.avatar}>
                                                    {item.user.photoUrl ? (
                                                        <Image
                                                            source={{ uri: item.user.photoUrl.startsWith('http') ? item.user.photoUrl : `${IMAGE_BASE_URL}/${item.user.photoUrl}` }}
                                                            style={{ width: '100%', height: '100%', borderRadius: 24 }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Text style={styles.avatarText}>{initial}</Text>
                                                    )}
                                                </View>
                                                <View style={styles.cardInfo}>
                                                    <Text style={styles.cardName}>{item.user.name}</Text>
                                                    <Text style={styles.cardPhone}>{item.user.phone}</Text>
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                                <View style={[styles.residentTypePill, { backgroundColor: sp.bg }]}>
                                                    <Text style={[styles.residentTypeText, { color: sp.text }]}>{item.residentType}</Text>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={20} color={SgateColors.t4} style={{ marginRight: 2 }} />
                                            </View>
                                        </View>

                                        <View style={styles.cardDivider} />

                                        <View style={styles.metaRow}>
                                            <View style={styles.metaItem}>
                                                <MaterialIcons name="home" size={14} color={SgateColors.goldDeep} />
                                                <Text style={styles.metaText}>{item.flat.block.name} - {item.flat.number}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <MaterialIcons name="event" size={14} color={SgateColors.blue} />
                                                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                                            </View>
                                            <View style={styles.metaItem}>
                                                <MaterialIcons name="description" size={14} color={SgateColors.violet} />
                                                <Text style={styles.metaText}>{item.documentsCount} docs</Text>
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
                            <MaterialIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    {selectedRequest && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Resident info */}
                            <Text style={styles.sectionLabel}>RESIDENT</Text>
                            <View style={styles.detailProfileCard}>
                                <View style={styles.modalProfileTop}>
                                    <TouchableOpacity 
                                        style={styles.modalAvatar}
                                        activeOpacity={0.8}
                                        onPress={() => openDocument(selectedRequest.user.photoUrl || '')}
                                    >
                                        {selectedRequest.user.photoUrl ? (
                                            <Image
                                                source={{ uri: selectedRequest.user.photoUrl.startsWith('http') ? selectedRequest.user.photoUrl : `${IMAGE_BASE_URL}/${selectedRequest.user.photoUrl}` }}
                                                style={{ width: '100%', height: '100%', borderRadius: 32 }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Text style={styles.modalAvatarText}>
                                                {(selectedRequest.user.name || 'R').charAt(0).toUpperCase()}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                    <View style={styles.modalProfileInfo}>
                                        <Text style={styles.modalProfileName}>{selectedRequest.user.name}</Text>
                                        <Text style={styles.modalProfilePhone}>{selectedRequest.user.phone}</Text>
                                        <View style={[styles.residentTypePill, { backgroundColor: (STATUS_PILL[selectedRequest.status] ?? STATUS_PILL.PENDING_APPROVAL).bg, alignSelf: 'flex-start', marginTop: 8 }]}>
                                            <Text style={[styles.residentTypeText, { color: (STATUS_PILL[selectedRequest.status] ?? STATUS_PILL.PENDING_APPROVAL).text }]}>{selectedRequest.residentType}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardDivider} />

                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <MaterialIcons name="home" size={14} color={SgateColors.goldDeep} />
                                        <Text style={styles.metaText}>{selectedRequest.flat.block.name} - {selectedRequest.flat.number}</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <MaterialIcons name="event" size={14} color={SgateColors.blue} />
                                        <Text style={styles.metaText}>{formatDate(selectedRequest.createdAt)}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Documents */}
                            <Text style={styles.sectionLabel}>DOCUMENTS</Text>
                            <View style={styles.detailCard}>
                                {selectedRequest.documents.length === 0 ? (
                                    <View style={styles.noDocsRow}>
                                        <Text style={styles.noDocsText}>No documents available yet</Text>
                                    </View>
                                ) : selectedRequest.documents.map((doc, i) => {
                                    const isSelected = selectedDocsForResubmit.includes(doc.type);
                                    return (
                                        <View key={i} style={[styles.docRow, i < selectedRequest.documents.length - 1 && styles.docBorder]}>
                                            <TouchableOpacity 
                                                style={styles.docIcon} 
                                                onPress={() => openDocument(doc.url)}
                                            >
                                                <MaterialIcons name="image" size={15} color={SgateColors.gold} />
                                            </TouchableOpacity>
                                            
                                            <TouchableOpacity 
                                                style={{ flex: 1 }} 
                                                onPress={() => openDocument(doc.url)}
                                            >
                                                <Text style={styles.docName}>{formatDocType(doc.type)}</Text>
                                            </TouchableOpacity>
                                            
                                            {actionType === 'resubmit' ? (
                                                <TouchableOpacity 
                                                    style={[styles.checkbox, isSelected && styles.checkboxActive]}
                                                    onPress={() => toggleDocSelection(doc.type)}
                                                >
                                                    {isSelected && <MaterialIcons name="check" size={14} color="#FFF" />}
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
                        <MaterialIcons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    {viewerUrl ? (
                        <Image source={{ uri: viewerUrl }} style={styles.viewerImage} resizeMode="contain" />
                    ) : (
                        <AppLoader />
                    )}
                </View>
            </Modal>
        </View>
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

    // Header (matches emergencies / gate-passes)
    headerWrapper: {
        backgroundColor: SgateColors.card,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SgateColors.goldDeep },
    liveText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep, letterSpacing: 0.5 },

    // Filter tabs
    filterRow: { paddingHorizontal: 20, gap: 8 },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    // List
    listContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },

    // Card
    card: { 
        backgroundColor: SgateColors.card, 
        borderRadius: 20, 
        padding: 16, 
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    cardInfo: { flex: 1, justifyContent: 'center' },
    cardName: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 2 },
    cardPhone: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    residentTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    residentTypeText: { fontSize: 10, fontFamily: SgateFonts.extrabold, letterSpacing: 0.5 },

    cardDivider: {
        height: 1,
        backgroundColor: SgateColors.borderSoft,
        marginTop: 14,
        marginBottom: 14,
    },

    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2 },

    // Empty
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.7 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 12, marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Modal
    modalSafe: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    sectionLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8, marginTop: 16 },

    detailCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, paddingHorizontal: 16 },
    
    detailProfileCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 20 },
    modalProfileTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    modalAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    modalAvatarText: { fontSize: 24, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    modalProfileInfo: { flex: 1, justifyContent: 'center' },
    modalProfileName: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 2 },
    modalProfilePhone: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

    // Documents
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    docBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    docIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1, flex: 1 },
    docBadge: { backgroundColor: SgateColors.greenBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    docBadgeText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.green },
    noDocsRow: { paddingVertical: 18, alignItems: 'center' },
    noDocsText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Action buttons
    actionBtns: { gap: 10, marginTop: 20 },
    approveBtn: { backgroundColor: SgateColors.gold, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    approveBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.ink },
    rejectBtn: { backgroundColor: SgateColors.red, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    rejectBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
    resubmitBtn: { backgroundColor: SgateColors.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: SgateColors.borderSoft },
    resubmitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Reason card
    reasonCard: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginTop: 16 },
    reasonTitle: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 10 },
    reasonInput: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 14, padding: 14, fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1, height: 96, marginBottom: 14 },
    reasonBtnRow: { flexDirection: 'row', gap: 10 },
    reasonCancelBtn: { flex: 1, backgroundColor: SgateColors.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    reasonCancelText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    reasonSubmitBtn: { flex: 1, backgroundColor: SgateColors.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    reasonSubmitText: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },

    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: SgateColors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: SgateColors.gold, borderColor: SgateColors.gold },

    viewerWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    viewerImage: { width: '100%', height: '80%' },
});
