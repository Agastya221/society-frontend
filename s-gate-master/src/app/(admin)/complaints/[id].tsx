import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { ComplaintStatusBadge } from '../../../components/complaints/ComplaintStatusBadge';
import { PriorityBadge } from '../../../components/complaints/PriorityBadge';
import { ImageCarousel } from '../../../components/ui/ImageCarousel';
import { Complaint, ComplaintStatus, fetchComplaintDetails, updateComplaint } from '../../../services/complaints';
import { getStaffList, StaffMember } from '../../../services/staffService';

const IMAGE_BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

export default function AdminComplaintDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // Data State
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    
    // Modals
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');

    const loadData = async () => {
        if (!id) return;
        try {
            setError('');
            const [complaintData, staffData] = await Promise.all([
                fetchComplaintDetails(id),
                getStaffList()
            ]);
            setComplaint(complaintData);
            setStaffList(staffData);
        } catch (err: any) {
            console.error('Failed to load data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    const handleShare = async () => {
        if (!complaint) return;
        try {
            await Share.share({
                message: [
                    `ADMIN ALERT: Complaint Update`,
                    `Title: ${complaint.title}`,
                    `Category: ${complaint.category}`,
                    `Priority: ${complaint.priority}`,
                    `Status: ${complaint.status}`,
                    `Flat: ${complaint.flat?.flatNumber || 'N/A'}`,
                    `Created: ${new Date(complaint.createdAt).toLocaleDateString()}`
                ].join('\n'),
            });
        } catch (error: any) {
            console.error(error.message);
        }
    };

    const handleUpdateStatus = async (newStatus: ComplaintStatus) => {
        if (!complaint) return;
        
        setIsUpdating(true);
        try {
           const updated = await updateComplaint(complaint.id, { 
               status: newStatus,
               resolution: newStatus === 'RESOLVED' ? resolutionNote : undefined
           });
           setComplaint(updated);
           setShowStatusModal(false);
           setResolutionNote('');
           Alert.alert('Success', 'Status updated successfully');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAssignStaff = async (staffId: string) => {
        if (!complaint) return;
        setIsUpdating(true);
        try {
            const updated = await updateComplaint(complaint.id, { assignedToId: staffId });
            setComplaint(updated);
            setShowAssignModal(false);
            Alert.alert('Success', 'Staff assigned successfully');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <View style={S.loadingWrap}>
                <AppLoader />
            </View>
        );
    }

    if (error || !complaint) {
        return (
            <View style={S.loadingWrap}>
                <Text style={S.errorText}>{error || 'Complaint not found'}</Text>
                <TouchableOpacity onPress={() => router.back()} style={S.errorBtn}>
                     <Text style={S.errorBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Logic for "Reported By"
    const getReportedByText = () => {
        if (complaint.isAnonymous) {
            return 'Anonymous';
        }
        return complaint.reportedBy?.name || 'Unknown';
    };

    return (
        <View style={S.root}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <View style={[S.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <View style={S.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={S.headerTitle}>Admin View</Text>
                </View>
                <TouchableOpacity onPress={handleShare} style={S.shareButton}>
                    <MaterialCommunityIcons name="share-variant-outline" size={20} color={SgateColors.goldDeep} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={S.scroll}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={S.content}>
                    {/* Status & ID */}
                    <View style={S.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={S.categoryLabel}>
                                {complaint.category} • {complaint.ticketNumber || 'NO ID'}
                            </Text>
                            <Text style={S.titleText}>{complaint.title}</Text>
                        </View>
                        <ComplaintStatusBadge status={complaint.status} />
                    </View>

                    {/* Priority & Date */}
                    <View style={S.metaRow}>
                        <PriorityBadge priority={complaint.priority} />
                        <View style={S.dot} />
                        <Text style={S.metaDate}>{new Date(complaint.createdAt).toLocaleString()}</Text>
                    </View>

                    {/* Description */}
                    <View style={S.descCard}>
                        <Text style={S.descText}>{complaint.description}</Text>
                    </View>

                    {/* Images */}
                    {(() => {
                        const imageSources = (complaint.imageUrls && complaint.imageUrls.length > 0)
                            ? complaint.imageUrls.map(img => img.viewUrl)
                            : (complaint.images || []).map(path => `${IMAGE_BASE_URL}/${path}`);

                        return imageSources.length > 0 ? (
                            <View style={{ marginBottom: 20 }}>
                                <ImageCarousel images={imageSources as string[]} height={300} resizeMode="contain" />
                            </View>
                        ) : null;
                    })()}

                    {/* ACTIONS SECTION (Admin Only) */}
                    <View style={S.actionsCard}>
                        <Text style={S.actionsTitle}>ADMIN ACTIONS</Text>
                        <View style={S.actionsRow}>
                            <TouchableOpacity
                                style={S.actionBtn}
                                onPress={() => setShowStatusModal(true)}
                                activeOpacity={0.75}
                            >
                                <MaterialCommunityIcons name="sync" size={16} color={SgateColors.t1} />
                                <Text style={S.actionBtnText}>Update Status</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={S.actionBtn}
                                onPress={() => setShowAssignModal(true)}
                                activeOpacity={0.75}
                            >
                                <MaterialCommunityIcons name="account-plus-outline" size={16} color={SgateColors.t1} />
                                <Text style={S.actionBtnText}>Assign Staff</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Resolution info if resolved */}
                    {complaint.status === 'RESOLVED' && (
                        <View style={S.resolvedCard}>
                            <View style={S.resolvedHeader}>
                                <MaterialCommunityIcons name="check-circle" size={20} color={SgateColors.green} />
                                <Text style={S.resolvedTitle}>Resolved</Text>
                            </View>
                            {complaint.resolution && (
                                <Text style={S.resolvedNote}>{complaint.resolution}</Text>
                            )}
                            <Text style={S.resolvedDate}>
                                Resolved on {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleString() : 'Unknown date'}
                                {complaint.resolvedBy ? ` by ${complaint.resolvedBy.name}` : ''}
                            </Text>
                        </View>
                    )}

                    {/* Details Card */}
                    <View style={S.card}>
                        <Text style={S.cardSectionTitle}>Ticket Information</Text>
                        
                        <InfoRow label="Reported By" value={getReportedByText()} />
                        {!complaint.isAnonymous && complaint.reportedBy?.phone && (
                            <InfoRow label="" value={complaint.reportedBy.phone} small />
                        )}
                        <InfoRow label="Flat/Unit" value={complaint.flat?.flatNumber || 'Not Associated'} />
                        {complaint.location && <InfoRow label="Location" value={complaint.location} />}
                        <InfoRow label="Created" value={new Date(complaint.createdAt).toLocaleString()} />
                        <InfoRow label="Assigned To" value={complaint.assignedTo?.name || 'Unassigned'} />
                        {complaint.assignedTo?.role && (
                            <InfoRow label="" value={complaint.assignedTo.role} small />
                        )}
                        {complaint.assignedAt && (
                            <InfoRow label="Assigned On" value={new Date(complaint.assignedAt).toLocaleString()} />
                        )}
                        <InfoRow label="Last Updated" value={new Date(complaint.updatedAt).toLocaleString()} />
                    </View>
                </View>
            </ScrollView>

            {/* STATUS MODAL */}
            <Modal visible={showStatusModal} transparent animationType="fade">
                <View style={S.modalOverlay}>
                    <View style={S.modalCard}>
                        <Text style={S.modalTitle}>Update Status</Text>
                        
                        <View style={{ gap: 10 }}>
                            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as ComplaintStatus[]).map((status) => {
                                const isActive = complaint.status === status;
                                return (
                                    <TouchableOpacity 
                                        key={status}
                                        onPress={() => handleUpdateStatus(status)}
                                        style={[S.statusOption, isActive && S.statusOptionActive]}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[S.statusOptionText, isActive && S.statusOptionTextActive]}>
                                            {status.replace('_', ' ')}
                                        </Text>
                                        {isActive && <MaterialCommunityIcons name="check" size={18} color={SgateColors.goldDeep} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity onPress={() => setShowStatusModal(false)} style={S.modalCancel}>
                            <Text style={S.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ASSIGNMENT MODAL */}
            <Modal visible={showAssignModal} transparent animationType="slide">
                <View style={S.bottomSheetOverlay}>
                    <View style={S.bottomSheet}>
                        <View style={S.bottomSheetHeader}>
                            <Text style={S.bottomSheetTitle}>Assign Staff</Text>
                            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={SgateColors.t3} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {staffList.length === 0 ? (
                                <Text style={S.staffEmpty}>No staff members found.</Text>
                            ) : (
                                staffList.map((staff) => {
                                    const isAssigned = complaint.assignedTo?.id === staff.id;
                                    return (
                                        <TouchableOpacity 
                                            key={staff.id}
                                            onPress={() => handleAssignStaff(staff.id)}
                                            style={[S.staffItem, isAssigned && S.staffItemActive]}
                                            activeOpacity={0.75}
                                        >
                                            <View style={S.staffAvatar}>
                                                <Text style={S.staffAvatarText}>
                                                    {staff.name.charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={S.staffName}>{staff.name}</Text>
                                                <Text style={S.staffSub}>{staff.role} • {staff.phone}</Text>
                                            </View>
                                            {isAssigned && (
                                                <MaterialCommunityIcons name="check-circle" size={24} color={SgateColors.goldDeep} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── InfoRow sub-component ────────────────────────────────────────────────
function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
    return (
        <View style={S.infoRow}>
            {label ? <Text style={S.infoLabel}>{label}</Text> : <View style={{ flex: 1 }} />}
            <Text style={[S.infoValue, small && S.infoValueSmall]}>{value}</Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    loadingWrap: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.red, marginBottom: 16 },
    errorBtn: {
        backgroundColor: SgateColors.gold,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
    },
    errorBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Content
    scroll: { flex: 1 },
    content: { padding: 20 },

    // Title
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    categoryLabel: { ...SgateTypography.microLabel, color: SgateColors.goldDeep, marginBottom: 4 },
    titleText: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1, lineHeight: 28 },

    // Meta
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: SgateColors.border },
    metaDate: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Description
    descCard: { backgroundColor: SgateColors.surface, padding: 16, borderRadius: 16, marginBottom: 20 },
    descText: { fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t1, lineHeight: 24 },

    // Actions Card
    actionsCard: {
        backgroundColor: SgateColors.goldPale,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    actionsTitle: { ...SgateTypography.microLabel, color: SgateColors.goldDeep, marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 14,
    },
    actionBtnText: { fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Resolved Card
    resolvedCard: {
        backgroundColor: SgateColors.greenBg,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    resolvedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    resolvedTitle: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.green },
    resolvedNote: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t2, marginBottom: 8, lineHeight: 20 },
    resolvedDate: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Card
    card: {
        backgroundColor: SgateColors.card,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    cardSectionTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },

    // InfoRow
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    infoLabel: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, flex: 1 },
    infoValue: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1, textAlign: 'right', maxWidth: '55%' },
    infoValueSmall: { fontSize: 12, color: SgateColors.t3 },

    // Status Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 380,
    },
    modalTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 16 },
    statusOption: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: SgateColors.borderSoft,
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusOptionActive: {
        backgroundColor: SgateColors.goldPale,
        borderColor: SgateColors.gold,
    },
    statusOptionText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    statusOptionTextActive: { color: SgateColors.goldDeep, fontFamily: SgateFonts.bold },
    modalCancel: { marginTop: 16, alignItems: 'center', padding: 12 },
    modalCancelText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

    // Assignment Bottom Sheet
    bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: {
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '75%',
    },
    bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    bottomSheetTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    staffEmpty: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', marginTop: 40 },
    staffItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        backgroundColor: SgateColors.surface,
    },
    staffItemActive: {
        backgroundColor: SgateColors.goldPale,
        borderColor: SgateColors.gold,
    },
    staffAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SgateColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    staffAvatarText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2 },
    staffName: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    staffSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
});
