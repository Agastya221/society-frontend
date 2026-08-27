import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, RefreshControl, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeBottomSheetSurface } from '@/components/ui/SafeBottomSheetSurface';
import { ComplaintScreenLayout } from '../../../components/complaints/ComplaintScreenLayout';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ImageCarousel } from '../../../components/ui/ImageCarousel';
import { Complaint, fetchComplaintDetails } from '../../../services/complaints';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';

const IMAGE_BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

// ─── Status & Priority Configs ──────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string }> = {
    OPEN:        { bg: '#EAF2FF', text: '#2F6FED' },
    IN_PROGRESS: { bg: '#FFF6D6', text: '#C58A00' },
    RESOLVED:    { bg: '#E6F7EC', text: '#2EAD65' },
    CLOSED:      { bg: '#F2F2F2', text: '#777777' },
};

const PRIORITY_CFG: Record<string, { bg: string; text: string; dot: string }> = {
    LOW:      { bg: '#E6F7EC', text: '#2EAD65', dot: '#2EAD65' },
    MEDIUM:   { bg: '#FFF6D6', text: '#C58A00', dot: '#C58A00' },
    HIGH:     { bg: '#FFECEC', text: '#E54848', dot: '#E54848' },
    CRITICAL: { bg: '#FFECEC', text: '#E54848', dot: '#E54848' },
};

// ─── Detail Row Component ───────────────────────────────────────────────────
function DetailItem({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
    return (
        <View style={S.detailItem}>
            <View style={S.detailIconWrap}>
                <MaterialCommunityIcons name={icon} size={18} color={SgateColors.goldDeep} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={S.detailLabel}>{label}</Text>
                <Text style={S.detailValue}>{value}</Text>
            </View>
        </View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ComplaintDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');

    // Rating modal state
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const ratingShownRef = useRef(false);

    const loadComplaint = async () => {
        if (!id) return;
        try {
            setError('');
            const data = await fetchComplaintDetails(id);
            setComplaint(data);
        } catch (err: any) {
            console.error('Failed to load complaint details:', err);
            setError(err.message || 'Failed to load complaint details');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { loadComplaint(); }, [id]);

    // Auto-show rating modal once when complaint is RESOLVED
    useEffect(() => {
        if (complaint?.status === 'RESOLVED' && !ratingShownRef.current) {
            ratingShownRef.current = true;
            setTimeout(() => setShowRatingModal(true), 600);
        }
    }, [complaint?.status]);

    const handleRefresh = () => { setIsRefreshing(true); loadComplaint(); };

    const handleShare = async () => {
        if (!complaint) return;
        try {
            await Share.share({
                message: [
                    `Complaint: ${complaint.title}`,
                    `Category: ${complaint.category}`,
                    `Priority: ${complaint.priority}`,
                    `Status: ${complaint.status}`,
                    `Flat: ${complaint.flat?.flatNumber || 'N/A'}`,
                    `Created on: ${new Date(complaint.createdAt).toLocaleDateString()}`
                ].join('\n'),
            });
        } catch (error: any) {
            console.error(error.message);
        }
    };

    // ─── Loading State ──────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={S.root}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <AppLoader />
            </View>
        );
    }

    // ─── Error State ────────────────────────────────────────────────────────────
    if (error || !complaint) {
        return (
            <View style={S.root}>
                <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
                <View style={S.center}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color={SgateColors.red} />
                    <Text style={S.errorText}>{error || 'Complaint not found'}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={S.errorBtn}>
                        <Text style={S.errorBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const getReportedByText = () => {
        if (complaint.isAnonymous) {
            const c = complaint as any;
            if (c.isOwn) return 'You';
            return 'Anonymous';
        }
        return complaint.reportedBy?.name || 'Unknown';
    };

    const statusCfg = STATUS_CFG[complaint.status] ?? STATUS_CFG.OPEN;
    const priorityCfg = PRIORITY_CFG[complaint.priority] ?? PRIORITY_CFG.MEDIUM;

    return (
        <>
        <ComplaintScreenLayout
            headerContent={
                <View style={S.headerInner}>
                    <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={S.headerTitle}>Complaint Details</Text>
                    <View style={S.headerActions}>
                        <TouchableOpacity onPress={handleShare} style={S.headerIconBtn}>
                            <MaterialCommunityIcons name="share-variant-outline" size={20} color={SgateColors.t2} />
                        </TouchableOpacity>
                    </View>
                </View>
            }
        >
            {/* ── Content ─────────────────────────────────────────────────── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={S.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
            >
                {/* Images */}
                {(() => {
                    const imageSources = (complaint.imageUrls && complaint.imageUrls.length > 0)
                        ? complaint.imageUrls.map(img => img.viewUrl)
                        : (complaint.images || []).map(path => `${IMAGE_BASE_URL}/${path}`);
                    return imageSources.length > 0 ? (
                        <View style={{ marginBottom: 20, marginHorizontal: -16 }}>
                            <ImageCarousel images={imageSources as string[]} height={280} resizeMode="contain" />
                        </View>
                    ) : null;
                })()}

                {/* Title + Status */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={S.complaintTitle}>{complaint.title}</Text>
                    <View style={S.badgeRow}>
                        <View style={[S.statusBadge, { backgroundColor: statusCfg.bg }]}>
                            <Text style={[S.statusText, { color: statusCfg.text }]}>{complaint.status.replace('_', ' ')}</Text>
                        </View>
                        <View style={[S.priorityBadge, { backgroundColor: priorityCfg.bg }]}>
                            <View style={[S.priorityDot, { backgroundColor: priorityCfg.dot }]} />
                            <Text style={[S.priorityText, { color: priorityCfg.text }]}>{complaint.priority}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Description Card */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={S.descCard}>
                    <Text style={S.descText}>{complaint.description}</Text>
                </Animated.View>

                {/* Details Section */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={S.detailsCard}>
                    <Text style={S.sectionTitle}>Details</Text>

                    {complaint.location ? (
                        <DetailItem icon="map-marker-outline" label="Location" value={complaint.location} />
                    ) : null}
                    <DetailItem icon="folder-outline" label="Category" value={complaint.category} />
                    <DetailItem icon="account-outline" label="Reported by" value={getReportedByText()} />
                    {complaint.flat?.flatNumber ? (
                        <DetailItem icon="home-outline" label="Flat" value={complaint.flat.flatNumber} />
                    ) : null}
                    {complaint.assignedTo?.name ? (
                        <DetailItem icon="account-check-outline" label="Assigned to" value={complaint.assignedTo.name} />
                    ) : null}
                    <DetailItem icon="clock-outline" label="Created" value={new Date(complaint.createdAt).toLocaleString()} />
                    {complaint.resolvedAt ? (
                        <DetailItem icon="check-circle-outline" label="Resolved" value={new Date(complaint.resolvedAt).toLocaleString()} />
                    ) : null}

                    {complaint.resolution ? (
                        <>
                            <View style={S.resolutionDivider} />
                            <Text style={S.resolutionLabel}>Resolution</Text>
                            <Text style={S.resolutionText}>{complaint.resolution}</Text>
                        </>
                    ) : null}
                </Animated.View>
            </ScrollView>
        </ComplaintScreenLayout>

        {/* ── Rating Modal ────────────────────────────────────────────────── */}
        <Modal visible={showRatingModal} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowRatingModal(false)}>
            <View style={R.overlay}>
                <SafeBottomSheetSurface style={R.sheet} showHandle minimumBottomPadding={20}>
                    <TouchableOpacity style={R.closeBtn} onPress={() => setShowRatingModal(false)}>
                        <Feather name="x" size={20} color={SgateColors.t3} />
                    </TouchableOpacity>
                    <Text style={R.title}>Ticket is Resolved</Text>
                    <Text style={R.subtitle}>Please rate your experience of resolving this ticket.</Text>
                    <View style={R.starsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                                <MaterialCommunityIcons
                                    name={s <= rating ? 'star' : 'star-outline'}
                                    size={36}
                                    color={s <= rating ? SgateColors.gold : '#E0E0E0'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={R.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor={SgateColors.t4}
                        multiline
                        value={ratingComment}
                        onChangeText={setRatingComment}
                    />
                    <TouchableOpacity
                        style={[R.submitBtn, rating === 0 && R.submitBtnDisabled]}
                        disabled={rating === 0}
                        onPress={() => setShowRatingModal(false)}
                    >
                        <Text style={[R.submitBtnText, rating === 0 && R.submitBtnTextDisabled]}>Submit Feedback</Text>
                    </TouchableOpacity>
                </SafeBottomSheetSurface>
            </View>
        </Modal>
        </>
    );
}

// ─── Main Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

    // Header
    headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerIconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },

    // Error
    errorText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.red, marginTop: 12, textAlign: 'center' },
    errorBtn: { marginTop: 20, backgroundColor: SgateColors.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
    errorBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    // Title + Badges
    complaintTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: '#111', lineHeight: 30, marginBottom: 12 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },
    priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    priorityDot: { width: 7, height: 7, borderRadius: 4 },
    priorityText: { fontSize: 11, fontFamily: SgateFonts.bold, letterSpacing: 0.5 },

    // Description
    descCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    },
    descText: { fontSize: 15, fontFamily: SgateFonts.regular, color: '#444', lineHeight: 24 },

    // Details
    detailsCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    },
    sectionTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: '#111', marginBottom: 16 },
    detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
    detailIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    detailLabel: { fontSize: 11, fontFamily: SgateFonts.medium, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
    detailValue: { fontSize: 15, fontFamily: SgateFonts.medium, color: '#111' },

    // Resolution
    resolutionDivider: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 16 },
    resolutionLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
    resolutionText: { fontSize: 14, fontFamily: SgateFonts.regular, color: '#444', lineHeight: 22 },
});

// ─── Rating Modal Styles ────────────────────────────────────────────────────────
const R = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { paddingHorizontal: 24 },
    closeBtn: { position: 'absolute', top: 20, right: 20, padding: 4 },
    title: { fontSize: 18, fontFamily: SgateFonts.bold, color: '#111', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: SgateFonts.regular, color: '#999', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
    commentInput: { borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top', fontFamily: SgateFonts.regular, fontSize: 14, color: '#111', marginBottom: 20, backgroundColor: '#FAFAFA' },
    submitBtn: { backgroundColor: SgateColors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: '#E8E8E8' },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    submitBtnTextDisabled: { color: '#999' },
});
