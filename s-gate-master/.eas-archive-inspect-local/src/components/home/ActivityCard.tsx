import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';
import { Avatar } from '@/components/ui/Avatar';
import type { Entry } from '@/types/api';
import EmptyState from './EmptyState';
import { ActivitySkeleton } from './HomeSkeletons';

interface ActivityCardProps {
    entries: Entry[];
    isLoading: boolean;
    onSeeAll: () => void;
}

type PillStatus = 'active' | 'pending' | 'approved' | 'denied' | 'expired';

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
    pending:  { bg: '#FFFBE6',            text: '#996300' },
    denied:   { bg: SgateColors.redBg,    text: SgateColors.red },
    expired:  { bg: '#F2F2F2',            text: SgateColors.t3 },
};

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export default function ActivityCard({ entries, isLoading, onSeeAll }: ActivityCardProps) {
    const hasEntries = entries.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>TODAY'S ACTIVITY</Text>
                <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
            </View>

            {isLoading && !hasEntries ? (
                <ActivitySkeleton />
            ) : !hasEntries ? (
                <View style={styles.card}>
                    <EmptyState
                        iconName="clock-outline"
                        title="No activity yet today"
                        description="You're all caught up! No recent visitor movements."
                    />
                </View>
            ) : (
                <View style={styles.card}>
                    <View style={styles.padding}>
                        {entries.map((entry, index) => {
                            const { pill, label } = entryStatusToPill(entry.status);
                            const colors = PILL_COLORS[pill];
                            const isLast = index === entries.length - 1;

                            return (
                                <View key={entry.id} style={[styles.row, !isLast && styles.divider]}>
                                    <Avatar name={entry.visitorName} size={36} />
                                    <View style={styles.info}>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {entry.visitorName}
                                        </Text>
                                        <Text style={styles.time}>{timeAgo(entry.createdAt)}</Text>
                                    </View>
                                    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                                        <Text style={[styles.pillText, { color: colors.text }]}>
                                            {label}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    title: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 1.5,
    },
    seeAllText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: SgateRadius['2xl'],
        ...Platform.select({
            ios: {
                shadowColor: '#101828',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.04,
                shadowRadius: 20,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    padding: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    time: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 2,
    },
    pill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
    },
});
