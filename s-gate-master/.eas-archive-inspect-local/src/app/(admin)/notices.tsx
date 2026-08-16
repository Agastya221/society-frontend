import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppAlert } from '@/components/ui/AppAlert';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Notice {
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
    isPinned: boolean;
    createdAt: string;
    expiresAt?: string;
}

type NoticeType     = 'GENERAL' | 'URGENT' | 'EVENT' | 'MAINTENANCE' | 'MEETING' | 'EMERGENCY';
type NoticePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const TYPES: NoticeType[]         = ['GENERAL', 'URGENT', 'EVENT', 'MAINTENANCE', 'MEETING', 'EMERGENCY'];
const PRIORITIES: NoticePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    GENERAL:     { bg: SgateColors.surface,  text: SgateColors.t2 },
    URGENT:      { bg: SgateColors.redBg,    text: SgateColors.red },
    EVENT:       { bg: SgateColors.blueBg,   text: SgateColors.blue },
    MAINTENANCE: { bg: SgateColors.goldPale, text: SgateColors.goldDeep },
    MEETING:     { bg: SgateColors.blueBg,   text: SgateColors.blue },
    EMERGENCY:   { bg: SgateColors.redBg,    text: SgateColors.red },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function NoticesScreen() {
    const [notices, setNotices]       = useState<Notice[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Form
    const [title, setTitle]       = useState('');
    const [content, setContent]   = useState('');
    const [type, setType]         = useState<NoticeType>('GENERAL');
    const [priority, setPriority] = useState<NoticePriority>('LOW');
    const [isPinned, setIsPinned] = useState(false);

    const resetForm = () => { setTitle(''); setContent(''); setType('GENERAL'); setPriority('LOW'); setIsPinned(false); };

    useFocusEffect(useCallback(() => { fetchNotices(); }, []));

    const fetchNotices = async () => {
        try {
            const res = await api.get('/community/notices', { params: { page: 1, limit: 50 } });
            const raw = res.data?.data ?? res.data?.notices ?? res.data ?? [];
            const data: Notice[] = Array.isArray(raw) ? raw : [];
            data.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setNotices(data);
        } catch (err) { console.error('Failed to fetch notices:', err); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const handleRefresh = () => { setRefreshing(true); fetchNotices(); };

    const handleTogglePin = async (id: string) => {
        setNotices(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
            updated.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            return updated;
        });
        try { await api.patch(`/community/notices/${id}/toggle-pin`); }
        catch { fetchNotices(); }
    };

    const handleDelete = (id: string) => {
        AppAlert.show('Delete Notice', 'Are you sure you want to delete this notice?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    setNotices(prev => prev.filter(n => n.id !== id));
                    try { await api.delete(`/community/notices/${id}`); }
                    catch { fetchNotices(); }
                },
            },
        ]);
    };

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) { AppAlert.show('Error', 'Title and content are required'); return; }
        setSubmitting(true);
        try {
            await api.post('/community/notices', { title: title.trim(), content: content.trim(), type, priority, isPinned });
            setModalVisible(false);
            resetForm();
            fetchNotices();
        } catch (err: any) {
            AppAlert.show('Error', err?.response?.data?.message || 'Failed to create notice');
        } finally { setSubmitting(false); }
    };

    const getTypeStyle = (t: string) => TYPE_COLORS[t] ?? TYPE_COLORS.GENERAL;

    const getPriorityColor = (p: string) => {
        if (p === 'CRITICAL' || p === 'HIGH') return SgateColors.red;
        if (p === 'MEDIUM') return SgateColors.goldDeep;
        return SgateColors.t4;
    };

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={[styles.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
                        <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Notices</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Society updates & alerts</Text>
                    </View>
                </View>
            </View>

            {/* Persistent spacer — content never touches header */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                data={notices}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                    ListHeaderComponent={
                        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="plus" size={18} color={SgateColors.t1} />
                            <Text style={styles.addBtnText}>Create New Notice</Text>
                        </TouchableOpacity>
                    }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="bell-off-outline" size={48} color={SgateColors.t4} />
                        <Text style={styles.emptyTitle}>No notices yet</Text>
                        <Text style={styles.emptySub}>Create the first one.</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const ts = getTypeStyle(item.type);
                    return (
                        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                            <View style={styles.card}>
                                {/* Top: type pill + pinned + priority + actions */}
                                <View style={styles.cardTopRow}>
                                    <View style={styles.cardTopLeft}>
                                        {item.isPinned && (
                                            <View style={styles.pinBadge}>
                                                <MaterialCommunityIcons name="bookmark-outline" size={11} color={SgateColors.gold} />
                                            </View>
                                        )}
                                        <View style={[styles.typePill, { backgroundColor: ts.bg }]}>
                                            <Text style={[styles.typePillText, { color: ts.text }]}>{item.type}</Text>
                                        </View>
                                        <View style={styles.priorityRow}>
                                            <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
                                            <Text style={styles.priorityText}>{item.priority}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => handleTogglePin(item.id)} hitSlop={8}>
                                            <MaterialCommunityIcons name="bookmark-outline" size={17} color={item.isPinned ? SgateColors.gold : SgateColors.t4} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={8}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={17} color={SgateColors.red} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.noticeTitle}>{item.title}</Text>
                                <Text style={styles.noticeContent} numberOfLines={3}>{item.content}</Text>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    );
                }}
            />
            )}

            {/* ── Create Modal ────────────────────────────────────────────── */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}>
                <View style={[styles.modalWrap, { paddingBottom: insets.bottom }]}>
                    {/* Drag handle */}
                    <View style={styles.dragHandle} />

                    {/* Modal header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>New Notice</Text>
                            <Text style={styles.modalSub}>Publish an update for residents</Text>
                        </View>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeCircle}>
                            <MaterialCommunityIcons name="close" size={18} color={SgateColors.t2} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* ── Content Section ──────────────────────────── */}
                        <View style={styles.formSection}>
                            <Text style={styles.formSectionTitle}>Content</Text>
                            <View style={styles.formCard}>
                                <Text style={styles.formFieldLabel}>Title</Text>
                                <TextInput style={styles.formInput} placeholder="What's the notice about?"
                                    value={title} onChangeText={setTitle} placeholderTextColor={SgateColors.t4} />
                                <View style={styles.formDivider} />
                                <Text style={styles.formFieldLabel}>Details</Text>
                                <TextInput style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                                    multiline placeholder="Provide full details for residents..."
                                    value={content} onChangeText={setContent} placeholderTextColor={SgateColors.t4} />
                            </View>
                        </View>

                        {/* ── Type Section ──────────────────────────────── */}
                        <View style={styles.formSection}>
                            <Text style={styles.formSectionTitle}>Category</Text>
                            <View style={styles.chipRow}>
                                {TYPES.map(t => {
                                    const tc = TYPE_COLORS[t] ?? TYPE_COLORS.GENERAL;
                                    const isActive = type === t;
                                    return (
                                        <TouchableOpacity key={t} onPress={() => setType(t)}
                                            style={[styles.chip, isActive && { backgroundColor: tc.bg, borderColor: tc.text + '30' }]}
                                            activeOpacity={0.75}>
                                            <Text style={[styles.chipText, isActive && { color: tc.text }]}>
                                                {t.charAt(0) + t.slice(1).toLowerCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* ── Priority Section ─────────────────────────── */}
                        <View style={styles.formSection}>
                            <Text style={styles.formSectionTitle}>Priority</Text>
                            <View style={styles.priorityGrid}>
                                {PRIORITIES.map(p => {
                                    const isActive = priority === p;
                                    const color = getPriorityColor(p);
                                    return (
                                        <TouchableOpacity key={p} onPress={() => setPriority(p)}
                                            style={[styles.priorityChip, isActive && { backgroundColor: color + '15', borderColor: color + '40' }]}
                                            activeOpacity={0.75}>
                                            <View style={[styles.priorityChipDot, { backgroundColor: isActive ? color : SgateColors.t4 }]} />
                                            <Text style={[styles.priorityChipText, isActive && { color, fontFamily: SgateFonts.bold }]}>
                                                {p.charAt(0) + p.slice(1).toLowerCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* ── Pin Toggle ────────────────────────────────── */}
                        <TouchableOpacity style={styles.pinToggle} onPress={() => setIsPinned(!isPinned)} activeOpacity={0.8}>
                            <View style={[styles.pinToggleIcon, isPinned && styles.pinToggleIconActive]}>
                                <MaterialCommunityIcons name={isPinned ? 'bookmark' : 'bookmark-outline'} size={18}
                                    color={isPinned ? SgateColors.goldDeep : SgateColors.t3} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pinToggleTitle}>Pin this notice</Text>
                                <Text style={styles.pinToggleSub}>Pinned notices appear at the top</Text>
                            </View>
                            <View style={[styles.toggleTrack, isPinned && styles.toggleTrackActive]}>
                                <View style={[styles.toggleThumb, isPinned && styles.toggleThumbActive]} />
                            </View>
                        </TouchableOpacity>

                        {/* ── Submit ────────────────────────────────────── */}
                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={handleCreate} disabled={submitting} activeOpacity={0.8}>
                            {submitting ? <ActivityIndicator size="small" color={SgateColors.t1} /> :
                                <>
                                    <MaterialCommunityIcons name="send" size={16} color={SgateColors.t1} />
                                    <Text style={styles.submitBtnText}>Publish Notice</Text>
                                </>}
                        </TouchableOpacity>
                        <View style={{ height: 24 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },
    centerWrap: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },

    // Header
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
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub:   { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    listContent: { padding: 20, flexGrow: 1 },

    addBtn: { backgroundColor: SgateColors.gold, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
    addBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Card
    card: { backgroundColor: SgateColors.card, borderRadius: 20, borderWidth: 1, borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 10 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    pinBadge: { backgroundColor: SgateColors.goldPale, padding: 4, borderRadius: 6 },
    typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    typePillText: { fontSize: 10, fontFamily: SgateFonts.bold },
    priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    priorityDot: { width: 7, height: 7, borderRadius: 4 },
    priorityText: { fontSize: 10, fontFamily: SgateFonts.semibold, color: SgateColors.t4 },
    cardActions: { flexDirection: 'row', gap: 14 },

    noticeTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 6 },
    noticeContent: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3, lineHeight: 20, marginBottom: 10 },
    cardFooter: { borderTopWidth: 1, borderTopColor: SgateColors.borderSoft, paddingTop: 8 },
    cardDate: { fontSize: 11, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t2, marginTop: 10 },
    emptySub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 2 },

    // Modal
    modalWrap: { flex: 1, backgroundColor: SgateColors.card, paddingHorizontal: 20 },
    dragHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
        marginTop: 10, marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 28,
    },
    modalTitle: { fontSize: 24, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    modalSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 3 },
    closeCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
    },

    // Form sections
    formSection: { marginBottom: 24 },
    formSectionTitle: {
        fontSize: 13, fontFamily: SgateFonts.bold, color: SgateColors.t3,
        letterSpacing: 0.5, textTransform: 'uppercase',
        marginBottom: 10,
    },
    formCard: {
        backgroundColor: SgateColors.surface,
        borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft,
        padding: 16,
    },
    formFieldLabel: {
        fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3,
        marginBottom: 6,
    },
    formInput: {
        fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1,
        padding: 0, marginBottom: 0,
    },
    formDivider: {
        height: 1, backgroundColor: SgateColors.borderSoft,
        marginVertical: 14,
    },

    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 12, borderWidth: 1.5, borderColor: SgateColors.borderSoft,
        backgroundColor: SgateColors.surface,
    },
    chipText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },

    // Priority
    priorityGrid: { flexDirection: 'row', gap: 8 },
    priorityChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 11,
        borderRadius: 12, borderWidth: 1.5, borderColor: SgateColors.borderSoft,
        backgroundColor: SgateColors.surface,
    },
    priorityChipDot: { width: 7, height: 7, borderRadius: 4 },
    priorityChipText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },

    // Pin toggle
    pinToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: SgateColors.surface,
        borderRadius: 16, borderWidth: 1, borderColor: SgateColors.borderSoft,
        padding: 16, marginBottom: 28,
    },
    pinToggleIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: SgateColors.bg,
        alignItems: 'center', justifyContent: 'center',
    },
    pinToggleIconActive: { backgroundColor: SgateColors.goldPale },
    pinToggleTitle: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t1 },
    pinToggleSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 1 },
    toggleTrack: {
        width: 44, height: 26, borderRadius: 13,
        backgroundColor: SgateColors.border,
        justifyContent: 'center', paddingHorizontal: 3,
    },
    toggleTrackActive: { backgroundColor: SgateColors.gold },
    toggleThumb: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
        elevation: 2,
    },
    toggleThumbActive: { alignSelf: 'flex-end' },

    // Submit
    submitBtn: {
        backgroundColor: SgateColors.gold, borderRadius: 16,
        paddingVertical: 17, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
