import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

type VType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE';

const VISITOR_TYPES: { type: VType; label: string; icon: any; color: string; apiValue: string }[] = [
    { type: 'GUEST',    label: 'Guest',    icon: 'person',    color: '#3B82F6', apiValue: 'GUEST' },
    { type: 'DELIVERY', label: 'Delivery', icon: 'cube',      color: '#F59E0B', apiValue: 'DELIVERY_PERSON' },
    { type: 'CAB',      label: 'Cab',      icon: 'car',       color: '#10B981', apiValue: 'CAB_DRIVER' },
    { type: 'SERVICE',  label: 'Service',  icon: 'construct', color: '#8B5CF6', apiValue: 'SERVICE_PROVIDER' },
];

type ProviderTag = 'SWIGGY' | 'ZOMATO' | 'AMAZON' | 'BLINKIT' | 'FLIPKART' | 'BIGBASKET' | 'DUNZO' | 'OTHER';

const PROVIDERS: { tag: ProviderTag; label: string; color: string; bg: string; icon: any }[] = [
    { tag: 'SWIGGY',    label: 'Swiggy',     color: '#FF6B00', bg: '#FFF4EE', icon: 'flame' },
    { tag: 'ZOMATO',    label: 'Zomato',     color: '#E23744', bg: '#FFF0F1', icon: 'restaurant' },
    { tag: 'AMAZON',    label: 'Amazon',     color: '#FF9900', bg: '#FFFBF0', icon: 'logo-amazon' },
    { tag: 'BLINKIT',   label: 'Blinkit',    color: '#F8C200', bg: '#FDFBE9', icon: 'flash' },
    { tag: 'FLIPKART',  label: 'Flipkart',   color: '#2874F0', bg: '#EEF4FF', icon: 'cart' },
    { tag: 'BIGBASKET', label: 'BigBasket',  color: '#84C225', bg: '#F3FBEA', icon: 'basket' },
    { tag: 'DUNZO',     label: 'Dunzo',      color: '#00C4CC', bg: '#E6FAFB', icon: 'bicycle' },
    { tag: 'OTHER',     label: 'Other',      color: '#6B7280', bg: '#F3F4F6', icon: 'cube-outline' },
];

interface FlatResult {
    id: string;
    flatNumber: string;
    block?: { name: string };
    wing?: string;
    floor?: number;
    residents?: { name: string }[];
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────

function CameraModal({
    visible,
    onCapture,
    onClose,
}: {
    visible: boolean;
    onCapture: (uri: string) => void;
    onClose: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [captured, setCaptured] = useState<string | null>(null);
    const [taking, setTaking] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Reset preview every time modal opens
    useEffect(() => {
        if (visible) setCaptured(null);
    }, [visible]);

    const handleCapture = async () => {
        if (!cameraRef.current || taking) return;
        setTaking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.75, skipProcessing: true });
            if (photo?.uri) setCaptured(photo.uri);
        } finally {
            setTaking(false);
        }
    };

    const handleUse = () => {
        if (captured) { onCapture(captured); onClose(); }
    };

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={cam.root}>
                {!permission?.granted ? (
                    <View style={cam.permRoot}>
                        <Ionicons name="camera-outline" size={56} color="#9CA3AF" />
                        <Text style={cam.permTitle}>Camera Access Needed</Text>
                        <Pressable style={cam.permBtn} onPress={requestPermission}>
                            <Text style={cam.permBtnText}>Allow Camera</Text>
                        </Pressable>
                    </View>
                ) : captured ? (
                    // Preview
                    <>
                        <Image source={{ uri: captured }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={[cam.previewActions, { paddingBottom: insets.bottom + 24 }]}>
                            <TouchableOpacity style={cam.retakeBtn} onPress={() => setCaptured(null)} activeOpacity={0.85}>
                                <Ionicons name="refresh" size={20} color="#fff" />
                                <Text style={cam.retakeBtnText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={cam.useBtn} onPress={handleUse} activeOpacity={0.85}>
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={cam.useBtnText}>Use Photo</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    // Live viewfinder
                    <>
                        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
                        {/* Top bar */}
                        <View style={[cam.topBar, { paddingTop: insets.top + 8 }]}>
                            <TouchableOpacity style={cam.closeBtn} onPress={onClose}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={cam.topLabel}>Visitor Photo</Text>
                            <View style={{ width: 44 }} />
                        </View>
                        {/* Shutter */}
                        <View style={[cam.shutterRow, { paddingBottom: insets.bottom + 32 }]}>
                            <TouchableOpacity
                                style={cam.shutterBtn}
                                onPress={handleCapture}
                                disabled={taking}
                                activeOpacity={0.85}
                            >
                                {taking
                                    ? <ActivityIndicator size="small" color="#1F2937" />
                                    : <View style={cam.shutterInner} />
                                }
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewEntryScreen() {
    const router = useRouter();

    // Visitor type
    const [type, setType] = useState<VType>('GUEST');
    const [provider, setProvider] = useState<ProviderTag | null>(null);

    // Flat search
    const [flatSearch, setFlatSearch] = useState('');
    const [selectedFlat, setSelectedFlat] = useState<FlatResult | null>(null);
    const [flatResults, setFlatResults] = useState<FlatResult[]>([]);
    const [searchingFlat, setSearchingFlat] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Photo
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);

    // Submit
    const [submitting, setSubmitting] = useState(false);

    // Flat search debounce
    useEffect(() => {
        if (!flatSearch.trim() || selectedFlat?.flatNumber === flatSearch) {
            setFlatResults([]);
            setShowDropdown(false);
            return;
        }
        const t = setTimeout(async () => {
            setSearchingFlat(true);
            try {
                const res = await api.get(`/api/v1/gate/flats/search?query=${encodeURIComponent(flatSearch)}`);
                const data: FlatResult[] = res.data?.data ?? [];
                setFlatResults(data);
                setShowDropdown(true);
            } catch {
                setFlatResults([]);
            } finally {
                setSearchingFlat(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [flatSearch, selectedFlat]);

    const handleSelectFlat = (flat: FlatResult) => {
        setSelectedFlat(flat);
        setFlatSearch(flatLabel(flat));
        setShowDropdown(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleTypeChange = (t: VType) => {
        setType(t);
        setProvider(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const canSubmit = !!selectedFlat && (type !== 'DELIVERY' || !!provider);

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSubmitting(true);

        try {
            const vt = VISITOR_TYPES.find(v => v.type === type)!;
            const payload: Record<string, any> = {
                type: vt.apiValue,
                flatId: selectedFlat!.id,
            };
            if (type === 'DELIVERY' && provider) payload.providerTag = provider;

            let entryId: string | null = null;

            if (photoUri) {
                // Multipart upload with photo
                const form = new FormData();
                form.append('type', vt.apiValue);
                form.append('flatId', selectedFlat!.id);
                if (type === 'DELIVERY' && provider) form.append('providerTag', provider);
                form.append('photo', {
                    uri: photoUri,
                    type: 'image/jpeg',
                    name: 'visitor.jpg',
                } as any);
                const res = await api.post('/api/v1/gate/entry-requests', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                entryId = res.data?.data?.id ?? null;
            } else {
                const res = await api.post('/api/v1/gate/entry-requests', payload);
                entryId = res.data?.data?.id ?? null;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            router.push({
                pathname: '/entry-waiting' as any,
                params: {
                    id:    entryId ?? '',
                    flat:  flatLabel(selectedFlat!),
                    name:  '',
                    type:  type,
                    photo: photoUri ?? '',
                },
            });
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Failed', err?.response?.data?.message ?? 'Could not send entry request. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <KeyboardAvoidingView
                style={S.root}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={S.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* ── Visitor Type ──────────────────────────────────── */}
                    <Text style={S.sectionLabel}>VISITOR TYPE</Text>
                    <View style={S.typeGrid}>
                        {VISITOR_TYPES.map((v) => {
                            const active = type === v.type;
                            return (
                                <Pressable
                                    key={v.type}
                                    style={[S.typeCard, active && { borderColor: v.color, backgroundColor: v.color + '0D' }]}
                                    onPress={() => handleTypeChange(v.type)}
                                >
                                    <View style={[S.typeIconWrap, { backgroundColor: active ? v.color + '22' : '#F5F5F4' }]}>
                                        <Ionicons name={v.icon} size={32} color={active ? v.color : '#9CA3AF'} />
                                    </View>
                                    <Text style={[S.typeLabel, active && { color: v.color, fontWeight: '800' }]}>
                                        {v.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* ── Delivery Providers ────────────────────────────── */}
                    {type === 'DELIVERY' && (
                        <>
                            <Text style={S.sectionLabel}>DELIVERY FROM</Text>
                            <View style={S.providerGrid}>
                                {PROVIDERS.map((p) => {
                                    const active = provider === p.tag;
                                    return (
                                        <Pressable
                                            key={p.tag}
                                            style={[S.providerCard, active && { borderColor: p.color, backgroundColor: p.bg }]}
                                            onPress={() => {
                                                setProvider(p.tag);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                        >
                                            <View style={[S.providerIcon, { backgroundColor: active ? p.bg : '#F5F5F4' }]}>
                                                <Ionicons name={p.icon} size={22} color={active ? p.color : '#9CA3AF'} />
                                            </View>
                                            <Text style={[S.providerLabel, active && { color: p.color, fontWeight: '800' }]}>
                                                {p.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── Flat Search ───────────────────────────────────── */}
                    <Text style={S.sectionLabel}>FLAT / UNIT</Text>
                    <View style={S.flatWrap}>
                        <View style={S.flatInputRow}>
                            <Ionicons name="home-outline" size={18} color="#9CA3AF" style={S.flatIcon} />
                            <TextInput
                                style={S.flatInput}
                                placeholder="Search flat — A-101, B-204…"
                                placeholderTextColor="#9CA3AF"
                                value={flatSearch}
                                onChangeText={(t) => {
                                    setFlatSearch(t);
                                    setSelectedFlat(null);
                                }}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                            {searchingFlat && <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 12 }} />}
                            {selectedFlat && (
                                <View style={S.flatCheckmark}>
                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                </View>
                            )}
                        </View>

                        {showDropdown && flatResults.length > 0 && (
                            <View style={S.dropdown}>
                                {flatResults.map((item) => (
                                    <Pressable key={item.id} style={S.dropdownItem} onPress={() => handleSelectFlat(item)}>
                                        <View style={S.dropdownIcon}>
                                            <Ionicons name="home" size={14} color="#6B7280" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={S.dropdownFlat}>{flatLabel(item)}</Text>
                                            {item.residents?.[0]?.name && (
                                                <Text style={S.dropdownResident}>{item.residents[0].name}</Text>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                                    </Pressable>
                                ))}
                            </View>
                        )}
                        {showDropdown && flatResults.length === 0 && !searchingFlat && (
                            <View style={S.dropdown}>
                                <Text style={S.dropdownEmpty}>No flats found</Text>
                            </View>
                        )}
                    </View>

                    {/* ── Visitor Photo ─────────────────────────────────── */}
                    <Text style={S.sectionLabel}>VISITOR PHOTO</Text>
                    {photoUri ? (
                        <View style={S.photoPreviewWrap}>
                            <Image source={{ uri: photoUri }} style={S.photoPreview} contentFit="cover" />
                            <View style={S.photoOverlay}>
                                <TouchableOpacity
                                    style={S.retakeBtn}
                                    onPress={() => setCameraOpen(true)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
                                    <Text style={S.retakeBtnText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={S.removePhotoBtn}
                                    onPress={() => setPhotoUri(null)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="trash-outline" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={S.photoBtn} onPress={() => setCameraOpen(true)} activeOpacity={0.8}>
                            <View style={S.photoBtnIcon}>
                                <Ionicons name="camera" size={32} color="#3B82F6" />
                            </View>
                            <Text style={S.photoBtnTitle}>Take Visitor Photo</Text>
                            <Text style={S.photoBtnSub}>Recommended — helps resident identify visitor</Text>
                        </TouchableOpacity>
                    )}

                    {/* ── Submit ────────────────────────────────────────── */}
                    <Pressable
                        style={({ pressed }) => [
                            S.submitBtn,
                            !canSubmit && S.submitBtnDisabled,
                            pressed && canSubmit && S.submitBtnPressed,
                        ]}
                        onPress={handleSubmit}
                        disabled={!canSubmit || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="notifications" size={22} color={canSubmit ? '#fff' : '#9CA3AF'} />
                                <Text style={[S.submitBtnText, !canSubmit && S.submitBtnTextDisabled]}>
                                    Notify Resident
                                </Text>
                            </>
                        )}
                    </Pressable>

                </ScrollView>
            </KeyboardAvoidingView>

            <CameraModal
                visible={cameraOpen}
                onCapture={(uri) => setPhotoUri(uri)}
                onClose={() => setCameraOpen(false)}
            />
        </>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flatLabel(f: FlatResult): string {
    const block = f.block?.name ? `${f.block.name}-` : '';
    return `${block}${f.flatNumber}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAFBFC' },
    scroll: { padding: 20, paddingBottom: 48 },

    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#9CA3AF',
        letterSpacing: 1.5,
        marginBottom: 14,
        marginLeft: 2,
    },

    // ── Type grid — 2×2 big tiles ─────────────────────────────────────────────
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
    },
    typeCard: {
        width: (SW - 52) / 2,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 22,
        paddingHorizontal: 8,
        borderWidth: 2.5,
        borderColor: '#F0EEEB',
        gap: 10,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
            android: { elevation: 2 },
        }),
    },
    typeIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6B7280',
        textAlign: 'center',
    },

    // ── Provider grid — 2 columns, bigger tiles ────────────────────────────────
    providerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 28,
    },
    providerCard: {
        width: (SW - 50) / 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 2,
        borderColor: '#F0EEEB',
        gap: 12,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
            android: { elevation: 1 },
        }),
    },
    providerIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    providerLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9CA3AF',
        flex: 1,
    },

    // ── Flat search ────────────────────────────────────────────────────────────
    flatWrap: { marginBottom: 24, zIndex: 10 },
    flatInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        ...Platform.select({
            ios: { shadowColor: '#1F2937', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 2 },
        }),
    },
    flatIcon: { marginLeft: 14 },
    flatInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        color: '#0D0F14',
        paddingVertical: 18,
        paddingHorizontal: 12,
    },
    flatCheckmark: { marginRight: 14 },
    dropdown: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 4,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
            android: { elevation: 4 },
        }),
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
        gap: 10,
    },
    dropdownIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownFlat: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
    dropdownResident: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginTop: 1 },
    dropdownEmpty: { padding: 16, fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

    // ── Photo ──────────────────────────────────────────────────────────────────
    photoBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#BFDBFE',
        borderStyle: 'dashed',
        borderRadius: 20,
        paddingVertical: 32,
        backgroundColor: '#EFF6FF',
        marginBottom: 20,
        gap: 8,
    },
    photoBtnIcon: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    photoBtnTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E40AF',
    },
    photoBtnSub: {
        fontSize: 13,
        fontWeight: '500',
        color: '#60A5FA',
    },
    photoPreviewWrap: {
        height: 220,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    retakeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    retakeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    removePhotoBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(220,38,38,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Submit ─────────────────────────────────────────────────────────────────
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#10B981',
        borderRadius: 18,
        paddingVertical: 18,
        marginTop: 8,
        ...Platform.select({
            ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
            android: { elevation: 6 },
        }),
    },
    submitBtnDisabled: {
        backgroundColor: '#E5E7EB',
        ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
    },
    submitBtnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
    submitBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
    submitBtnTextDisabled: { color: '#9CA3AF' },
});

// ─── Camera styles ────────────────────────────────────────────────────────────

const cam = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    permRoot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        gap: 16,
        padding: 40,
    },
    permTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937', textAlign: 'center' },
    permBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 8,
    },
    permBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    shutterRow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    shutterBtn: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: '#fff',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#fff',
    },
    previewActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 24,
    },
    retakeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingVertical: 16,
        borderRadius: 16,
    },
    retakeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    useBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 16,
        ...Platform.select({
            ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
            android: { elevation: 4 },
        }),
    },
    useBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
