import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '../../constants/Sgate-theme';
import type { Entry } from '../../types/api';
import * as gateService from '../../services/gate.service';

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'At Gate' | 'Expected' | 'Collected';
const TABS: Tab[] = ['At Gate', 'Expected', 'Collected'];

// ─── Expected delivery shape (service returns unknown[]) ─────────────────────

interface ExpectedDelivery {
    id: string;
    company: string;
    expectedDate: string;
    trackingId?: string;
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DeliveriesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<Tab>('At Gate');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [expected, setExpected] = useState<ExpectedDelivery[]>([]);
    const [atGate, setAtGate] = useState<Entry[]>([]);
    const [collected, setCollected] = useState<Entry[]>([]);

    // ── Fetch all data ───────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        const [expectedRes, atGateRes, collectedRes] = await Promise.allSettled([
            gateService.getExpectedDeliveries(),
            gateService.getEntries({ type: 'DELIVERY', status: 'CHECKED_IN' }),
            gateService.getEntries({ type: 'DELIVERY', status: 'CHECKED_OUT' }),
        ]);

        if (expectedRes.status === 'fulfilled')
            setExpected(expectedRes.value as ExpectedDelivery[]);
        if (atGateRes.status === 'fulfilled')
            setAtGate(atGateRes.value);
        if (collectedRes.status === 'fulfilled')
            setCollected(collectedRes.value);
    }, []);

    useEffect(() => {
        (async () => {
            await fetchAll();
            setLoading(false);
        })();
    }, [fetchAll]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAll();
        setRefreshing(false);
    }, [fetchAll]);

    // ── Active list based on tab ─────────────────────────────────────────
    const activeData = useMemo(() => {
        switch (activeTab) {
            case 'At Gate':   return atGate;
            case 'Expected':  return expected;
            case 'Collected': return collected;
        }
    }, [activeTab, atGate, expected, collected]);

    // ── Count for badge ──────────────────────────────────────────────────
    const countFor = useCallback(
        (tab: Tab) => {
            switch (tab) {
                case 'At Gate':   return atGate.length;
                case 'Expected':  return expected.length;
                case 'Collected': return collected.length;
            }
        },
        [atGate, expected, collected],
    );

    // ── Render card ──────────────────────────────────────────────────────
    const renderItem = useCallback(
        ({ item, index }: { item: Entry | ExpectedDelivery; index: number }) => {
            if (activeTab === 'Expected') {
                const d = item as ExpectedDelivery;
                return (
                    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                        <View style={styles.card}>
                            <View style={[styles.iconBubble, { backgroundColor: '#E8F0FE' }]}>
                                <Feather name="package" size={20} color="#3B82F6" />
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.cardTitle}>{d.company}</Text>
                                <Text style={styles.cardSub}>
                                    Expected {formatDate(d.expectedDate)}
                                </Text>
                                {d.trackingId ? (
                                    <Text style={styles.trackingId}>
                                        Tracking: {d.trackingId}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={styles.cardRight}>
                                <Feather name="clock" size={14} color={SgateColors.t3} />
                            </View>
                        </View>
                    </Animated.View>
                );
            }

            if (activeTab === 'Collected') {
                const e = item as Entry;
                return (
                    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                        <View style={styles.card}>
                            <View style={[styles.iconBubble, { backgroundColor: SgateColors.greenBg }]}>
                                <Feather name="check-circle" size={20} color={SgateColors.green} />
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.cardTitle}>{e.visitorName}</Text>
                                <Text style={styles.cardSub}>
                                    Collected {e.checkOutAt ? timeAgo(e.checkOutAt) : ''}
                                </Text>
                            </View>
                            <View style={styles.cardRight}>
                                <View style={styles.collectedBadge}>
                                    <Text style={styles.collectedText}>Done</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                );
            }

            // At Gate
            const e = item as Entry;
            return (
                <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                    <View style={styles.card}>
                        <View style={[styles.iconBubble, { backgroundColor: SgateColors.goldPale }]}>
                            <Feather name="package" size={20} color={SgateColors.gold} />
                        </View>
                        <View style={styles.cardBody}>
                            <Text style={styles.cardTitle}>{e.visitorName}</Text>
                            <Text style={styles.cardSub}>
                                Arrived {timeAgo(e.createdAt)}
                            </Text>
                        </View>
                        <View style={styles.cardRight}>
                            <View style={styles.collectBtn}>
                                <Text style={styles.collectBtnText}>Collect</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            );
        },
        [activeTab],
    );

    const keyExtractor = useCallback(
        (item: Entry | ExpectedDelivery) => (item as { id: string }).id,
        [],
    );

    // ── Empty state ──────────────────────────────────────────────────────
    const ListEmpty = useCallback(
        () => (
            <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                    <Feather
                        name={activeTab === 'At Gate' ? 'package' : activeTab === 'Expected' ? 'clock' : 'check-circle'}
                        size={32}
                        color={SgateColors.t3}
                    />
                </View>
                <Text style={styles.emptyTitle}>
                    {activeTab === 'At Gate'
                        ? 'No deliveries at gate'
                        : activeTab === 'Expected'
                          ? 'No expected deliveries'
                          : 'No collected deliveries'}
                </Text>
                <Text style={styles.emptySub}>
                    {activeTab === 'Expected'
                        ? 'Tap + to add an expected delivery'
                        : 'Deliveries will appear here'}
                </Text>
            </View>
        ),
        [activeTab],
    );

    // ── Loading ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={SgateColors.gold} />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity 
                    onPress={() => router.push('/(resident)/home' as any)}
                    style={styles.backButton}
                    accessibilityLabel="Go back to Home"
                >
                    <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Deliveries</Text>
            </View>

            {/* ── Segmented control ───────────────────────────────────── */}
            <View style={styles.segWrap}>
                <View style={styles.segRow}>
                    {TABS.map((tab) => {
                        const active = tab === activeTab;
                        const count = countFor(tab);
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.segPill, active && styles.segPillActive]}
                                activeOpacity={0.7}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text
                                    style={[
                                        styles.segLabel,
                                        active && styles.segLabelActive,
                                    ]}
                                >
                                    {tab}
                                </Text>
                                {count > 0 && (
                                    <View
                                        style={[
                                            styles.segBadge,
                                            active && styles.segBadgeActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.segBadgeText,
                                                active && styles.segBadgeTextActive,
                                            ]}
                                        >
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── List ────────────────────────────────────────────────── */}
            <FlatList
                data={activeData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={
                    activeData.length === 0 ? styles.emptyContainer : styles.listContent
                }
                refreshing={refreshing}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
            />

            {/* ── FAB ─────────────────────────────────────────────────── */}
            <TouchableOpacity
                style={[styles.fab, { bottom: 24 + insets.bottom }]}
                activeOpacity={0.85}
                onPress={() => router.push('/(resident)/expect-delivery' as any)}
            >
                <Feather name="plus" size={24} color={SgateColors.black} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Header ──────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },

    // ── Segmented control ───────────────────────────────────────────────
    segWrap: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    segRow: {
        flexDirection: 'row',
        backgroundColor: SgateColors.surface,
        borderRadius: 12,
        padding: 3,
    },
    segPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    segPillActive: {
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    segLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
    segLabelActive: {
        color: SgateColors.t1,
    },
    segBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: SgateColors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    segBadgeActive: {
        backgroundColor: SgateColors.gold,
    },
    segBadgeText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
    },
    segBadgeTextActive: {
        color: SgateColors.black,
    },

    // ── List ────────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // ── Card ────────────────────────────────────────────────────────────
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    iconBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardBody: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginBottom: 2,
    },
    cardSub: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    trackingId: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
        marginTop: 3,
    },
    cardRight: {
        marginLeft: 8,
    },

    // ── Collect button ──────────────────────────────────────────────────
    collectBtn: {
        backgroundColor: SgateColors.gold,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
    },
    collectBtnText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.black,
    },

    // ── Collected badge ─────────────────────────────────────────────────
    collectedBadge: {
        backgroundColor: SgateColors.greenBg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    collectedText: {
        fontSize: 11,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.green,
    },

    // ── Empty state ─────────────────────────────────────────────────────
    empty: {
        alignItems: 'center',
        gap: 8,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },

    // ── FAB ─────────────────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: SgateColors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
