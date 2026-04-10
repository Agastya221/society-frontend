import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SgateColors, SgateRadius } from '../../../../constants/Sgate-theme';

// ─── Shimmer Bar ──────────────────────────────────────────────────────────────

function ShimmerBar({ width, height = 14, radius = 8 }: { width: number | string; height?: number; radius?: number }) {
    const anim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <Animated.View
            style={{
                width: width as any,
                height,
                borderRadius: radius,
                backgroundColor: SgateColors.surface,
                opacity: anim,
            }}
        />
    );
}

// ─── Row Skeleton ─────────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <View style={styles.row}>
            <ShimmerBar width={40} height={40} radius={20} />
            <View style={styles.rowBody}>
                <ShimmerBar width={120} height={14} />
                <ShimmerBar width={80} height={10} />
            </View>
        </View>
    );
}

// ─── Grid Skeleton ────────────────────────────────────────────────────────────

function GridSkeleton() {
    return (
        <View style={styles.grid}>
            <View style={styles.gridRow}>
                <ShimmerBar width="47%" height={80} radius={SgateRadius.sm} />
                <ShimmerBar width="47%" height={80} radius={SgateRadius.sm} />
            </View>
            <View style={styles.gridRow}>
                <ShimmerBar width="47%" height={80} radius={SgateRadius.sm} />
                <ShimmerBar width="47%" height={80} radius={SgateRadius.sm} />
            </View>
        </View>
    );
}

// ─── Public Component ─────────────────────────────────────────────────────────

interface SectionSkeletonProps {
    rows?: number;
    hasGrid?: boolean;
}

export function SectionSkeleton({ rows = 3, hasGrid = false }: SectionSkeletonProps) {
    if (hasGrid) return <GridSkeleton />;

    return (
        <View style={styles.container}>
            {Array.from({ length: rows }).map((_, i) => (
                <RowSkeleton key={i} />
            ))}
        </View>
    );
}

// ─── Profile Header Skeleton ──────────────────────────────────────────────────

export function ProfileHeaderSkeleton() {
    return (
        <View style={styles.headerSkeleton}>
            <ShimmerBar width={72} height={72} radius={36} />
            <View style={{ marginLeft: 16, flex: 1 }}>
                <ShimmerBar width={140} height={18} />
                <View style={{ height: 8 }} />
                <ShimmerBar width={100} height={12} />
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        backgroundColor: SgateColors.card,
        borderRadius: SgateRadius.sm,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    rowBody: {
        flex: 1,
        gap: 6,
    },
    grid: {
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 12,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
});
