import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

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
                        <Feather name="check" size={14} color="#16a34a" />
                    </View>
                )}
            </View>

            {/* Content */}
            {isUploaded && fileName ? (
                <View style={styles.uploadedRow}>
                    <View style={styles.fileInfo}>
                        <View style={styles.fileIconBox}>
                            <Feather name="file" size={16} color={SgateColors.green} />
                        </View>
                        <Text style={styles.fileName} numberOfLines={1}>
                            {fileName}
                        </Text>
                    </View>
                    <View style={styles.uploadedActions}>
                        <TouchableOpacity onPress={onPick} disabled={isUploading}>
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        padding: 16,
        marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
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
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    requiredText: {
        fontSize: 9,
        fontFamily: SgateFonts.bold,
        color: SgateColors.red,
        letterSpacing: 0.5,
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadArea: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: SgateColors.border,
        borderRadius: 14,
        paddingVertical: 28,
        alignItems: 'center',
        backgroundColor: SgateColors.bg,
    },
    uploadContent: {
        alignItems: 'center',
    },
    uploadIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SgateColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
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
        backgroundColor: SgateColors.greenBg,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    fileIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileName: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: '#166534',
        flex: 1,
    },
    uploadedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    replaceText: {
        fontSize: 13,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
    },
    removeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SgateColors.redBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
