import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateBrandMark } from '@/components/Sgate/SgateBrandMark';
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
    metadata?: Record<string, any>;
}

// ─── Icon/colour config ───────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: keyof typeof Feather.glyphMap; bg: string; fg: string }> = {
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
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/admin/notifications', { params: { limit: 50 } });
            const data = res.data?.data ?? res.data?.notifications ?? [];
            setNotifications(Array.isArray(data) ? data : []);
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
            result.push({ kind: 'header', title: 'EARLIER' });
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
                    router.push('/(admin)/onboarding-requests' as any);
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
                            <Feather name={meta.icon} size={18} color={meta.fg} />
                        </View>
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle} numberOfLines={1}>{n.title}</Text>
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead} hitSlop={8}>
                        <Text style={styles.markAll}>Mark all read</Text>
                    </TouchableOpacity>
                )}
                {unreadCount === 0 && <View style={{ width: 80 }} />}
            </View>

            <FlatList
                data={rows}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={
                    rows.length === 0 ? styles.emptyContainer : styles.listContent
                }
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

    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, flex: 1, marginLeft: 4 },
    markAll: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.blue },

    sectionTitle: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    rowUnread: { backgroundColor: SgateColors.goldPale + '30' },
    iconBubble: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12, marginTop: 2,
    },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    rowBody: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, lineHeight: 18 },
    rowTime: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 4 },
    unreadDot: {
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: SgateColors.gold,
        marginTop: 6, marginLeft: 8,
    },
    empty: { alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
