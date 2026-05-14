import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface PollOption {
    id: string;
    text: string;
    voteCount: number;
}

interface Poll {
    id: string;
    question: string;
    description?: string;
    options: PollOption[];
    totalVotes: number;
    isActive: boolean;
    allowMultiple: boolean;
    createdAt: string;
    endDate?: string;
    createdBy?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function pct(votes: number, total: number): number {
    if (!total) return 0;
    return Math.round((votes / total) * 100);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminElectionsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [polls, setPolls]             = useState<Poll[]>([]);
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);
    const [createVisible, setCreateVisible] = useState(false);
    const [filter, setFilter]           = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');

    // Create form state
    const [question, setQuestion]       = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions]         = useState(['', '']);
    const [endDate, setEndDate]         = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [submitting, setSubmitting]   = useState(false);

    const fetchPolls = async (silent = false) => {
        try {
            const res = await api.get('/community/polls');
            const data = res.data?.data ?? res.data?.polls ?? [];
            setPolls(Array.isArray(data) ? data : []);
        } catch {
            // Show empty state on error — no mock data
            setPolls([]);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchPolls(); }, []));
    const onRefresh = () => { setRefreshing(true); fetchPolls(true); };

    const filtered = polls.filter((p) => {
        if (filter === 'ACTIVE') return p.isActive;
        if (filter === 'CLOSED') return !p.isActive;
        return true;
    });

    const handleClosePoll = (poll: Poll) => {
        Alert.alert('Close Poll', 'This will stop accepting votes. Cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Close Poll', style: 'destructive',
                onPress: async () => {
                    setPolls((prev) => prev.map((p) => p.id === poll.id ? { ...p, isActive: false } : p));
                    try {
                        await api.patch(`/community/polls/${poll.id}/close`);
                    } catch {
                        fetchPolls(true);
                    }
                },
            },
        ]);
    };

    const handleDeletePoll = (poll: Poll) => {
        Alert.alert('Delete Poll', `Delete "${poll.question}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    setPolls((prev) => prev.filter((p) => p.id !== poll.id));
                    try {
                        await api.delete(`/community/polls/${poll.id}`);
                    } catch {
                        fetchPolls(true);
                    }
                },
            },
        ]);
    };

    const addOption = () => {
        if (options.length >= 6) return;
        setOptions((prev) => [...prev, '']);
    };

    const removeOption = (idx: number) => {
        if (options.length <= 2) return;
        setOptions((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateOption = (idx: number, val: string) => {
        setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
    };

    const resetForm = () => {
        setQuestion('');
        setDescription('');
        setOptions(['', '']);
        setEndDate('');
        setAllowMultiple(false);
    };

    const handleCreate = async () => {
        if (!question.trim()) { Alert.alert('Error', 'Question is required'); return; }
        const validOptions = options.map((o) => o.trim()).filter(Boolean);
        if (validOptions.length < 2) { Alert.alert('Error', 'At least 2 options required'); return; }

        setSubmitting(true);
        try {
            await api.post('/community/polls', {
                question: question.trim(),
                description: description.trim() || undefined,
                options: validOptions,
                endDate: endDate.trim() || undefined,
                allowMultiple,
            });
            setCreateVisible(false);
            resetForm();
            fetchPolls(true);
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create poll');
        } finally {
            setSubmitting(false);
        }
    };

    const renderPoll = ({ item, index }: { item: Poll; index: number }) => {
        const topOption = [...item.options].sort((a, b) => b.voteCount - a.voteCount)[0];
        return (
            <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <View style={styles.card}>
                    {/* Header row: status + time */}
                    <View style={styles.cardHeader}>
                        <View style={[styles.statusPill, { backgroundColor: item.isActive ? SgateColors.greenBg : SgateColors.surface }]}>
                            <View style={[styles.statusDot, { backgroundColor: item.isActive ? SgateColors.green : SgateColors.t4 }]} />
                            <Text style={[styles.statusText, { color: item.isActive ? SgateColors.green : SgateColors.t3 }]}>
                                {item.isActive ? 'Active' : 'Closed'}
                            </Text>
                        </View>
                        <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                    </View>

                    {/* Question + description */}
                    <Text style={styles.question}>{item.question}</Text>
                    {!!item.description && (
                        <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
                    )}

                    {/* Options with vote bars */}
                    <View style={styles.optionsWrap}>
                        {item.options.map((opt) => {
                            const p = pct(opt.voteCount, item.totalVotes);
                            const isLeading = opt.id === topOption?.id && item.totalVotes > 0;
                            return (
                                <View key={opt.id} style={styles.optionRow}>
                                    <View style={styles.optionLabelRow}>
                                        <Text style={[styles.optionText, isLeading && styles.optionTextLeading]} numberOfLines={1}>
                                            {opt.text}
                                        </Text>
                                        <Text style={[styles.optionPct, isLeading && styles.optionPctLeading]}>{p}%</Text>
                                    </View>
                                    <View style={styles.barBg}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                { width: `${Math.max(p, 2)}%` as any },
                                                isLeading && styles.barFillLeading,
                                            ]}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Footer metadata */}
                    <View style={styles.cardFooter}>
                        <View style={styles.footerMeta}>
                            <MaterialCommunityIcons name="account-group-outline" size={14} color={SgateColors.t4} />
                            <Text style={styles.metaText}>{item.totalVotes} votes</Text>
                        </View>
                        {!!item.endDate && (
                            <View style={styles.footerMeta}>
                                <MaterialCommunityIcons name="calendar-clock-outline" size={14} color={SgateColors.t4} />
                                <Text style={styles.metaText}>
                                    Ends {new Date(item.endDate).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Admin actions */}
                    <View style={styles.actionRow}>
                        {item.isActive && (
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={() => handleClosePoll(item)}
                                activeOpacity={0.75}
                            >
                                <MaterialCommunityIcons name="lock-outline" size={15} color={SgateColors.t2} />
                                <Text style={styles.closeBtnText}>Close Poll</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeletePoll(item)}
                            activeOpacity={0.75}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={15} color={SgateColors.red} />
                            <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
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
                        <Text style={styles.headerTitle} numberOfLines={1}>Polls & Elections</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Community voting & decision making</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => { resetForm(); setCreateVisible(true); }}
                        style={styles.addBtn}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="plus" size={18} color={SgateColors.t1} />
                    </TouchableOpacity>
                </View>
                {/* Filter tabs */}
                <View style={styles.filterRow}>
                    {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterTab, filter === f && styles.filterTabActive]}
                            onPress={() => setFilter(f)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Closed'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Persistent spacer */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {loading ? (
                <AppLoader />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPoll}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <MaterialCommunityIcons name="poll" size={56} color={SgateColors.t4} />
                            <Text style={styles.emptyTitle}>No polls yet</Text>
                            <Text style={styles.emptySub}>Create the first one.</Text>
                        </View>
                    }
                />
            )}

            {/* Create poll modal */}
            <Modal
                visible={createVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setCreateVisible(false)}
            >
                <View style={styles.createModalWrap}>
                    <View style={styles.createModalHeader}>
                        <Text style={styles.createModalTitle}>New Poll</Text>
                        <TouchableOpacity onPress={() => setCreateVisible(false)}>
                            <MaterialCommunityIcons name="close" size={22} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formLabel}>QUESTION *</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="What are you asking residents?"
                            value={question}
                            onChangeText={setQuestion}
                            placeholderTextColor={SgateColors.t4}
                            multiline
                        />

                        <Text style={styles.formLabel}>DESCRIPTION (OPTIONAL)</Text>
                        <TextInput
                            style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Provide context for voters..."
                            value={description}
                            onChangeText={setDescription}
                            placeholderTextColor={SgateColors.t4}
                            multiline
                        />

                        <Text style={styles.formLabel}>OPTIONS *</Text>
                        {options.map((opt, idx) => (
                            <View key={idx} style={styles.optionInputRow}>
                                <TextInput
                                    style={[styles.formInput, styles.optionInput]}
                                    placeholder={`Option ${idx + 1}`}
                                    value={opt}
                                    onChangeText={(v) => updateOption(idx, v)}
                                    placeholderTextColor={SgateColors.t4}
                                />
                                {options.length > 2 && (
                                    <TouchableOpacity onPress={() => removeOption(idx)} style={styles.removeOptionBtn}>
                                        <MaterialCommunityIcons name="close" size={16} color={SgateColors.red} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {options.length < 6 && (
                            <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
                                <MaterialCommunityIcons name="plus" size={15} color={SgateColors.blue} />
                                <Text style={styles.addOptionText}>Add option</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.formLabel}>END DATE (OPTIONAL)</Text>
                        <TextInput
                            style={styles.formInput}
                            placeholder="YYYY-MM-DD"
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholderTextColor={SgateColors.t4}
                        />

                        <TouchableOpacity
                            style={styles.multipleToggle}
                            onPress={() => setAllowMultiple((v) => !v)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.checkbox, allowMultiple && styles.checkboxChecked]}>
                                {allowMultiple && <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />}
                            </View>
                            <Text style={styles.multipleToggleText}>Allow multiple selections</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                            onPress={handleCreate}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Create Poll</Text>
                            )}
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
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: SgateColors.goldPale, alignItems: 'center', justifyContent: 'center' },

    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: SgateColors.surface },
    filterTabActive: { backgroundColor: SgateColors.gold },
    filterText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t3 },
    filterTextActive: { color: SgateColors.t1 },

    listContent: { padding: 20, paddingBottom: 60, flexGrow: 1 },

    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 20,
        marginBottom: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, fontFamily: SgateFonts.bold },
    cardTime: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4 },

    question: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 4,
        lineHeight: 23,
    },
    descriptionText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        lineHeight: 19,
        marginBottom: 6,
    },

    optionsWrap: { gap: 14, marginTop: 8, marginBottom: 16 },
    optionRow: { gap: 6 },
    optionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t2, flex: 1 },
    optionTextLeading: { color: SgateColors.t1, fontFamily: SgateFonts.bold },
    optionPct: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t3, marginLeft: 8 },
    optionPctLeading: { color: SgateColors.t1, fontFamily: SgateFonts.bold },
    barBg: { height: 8, borderRadius: 4, backgroundColor: SgateColors.surface, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4, backgroundColor: SgateColors.t4 + '40' },
    barFillLeading: { backgroundColor: SgateColors.gold },

    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingTop: 14,
        marginBottom: 14,
    },
    footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, fontFamily: SgateFonts.medium, color: SgateColors.t4 },

    actionRow: { flexDirection: 'row', gap: 10 },
    closeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        backgroundColor: SgateColors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
    },
    closeBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        paddingHorizontal: 20,
        backgroundColor: SgateColors.redBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SgateColors.red + '15',
    },
    deleteBtnText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.red },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.7 },
    emptyTitle: { fontSize: 18, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginTop: 12, marginBottom: 4 },
    emptySub: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t3 },

    // Create modal
    createModalWrap: { flex: 1, backgroundColor: SgateColors.bg, padding: 24 },
    createModalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 24,
    },
    createModalTitle: { fontSize: 22, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    formLabel: { ...SgateTypography.microLabel, color: SgateColors.t3, marginBottom: 8, marginTop: 4 },
    formInput: {
        backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 16, padding: 15, fontSize: 15, fontFamily: SgateFonts.medium,
        color: SgateColors.t1, marginBottom: 14,
    },

    optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    optionInput: { flex: 1, marginBottom: 10 },
    removeOptionBtn: { padding: 4, marginBottom: 10 },

    addOptionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: SgateColors.blueBg, borderRadius: 12,
        marginBottom: 14, alignSelf: 'flex-start',
    },
    addOptionText: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.blue },

    multipleToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: SgateColors.surface, borderWidth: 1.5, borderColor: SgateColors.border,
        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: SgateColors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: SgateColors.gold, borderColor: SgateColors.gold },
    multipleToggleText: { fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1 },

    submitBtn: {
        backgroundColor: SgateColors.gold, borderRadius: 16,
        paddingVertical: 17, alignItems: 'center',
    },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
});
