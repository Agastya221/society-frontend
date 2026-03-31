import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { uploadImage } from '@/services/uploadService';

interface DocumentConfig {
    type: string;
    label: string;
    required: boolean;
}

interface UploadedDoc {
    type: string;
    s3Key: string;
    fileName: string;
}

const OWNER_DOCS: DocumentConfig[] = [
    { type: 'OWNERSHIP_PROOF', label: 'Ownership Proof', required: true },
    { type: 'AADHAR_CARD', label: 'Aadhaar Card', required: true },
];

const TENANT_DOCS: DocumentConfig[] = [
    { type: 'TENANT_AGREEMENT', label: 'Tenant Agreement', required: true },
    { type: 'AADHAR_CARD', label: 'Aadhaar Card', required: true },
];

export default function DocumentsScreen() {
    const router = useRouter();
    const { societyId, blockId, flatId, residentType, societyName } = useLocalSearchParams<{
        societyId: string;
        blockId: string;
        flatId: string;
        residentType: string;
        societyName: string;
    }>();

    const docs = residentType === 'OWNER' ? OWNER_DOCS : TENANT_DOCS;
    const [uploads, setUploads] = useState<Record<string, UploadedDoc>>({});
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [submitting, setSubmitting] = useState(false);

    const allRequiredUploaded = docs
        .filter((d) => d.required)
        .every((d) => uploads[d.type]);

    const handlePickDocument = async (docType: string) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            setUploading((prev) => ({ ...prev, [docType]: true }));

            try {
                const s3Key = await uploadImage(asset.uri, {
                    context: 'onboarding',
                    documentType: docType,
                });

                const fileName = asset.uri.split('/').pop() || 'document';
                setUploads((prev) => ({
                    ...prev,
                    [docType]: { type: docType, s3Key, fileName },
                }));
            } catch (err) {
                console.error('Upload failed:', err);
                Alert.alert('Upload Failed', 'Could not upload the document. Please try again.');
            } finally {
                setUploading((prev) => ({ ...prev, [docType]: false }));
            }
        } catch (err) {
            console.error('Image picker error:', err);
        }
    };

    const handleSubmit = async () => {
        if (!allRequiredUploaded) return;
        setSubmitting(true);
        try {
            const documents = Object.values(uploads).map((doc) => ({
                type: doc.type,
                s3Key: doc.s3Key,
            }));

            await api.post('/resident/onboarding/request', {
                societyId,
                blockId,
                flatId,
                residentType,
                documents,
            });

            router.replace('/(onboarding)/status');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to submit request. Please try again.';
            Alert.alert('Submission Failed', msg, [{ text: 'OK' }]);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-xl">Upload Documents</Text>
                        <Text className="text-gray-400 text-xs mt-0.5">{societyName}</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Info Banner */}
                <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5 flex-row items-start gap-3">
                    <Feather name="info" size={18} color="#4f46e5" />
                    <Text className="text-indigo-700 text-sm flex-1 leading-5">
                        Upload clear photos or scans of your documents. These will be reviewed by your society admin.
                    </Text>
                </View>

                {/* Resident Type Badge */}
                <View className="flex-row items-center gap-2 mb-5">
                    <View className="bg-indigo-100 px-3 py-1.5 rounded-full">
                        <Text className="text-indigo-700 text-xs font-bold">
                            {residentType === 'OWNER' ? 'Owner' : 'Tenant'}
                        </Text>
                    </View>
                </View>

                {/* Document Cards */}
                {docs.map((doc) => {
                    const uploaded = uploads[doc.type];
                    const isUploading = uploading[doc.type];

                    return (
                        <View key={doc.type} className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden shadow-sm">
                            <View className="p-4">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center gap-2">
                                        <Text className="text-gray-900 font-semibold text-base">{doc.label}</Text>
                                        {doc.required && (
                                            <View className="bg-red-100 px-2 py-0.5 rounded-full">
                                                <Text className="text-red-600 text-[10px] font-bold">REQUIRED</Text>
                                            </View>
                                        )}
                                    </View>
                                    {uploaded && (
                                        <View className="w-7 h-7 bg-green-100 rounded-full items-center justify-center">
                                            <Feather name="check" size={16} color="#16a34a" />
                                        </View>
                                    )}
                                </View>

                                {uploaded ? (
                                    <View className="bg-green-50 border border-green-100 rounded-xl p-3 flex-row items-center gap-3">
                                        <Feather name="file" size={18} color="#16a34a" />
                                        <Text className="text-green-700 text-sm flex-1" numberOfLines={1}>
                                            {uploaded.fileName}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handlePickDocument(doc.type)}
                                            disabled={isUploading}
                                        >
                                            <Text className="text-indigo-600 text-sm font-semibold">Replace</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => handlePickDocument(doc.type)}
                                        disabled={isUploading}
                                        className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 items-center"
                                        activeOpacity={0.7}
                                    >
                                        {isUploading ? (
                                            <View className="items-center">
                                                <ActivityIndicator size="small" color="#4f46e5" />
                                                <Text className="text-gray-400 text-sm mt-2">Uploading...</Text>
                                            </View>
                                        ) : (
                                            <View className="items-center">
                                                <Feather name="upload-cloud" size={28} color="#9ca3af" />
                                                <Text className="text-gray-500 text-sm font-medium mt-2">
                                                    Tap to upload
                                                </Text>
                                                <Text className="text-gray-400 text-xs mt-1">JPG, PNG or PDF</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Submit Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 pb-8">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!allRequiredUploaded || submitting}
                    className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${
                        allRequiredUploaded && !submitting ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text className="text-white font-bold text-base">Submitting...</Text>
                        </>
                    ) : (
                        <>
                            <Feather name="send" size={18} color={allRequiredUploaded ? '#fff' : '#9ca3af'} />
                            <Text className={`font-bold text-base ${
                                allRequiredUploaded ? 'text-white' : 'text-gray-400'
                            }`}>
                                Submit Request
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
