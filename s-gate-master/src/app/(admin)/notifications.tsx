import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateBrandMark } from '@/components/Sgate/SgateBrandMark';
import { SgateHeader } from '@/components/Sgate/SgateHeader';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminNotification {
    id: string;
    title: string;
    body: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, any>;
    referenceId?: string | null;
}

// ─── Icon/colour config ───────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; bg: string; fg: string }> = {
    ENTRY_REQUEST:     { icon: 'alert-triangle', bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    DELIVERY_REQUEST:  { icon: 'package',        bg: SgateColors.blueBg,   fg: SgateColors.blue },
    EMERGENCY_ALERT:   { icon: 'shield',         bg: SgateColors.redBg,    fg: SgateColors.red },
    STAFF_CHECKIN:     { icon: 'user-check',     bg: SgateColors.greenBg,  fg: SgateColors.green },
    STAFF_CHECKOUT:    { icon: 'user-check',     bg: SgateColors.greenBg,  fg: SgateColors.green },
    ONBOARDING_STATUS: { icon: 'check-circle',   bg: SgateColors.greenBg,  fg: SgateColors.green },
    COMPLAINT:         { icon: 'alert-circle',   bg: SgateColors.redBg,    fg: SgateColors.red },
    PAYMENT:           { icon: 'credit-card',    bg: SgateColors.greenBg,  fg: SgateColors.green },
    SYSTEM:            { icon: 'bell',           bg: SgateColors.surface,  fg: SgateColors.t3 },
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

type SectionHeader = { kind: 'header'; title: string };
type SectionItem   = { kind: 'item'; notification: AdminNotification };
type ListRow       = SectionHeader | SectionItem;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminNotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/admin/notifications', { params: { limit: 50 } });
            const payload = res.data?.data ?? res.data;
            const notificationsArray = Array.isArray(payload) ? payload : (payload?.notifications ?? []);
            
            const mapped = notificationsArray.map((n: any) => ({
                id: n.id,
                type: n.type ?? n.category ?? 'SYSTEM',
                title: n.title,
                body: n.message ?? n.body ?? '',
                isRead: n.isRead,
                createdAt: n.createdAt,
                data: n.data,
                referenceId: n.referenceId,
            }));
            
            setNotifications(mapped);
        } catch (err) {
            console.error('Admin notifications fetch error:', err);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [fetchNotifications]);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const rows = useMemo<ListRow[]>(() => {
        const unread = notifications.filter((n) => !n.isRead);
        const read   = notifications.filter((n) => n.isRead);
        const result: ListRow[] = [];
        if (unread.length > 0) {
            result.push({ kind: 'header', title: 'NEW' });
            unread.forEach((n) => result.push({ kind: 'item', notification: n }));
        }
        if (read.length > 0) {
            result.push({ kind: 'header', title: 'LATEST' });
            read.forEach((n) => result.push({ kind: 'item', notification: n }));
        }
        return result;
    }, [notifications]);

    const markAsRead = useCallback(async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        try {
            await api.patch(`/admin/notifications/${id}/read`);
        } catch {}
    }, []);

    const markAllAsRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            await api.patch('/admin/notifications/read-all');
        } catch {}
    }, []);

    const handlePress = useCallback(
        (n: AdminNotification) => {
            if (!n.isRead) markAsRead(n.id);
            switch (n.type) {
                case 'EMERGENCY_ALERT':
                    router.push('/(admin)/emergencies' as any);
                    break;
                case 'COMPLAINT':
                    router.push('/(admin)/complaints' as any);
                    break;
                case 'ENTRY_REQUEST':
                case 'DELIVERY_REQUEST':
                    router.push('/(admin)/approval-requests' as any);
                    break;
                case 'ONBOARDING_STATUS':
                    router.push({
                        pathname: '/(admin)/onboarding-requests',
                        params: {
                            requestId: n.data?.requestId ?? n.referenceId ?? undefined,
                            status: n.data?.status ?? 'PENDING_APPROVAL',
                        },
                    } as any);
                    break;
                default:
                    break;
            }
        },
        [markAsRead, router]
    );

    const keyExtractor = useCallback(
        (row: ListRow, index: number) =>
            row.kind === 'header' ? `header-${row.title}-${index}` : row.notification.id,
        []
    );

    const renderItem = useCallback(
        ({ item, index }: { item: ListRow; index: number }) => {
            if (item.kind === 'header') {
                return <Text style={styles.sectionTitle}>{item.title}</Text>;
            }
            const n    = item.notification;
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify()}>
                    <TouchableOpacity
                        style={[styles.row, !n.isRead && styles.rowUnread]}
                        activeOpacity={0.7}
                        onPress={() => handlePress(n)}
                    >
                        <View style={[styles.iconBubble, { backgroundColor: meta.bg }]}>
                            <MaterialCommunityIcons name={meta.icon} size={20} color={meta.fg} />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                                {n.title.replace(/^[^a-zA-Z0-9]+/, '')}
                            </Text>
                            <Text style={styles.rowBody} numberOfLines={2}>{n.body}</Text>
                            <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
                        </View>
                        {!n.isRead && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                </Animated.View>
            );
        },
        [handlePress]
    );

    const ListEmpty = useCallback(
        () => (
            <View style={styles.empty}>
                <SgateBrandMark size={48} />
                <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
        ),
        []
    );

    return (
        <View style={styles.root}>
            <SgateHeader
                title="Notifications"
                showBack
                onBack={() => router.back()}
                rightAction={
                    unreadCount > 0 ? (
                        <TouchableOpacity onPress={markAllAsRead} hitSlop={8} style={styles.markAllBtn}>
                            <MaterialCommunityIcons name="check-all" size={18} color={SgateColors.goldDeep} />
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            <FlatList
                data={rows}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={[
                    rows.length === 0 ? styles.emptyContainer : styles.listContent,
                    { paddingBottom: insets.bottom + 40 }
                ]}
                refreshing={refreshing}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    listContent: { paddingBottom: 40 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

    markAllBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spacer: { height: 6 },

    sectionTitle: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        backgroundColor: SgateColors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    rowUnread: { 
        backgroundColor: '#FFFCF0',
        borderColor: '#FBE8B0',
    },
    iconBubble: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
    },
    rowText: { flex: 1, justifyContent: 'center', marginTop: 2 },
    rowTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
    rowBody: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 18 },
    rowTime: { fontSize: 11, fontFamily: SgateFonts.medium, color: SgateColors.t4, marginTop: 6 },
    unreadDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: SgateColors.goldDeep,
        marginTop: 6, marginLeft: 10,
    },
    empty: { alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
