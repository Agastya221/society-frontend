import React from 'react';
import { StyleSheet, View } from 'react-native';

export function HeaderSkeleton() {
    return <View style={[styles.skeletonCard, styles.headerSkeleton]} />;
}

export function HeroCardSkeleton() {
    return <View style={[styles.skeletonCard, styles.heroSkeleton]} />;
}

export function QuickActionsSkeleton() {
    return (
        <View style={styles.quickSkeletonRow}>
            {Array.from({ length: 8 }).map((_, index) => (
                <View key={index} style={styles.quickSkeletonItem} />
            ))}
        </View>
    );
}

export function GateSkeleton() {
    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonRow}>
                <View style={styles.skeletonCircle} />
                <View style={{ flex: 1 }}>
                    <View style={[styles.skeletonLine, { width: '60%' }]} />
                    <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
                </View>
            </View>
        </View>
    );
}

export function ActivitySkeleton() {
    return <GateSkeleton />;
}

const styles = StyleSheet.create({
    skeletonCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 24,
        padding: 16,
    },
    headerSkeleton: {
        height: 92,
        marginHorizontal: 20,
    },
    heroSkeleton: {
        height: 180,
        marginHorizontal: 20,
    },
    quickSkeletonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 16,
        paddingHorizontal: 20,
    },
    quickSkeletonItem: {
        width: '22%',
        height: 118,
        borderRadius: 24,
        backgroundColor: '#FAFAFA',
        marginHorizontal: '1.5%',
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skeletonCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#EBEBEB',
    },
    skeletonLine: {
        height: 11,
        borderRadius: 6,
        backgroundColor: '#EBEBEB',
    },
});
