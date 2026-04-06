import api from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHIFT_LABEL: Record<string, string> = {
    MORNING: 'Morning Shift',
    EVENING: 'Evening Shift',
    NIGHT:   'Night Shift',
};

export default function GuardDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuthStore();
    const [pendingCount, setPendingCount] = useState(0);

    useFocusEffect(useCallback(() => {
        api.get('/api/v1/gate/entry-requests?status=PENDING')
            .then((res) => {
                const entries: any[] = res.data?.data?.entries ?? res.data?.data ?? [];
                setPendingCount(entries.length);
            })
            .catch(() => {});
    }, []));

    return (
        <View style={[S.root, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <View style={S.header}>
                <View>
                    <Text style={S.gateName}>{user?.gate ?? 'Gate'}</Text>
                    <Text style={S.guardName}>{user?.name ?? 'Guard'}</Text>
                </View>
                <View style={S.dutyBadge}>
                    <View style={S.dutyDot} />
                    <Text style={S.dutyText}>
                        {user?.shift ? SHIFT_LABEL[user.shift] : 'On Duty'}
                    </Text>
                </View>
            </View>

            {/* ── Pending approvals banner ─────────────────────────────────── */}
            {pendingCount > 0 && (
                <Pressable
                    style={S.pendingBanner}
                    onPress={() => router.push('/approvals')}
                >
                    <View style={S.pendingLeft}>
                        <View style={S.pendingIconBox}>
                            <Ionicons name="time" size={26} color="#fff" />
                        </View>
                        <View>
                            <Text style={S.pendingCount}>{pendingCount} waiting for approval</Text>
                            <Text style={S.pendingSub}>Tap to review →</Text>
                        </View>
                    </View>
                </Pressable>
            )}

            <ScrollView
                contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >

                {/* ── Primary actions ──────────────────────────────────────── */}
                <Text style={S.sectionLabel}>MAIN ACTIONS</Text>
                <View style={S.bigRow}>
                    {/* New Entry — largest, most important */}
                    <TouchableOpacity
                        style={[S.bigTile, { backgroundColor: '#0D0F14' }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/new-entry');
                        }}
                        activeOpacity={0.85}
                    >
                        <View style={[S.tileIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                            <Ionicons name="add-circle" size={34} color="#fff" />
                        </View>
                        <Text style={[S.tileTitle, { color: '#fff' }]}>New Entry</Text>
                        <Text style={[S.tileSub, { color: 'rgba(255,255,255,0.6)' }]}>Let visitor in</Text>
                    </TouchableOpacity>

                    {/* Scan QR */}
                    <TouchableOpacity
                        style={[S.bigTile, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/scan-verify');
                        }}
                        activeOpacity={0.85}
                    >
                        <View style={[S.tileIcon, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="qr-code" size={34} color="#1D4ED8" />
                        </View>
                        <Text style={[S.tileTitle, { color: '#0D0F14' }]}>Scan QR</Text>
                        <Text style={[S.tileSub, { color: '#6B7280' }]}>Verify pass</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Secondary actions ─────────────────────────────────────── */}
                <Text style={S.sectionLabel}>MORE ACTIONS</Text>
                <View style={S.smallGrid}>
                    <TouchableOpacity
                        style={S.smallTile}
                        onPress={() => router.push('/today-entries')}
                        activeOpacity={0.82}
                    >
                        <Ionicons name="list-circle" size={28} color="#16A34A" />
                        <Text style={S.smallLabel}>Today's{'\n'}Entries</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[S.smallTile, pendingCount > 0 && S.smallTileAlert]}
                        onPress={() => router.push('/approvals')}
                        activeOpacity={0.82}
                    >
                        <Ionicons name="time" size={28} color="#D97706" />
                        <Text style={S.smallLabel}>Approvals</Text>
                        {pendingCount > 0 && (
                            <View style={S.smallBadge}>
                                <Text style={S.smallBadgeText}>{pendingCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={S.smallTile}
                        onPress={() => router.push('/staff-scan')}
                        activeOpacity={0.82}
                    >
                        <Ionicons name="people" size={28} color="#7C3AED" />
                        <Text style={S.smallLabel}>Staff{'\n'}Check-In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={S.smallTile}
                        onPress={() => router.push('/profile')}
                        activeOpacity={0.82}
                    >
                        <Ionicons name="person-circle" size={28} color="#0891B2" />
                        <Text style={S.smallLabel}>My{'\n'}Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Emergency ─────────────────────────────────────────────── */}
                <TouchableOpacity
                    style={S.emergencyTile}
                    onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        router.push('/emergencies');
                    }}
                    activeOpacity={0.85}
                >
                    <Ionicons name="warning" size={28} color="#fff" />
                    <Text style={S.emergencyLabel}>Report Emergency</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* ── FAB: New Entry ───────────────────────────────────────────── */}
            <TouchableOpacity
                style={[S.fab, { bottom: insets.bottom + 20 }]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.push('/new-entry');
                }}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={34} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const S = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F5F5F4',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EEEB',
    },
    gateName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0D0F14',
        letterSpacing: -0.5,
    },
    guardName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 2,
    },
    dutyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    dutyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#16A34A',
    },
    dutyText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803D',
    },

    // ── Pending banner ────────────────────────────────────────────────────────
    pendingBanner: {
        backgroundColor: '#1D4ED8',
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Platform.select({
            ios: { shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14 },
            android: { elevation: 6 },
        }),
    },
    pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    pendingIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingCount: { fontSize: 17, fontWeight: '800', color: '#fff' },
    pendingSub: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    // ── Scroll / sections ─────────────────────────────────────────────────────
    scroll: { padding: 16 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 1.5,
        marginBottom: 10,
        marginTop: 20,
        marginLeft: 2,
    },

    // ── Big 2-col tiles ───────────────────────────────────────────────────────
    bigRow: {
        flexDirection: 'row',
        gap: 12,
    },
    bigTile: {
        flex: 1,
        borderRadius: 22,
        padding: 20,
        minHeight: 148,
        justifyContent: 'flex-end',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14 },
            android: { elevation: 3 },
        }),
    },
    tileIcon: {
        width: 58,
        height: 58,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    tileTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    tileSub: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 3,
    },

    // ── Small 4-col grid ──────────────────────────────────────────────────────
    smallGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    smallTile: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#F0EEEB',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
            android: { elevation: 1 },
        }),
    },
    smallTileAlert: {
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
    },
    smallLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 15,
    },
    smallBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#DC2626',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    smallBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },

    // ── Emergency ─────────────────────────────────────────────────────────────
    emergencyTile: {
        backgroundColor: '#DC2626',
        borderRadius: 18,
        marginTop: 10,
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...Platform.select({
            ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
            android: { elevation: 5 },
        }),
    },
    emergencyLabel: {
        fontSize: 17,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.3,
    },

    // ── FAB ───────────────────────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        right: 20,
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#0D0F14',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 18 },
            android: { elevation: 10 },
        }),
    },
});
