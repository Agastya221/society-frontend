import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';

interface Flat {
    id: string;
    number: string;
    block: string;
    floor: string;
    ownerName: string;
    residentsCount: number;
    vehiclesCount: number;
}

export default function FlatsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(s => s.user);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [flatNumber, setFlatNumber] = useState('');
    const [block, setBlock] = useState('');
    const [floor, setFloor] = useState('');

    const loadFlats = useCallback(async () => {
        const societyId = user?.societyId;
        if (!societyId) {
            console.log('[Flats] No societyId found, skipping fetch');
            return;
        }

        try {
            console.log('[Flats] Fetching blocks for society:', societyId);
            const blocksRes = await api.get(
                `/resident/onboarding/societies/${societyId}/blocks`
            );
            const blocks: { id: string; name: string }[] =
                blocksRes.data?.data ?? [];
            console.log('[Flats] Blocks received:', blocks.length, JSON.stringify(blocks.slice(0, 3)));

            const allFlats: Flat[] = [];
            await Promise.all(
                blocks.map(async block => {
                    try {
                        const flatsRes = await api.get(
                            `/resident/onboarding/societies/${societyId}/blocks/${block.id}/flats`
                        );
                        const rawFlats = flatsRes.data?.data ?? [];
                        console.log(`[Flats] Block "${block.name}" (${block.id}) raw flats:`, rawFlats.length, JSON.stringify(rawFlats.slice(0, 3)));
                        const blockFlats = rawFlats.map(
                            (f: any) => ({
                                id: f.id,
                                number: f.number || f.flat_number || f.flatNumber || f.name || '',
                                block: block.name,
                                floor: String(f.floor ?? ''),
                                ownerName: f.ownerName || f.owner_name || '',
                                residentsCount: f.residentsCount || 0,
                                vehiclesCount: f.vehiclesCount || 0,
                            })
                        );
                        allFlats.push(...blockFlats);
                    } catch (err) {
                        console.error(`[Flats] Failed to fetch flats for block ${block.name}:`, err);
                    }
                })
            );
            console.log('[Flats] Total flats loaded:', allFlats.length, 'Sample:', JSON.stringify(allFlats.slice(0, 2)));
            setFlats(allFlats);
        } catch (err) {
            console.error('[Flats] Failed to fetch blocks:', err);
        }
    }, [user?.societyId]);

    // Fetch flats from API using society blocks
    useEffect(() => {
        loadFlats();
    }, [loadFlats]);

    const filteredFlats = useMemo(() => {
        const query = (search || '').toLowerCase();
        if (!query) return flats;
        return flats.filter(f =>
            (f.number || '').toLowerCase().includes(query) ||
            (f.ownerName || '').toLowerCase().includes(query) ||
            (f.block || '').toLowerCase().includes(query)
        );
    }, [flats, search]);

    const sections = useMemo(() => {
        const groups: Record<string, Flat[]> = {};
        filteredFlats.forEach(f => {
            const b = (f.block || '').toUpperCase();
            if (!groups[b]) groups[b] = [];
            groups[b].push(f);
        });

        return Object.keys(groups).sort().map(blockKey => ({
            title: `${blockKey}-Block`,
            data: groups[blockKey].sort((a, b) => (a.number || '').localeCompare(b.number || ''))
        }));
    }, [filteredFlats]);

    const resetForm = () => {
        setFlatNumber('');
        setBlock('');
        setFloor('');
        setEditingId(null);
    };

    const handleEdit = (flat: Flat) => {
        setFlatNumber(flat.number);
        setBlock(flat.block);
        setFloor(flat.floor);
        setEditingId(flat.id);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        AppAlert.show('Delete Flat', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const societyId = user?.societyId;
                    if (!societyId) {
                        AppAlert.show('Error', 'Society not found for your account.');
                        return;
                    }

                    try {
                        await api.delete(`/admin/societies/${societyId}/flats/${id}`);
                        await loadFlats();
                    } catch (err: any) {
                        AppAlert.show(
                            'Delete Failed',
                            err?.response?.data?.message || 'Could not delete this flat. Please try again.'
                        );
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!flatNumber || !block) {
            AppAlert.show('Error', 'Flat Number and Block are required');
            return;
        }

        const societyId = user?.societyId;
        if (!societyId) {
            AppAlert.show('Error', 'Society not found for your account.');
            return;
        }

        const payload = {
            blockName: block.trim(),
            flatNumber: flatNumber.trim(),
            floor: floor.trim() || undefined,
        };

        try {
            setSaving(true);
            if (editingId) {
                await api.patch(`/admin/societies/${societyId}/flats/${editingId}`, payload);
            } else {
                await api.post(`/admin/societies/${societyId}/flats`, payload);
            }
            await loadFlats();
            setModalVisible(false);
            resetForm();
        } catch (err: any) {
            AppAlert.show(
                editingId ? 'Update Failed' : 'Create Failed',
                err?.response?.data?.message || 'Could not save this flat. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.root}>
            {/* ── Header (matches Emergency Alerts) ─────────────────────── */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Flats</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>{flats.length} units across {Object.keys(sections.reduce((a: any, s: any) => ({ ...a, [s.title]: 1 }), {})).length} blocks</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        style={styles.addBtn}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color={SgateColors.t1} />
                    </TouchableOpacity>
                </View>
                {/* Search */}
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={18} color={SgateColors.t3} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search flats, blocks or owners..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor={SgateColors.t4}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MaterialCommunityIcons name="close-circle" size={16} color={SgateColors.t4} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{section.title}</Text>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <View style={styles.emptyIcon}>
                            <MaterialCommunityIcons name="home-group" size={36} color={SgateColors.t4} />
                        </View>
                        <Text style={styles.emptyTitle}>No flats found</Text>
                        <Text style={styles.emptySub}>Add flats to manage your society.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    // Show max 3 chars in the avatar to prevent overflow
                    const avatarLabel = (item.number || '—').length > 3
                        ? (item.number || '—').slice(0, 3)
                        : (item.number || '—');
                    return (
                    <Animated.View entering={FadeInDown.delay(Math.min(index, 15) * 40).springify()}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push(`/(admin)/flats/${item.id}` as any)}
                            onLongPress={() => {
                                AppAlert.show('Flat Actions', `Flat ${item.number || ''}`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Edit', onPress: () => handleEdit(item) },
                                    { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
                                ]);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{avatarLabel}</Text>
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle} numberOfLines={1}>Flat {item.number || '—'}</Text>
                                <Text style={[styles.cardSub, !item.ownerName && { color: SgateColors.t4 }]} numberOfLines={1}>
                                    {item.ownerName || 'Unassigned'}
                                </Text>
                            </View>
                            {item.block ? (
                                <View style={styles.blockTag}>
                                    <Text style={styles.blockTagText}>{item.block}</Text>
                                </View>
                            ) : null}
                            <MaterialCommunityIcons name="chevron-right" size={20} color={SgateColors.t4} />
                        </TouchableOpacity>
                    </Animated.View>
                    );
                }}
            />

            {/* ── Modal ──────────────────────────────────────────────────── */}
            <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {editingId ? 'Edit Flat' : 'New Flat'}
                        </Text>
                        <Text style={styles.modalSub}>
                            {editingId ? 'Update flat details.' : 'Add a new flat to your society.'}
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.formLabel}>FLAT NUMBER *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. 101"
                                value={flatNumber}
                                onChangeText={setFlatNumber}
                                placeholderTextColor={SgateColors.t4}
                            />

                            <Text style={styles.formLabel}>BLOCK *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. A"
                                value={block}
                                onChangeText={setBlock}
                                placeholderTextColor={SgateColors.t4}
                            />

                            <Text style={styles.formLabel}>FLOOR</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. 1"
                                value={floor}
                                onChangeText={setFloor}
                                placeholderTextColor={SgateColors.t4}
                                keyboardType="numeric"
                            />

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalConfirmBtn, saving && styles.modalConfirmBtnDisabled]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    <Text style={styles.modalConfirmText}>
                                        {saving ? 'Saving...' : editingId ? 'Update' : 'Add Flat'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header (matches Emergency Alerts)
    headerWrapper: {
        backgroundColor: SgateColors.card,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    addBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
    },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 44,
        marginHorizontal: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100, flexGrow: 1 },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 16,
        paddingBottom: 10,
    },
    sectionHeaderText: {
        fontSize: 12, fontFamily: SgateFonts.bold, color: SgateColors.t3,
        letterSpacing: 0.5, textTransform: 'uppercase',
    },
    sectionBadge: {
        backgroundColor: SgateColors.surface,
        borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    sectionBadgeText: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t4 },

    // Card
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 14,
        gap: 12,
        marginBottom: 8,
    },
    avatarCircle: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: SgateColors.gold,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontFamily: SgateFonts.extrabold, color: SgateColors.t1 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 2 },
    cardSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    blockTag: {
        backgroundColor: SgateColors.surface,
        borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    blockTagText: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.t3 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 24,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: SgateColors.card,
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalTitle: { fontSize: 20, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 4 },
    modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginBottom: 20 },

    formLabel: { fontSize: 11, fontFamily: SgateFonts.bold, color: SgateColors.t3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
    formInput: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 14,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        marginBottom: 16,
    },
    modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    modalConfirmBtn: {
        flex: 1.2,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
    },
    modalConfirmBtnDisabled: { opacity: 0.65 },
    modalConfirmText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
