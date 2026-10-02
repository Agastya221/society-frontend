import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useScrollBottomPadding } from '@/hooks/useScrollBottomPadding';
import { AppLoader } from '@/components/ui/AppLoader';
import { ScreenHeader, HeaderIconButton } from '@/components/layout/ScreenHeader';
import { ComplaintCard } from '../../../components/complaints/ComplaintCard';
import { Complaint, ComplaintStatus, deleteComplaint, fetchComplaints } from '../../../services/complaints';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateColors, SgateFonts, SgateLayout } from '../../../constants/Sgate-theme';

const FILTERS: { key: ComplaintStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' },
];

export default function ComplaintsScreen() {
    const scrollBottomPadding = useScrollBottomPadding();
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'ALL'>('ALL');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadComplaints = async (isRefresh = false) => {
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
            <ScreenHeader
                title="Complaints"
                rightAction={
                    <HeaderIconButton
                        icon="plus"
                        onPress={() => router.push('/(resident)/complaints/create')}
                        accessibilityLabel="Create complaint"
                    />
                }
            >
                {/* ── Filter Chips ──────────────────────────────────────────── */}
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
            </ScreenHeader>

            <View style={S.spacer} />

            <View style={S.contentWrapper}>
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
                    contentContainerStyle={[S.listContent, { paddingBottom: scrollBottomPadding }]}
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
        </View>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    spacer: { height: 6 },
    contentWrapper: { flex: 1 },

    // Error
    errorBanner: { backgroundColor: SgateColors.redBg, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    errorText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.red, textAlign: 'center' },

    // Filter Chips
    filterScroll: { paddingHorizontal: SgateLayout.screenGutter, gap: 8 },
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

    listContent: { paddingHorizontal: SgateLayout.screenGutter, paddingBottom: 40 },

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
