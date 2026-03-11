import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Share, Text, TouchableOpacity, View } from 'react-native';
import { Complaint } from '../../services/complaints';
import { Card } from '../ui/Card';
import { ImageCarousel } from '../ui/ImageCarousel';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { PriorityBadge } from './PriorityBadge';

// Backend serves complaint images publicly at this base URL
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
    onDelete?: (complaint: Complaint) => void;  // Optional delete handler
    isDeleting?: boolean;  // Loading state for delete operation
}

export function ComplaintCard({ complaint, onPress, onDelete, isDeleting }: ComplaintCardProps) {
    const canDelete = complaint.status === 'OPEN' && onDelete;
    
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={isDeleting}>
            <Card className="mb-3 p-4">
                <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2 mb-2">
                            <PriorityBadge priority={complaint.priority} />
                            {complaint.isAnonymous && (
                                <View className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                    <Text className="text-[10px] font-bold text-gray-600 dark:text-gray-400">ANONYMOUS</Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                            {complaint.title}
                        </Text>
                        {complaint.location ? (
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <Ionicons name="location-outline" size={12} /> {complaint.location}
                            </Text>
                        ) : null}
                    </View>
                    <View className="flex-row items-center gap-2">
                        <ComplaintStatusBadge status={complaint.status} />
                        {canDelete && (
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onDelete(complaint);
                                }}
                                disabled={isDeleting}
                                className={`h-8 w-8 rounded-full items-center justify-center ${
                                    isDeleting 
                                        ? 'bg-gray-100 dark:bg-zinc-800' 
                                        : 'bg-red-50 dark:bg-red-900/20'
                                }`}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#EF4444" />
                                ) : (
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Text className="text-gray-500 dark:text-gray-400 text-sm mb-3" numberOfLines={2}>
                    {complaint.description}
                </Text>

                {/* Render complaint images */}
                {(() => {
                    const imageSources = (complaint.imageUrls && complaint.imageUrls.length > 0)
                        ? complaint.imageUrls.map(img => img.viewUrl)
                        : (complaint.images || []).map(path => `${IMAGE_BASE_URL}/${path}`);

                    return imageSources.length > 0 ? (
                        <View className="mb-3">
                            <ImageCarousel images={imageSources as string[]} height={200} />
                        </View>
                    ) : null;
                })()}

                <View className="flex-row justify-between items-center border-t border-gray-100 dark:border-zinc-800 pt-3 mt-1">
                    <View className="flex-1">
                        {!complaint.isAnonymous && complaint.reportedBy ? (
                            <View>
                                <Text className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Reported By</Text>
                                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{complaint.reportedBy.name}</Text>
                            </View>
                        ) : (
                            <View>
                                <Text className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Reported By</Text>
                                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">Anonymous</Text>
                            </View>
                        )}
                    </View>
                    {complaint.flat && (
                        <View className="items-end">
                            <Text className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">Flat</Text>
                            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{complaint.flat.flatNumber}</Text>
                        </View>
                    )}
                </View>
                <View className="flex-row items-center gap-3">
                        <TouchableOpacity 
                            onPress={async (e) => {
                                e.stopPropagation();
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
                            }}
                            className="flex-row items-center gap-1"
                        >
                            <Ionicons name="share-social-outline" size={14} className="text-gray-400" />
                            <Text className="text-xs text-gray-400 font-medium">Share</Text>
                        </TouchableOpacity>

                        {typeof complaint.likes === 'number' && (
                            <View className="flex-row items-center gap-1">
                                <Ionicons name="heart-outline" size={14} color="#9ca3af" />
                                <Text className="text-xs text-gray-400 font-medium">{complaint.likes}</Text>
                            </View>
                        )}

                        {complaint.comments && complaint.comments.length > 0 && (
                            <View className="flex-row items-center gap-1">
                                <Ionicons name="chatbubble-outline" size={14} className="text-gray-400" />
                                <Text className="text-xs text-gray-400 font-medium">{complaint.comments.length}</Text>
                            </View>
                        )}
                    </View>
            </Card>
        </TouchableOpacity>
    );
}
