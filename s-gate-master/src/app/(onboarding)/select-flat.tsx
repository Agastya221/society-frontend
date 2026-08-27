import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useFlats } from '@/hooks/useOnboardingQueries';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { SkeletonList } from '@/components/lists/AppFlashList';
import type { Flat } from '@/types/onboarding.types';

// ─── Status color helper ──────────────────────────────────────────────────────

function getStatusColor(flat: Flat) {
    if (flat.isOccupied) return SgateColors.red;
    if (flat.hasOwner) return SgateColors.gold;
    if (flat.canApply) return SgateColors.green;
    return SgateColors.t4;
}

function getStatusLabel(flat: Flat) {
    if (flat.isOccupied) return 'Occupied';
    if (flat.hasOwner) return 'Has Owner';
    if (flat.canApply) return 'Available';
    return '';
}

// ─── Types for list items ─────────────────────────────────────────────────────

type ListItem =
    | { type: 'floor-header'; floor: string; count: number }
    | { type: 'flat'; flat: Flat };

// ─── Flat Row ─────────────────────────────────────────────────────────────────

const FlatRow = memo(function FlatRow({
    flat,
    isSelected,
    onPress,
}: {
    flat: Flat;
    isSelected: boolean;
    onPress: () => void;
}) {
    const disabled = !flat.canApply;
    const statusColor = getStatusColor(flat);
    const statusLabel = getStatusLabel(flat);

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.6}
            style={[
                styles.flatRow,
                isSelected && styles.flatRowSelected,
                disabled && styles.flatRowDisabled,
            ]}
        >
            {/* Left accent */}
            {isSelected && <View style={styles.flatRowAccent} />}

            {/* Home icon */}
            <View style={[
                styles.flatIconBox,
                isSelected && styles.flatIconBoxSelected,
                disabled && styles.flatIconBoxDisabled,
            ]}>
                <Feather
                    name="home"
                    size={16}
                    color={isSelected ? SgateColors.gold : disabled ? SgateColors.t4 : SgateColors.t2}
                />
            </View>

            {/* Flat info */}
            <View style={styles.flatInfo}>
                <Text style={[
                    styles.flatNumber,
                    isSelected && styles.flatNumberSelected,
                    disabled && styles.flatNumberDisabled,
                ]}>
                    {flat.flatNumber}
                </Text>
                <Text style={[styles.flatMeta, disabled && styles.flatMetaDisabled]}>
                    Floor {flat.floor}
                </Text>
            </View>

            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}14` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                    {statusLabel}
                </Text>
            </View>

            {/* Chevron */}
            <Feather
                name={isSelected ? 'check-circle' : 'chevron-right'}
                size={18}
                color={isSelected ? SgateColors.gold : SgateColors.t4}
            />
        </TouchableOpacity>
    );
});

// ─── Floor Header ─────────────────────────────────────────────────────────────

function FloorHeader({ floor, count }: { floor: string; count: number }) {
    return (
        <View style={styles.floorHeader}>
            <View style={styles.floorBadge}>
                <Text style={styles.floorBadgeText}>{floor}</Text>
            </View>
            <Text style={styles.floorLabel}>Floor {floor}</Text>
            <View style={styles.floorLine} />
            <Text style={styles.floorCount}>{count} {count === 1 ? 'flat' : 'flats'}</Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SelectFlatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const selectedSociety = useOnboardingStore((s) => s.selectedSociety);
    const selectedBlock = useOnboardingStore((s) => s.selectedBlock);
    const selectedFlat = useOnboardingStore((s) => s.selectedFlat);
    const setFlat = useOnboardingStore((s) => s.setFlat);

    const [search, setSearch] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const { data: flats, isLoading } = useFlats(
        selectedSociety?.id,
        selectedBlock?.id
    );

    // Filter and group flats
    const listData = useMemo(() => {
        if (!flats) return [];

        // Filter by search
        const filtered = search.trim()
            ? flats.filter(f => f.flatNumber.toLowerCase().includes(search.toLowerCase()))
            : flats;

        // Group by floor
        const grouped: Record<string, Flat[]> = {};
        for (const flat of filtered) {
            const floor = flat.floor || '0';
            if (!grouped[floor]) grouped[floor] = [];
            grouped[floor].push(flat);
        }

        // Build flat list with floor headers
        const items: ListItem[] = [];
        const sortedFloors = Object.entries(grouped).sort(([a], [b]) => parseInt(a) - parseInt(b));

        for (const [floor, floorFlats] of sortedFloors) {
            items.push({ type: 'floor-header', floor, count: floorFlats.length });
            for (const flat of floorFlats) {
                items.push({ type: 'flat', flat });
            }
        }

        return items;
    }, [flats, search]);

    const handleSelectFlat = useCallback(
        (flat: Flat) => {
            if (!flat.canApply) return;
            setFlat(flat);
        },
        [setFlat]
    );

    const handleContinue = () => {
        if (!selectedFlat) return;
        router.push('/(onboarding)/resident-type');
    };

    const canContinue = !!selectedFlat;

    const renderItem = useCallback(
        ({ item }: { item: ListItem }) => {
            if (item.type === 'floor-header') {
                return <FloorHeader floor={item.floor} count={item.count} />;
            }
            return (
                <FlatRow
                    flat={item.flat}
                    isSelected={selectedFlat?.id === item.flat.id}
                    onPress={() => handleSelectFlat(item.flat)}
                />
            );
        },
        [selectedFlat?.id, handleSelectFlat]
    );

    const keyExtractor = useCallback(
        (item: ListItem, index: number) =>
            item.type === 'floor-header' ? `floor-${item.floor}` : item.flat.id,
        []
    );

    const getItemType = useCallback(
        (item: ListItem) => item.type,
        []
    );

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <OnboardingHeader
                title="Select Flat"
                subtitle={`${selectedSociety?.name} · ${selectedBlock?.name}`}
                step={4}
                stepLabel="Select Flat"
            />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
                    <Feather
                        name="search"
                        size={18}
                        color={isFocused ? SgateColors.gold : SgateColors.t4}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search flat number..."
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

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: SgateColors.green }]} />
                        <Text style={styles.legendText}>Available</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: SgateColors.gold }]} />
                        <Text style={styles.legendText}>Has Owner</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: SgateColors.red }]} />
                        <Text style={styles.legendText}>Occupied</Text>
                    </View>
                </View>
            </View>

            {/* Flat List */}
            {isLoading ? (
                <SkeletonList count={8} />
            ) : (
                <FlashList
                    data={listData}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    getItemType={getItemType}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBox}>
                                <Feather name="search" size={28} color={SgateColors.t4} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {search ? 'No matching flats' : 'No flats found'}
                            </Text>
                            <Text style={styles.emptyText}>
                                {search
                                    ? `No flat number matches "${search}"`
                                    : "This block doesn't have any flats yet."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Continue Button */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!canContinue}
                    style={[styles.continueBtn, canContinue && styles.continueBtnActive]}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.continueBtnText,
                            canContinue && styles.continueBtnTextActive,
                        ]}
                    >
                        {selectedFlat
                            ? `Continue with ${selectedFlat.flatNumber}`
                            : 'Select a flat to continue'}
                    </Text>
                    {canContinue && (
                        <Feather name="arrow-right" size={18} color={SgateColors.t1} />
                    )}
                </TouchableOpacity>
            </View>
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
        paddingTop: 12,
        paddingBottom: 10,
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

    // ── Legend ──
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 10,
        paddingLeft: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t4,
    },

    // ── Floor Header ──
    floorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
    },
    floorBadge: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floorBadgeText: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
    floorLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    floorLine: {
        flex: 1,
        height: 1,
        backgroundColor: SgateColors.borderSoft,
    },
    floorCount: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t4,
    },

    // ── Flat Row ──
    flatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
        position: 'relative',
    },
    flatRowSelected: {
        backgroundColor: '#FFFCF0',
        borderRadius: 14,
        borderBottomWidth: 0,
        marginTop: 4,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: SgateColors.gold,
    },
    flatRowDisabled: {
        opacity: 0.45,
    },
    flatRowAccent: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 2,
        backgroundColor: SgateColors.gold,
    },
    flatIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: SgateColors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flatIconBoxSelected: {
        backgroundColor: SgateColors.goldPale,
    },
    flatIconBoxDisabled: {
        backgroundColor: SgateColors.surface,
    },
    flatInfo: {
        flex: 1,
    },
    flatNumber: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: -0.2,
    },
    flatNumberSelected: {
        color: SgateColors.t1,
    },
    flatNumberDisabled: {
        color: SgateColors.t3,
    },
    flatMeta: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginTop: 1,
    },
    flatMetaDisabled: {
        color: SgateColors.t4,
    },

    // ── Status Badge ──
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    statusText: {
        fontSize: 9,
        fontFamily: SgateFonts.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },

    // ── Empty ──
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 72,
        paddingHorizontal: 32,
    },
    emptyIconBox: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },

    // ── Bottom ──
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    continueBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SgateColors.surface,
    },
    continueBtnActive: {
        backgroundColor: SgateColors.gold,
    },
    continueBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t4,
    },
    continueBtnTextActive: {
        color: SgateColors.t1,
    },
});
