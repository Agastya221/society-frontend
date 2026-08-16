import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import {
    deleteResidentRequest,
    getResidentRequestDetails,
    type ResidentContextRequest,
    type ResidentRequestDetails,
} from '@/services/profile.service';
import { AppAlert } from '@/components/ui/AppAlert';

const BRAND_YELLOW = '#FFD60A';
const BRAND_YELLOW_BG = '#FFFBE6';

interface ResidentRequestDetailsSheetProps {
    visible: boolean;
    request: ResidentContextRequest | null;
    onClose: () => void;
    onDeleted: () => void;
    onApplyAgain: (request: ResidentContextRequest | ResidentRequestDetails) => void;
    onEditSelection: (request: ResidentContextRequest | ResidentRequestDetails) => void;
}

function statusMeta(status: string) {
    switch (status) {
        case 'PENDING_APPROVAL':
            return {
                title: 'Request Under Review',
                label: 'Pending approval',
                icon: 'clock-check-outline' as const,
                color: '#996300',
                bg: BRAND_YELLOW_BG,
                message: 'The society admin is reviewing this flat request.',
            };
        case 'RESUBMIT_REQUESTED':
            return {
                title: 'Resubmission Required',
                label: 'Needs resubmit',
                icon: 'file-alert-outline' as const,
                color: SgateColors.red,
                bg: SgateColors.redBg,
                message: 'The admin needs corrected information before approval.',
            };
        case 'REJECTED':
            return {
                title: 'Request Rejected',
                label: 'Rejected',
                icon: 'close-circle-outline' as const,
                color: SgateColors.red,
                bg: SgateColors.redBg,
                message: 'This request was rejected by the society admin.',
            };
        case 'DRAFT':
        case 'PENDING_DOCS':
            return {
                title: 'Application Incomplete',
                label: 'Incomplete',
                icon: 'file-document-edit-outline' as const,
                color: SgateColors.t3,
                bg: SgateColors.surface,
                message: 'Complete this application to send it for review.',
            };
        default:
            return {
                title: 'Flat Request',
                label: status.replace(/_/g, ' ').toLowerCase(),
                icon: 'home-clock-outline' as const,
                color: SgateColors.t3,
                bg: SgateColors.surface,
                message: 'Review this flat request.',
            };
    }
}

function formatDate(value?: string | null) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return value;
    }
}

function formatResidentType(type?: string | null, isLivingHere?: boolean) {
    if (type === 'TENANT') return 'Tenant';
    if (type === 'OWNER' && isLivingHere === false) return 'Non-residing owner';
    if (type === 'OWNER') return 'Owner - Living here';
    return type || '-';
}

function formatDocType(type: string) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ResidentRequestDetailsSheet({
    visible,
    request,
    onClose,
    onDeleted,
    onApplyAgain,
    onEditSelection,
}: ResidentRequestDetailsSheetProps) {
    const insets = useSafeAreaInsets();
    const [details, setDetails] = useState<ResidentRequestDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!visible || !request?.requestId) return;
            setLoading(true);
            setDetails(null);
            try {
                const result = await getResidentRequestDetails(request.requestId);
                if (!cancelled) setDetails(result);
            } catch (error: any) {
                if (!cancelled) {
                    AppAlert.show(
                        'Could not load request',
                        error?.response?.data?.message || 'Please try again.'
                    );
                    onClose();
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [visible, request?.requestId, onClose]);

    const current = details ?? request;
    const meta = useMemo(() => statusMeta(current?.status ?? 'PENDING_APPROVAL'), [current?.status]);

    if (!current) return null;

    const canDelete = details?.canDelete ?? current.status !== 'APPROVED';
    const reason = details?.rejectionReason || details?.resubmitReason;
    const showApplyAgain = current.status === 'REJECTED';
    const showResubmit = current.status === 'RESUBMIT_REQUESTED';
    const showContinue = current.status === 'DRAFT' || current.status === 'PENDING_DOCS';

    const confirmDelete = () => {
        const actionLabel = current.status === 'PENDING_APPROVAL' ? 'Withdraw' : 'Delete';
        AppAlert.show(
            `${actionLabel} Request?`,
            current.status === 'PENDING_APPROVAL'
                ? 'This will remove your pending request. You can apply again later.'
                : 'This will remove this request from your homes list.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: actionLabel,
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deleteResidentRequest(current.requestId);
                            onDeleted();
                            onClose();
                        } catch (error: any) {
                            AppAlert.show(
                                'Could not remove request',
                                error?.response?.data?.message || 'Please try again.'
                            );
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleApply = () => {
        onApplyAgain(details ?? current);
        onClose();
    };

    const handleEditSelection = () => {
        onEditSelection(details ?? current);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={S.root}>
                <Pressable style={S.backdrop} onPress={onClose} />
                <View style={[S.sheet, { paddingBottom: insets.bottom + 18 }]}>
                    <View style={S.handle} />

                    <View style={S.header}>
                        <View style={[S.statusIcon, { backgroundColor: meta.bg }]}>
                            <MaterialCommunityIcons name={meta.icon} size={26} color={meta.color} />
                        </View>
                        <View style={S.headerText}>
                            <Text style={S.title}>{meta.title}</Text>
                            <Text style={S.subtitle} numberOfLines={1}>
                                {current.label} - {current.societyName}
                            </Text>
                        </View>
                        <TouchableOpacity style={S.closeBtn} onPress={onClose} hitSlop={8}>
                            <MaterialCommunityIcons name="close" size={20} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={S.loading}>
                            <ActivityIndicator size="small" color={SgateColors.gold} />
                            <Text style={S.loadingText}>Loading request...</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.content}>
                            <View style={S.messageCard}>
                                <Text style={[S.statusLabel, { color: meta.color }]}>{meta.label}</Text>
                                <Text style={S.messageText}>{details?.message || meta.message}</Text>
                            </View>

                            {reason ? (
                                <View style={S.reasonCard}>
                                    <Text style={S.reasonTitle}>
                                        {current.status === 'REJECTED' ? 'Rejection Reason' : 'Admin Note'}
                                    </Text>
                                    <Text style={S.reasonText}>{reason}</Text>
                                </View>
                            ) : null}

                            <View style={S.infoCard}>
                                <InfoRow label="Society" value={current.societyName} />
                                <InfoRow label="Block / Tower" value={current.blockName} />
                                <InfoRow label="Flat" value={current.flatNumber} />
                                <InfoRow
                                    label="Type"
                                    value={formatResidentType(current.residentType, current.isLivingHere)}
                                />
                                <InfoRow label="Submitted" value={formatDate(current.submittedAt)} />
                                {details?.reviewedAt ? (
                                    <InfoRow label="Reviewed" value={formatDate(details.reviewedAt)} />
                                ) : null}
                            </View>

                            <View style={S.docsCard}>
                                <Text style={S.sectionTitle}>Documents</Text>
                                {details?.documents?.length ? (
                                    details.documents.map((doc) => (
                                        <View key={doc.id} style={S.docRow}>
                                            <View style={S.docIcon}>
                                                <MaterialCommunityIcons
                                                    name="file-document-outline"
                                                    size={18}
                                                    color={SgateColors.goldDeep}
                                                />
                                            </View>
                                            <View style={S.docText}>
                                                <Text style={S.docName} numberOfLines={1}>
                                                    {formatDocType(doc.type)}
                                                </Text>
                                                <Text style={S.docMeta} numberOfLines={1}>
                                                    {doc.fileName || 'Uploaded document'}
                                                </Text>
                                            </View>
                                            {doc.isVerified ? (
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={18}
                                                    color={SgateColors.green}
                                                />
                                            ) : null}
                                        </View>
                                    ))
                                ) : (
                                    <Text style={S.emptyDocs}>No documents available.</Text>
                                )}
                            </View>
                        </ScrollView>
                    )}

                    <View style={S.actions}>
                        {showApplyAgain || showResubmit || showContinue ? (
                            <TouchableOpacity style={S.primaryBtn} onPress={handleApply} activeOpacity={0.82}>
                                <Text style={S.primaryText}>
                                    {showApplyAgain
                                        ? 'Fix & Apply Again'
                                        : showResubmit
                                            ? 'Update Documents'
                                            : 'Continue Application'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        {showApplyAgain || showResubmit || showContinue ? (
                            <TouchableOpacity style={S.secondaryBtn} onPress={handleEditSelection} activeOpacity={0.78}>
                                <Text style={S.secondaryText}>Change Block / Flat</Text>
                            </TouchableOpacity>
                        ) : null}

                        {canDelete ? (
                            <TouchableOpacity
                                style={S.deleteBtn}
                                onPress={confirmDelete}
                                activeOpacity={0.78}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color={SgateColors.red} />
                                ) : (
                                    <Text style={S.deleteText}>
                                        {current.status === 'PENDING_APPROVAL' ? 'Withdraw Request' : 'Delete Request'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <View style={S.infoRow}>
            <Text style={S.infoLabel}>{label}</Text>
            <Text style={S.infoValue} numberOfLines={2}>{value || '-'}</Text>
        </View>
    );
}

const S = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13,15,20,0.34)',
    },
    sheet: {
        maxHeight: '86%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    handle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
        marginBottom: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    statusIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 18,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    subtitle: {
        marginTop: 3,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loading: {
        minHeight: 220,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    content: {
        gap: 12,
        paddingBottom: 14,
    },
    messageCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        backgroundColor: BRAND_YELLOW_BG,
        padding: 14,
    },
    statusLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        textTransform: 'capitalize',
        marginBottom: 5,
    },
    messageText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        lineHeight: 19,
    },
    reasonCard: {
        borderRadius: 18,
        backgroundColor: SgateColors.redBg,
        padding: 14,
    },
    reasonTitle: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
        marginBottom: 5,
    },
    reasonText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        lineHeight: 19,
    },
    infoCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 14,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: SgateColors.borderSoft,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    infoValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    docsCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        backgroundColor: '#FFFFFF',
        padding: 14,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 10,
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
    },
    docIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docText: {
        flex: 1,
        minWidth: 0,
    },
    docName: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    docMeta: {
        marginTop: 2,
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    emptyDocs: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        paddingVertical: 8,
    },
    actions: {
        gap: 10,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
    primaryBtn: {
        height: 50,
        borderRadius: 16,
        backgroundColor: BRAND_YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    secondaryBtn: {
        height: 48,
        borderRadius: 16,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t2,
    },
    deleteBtn: {
        height: 48,
        borderRadius: 16,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
    },
});
