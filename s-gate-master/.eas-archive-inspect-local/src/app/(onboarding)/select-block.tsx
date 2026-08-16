import React, { memo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useBlocks } from '@/hooks/useOnboardingQueries';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { SkeletonList } from '@/components/lists/AppFlashList';
import type { Block } from '@/types/onboarding.types';

// ─── Block Card ───────────────────────────────────────────────────────────────

const BlockCard = memo(function BlockCard({
    block,
    onPress,
    index,
}: {
    block: Block;
    onPress: () => void;
    index: number;
}) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify()}
            style={animStyle}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
                onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
                activeOpacity={0.9}
                style={styles.card}
            >
                <View style={styles.cardRow}>
                    <View style={styles.cardIconBox}>
                        <Feather name="layers" size={22} color={SgateColors.gold} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{block.name}</Text>
                        {block.description ? (
                            <Text style={styles.cardDescription} numberOfLines={1}>
                                {block.description}
                            </Text>
                        ) : null}
                        <View style={styles.cardMetaRow}>
                            <View style={styles.metaChip}>
                                <Feather name="grid" size={10} color={SgateColors.gold} />
                                <Text style={styles.metaText}>
                                    {block.totalFlats} flats
                                </Text>
                            </View>
                            {block.totalFloors > 0 && (
                                <View style={styles.metaChip}>
                                    <Feather name="bar-chart-2" size={10} color={SgateColors.gold} />
                                    <Text style={styles.metaText}>
                                        {block.totalFloors} floors
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={SgateColors.t4} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SelectBlockScreen() {
    const router = useRouter();
    const selectedSociety = useOnboardingStore((s) => s.selectedSociety);
    const setBlock = useOnboardingStore((s) => s.setBlock);

    const {
        data: blocks,
        isLoading,
        isError,
        refetch,
        isRefetching,
    } = useBlocks(selectedSociety?.id);

    const handleSelectBlock = useCallback(
        (block: Block) => {
            setBlock(block);
            router.push('/(onboarding)/select-flat');
        },
        [setBlock, router]
    );

    const renderItem = useCallback(
        ({ item, index }: { item: Block; index: number }) => (
            <BlockCard
                block={item}
                index={index}
                onPress={() => handleSelectBlock(item)}
            />
        ),
        [handleSelectBlock]
    );

    const keyExtractor = useCallback((item: Block) => item.id, []);

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <OnboardingHeader
                title="Select Block / Tower"
                subtitle={selectedSociety?.name}
                step={3}
                stepLabel="Select Block"
            />

            {isLoading ? (
                <SkeletonList count={4} />
            ) : (
                <FlashList
                    data={blocks ?? []}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBox}>
                                <Feather name="layers" size={36} color={SgateColors.t4} />
                            </View>
                            <Text style={styles.emptyTitle}>No blocks found</Text>
                            <Text style={styles.emptySubtitle}>
                                This society doesn't have any blocks/towers set up yet.
                            </Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor={SgateColors.gold}
                            colors={[SgateColors.gold]}
                        />
                    }
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        ...SgateShadows.minimal,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 3,
    },
    cardDescription: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginBottom: 6,
    },
    cardMetaRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
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
    },
});
