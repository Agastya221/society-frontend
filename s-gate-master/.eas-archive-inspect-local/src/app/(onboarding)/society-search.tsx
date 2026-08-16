import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useSocieties } from '@/hooks/useOnboardingQueries';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { SkeletonList } from '@/components/lists/AppFlashList';
import type { Society } from '@/types/onboarding.types';

// ─── Society Card ─────────────────────────────────────────────────────────────

const SocietyCard = memo(function SocietyCard({
    society,
    onPress,
    index,
}: {
    society: Society;
    onPress: () => void;
    index: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 60).duration(400).springify()}>
            <TouchableOpacity
                onPress={onPress}
                style={styles.card}
                activeOpacity={0.7}
            >
                {/* Gold accent line on the left */}
                <View style={styles.cardAccent} />

                <View style={styles.cardInner}>
                    <View style={styles.cardRow}>
                        <View style={styles.cardIconBox}>
                            <Feather name="home" size={18} color={SgateColors.gold} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {society.name}
                            </Text>
                            <View style={styles.cardAddressRow}>
                                <Feather name="map-pin" size={10} color={SgateColors.t4} />
                                <Text style={styles.cardAddress} numberOfLines={1}>
                                    {society.address}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.chevronBox}>
                            <Feather name="chevron-right" size={16} color={SgateColors.gold} />
                        </View>
                    </View>

                    {/* Meta chips row */}
                    <View style={styles.cardMetaRow}>
                        <View style={styles.metaChip}>
                            <Feather name="map" size={10} color={SgateColors.gold} />
                            <Text style={styles.metaText}>
                                {society.city}, {society.state}
                            </Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaChip}>
                            <Feather name="grid" size={10} color={SgateColors.gold} />
                            <Text style={styles.metaText}>
                                {society.totalFlats} flats
                            </Text>
                        </View>
                        {society.totalBlocks > 0 && (
                            <>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaChip}>
                                    <Feather name="layers" size={10} color={SgateColors.gold} />
                                    <Text style={styles.metaText}>
                                        {society.totalBlocks} blocks
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── Empty State ──────────────────────────────────────────────────────────────

function NoSocietiesFound() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <View style={styles.emptyIconInner}>
                    <Feather name="search" size={28} color={SgateColors.t4} />
                </View>
            </View>
            <Text style={styles.emptyTitle}>No societies found</Text>
            <Text style={styles.emptySubtitle}>
                Society is not active on S-Gate yet.{'\n'}
                Please contact your society office or S-Gate support.
            </Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SocietySearchScreen() {
    const router = useRouter();
    const selectedCity = useOnboardingStore((s) => s.selectedCity);
    const setSociety = useOnboardingStore((s) => s.setSociety);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce search input
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search]);

    const {
        data: societies,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    } = useSocieties({
        city: selectedCity?.name,
        search: debouncedSearch || undefined,
    });

    const handleSelectSociety = useCallback(
        (society: Society) => {
            setSociety(society);
            router.push('/(onboarding)/select-block');
        },
        [setSociety, router]
    );

    const renderItem = useCallback(
        ({ item, index }: { item: Society; index: number }) => (
            <SocietyCard society={item} onPress={() => handleSelectSociety(item)} index={index} />
        ),
        [handleSelectSociety]
    );

    const keyExtractor = useCallback((item: Society) => item.id, []);

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <OnboardingHeader
                title="Find Your Society"
                subtitle={selectedCity ? `in ${selectedCity.name}` : 'Search by name'}
                step={2}
                stepLabel="Search Society"
            />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[
                    styles.searchBar,
                    isFocused && styles.searchBarFocused,
                ]}>
                    <Feather
                        name="search"
                        size={18}
                        color={isFocused ? SgateColors.gold : SgateColors.t4}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search societies..."
                        placeholderTextColor={SgateColors.t4}
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearch('')}
                            style={styles.clearButton}
                        >
                            <Feather name="x" size={14} color={SgateColors.t4} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results */}
            {isLoading ? (
                <SkeletonList count={4} />
            ) : (
                <FlashList
                    data={societies ?? []}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListEmptyComponent={<NoSocietiesFound />}
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

    // ── Search ──
    searchContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        ...SgateShadows.minimal,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.bg,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        gap: 10,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
    },
    searchBarFocused: {
        borderColor: SgateColors.gold,
        backgroundColor: SgateColors.goldPale,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        padding: 0,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Card ──
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        ...SgateShadows.card,
    },
    cardAccent: {
        position: 'absolute',
        left: 0,
        top: 12,
        bottom: 12,
        width: 3,
        borderRadius: 2,
        backgroundColor: SgateColors.gold,
    },
    cardInner: {
        padding: 16,
        paddingLeft: 18,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: SgateColors.goldPale,
        borderWidth: 1,
        borderColor: '#FFE8A0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    cardAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardAddress: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        flex: 1,
    },
    chevronBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Meta ──
    cardMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        gap: 8,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaDivider: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: SgateColors.border,
    },
    metaText: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },

    // ── Empty ──
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 72,
        paddingHorizontal: 32,
    },
    emptyIconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyIconInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 18,
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
