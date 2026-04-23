import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComplaintCard } from '../../../components/complaints/ComplaintCard';
import { Complaint, ComplaintStatus, deleteComplaint, fetchComplaints } from '../../../services/complaints';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';

const FILTERS: { key: ComplaintStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' },
];

export default function ComplaintsScreen() {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'ALL'>('ALL');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadComplaints = async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true);
        setError('');
        try {
            const data = await fetchComplaints();
            setComplaints(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load complaints');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { loadComplaints(); }, []));

    const handleRefresh = () => { setIsRefreshing(true); loadComplaints(true); };

    const handleDeleteComplaint = (complaint: Complaint) => {
        AppAlert.show('Delete Complaint', 'Are you sure you want to delete this complaint?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        setDeletingId(complaint.id);
                        const message = await deleteComplaint(complaint.id);
                        setComplaints(prev => prev.filter(c => c.id !== complaint.id));
                        AppAlert.show('Success', message || 'Complaint deleted successfully');
                    } catch (err: any) {
                        AppAlert.show('Error', err.message || 'Failed to delete complaint');
                    } finally {
                        setDeletingId(null);
                    }
                },
            },
        ]);
    };

    const filteredComplaints = Array.isArray(complaints)
        ? complaints.filter(c => filterStatus === 'ALL' ? true : c.status === filterStatus)
        : [];

    return (
        <View style={S.root}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={S.headerBg}>
                <SafeAreaView edges={['top']}>
                    <View style={S.headerInner}>
                        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                        </TouchableOpacity>
                        <Text style={S.headerTitle}>Complaints</Text>
                        <TouchableOpacity
                            style={S.addBtn}
                            onPress={() => router.push('/(resident)/complaints/create')}
                        >
                            <Feather name="plus" size={20} color={SgateColors.t1} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* ── Error Banner ────────────────────────────────────────────── */}
            {error ? (
                <View style={S.errorBanner}>
                    <Text style={S.errorText}>{error}</Text>
                </View>
            ) : null}

            {/* ── Filter Tabs ────────────────────────────────────────────── */}
            <View style={S.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
                    <View style={S.filterBar}>
                        {FILTERS.map(f => (
                            <TouchableOpacity
                                key={f.key}
                                style={[S.filterItem, filterStatus === f.key && S.filterItemActive]}
                                onPress={() => setFilterStatus(f.key)}
                            >
                                <Text style={[S.filterText, filterStatus === f.key && S.filterTextActive]}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* ── Content ─────────────────────────────────────────────────── */}
            {isLoading ? (
                <View style={S.center}>
                    <ActivityIndicator size="large" color={SgateColors.gold} />
                </View>
            ) : (
                <FlatList
                    data={filteredComplaints}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ComplaintCard
                            complaint={item}
                            onPress={() => router.push(`/(resident)/complaints/${item.id}` as any)}
                            onDelete={handleDeleteComplaint}
                            isDeleting={deletingId === item.id}
                        />
                    )}
                    contentContainerStyle={S.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={SgateColors.gold}
                            colors={[SgateColors.gold]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={S.emptyWrap}>
                            <View style={S.emptyIconCircle}>
                                <MaterialCommunityIcons name="message-text-outline" size={32} color={SgateColors.goldDeep} />
                            </View>
                            <Text style={S.emptyTitle}>
                                {filterStatus === 'ALL' ? 'No complaints yet' : `No ${filterStatus.toLowerCase().replace('_', ' ')} complaints`}
                            </Text>
                            <Text style={S.emptySub}>File a complaint and it will appear here</Text>
                            <TouchableOpacity
                                onPress={() => router.push('/(resident)/complaints/create')}
                                style={S.emptyBtn}
                            >
                                <Feather name="plus" size={16} color={SgateColors.t1} />
                                <Text style={S.emptyBtnText}>Create Complaint</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header
    headerBg: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12 },
    addBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
    },

    // Error
    errorBanner: { backgroundColor: SgateColors.redBg, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    errorText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.red, textAlign: 'center' },

    // Filter Tabs
    filterContainer: { backgroundColor: '#FFFFFF', paddingVertical: 10 },
    filterScroll: { paddingHorizontal: 16 },
    filterBar: { flexDirection: 'row', backgroundColor: '#F2F2F2', borderRadius: 14, padding: 4 },
    filterItem: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11 },
    filterItemActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: '#888' },
    filterTextActive: { color: SgateColors.t1 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 40 },

    // Empty State
    emptyWrap: { alignItems: 'center', paddingTop: 60 },
    emptyIconCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 6 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', marginBottom: 24 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: SgateColors.gold, borderRadius: 14,
        paddingHorizontal: 24, paddingVertical: 14,
    },
    emptyBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
