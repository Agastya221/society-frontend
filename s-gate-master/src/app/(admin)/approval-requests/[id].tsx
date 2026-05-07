import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { AppAlert } from '@/components/ui/AppAlert';
import { getGatePassById, GatePass } from '../../../services/gatePass';

// ── Badge color configs ──────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    MOVE_OUT:       { bg: '#EEF2FF', text: '#4F46E5' },
    ENTRY:          { bg: '#EEF2FF', text: '#4F46E5' },
    GATE_PASS:      { bg: '#F0FDF4', text: '#16A34A' },
    SPECIAL_ACCESS: { bg: '#FFF4E5', text: '#D97706' },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
    ADMIN:    { bg: '#FFF4E5', text: '#F59E0B' },
    GUARD:    { bg: '#EEF2FF', text: '#4F46E5' },
    RESIDENT: { bg: '#F0FDF4', text: '#16A34A' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    APPROVED: { bg: '#E8F8F1', text: '#16A34A' },
    ACTIVE:   { bg: '#E8F8F1', text: '#16A34A' },
    PAID:     { bg: '#E8F8F1', text: '#16A34A' },
    PENDING:  { bg: '#FFF8E1', text: '#D97706' },
    REJECTED: { bg: '#FEE2E2', text: '#DC2626' },
    EXPIRED:  { bg: '#FEE2E2', text: '#DC2626' },
    INACTIVE: { bg: '#FEE2E2', text: '#DC2626' },
};

const getStatusColor = (status: string) =>
    STATUS_COLORS[status?.toUpperCase()] || { bg: '#F5F5F7', text: '#6B7280' };

const getTypeColor = (type: string) =>
    TYPE_COLORS[type?.toUpperCase()] || { bg: '#F5F5F7', text: '#6B7280' };

const getSourceColor = (source: string) =>
    SOURCE_COLORS[source?.toUpperCase()] || { bg: '#F5F5F7', text: '#6B7280' };

// ── Date formatter ───────────────────────────────────────────────────────
const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// ── InfoRow sub-component ────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
                <MaterialCommunityIcons name={icon as any} size={16} color={SgateColors.t3} />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

// ── Main Screen ──────────────────────────────────────────────────────────
export default function ApprovalRequestDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [request, setRequest] = useState<GatePass | null>(null);

    useEffect(() => {
        if (!id) return;
        getGatePassById(id as string)
            .then(data => setRequest(data))
            .catch(console.error);
    }, [id]);

    // Loading state
    if (!request) {
        return (
            <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={SgateColors.gold} />
                <Text style={styles.loadingText}>Loading details…</Text>
            </View>
        );
    }

    const typeCfg   = getTypeColor(request.type);
    const statusCfg = getStatusColor(request.status);
    const sourceCfg = getSourceColor('ADMIN');

    return (
        <View style={styles.safe}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request Details</Text>
            </View>

            {/* ── Content ────────────────────────────────────────────── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Summary Card ───────────────────────────────────── */}
                <View style={styles.card}>
                    {/* Badge Row */}
                    <View style={styles.badgeRow}>
                        <View style={styles.badgeLeft}>
                            <View style={[styles.badge, { backgroundColor: typeCfg.bg }]}>
                                <Text style={[styles.badgeText, { color: typeCfg.text }]}>
                                    {request.type.replace(/_/g, ' ')}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: sourceCfg.bg }]}>
                                <Text style={[styles.badgeText, { color: sourceCfg.text }]}>ADMIN</Text>
                            </View>
                        </View>
                        <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
                            <Text style={[styles.badgeText, { color: statusCfg.text }]}>
                                {request.status}
                            </Text>
                        </View>
                    </View>

                    {/* Title & Description */}
                    <Text style={styles.summaryTitle}>{request.title}</Text>
                    {!!request.description && (
                        <Text style={styles.summaryDesc}>{request.description}</Text>
                    )}
                </View>

                {/* ── Request Information ────────────────────────────── */}
                <Text style={styles.sectionLabel}>REQUEST INFORMATION</Text>
                <View style={styles.card}>
                    <InfoRow icon="home"       label="Flat Number"   value={request.flat?.flatNumber ?? 'N/A'} />
                    <InfoRow icon="user"       label="Requested By"  value={request.requestedBy?.name ?? 'N/A'} />
                    <InfoRow icon="clock"      label="Created At"    value={formatDate(request.createdAt)} />
                    <InfoRow icon="refresh-cw" label="Updated At"    value={formatDate(request.updatedAt)} />
                </View>

                {/* ── Decision Information ───────────────────────────── */}
                {request.status !== 'PENDING' && (
                    <>
                        <Text style={styles.sectionLabel}>DECISION INFORMATION</Text>
                        <View style={styles.card}>
                            <InfoRow icon="calendar" label="Decided At" value={formatDate(request.updatedAt)} />
                            <InfoRow icon="check-circle" label="Status" value={request.status} />
                        </View>
                    </>
                )}

                {/* ── Action Buttons (PENDING only) ──────────────────── */}
                {request.status === 'PENDING' && (
                    <View style={styles.actionsWrap}>
                        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="pencil-outline" size={16} color={SgateColors.t1} />
                            <Text style={styles.primaryBtnText}>Edit Request</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dangerBtn}
                            activeOpacity={0.8}
                            onPress={() => {
                                AppAlert.show(
                                    'Cancel Request?',
                                    'This action cannot be undone. Are you sure?',
                                    [
                                        { text: 'Keep', style: 'cancel' },
                                        { text: 'Cancel Request', style: 'destructive', onPress: () => {} },
                                    ]
                                );
                            }}
                        >
                            <MaterialCommunityIcons name="close-circle-outline" size={16} color={SgateColors.red} />
                            <Text style={styles.dangerBtnText}>Cancel Request</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: SgateColors.bg },
    loadingText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3, marginTop: 12 },

    // Header
    headerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: SgateColors.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginLeft: 12,
        flex: 1,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

    // Card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },

    // Badge Row
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    badgeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },

    // Summary
    summaryTitle: {
        fontSize: 18,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    summaryDesc: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 6,
        lineHeight: 20,
    },

    // Section
    sectionLabel: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 0.8,
        marginBottom: 8,
        marginTop: 4,
        paddingLeft: 4,
    },

    // Info Rows
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    infoValue: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        maxWidth: '50%',
        textAlign: 'right',
    },

    // Action Buttons
    actionsWrap: { gap: 12, marginTop: 8 },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SgateColors.gold,
        paddingVertical: 16,
        borderRadius: 14,
    },
    primaryBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SgateColors.redBg,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingVertical: 16,
        borderRadius: 14,
    },
    dangerBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
    },
});
