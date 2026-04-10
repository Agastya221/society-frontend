import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SgateBrandMark, SgateHeader } from '../../components/Sgate';
import { SgateColors, SgateFonts, SgateTypography } from '../../constants/Sgate-theme';
import type { Notification, NotificationType } from '../../types/api';
import { useNotificationStore } from '../../store/useNotificationStore';
import { AppAlert } from '../../components/ui/AppAlert';

// ─── Icon / colour mapping ───────────────────────────────────────────────────

const TYPE_META: Record<
    NotificationType,
    { icon: keyof typeof Feather.glyphMap; bg: string; fg: string }
> = {
    ENTRY_REQUEST:     { icon: 'alert-triangle', bg: SgateColors.goldPale, fg: SgateColors.goldDeep },
    DELIVERY_REQUEST:  { icon: 'package',        bg: SgateColors.blueBg,   fg: SgateColors.blue },
    EMERGENCY_ALERT:   { icon: 'shield',         bg: SgateColors.redBg,    fg: SgateColors.red },
    STAFF_CHECKIN:     { icon: 'user-check',     bg: SgateColors.greenBg,  fg: SgateColors.green },
    STAFF_CHECKOUT:    { icon: 'user-check',     bg: SgateColors.greenBg,  fg: SgateColors.green },
    ONBOARDING_STATUS: { icon: 'check-circle',   bg: SgateColors.greenBg,  fg: SgateColors.green },
    SYSTEM:            { icon: 'bell',           bg: SgateColors.surface,  fg: SgateColors.t3 },
};

// ─── Relative time helper ────────────────────────────────────────────────────

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

// ─── Section types ───────────────────────────────────────────────────────────

type SectionHeader = { kind: 'header'; title: string };
type SectionItem = { kind: 'item'; notification: Notification };
type ListRow = SectionHeader | SectionItem;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
    const router = useRouter();
    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotificationStore();

    const [refreshing, setRefreshing] = React.useState(false);

    // ── Fetch on mount ───────────────────────────────────────────────────
    useEffect(() => {
        fetchNotifications();
    }, []);

    // ── Pull-to-refresh ──────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [fetchNotifications]);

    // ── Group: unread first, then read ───────────────────────────────────
    const rows = useMemo<ListRow[]>(() => {
        const unread = notifications.filter((n) => !n.isRead);
        const read = notifications.filter((n) => n.isRead);
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

    // ── Tap handler ──────────────────────────────────────────────────────
    const handlePress = useCallback(
        (n: Notification) => {
            if (!n.isRead) markAsRead(n.id);

            switch (n.type) {
                case 'ENTRY_REQUEST':
                    router.push('/(resident)/home');
                    break;
                case 'DELIVERY_REQUEST':
                    router.push('/(resident)/deliveries');
                    break;
                case 'EMERGENCY_ALERT':
                    AppAlert.show('Emergency', n.body);
                    break;
                default:
                    break;
            }
        },
        [markAsRead, router],
    );

    // ── Key extractor ────────────────────────────────────────────────────
    const keyExtractor = useCallback(
        (row: ListRow, index: number) =>
            row.kind === 'header' ? `header-${row.title}` : row.notification.id,
        [],
    );

    // ── Render item ──────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item, index }: { item: ListRow; index: number }) => {
            if (item.kind === 'header') {
                return (
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                );
            }

            const n = item.notification;
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;

            return (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify()}>
                    <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={() => handlePress(n)}
                    >
                        {/* Icon bubble */}
                        <View style={[styles.iconBubble, { backgroundColor: meta.bg }]}>
                            <Feather name={meta.icon} size={18} color={meta.fg} />
                        </View>

                        {/* Text */}
                        <View style={styles.rowText}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                                {n.title}
                            </Text>
                            <Text style={styles.rowBody} numberOfLines={2}>
                                {n.body}
                            </Text>
                            <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
                        </View>

                        {/* Unread dot */}
                        {!n.isRead && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                </Animated.View>
            );
        },
        [handlePress],
    );

    // ── Empty state ──────────────────────────────────────────────────────
    const ListEmpty = useCallback(
        () => (
            <View style={styles.empty}>
                <SgateBrandMark size={48} />
                <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
        ),
        [],
    );

    // ── Right action ─────────────────────────────────────────────────────
    const markAllBtn =
        unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} hitSlop={8}>
                <Text style={styles.markAll}>Mark all read</Text>
            </TouchableOpacity>
        ) : undefined;

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <SgateHeader
                title="Notifications"
                showBack
                onBack={() => router.back()}
                rightAction={markAllBtn}
            />

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
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    listContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // ── Section header ──────────────────────────────────────────────────
    sectionTitle: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },

    // ── Row ─────────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    iconBubble: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    rowText: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    rowBody: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 18,
    },
    rowTime: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginTop: 4,
    },
    unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: SgateColors.gold,
        marginTop: 6,
        marginLeft: 8,
    },

    // ── Mark all ────────────────────────────────────────────────────────
    markAll: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.blue,
    },

    // ── Empty state ─────────────────────────────────────────────────────
    empty: {
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
});
