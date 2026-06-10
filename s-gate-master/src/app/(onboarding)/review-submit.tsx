import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useReapplyOnboarding, useSubmitOnboarding } from '@/hooks/useOnboardingQueries';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import type { OnboardingRequestPayload } from '@/types/onboarding.types';

// ─── Summary Row ──────────────────────────────────────────────────────────────

function SummaryRow({
    icon,
    label,
    value,
    onEdit,
}: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
    onEdit?: () => void;
}) {
    return (
        <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
                <Feather name={icon} size={16} color={SgateColors.gold} />
            </View>
            <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
            </View>
            {onEdit && (
                <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="edit-2" size={14} color={SgateColors.t4} />
                </TouchableOpacity>
            )}
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReviewSubmitScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const selectedSociety = useOnboardingStore((s) => s.selectedSociety);
    const selectedBlock = useOnboardingStore((s) => s.selectedBlock);
    const selectedFlat = useOnboardingStore((s) => s.selectedFlat);
    const residentType = useOnboardingStore((s) => s.residentType);
    const isLivingHere = useOnboardingStore((s) => s.isLivingHere);
    const uploadedDocuments = useOnboardingStore((s) => s.uploadedDocuments);
    const flowMode = useOnboardingStore((s) => s.flowMode);
    const returnTo = useOnboardingStore((s) => s.returnTo);
    const sourceRequestId = useOnboardingStore((s) => s.sourceRequestId);
    const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

    const submitMutation = useSubmitOnboarding();
    const reapplyMutation = useReapplyOnboarding();
    const isSubmitting = submitMutation.isPending || reapplyMutation.isPending;
    const isRequestUpdate = !!sourceRequestId;

    const livingStatus = useMemo(() => {
        if (residentType === 'TENANT') return 'Tenant (Living)';
        if (isLivingHere === true) return 'Residing Owner';
        if (isLivingHere === false) return 'Non-Residing Owner';
        return '-';
    }, [residentType, isLivingHere]);

    const handleSubmit = async () => {
        if (!selectedSociety || !selectedBlock || !selectedFlat || !residentType) {
            Alert.alert('Missing Information', 'Please complete all steps before submitting.');
            return;
        }

        const payload: OnboardingRequestPayload = {
            societyId: selectedSociety.id,
            blockId: selectedBlock.id,
            flatId: selectedFlat.id,
            residentType,
            documents: uploadedDocuments.map((doc) => ({
                type: doc.type,
                s3Key: doc.s3Key,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                mimeType: doc.mimeType,
            })),
        };

        // Add isLivingHere for owners
        if (residentType === 'OWNER') {
            payload.isLivingHere = isLivingHere ?? undefined;
        }

        const onSuccess = (result: { submittedAt?: string | Date | null }) => {
            const destination = returnTo || '/(resident)/profile';
            const summary = {
                society: selectedSociety.name,
                block: selectedBlock.name,
                flat: selectedFlat.flatNumber,
                residentType,
                isLivingHere: String(residentType === 'OWNER' ? isLivingHere ?? true : true),
                submittedAt: result.submittedAt
                    ? new Date(result.submittedAt).toISOString()
                    : new Date().toISOString(),
                returnTo: destination,
            };
            resetOnboarding();
            if (flowMode === 'addMembership') {
                router.replace({
                    pathname: '/(onboarding)/add-flat-status',
                    params: summary,
                });
                return;
            }
            router.replace('/(onboarding)/approval-status');
        };

        const onError = (err: any) => {
            const msg =
                err?.response?.data?.message ||
                'Failed to submit your request. Please try again.';
            Alert.alert('Submission Failed', msg, [{ text: 'OK' }]);
        };

        if (sourceRequestId) {
            reapplyMutation.mutate({ requestId: sourceRequestId, payload }, {
                onSuccess,
                onError,
            });
            return;
        }

        submitMutation.mutate(payload, {
            onSuccess,
            onError,
        });
    };

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            <OnboardingHeader
                title="Review & Submit"
                step={7}
                stepLabel="Review"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Card */}
                <Animated.View entering={FadeInDown.delay(50).springify()}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardHeading}>Application Summary</Text>

                        <SummaryRow
                            icon="home"
                            label="Society"
                            value={selectedSociety?.name || '-'}
                            onEdit={() => router.push('/(onboarding)/society-search')}
                        />
                        <View style={styles.divider} />

                        <SummaryRow
                            icon="layers"
                            label="Block / Tower"
                            value={selectedBlock?.name || '-'}
                            onEdit={() => router.push('/(onboarding)/select-block')}
                        />
                        <View style={styles.divider} />

                        <SummaryRow
                            icon="grid"
                            label="Flat"
                            value={selectedFlat?.flatNumber || '-'}
                            onEdit={() => router.push('/(onboarding)/select-flat')}
                        />
                        <View style={styles.divider} />

                        <SummaryRow
                            icon="user"
                            label="Resident Type"
                            value={residentType || '-'}
                            onEdit={() => router.push('/(onboarding)/resident-type')}
                        />
                        <View style={styles.divider} />

                        <SummaryRow
                            icon="home"
                            label="Living Status"
                            value={livingStatus}
                        />
                    </View>
                </Animated.View>

                {/* Documents Card */}
                <Animated.View entering={FadeInDown.delay(150).springify()}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardHeading}>Uploaded Documents</Text>

                        {uploadedDocuments.length === 0 ? (
                            <Text style={styles.noDocsText}>No documents uploaded</Text>
                        ) : (
                            uploadedDocuments.map((doc, idx) => (
                                <View key={doc.type}>
                                    <View style={styles.docRow}>
                                        <View style={styles.docIconBox}>
                                            <Feather name="file" size={14} color={SgateColors.green} />
                                        </View>
                                        <View style={styles.docContent}>
                                            <Text style={styles.docType}>
                                                {doc.type.replace(/_/g, ' ')}
                                            </Text>
                                            <Text style={styles.docName} numberOfLines={1}>
                                                {doc.fileName}
                                            </Text>
                                        </View>
                                        <Feather name="check-circle" size={16} color={SgateColors.green} />
                                    </View>
                                    {idx < uploadedDocuments.length - 1 && (
                                        <View style={styles.divider} />
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </Animated.View>

                {/* Disclaimer */}
                <Animated.View entering={FadeInDown.delay(250).springify()}>
                    <View style={styles.disclaimer}>
                        <Feather name="shield" size={14} color={SgateColors.t4} />
                        <Text style={styles.disclaimerText}>
                            By submitting, you confirm that all information provided is accurate.
                            Your application will be reviewed by the society admin.
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    style={[
                        styles.submitBtn,
                        isSubmitting && styles.submitBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <>
                            <ActivityIndicator size="small" color={SgateColors.t1} />
                            <Text style={styles.submitBtnText}>
                                {isRequestUpdate ? 'Updating...' : 'Submitting...'}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Feather name="send" size={18} color={SgateColors.t1} />
                            <Text style={styles.submitBtnText}>
                                {isRequestUpdate ? 'Update Request' : 'Submit Request'}
                            </Text>
                        </>
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
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        ...SgateShadows.minimal,
    },
    cardHeading: {
        fontSize: 14,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    summaryIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: SgateColors.goldPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t3,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: SgateColors.borderSoft,
        marginVertical: 4,
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    docIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: SgateColors.greenBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docContent: {
        flex: 1,
    },
    docType: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t2,
        textTransform: 'capitalize',
        marginBottom: 1,
    },
    docName: {
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
    noDocsText: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        textAlign: 'center',
        paddingVertical: 12,
    },
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 4,
        paddingTop: 8,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 11,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t4,
        lineHeight: 16,
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
    submitBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SgateColors.gold,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
});
