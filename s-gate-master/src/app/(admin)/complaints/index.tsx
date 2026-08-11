import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
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
        AppAlert.show(
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
                            AppAlert.show('Success', message || 'Complaint deleted successfully');
                        } catch (err: any) {
                            console.error('[ADMIN] Failed to delete complaint:', err);
                            AppAlert.show('Error', err.message || 'Failed to delete complaint');
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
            {/* ── Header (matches Emergency Alerts) ─────────────────────── */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>All Complaints</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Resident complaints & issue tracking</Text>
                    </View>
                    {complaints.filter(c => c.status === 'OPEN').length > 0 && (
                        <View style={styles.openBadge}>
                            <View style={styles.openDot} />
                            <Text style={styles.openText}>{complaints.filter(c => c.status === 'OPEN').length} OPEN</Text>
                        </View>
                    )}
                </View>
                {/* Filter tabs */}
                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                        {FILTER_TABS.map(tab => (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setFilterStatus(tab.key)}
                                style={[styles.filterTab, filterStatus === tab.key && styles.filterTabActive]}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.filterText, filterStatus === tab.key && styles.filterTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {/* ── Error ──────────────────────────────────────────────────── */}
            {error ? (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

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

    // Header (matches Emergency Alerts)
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
    openBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SgateColors.goldDeep },
    openText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep, letterSpacing: 0.5 },

    // Error
    errorBar: {
        backgroundColor: SgateColors.redBg,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        padding: 12,
    },
    errorText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.red, textAlign: 'center' },

    // Filter
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    // List
    listContent: { padding: 20, flexGrow: 1 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10, textAlign: 'center' },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 4, textAlign: 'center' },
});
