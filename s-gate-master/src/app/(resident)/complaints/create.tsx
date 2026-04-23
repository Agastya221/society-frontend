import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
    ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComplaintScreenLayout } from '../../../components/complaints/ComplaintScreenLayout';
import { ComplaintCategory, ComplaintUrgency, createComplaint } from '../../../services/complaints';
import { uploadImage } from '../../../services/uploadService';
import { AppAlert } from '../../../components/ui/AppAlert';
import { SgateColors, SgateFonts } from '../../../constants/Sgate-theme';

// ─── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES: { label: string; value: ComplaintCategory; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { label: 'Plumbing', value: 'PLUMBING', icon: 'pipe-wrench' },
    { label: 'Electrical', value: 'ELECTRICITY', icon: 'flash-outline' },
    { label: 'Civil', value: 'MAINTENANCE', icon: 'hammer-wrench' },
    { label: 'Carpentry', value: 'MAINTENANCE', icon: 'saw-blade' },
    { label: 'Painting', value: 'MAINTENANCE', icon: 'format-paint' },
    { label: 'Housekeeping', value: 'CLEANLINESS', icon: 'broom' },
    { label: 'Security', value: 'SECURITY', icon: 'shield-outline' },
    { label: 'Lift', value: 'MAINTENANCE', icon: 'elevator-passenger-outline' },
    { label: 'Water', value: 'WATER', icon: 'water-outline' },
    { label: 'Other', value: 'OTHER', icon: 'dots-horizontal-circle-outline' },
];

const PREFERRED_TIMES = [
    { label: 'Morning (9AM–12PM)', value: 'MORNING' },
    { label: 'Afternoon (12PM–4PM)', value: 'AFTERNOON' },
    { label: 'Evening (4PM–7PM)', value: 'EVENING' },
    { label: 'Anytime', value: 'ANYTIME' },
];

type RequestType = 'unit' | 'community';

interface ImageState { localUri: string; s3Key?: string; uploading: boolean; }

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function CreateComplaintScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        category: 'PLUMBING' as ComplaintCategory,
        categoryLabel: 'Plumbing',
        description: '',
        location: '',
        urgency: 'MEDIUM' as ComplaintUrgency,
    });
    const [images, setImages] = useState<ImageState[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [requestType, setRequestType] = useState<RequestType>('unit');
    const [preferredTime, setPreferredTime] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);
    const [focusedField, setFocusedField] = useState('');

    // ─── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!formData.title.trim()) { setError('Please enter a title'); return; }
        if (!formData.description.trim()) { setError('Please enter a description'); return; }
        setIsLoading(true); setError('');
        if (images.some(img => img.uploading)) {
            AppAlert.show('Please Wait', 'Images are still uploading...');
            setIsLoading(false); return;
        }
        try {
            const s3Keys = images.filter(img => img.s3Key).map(img => img.s3Key!);
            const result = await createComplaint({
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                location: formData.location.trim(),
                urgency: isUrgent ? 'CRITICAL' : formData.urgency,
                isPrivate: requestType === 'unit',
                photos: s3Keys,
            } as any);
            AppAlert.show('Complaint Submitted', `Your complaint has been registered.\n\nTicket: ${result.ticketNumber}`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            setError(err.message || 'Failed to submit.');
        } finally { setIsLoading(false); }
    };

    // ─── Image Handling ─────────────────────────────────────────────────────────
    const pickImage = async (source: 'camera' | 'gallery') => {
        if (images.length >= 5) { AppAlert.show('Limit Reached', 'Max 5 photos'); return; }
        try {
            let result;
            if (source === 'camera') {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) { AppAlert.show('Permission Required', 'Allow camera access'); return; }
                result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
            } else {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) { AppAlert.show('Permission Required', 'Allow gallery access'); return; }
                result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
            }
            if (!result.canceled && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                setImages(prev => [...prev, { localUri, uploading: true }]);
                try {
                    const s3Key = await uploadImage(localUri, { context: 'entry-photo' });
                    setImages(prev => prev.map(img => img.localUri === localUri ? { ...img, s3Key, uploading: false } : img));
                } catch {
                    setImages(prev => prev.filter(img => img.localUri !== localUri));
                    AppAlert.show('Upload Failed', 'Failed to upload image.');
                }
            }
        } catch { AppAlert.show('Error', 'Failed to pick image.'); }
    };

    const showImageOptions = () => {
        AppAlert.show('Add Photo', 'Choose an option', [
            { text: 'Take Photo', onPress: () => pickImage('camera') },
            { text: 'Choose from Gallery', onPress: () => pickImage('gallery') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));
    const selectedTimeLabel = PREFERRED_TIMES.find(t => t.value === preferredTime)?.label ?? 'Select preferred time';
    const canSubmit = formData.title.trim().length > 0 && formData.description.trim().length > 0 && !isLoading;

    return (
        <ComplaintScreenLayout
            headerContent={
                <View style={S.headerInner}>
                    <TouchableOpacity onPress={() => router.back()} style={S.closeBtn} disabled={isLoading}>
                        <Feather name="x" size={22} color={SgateColors.t1} />
                    </TouchableOpacity>
                    <Text style={S.headerTitle}>Raise Complaint</Text>
                    <View style={{ width: 38 }} />
                </View>
            }
        >
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={S.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                    {/* Error */}
                    {error ? (
                        <View style={S.errorBanner}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={SgateColors.red} />
                            <Text style={S.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* ── Form Card ───────────────────────────────────────────── */}
                    <View style={S.formCard}>

                        {/* Title */}
                        <View style={S.fieldGroup}>
                            <Text style={S.label}>Title <Text style={S.required}>*</Text></Text>
                            <View style={[S.inputWrap, focusedField === 'title' && S.inputFocused]}>
                                <TextInput
                                    style={S.textInput}
                                    placeholder="Brief title (e.g. Water Leak)"
                                    placeholderTextColor="#999"
                                    value={formData.title}
                                    onChangeText={t => { setFormData({ ...formData, title: t }); setError(''); }}
                                    onFocus={() => setFocusedField('title')}
                                    onBlur={() => setFocusedField('')}
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Category */}
                        <View style={S.fieldGroup}>
                            <Text style={S.label}>Category <Text style={S.required}>*</Text></Text>
                            <TouchableOpacity style={S.selectWrap} onPress={() => setShowCategoryPicker(true)} disabled={isLoading}>
                                <MaterialCommunityIcons name={CATEGORIES.find(c => c.label === formData.categoryLabel)?.icon ?? 'folder-outline'} size={18} color={SgateColors.goldDeep} />
                                <Text style={S.selectText}>{formData.categoryLabel}</Text>
                                <Feather name="chevron-down" size={18} color={SgateColors.t3} />
                            </TouchableOpacity>
                        </View>

                        {/* Description */}
                        <View style={S.fieldGroup}>
                            <Text style={S.label}>Description <Text style={S.required}>*</Text></Text>
                            <View style={[S.inputWrap, S.textAreaWrap, focusedField === 'desc' && S.inputFocused]}>
                                <TextInput
                                    style={[S.textInput, S.textArea]}
                                    placeholder="Describe the issue in detail..."
                                    placeholderTextColor="#999"
                                    multiline
                                    textAlignVertical="top"
                                    maxLength={3000}
                                    value={formData.description}
                                    onChangeText={t => { setFormData({ ...formData, description: t }); setError(''); }}
                                    onFocus={() => setFocusedField('desc')}
                                    onBlur={() => setFocusedField('')}
                                    editable={!isLoading}
                                />
                            </View>
                            <Text style={S.charCount}>{formData.description.length} / 3000</Text>
                        </View>

                        {/* Location */}
                        <View style={S.fieldGroup}>
                            <Text style={S.label}>Location</Text>
                            <View style={[S.inputWrap, S.inputWithIcon, focusedField === 'location' && S.inputFocused]}>
                                <MaterialCommunityIcons name="map-marker-outline" size={18} color={SgateColors.t3} />
                                <TextInput
                                    style={[S.textInput, { flex: 1 }]}
                                    placeholder="e.g., Kitchen, Parking Lot B"
                                    placeholderTextColor="#999"
                                    value={formData.location}
                                    onChangeText={t => setFormData({ ...formData, location: t })}
                                    onFocus={() => setFocusedField('location')}
                                    onBlur={() => setFocusedField('')}
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Preferred Time */}
                        <View style={S.fieldGroup}>
                            <Text style={S.label}>Preferred Time</Text>
                            <TouchableOpacity style={S.selectWrap} onPress={() => setShowTimePicker(true)} disabled={isLoading}>
                                <MaterialCommunityIcons name="clock-outline" size={18} color={SgateColors.t3} />
                                <Text style={[S.selectText, !preferredTime && { color: '#999' }]}>{selectedTimeLabel}</Text>
                                <Feather name="chevron-down" size={18} color={SgateColors.t3} />
                            </TouchableOpacity>
                        </View>

                        {/* Photos */}
                        <View style={S.fieldGroup}>
                            <Text style={S.label}>Photos <Text style={S.optional}>(Optional, Max 5)</Text></Text>
                            <View style={S.photosRow}>
                                {images.map((img, i) => (
                                    <View key={i} style={S.photoThumb}>
                                        <Image source={{ uri: img.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                                        {img.uploading && (
                                            <View style={S.photoOverlay}>
                                                <ActivityIndicator size="small" color="#fff" />
                                            </View>
                                        )}
                                        <TouchableOpacity style={S.photoRemove} onPress={() => removeImage(i)} disabled={isLoading || img.uploading}>
                                            <Feather name="x" size={12} color="#fff" />
                                        </TouchableOpacity>
                                        {img.s3Key && (
                                            <View style={S.photoCheck}>
                                                <Feather name="check" size={10} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                ))}
                                {images.length < 5 && (
                                    <TouchableOpacity style={S.photoAdd} onPress={showImageOptions} disabled={isLoading}>
                                        <MaterialCommunityIcons name="camera-plus-outline" size={22} color={SgateColors.t3} />
                                        <Text style={S.photoAddText}>Add</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* ── Request Type ────────────────────────────────────────── */}
                    <View style={S.formCard}>
                        <Text style={S.sectionTitle}>Request Type</Text>
                        <View style={S.requestRow}>
                            {(['unit', 'community'] as RequestType[]).map(type => {
                                const active = requestType === type;
                                const icon = type === 'unit' ? 'home-outline' : 'account-group-outline';
                                const title = type === 'unit' ? 'Unit' : 'Community';
                                const desc = type === 'unit'
                                    ? 'For flat-specific issues. Visible to unit members only.'
                                    : 'For common area issues. Visible to entire society.';
                                return (
                                    <TouchableOpacity key={type} style={[S.requestCard, active && S.requestCardActive]} onPress={() => setRequestType(type)}>
                                        <MaterialCommunityIcons name={icon} size={22} color={active ? SgateColors.goldDeep : SgateColors.t3} />
                                        <Text style={[S.requestTitle, active && S.requestTitleActive]}>{title}</Text>
                                        <View style={[S.radio, active && S.radioActive]}>
                                            {active && <View style={S.radioDot} />}
                                        </View>
                                        <Text style={S.requestDesc}>{desc}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* ── Urgent Toggle ───────────────────────────────────────── */}
                    <View style={S.urgentCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={S.urgentTitle}>Mark as Urgent?</Text>
                            <Text style={S.urgentSub}>For critical issues needing immediate attention.</Text>
                        </View>
                        <Switch
                            value={isUrgent}
                            onValueChange={setIsUrgent}
                            disabled={isLoading}
                            trackColor={{ false: '#E0E0E0', true: SgateColors.goldPale }}
                            thumbColor={isUrgent ? SgateColors.gold : '#F5F5F5'}
                        />
                    </View>

                    {/* ── Submit Button ───────────────────────────────────────── */}
                    <TouchableOpacity
                        style={[S.submitBtn, !canSubmit && S.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        activeOpacity={0.85}
                    >
                        {isLoading
                            ? <ActivityIndicator size="small" color={SgateColors.t1} />
                            : <Text style={[S.submitBtnText, !canSubmit && S.submitBtnTextDisabled]}>Submit Complaint</Text>
                        }
                    </TouchableOpacity>

                    <View style={{ height: 32 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Category Picker ─────────────────────────────────────────── */}
            <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
                <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
                    <View style={S.pickerSheet}>
                        <View style={S.pickerHandle} />
                        <Text style={S.pickerTitle}>Choose Category</Text>
                        <FlatList
                            data={CATEGORIES}
                            keyExtractor={item => item.value + item.label}
                            renderItem={({ item }) => {
                                const active = formData.categoryLabel === item.label;
                                return (
                                    <TouchableOpacity style={[S.pickerRow, active && S.pickerRowActive]} onPress={() => { setFormData({ ...formData, category: item.value, categoryLabel: item.label }); setShowCategoryPicker(false); }}>
                                        <MaterialCommunityIcons name={item.icon} size={20} color={active ? SgateColors.goldDeep : SgateColors.t3} style={{ marginRight: 12 }} />
                                        <Text style={[S.pickerRowText, active && S.pickerRowTextActive]}>{item.label}</Text>
                                        {active && <Feather name="check" size={16} color={SgateColors.goldDeep} />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Time Picker ────────────────────────────────────────────── */}
            <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
                    <View style={S.pickerSheet}>
                        <View style={S.pickerHandle} />
                        <Text style={S.pickerTitle}>Preferred Time</Text>
                        {PREFERRED_TIMES.map(t => {
                            const active = preferredTime === t.value;
                            return (
                                <TouchableOpacity key={t.value} style={[S.pickerRow, active && S.pickerRowActive]} onPress={() => { setPreferredTime(t.value); setShowTimePicker(false); }}>
                                    <MaterialCommunityIcons name="clock-outline" size={18} color={active ? SgateColors.goldDeep : SgateColors.t3} style={{ marginRight: 12 }} />
                                    <Text style={[S.pickerRowText, active && S.pickerRowTextActive]}>{t.label}</Text>
                                    {active && <Feather name="check" size={16} color={SgateColors.goldDeep} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
        </ComplaintScreenLayout>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    // Header
    headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    closeBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontFamily: SgateFonts.semibold, color: SgateColors.t1, marginLeft: 12 },

    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    // Error
    errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SgateColors.redBg, borderRadius: 12, padding: 14, marginBottom: 14 },
    errorText: { fontSize: 13, fontFamily: SgateFonts.medium, color: SgateColors.red, flex: 1 },

    // Form Card
    formCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
    },

    // Fields
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 13, fontFamily: SgateFonts.semibold, color: '#666', marginBottom: 8 },
    required: { color: SgateColors.red },
    optional: { color: '#999', fontFamily: SgateFonts.regular },

    inputWrap: { backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA' },
    inputFocused: { borderColor: SgateColors.gold, backgroundColor: '#FFFFFF' },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, gap: 8 },
    textInput: { fontSize: 15, fontFamily: SgateFonts.regular, color: '#111', padding: 14 },
    textAreaWrap: {},
    textArea: { minHeight: 110, textAlignVertical: 'top' },
    charCount: { fontSize: 11, fontFamily: SgateFonts.regular, color: '#999', textAlign: 'right', marginTop: 4 },

    selectWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA', padding: 14,
    },
    selectText: { flex: 1, fontSize: 15, fontFamily: SgateFonts.medium, color: '#111' },

    // Photos
    photosRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    photoThumb: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F5F5F5' },
    photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    photoRemove: { position: 'absolute', top: 4, right: 4, zIndex: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    photoCheck: { position: 'absolute', bottom: 4, right: 4, zIndex: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: SgateColors.green, alignItems: 'center', justifyContent: 'center' },
    photoAdd: { width: 76, height: 76, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#DDD', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', gap: 4 },
    photoAddText: { fontSize: 10, fontFamily: SgateFonts.medium, color: SgateColors.t3 },

    // Section Title
    sectionTitle: { fontSize: 15, fontFamily: SgateFonts.bold, color: '#111', marginBottom: 14 },

    // Request Type
    requestRow: { flexDirection: 'row', gap: 10 },
    requestCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: '#EAEAEA', padding: 14, alignItems: 'center', gap: 6 },
    requestCardActive: { borderColor: SgateColors.gold, backgroundColor: SgateColors.goldPale },
    requestTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: SgateColors.t2 },
    requestTitleActive: { color: SgateColors.goldDeep },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: SgateColors.gold },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SgateColors.gold },
    requestDesc: { fontSize: 10, fontFamily: SgateFonts.regular, color: SgateColors.t3, textAlign: 'center', lineHeight: 14 },

    // Urgent
    urgentCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    },
    urgentTitle: { fontSize: 14, fontFamily: SgateFonts.semibold, color: '#111', marginBottom: 2 },
    urgentSub: { fontSize: 12, fontFamily: SgateFonts.regular, color: '#999' },

    // Submit
    submitBtn: { backgroundColor: SgateColors.gold, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { backgroundColor: '#E8E8E8' },
    submitBtnText: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    submitBtnTextDisabled: { color: '#999' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '70%' },
    pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16 },
    pickerTitle: { fontSize: 16, fontFamily: SgateFonts.bold, color: '#111', marginBottom: 12 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    pickerRowActive: { backgroundColor: SgateColors.goldPale, marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 0 },
    pickerRowText: { flex: 1, fontSize: 15, fontFamily: SgateFonts.medium, color: '#111' },
    pickerRowTextActive: { color: SgateColors.goldDeep, fontFamily: SgateFonts.semibold },
});
