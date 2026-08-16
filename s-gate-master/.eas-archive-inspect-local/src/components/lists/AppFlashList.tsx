import React, { useCallback } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon?: keyof typeof Feather.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <Feather name={icon} size={36} color={SgateColors.t4} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
            {actionLabel && onAction && (
                <TouchableOpacity onPress={onAction} style={styles.emptyAction} activeOpacity={0.8}>
                    <Text style={styles.emptyActionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── List Footer Loader ───────────────────────────────────────────────────────

export function ListFooterLoader({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return (
        <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={SgateColors.gold} />
        </View>
    );
}

// ─── Skeleton Shimmer ─────────────────────────────────────────────────────────

function SkeletonBar({ width, height = 14, style }: { width: number | string; height?: number; style?: any }) {
    return (
        <View style={[styles.skeletonBar, { width: width as any, height }, style]} />
    );
}

export function SkeletonCard() {
    return (
        <View style={styles.skeletonCard}>
            <View style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonTextGroup}>
                    <SkeletonBar width="70%" height={16} />
                    <SkeletonBar width="50%" height={12} style={{ marginTop: 8 }} />
                    <SkeletonBar width="40%" height={10} style={{ marginTop: 8 }} />
                </View>
            </View>
        </View>
    );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
    return (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    );
}

// ─── AppFlashList ─────────────────────────────────────────────────────────────

interface AppFlashListProps<T> extends FlashListProps<T> {
    isLoading?: boolean;
    isError?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    emptyIcon?: keyof typeof Feather.glyphMap;
    emptyTitle?: string;
    emptySubtitle?: string;
    emptyActionLabel?: string;
    onEmptyAction?: () => void;
    skeletonCount?: number;
    showFooterLoader?: boolean;
}

export function AppFlashList<T>({
    isLoading = false,
    isError = false,
    errorMessage = 'Something went wrong',
    onRetry,
    isRefreshing = false,
    onRefresh,
    emptyIcon = 'inbox',
    emptyTitle = 'Nothing here yet',
    emptySubtitle,
    emptyActionLabel,
    onEmptyAction,
    skeletonCount = 4,
    showFooterLoader = false,
    data,
    ...flashListProps
}: AppFlashListProps<T>) {
    // Show skeleton during initial load
    if (isLoading && (!data || (data as any[]).length === 0)) {
        return <SkeletonList count={skeletonCount} />;
    }

    // Show error state
    if (isError) {
        return (
            <EmptyState
                icon="alert-circle"
                title="Oops!"
                subtitle={errorMessage}
                actionLabel={onRetry ? 'Try Again' : undefined}
                onAction={onRetry}
            />
        );
    }

    const refreshControl = onRefresh ? (
        <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={SgateColors.gold}
            colors={[SgateColors.gold]}
        />
    ) : undefined;

    return (
        <FlashList
            data={data}
            refreshControl={refreshControl}
            ListEmptyComponent={
                <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    subtitle={emptySubtitle}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                />
            }
            ListFooterComponent={<ListFooterLoader visible={showFooterLoader} />}
            showsVerticalScrollIndicator={false}
            {...flashListProps}
        />
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        paddingHorizontal: 32,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    emptyAction: {
        backgroundColor: SgateColors.gold,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
    },
    emptyActionText: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    skeletonCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    skeletonAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: SgateColors.surface,
    },
    skeletonTextGroup: {
        flex: 1,
    },
    skeletonBar: {
        backgroundColor: SgateColors.surface,
        borderRadius: 6,
    },
});
