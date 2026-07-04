import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateRadius } from '@/constants/Sgate-theme';
import { ApprovalCard } from '@/components/visitors/ApprovalCard';
import EmptyState from './EmptyState';
import { GateSkeleton } from './HomeSkeletons';

interface WaitingGateCardProps {
    pendingRequests: any[];
    isLoading: boolean;
    onApprove: (id: string) => void;
    onDeny: (id: string) => void;
    exitDir: Record<string, 'left' | 'right'>;
}

function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff === 1) return '1 min ago';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

function formatType(raw: string): string {
    if (!raw) return 'Guest';
    return raw
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

export default function WaitingGateCard({
    pendingRequests,
    isLoading,
    onApprove,
    onDeny,
    exitDir,
}: WaitingGateCardProps) {
    const hasRequests = pendingRequests.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>WAITING AT GATE</Text>
                {hasRequests && (
                    <View style={styles.countPill}>
                        <Text style={styles.countText}>{pendingRequests.length} new</Text>
                    </View>
                )}
            </View>

            {isLoading && !hasRequests ? (
                <GateSkeleton />
            ) : !hasRequests ? (
                <View style={styles.card}>
                    <EmptyState
                        iconName="shield-check-outline"
                        iconBg={SgateColors.greenBg}
                        iconColor={SgateColors.green}
                        title="All clear!"
                        description="No one is waiting at the gate right now."
                    />
                </View>
            ) : (
                pendingRequests.map((req, index) => (
                    <Animated.View
                        key={req.id}
                        entering={FadeInDown.delay(index * 60).springify()}
                        exiting={
                            exitDir[req.id] === 'right'
                                ? FadeOutRight.duration(260)
                                : FadeOutLeft.duration(260)
                        }
                        style={styles.cardWrap}
                    >
                        <ApprovalCard
                            name={req.visitorName}
                            type={formatType(req.type)}
                            time={timeAgo(req.createdAt)}
                            gate={req.gate ?? 'Gate A'}
                            onApprove={() => onApprove(req.id)}
                            onDeny={() => onDeny(req.id)}
                        />
                    </Animated.View>
                ))
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
    countPill: {
        borderRadius: 100,
        backgroundColor: SgateColors.goldPale,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    countText: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: SgateRadius['2xl'],
        paddingVertical: 12,
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
    cardWrap: {
        marginBottom: 12,
    },
});
