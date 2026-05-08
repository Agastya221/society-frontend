import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type EmergencyStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM' | 'ACTIVE';
type EmergencyType   = 'MEDICAL' | 'FIRE' | 'SECURITY' | 'LIFT_STUCK' | 'ANIMAL_THREAT' | 'OTHER';

interface Emergency {
    id: string;
    type: EmergencyType;
    status: EmergencyStatus;
    description: string;
    location?: string;
    createdAt: string;
    resolvedAt?: string;
    sender: { name: string; flat?: string; phone?: string };
    respondedBy?: { name: string; role: string };
    resolutionNote?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; bg: string; color: string; label: string }> = {
    MEDICAL:       { icon: 'heart',        bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Medical' },
    FIRE:          { icon: 'alert-octagon',bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Fire' },
    SECURITY:      { icon: 'shield-off',   bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Security' },
    LIFT_STUCK:    { icon: 'layers',       bg: SgateColors.blueBg,   color: SgateColors.blue,     label: 'Lift Stuck' },
    ANIMAL_THREAT: { icon: 'alert-circle', bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Animal Threat' },
    OTHER:         { icon: 'alert-triangle',bg: SgateColors.surface, color: SgateColors.t2,       label: 'Other' },
};

const STATUS_CONFIG: Record<EmergencyStatus, { bg: string; color: string; label: string }> = {
    TRIGGERED:    { bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Active' },
    ACTIVE:       { bg: SgateColors.redBg,    color: SgateColors.red,      label: 'Active' },
    ACKNOWLEDGED: { bg: SgateColors.goldPale, color: SgateColors.goldDeep, label: 'Acknowledged' },
    RESOLVED:     { bg: SgateColors.greenBg,  color: SgateColors.green,    label: 'Resolved' },
    FALSE_ALARM:  { bg: SgateColors.surface,  color: SgateColors.t3,       label: 'False Alarm' },
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const FILTERS: { key: string; label: string }[] = [
    { key: 'ALL',     label: 'All' },
    { key: 'ACTIVE',  label: 'Active' },
    { key: 'RESOLVED',label: 'Resolved' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminEmergenciesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);
    const [filter, setFilter]           = useState('ALL');
    const [resolveTarget, setResolveTarget] = useState<Emergency | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving]     = useState(false);

    const fetchEmergencies = async (silent = false) => {
        try {
            const res = await api.get('/community/emergencies');
            const data = res.data?.data ?? res.data?.emergencies ?? [];
            setEmergencies(Array.isArray(data) ? data : []);
        } catch (err) {
            if (!silent) console.error('Failed to fetch emergencies:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchEmergencies(); }, []));
    const onRefresh = () => { setRefreshing(true); fetchEmergencies(); };

    const filtered = emergencies.filter((e) => {
        if (filter === 'ALL') return true;
        if (filter === 'ACTIVE') return e.status === 'TRIGGERED' || e.status === 'ACTIVE' || e.status === 'ACKNOWLEDGED';
        if (filter === 'RESOLVED') return e.status === 'RESOLVED' || e.status === 'FALSE_ALARM';
        return true;
    });

    const activeCount = emergencies.filter(
        (e) => e.status === 'TRIGGERED' || e.status === 'ACTIVE' || e.status === 'ACKNOWLEDGED'
    ).length;

    const handleAcknowledge = async (id: string) => {
        try {
            await api.patch(`/community/emergencies/${id}/acknowledge`);
            setEmergencies((prev) =>
                prev.map((e) => (e.id === id ? { ...e, status: 'ACKNOWLEDGED' } : e))
            );
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to acknowledge');
        }
    };

    const handleResolveConfirm = async () => {
        if (!resolveTarget) return;
        setResolving(true);
        try {
            await api.patch(`/community/emergencies/${resolveTarget.id}/resolve`, {
                resolutionNote: resolveNote.trim() || 'Resolved by admin',
            });
            setEmergencies((prev) =>
                prev.map((e) =>
                    e.id === resolveTarget.id
                        ? { ...e, status: 'RESOLVED', resolutionNote: resolveNote.trim() }
                        : e
                )
            );
            setResolveTarget(null);
            setResolveNote('');
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to resolve');
        } finally {
            setResolving(false);
        }
    };

    const renderItem = ({ item, index }: { item: Emergency; index: number }) => {
        const meta   = TYPE_META[item.type] ?? TYPE_META.OTHER;
        const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.TRIGGERED;
        const isActive = item.status === 'TRIGGERED' || item.status === 'ACTIVE';
        const isAcknowledged = item.status === 'ACKNOWLEDGED';

        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <View style={[styles.card, isActive && styles.cardActive]}>
                    {/* Top row */}
                    <View style={styles.cardTop}>
                        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                            <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={styles.cardInfo}>
                            <View style={styles.cardTitleRow}>
                                <Text style={styles.typeLabel}>{meta.label}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                </View>
                            </View>
                            <Text style={styles.senderText} numberOfLines={1}>
                                {item.sender?.name ?? 'Unknown'}
                                {item.sender?.flat ? ` · Flat ${item.sender.flat}` : ''}
                            </Text>
                            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    {!!item.description && (
                        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
                    )}

                    {/* Location */}
                    {!!item.location && (
                        <View style={styles.locationRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={12} color={SgateColors.t3} />
                            <Text style={styles.locationText}>{item.location}</Text>
                        </View>
                    )}

                    {/* Resolution note */}
                    {!!item.resolutionNote && (
                        <View style={styles.resolveNoteWrap}>
                            <Text style={styles.resolveNoteLabel}>Resolution:</Text>
                            <Text style={styles.resolveNoteText}>{item.resolutionNote}</Text>
                        </View>
                    )}

                    {/* Action buttons */}
                    {(isActive || isAcknowledged) && (
                        <View style={styles.actionRow}>
                            {isActive && (
                                <TouchableOpacity
                                    style={styles.ackBtn}
                                    onPress={() => handleAcknowledge(item.id)}
                                    activeOpacity={0.75}
                                >
                                    <MaterialCommunityIcons name="eye-outline" size={14} color={SgateColors.goldDeep} />
                                    <Text style={styles.ackBtnText}>Acknowledge</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.resolveBtn}
                                onPress={() => { setResolveTarget(item); setResolveNote(''); }}
                                activeOpacity={0.75}
                            >
                                <MaterialCommunityIcons name="check" size={14} color={SgateColors.green} />
                                <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Emergencies</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Active SOS & resolved alerts</Text>
                    </View>
                    {activeCount > 0 && (
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>{activeCount} ACTIVE</Text>
                        </View>
                    )}
                </View>
                {/* Filter tabs */}
                <View style={styles.filterRow}>
                    {FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
                            onPress={() => setFilter(f.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialCommunityIcons name="shield-outline" size={56} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>No emergencies</Text>
                            <Text style={styles.emptySub}>Society is safe.</Text>
                        </View>
                    }
                />
            )}

            {/* Resolve Modal */}
            <Modal
                visible={!!resolveTarget}
                transparent
                animationType="fade"
                onRequestClose={() => setResolveTarget(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Mark as Resolved</Text>
                        <Text style={styles.modalSub}>
                            {resolveTarget ? `${TYPE_META[resolveTarget.type]?.label ?? resolveTarget.type} — ${resolveTarget.sender?.name}` : ''}
                        </Text>
                        <TextInput
                            style={styles.noteInput}
                            multiline
                            textAlignVertical="top"
                            placeholder="Resolution note (optional)"
                            placeholderTextColor={SgateColors.t4}
                            value={resolveNote}
                            onChangeText={setResolveNote}
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setResolveTarget(null)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, resolving && { opacity: 0.5 }]}
                                onPress={handleResolveConfirm}
                                disabled={resolving}
                            >
                                {resolving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Resolve</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    centerSafe: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },

    // Header
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
    headerSub:   { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: SgateColors.redBg,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SgateColors.red },
    liveText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.red, letterSpacing: 0.5 },

    spacer: { height: 6 },

    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: SgateColors.surface,
    },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    listContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 10,
    },
    cardActive: { borderColor: SgateColors.red + '50', borderWidth: 1.5 },

    cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    typeLabel: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: SgateFonts.bold },
    senderText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t2, marginBottom: 2 },
    timeText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    description: {
        fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        lineHeight: 18, marginBottom: 8,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    locationText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    resolveNoteWrap: {
        backgroundColor: SgateColors.greenBg,
        borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 6,
        marginBottom: 8,
    },
    resolveNoteLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.green, marginBottom: 2 },
    resolveNoteText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2 },

    actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    ackBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 5, paddingVertical: 11,
        backgroundColor: SgateColors.goldPale, borderRadius: 12,
    },
    ackBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },
    resolveBtn: {
        flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 5, paddingVertical: 11,
        backgroundColor: SgateColors.greenBg, borderRadius: 12,
    },
    resolveBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.green },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.7 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 12, marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
        backgroundColor: SgateColors.card, width: '100%', maxWidth: 340,
        borderRadius: 24, padding: 24,
    },
    modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 16 },
    noteInput: {
        backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 16, padding: 14, fontSize: 14, fontFamily: SgateFonts.regular,
        color: SgateColors.t1, height: 90, marginBottom: 16,
    },
    modalBtnRow: { flexDirection: 'row', gap: 10 },
    modalCancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: SgateColors.surface, alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    modalConfirmBtn: {
        flex: 1.2, paddingVertical: 14, borderRadius: 14,
        backgroundColor: SgateColors.green, alignItems: 'center',
    },
    modalConfirmText: { fontSize: 14, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
