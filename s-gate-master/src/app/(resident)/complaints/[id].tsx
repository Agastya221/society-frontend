import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageCarousel } from '../../../components/ui/ImageCarousel';
import { Complaint, fetchComplaintDetails } from '../../../services/complaints';

const IMAGE_BASE_URL = 'https://society-gate-backend-gsrq.onrender.com';

export default function ComplaintDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
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

    useEffect(() => {
        loadComplaint();
    }, [id]);

    // Auto-show rating modal once when complaint is RESOLVED
    useEffect(() => {
        if (complaint?.status === 'RESOLVED' && !ratingShownRef.current) {
            ratingShownRef.current = true;
            setTimeout(() => setShowRatingModal(true), 600);
        }
    }, [complaint?.status]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadComplaint();
    };

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

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text className="text-gray-500 dark:text-gray-400 mt-4">Loading details...</Text>
            </SafeAreaView>
        );
    }

    if (error || !complaint) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-black items-center justify-center">
                <Text className="text-red-500 dark:text-red-400 mb-4">{error || 'Complaint not found'}</Text>
                <TouchableOpacity onPress={() => router.back()} className="bg-indigo-600 px-6 py-3 rounded-lg">
                     <Text className="text-white font-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Logic for "Reported By"
    const getReportedByText = () => {
        if (complaint.isAnonymous) {
             const c = complaint as any;
             if (c.isOwn) return 'You';
             return 'Anonymous';
        }
        return complaint.reportedBy?.name || 'Unknown';
    };

    // Helper for Status Badge with specific colors
    const renderStatusBadge = () => {
        let bgClass = 'bg-gray-100 dark:bg-zinc-800';
        let textClass = 'text-gray-700 dark:text-gray-400';

        switch (complaint.status) {
            case 'OPEN':
                bgClass = 'bg-blue-100 dark:bg-blue-900/30';
                textClass = 'text-blue-700 dark:text-blue-400';
                break;
            case 'IN_PROGRESS':
                bgClass = 'bg-orange-100 dark:bg-orange-900/30'; // Specific requirement: Orange
                textClass = 'text-orange-700 dark:text-orange-400';
                break;
            case 'RESOLVED':
                bgClass = 'bg-green-100 dark:bg-green-900/30';
                textClass = 'text-green-700 dark:text-green-400';
                break;
            case 'CLOSED':
                bgClass = 'bg-gray-100 dark:bg-gray-900/30';
                textClass = 'text-gray-700 dark:text-gray-400';
                break;
        }

        return (
            <View className={`self-start px-3 py-1.5 rounded-full mb-4 ${bgClass}`}>
                <Text className={`font-bold text-xs uppercase ${textClass}`}>
                    Status: {complaint.status ? complaint.status.replace('_', ' ') : 'UNKNOWN'}
                </Text>
            </View>
        );
    };

    return (
        <>
        <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
            {/* 1. Header with Title + X close button */}
            <View className="px-5 py-3 flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
                 <Text className="font-bold text-lg text-gray-900 dark:text-white">Complaint Details</Text>
                 <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={handleShare} className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                        <Ionicons name="share-social-outline" size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800"
                    >
                        <Ionicons name="close" size={24} className="text-gray-700 dark:text-gray-300" />
                    </TouchableOpacity>
                 </View>
            </View>

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            >
                <View className="py-6">
                    {/* 2. Images section (if exists) */}
                    {/* 2. Images section (if exists) */}
                    {(() => {
                        const imageSources = (complaint.imageUrls && complaint.imageUrls.length > 0)
                            ? complaint.imageUrls.map(img => img.viewUrl)
                            : (complaint.images || []).map(path => `${IMAGE_BASE_URL}/${path}`);

                        return imageSources.length > 0 ? (
                            <View className="mb-6">
                                <ImageCarousel images={imageSources as string[]} height={300} resizeMode="contain" />
                            </View>
                        ) : null;
                    })()}

                    <View className="px-5">
                        {/* 3. Title */}
                        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-3">
                            {complaint.title}
                        </Text>

                        {/* 4. Status badge */}
                        {renderStatusBadge()}

                        {/* 5. Description */}
                        <View className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl mb-6">
                            <Text className="text-gray-800 dark:text-gray-200 text-base leading-relaxed">
                                {complaint.description}
                            </Text>
                        </View>

                        {/* 6. Metadata section */}
                        <View className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                            <Text className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                                Details
                            </Text>
                            
                            <View className="space-y-4">
                                {/* Category */}
                                <View className="flex-row justify-between border-b border-gray-50 dark:border-zinc-800 pb-2">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Category</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">{complaint.category}</Text>
                                </View>
                                
                                {/* Priority */}
                                <View className="flex-row justify-between border-b border-gray-50 dark:border-zinc-800 pb-2">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Priority</Text>
                                    <Text className={`font-medium ${
                                        complaint.priority === 'HIGH' || complaint.priority === 'CRITICAL' 
                                            ? 'text-red-600' 
                                            : 'text-gray-900 dark:text-gray-100'
                                    }`}>
                                        {complaint.priority}
                                    </Text>
                                </View>

                                {/* Location */}
                                <View className="flex-row justify-between border-b border-gray-50 dark:border-zinc-800 pb-2">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Location</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {complaint.location || 'None'}
                                    </Text>
                                </View>

                                {/* Assigned To */}
                                <View className="flex-row justify-between border-b border-gray-50 dark:border-zinc-800 pb-2">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Assigned To</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {complaint.assignedTo?.name || 'None'}
                                    </Text>
                                </View>

                                {/* Reported By */}
                                <View className="flex-row justify-between border-b border-gray-50 dark:border-zinc-800 pb-2">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Reported By</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {getReportedByText()}
                                    </Text>
                                </View>

                                {/* Created At */}
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Created At</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {new Date(complaint.createdAt).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
            
             <View style={{ height: insets.bottom, backgroundColor: 'white' }} className="dark:bg-zinc-900" />
        </SafeAreaView>

        {/* Post-Resolution Rating Modal */}

        <Modal
            visible={showRatingModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowRatingModal(false)}
        >
            <View style={rStyles.overlay}>
                <View style={rStyles.sheet}>
                    <View style={rStyles.handle} />
                    {/* Close button */}
                    <TouchableOpacity style={rStyles.closeBtn} onPress={() => setShowRatingModal(false)}>
                        <Feather name="x" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    {/* Title */}
                    <Text style={rStyles.title}>Ticket is Resolved</Text>
                    <Text style={rStyles.subtitle}>Please rate your experience of resolving this ticket.</Text>
                    {/* Stars */}
                    <View style={rStyles.starsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                                <Feather
                                    name="star"
                                    size={36}
                                    color={s <= rating ? '#FFB800' : '#e5e7eb'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                    {/* Comment */}
                    <TextInput
                        style={rStyles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        value={ratingComment}
                        onChangeText={setRatingComment}
                    />
                    {/* Submit */}
                    <TouchableOpacity
                        style={[rStyles.submitBtn, rating === 0 && rStyles.submitBtnDisabled]}
                        disabled={rating === 0}
                        onPress={() => {
                            setShowRatingModal(false);
                        }}
                    >
                        <Text style={[rStyles.submitBtnText, rating === 0 && rStyles.submitBtnTextDisabled]}>
                            Submit Feedback
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
        </>
    );
}

const rStyles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
        alignSelf: 'center', marginBottom: 16,
    },
    closeBtn: {
        position: 'absolute', top: 20, right: 20, padding: 4,
    },
    title: {
        fontSize: 18, fontFamily: 'Sora-Bold', color: '#0D0F14',
        textAlign: 'center', marginBottom: 8,
    },
    subtitle: {
        fontSize: 14, fontFamily: 'Sora-Regular', color: '#8A8D97',
        textAlign: 'center', marginBottom: 24, lineHeight: 20,
    },
    starsRow: {
        flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20,
    },
    commentInput: {
        borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
        padding: 12, minHeight: 80, textAlignVertical: 'top',
        fontFamily: 'Sora-Regular', fontSize: 14, color: '#0D0F14',
        marginBottom: 20,
    },
    submitBtn: {
        backgroundColor: '#0D0F14', borderRadius: 14, paddingVertical: 16,
        alignItems: 'center',
    },
    submitBtnDisabled: { backgroundColor: '#e5e7eb' },
    submitBtnText: {
        fontSize: 15, fontFamily: 'Sora-SemiBold', color: '#fff',
    },
    submitBtnTextDisabled: { color: '#9ca3af' },
});
