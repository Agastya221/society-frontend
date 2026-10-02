import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import EmptyState from '@/components/ui/EmptyState';
import { AppAlert } from '@/components/ui/AppAlert';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SgateColors, SgateFonts, SgateLayout, SgateTypography } from '@/constants/Sgate-theme';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface Resident {
    id: string;
    name: string;
    mobile: string;
    flatId: string;
    flatNumber?: string;
    blockName?: string;
    type: 'OWNER' | 'RENTER' | 'FAMILY';
    agreementUrl?: string | null;
}

interface FlatOption {
    id: string;
    number: string;
    block: string;
}

const TYPE_STYLE: Record<Resident['type'], { bg: string; color: string }> = {
    OWNER:  { bg: '#F3ECFF', color: '#7C3AED' },
    RENTER: { bg: SgateColors.blueBg, color: SgateColors.blue },
    FAMILY: { bg: SgateColors.greenBg, color: SgateColors.green },
};

export default function ResidentsScreen() {
    const user = useAuthStore(s => s.user);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [residents, setResidents] = useState<Resident[]>([]);
    const [flatOptions, setFlatOptions] = useState<FlatOption[]>([]);

    // Fetch approved residents
    useEffect(() => {
        api.get('/resident/onboarding/admin/pending', {
            params: { status: 'APPROVED', page: 1, limit: 100 },
        })
            .then(res => {
                const payload = res.data?.data;
                const raw = Array.isArray(payload) ? payload : payload?.requests ?? [];
                const mapped: Resident[] = raw.map((r: any) => ({
                    id: String(r?.resident?.id ?? r?.user?.id ?? r?.id ?? ''),
                    name: String(r?.resident?.name ?? r?.user?.name ?? 'Resident'),
                    mobile: String(r?.resident?.phone ?? r?.user?.phone ?? ''),
                    flatId: String(r?.flatId ?? r?.flat?.id ?? ''),
                    flatNumber: String(r?.flat?.flatNumber ?? ''),
                    blockName: String(r?.flat?.block ?? r?.block?.name ?? ''),
                    type: r.residentType === 'TENANT' ? 'RENTER' : 'OWNER',
                    agreementUrl: null,
                })).filter((resident: Resident) => resident.id);
                setResidents(mapped);
            })
            .catch(console.error);
    }, []);

    // Fetch flats for the modal flat selector
    useEffect(() => {
        const societyId = user?.societyId;
        if (!societyId) return;

        const loadFlats = async () => {
            try {
                const blocksRes = await api.get(
                    `/resident/onboarding/societies/${societyId}/blocks`
                );
                const blocks: { id: string; name: string }[] =
                    blocksRes.data?.data ?? [];

                const all: FlatOption[] = [];
                await Promise.all(
                    blocks.map(async block => {
                        try {
                            const flatsRes = await api.get(
                                `/resident/onboarding/societies/${societyId}/blocks/${block.id}/flats`
                            );
                            const blockFlats = (flatsRes.data?.data ?? [])
                                .map((f: any) => ({
                                    id: String(f?.id ?? ''),
                                    number: String(f?.flatNumber ?? f?.number ?? ''),
                                    block: String(f?.blockName ?? block?.name ?? ''),
                                }))
                                .filter((flat: FlatOption) => flat.id && flat.number);
                            all.push(...blockFlats);
                        } catch {
                            // skip
                        }
                    })
                );

                all.sort((a, b) =>
                    a.block.localeCompare(b.block, undefined, { numeric: true }) ||
                    a.number.localeCompare(b.number, undefined, { numeric: true })
                );
                setFlatOptions(all);
            } catch (err) {
                console.error('Failed to load flats:', err);
            }
        };

        loadFlats();
    }, [user?.societyId]);

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <ScreenHeader title="Residents" onBack={() => router.back()} />

            {/* ── Spacer ─────────────────────────────────────────────────── */}
            <View style={styles.spacer} />

            <FlatList
                data={residents}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                ListHeaderComponent={
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => AppAlert.show(
                            'How residents join',
                            'Residents add their flat from the S-Gate app (Add Flat/Villa/Office). Their request then appears in Onboarding for you to approve.',
                            [
                                { text: 'Close', style: 'cancel' },
                                { text: 'View Requests', onPress: () => router.push('/(admin)/onboarding-requests' as any) },
                            ],
                        )}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Register Resident</Text>
                    </TouchableOpacity>
                }
                ListEmptyComponent={
                    <EmptyState
                        iconName="account-group-outline"
                        title="No residents yet"
                        description="Approved residents will appear here."
                    />
                }
                renderItem={({ item, index }) => {
                    const flat = flatOptions.find(f => f.id === item.flatId);
                    const ts = TYPE_STYLE[item.type];
                    return (
                        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify()}>
                            <View style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardName}>{item.name}</Text>
                                        <Text style={styles.cardPhone}>{item.mobile}</Text>
                                    </View>
                                    <View style={[styles.typePill, { backgroundColor: ts.bg }]}>
                                        <Text style={[styles.typePillText, { color: ts.color }]}>{item.type}</Text>
                                    </View>
                                </View>

                                <View style={styles.metaRow}>
                                    <MaterialCommunityIcons name="home-outline" size={14} color={SgateColors.t3} />
                                    <Text style={styles.metaText}>
                                        Flat {flat
                                            ? `${flat.number} (${flat.block})`
                                            : [item.blockName, item.flatNumber].filter(Boolean).join('-') || 'Unknown'}
                                    </Text>
                                    {item.type === 'RENTER' && (
                                        <View style={styles.agreementBadge}>
                                            <MaterialCommunityIcons
                                                name={item.agreementUrl ? 'file-document-outline' : 'alert-outline'}
                                                size={13}
                                                color={item.agreementUrl ? SgateColors.green : SgateColors.red}
                                            />
                                            <Text style={[styles.agreementText, { color: item.agreementUrl ? SgateColors.green : SgateColors.red }]}>
                                                {item.agreementUrl ? 'Agreement Verified' : 'No Agreement'}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                            </View>
                        </Animated.View>
                    );
                }}
            />

        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header
    spacer: { height: 6 },

    listContent: { padding: 20, flexGrow: 1 },

    // Add button
    addBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    addBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Card
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cardPhone: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // Type pill
    typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typePillText: { fontSize: 10, fontFamily: SgateFonts.bold },

    // Meta
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12, flexWrap: 'wrap' },
    metaText: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    agreementBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
    agreementText: { fontSize: 11, fontFamily: SgateFonts.semibold },

    // Edit button

    // Empty

    // Modal



    // Upload

    // Submit
});
