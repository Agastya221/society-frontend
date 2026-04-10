import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { ComplaintCategory, ComplaintUrgency, createComplaint } from '../../../services/complaints';
import { uploadImage } from '../../../services/uploadService';
import { AppAlert } from '../../../components/ui/AppAlert';

const SgateColors = {
    black: '#0D0F14', gold: '#FFB800', goldDeep: '#E5A500', goldPale: '#FFF8E1',
    green: '#00D68F', greenBg: '#E5FBF3', red: '#FF5C5C', redBg: '#FFF0F0',
    bg: '#F5F4F0', card: '#FFFFFF', surface: '#EEECEA', border: '#E5E3DE',
    borderSoft: '#F0EEEB', t1: '#0D0F14', t2: '#4A4D57', t3: '#8A8D97', t4: '#B5B8C0',
};
const SgateFonts = {
    regular: 'Sora-Regular', medium: 'Sora-Medium', semiBold: 'Sora-SemiBold',
    bold: 'Sora-Bold', extraBold: 'Sora-ExtraBold',
};

const COMPLAINT_CATEGORIES: { label: string; value: ComplaintCategory }[] = [
    { label: 'Plumbing', value: 'PLUMBING' },
    { label: 'Electrical', value: 'ELECTRICITY' },
    { label: 'Civil', value: 'MAINTENANCE' },
    { label: 'Carpentry', value: 'MAINTENANCE' },
    { label: 'Painting', value: 'MAINTENANCE' },
    { label: 'Housekeeping', value: 'CLEANLINESS' },
    { label: 'Security', value: 'SECURITY' },
    { label: 'Lift', value: 'MAINTENANCE' },
    { label: 'Water', value: 'WATER' },
    { label: 'Other', value: 'OTHER' },
];

const PREFERRED_TIMES = [
    { label: 'Morning (9AM–12PM)', value: 'MORNING' },
    { label: 'Afternoon (12PM–4PM)', value: 'AFTERNOON' },
    { label: 'Evening (4PM–7PM)', value: 'EVENING' },
    { label: 'Anytime', value: 'ANYTIME' },
];

type RequestType = 'unit' | 'community';

interface ImageState {
    localUri: string;
    s3Key?: string;
    uploading: boolean;
}

export default function CreateComplaintScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        category: 'PLUMBING' as ComplaintCategory,
        categoryLabel: 'Plumbing',
        description: '',
        location: '',
        urgency: 'MEDIUM' as ComplaintUrgency,
        isPrivate: false,
    });
    const [images, setImages] = useState<ImageState[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // New enhanced state
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [requestType, setRequestType] = useState<RequestType>('unit');
    const [preferredTime, setPreferredTime] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);

    const handleSubmit = async () => {
        if (!formData.title.trim()) { setError('Please enter a title'); return; }
        if (!formData.description.trim()) { setError('Please enter a description'); return; }

        setIsLoading(true);
        setError('');

        const stillUploading = images.some(img => img.uploading);
        if (stillUploading) {
            AppAlert.show('Please Wait', 'Images are still uploading...');
            setIsLoading(false);
            return;
        }

        try {
            const s3Keys = images.filter(img => img.s3Key).map(img => img.s3Key!);
            const payload: any = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                location: formData.location.trim(),
                urgency: isUrgent ? 'CRITICAL' : formData.urgency,
                isPrivate: requestType === 'unit',
                photos: s3Keys,
                preferredTime: preferredTime || 'ANYTIME',
            };

            const result = await createComplaint(payload);
            AppAlert.show(
                'Complaint Submitted',
                `Your complaint has been registered successfully.\n\nTicket Number: ${result.ticketNumber}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err: any) {
            setError(err.message || 'Failed to submit complaint. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const pickImageFromCamera = async () => {
        if (images.length >= 5) { AppAlert.show('Limit Reached', 'You can add a maximum of 5 photos'); return; }
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) { AppAlert.show('Permission Required', 'Please allow camera access'); return; }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8,
                cameraType: ImagePicker.CameraType.back,
            });
            if (!result.canceled && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                const newImage: ImageState = { localUri, uploading: true };
                setImages(prev => [...prev, newImage]);
                try {
                    const s3Key = await uploadImage(localUri, { context: 'entry-photo' });
                    setImages(prev => prev.map(img => img.localUri === localUri ? { ...img, s3Key, uploading: false } : img));
                } catch {
                    setImages(prev => prev.filter(img => img.localUri !== localUri));
                    AppAlert.show('Upload Failed', 'Failed to upload image.');
                }
            }
        } catch { AppAlert.show('Error', 'Failed to take photo.'); }
    };

    const pickImageFromGallery = async () => {
        if (images.length >= 5) { AppAlert.show('Limit Reached', 'You can add a maximum of 5 photos'); return; }
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) { AppAlert.show('Permission Required', 'Please allow gallery access'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8,
            });
            if (!result.canceled && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                const newImage: ImageState = { localUri, uploading: true };
                setImages(prev => [...prev, newImage]);
                try {
                    const s3Key = await uploadImage(localUri, { context: 'entry-photo' });
                    setImages(prev => prev.map(img => img.localUri === localUri ? { ...img, s3Key, uploading: false } : img));
                } catch {
                    setImages(prev => prev.filter(img => img.localUri !== localUri));
                    AppAlert.show('Upload Failed', 'Failed to upload image.');
                }
            }
        } catch { AppAlert.show('Error', 'Failed to select image.'); }
    };

    const showImagePickerOptions = () => {
        AppAlert.show('Add Photo', 'Choose an option', [
            { text: 'Take Photo', onPress: pickImageFromCamera },
            { text: 'Choose from Gallery', onPress: pickImageFromGallery },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

    const selectedTimeLabel = PREFERRED_TIMES.find(t => t.value === preferredTime)?.label ?? 'Select preferred time';

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800"
                    disabled={isLoading}
                >
                    <Ionicons name="close" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Raise Complaint</Text>
            </View>

            <ScrollView className="flex-1 p-5">
                {error ? (
                    <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                        <Text className="text-red-600 dark:text-red-400 text-sm">{error}</Text>
                    </View>
                ) : null}

                <Card className="p-5 gap-5 mb-4">
                    {/* Title */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white"
                            placeholder="Brief title (e.g. Water Leak)"
                            placeholderTextColor="#9ca3af"
                            value={formData.title}
                            onChangeText={t => { setFormData({ ...formData, title: t }); setError(''); }}
                            editable={!isLoading}
                        />
                    </View>

                    {/* Category Dropdown */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</Text>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => setShowCategoryPicker(true)}
                            disabled={isLoading}
                        >
                            <Text style={styles.dropdownText}>{formData.categoryLabel}</Text>
                            <Feather name="chevron-down" size={18} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    {/* Description with counter */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white h-32 text-start"
                            placeholder="Describe the issue in detail..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            textAlignVertical="top"
                            maxLength={3000}
                            value={formData.description}
                            onChangeText={t => { setFormData({ ...formData, description: t }); setError(''); }}
                            editable={!isLoading}
                        />
                        <Text style={styles.charCounter}>{formData.description.length} / 3000</Text>
                    </View>

                    {/* Location */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white"
                            placeholder="e.g., Kitchen, Parking Lot B, Flat 204"
                            placeholderTextColor="#9ca3af"
                            value={formData.location}
                            onChangeText={t => setFormData({ ...formData, location: t })}
                            editable={!isLoading}
                        />
                    </View>

                    {/* Preferred Time */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preferred Time</Text>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => setShowTimePicker(true)}
                            disabled={isLoading}
                        >
                            <Feather name="clock" size={16} color={SgateColors.t3} style={{ marginRight: 4 }} />
                            <Text style={[styles.dropdownText, !preferredTime && { color: SgateColors.t4 }]}>
                                {selectedTimeLabel}
                            </Text>
                            <Feather name="chevron-down" size={18} color={SgateColors.t3} />
                        </TouchableOpacity>
                    </View>

                    {/* Photos */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photos (Optional, Max 5)</Text>
                        <View className="flex-row gap-3 flex-wrap">
                            {images.map((img, index) => (
                                <View key={index} className="h-20 w-20 rounded-xl bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
                                    {img.uploading && (
                                        <View className="absolute inset-0 bg-black/50 items-center justify-center z-20">
                                            <ActivityIndicator size="small" color="white" />
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        onPress={() => removeImage(index)}
                                        disabled={isLoading || img.uploading}
                                        className="absolute top-1 right-1 z-10 bg-red-500 rounded-full h-5 w-5 items-center justify-center"
                                    >
                                        <Ionicons name="close" size={14} color="white" />
                                    </TouchableOpacity>
                                    {img.s3Key && (
                                        <View className="absolute bottom-1 right-1 z-10 bg-green-500 rounded-full h-4 w-4 items-center justify-center">
                                            <Ionicons name="checkmark" size={10} color="white" />
                                        </View>
                                    )}
                                    <Image source={{ uri: img.localUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                                </View>
                            ))}
                            {images.length < 5 && (
                                <TouchableOpacity
                                    onPress={showImagePickerOptions}
                                    disabled={isLoading}
                                    className="h-20 w-20 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl items-center justify-center bg-gray-50 dark:bg-zinc-800/50"
                                >
                                    <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                                    <Text className="text-[10px] text-gray-400 mt-1">Add Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Card>

                {/* Request Type Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionLabel}>Request Type</Text>
                    <View style={styles.requestTypeRow}>
                        <TouchableOpacity
                            style={[styles.requestTypeCard, requestType === 'unit' && styles.requestTypeCardActive]}
                            onPress={() => setRequestType('unit')}
                        >
                            <Feather name="home" size={20} color={requestType === 'unit' ? SgateColors.goldDeep : SgateColors.t3} />
                            <Text style={[styles.requestTypeTitle, requestType === 'unit' && styles.requestTypeTitleActive]}>Unit</Text>
                            <View style={styles.radioRow}>
                                <View style={[styles.radio, requestType === 'unit' && styles.radioActive]}>
                                    {requestType === 'unit' && <View style={styles.radioDot} />}
                                </View>
                            </View>
                            <Text style={styles.requestTypeDesc}>For issues regarding the concerned flat. Visible only to unit members.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.requestTypeCard, requestType === 'community' && styles.requestTypeCardActive]}
                            onPress={() => setRequestType('community')}
                        >
                            <Feather name="grid" size={20} color={requestType === 'community' ? SgateColors.goldDeep : SgateColors.t3} />
                            <Text style={[styles.requestTypeTitle, requestType === 'community' && styles.requestTypeTitleActive]}>Community</Text>
                            <View style={styles.radioRow}>
                                <View style={[styles.radio, requestType === 'community' && styles.radioActive]}>
                                    {requestType === 'community' && <View style={styles.radioDot} />}
                                </View>
                            </View>
                            <Text style={styles.requestTypeDesc}>Visible to the entire society. For common area issues.</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Mark as Urgent */}
                <View style={styles.urgentCard}>
                    <View style={styles.urgentContent}>
                        <Text style={styles.urgentTitle}>Mark as Urgent?</Text>
                        <Text style={styles.urgentSubtitle}>For critical issues that require immediate attention.</Text>
                    </View>
                    <Switch
                        value={isUrgent}
                        onValueChange={setIsUrgent}
                        disabled={isLoading}
                        trackColor={{ false: '#d1d5db', true: SgateColors.goldPale }}
                        thumbColor={isUrgent ? SgateColors.gold : '#f4f4f5'}
                    />
                </View>

                <PrimaryButton
                    title={isLoading ? 'Submitting...' : 'Submit Complaint'}
                    onPress={handleSubmit}
                    disabled={!formData.title.trim() || !formData.description.trim() || isLoading}
                />

                {isLoading && (
                    <View className="items-center mt-4">
                        <ActivityIndicator size="small" color="#4f46e5" />
                    </View>
                )}
                <View className="h-10" />
            </ScrollView>

            {/* Category Picker Modal */}
            <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
                    <View style={styles.pickerSheet}>
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>Choose Category</Text>
                        <FlatList
                            data={COMPLAINT_CATEGORIES}
                            keyExtractor={item => item.value + item.label}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.pickerRow, formData.categoryLabel === item.label && styles.pickerRowActive]}
                                    onPress={() => {
                                        setFormData({ ...formData, category: item.value, categoryLabel: item.label });
                                        setShowCategoryPicker(false);
                                    }}
                                >
                                    <Text style={[styles.pickerRowText, formData.categoryLabel === item.label && styles.pickerRowTextActive]}>
                                        {item.label}
                                    </Text>
                                    {formData.categoryLabel === item.label && (
                                        <Feather name="check" size={16} color={SgateColors.goldDeep} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Time Picker Modal */}
            <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
                    <View style={styles.pickerSheet}>
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>Preferred Time</Text>
                        {PREFERRED_TIMES.map(t => (
                            <TouchableOpacity
                                key={t.value}
                                style={[styles.pickerRow, preferredTime === t.value && styles.pickerRowActive]}
                                onPress={() => { setPreferredTime(t.value); setShowTimePicker(false); }}
                            >
                                <Text style={[styles.pickerRowText, preferredTime === t.value && styles.pickerRowTextActive]}>
                                    {t.label}
                                </Text>
                                {preferredTime === t.value && <Feather name="check" size={16} color={SgateColors.goldDeep} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    charCounter: {
        fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t4,
        textAlign: 'right', marginTop: 4,
    },
    dropdown: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
        borderRadius: 12, padding: 12, gap: 4,
    },
    dropdownText: {
        flex: 1, fontSize: 14, fontFamily: SgateFonts.medium, color: SgateColors.t1,
    },
    sectionCard: {
        backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1,
        borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 14, fontFamily: SgateFonts.semiBold, color: SgateColors.t2, marginBottom: 12,
    },
    requestTypeRow: { flexDirection: 'row', gap: 10 },
    requestTypeCard: {
        flex: 1, borderRadius: 14, borderWidth: 2, borderColor: SgateColors.border,
        padding: 14, alignItems: 'center', gap: 6,
    },
    requestTypeCardActive: { borderColor: SgateColors.gold, backgroundColor: SgateColors.goldPale },
    requestTypeTitle: {
        fontSize: 14, fontFamily: SgateFonts.semiBold, color: SgateColors.t2,
    },
    requestTypeTitleActive: { color: SgateColors.goldDeep },
    radioRow: { flexDirection: 'row', justifyContent: 'center' },
    radio: {
        width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: SgateColors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: SgateColors.gold },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SgateColors.gold },
    requestTypeDesc: {
        fontSize: 10, fontFamily: SgateFonts.regular, color: SgateColors.t3,
        textAlign: 'center', lineHeight: 14,
    },
    urgentCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: SgateColors.card, borderRadius: 16, borderWidth: 1,
        borderColor: SgateColors.borderSoft, padding: 16, marginBottom: 16, gap: 12,
    },
    urgentContent: { flex: 1 },
    urgentTitle: { fontSize: 14, fontFamily: SgateFonts.semiBold, color: SgateColors.t1, marginBottom: 2 },
    urgentSubtitle: { fontSize: 12, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    },
    pickerSheet: {
        backgroundColor: SgateColors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: 40, maxHeight: '70%',
    },
    pickerHandle: {
        width: 36, height: 4, borderRadius: 2, backgroundColor: SgateColors.border,
        alignSelf: 'center', marginBottom: 16,
    },
    pickerTitle: {
        fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1, marginBottom: 12,
    },
    pickerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: SgateColors.borderSoft,
    },
    pickerRowActive: { backgroundColor: SgateColors.goldPale, marginHorizontal: -20, paddingHorizontal: 20 },
    pickerRowText: { fontSize: 15, fontFamily: SgateFonts.medium, color: SgateColors.t1 },
    pickerRowTextActive: { color: SgateColors.goldDeep, fontFamily: SgateFonts.semiBold },
});
