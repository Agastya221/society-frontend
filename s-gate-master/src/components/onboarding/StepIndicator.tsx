import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps?: number;
    label?: string;
}

export function StepIndicator({ currentStep, totalSteps = 8, label }: StepIndicatorProps) {
    const progress = currentStep / totalSteps;

    return (
        <View style={styles.container}>
            {/* Segmented progress bar */}
            <View style={styles.barTrack}>
                {Array.from({ length: totalSteps }).map((_, i) => {
                    const step = i + 1;
                    const isCompleted = step < currentStep;
                    const isActive = step === currentStep;

                    return (
                        <View
                            key={step}
                            style={[
                                styles.segment,
                                i < totalSteps - 1 && styles.segmentGap,
                            ]}
                        >
                            <View
                                style={[
                                    styles.segmentFill,
                                    isCompleted && styles.segmentCompleted,
                                    isActive && styles.segmentActive,
                                ]}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Step label */}
            {label && (
                <View style={styles.labelRow}>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{currentStep}</Text>
                    </View>
                    <Text style={styles.label}>
                        {label}
                    </Text>
                    <Text style={styles.labelFraction}>
                        {currentStep}/{totalSteps}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 12,
        paddingBottom: 4,
        paddingHorizontal: 4,
    },
    barTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 4,
        borderRadius: 2,
    },
    segment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.surface,
        overflow: 'hidden',
    },
    segmentGap: {
        marginRight: 3,
    },
    segmentFill: {
        flex: 1,
        borderRadius: 2,
        backgroundColor: 'transparent',
    },
    segmentCompleted: {
        backgroundColor: SgateColors.gold,
    },
    segmentActive: {
        backgroundColor: SgateColors.gold,
        opacity: 0.55,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 8,
    },
    stepBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBadgeText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
        lineHeight: 13,
    },
    label: {
        flex: 1,
        fontSize: 12,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t2,
    },
    labelFraction: {
        fontSize: 11,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t4,
    },
});
