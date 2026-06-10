import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SgateFonts } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import {
    getFeaturedCities,
    getAllCities,
    searchCities,
    saveRecentCity,
} from '@/services/location.service';
import { getCityIcon } from '@/assets/city-icons';
import type { City } from '@/types/onboarding.types';

const GRID_COLS = 3;

// ─── Featured Grid Cell (with press animation) ───────────────────────────────

const CityGridCell = React.memo(function CityGridCell({
    city,
    onPress,
    isLastCol,
}: {
    city: City;
    onPress: () => void;
    isLastCol: boolean;
}) {
    const CityIcon = getCityIcon(city.id);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.92, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 150 });
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.gridCell, !isLastCol && styles.gridCellBorderRight]}
        >
            <Animated.View style={[styles.gridCellInner, animatedStyle]}>
                <View style={styles.gridIconWrap}>
                    <CityIcon size={48} color="#BDBDBD" />
                </View>
                <Text style={styles.gridCityName} numberOfLines={1}>
                    {city.name}
                </Text>
            </Animated.View>
        </Pressable>
    );
});

// ─── Grid Row ─────────────────────────────────────────────────────────────────

function GridRow({
    cities,
    onPress,
    isLastRow,
}: {
    cities: City[];
    onPress: (city: City) => void;
    isLastRow: boolean;
}) {
    return (
        <View style={[styles.gridRow, !isLastRow && styles.gridRowBorderBottom]}>
            {cities.map((city, col) => (
                <CityGridCell
                    key={city.id}
                    city={city}
                    onPress={() => onPress(city)}
                    isLastCol={col === GRID_COLS - 1}
                />
            ))}
            {Array.from({ length: GRID_COLS - cities.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.gridCell} />
            ))}
        </View>
    );
}

// ─── Flat List Row ────────────────────────────────────────────────────────────

const CityListRow = React.memo(function CityListRow({
    city,
    onPress,
}: {
    city: City;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.4}
            style={styles.listRow}
        >
            <Text style={styles.listRowText}>{city.name}</Text>
        </TouchableOpacity>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SelectCityScreen() {
    const router  = useRouter();
    const insets  = useSafeAreaInsets();
    const setCity = useOnboardingStore((s) => s.setCity);
    const flowMode = useOnboardingStore((s) => s.flowMode);
    const returnTo = useOnboardingStore((s) => s.returnTo);
    const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch]   = useState(false);
    const inputRef = useRef<TextInput>(null);

    const featuredCities = useMemo(() => getFeaturedCities().slice(0, 9), []);

    const gridRows = useMemo(() => {
        const rows: City[][] = [];
        for (let i = 0; i < featuredCities.length; i += GRID_COLS) {
            rows.push(featuredCities.slice(i, i + GRID_COLS));
        }
        return rows;
    }, [featuredCities]);

    const listCities = useMemo(() => {
        if (searchQuery.trim()) return searchCities(searchQuery);
        return getAllCities();
    }, [searchQuery]);

    const handleSelectCity = useCallback(
        async (city: City) => {
            setCity(city);
            await saveRecentCity(city);
            router.push('/(onboarding)/society-search');
        },
        [setCity, router]
    );

    const openSearch = () => {
        setShowSearch(true);
        setTimeout(() => inputRef.current?.focus(), 60);
    };

    const closeSearch = () => {
        setShowSearch(false);
        setSearchQuery('');
    };

    const handleBack = () => {
        if (flowMode === 'addMembership') {
            const destination = returnTo || '/(resident)/profile';
            resetOnboarding();
            router.replace(destination as any);
            return;
        }
        router.back();
    };

    const renderItem = useCallback(
        ({ item }: { item: City }) => (
            <CityListRow city={item} onPress={() => handleSelectCity(item)} />
        ),
        [handleSelectCity]
    );

    const keyExtractor = useCallback((item: City) => item.id, []);

    const ListHeader = useMemo(
        () => (
            <View style={styles.grid}>
                {gridRows.map((row, rowIdx) => (
                    <GridRow
                        key={rowIdx}
                        cities={row}
                        onPress={handleSelectCity}
                        isLastRow={rowIdx === gridRows.length - 1}
                    />
                ))}
            </View>
        ),
        [gridRows, handleSelectCity]
    );

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* ── Header ── */}
            <View style={styles.header}>
                {showSearch ? (
                    <Animated.View entering={FadeIn.duration(120)} style={styles.searchRow}>
                        <TouchableOpacity onPress={closeSearch} style={styles.headerIconBtn}>
                            <Feather name="arrow-left" size={22} color="#222" />
                        </TouchableOpacity>
                        <View style={styles.searchBar}>
                            <Feather name="search" size={16} color="#AAAAAA" />
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                placeholder="Search city..."
                                placeholderTextColor="#BBBBBB"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Feather name="x" size={16} color="#AAAAAA" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>
                ) : (
                    <View style={styles.normalRow}>
                        <TouchableOpacity
                            onPress={handleBack}
                            style={styles.headerIconBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Feather name="arrow-left" size={22} color="#222" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Select City</Text>
                        <TouchableOpacity
                            onPress={openSearch}
                            style={styles.headerIconBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Feather name="search" size={22} color="#222" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ── City List ── */}
            <FlashList
                data={listCities}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListHeaderComponent={!searchQuery ? ListHeader : undefined}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Feather name="map-pin" size={28} color="#D0D0D0" />
                        <Text style={styles.emptyText}>No cities found</Text>
                    </View>
                }
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // ── Header ──
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E8E8E8',
    },
    normalRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 22,
        fontFamily: SgateFonts.bold,
        color: '#111111',
        letterSpacing: -0.3,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F4F4F4',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 9 : 5,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: '#111111',
        padding: 0,
    },

    // ── Featured Grid ──
    grid: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E8E8E8',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridRowBorderBottom: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#EBEBEB',
    },
    gridCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 4,
        minHeight: 108,
    },
    gridCellBorderRight: {
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: '#EBEBEB',
    },
    gridCellInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridIconWrap: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    gridCityName: {
        fontSize: 12,
        fontFamily: SgateFonts.medium ?? SgateFonts.regular,
        color: '#555555',
        textAlign: 'center',
        letterSpacing: 0.1,
    },

    // ── Alphabetical List ──
    listRow: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
    },
    listRowText: {
        fontSize: 15,
        fontFamily: SgateFonts.regular,
        color: '#222222',
    },

    // ── Empty ──
    emptyWrap: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: '#AAAAAA',
    },
});
