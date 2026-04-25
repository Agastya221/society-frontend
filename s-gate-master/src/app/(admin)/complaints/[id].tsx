import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ComplaintStatusBadge } from '../../../components/complaints/ComplaintStatusBadge';
import { PriorityBadge } from '../../../components/complaints/PriorityBadge';
import { ImageCarousel } from '../../../components/ui/ImageCarousel';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
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
        
        // If resolving, we might need a note (simplified here: just status)
        // If moving to RESOLVED, maybe prompt for note? 
        // For this iteration, we'll just update status directly.
        
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
            <SafeAreaView className="flex-1 bg-white dark:bg-black items-center justify-center">
                <AppLoader />
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
            // Admin can see who reported even if anonymous? 
            // Usually yes, but let's respect the flag unless requirement says otherwise.
            // Requirement said "but admin can updated..." implies admin view.
            // Let's show "Anonymous (Hidden)" or similar if real name is available in data.
            // If API hides it, we can't show it.
            return 'Anonymous';
        }
        return complaint.reportedBy?.name || 'Unknown';
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-3 flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800">
                 <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                    </TouchableOpacity>
                    <Text className="font-bold text-lg text-gray-900 dark:text-white">Admin View</Text>
                 </View>
                 <TouchableOpacity onPress={handleShare} className="h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                    <Ionicons name="share-social-outline" size={22} className="text-indigo-600 dark:text-indigo-400" />
                 </TouchableOpacity>
            </View>

            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            >
                {/* Main Content */}
                <View className="px-5 py-6">
                    {/* Status & ID */}
                    <View className="flex-row justify-between items-start mb-4">
                        <View>
                            <Text className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase mb-1">
                                {complaint.category} • {complaint.ticketNumber || 'NO ID'}
                            </Text>
                            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                {complaint.title}
                            </Text>
                        </View>
                        <ComplaintStatusBadge status={complaint.status} />
                    </View>

                    {/* Priority & Date */}
                    <View className="flex-row items-center gap-3 mb-6">
                        <PriorityBadge priority={complaint.priority} />
                        <View className="h-1 w-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(complaint.createdAt).toLocaleString()}
                        </Text>
                    </View>

                    {/* Description */}
                    <View className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl mb-6">
                        <Text className="text-gray-800 dark:text-gray-200 text-base leading-relaxed">
                            {complaint.description}
                        </Text>
                    </View>

                    {/* Images */}
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

                    {/* ACTIONS SECTION (Admin Only) */}
                    <View className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 mb-6">
                        <Text className="text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase mb-3">
                            Admin Actions
                        </Text>
                        
                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <PrimaryButton 
                                    title="Update Status" 
                                    onPress={() => setShowStatusModal(true)} 
                                    variant="outline"
                                />
                            </View>
                            <View className="flex-1">
                                <PrimaryButton 
                                    title="Assign Staff" 
                                    onPress={() => setShowAssignModal(true)} 
                                    variant="outline"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Resolution info if resolved */}
                    {complaint.status === 'RESOLVED' && (
                        <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                            <View className="flex-row items-center gap-2 mb-2">
                                <Ionicons name="checkmark-circle" size={20} color="#15803d" />
                                <Text className="font-bold text-green-800 dark:text-green-300">Resolved</Text>
                            </View>
                            {complaint.resolution && (
                                <Text className="text-green-700 dark:text-green-400 text-sm mb-2">
                                    {complaint.resolution}
                                </Text>
                            )}
                            <Text className="text-green-600 dark:text-green-500 text-xs">
                                Resolved on {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleString() : 'Unknown date'}
                                {complaint.resolvedBy ? ` by ${complaint.resolvedBy.name}` : ''}
                            </Text>
                        </View>
                    )}

                    {/* Details Card */}
                    <View className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                        <Text className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                            Ticket Information
                        </Text>
                        
                        <View className="space-y-4">
                            <View className="flex-row justify-between">
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Reported By</Text>
                                <View className="items-end">
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {getReportedByText()}
                                    </Text>
                                    {!complaint.isAnonymous && complaint.reportedBy?.phone && (
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{complaint.reportedBy.phone}</Text>
                                    )}
                                </View>
                            </View>

                            <View className="flex-row justify-between">
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Flat/Unit</Text>
                                <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                    {complaint.flat?.flatNumber || 'Not Associated'}
                                </Text>
                            </View>

                            {complaint.location && (
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Location</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">{complaint.location}</Text>
                                </View>
                            )}

                             <View className="flex-row justify-between">
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Created</Text>
                                <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                    {new Date(complaint.createdAt).toLocaleString()}
                                </Text>
                            </View>

                            {/* Assignment Info with explicit value for admins */}
                            <View className="flex-row justify-between">
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Assigned To</Text>
                                <View className="items-end">
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {complaint.assignedTo?.name || 'Unassigned'}
                                    </Text>
                                    {complaint.assignedTo?.role && (
                                        <Text className="text-gray-500 dark:text-gray-400 text-xs">{complaint.assignedTo.role}</Text>
                                    )}
                                </View>
                            </View>

                             {complaint.assignedAt && (
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Assigned On</Text>
                                    <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                        {new Date(complaint.assignedAt).toLocaleString()}
                                    </Text>
                                </View>
                            )}

                            <View className="flex-row justify-between">
                                <Text className="text-gray-500 dark:text-gray-400 text-sm">Last Updated</Text>
                                <Text className="text-gray-900 dark:text-gray-100 font-medium">
                                    {new Date(complaint.updatedAt).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* STATUS MODAL */}
            <Modal visible={showStatusModal} transparent animationType="fade">
                 <View className="flex-1 bg-black/60 items-center justify-center p-4">
                     <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">Update Status</Text>
                        
                        <View className="gap-3">
                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                                <TouchableOpacity 
                                    key={status}
                                    onPress={() => {
                                        if (status === 'RESOLVED') {
                                            // Handle resolution flow if needed
                                            // For V1, just update immediately similar to others
                                            handleUpdateStatus(status as ComplaintStatus);
                                        } else {
                                            handleUpdateStatus(status as ComplaintStatus);
                                        }
                                    }}
                                    className={`p-4 rounded-xl border ${
                                        complaint.status === status 
                                            ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' 
                                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <Text className={`font-semibold ${
                                         complaint.status === status ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'
                                    }`}>
                                        {status.replace('_', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity onPress={() => setShowStatusModal(false)} className="mt-4 p-3 items-center">
                            <Text className="text-gray-500 font-medium">Cancel</Text>
                        </TouchableOpacity>
                     </View>
                 </View>
            </Modal>

            {/* ASSIGNMENT MODAL */}
            <Modal visible={showAssignModal} transparent animationType="slide">
                 <View className="flex-1 bg-black/60 justify-end">
                     <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 h-3/4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">Assign Staff</Text>
                            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* List of staff */}
                        <ScrollView className="flex-1">
                            {staffList.length === 0 ? (
                                <Text className="text-center text-gray-500 mt-10">No staff members found.</Text>
                            ) : (
                                staffList.map((staff) => (
                                    <TouchableOpacity 
                                        key={staff.id}
                                        onPress={() => handleAssignStaff(staff.id)}
                                        className={`flex-row items-center p-4 mb-3 rounded-xl border ${
                                            complaint.assignedTo?.id === staff.id
                                                ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30'
                                                : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700'
                                        }`}
                                    >
                                        <View className="h-10 w-10 bg-gray-200 dark:bg-zinc-700 rounded-full items-center justify-center mr-3">
                                            <Text className="text-gray-600 dark:text-gray-300 font-bold">
                                                {staff.name.charAt(0)}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text className="font-bold text-gray-900 dark:text-white">{staff.name}</Text>
                                            <Text className="text-xs text-gray-500">{staff.role} • {staff.phone}</Text>
                                        </View>
                                        {complaint.assignedTo?.id === staff.id && (
                                            <View className="ml-auto">
                                                <Ionicons name="checkmark-circle" size={24} color="#4f46e5" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                     </View>
                 </View>
            </Modal>

             <View style={{ height: insets.bottom, backgroundColor: 'white' }} className="dark:bg-zinc-900" />
        </SafeAreaView>
    );
}
