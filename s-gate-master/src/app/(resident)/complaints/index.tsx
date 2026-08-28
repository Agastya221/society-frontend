import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import { ComplaintScreenLayout } from '../../../components/complaints/ComplaintScreenLayout';
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
        <ComplaintScreenLayout
            headerContent={
                <View>
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
                    {/* ── Filter Chips ──────────────────────────────────────────── */}
                    <View style={S.filterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
                            {FILTERS.map(f => {
                                const active = filterStatus === f.key;
                                return (
                                    <TouchableOpacity
                                        key={f.key}
                                        style={[S.chip, active && S.chipActive]}
                                        onPress={() => setFilterStatus(f.key)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[S.chipText, active && S.chipTextActive]}>{f.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            }
        >
            {/* ── Error Banner ────────────────────────────────────────────── */}
            {error ? (
                <View style={S.errorBanner}>
                    <Text style={S.errorText}>{error}</Text>
                </View>
            ) : null}

            {/* ── Content ─────────────────────────────────────────────────── */}
            {isLoading ? (
                <AppLoader />
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
        </ComplaintScreenLayout>
    );
}

const S = StyleSheet.create({
    // Header
    headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 4 },
    addBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center', justifyContent: 'center',
    },

    // Error
    errorBanner: { backgroundColor: SgateColors.redBg, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    errorText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.red, textAlign: 'center' },

    // Filter Chips
    filterContainer: { paddingBottom: 12, paddingTop: 4 },
    filterScroll: { paddingHorizontal: 20, gap: 8 },
    chip: {
        paddingHorizontal: 18,
        minHeight: 40,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: SgateColors.surface,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    chipActive: {
        backgroundColor: SgateColors.gold,
        borderColor: SgateColors.gold,
    },
    chipText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    chipTextActive: { color: SgateColors.t1 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },

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
