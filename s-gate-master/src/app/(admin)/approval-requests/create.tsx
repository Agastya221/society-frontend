import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { createGatePass } from '@/services/gatePass';

// ─── Mock flats ───────────────────────────────────────────────────────────────
const FLATS = [
    { id: '1', flatNumber: '101', block: 'A', ownerName: 'Rahul Sharma' },
    { id: '2', flatNumber: '102', block: 'A', ownerName: 'Priya Verma' },
    { id: '3', flatNumber: '201', block: 'B', ownerName: 'Amit Patel' },
    { id: '4', flatNumber: '305', block: 'C', ownerName: 'Suresh Raina' },
];

const REQUEST_TYPES = ['Entry', 'Gate_Pass', 'Special_Access'] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateApprovalRequestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [type, setType] = useState<RequestType>('Entry');
    const [flatNumber, setFlatNumber] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Title is required.');
            return;
        }
        if (!description.trim() || description.trim().length < 20) {
            Alert.alert('Validation', 'Description must be at least 20 characters.');
            return;
        }
        if (!flatNumber) {
            Alert.alert('Validation', 'Please select a flat.');
            return;
        }

        setSubmitting(true);
        try {
            await createGatePass({
                type: type as any,
                title: title.trim(),
                description: description.trim(),
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                flatId: flatNumber,
            });

            Alert.alert(
                'Request Submitted',
                'Your approval request has been submitted and is now pending review.',
                [{ text: 'OK', onPress: () => router.back() }],
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={S.root}>
            {/* ── Header (matches Notices pattern) ─────────────────────── */}
            <View style={[S.headerWrapper, { paddingTop: insets.top + 16 }]}>
                <View style={S.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={S.backButton}>
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={S.headerTitle} numberOfLines={1}>New Request</Text>
                        <Text style={S.headerSub} numberOfLines={1}>Create approval for entry/move-in</Text>
                    </View>
                </View>
            </View>

            {/* ── Spacer ───────────────────────────────────────────────── */}
            <View style={{ height: 6, backgroundColor: SgateColors.bg }} />

            {/* ── Form ─────────────────────────────────────────────────── */}
            <ScrollView
                style={S.scroll}
                contentContainerStyle={[S.scrollContent, { paddingBottom: 32 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Info Banner */}
                <View style={S.infoBanner}>
                    <Feather name="info" size={18} color={SgateColors.goldDeep} />
                    <View style={{ flex: 1 }}>
                        <Text style={S.infoTitle}>Compliance Notice</Text>
                        <Text style={S.infoText}>
                            Admin-initiated requests follow the same approval lifecycle as guard requests.
                            This ensures proper audit trail and accountability.
                        </Text>
                    </View>
                </View>

                {/* Request Type */}
                <Text style={S.label}>
                    Request Type <Text style={S.required}>*</Text>
                </Text>
                <View style={S.typeRow}>
                    {REQUEST_TYPES.map(t => {
                        const active = type === t;
                        return (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setType(t)}
                                style={[S.typeChip, active && S.typeChipActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[S.typeChipText, active && S.typeChipTextActive]}>
                                    {t.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Flat Selection */}
                <Text style={S.label}>
                    Flat Number <Text style={S.required}>*</Text>
                </Text>
                <View style={S.flatList}>
                    {FLATS.map(flat => {
                        const active = flatNumber === flat.flatNumber;
                        return (
                            <TouchableOpacity
                                key={flat.id}
                                onPress={() => setFlatNumber(flat.flatNumber)}
                                style={[S.flatItem, active && S.flatItemActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[S.flatText, active && S.flatTextActive]}>
                                    {flat.block}-{flat.flatNumber} ({flat.ownerName})
                                </Text>
                                {active && <Feather name="check" size={16} color={SgateColors.goldDeep} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Title */}
                <Text style={S.label}>
                    Title <Text style={S.required}>*</Text>
                </Text>
                <TextInput
                    style={S.input}
                    placeholder="e.g., Emergency Maintenance Access"
                    placeholderTextColor={SgateColors.t4}
                    value={title}
                    onChangeText={setTitle}
                />

                {/* Description */}
                <Text style={S.label}>
                    Description / Reason <Text style={S.required}>*</Text>
                </Text>
                <TextInput
                    style={[S.input, S.textArea]}
                    placeholder="Provide detailed reason for this request..."
                    placeholderTextColor={SgateColors.t4}
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />
                <Text style={S.hint}>Min. 20 characters</Text>

                {/* Submit */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    style={[S.submitBtn, submitting && S.submitBtnDisabled]}
                    activeOpacity={0.8}
                    disabled={submitting}
                >
                    <Feather name="send" size={16} color={SgateColors.t1} />
                    <Text style={S.submitBtnText}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                    onPress={() => {
                        if (title.trim() || description.trim() || flatNumber) {
                            Alert.alert(
                                'Discard Request?',
                                'You have unsaved changes. Are you sure you want to go back?',
                                [
                                    { text: 'Keep Editing', style: 'cancel' },
                                    { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                                ],
                            );
                        } else {
                            router.back();
                        }
                    }}
                    style={S.cancelBtn}
                    activeOpacity={0.8}
                >
                    <Feather name="x" size={16} color={SgateColors.t2} />
                    <Text style={S.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: SgateColors.bg },

    // Header (identical to Notices pattern)
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
    headerSub: { fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3, marginTop: 2 },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

    // Info banner
    infoBanner: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: SgateColors.goldPale,
        borderRadius: 14,
        padding: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.15)',
    },
    infoTitle: { fontSize: 13, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 4 },
    infoText: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t2, lineHeight: 18 },

    // Labels
    label: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginBottom: 10 },
    required: { color: '#EF4444' },
    hint: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4, marginTop: 6, marginBottom: 20 },

    // Type chips
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    typeChip: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: SgateColors.borderSoft,
        backgroundColor: SgateColors.card,
        alignItems: 'center',
    },
    typeChipActive: {
        borderColor: SgateColors.gold,
        backgroundColor: SgateColors.gold,
    },
    typeChipText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.t3 },
    typeChipTextActive: { fontFamily: SgateFonts.bold, color: SgateColors.t1 },

    // Flat list
    flatList: {
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        marginBottom: 24,
        overflow: 'hidden',
    },
    flatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    flatItemActive: { backgroundColor: SgateColors.goldPale },
    flatText: { fontSize: 14, fontFamily: SgateFonts.regular, color: SgateColors.t1 },
    flatTextActive: { fontFamily: SgateFonts.semibold, color: SgateColors.goldDeep },

    // Input
    input: {
        backgroundColor: SgateColors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t1,
        marginBottom: 20,
    },
    textArea: { height: 120, textAlignVertical: 'top', marginBottom: 0 },

    // Buttons
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SgateColors.gold,
        paddingVertical: 16,
        borderRadius: 14,
        ...Platform.select({
            ios: { shadowColor: SgateColors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
            android: { elevation: 4 },
        }),
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: 15, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: SgateColors.card,
        marginTop: 10,
        borderWidth: 1.5,
        borderColor: SgateColors.borderSoft,
    },
    cancelBtnText: { fontSize: 15, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
});
