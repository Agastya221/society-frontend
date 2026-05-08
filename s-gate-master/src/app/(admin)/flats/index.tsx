import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
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

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [flatNumber, setFlatNumber] = useState('');
    const [block, setBlock] = useState('');
    const [floor, setFloor] = useState('');

    // Fetch flats from API using society blocks
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

                const allFlats: Flat[] = [];
                await Promise.all(
                    blocks.map(async block => {
                        try {
                            const flatsRes = await api.get(
                                `/resident/onboarding/societies/${societyId}/blocks/${block.id}/flats`
                            );
                            const blockFlats = (flatsRes.data?.data ?? []).map(
                                (f: { id: string; number: string; floor?: number }) => ({
                                    id: f.id,
                                    number: f.number,
                                    block: block.name,
                                    floor: String(f.floor ?? ''),
                                    ownerName: '',
                                    residentsCount: 0,
                                    vehiclesCount: 0,
                                })
                            );
                            allFlats.push(...blockFlats);
                        } catch {
                            // skip failed block
                        }
                    })
                );
                setFlats(allFlats);
            } catch (err) {
                console.error('Failed to fetch flats:', err);
            }
        };

        loadFlats();
    }, [user?.societyId]);

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
            const b = f.block.toUpperCase();
            if (!groups[b]) groups[b] = [];
            groups[b].push(f);
        });

        return Object.keys(groups).sort().map(blockKey => ({
            title: `${blockKey}-Block`,
            data: groups[blockKey].sort((a, b) => a.number.localeCompare(b.number))
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
        Alert.alert('Delete Flat', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => setFlats(prev => prev.filter(f => f.id !== id))
            }
        ]);
    };

    const handleSave = () => {
        if (!flatNumber || !block) {
            Alert.alert('Error', 'Flat Number and Block are required');
            return;
        }

        if (editingId) {
            setFlats(prev => prev.map(f => f.id === editingId ? {
                ...f, number: flatNumber, block, floor
            } : f));
        } else {
            const newFlat: Flat = {
                id: Date.now().toString(),
                number: flatNumber,
                block,
                floor,
                ownerName: 'Unassigned',
                residentsCount: 0,
                vehiclesCount: 0
            };
            setFlats([...flats, newFlat]);
        }
        setModalVisible(false);
        resetForm();
    };

    return (
        <View style={styles.root}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Flats</Text>
            </View>

            {/* ── Search + Add ────────────────────────────────────────────── */}
            <View style={styles.searchSection}>
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
                            <MaterialCommunityIcons name="close" size={16} color={SgateColors.t3} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => { resetForm(); setModalVisible(true); }}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Add Flat</Text>
                </TouchableOpacity>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom, flexGrow: 1 }}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{title}</Text>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="home-group" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No flats found</Text>
                        <Text style={styles.emptySub}>Add flats to manage your society.</Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(Math.min(index, 15) * 40).springify()}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push(`/(admin)/flats/${item.id}` as any)}
                            activeOpacity={0.75}
                        >
                            <View style={styles.cardLeft}>
                                <View style={styles.flatBubble}>
                                    <Text style={styles.flatBubbleBlock}>{item.block}</Text>
                                    <Text style={styles.flatBubbleNum}>{item.number}</Text>
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>Flat {item.number}</Text>
                                    {item.ownerName ? (
                                        <Text style={styles.cardSub}>{item.ownerName}</Text>
                                    ) : (
                                        <Text style={[styles.cardSub, { color: SgateColors.t4 }]}>Unassigned</Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity onPress={() => handleEdit(item)} hitSlop={8}>
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color={SgateColors.t3} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={8}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={SgateColors.red} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}
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
                                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSave}>
                                    <Text style={styles.modalConfirmText}>
                                        {editingId ? 'Update' : 'Add Flat'}
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

    // Search section
    searchSection: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 46,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    // Add button
    addBtn: {
        backgroundColor: SgateColors.gold,
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addBtnText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Section header
    sectionHeader: {
        backgroundColor: SgateColors.surface,
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    sectionHeaderText: { ...SgateTypography.microLabel, color: SgateColors.t3 },

    // Card
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.card,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    flatBubble: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flatBubbleBlock: { fontSize: 10, fontFamily: SgateFonts.bold, color: SgateColors.goldDeep },
    flatBubbleNum: { fontSize: 14, fontFamily: SgateFonts.extrabold, color: SgateColors.goldDeep },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    cardSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 16 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

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

    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8 },
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
    modalConfirmText: { fontSize: 14, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
