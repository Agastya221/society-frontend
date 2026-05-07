import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { ComplaintCard } from '../../../components/complaints/ComplaintCard';
import { Complaint, ComplaintStatus, deleteComplaint, fetchComplaints } from '../../../services/complaints';

const FILTER_TABS: { key: ComplaintStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' },
];

export default function AdminComplaintsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'ALL'>('ALL');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch complaints from API
    const loadComplaints = async (isRefresh = false) => {
        if (!isRefresh) {
            setIsLoading(true);
        }
        setError('');

        try {
            console.log('📥 [ADMIN] Fetching complaints...');
            const data = await fetchComplaints();
            
            console.log('✅ [ADMIN] Fetched complaints count:', data.length);
            console.log('📋 [ADMIN] Full complaints data:', JSON.stringify(data, null, 2));
            
            // Log each complaint individually for easier reading
            data.forEach((complaint, index) => {
                console.log(`\n📝 [ADMIN] Complaint ${index + 1}:`, {
                    id: complaint.id,
                    title: complaint.title,
                    status: complaint.status,
                    priority: complaint.priority,
                    category: complaint.category,
                    reportedBy: complaint.reportedBy?.name || 'Anonymous',
                    flat: complaint.flat?.flatNumber || 'N/A',
                    images: complaint.images || [],
                    createdAt: complaint.createdAt,
                });
            });
            
            setComplaints(data);
        } catch (err: any) {
            console.error('❌ [ADMIN] Failed to fetch complaints:', err);
            setError(err.message || 'Failed to load complaints');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Fetch on screen mount and when focused
    useFocusEffect(
        useCallback(() => {
            loadComplaints();
        }, [])
    );

    // Pull to refresh handler
    const handleRefresh = () => {
        setIsRefreshing(true);
        loadComplaints(true);
    };

    // Delete complaint handler
    const handleDeleteComplaint = (complaint: Complaint) => {
        // Show confirmation alert
        Alert.alert(
            'Delete Complaint',
            'Are you sure you want to delete this complaint?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingId(complaint.id);
                            
                            // Call delete API
                            const message = await deleteComplaint(complaint.id);
                            
                            // Remove from local state (optimistic update)
                            setComplaints(prev => prev.filter(c => c.id !== complaint.id));
                            
                            // Show success alert
                            Alert.alert('Success', message || 'Complaint deleted successfully');
                        } catch (err: any) {
                            console.error('[ADMIN] Failed to delete complaint:', err);
                            Alert.alert('Error', err.message || 'Failed to delete complaint');
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    // Filter complaints by status
    const filteredComplaints = complaints.filter(c => 
        filterStatus === 'ALL' ? true : c.status === filterStatus
    );

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Complaints</Text>
            </View>

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error ? (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            {/* ── Filter Tabs ────────────────────────────────────────────── */}
            <View style={styles.filterWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {FILTER_TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setFilterStatus(tab.key)}
                            style={[styles.filterChip, filterStatus === tab.key && styles.filterChipActive]}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.filterChipText, filterStatus === tab.key && styles.filterChipTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* ── Content ────────────────────────────────────────────────── */}
            {isLoading ? (
                <View style={styles.centered}>
                    <AppLoader />
                </View>
            ) : (
                <FlatList
                    data={filteredComplaints}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ComplaintCard 
                            complaint={item} 
                            onPress={() => {
                                console.log('📱 [ADMIN] Navigating to complaint:', item.id);
                                router.push(`/(admin)/complaints/${item.id}` as any);
                            }}
                            onDelete={handleDeleteComplaint}
                            isDeleting={deletingId === item.id}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={SgateColors.gold}
                            colors={[SgateColors.gold]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialCommunityIcons name="check-circle-outline" size={48} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>
                                {filterStatus === 'ALL' ? 'No complaints found' : `No ${filterStatus.toLowerCase().replace('_', ' ')} complaints`}
                            </Text>
                            <Text style={styles.emptySub}>
                                Complaints submitted by residents will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },

    // Error
    errorBar: {
        backgroundColor: SgateColors.redBg,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        padding: 12,
    },
    errorText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.red, textAlign: 'center' },

    // Filter
    filterWrapper: {
        backgroundColor: SgateColors.card,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    filterRow: { paddingHorizontal: 20, gap: 8 },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: SgateColors.surface,
    },
    filterChipActive: { backgroundColor: SgateColors.black },
    filterChipText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterChipTextActive: { color: '#FFFFFF' },

    // List
    listContent: { padding: 20, flexGrow: 1 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10, textAlign: 'center' },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 4, textAlign: 'center' },
});
