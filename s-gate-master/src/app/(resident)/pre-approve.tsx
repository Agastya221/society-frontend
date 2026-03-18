import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { SgateButton } from '../../components/Sgate/SgateButton';
import { SgateHeader } from '../../components/Sgate/SgateHeader';
import { SgateInput } from '../../components/Sgate/SgateInput';
import { SgateColors, SgateFonts, SgateTypography } from '../../constants/Sgate-theme';
import { createPreApproval } from '../../services/gate.service';
import {
    confirmUpload,
    getPresignedUrl,
} from '../../services/upload.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { VisitorType } from '../../types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const VISITOR_TYPES: { value: VisitorType; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
    { value: 'GUEST',            label: 'Guest',    icon: 'user' },
    { value: 'DELIVERY_PERSON',  label: 'Delivery', icon: 'package' },
    { value: 'SERVICE_PROVIDER', label: 'Service',  icon: 'tool' },
    { value: 'CAB_DRIVER',       label: 'Cab',      icon: 'navigation' },
];

function pad(n: number) {
    return n.toString().padStart(2, '0');
}

function formatDateTime(date: Date): string {
    const d = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    const h = date.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const t = `${h12}:${pad(date.getMinutes())} ${ampm}`;
    return `${d}  ${t}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type DateField = 'from' | 'until';
// Android needs two passes: first date, then time
type PickerMode = 'date' | 'time';

export default function PreApproveScreen() {
    const router        = useRouter();
    const { user }      = useAuthStore();

    // ── Form state ───────────────────────────────────────────────────────────
    const [visitorType,  setVisitorType]  = useState<VisitorType>('GUEST');
    const [visitorName,  setVisitorName]  = useState('');
    const [visitorPhone, setVisitorPhone] = useState('');
    const [purpose,      setPurpose]      = useState('');

    const defaultFrom  = new Date();
    const defaultUntil = new Date(Date.now() + 4 * 60 * 60 * 1000); // +4 h
    const [validFrom,  setValidFrom]  = useState(defaultFrom);
    const [validUntil, setValidUntil] = useState(defaultUntil);

    // ── DateTimePicker state ─────────────────────────────────────────────────
    // activePicker: which field is open; pickerMode: android two-pass
    const [activePicker, setActivePicker] = useState<DateField | null>(null);
    const [pickerMode,   setPickerMode]   = useState<PickerMode>('date');
    // Holds the partial android date while waiting for the time pass
    const [tempDate, setTempDate] = useState<Date | null>(null);

    // ── Photo state ──────────────────────────────────────────────────────────
    const [photoUri,    setPhotoUri]    = useState<string | null>(null);
    const [photoKey,    setPhotoKey]    = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);

    // ── Submission state ─────────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [errors,     setErrors]     = useState<{ name?: string; dates?: string }>({});

    // ── Date picker handlers ─────────────────────────────────────────────────
    const openPicker = (field: DateField) => {
        setActivePicker(field);
        setPickerMode('date');
        setTempDate(null);
    };

    const handlePickerChange = (
        event: DateTimePickerEvent,
        selected?: Date,
    ) => {
        if (event.type === 'dismissed' || !selected) {
            setActivePicker(null);
            setTempDate(null);
            return;
        }

        if (Platform.OS === 'ios') {
            // iOS — single inline picker, update directly
            activePicker === 'from' ? setValidFrom(selected) : setValidUntil(selected);
            // Keep open on iOS; user taps elsewhere to close
        } else {
            // Android — two passes
            if (pickerMode === 'date') {
                setTempDate(selected);
                setPickerMode('time');  // second pass
            } else {
                // Merge date part from tempDate + time part from selected
                const merged = new Date(tempDate ?? selected);
                merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                activePicker === 'from' ? setValidFrom(merged) : setValidUntil(merged);
                setActivePicker(null);
                setTempDate(null);
                setPickerMode('date');
            }
        }
    };

    const closeiOSPicker = () => setActivePicker(null);

    // ── Photo capture ────────────────────────────────────────────────────────
    const handlePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            const libStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libStatus.status !== 'granted') {
                Alert.alert('Permission required', 'Please allow camera or photo access.');
                return;
            }
        }

        Alert.alert('Add Photo', 'Choose source', [
            {
                text: 'Camera',
                onPress: async () => {
                    const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                        await uploadPhoto(result.assets[0]);
                    }
                },
            },
            {
                text: 'Photo Library',
                onPress: async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                        await uploadPhoto(result.assets[0]);
                    }
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
        setPhotoLoading(true);
        try {
            const fileName = asset.uri.split('/').pop() ?? 'photo.jpg';
            const mimeType = asset.mimeType ?? 'image/jpeg';
            const fileSize = asset.fileSize ?? 1_000_000;

            // 1. Get pre-signed URL
            const { uploadUrl, s3Key } = await getPresignedUrl({
                context:      'entry-photo',
                fileName,
                mimeType,
                fileSize,
                documentType: 'OTHER',
            });

            // 2. PUT image to S3
            const imgResponse = await fetch(asset.uri);
            const blob         = await imgResponse.blob();
            const s3Res        = await fetch(uploadUrl, {
                method:  'PUT',
                headers: { 'Content-Type': mimeType },
                body:    blob,
            });
            if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);

            // 3. Confirm upload
            await confirmUpload({ s3Key, fileName, mimeType, fileSize, documentType: 'OTHER' });

            setPhotoUri(asset.uri);
            setPhotoKey(s3Key);
        } catch (err) {
            console.error('Photo upload error:', err);
            Alert.alert('Upload failed', 'Could not upload photo. You can still continue without one.');
        } finally {
            setPhotoLoading(false);
        }
    };

    const removePhoto = () => {
        setPhotoUri(null);
        setPhotoKey(null);
    };

    // ── Validation ───────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const errs: typeof errors = {};
        if (!visitorName.trim()) errs.name = 'Visitor name is required';
        if (validUntil <= validFrom) errs.dates = '"Valid until" must be after "Valid from"';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!validate()) return;
        if (!user?.flatId) {
            Alert.alert('Error', 'Your flat is not set up. Please complete onboarding first.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await createPreApproval({
                visitorName:  visitorName.trim(),
                visitorPhone: visitorPhone.trim() || undefined,
                flatId:       user.flatId,
                validFrom:    validFrom.toISOString(),
                validUntil:   validUntil.toISOString(),
                visitorType,
            });

            router.push({ pathname: '/gate-pass' as any, params: { id: result.id } });
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Something went wrong.';
            Alert.alert('Failed to create pre-approval', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <SgateHeader
                title="Pre-Approve Visitor"
                showBack
                onBack={() => router.back()}
            />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Type selector ──────────────────────────────────── */}
                    <Text style={styles.sectionLabel}>VISITOR TYPE</Text>
                    <View style={styles.typeRow}>
                        {VISITOR_TYPES.map(({ value, label, icon }) => {
                            const active = visitorType === value;
                            return (
                                <Pressable
                                    key={value}
                                    onPress={() => setVisitorType(value)}
                                    style={[
                                        styles.typePill,
                                        active ? styles.typePillActive : styles.typePillInactive,
                                    ]}
                                >
                                    <Feather
                                        name={icon}
                                        size={14}
                                        color={active ? SgateColors.goldDeep : SgateColors.t3}
                                        style={styles.typeIcon}
                                    />
                                    <Text
                                        style={[
                                            styles.typePillText,
                                            active
                                                ? styles.typePillTextActive
                                                : styles.typePillTextInactive,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* ── Visitor details ────────────────────────────────── */}
                    <View style={styles.card}>
                        <SgateInput
                            label="Visitor Name"
                            placeholder="Full name"
                            value={visitorName}
                            onChangeText={setVisitorName}
                            icon="user"
                            error={errors.name}
                            autoCapitalize="words"
                        />
                        <View style={styles.fieldGap} />
                        <SgateInput
                            label="Phone Number"
                            placeholder="+91 XXXXX XXXXX (optional)"
                            value={visitorPhone}
                            onChangeText={setVisitorPhone}
                            icon="phone"
                            keyboardType="phone-pad"
                        />
                        <View style={styles.fieldGap} />
                        <SgateInput
                            label="Purpose"
                            placeholder="e.g. Birthday party, plumbing work…"
                            value={purpose}
                            onChangeText={setPurpose}
                            icon="edit-2"
                            autoCapitalize="sentences"
                        />
                    </View>

                    {/* ── Schedule ───────────────────────────────────────── */}
                    <Text style={styles.sectionLabel}>VALID WINDOW</Text>
                    {errors.dates && (
                        <Text style={styles.dateError}>{errors.dates}</Text>
                    )}
                    <View style={styles.card}>
                        <DateTrigger
                            label="FROM"
                            value={validFrom}
                            onPress={() => openPicker('from')}
                        />
                        <View style={styles.dateDivider} />
                        <DateTrigger
                            label="UNTIL"
                            value={validUntil}
                            onPress={() => openPicker('until')}
                        />
                    </View>

                    {/* iOS: show inline picker below the card when active */}
                    {Platform.OS === 'ios' && activePicker !== null && (
                        <View style={styles.iosPickerWrap}>
                            <View style={styles.iosPickerHeader}>
                                <Text style={styles.iosPickerTitle}>
                                    {activePicker === 'from' ? 'Valid From' : 'Valid Until'}
                                </Text>
                                <TouchableOpacity onPress={closeiOSPicker}>
                                    <Text style={styles.iosDoneBtn}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={activePicker === 'from' ? validFrom : validUntil}
                                mode="datetime"
                                display="spinner"
                                onChange={handlePickerChange}
                                minimumDate={activePicker === 'until' ? validFrom : undefined}
                                style={styles.iosPicker}
                                textColor={SgateColors.t1}
                            />
                        </View>
                    )}

                    {/* Android: modal picker rendered when activePicker is set */}
                    {Platform.OS === 'android' && activePicker !== null && (
                        <DateTimePicker
                            value={
                                pickerMode === 'time' && tempDate
                                    ? tempDate
                                    : activePicker === 'from'
                                        ? validFrom
                                        : validUntil
                            }
                            mode={pickerMode}
                            display="default"
                            onChange={handlePickerChange}
                            minimumDate={
                                activePicker === 'until' && pickerMode === 'date'
                                    ? validFrom
                                    : undefined
                            }
                        />
                    )}

                    {/* ── Optional photo ─────────────────────────────────── */}
                    <Text style={styles.sectionLabel}>VISITOR PHOTO <Text style={styles.optional}>(optional)</Text></Text>
                    <View style={styles.card}>
                        {photoUri ? (
                            <View style={styles.photoPreviewRow}>
                                <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                                <View style={styles.photoMeta}>
                                    <Text style={styles.photoLabel}>Photo added</Text>
                                    <Text style={styles.photoSub}>Guard will see this at entry</Text>
                                </View>
                                <TouchableOpacity onPress={removePhoto} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Feather name="x-circle" size={20} color={SgateColors.t3} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.photoPlaceholder}
                                onPress={handlePhoto}
                                disabled={photoLoading}
                                activeOpacity={0.7}
                            >
                                {photoLoading ? (
                                    <Text style={styles.photoPlaceholderText}>Uploading…</Text>
                                ) : (
                                    <>
                                        <View style={styles.cameraCircle}>
                                            <Feather name="camera" size={22} color={SgateColors.t3} />
                                        </View>
                                        <Text style={styles.photoPlaceholderText}>Add visitor photo</Text>
                                        <Text style={styles.photoPlaceholderSub}>Camera or photo library</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── Submit ─────────────────────────────────────────── */}
                    <View style={styles.submitWrap}>
                        <SgateButton
                            label="Generate Gate Pass"
                            variant="primary"
                            icon="check-circle"
                            onPress={handleSubmit}
                            loading={submitting}
                            disabled={submitting || photoLoading}
                            fullWidth
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Date trigger row ─────────────────────────────────────────────────────────

function DateTrigger({
    label,
    value,
    onPress,
}: {
    label: string;
    value: Date;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.dateTrigger} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.dateTriggerLeft}>
                <Text style={styles.dateTriggerLabel}>{label}</Text>
                <Text style={styles.dateTriggerValue}>{formatDateTime(value)}</Text>
            </View>
            <Feather name="calendar" size={16} color={SgateColors.t3} />
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 48,
    },

    // ── Section label ──────────────────────────────────────────────────────
    sectionLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
        marginBottom: 10,
        marginTop: 4,
    },
    optional: {
        fontFamily: SgateFonts.regular,
        letterSpacing: 0,
        textTransform: 'none',
        fontSize: 11,
        color: SgateColors.t4,
    },

    // ── Type pills ─────────────────────────────────────────────────────────
    typeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    typePill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 11,
        paddingHorizontal: 6,
        borderWidth: 1.5,
        gap: 5,
    },
    typePillActive: {
        backgroundColor: SgateColors.goldPale,
        borderColor: SgateColors.gold,
    },
    typePillInactive: {
        backgroundColor: SgateColors.card,
        borderColor: SgateColors.borderSoft,
    },
    typeIcon: {
        // handled by color prop
    },
    typePillText: {
        fontSize: 11.5,
        fontFamily: SgateFonts.semibold,
    },
    typePillTextActive: {
        color: SgateColors.goldDeep,
    },
    typePillTextInactive: {
        color: SgateColors.t3,
    },

    // ── Card ───────────────────────────────────────────────────────────────
    card: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 20,
    },
    fieldGap: {
        height: 14,
    },

    // ── Date triggers ──────────────────────────────────────────────────────
    dateError: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.red,
        marginBottom: 8,
        marginTop: -6,
    },
    dateTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 4,
    },
    dateTriggerLeft: {
        gap: 3,
    },
    dateTriggerLabel: {
        ...SgateTypography.microLabel,
        color: SgateColors.t3,
    },
    dateTriggerValue: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    dateDivider: {
        height: 1,
        backgroundColor: SgateColors.borderSoft,
        marginHorizontal: -16,
    },

    // ── iOS datetime picker ────────────────────────────────────────────────
    iosPickerWrap: {
        backgroundColor: SgateColors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        overflow: 'hidden',
        marginBottom: 20,
        marginTop: -12,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: SgateColors.borderSoft,
    },
    iosPickerTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    iosDoneBtn: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
    },
    iosPicker: {
        height: 180,
    },

    // ── Photo ──────────────────────────────────────────────────────────────
    photoPlaceholder: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 6,
    },
    cameraCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    photoPlaceholderText: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
    },
    photoPlaceholderSub: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    photoPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    photoThumb: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: SgateColors.surface,
    },
    photoMeta: {
        flex: 1,
    },
    photoLabel: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    photoSub: {
        marginTop: 2,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },

    // ── Submit ─────────────────────────────────────────────────────────────
    submitWrap: {
        marginTop: 4,
    },
});
