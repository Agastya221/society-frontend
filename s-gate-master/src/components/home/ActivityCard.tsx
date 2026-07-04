import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import type { Entry } from '@/types/api';

import { EmptyState } from './EmptyState';

const BRAND_YELLOW_BG = '#FFFBE6';

type PillStatus = 'active' | 'pending' | 'approved' | 'denied' | 'expired';

interface ActivityCardProps {
    entries: Entry[];
    onSeeAll: () => void;
    timeAgo: (iso: string) => string;
}

export function ActivityCard({ entries, onSeeAll, timeAgo }: ActivityCardProps) {
    return (
        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.section}>
            <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>{"Today's Activity"}</Text>
                <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
            </View>

            {entries.length === 0 ? (
                <View style={styles.activityEmptyCard}>
                    <EmptyState
                        iconName="clock-outline"
                        iconBg="#EEF0F4"
                        iconColor={SgateColors.t2}
                        title="No activity yet today"
                        description="You're all caught up!"
                    />
                </View>
            ) : (
                <View style={styles.activityCard}>
                    {entries.map((entry, index) => (
                        <ActivityRow
                            key={entry.id}
                            entry={entry}
                            isLast={index === entries.length - 1}
                            timeAgo={timeAgo}
                        />
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

function ActivityRow({ entry, isLast, timeAgo }: { entry: Entry; isLast: boolean; timeAgo: (iso: string) => string }) {
    const { pill, label } = entryStatusToPill(entry.status);
    return (
        <View style={[styles.activityRow, !isLast && styles.activityDivider]}>
            <Avatar name={entry.visitorName} size={36} />
            <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={1}>{entry.visitorName}</Text>
                <Text style={styles.activityTime}>{timeAgo(entry.createdAt)}</Text>
            </View>
            <ActivityPill status={pill} label={label} />
        </View>
    );
}

function ActivityPill({ status, label }: { status: PillStatus; label: string }) {
    const { bg, text } = PILL_COLORS[status];
    return (
        <View style={[styles.actPill, { backgroundColor: bg }]}>
            <Text style={[styles.actPillText, { color: text }]}>{label}</Text>
        </View>
    );
}

function entryStatusToPill(status: Entry['status']): { pill: PillStatus; label: string } {
    switch (status) {
        case 'CHECKED_IN':  return { pill: 'active',   label: 'Inside' };
        case 'CHECKED_OUT': return { pill: 'expired',  label: 'Left' };
        case 'APPROVED':    return { pill: 'approved', label: 'Approved' };
        case 'REJECTED':    return { pill: 'denied',   label: 'Denied' };
        default:            return { pill: 'pending',  label: 'Pending' };
    }
}

const PILL_COLORS: Record<PillStatus, { bg: string; text: string }> = {
    active:   { bg: SgateColors.greenBg,  text: SgateColors.green },
    approved: { bg: SgateColors.greenBg,  text: SgateColors.green },
    pending:  { bg: BRAND_YELLOW_BG,      text: '#996300' },
    denied:   { bg: SgateColors.redBg,    text: SgateColors.red },
    expired:  { bg: '#F2F2F2',            text: SgateColors.t3 },
};

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    cardHeaderTitle: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    seeAllText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
    activityCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#101828',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.06,
                shadowRadius: 24,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    activityDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    activityInfo: { flex: 1 },
    activityName: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    activityTime: {
        marginTop: 2,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    actPill: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    actPillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },
    activityEmptyCard: {
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#101828',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.06,
                shadowRadius: 24,
            },
            android: {
                elevation: 2,
            },
        }),
    },
});
