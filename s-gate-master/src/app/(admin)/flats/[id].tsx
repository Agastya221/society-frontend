import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '../../../services/api';

interface ResidentRecord {
    id: string;
    flatId: string;
    user: { name: string; phone: string };
    residentType: string;
}

export default function FlatDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [residents, setResidents] = useState<ResidentRecord[]>([]);

    useEffect(() => {
        if (!id) return;
        api.get('/resident/onboarding/admin/pending', {
            params: { status: 'APPROVED', page: 1, limit: 50 },
        })
            .then(res => {
                const all: ResidentRecord[] = res.data?.data ?? [];
                setResidents(all.filter(r => r.flatId === id));
            })
            .catch(console.error);
    }, [id]);

    // Keep flat as minimal object so JSX does not crash
    const flat = { number: String(id ?? ''), block: '', ownerName: '' };

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Flat {flat.number}</Text>
            </View>

            <View style={styles.spacer} />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Summary Card */}
                <View style={styles.card}>
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={styles.flatNumber}>Flat {flat.number}</Text>
                            <Text style={styles.flatBlock}>Block {flat.block || '—'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.ownerName}>{flat.ownerName || 'Unassigned'}</Text>
                            <Text style={styles.ownerLabel}>Owner</Text>
                        </View>
                    </View>

                    <View style={styles.statsDivider} />
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>PAYMENT</Text>
                            <Text style={styles.statValue}>N/A</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>VEHICLES</Text>
                            <Text style={styles.statValue}>0</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>RESIDENTS</Text>
                            <Text style={styles.statValue}>{residents.length}</Text>
                        </View>
                    </View>
                </View>

                {/* Residents List */}
                <Text style={styles.sectionTitle}>Residents</Text>
                <View style={styles.card}>
                    {residents.map((resident, index) => (
                        <View
                            key={resident.id}
                            style={[
                                styles.residentRow,
                                index < residents.length - 1 && styles.residentRowBorder,
                            ]}
                        >
                            <View style={styles.residentAvatar}>
                                <MaterialCommunityIcons name="account" size={20} color={SgateColors.t3} />
                            </View>
                            <View style={styles.residentInfo}>
                                <Text style={styles.residentName}>{resident.user.name}</Text>
                                <Text style={styles.residentSub}>{resident.residentType} · {resident.user.phone}</Text>
                            </View>
                        </View>
                    ))}
                    {residents.length === 0 && (
                        <View style={styles.emptyRow}>
                            <MaterialCommunityIcons name="account-off-outline" size={24} color={SgateColors.t4} />
                            <Text style={styles.emptyText}>No residents listed</Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="account-plus-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Invite New Resident</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="history" size={18} color={SgateColors.t2} />
                    <Text style={styles.secondaryBtnText}>View Entry History</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1,
    },
    headerTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    spacer: { height: 6 },

    scroll: { flex: 1 },
    scrollContent: { padding: 20 },

    // Card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 16,
    },

    // Summary
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    flatNumber: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    flatBlock: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    ownerName: { fontSize: 16, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    ownerLabel: { fontSize: 12, fontFamily: SgateFonts.semibold, color: '#7C3AED', marginTop: 2 },

    statsDivider: { height: 1, backgroundColor: SgateColors.borderSoft, marginBottom: 14 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    stat: { flex: 1 },
    statLabel: { ...SgateTypography.microLabel, color: SgateColors.t4, marginBottom: 4 },
    statValue: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Section
    sectionTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 10 },

    // Resident row
    residentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    residentRowBorder: { borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft },
    residentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    residentInfo: { flex: 1 },
    residentName: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    residentSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // Empty
    emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
    emptyText: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t4, fontStyle: 'italic' },

    // Buttons
    primaryBtn: {
        backgroundColor: SgateColors.black,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 10,
    },
    primaryBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
    secondaryBtn: {
        backgroundColor: SgateColors.surface,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
