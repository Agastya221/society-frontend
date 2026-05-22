import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { DocumentUploadCard } from '@/components/onboarding/DocumentUploadCard';
import { uploadImage } from '@/services/uploadService';
import { AppAlert } from '@/components/ui/AppAlert';
import type { DocumentType, UploadedDocument } from '@/types/onboarding.types';

// ─── Document Config ──────────────────────────────────────────────────────────

interface DocConfig {
    type: DocumentType;
    label: string;
    required: boolean;
}

const OWNER_DOCS: DocConfig[] = [
    { type: 'OWNERSHIP_PROOF', label: 'Ownership Proof', required: true },
];

const TENANT_DOCS: DocConfig[] = [
    { type: 'TENANT_AGREEMENT', label: 'Tenant Agreement', required: true },
];

const ID_OPTIONS: { type: DocumentType; label: string }[] = [
    { type: 'AADHAR_CARD', label: 'Aadhaar Card' },
    { type: 'PAN_CARD', label: 'PAN Card' },
    { type: 'PASSPORT', label: 'Passport' },
    { type: 'DRIVING_LICENSE', label: 'Driving License' },
    { type: 'VOTER_ID', label: 'Voter ID' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DocumentUploadScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const residentType = useOnboardingStore((s) => s.residentType);
    const uploadedDocuments = useOnboardingStore((s) => s.uploadedDocuments);
    const addDocument = useOnboardingStore((s) => s.addDocument);
    const removeDocument = useOnboardingStore((s) => s.removeDocument);

    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [selectedIdType, setSelectedIdType] = useState<DocumentType | null>(
        // Check if an ID doc was already uploaded
        uploadedDocuments.find((d) =>
            ID_OPTIONS.some((id) => id.type === d.type)
        )?.type as DocumentType | null ?? null
    );

    const primaryDocs = residentType === 'OWNER' ? OWNER_DOCS : TENANT_DOCS;

    // Check if all required docs are uploaded
    const hasPrimaryDoc = primaryDocs.every((d) =>
        uploadedDocuments.some((u) => u.type === d.type)
    );
    const hasIdProof = uploadedDocuments.some((u) =>
        ID_OPTIONS.some((id) => id.type === u.type)
    );
    const canContinue = hasPrimaryDoc && hasIdProof;

    const handlePickDocument = useCallback(
        async (docType: DocumentType) => {
            try {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'image/jpeg', 'image/png'],
                    copyToCacheDirectory: true,
                });

                if (result.canceled || !result.assets?.[0]) return;

                const asset = result.assets[0];

                // Validate file size (10MB max)
                if (asset.size && asset.size > 10 * 1024 * 1024) {
                    AppAlert.show('File Too Large', 'Maximum file size is 10 MB.');
                    return;
                }

                setUploading((prev) => ({ ...prev, [docType]: true }));

                try {
                    const s3Key = await uploadImage(asset.uri, {
                        context: 'onboarding',
                        documentType: docType,
                    });

                    const doc: UploadedDocument = {
                        type: docType,
                        s3Key,
                        fileName: asset.name || 'document',
                        fileSize: asset.size || 0,
                        mimeType: asset.mimeType || 'application/octet-stream',
                    };

                    addDocument(doc);
                } catch (err) {
                    console.error('Upload failed:', err);
                    AppAlert.show(
                        'Upload Failed',
                        'Could not upload the document. Please try again.'
                    );
                } finally {
                    setUploading((prev) => ({ ...prev, [docType]: false }));
                }
            } catch (err) {
                console.error('Document picker error:', err);
            }
        },
        [addDocument]
    );

    const handleContinue = () => {
        if (!canContinue) return;
        router.push('/(onboarding)/review-submit');
    };

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <OnboardingHeader
                title="Upload Documents"
                subtitle={residentType === 'OWNER' ? 'Owner documents' : 'Tenant documents'}
                step={6}
                stepLabel="Documents"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                    <View style={styles.infoBanner}>
                        <Feather name="info" size={16} color={SgateColors.gold} />
                        <Text style={styles.infoText}>
                            Upload clear photos or scans. These will be reviewed by your society admin.
                        </Text>
                    </View>
                </Animated.View>

                {/* Primary Documents */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <Text style={styles.sectionLabel}>
                        {residentType === 'OWNER' ? 'OWNERSHIP PROOF' : 'TENANCY PROOF'}
                    </Text>
                    {primaryDocs.map((doc) => (
                        <DocumentUploadCard
                            key={doc.type}
                            label={doc.label}
                            required={doc.required}
                            isUploaded={uploadedDocuments.some(
                                (u) => u.type === doc.type
                            )}
                            isUploading={uploading[doc.type] || false}
                            fileName={
                                uploadedDocuments.find((u) => u.type === doc.type)
                                    ?.fileName
                            }
                            onPick={() => handlePickDocument(doc.type)}
                            onRemove={() => removeDocument(doc.type)}
                        />
                    ))}
                </Animated.View>

                {/* ID Proof Selection */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Text style={styles.sectionLabel}>ID PROOF (choose one)</Text>

                    {/* ID Type Selector */}
                    <View style={styles.idTypeRow}>
                        {ID_OPTIONS.map((id) => (
                            <TouchableOpacity
                                key={id.type}
                                onPress={() => {
                                    // Remove previously selected ID doc if changing type
                                    if (selectedIdType && selectedIdType !== id.type) {
                                        removeDocument(selectedIdType);
                                    }
                                    setSelectedIdType(id.type);
                                }}
                                style={[
                                    styles.idChip,
                                    selectedIdType === id.type && styles.idChipActive,
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.idChipText,
                                        selectedIdType === id.type && styles.idChipTextActive,
                                    ]}
                                >
                                    {id.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Upload selected ID type */}
                    {selectedIdType && (
                        <DocumentUploadCard
                            label={
                                ID_OPTIONS.find((id) => id.type === selectedIdType)
                                    ?.label || 'ID Proof'
                            }
                            required={true}
                            isUploaded={uploadedDocuments.some(
                                (u) => u.type === selectedIdType
                            )}
                            isUploading={uploading[selectedIdType] || false}
                            fileName={
                                uploadedDocuments.find(
                                    (u) => u.type === selectedIdType
                                )?.fileName
                            }
                            onPick={() => handlePickDocument(selectedIdType)}
                            onRemove={() => removeDocument(selectedIdType)}
                        />
                    )}
                </Animated.View>
            </ScrollView>

            {/* Continue Button */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!canContinue}
                    style={[styles.continueBtn, canContinue && styles.continueBtnActive]}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.continueBtnText,
                            canContinue && styles.continueBtnTextActive,
                        ]}
                    >
                        Review & Submit
                    </Text>
                    {canContinue && (
                        <Feather name="arrow-right" size={18} color={SgateColors.t1} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: SgateColors.bg,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 120,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: SgateColors.goldPale,
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FDEAB0',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
        lineHeight: 18,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t3,
        letterSpacing: 0.8,
        marginBottom: 12,
        marginTop: 8,
    },
    idTypeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    idChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: SgateColors.border,
        backgroundColor: '#FFFFFF',
    },
    idChipActive: {
        borderColor: SgateColors.gold,
        backgroundColor: SgateColors.goldPale,
    },
    idChipText: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    idChipTextActive: {
        color: SgateColors.t1,
        fontFamily: SgateFonts.bold,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    continueBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SgateColors.surface,
    },
    continueBtnActive: {
        backgroundColor: SgateColors.gold,
    },
    continueBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t4,
    },
    continueBtnTextActive: {
        color: SgateColors.t1,
    },
});
