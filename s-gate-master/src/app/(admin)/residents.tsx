import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface Resident {
    id: string;
    name: string;
    mobile: string;
    flatId: string;
    type: 'OWNER' | 'RENTER' | 'FAMILY';
    agreementUrl?: string | null;
}

interface FlatOption {
    id: string;
    number: string;
    block: string;
}

const RESIDENT_TYPES: Resident['type'][] = ['OWNER', 'RENTER', 'FAMILY'];

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
                const raw = res.data?.data ?? [];
                const mapped: Resident[] = raw.map((r: any) => ({
                    id: r.id,
                    name: r.user?.name ?? '',
                    mobile: r.user?.phone ?? '',
                    flatId: r.flatId,
                    type: r.residentType === 'TENANT' ? 'RENTER' : 'OWNER',
                    agreementUrl: null,
                }));
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
                            const blockFlats = (flatsRes.data?.data ?? []).map(
                                (f: { id: string; number: string }) => ({
                                    id: f.id,
                                    number: f.number,
                                    block: block.name,
                                })
                            );
                            all.push(...blockFlats);
                        } catch {
                            // skip
                        }
                    })
                );

                all.sort((a, b) =>
                    a.block.localeCompare(b.block) ||
                    a.number.localeCompare(b.number)
                );
                setFlatOptions(all);
                if (all.length > 0) setFlatId(all[0].id);
            } catch (err) {
                console.error('Failed to load flats:', err);
            }
        };

        loadFlats();
    }, [user?.societyId]);

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form Fields
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [flatId, setFlatId] = useState('');
    const [type, setType] = useState<Resident['type']>('OWNER');
    const [agreementUrl, setAgreementUrl] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
        setMobile('');
        setFlatId(flatOptions[0]?.id || '');
        setType('OWNER');
        setAgreementUrl(null);
        setEditingId(null);
    };

    const handleEdit = (resident: Resident) => {
        setName(resident.name);
        setMobile(resident.mobile);
        setFlatId(resident.flatId);
        setType(resident.type);
        setAgreementUrl(resident.agreementUrl || null);
        setEditingId(resident.id);
        setModalVisible(true);
    };

    const handleMockFilePick = () => {
        AppAlert.show('File Picker', 'Select Tenant Agreement (PDF)', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Select agreement.pdf', 
                onPress: () => setAgreementUrl('file:///mock/agreement.pdf') 
            }
        ]);
    };

    const handleSave = () => {
        if (!name || !mobile || !flatId) {
            AppAlert.show('Error', 'Name, Mobile and Flat are required');
            return;
        }

        // Compliance: Renter must have agreement
        if (type === 'RENTER' && !agreementUrl) {
            AppAlert.show('Compliance Error', 'Tenant Agreement is MANDATORY for Renters.');
            return;
        }

        if (editingId) {
            setResidents(prev => prev.map(r => r.id === editingId ? {
                ...r, name, mobile, flatId, type, agreementUrl
            } : r));
        } else {
            const newResident: Resident = {
                id: Date.now().toString(),
                name,
                mobile,
                flatId,
                type,
                agreementUrl
            };
            setResidents([...residents, newResident]);
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
                <Text style={styles.headerTitle}>Residents</Text>
            </View>

            {/* ── Spacer ─────────────────────────────────────────────────── */}
            <View style={styles.spacer} />

            <FlatList
                data={residents}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                ListHeaderComponent={
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Register Resident</Text>
                    </TouchableOpacity>
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="account-group-outline" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No residents yet</Text>
                        <Text style={styles.emptySub}>Register the first resident.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const flat = flatOptions.find(f => f.id === item.flatId);
                    const ts = TYPE_STYLE[item.type];
                    return (
                        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
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
                                        Flat {flat ? `${flat.number} (${flat.block})` : 'Unknown'}
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

                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => handleEdit(item)}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={14} color={SgateColors.t2} />
                                    <Text style={styles.editBtnText}>Edit Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    );
                }}
            />

            {/* ── Register / Edit Modal ──────────────────────────────────── */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalWrap, { paddingBottom: insets.bottom }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingId ? 'Edit Resident' : 'Register Resident'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formLabel}>FULL NAME *</Text>
                        <TextInput
                            style={styles.formInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. John Doe"
                            placeholderTextColor={SgateColors.t4}
                        />

                        <Text style={styles.formLabel}>MOBILE NUMBER *</Text>
                        <TextInput
                            style={styles.formInput}
                            value={mobile}
                            onChangeText={setMobile}
                            keyboardType="phone-pad"
                            placeholder="e.g. 9876543210"
                            placeholderTextColor={SgateColors.t4}
                        />

                        <Text style={styles.formLabel}>ASSIGNED FLAT *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                            <View style={styles.chipRow}>
                                {flatOptions.map(f => (
                                    <TouchableOpacity
                                        key={f.id}
                                        onPress={() => setFlatId(f.id)}
                                        style={[styles.chip, flatId === f.id && styles.chipSelected]}
                                    >
                                        <Text style={[styles.chipText, flatId === f.id && styles.chipTextSelected]}>
                                            {f.block}-{f.number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Text style={styles.formLabel}>RESIDENT TYPE *</Text>
                        <View style={[styles.chipRow, { marginBottom: 24 }]}>
                            {RESIDENT_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    style={[styles.chip, type === t && styles.chipSelected]}
                                >
                                    <Text style={[styles.chipText, type === t && styles.chipTextSelected]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {type === 'RENTER' && (
                            <View>
                                <Text style={styles.formLabel}>TENANT AGREEMENT (MANDATORY) *</Text>
                                <TouchableOpacity
                                    onPress={handleMockFilePick}
                                    style={[
                                        styles.uploadBtn,
                                        agreementUrl ? styles.uploadBtnDone : styles.uploadBtnEmpty,
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={agreementUrl ? 'check' : 'upload-outline'}
                                        size={20}
                                        color={agreementUrl ? SgateColors.green : SgateColors.t3}
                                    />
                                    <Text style={[styles.uploadBtnText, agreementUrl && { color: SgateColors.green, fontFamily: SgateFonts.bold }]}>
                                        {agreementUrl ? 'Agreement Uploaded' : 'Upload Agreement (File Picker)'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSave} activeOpacity={0.8}>
                            <Text style={styles.submitBtnText}>
                                {editingId ? 'Update Resident' : 'Register Resident'}
                            </Text>
                        </TouchableOpacity>
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header
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
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        paddingVertical: 12,
        gap: 6,
    },
    editBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

    // Modal
    modalWrap: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8 },
    formInput: {
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 15,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
        marginBottom: 18,
    },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: SgateColors.border },
    chipSelected: { backgroundColor: SgateColors.gold, borderColor: SgateColors.gold },
    chipText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    chipTextSelected: { color: SgateColors.t1 },

    // Upload
    uploadBtn: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    uploadBtnEmpty: { borderColor: SgateColors.border, backgroundColor: SgateColors.surface },
    uploadBtnDone: { borderColor: SgateColors.green, backgroundColor: SgateColors.greenBg },
    uploadBtnText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

    // Submit
    submitBtn: { backgroundColor: SgateColors.gold, borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
