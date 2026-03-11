import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { ComplaintCategory, ComplaintUrgency, createComplaint } from '../../../services/complaints';
import { uploadImage } from '../../../services/uploadService';

// UI-friendly category names
const COMPLAINT_CATEGORIES: { label: string; value: ComplaintCategory }[] = [
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Security', value: 'SECURITY' },
    { label: 'Cleanliness', value: 'CLEANLINESS' },
    { label: 'Water', value: 'WATER' },
    { label: 'Electricity', value: 'ELECTRICITY' },
    { label: 'Parking', value: 'PARKING' },
    { label: 'Noise', value: 'NOISE' },
    { label: 'Pets', value: 'PETS' },
    { label: 'Plumbing', value: 'PLUMBING' },
    { label: 'Other', value: 'OTHER' },
];

// UI-friendly urgency names
const URGENCY_LEVELS: { label: string; value: ComplaintUrgency }[] = [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' },
];

interface ImageState {
    localUri: string;
    s3Key?: string;
    uploading: boolean;
}

export default function CreateComplaintScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        category: 'MAINTENANCE' as ComplaintCategory,
        description: '',
        location: '',
        urgency: 'MEDIUM' as ComplaintUrgency,
        isPrivate: false,
    });
    const [images, setImages] = useState<ImageState[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        // Validate required fields
        if (!formData.title.trim()) {
            setError('Please enter a title');
            return;
        }

        if (!formData.description.trim()) {
            setError('Please enter a description');
            return;
        }

        setIsLoading(true);
        setError('');

        // Check if any images are still uploading
        const stillUploading = images.some(img => img.uploading);
        if (stillUploading) {
            Alert.alert('Please Wait', 'Images are still uploading...');
            return;
        }

        try {
            console.log('📝 Submitting complaint:', formData);

            // Get S3 keys from uploaded images
            const s3Keys = images.filter(img => img.s3Key).map(img => img.s3Key!);

            // Build payload
            const payload: any = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category: formData.category,
                location: formData.location.trim(),
                urgency: formData.urgency,
                isPrivate: formData.isPrivate,
                photos: s3Keys, // Send S3 keys instead of local URIs
            };

            console.log('📤 Final payload:', payload);

            const result = await createComplaint(payload);

            console.log('✅ Complaint created:', result);

            // Show success alert with ticket number
            Alert.alert(
                'Complaint Submitted',
                `Your complaint has been registered successfully.\n\nTicket Number: ${result.ticketNumber}`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (err: any) {
            console.error('❌ Failed to create complaint:', err);
            setError(err.message || 'Failed to submit complaint. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const pickImageFromCamera = async () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can add a maximum of 5 photos');
            return;
        }

        try {
            // Request camera permissions
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            
            if (!cameraPermission.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please allow camera access to take photos',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Launch camera with back camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                cameraType: ImagePicker.CameraType.back,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                
                // Add to state with uploading flag
                const newImage: ImageState = { localUri, s3Key: undefined, uploading: true };
                setImages(prev => [...prev, newImage]);

                // Upload to S3 in background
                try {
                    const s3Key = await uploadImage(localUri, { context: 'entry-photo' });
                    
                    // Update state with S3 key
                    setImages(prev => prev.map(img =>
                        img.localUri === localUri ? { ...img, s3Key, uploading: false } : img
                    ));
                } catch (uploadError) {
                    console.error('Upload failed:', uploadError);
                    Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
                    // Remove failed image from list
                    setImages(prev => prev.filter(img => img.localUri !== localUri));
                }
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        }
    };

    const pickImageFromGallery = async () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can add a maximum of 5 photos');
            return;
        }

        try {
            // Request media library permissions
            const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!galleryPermission.granted) {
                Alert.alert(
                    'Permission Required',
                    'Please allow gallery access to select photos',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Launch gallery
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const localUri = result.assets[0].uri;
                
                // Add to state with uploading flag
                const newImage: ImageState = { localUri, s3Key: undefined, uploading: true };
                setImages(prev => [...prev, newImage]);

                // Upload to S3 in background
                try {
                    const s3Key = await uploadImage(localUri, { context: 'entry-photo' });
                    
                    // Update state with S3 key
                    setImages(prev => prev.map(img =>
                        img.localUri === localUri ? { ...img, s3Key, uploading: false } : img
                    ));
                } catch (uploadError) {
                    console.error('Upload failed:', uploadError);
                    Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
                    // Remove failed image from list
                    setImages(prev => prev.filter(img => img.localUri !== localUri));
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to select image. Please try again.');
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            'Add Photo',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: pickImageFromCamera,
                },
                {
                    text: 'Choose from Gallery',
                    onPress: pickImageFromGallery,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
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

                <Card className="p-5 gap-5 mb-6">
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white"
                            placeholder="Brief title (e.g. Water Leak)"
                            placeholderTextColor="#9ca3af"
                            value={formData.title}
                            onChangeText={t => {
                                setFormData({ ...formData, title: t });
                                setError('');
                            }}
                            editable={!isLoading}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {COMPLAINT_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.value}
                                    onPress={() => setFormData({ ...formData, category: cat.value })}
                                    disabled={isLoading}
                                    className={`px-3 py-2 rounded-lg border ${
                                        formData.category === cat.value 
                                            ? 'bg-indigo-600 border-indigo-600' 
                                            : 'border-gray-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <Text className={`text-xs font-semibold ${
                                        formData.category === cat.value ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Urgency *</Text>
                        <View className="flex-row gap-2">
                            {URGENCY_LEVELS.map(level => (
                                <TouchableOpacity
                                    key={level.value}
                                    onPress={() => setFormData({ ...formData, urgency: level.value })}
                                    disabled={isLoading}
                                    className={`flex-1 py-2 rounded-lg border items-center ${
                                        formData.urgency === level.value
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800'
                                            : 'border-gray-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <Text className={`text-xs font-semibold ${
                                        formData.urgency === level.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {level.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white h-32 text-start"
                            placeholder="Describe the issue in detail..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            textAlignVertical="top"
                            value={formData.description}
                            onChangeText={t => {
                                setFormData({ ...formData, description: t });
                                setError('');
                            }}
                            editable={!isLoading}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white"
                            placeholder="e.g., Kitchen, Parking Lot B, Flat 204"
                            placeholderTextColor="#9ca3af"
                            value={formData.location}
                            onChangeText={t => {
                                setFormData({ ...formData, location: t });
                                setError('');
                            }}
                            editable={!isLoading}
                        />
                    </View>

                    <View className="flex-row items-center justify-between py-2">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Private Complaint</Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only management can see this</Text>
                        </View>
                        <Switch
                            value={formData.isPrivate}
                            onValueChange={value => setFormData({ ...formData, isPrivate: value })}
                            disabled={isLoading}
                            trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                            thumbColor={formData.isPrivate ? '#4f46e5' : '#f4f4f5'}
                        />
                    </View>

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
                                    <Image 
                                        source={{ uri: img.localUri }} 
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                        transition={200}
                                    />
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
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Tap to take a photo or choose from gallery
                        </Text>
                    </View>
                </Card>

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
        </SafeAreaView>
    );
}
