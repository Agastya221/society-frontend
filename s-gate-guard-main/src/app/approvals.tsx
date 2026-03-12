import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface PendingEntry {
    id: string;
    visitorName: string;
    visitorType: string;
    flat?: { flatNumber: string; resident?: { name: string } };
    flatNumber?: string;
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
            const res = await api.get('/api/v1/gate/requests');
            setEntries(res.data?.data?.entries ?? res.data?.data ?? []);
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
            await api.patch(`/api/v1/gate/requests/${id}/approve`);
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
                        await api.patch(`/api/v1/gate/requests/${id}/reject`);
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading approvals...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {entries.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="checkmark-done-circle-outline" size={48} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>All Clear!</Text>
                    <Text style={styles.emptySubtitle}>No pending approvals at this gate</Text>
                </View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <ApprovalCard
                            entry={item}
                            index={index}
                            isApproving={actioning === item.id + '_approve'}
                            isRejecting={actioning === item.id + '_reject'}
                            onApprove={() => handleApprove(item.id)}
                            onReject={() => handleReject(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPending(); }} tintColor="#3B82F6" />}
                />
            )}
        </View>
    );
}

function ApprovalCard({ entry, index, isApproving, isRejecting, onApprove, onReject }: {
    entry: PendingEntry; index: number;
    isApproving: boolean; isRejecting: boolean;
    onApprove: () => void; onReject: () => void;
}) {
    const color = TYPE_COLORS[entry.visitorType] ?? '#6B7280';
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;
    const flatLabel = entry.flat?.flatNumber ?? entry.flatNumber ?? '—';
    const residentName = entry.flat?.resident?.name;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, delay: index * 80, duration: 400, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, delay: index * 80, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.card, { borderLeftColor: color, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
                    <Ionicons
                        name={entry.visitorType === 'GUEST' ? 'person' : entry.visitorType === 'DELIVERY' ? 'cube' : entry.visitorType === 'WORKER' ? 'construct' : 'car'}
                        size={20} color={color}
                    />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.visitorName}>{entry.visitorName}</Text>
                    <Text style={styles.visitorDetails}>
                        {entry.visitorType} • Flat {flatLabel}
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
                    style={({ pressed }) => [styles.rejectBtn, pressed && styles.btnPressed]}
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
                    style={({ pressed }) => [styles.approveBtn, pressed && styles.btnPressed]}
                >
                    {isApproving ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                            <Text style={styles.approveText}>Approve & Let In</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFC' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    listContent: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16, borderLeftWidth: 4, borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 }, android: { elevation: 3 } }) },
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
    approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, backgroundColor: '#10B981', ...Platform.select({ ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }) },
    btnPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
    rejectText: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
    approveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginBottom: 8 },
    emptySubtitle: { fontSize: 15, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },
});
