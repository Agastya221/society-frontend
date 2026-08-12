import api from '@/services/api';
import { GuardColors } from '@/constants/theme';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface PendingEntry {
    id: string;
    visitorName: string;
    type: string;
    flat?: { flatNumber?: string; number?: string; resident?: { name: string } };
    flatNumber?: string;
    flatLabel?: string;
    purpose?: string;
    createdAt: string;
    status: string;
    rejectionReason?: string;
}

const TYPE_COLORS: Record<string, string> = {
    GUEST: '#3B82F6', DELIVERY: '#F59E0B', WORKER: '#8B5CF6', CAB: '#10B981',
};

export default function ApprovalsScreen() {
    const [entries, setEntries] = useState<PendingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/gate/entry-requests?status=PENDING');
            const payload = res.data?.data;
            const pendingEntries = payload?.entryRequests ?? payload?.entries ?? (Array.isArray(payload) ? payload : []);
            setEntries(Array.isArray(pendingEntries) ? pendingEntries : []);
        } catch (err: any) {
            console.error('Failed to fetch pending approvals:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchPending(); }, [fetchPending]));

    const handleApprove = async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActioning(id + '_approve');
        try {
            await api.patch(`/api/v1/gate/entry-requests/${id}/approve`);
            setEntries((prev) => prev.filter((e) => e.id !== id));
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Failed to approve.');
        } finally {
            setActioning(null);
        }
    };

    const handleReject = async (id: string) => {
        Alert.alert('Reject Entry', 'Are you sure you want to reject this visitor?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive', onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setActioning(id + '_reject');
                    try {
                        await api.patch(`/api/v1/gate/entry-requests/${id}/reject`);
                        setEntries((prev) => prev.filter((e) => e.id !== id));
                    } catch (err: any) {
                        Alert.alert('Error', err?.response?.data?.message ?? 'Failed to reject.');
                    } finally {
                        setActioning(null);
                    }
                }
            },
        ]);
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <ScreenLoading label="Checking pending approvals…" />
            ) : entries.length === 0 ? (
                <ScreenEmpty icon="checkmark-done-outline" title="All clear" message="There are no visitors waiting for resident approval." />
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ApprovalCard
                            entry={item}
                            isApproving={actioning === item.id + '_approve'}
                            isRejecting={actioning === item.id + '_reject'}
                            onApprove={() => handleApprove(item.id)}
                            onReject={() => handleReject(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPending(); }} tintColor={GuardColors.goldDeep} />}
                />
            )}
        </View>
    );
}

function ApprovalCard({ entry, isApproving, isRejecting, onApprove, onReject }: {
    entry: PendingEntry;
    isApproving: boolean; isRejecting: boolean;
    onApprove: () => void; onReject: () => void;
}) {
    const color = TYPE_COLORS[entry.type] ?? '#6B7280';
    const rawFlat = entry.flatLabel || entry.flat?.flatNumber || entry.flat?.number || entry.flatNumber || '—';
    const flatLabel = rawFlat === 'OFFICE' ? 'Admin Office' : rawFlat;
    const residentName = entry.flat?.resident?.name;

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
                    <Ionicons
                        name={entry.type === 'GUEST' ? 'person' : entry.type?.includes('DELIVERY') ? 'cube' : entry.type?.includes('SERVICE') ? 'construct' : 'car'}
                        size={20} color={color}
                    />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.visitorName}>{entry.visitorName || entry.type?.replace(/_/g, ' ')}</Text>
                    <Text style={styles.visitorDetails}>
                        {entry.type?.replace(/_/g, ' ')} • Flat {flatLabel}
                        {residentName ? ` (${residentName})` : ''}
                    </Text>
                    {entry.purpose ? <Text style={styles.purposeText}>{entry.purpose}</Text> : null}
                </View>
                <View style={styles.pendingBadge}>
                    <Ionicons name="time" size={13} color="#D97706" />
                    <Text style={styles.pendingText}>WAITING</Text>
                </View>
            </View>

            <Text style={styles.timestamp}>
                {new Date(entry.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <Pressable
                    onPress={onReject}
                    disabled={isApproving || isRejecting}
                    style={styles.rejectBtn}
                >
                    {isRejecting ? <ActivityIndicator size="small" color="#DC2626" /> : (
                        <>
                            <Ionicons name="close-circle-outline" size={19} color="#DC2626" />
                            <Text style={styles.rejectText}>Reject</Text>
                        </>
                    )}
                </Pressable>
                <Pressable
                    onPress={onApprove}
                    disabled={isApproving || isRejecting}
                    style={styles.approveBtn}
                >
                    {isApproving ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                            <Text style={styles.approveText}>Approve & Let In</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, width: '100%', height: '100%', backgroundColor: GuardColors.bg },
    listContent: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: GuardColors.card, borderRadius: 18, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderWidth: 1, borderColor: GuardColors.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardHeaderText: { flex: 1 },
    visitorName: { fontSize: 17, fontWeight: '800', color: '#1F2937', marginBottom: 2 },
    visitorDetails: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    purposeText: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
    pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
    pendingText: { fontSize: 10, fontWeight: '800', color: '#D97706', letterSpacing: 0.5 },
    timestamp: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 14 },
    actions: { flexDirection: 'row', gap: 10 },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
    approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: GuardColors.green },
    btnPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
    rejectText: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
    approveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
