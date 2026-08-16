import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';

interface DocumentUploadCardProps {
    label: string;
    required: boolean;
    isUploaded: boolean;
    isUploading: boolean;
    fileName?: string;
    onPick: () => void;
    onRemove?: () => void;
}

export const DocumentUploadCard = memo(function DocumentUploadCard({
    label,
    required,
    isUploaded,
    isUploading,
    fileName,
    onPick,
    onRemove,
}: DocumentUploadCardProps) {
    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {required && (
                        <View style={styles.requiredBadge}>
                            <Text style={styles.requiredText}>REQUIRED</Text>
                        </View>
                    )}
                </View>
                {isUploaded && (
                    <View style={styles.checkCircle}>
                        <Feather name="check" size={14} color="#00A36C" />
                    </View>
                )}
            </View>

            {/* Content */}
            {isUploaded && fileName ? (
                <View style={styles.uploadedRow}>
                    <View style={styles.fileInfo}>
                        <View style={styles.fileIconBox}>
                            <Feather name="file" size={16} color="#00A36C" />
                        </View>
                        <Text style={styles.fileName} numberOfLines={1}>
                            {fileName}
                        </Text>
                    </View>
                    <View style={styles.uploadedActions}>
                        <TouchableOpacity style={styles.replaceBtn} onPress={onPick} disabled={isUploading}>
                            <Text style={styles.replaceText}>Replace</Text>
                        </TouchableOpacity>
                        {onRemove && (
                            <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
                                <Feather name="x" size={16} color={SgateColors.red} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={onPick}
                    disabled={isUploading}
                    style={styles.uploadArea}
                    activeOpacity={0.7}
                >
                    {isUploading ? (
                        <View style={styles.uploadingContent}>
                            <ActivityIndicator size="small" color={SgateColors.gold} />
                            <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                    ) : (
                        <View style={styles.uploadContent}>
                            <View style={styles.uploadIconBox}>
                                <Feather name="upload-cloud" size={24} color={SgateColors.t4} />
                            </View>
                            <Text style={styles.uploadLabel}>Tap to upload</Text>
                            <Text style={styles.uploadHint}>PDF, JPG, or PNG · Max 10 MB</Text>
                        </View>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 18,
        marginBottom: 16,
        ...SgateShadows.minimal,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    label: {
        fontSize: 15,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    requiredBadge: {
        backgroundColor: 'rgba(255, 92, 92, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 92, 92, 0.15)',
    },
    requiredText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 214, 143, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadArea: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#C0BEB9',
        borderRadius: 14,
        paddingVertical: 32,
        alignItems: 'center',
        backgroundColor: '#FCFAF7',
    },
    uploadContent: {
        alignItems: 'center',
    },
    uploadIconBox: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadLabel: {
        fontSize: 14,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t2,
        marginBottom: 4,
    },
    uploadHint: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
    },
    uploadingContent: {
        alignItems: 'center',
        gap: 8,
    },
    uploadingText: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
    },
    uploadedRow: {
        backgroundColor: '#F6FCFA',
        borderWidth: 1.5,
        borderColor: 'rgba(0, 214, 143, 0.16)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        paddingRight: 6,
    },
    fileIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 214, 143, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileName: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: '#0F2C1F',
        flex: 1,
    },
    uploadedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    replaceBtn: {
        borderWidth: 1,
        borderColor: SgateColors.goldDeep,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: '#E5A500',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    replaceText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
    removeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
