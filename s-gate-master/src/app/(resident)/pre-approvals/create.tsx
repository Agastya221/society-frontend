import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateTypography } from '@/constants/Sgate-theme';
import { SgateMascot } from '@/components/Sgate/SgateMascot';
import api from '@/services/api';
import { QRCarousel } from '@/components/Sgate/QRCarousel';

// ─── Visitor type options (matches API) ──────────────────────────────────────
const VISITOR_TYPES = [
    { label: 'Guest',    value: 'GUEST' },
    { label: 'Delivery', value: 'DELIVERY_PERSON' },
    { label: 'Service',  value: 'SERVICE_PROVIDER' },
    { label: 'Cab',      value: 'CAB_DRIVER' },
    { label: 'Family',   value: 'FAMILY_MEMBER' },
    { label: 'Friend',   value: 'FRIEND' },
];

export default function CreatePreApprovalScreen() {
    const router = useRouter();

    // Form state
    const [name, setName]           = useState('');
    const [phone, setPhone]         = useState('');
    const [type, setType]           = useState('GUEST');
    const [vehicleNo, setVehicleNo] = useState('');

    // Date / time
    const [validFrom, setValidFrom] = useState(new Date());
    const [validUntil, setValidUntil] = useState(() => {
        const d = new Date();
        d.setHours(d.getHours() + 2);
        return d;
    });
    const [pickerMode, setPickerMode]     = useState<'date' | 'time'>('date');
    const [showPickerFor, setShowPickerFor] = useState<'from' | 'until' | null>(null);

    // API state
    const [submitting, setSubmitting]       = useState(false);
    const [successResponse, setSuccessResponse] = useState<any>(null);

    // ── Picker handlers ──────────────────────────────────────────────────────
    const onChangeDate = (_event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowPickerFor(null);
        if (selectedDate) {
            if (showPickerFor === 'from')  setValidFrom(selectedDate);
            if (showPickerFor === 'until') setValidUntil(selectedDate);
        }
    };
    const triggerPicker = (field: 'from' | 'until', mode: 'date' | 'time') => {
        setShowPickerFor(field);
        setPickerMode(mode);
    };
    const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter a visitor name.');
            return;
        }
        if (validUntil <= validFrom) {
            Alert.alert('Invalid Time', '"Valid Until" must be after "Valid From".');
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                visitorName: name.trim(),
                visitorType: type,
                validFrom: validFrom.toISOString(),
                validUntil: validUntil.toISOString(),
            };
            if (phone.trim()) {
                let p = phone.replace(/\D/g, '');
                if (p.length === 10) payload.visitorPhone = `+91${p}`;
                else if (p.length > 10) payload.visitorPhone = `+${p}`;
                else payload.visitorPhone = `+91${p}`;
            }
            if (vehicleNo.trim()) payload.vehicleNumber = vehicleNo.trim();

            const res = await api.post('/gate/preapprovals', payload);
            setSuccessResponse(res.data?.data);
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create pre-approval');
        } finally {
            setSubmitting(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Hi ${name.split(' ')[0]}, here is your Gate Pass for entry!\nVisitor Type: ${type.replace('_', ' ')}\nValid until: ${validUntil.toLocaleString()}\n\nPlease show this QR code at the security gate:\n${successResponse?.qrCodeUrl}`,
            });
        } catch {}
    };

    const handleClose = () => {
        setSuccessResponse(null);
        router.back();
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                    <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pre-Approve Visitor</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Visitor type selector ─────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.typeRow}>
                    {VISITOR_TYPES.map((t) => {
                        const active = type === t.value;
                        return (
                            <TouchableOpacity
                                key={t.value}
                                onPress={() => setType(t.value)}
                                activeOpacity={0.7}
                                style={[
                                    styles.typeChip,
                                    active && styles.typeChipActive,
                                ]}
                            >
                                <Text style={[
                                    styles.typeChipText,
                                    active && styles.typeChipTextActive,
                                ]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                {/* ── Visitor name ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.fieldLabel}>VISITOR NAME</Text>
                    <View style={styles.inputRow}>
                        <Feather name="user" size={16} color={SgateColors.t4} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter full name"
                            placeholderTextColor={SgateColors.t4}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>
                </Animated.View>

                {/* ── Phone ─────────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(150).springify()}>
                    <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                    <View style={styles.inputRow}>
                        <Feather name="phone" size={16} color={SgateColors.t4} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="+91 00000 00000"
                            placeholderTextColor={SgateColors.t4}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                </Animated.View>

                {/* ── Vehicle number ────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.fieldLabel}>VEHICLE NUMBER (OPTIONAL)</Text>
                    <View style={styles.inputRow}>
                        <Feather name="truck" size={16} color={SgateColors.t4} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. MH 01 AB 1234"
                            placeholderTextColor={SgateColors.t4}
                            value={vehicleNo}
                            onChangeText={setVehicleNo}
                            autoCapitalize="characters"
                        />
                    </View>
                </Animated.View>

                {/* ── Date / time pickers ───────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.dateTimeSection}>
                    <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeCol}>
                            <Text style={styles.fieldLabel}>DATE</Text>
                            <TouchableOpacity
                                style={styles.dateTimeBtn}
                                onPress={() => triggerPicker('from', 'date')}
                            >
                                <Feather name="calendar" size={15} color={SgateColors.goldDeep} />
                                <Text style={styles.dateTimeText}>{formatDate(validFrom)}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dateTimeCol}>
                            <Text style={styles.fieldLabel}>TIME</Text>
                            <TouchableOpacity
                                style={styles.dateTimeBtn}
                                onPress={() => triggerPicker('from', 'time')}
                            >
                                <Feather name="clock" size={15} color={SgateColors.goldDeep} />
                                <Text style={styles.dateTimeText}>{formatTime(validFrom)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.dateTimeDivider}>
                        <View style={styles.dateTimeDividerLine} />
                        <Text style={styles.dateTimeDividerText}>to</Text>
                        <View style={styles.dateTimeDividerLine} />
                    </View>

                    <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeCol}>
                            <Text style={styles.fieldLabel}>END DATE</Text>
                            <TouchableOpacity
                                style={styles.dateTimeBtn}
                                onPress={() => triggerPicker('until', 'date')}
                            >
                                <Feather name="calendar" size={15} color={SgateColors.t3} />
                                <Text style={styles.dateTimeText}>{formatDate(validUntil)}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dateTimeCol}>
                            <Text style={styles.fieldLabel}>END TIME</Text>
                            <TouchableOpacity
                                style={styles.dateTimeBtn}
                                onPress={() => triggerPicker('until', 'time')}
                            >
                                <Feather name="clock" size={15} color={SgateColors.t3} />
                                <Text style={styles.dateTimeText}>{formatTime(validUntil)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* Native picker */}
                {showPickerFor && (
                    <DateTimePicker
                        value={showPickerFor === 'from' ? validFrom : validUntil}
                        mode={pickerMode}
                        is24Hour={false}
                        display="default"
                        onChange={onChangeDate}
                        minimumDate={showPickerFor === 'until' ? validFrom : new Date()}
                    />
                )}

                {/* ── Photo area ────────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.photoArea}>
                    <Feather name="camera" size={22} color={SgateColors.goldDeep} />
                    <View style={{ marginLeft: 14 }}>
                        <Text style={styles.photoTitle}>Add visitor photo</Text>
                        <Text style={styles.photoSub}>Optional — helps guards identify</Text>
                    </View>
                </Animated.View>

                {/* ── Submit button ─────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(350).springify()}>
                    <TouchableOpacity
                        style={[styles.submitBtn, (!name.trim() || submitting) && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={!name.trim() || submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={SgateColors.gold} />
                        ) : (
                            <>
                                <Feather name="shield" size={17} color={SgateColors.gold} style={{ marginRight: 8 }} />
                                <Text style={styles.submitBtnText}>Generate Gate Pass</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Success modal ─────────────────────────────────────────────── */}
            <Modal
                visible={!!successResponse}
                transparent
                animationType="slide"
                onRequestClose={handleClose}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)', padding: 0 }]}>
                    {successResponse && (
                        <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                            <QRCarousel
                                passes={[{
                                    id: successResponse.id || Math.random().toString(),
                                    code: successResponse.passcode || successResponse.id || 'N/A',
                                    name: successResponse.visitorName || name.trim(),
                                    type: type,
                                    validUntil: new Date(validUntil).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }),
                                }]}
                                hostName="You"
                                onDone={handleClose}
                            />
                        </View>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },

    // ── Header ───────────────────────────────────────────────────────────────
    header: {
        backgroundColor: SgateColors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },

    // ── Scroll ───────────────────────────────────────────────────────────────
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },

    // ── Type chips ───────────────────────────────────────────────────────────
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 24,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: SgateColors.surface,
    },
    typeChipActive: {
        backgroundColor: SgateColors.black,
    },
    typeChipText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t3,
    },
    typeChipTextActive: {
        color: '#FFFFFF',
    },

    // ── Field label ──────────────────────────────────────────────────────────
    fieldLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        marginBottom: 8,
    },

    // ── Input row ────────────────────────────────────────────────────────────
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    // ── Date / time ──────────────────────────────────────────────────────────
    dateTimeSection: {
        marginBottom: 16,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateTimeCol: {
        flex: 1,
    },
    dateTimeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: SgateColors.surface,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        borderRadius: 16,
        padding: 14,
    },
    dateTimeText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    dateTimeDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 10,
    },
    dateTimeDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: SgateColors.border,
    },
    dateTimeDividerText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t4,
    },

    // ── Photo area ───────────────────────────────────────────────────────────
    photoArea: {
        backgroundColor: SgateColors.goldPale,
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 26,
        borderWidth: 1.5,
        borderColor: '#FFB80035',
        borderStyle: 'dashed',
    },
    photoTitle: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    photoSub: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 2,
    },

    // ── Submit button ────────────────────────────────────────────────────────
    submitBtn: {
        backgroundColor: SgateColors.black,
        borderRadius: 16,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.45,
    },
    submitBtnText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },

    // ── Modal ────────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: SgateColors.card,
        borderRadius: 24,
        width: '100%',
        maxWidth: 340,
        padding: 24,
        alignItems: 'center',
    },
    modalSuccessLabel: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.green,
        marginTop: 4,
        marginBottom: 20,
    },

    // ── Gate pass card ───────────────────────────────────────────────────────
    gatePassCard: {
        width: '100%',
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#FFB80025',
        overflow: 'hidden',
    },
    gatePassHeader: {
        backgroundColor: SgateColors.black,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    gatePassBrand: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
    },
    gatePassActiveTag: {
        backgroundColor: SgateColors.green + '18',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    gatePassActiveText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.green,
    },
    gatePassBody: {
        padding: 20,
        alignItems: 'center',
    },
    qrImage: {
        width: 140,
        height: 140,
        marginBottom: 10,
    },
    qrPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 18,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: SgateColors.border,
        borderStyle: 'dashed',
        marginBottom: 10,
    },
    qrHint: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        marginBottom: 14,
    },
    detailRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 9,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
    detailLabel: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },

    // ── Modal actions ────────────────────────────────────────────────────────
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        marginTop: 18,
    },
    modalShareBtn: {
        flex: 1,
        backgroundColor: SgateColors.surface,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalShareText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    modalDoneBtn: {
        flex: 1,
        backgroundColor: SgateColors.black,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalDoneText: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: '#FFFFFF',
    },
});
