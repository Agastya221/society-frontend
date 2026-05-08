import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';

interface Gate {
    id: string;
    name: string;
    active: boolean;
    guardsAssigned: number;
}

export default function GatePointsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [gates, setGates] = useState<Gate[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [gateName, setGateName] = useState('');

    const toggleGate = (id: string) => {
        setGates(curr => curr.map(g => g.id === id ? { ...g, active: !g.active } : g));
    };

    // Derived state for guards count per gate
    // We recalculate this to support "Delete only if no guards assigned" check
    const getGuardCount = (gateId: string) => {
        return gates.find(g => g.id === gateId)?.guardsAssigned ?? 0;
    };

    const resetForm = () => {
        setGateName('');
        setEditingId(null);
    };

    const handleEdit = (gate: Gate) => {
        setGateName(gate.name);
        setEditingId(gate.id);
        setModalVisible(true);
    };

    const handleDelete = (gate: Gate) => {
        const guardCount = getGuardCount(gate.id);
        if (guardCount > 0) {
            Alert.alert('Cannot Delete', `This gate has ${guardCount} active guard(s). Reassign them first.`);
            return;
        }

        Alert.alert('Delete Gate', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => setGates(prev => prev.filter(g => g.id !== gate.id)) 
            }
        ]);
    };

    const handleSave = () => {
        if (!gateName.trim()) {
            Alert.alert('Error', 'Gate Name is required');
            return;
        }

        if (editingId) {
            setGates(prev => prev.map(g => g.id === editingId ? { ...g, name: gateName } : g));
        } else {
            const newGate: Gate = {
                id: Date.now().toString(),
                name: gateName,
                active: true,
                guardsAssigned: 0 // Initial
            };
            setGates([...gates, newGate]);
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
                <Text style={styles.headerTitle}>Gate Points</Text>
            </View>

            {/* ── Spacer ─────────────────────────────────────────────────── */}
            <View style={styles.spacerBlock} />

            <FlatList
                data={gates}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                ListHeaderComponent={
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Add New Gate</Text>
                    </TouchableOpacity>
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="map-marker-outline" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No gate points</Text>
                        <Text style={styles.emptySub}>Add your first gate entry point.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const guardCount = getGuardCount(item.id);
                    return (
                        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                            <View style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View style={[styles.iconBubble, { backgroundColor: item.active ? SgateColors.greenBg : SgateColors.surface }]}>
                                        <MaterialCommunityIcons
                                            name="map-marker-outline"
                                            size={22}
                                            color={item.active ? SgateColors.green : SgateColors.t4}
                                        />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardName}>{item.name}</Text>
                                        <Text style={styles.cardSub}>{guardCount} Guards Assigned</Text>
                                    </View>
                                    <Switch
                                        value={item.active}
                                        onValueChange={() => toggleGate(item.id)}
                                        trackColor={{ false: SgateColors.border, true: SgateColors.green }}
                                        thumbColor={SgateColors.card}
                                    />
                                </View>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                                        <MaterialCommunityIcons name="pencil-outline" size={14} color={SgateColors.t3} />
                                        <Text style={styles.actionBtnText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={14} color={SgateColors.red} />
                                        <Text style={[styles.actionBtnText, { color: SgateColors.red }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    );
                }}
            />

            {/* ── Modal ──────────────────────────────────────────────────── */}
            <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{editingId ? 'Edit Gate' : 'New Gate'}</Text>
                        <Text style={styles.modalSub}>
                            {editingId ? 'Update the gate point name.' : 'Add a new entry/exit point for your society.'}
                        </Text>

                        <Text style={styles.formLabel}>GATE NAME</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="e.g. Main Gate (Entry)"
                            value={gateName}
                            onChangeText={setGateName}
                            placeholderTextColor={SgateColors.t4}
                        />

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSave}>
                                <Text style={styles.modalConfirmText}>{editingId ? 'Update' : 'Add Gate'}</Text>
                            </TouchableOpacity>
                        </View>
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
    spacerBlock: { height: 6 },

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
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    iconBubble: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cardSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingTop: 12,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
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
        marginBottom: 20,
    },
    modalBtnRow: { flexDirection: 'row', gap: 10 },
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
