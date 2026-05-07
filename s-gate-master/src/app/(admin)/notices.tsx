import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
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
        Alert.alert('Delete Notice', 'Are you sure you want to delete this notice?', [
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
        if (!title.trim() || !content.trim()) { Alert.alert('Error', 'Title and content are required'); return; }
        setSubmitting(true);
        try {
            await api.post('/community/notices', { title: title.trim(), content: content.trim(), type, priority, isPinned });
            setModalVisible(false);
            resetForm();
            fetchNotices();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create notice');
        } finally { setSubmitting(false); }
    };

    const getTypeStyle = (t: string) => TYPE_COLORS[t] ?? TYPE_COLORS.GENERAL;

    const getPriorityColor = (p: string) => {
        if (p === 'CRITICAL' || p === 'HIGH') return SgateColors.red;
        if (p === 'MEDIUM') return SgateColors.goldDeep;
        return SgateColors.t4;
    };

    if (loading) {
        return <AppLoader />;
    }

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
                <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="arrow-left" size={24} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerBarTitle}>Notices</Text>
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            <FlatList
                data={notices}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SgateColors.gold} colors={[SgateColors.gold]} />}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalVisible(true); }} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
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

            {/* ── Create Modal ────────────────────────────────────────────── */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalWrap, { paddingBottom: insets.bottom }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Notice</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formLabel}>TITLE *</Text>
                        <TextInput style={styles.formInput} placeholder="Notice Title" value={title}
                            onChangeText={setTitle} placeholderTextColor={SgateColors.t4} />

                        <Text style={styles.formLabel}>CONTENT *</Text>
                        <TextInput style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}
                            multiline placeholder="Notice details..." value={content}
                            onChangeText={setContent} placeholderTextColor={SgateColors.t4} />

                        <Text style={styles.formLabel}>TYPE</Text>
                        <View style={styles.chipRow}>
                            {TYPES.map(t => (
                                <TouchableOpacity key={t} onPress={() => setType(t)}
                                    style={[styles.chip, type === t && styles.chipSelected]}>
                                    <Text style={[styles.chipText, type === t && styles.chipTextSelected]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formLabel}>PRIORITY</Text>
                        <View style={styles.chipRow}>
                            {PRIORITIES.map(p => (
                                <TouchableOpacity key={p} onPress={() => setPriority(p)}
                                    style={[styles.chip, priority === p && styles.chipSelected]}>
                                    <Text style={[styles.chipText, priority === p && styles.chipTextSelected]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Pin this notice</Text>
                            <Switch value={isPinned} onValueChange={setIsPinned}
                                trackColor={{ false: SgateColors.border, true: SgateColors.gold + '60' }}
                                thumbColor={isPinned ? SgateColors.gold : SgateColors.surface} />
                        </View>

                        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={handleCreate} disabled={submitting} activeOpacity={0.8}>
                            {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> :
                                <Text style={styles.submitBtnText}>Publish Notice</Text>}
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
    centerWrap: { flex: 1, backgroundColor: SgateColors.bg, alignItems: 'center', justifyContent: 'center' },

    // Header
    headerBar: {
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
    headerBarTitle: { fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12, flex: 1 },
    spacer: { height: 6 },

    listContent: { padding: 20, flexGrow: 1 },

    addBtn: { backgroundColor: SgateColors.black, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
    addBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },

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
    modalWrap: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8, marginTop: 4 },
    formInput: { backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1, marginBottom: 14 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: SgateColors.border },
    chipSelected: { backgroundColor: SgateColors.black, borderColor: SgateColors.black },
    chipText: { fontSize: 12, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    chipTextSelected: { color: '#FFFFFF' },

    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24 },
    switchLabel: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },

    submitBtn: { backgroundColor: SgateColors.black, borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#FFFFFF' },
});
