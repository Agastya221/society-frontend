import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SgateColors, SgateRadius } from '@/constants/Sgate-theme';

const { width } = Dimensions.get('window');

function SkeletonPulse({ style }: { style: any }) {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 750 }),
                withTiming(0.4, { duration: 750 })
            ),
            -1,
            true
        );
    }, [opacity]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return <Animated.View style={[style, pulseStyle, { backgroundColor: '#EBEBEB' }]} />;
}

export function HeaderSkeleton() {
    return (
        <View style={styles.header}>
            <View style={styles.row}>
                <View style={styles.brandRow}>
                    <SkeletonPulse style={styles.logo} />
                    <View style={styles.headerTextGroup}>
                        <SkeletonPulse style={styles.headerLineSmall} />
                        <SkeletonPulse style={styles.headerLineLarge} />
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <SkeletonPulse style={styles.pill} />
                    <SkeletonPulse style={styles.circle} />
                </View>
            </View>
        </View>
    );
}

export function HeroCardSkeleton() {
    return (
        <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
                <SkeletonPulse style={styles.heroEyebrow} />
                <SkeletonPulse style={styles.heroTitleLine1} />
                <SkeletonPulse style={styles.heroTitleLine2} />
                <SkeletonPulse style={styles.heroPill} />
            </View>
            <SkeletonPulse style={styles.heroIllustration} />
        </View>
    );
}

export function QuickActionsSkeleton() {
    return (
        <View style={styles.section}>
            <SkeletonPulse style={styles.sectionTitle} />
            <View style={styles.quickGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <View key={i} style={styles.quickItem}>
                        <View style={styles.quickCard}>
                            <SkeletonPulse style={styles.quickIcon} />
                            <SkeletonPulse style={styles.quickLabel} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

export function GateSkeleton() {
    return (
        <View style={styles.section}>
            <SkeletonPulse style={styles.sectionTitle} />
            <View style={styles.whiteCard}>
                <View style={styles.cardPadding}>
                    <View style={styles.listItem}>
                        <SkeletonPulse style={styles.avatar} />
                        <View style={styles.listTextGroup}>
                            <SkeletonPulse style={styles.listLineLarge} />
                            <SkeletonPulse style={styles.listLineSmall} />
                        </View>
                        <SkeletonPulse style={styles.actionBtn} />
                    </View>
                </View>
            </View>
        </View>
    );
}

export function ActivitySkeleton() {
    return (
        <View style={styles.section}>
            <SkeletonPulse style={styles.sectionTitle} />
            <View style={styles.whiteCard}>
                <View style={styles.cardPadding}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <View key={i} style={[styles.listItem, i > 0 && styles.listDivider]}>
                            <SkeletonPulse style={styles.avatar} />
                            <View style={styles.listTextGroup}>
                                <SkeletonPulse style={styles.listLineLarge} />
                                <SkeletonPulse style={styles.listLineSmall} />
                            </View>
                            <SkeletonPulse style={styles.pillBadge} />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingBottom: 18,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 14,
    },
    headerTextGroup: {
        gap: 6,
        flex: 1,
    },
    headerLineSmall: {
        width: '40%',
        height: 12,
        borderRadius: 4,
    },
    headerLineLarge: {
        width: '75%',
        height: 18,
        borderRadius: 6,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    pill: {
        width: 100,
        height: 38,
        borderRadius: 19,
    },
    circle: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    heroCard: {
        marginHorizontal: 20,
        marginBottom: 28,
        height: 180,
        backgroundColor: '#FFFFFF',
        borderRadius: SgateRadius['2xl'],
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 22,
        elevation: 2,
    },
    heroLeft: {
        flex: 1,
        gap: 10,
    },
    heroEyebrow: {
        width: '50%',
        height: 14,
        borderRadius: 4,
    },
    heroTitleLine1: {
        width: '85%',
        height: 22,
        borderRadius: 6,
    },
    heroTitleLine2: {
        width: '70%',
        height: 22,
        borderRadius: 6,
    },
    heroPill: {
        width: '75%',
        height: 30,
        borderRadius: 15,
        marginTop: 12,
    },
    heroIllustration: {
        width: 110,
        height: 110,
        borderRadius: 16,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    sectionTitle: {
        width: 120,
        height: 14,
        borderRadius: 4,
        marginBottom: 18,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        rowGap: 12,
    },
    quickItem: {
        width: '25%',
        paddingHorizontal: 6,
    },
    quickCard: {
        height: 118,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 12,
    },
    quickIcon: {
        width: 56,
        height: 56,
        borderRadius: 17,
    },
    quickLabel: {
        width: '80%',
        height: 12,
        borderRadius: 4,
    },
    whiteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 22,
        elevation: 2,
    },
    cardPadding: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    listDivider: {
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    listTextGroup: {
        flex: 1,
        gap: 6,
    },
    listLineLarge: {
        width: '60%',
        height: 14,
        borderRadius: 4,
    },
    listLineSmall: {
        width: '40%',
        height: 11,
        borderRadius: 3,
    },
    actionBtn: {
        width: 60,
        height: 32,
        borderRadius: 16,
    },
    pillBadge: {
        width: 60,
        height: 22,
        borderRadius: 11,
    },
});
