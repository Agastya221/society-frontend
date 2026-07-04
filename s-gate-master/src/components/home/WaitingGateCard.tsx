import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';

import { ApprovalCard } from '@/components/visitors/ApprovalCard';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import { EmptyState } from './EmptyState';
import { GateSkeleton } from './HomeSkeletons';

const BRAND_YELLOW_BG = '#FFFBE6';

export interface PendingGateRequest {
    id: string;
    visitorName: string;
    type: string;
    createdAt: string;
    gate?: string | null;
}

interface WaitingGateCardProps {
    pendingRequests: PendingGateRequest[];
    isLoading: boolean;
    exitDir: Record<string, 'left' | 'right'>;
    onApprove: (id: string) => void;
    onDeny: (id: string) => void;
    formatType: (raw: string) => string;
    timeAgo: (iso: string) => string;
}

export function WaitingGateCard({
    pendingRequests,
    isLoading,
    exitDir,
    onApprove,
    onDeny,
    formatType,
    timeAgo,
}: WaitingGateCardProps) {
    return (
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
            <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Waiting at Gate</Text>
                {pendingRequests.length > 0 && (
                    <View style={styles.cardCountPill}>
                        <Text style={styles.cardCountText}>{pendingRequests.length} new</Text>
                    </View>
                )}
            </View>

            {isLoading && pendingRequests.length === 0 ? (
                <GateSkeleton />
            ) : pendingRequests.length === 0 ? (
                <GateEmpty />
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
        </Animated.View>
    );
}

function GateEmpty() {
    return (
        <View style={styles.gateEmptyCard}>
            <View style={styles.gateEmptyContent}>
                <EmptyState
                    iconName="check"
                    iconBg="#18B86B"
                    iconColor="#FFFFFF"
                    title="All clear!"
                    description="No one is waiting at the gate"
                />
            </View>
            <GateIllustration />
        </View>
    );
}

function GateIllustration() {
    return (
        <View style={styles.gateArt} pointerEvents="none">
            <View style={styles.gateHouse}>
                <View style={styles.gateDoor} />
            </View>
            <View style={styles.barrierPost} />
            <View style={styles.barrierArm} />
            <View style={styles.gatePlant} />
        </View>
    );
}

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
    cardCountPill: {
        borderRadius: 999,
        backgroundColor: BRAND_YELLOW_BG,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    cardCountText: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: '#996300',
    },
    cardWrap: {
        marginBottom: 10,
    },
    gateEmptyCard: {
        minHeight: 164,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
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
    gateEmptyContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        zIndex: 2,
    },
    gateArt: {
        width: 156,
        height: 146,
        alignSelf: 'flex-end',
        marginRight: -8,
    },
    gateHouse: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 84,
        height: 94,
        backgroundColor: '#F0E8DD',
        borderTopLeftRadius: 6,
    },
    gateDoor: {
        position: 'absolute',
        right: 16,
        bottom: 0,
        width: 38,
        height: 58,
        borderRadius: 4,
        backgroundColor: '#71B7C4',
    },
    barrierPost: {
        position: 'absolute',
        left: 36,
        bottom: 10,
        width: 24,
        height: 70,
        borderRadius: 8,
        backgroundColor: '#FFB800',
    },
    barrierArm: {
        position: 'absolute',
        left: 52,
        bottom: 58,
        width: 100,
        height: 10,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    gatePlant: {
        position: 'absolute',
        right: 6,
        bottom: 0,
        width: 34,
        height: 34,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#8CC152',
    },
});
