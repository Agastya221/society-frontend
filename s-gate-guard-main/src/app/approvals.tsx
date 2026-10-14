import { GiantButton } from '@/components/gate/GiantButton';
import { HomeButton } from '@/components/gate/HomeButton';
import { ScreenEmpty, ScreenLoading } from '@/components/ScreenState';
import { GuardColors, GuardFonts, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
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

// Backend entry types are VISITOR / DELIVERY / CAB / VENDOR (new-entry maps
// Guest→VISITOR, Service→VENDOR); GUEST/SERVICE kept for older records.
const TYPE_META: Record<string, { labelKey: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    VISITOR:  { labelKey: 'common.guest',    color: '#3B82F6', bg: '#EBF3FF', icon: 'person' },
    GUEST:    { labelKey: 'common.guest',    color: '#3B82F6', bg: '#EBF3FF', icon: 'person' },
    DELIVERY: { labelKey: 'common.delivery', color: '#F59E0B', bg: '#FFF4DC', icon: 'cube' },
    CAB:      { labelKey: 'common.cab',      color: '#10B981', bg: '#E5FBF3', icon: 'car' },
    VENDOR:   { labelKey: 'common.service',  color: '#8657E8', bg: '#F1EBFF', icon: 'construct' },
    SERVICE:  { labelKey: 'common.service',  color: '#8657E8', bg: '#F1EBFF', icon: 'construct' },
};

export default function ApprovalsScreen() {
    const t = useT();
    const [entries, setEntries] = useState<PendingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/gate/entry-requests?status=PENDING');
            const payload = res.data?.data;
            const pendingEntries = Array.isArray(payload) ? payload : (payload?.entryRequests ?? payload?.entries ?? []);
            setEntries(Array.isArray(pendingEntries) ? pendingEntries : []);
        } catch (err: any) {
            console.error('Failed to fetch pending approvals:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchPending(); }, [fetchPending]));

    // Ref guard: a double tap fires twice before `actioning` disables the buttons.
    const busyRef = useRef(false);

    const handleApprove = async (id: string) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setActioning(id + '_approve');
        try {
            await api.patch(`/api/v1/gate/entry-requests/${id}/approve`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEntries((prev) => prev.filter((e) => e.id !== id));
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('approvals.failed'), err?.response?.data?.message ?? t('approvals.failedText'));
            fetchPending(); // it may have been answered/expired meanwhile — don't leave a stale card
        } finally {
            busyRef.current = false;
            setActioning(null);
        }
    };

    const handleReject = async (id: string) => {
        Alert.alert(t('approvals.stopTitle'), t('approvals.stopText'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('approvals.stop'), style: 'destructive', onPress: async () => {
                    if (busyRef.current) return;
                    busyRef.current = true;
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setActioning(id + '_reject');
                    try {
                        await api.patch(`/api/v1/gate/entry-requests/${id}/reject`);
                        setEntries((prev) => prev.filter((e) => e.id !== id));
                    } catch (err: any) {
                        Alert.alert(t('approvals.failed'), err?.response?.data?.message ?? t('approvals.failedText'));
                        fetchPending();
                    } finally {
                        busyRef.current = false;
                        setActioning(null);
                    }
                }
            },
        ]);
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <ScreenLoading label={t('approvals.loading')} />
            ) : (
                // Empty state lives inside the list so pull-to-refresh still works when it's all clear.
                <FlatList
                    data={entries}
                    ListEmptyComponent={<ScreenEmpty icon="checkmark-done-circle-outline" title={t('approvals.allClear')} message={t('approvals.allClearText')} />}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ApprovalCard
                            entry={item}
                            isApproving={actioning === item.id + '_approve'}
                            isRejecting={actioning === item.id + '_reject'}
                            busy={!!actioning}
                            onApprove={() => handleApprove(item.id)}
                            onReject={() => handleReject(item.id)}
                        />
                    )}
                    contentContainerStyle={[styles.listContent, entries.length === 0 && styles.listEmpty]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPending(); }} tintColor={GuardColors.goldDeep} />}
                />
            )}
            <HomeButton />
        </View>
    );
}

/** "Just arrived" / "For 4 min" from the request time. */
function waitedLabel(createdAt: string, t: ReturnType<typeof useT>): string {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return mins >= 1 ? t('approvals.minutes', { n: mins }) : t('approvals.justNow');
}

function ApprovalCard({ entry, isApproving, isRejecting, busy, onApprove, onReject }: {
    entry: PendingEntry;
    isApproving: boolean; isRejecting: boolean; busy: boolean;
    onApprove: () => void; onReject: () => void;
}) {
    const t = useT();
    const meta = TYPE_META[entry.type] ?? { labelKey: '', color: '#6B7280', bg: '#F3F4F6', icon: 'person' as const };
    const typeText = meta.labelKey ? t(meta.labelKey) : (entry.type?.replace(/_/g, ' ') ?? t('common.guest'));
    const rawFlat = entry.flatLabel || entry.flat?.flatNumber || entry.flat?.number || entry.flatNumber || '—';
    const flatLabel = rawFlat === 'OFFICE' ? t('scan.office') : rawFlat;
    const residentName = entry.flat?.resident?.name;

    return (
        <View style={[styles.card, guardShadow('#0D0F14', 2)]}>
            <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={30} color={meta.color} />
                </View>
                <View style={styles.cardHeaderText}>
                    <Text style={styles.visitorName} numberOfLines={1}>{entry.visitorName || typeText}</Text>
                    <Text style={styles.flatText} numberOfLines={1}>{t('common.flat')} {flatLabel}{residentName ? ` · ${residentName}` : ''}</Text>
                    {entry.purpose ? <Text style={styles.purposeText} numberOfLines={2}>{entry.purpose}</Text> : null}
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.pillText, { color: meta.color }]}>{typeText}</Text>
                </View>
                <View style={styles.waited}>
                    <Ionicons name="time" size={18} color={GuardColors.goldDeep} />
                    <Text style={styles.waitedText}>{waitedLabel(entry.createdAt, t)}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <View style={styles.actionStop}>
                    <GiantButton label={t('approvals.stop')} icon="close-circle" tone="deny" loading={isRejecting} disabled={busy && !isRejecting} onPress={onReject} />
                </View>
                <View style={styles.actionAllow}>
                    <GiantButton label={t('approvals.allow')} icon="checkmark-circle" tone="allow" loading={isApproving} disabled={busy && !isApproving} onPress={onApprove} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GuardColors.bg },
    listContent: { padding: 16, gap: 14 },
    listEmpty: { flexGrow: 1 },

    card: { backgroundColor: GuardColors.card, borderRadius: 30, padding: 18, gap: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    typeIcon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    cardHeaderText: { flex: 1, gap: 2 },
    visitorName: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 24, lineHeight: 32, fontWeight: '900', letterSpacing: -0.3 },
    flatText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '700' },
    purposeText: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
    pillText: { fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '800' },
    waited: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    waitedText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '700' },
    actions: { gap: 10, minHeight: GuardTouch.button },
    actionStop: { width: '100%' },
    actionAllow: { width: '100%' },
});
