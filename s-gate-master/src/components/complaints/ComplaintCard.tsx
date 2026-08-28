import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Complaint } from '../../services/complaints';
import { ImageCarousel } from '../ui/ImageCarousel';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';

const IMAGE_BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

interface ComplaintCardProps {
    complaint: Complaint & {
        flatNumber?: string;
        priority?: string;
        images?: string[];
        likes?: number;
        comments?: any[];
        createdBy?: string;
    };
    onPress: () => void;
    onDelete?: (complaint: Complaint) => void;
    isDeleting?: boolean;
}

export function ComplaintCard({ complaint, onPress, onDelete, isDeleting }: ComplaintCardProps) {
    const canDelete = complaint.status === 'OPEN' && onDelete;

    const handleShare = async () => {
        try {
            await Share.share({
                message: [
                    `Complaint: ${complaint.title}`,
                    `Category: ${complaint.category}`,
                    `Priority: ${complaint.priority}`,
                    `Status: ${complaint.status}`,
                    `Flat: ${complaint.flat?.flatNumber || 'N/A'}`
                ].join('\n'),
            });
        } catch (error: any) {
            console.error(error.message);
        }
    };

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.97} disabled={isDeleting}>
            <View style={S.card}>
                {/* Top row: priority + status + delete */}
                <View style={S.topRow}>
                    <View style={S.badgesLeft}>
                        <PriorityBadge priority={complaint.priority} />
                        {complaint.isAnonymous && (
                            <View style={S.anonBadge}>
                                <Text style={S.anonText}>ANONYMOUS</Text>
                            </View>
                        )}
                    </View>
                    <View style={S.badgesRight}>
                        <ComplaintStatusBadge status={complaint.status} />
                        {canDelete && (
                            <TouchableOpacity
                                onPress={(e) => { e.stopPropagation(); onDelete(complaint); }}
                                disabled={isDeleting}
                                style={S.deleteBtn}
                            >
                                {isDeleting
                                    ? <ActivityIndicator size="small" color={SgateColors.red} />
                                    : <MaterialCommunityIcons name="delete-outline" size={18} color={SgateColors.red} />
                                }
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Title */}
                <Text style={S.title}>{complaint.title}</Text>

                {/* Location */}
                {complaint.location ? (
                    <View style={S.locationRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={SgateColors.t3} />
                        <Text style={S.locationText}>{complaint.location}</Text>
                    </View>
                ) : null}

                {/* Description */}
                <Text style={S.description} numberOfLines={3}>{complaint.description}</Text>

                {/* Images */}
                {(() => {
                    const imageSources = (complaint.imageUrls && complaint.imageUrls.length > 0)
                        ? complaint.imageUrls.map(img => img.viewUrl)
                        : (complaint.images || []).map(path => `${IMAGE_BASE_URL}/${path}`);
                    return imageSources.length > 0 ? (
                        <View style={{ marginBottom: 14 }}>
                            <ImageCarousel images={imageSources as string[]} height={200} />
                        </View>
                    ) : null;
                })()}

                {/* Reporter + Flat */}
                <View style={S.footerDivider} />
                <View style={S.footerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={S.footerLabel}>REPORTED BY</Text>
                        <Text style={S.footerValue}>
                            {!complaint.isAnonymous && complaint.reportedBy ? complaint.reportedBy.name : 'Anonymous'}
                        </Text>
                    </View>
                    {complaint.flat && (
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={S.footerLabel}>FLAT</Text>
                            <Text style={S.footerValue}>{complaint.flat.flatNumber}</Text>
                        </View>
                    )}
                </View>

                {/* Actions row */}
                <View style={S.actionsRow}>
                    <TouchableOpacity onPress={handleShare} style={S.shareBtn}>
                        <MaterialCommunityIcons name="share-variant-outline" size={14} color={SgateColors.t4} />
                        <Text style={S.shareText}>Share</Text>
                    </TouchableOpacity>
                    {typeof complaint.likes === 'number' && (
                        <View style={S.statItem}>
                            <MaterialCommunityIcons name="heart-outline" size={14} color={SgateColors.t4} />
                            <Text style={S.statText}>{complaint.likes}</Text>
                        </View>
                    )}
                    {complaint.comments && complaint.comments.length > 0 && (
                        <View style={S.statItem}>
                            <MaterialCommunityIcons name="comment-outline" size={14} color={SgateColors.t4} />
                            <Text style={S.statText}>{complaint.comments.length}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const S = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    badgesLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    badgesRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    anonBadge: { backgroundColor: '#F2F2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    anonText: { fontSize: 9, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5 },
    deleteBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1, lineHeight: 22, marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    locationText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, flex: 1 },
    description: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 21, marginBottom: 14 },
    footerDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 12 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    footerLabel: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t4, letterSpacing: 0.8, marginBottom: 2 },
    footerValue: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    shareBtn: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
    shareText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t4 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t4 },
});
