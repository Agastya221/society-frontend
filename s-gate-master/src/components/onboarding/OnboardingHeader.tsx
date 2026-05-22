import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateColors, SgateFonts, SgateShadows } from '@/constants/Sgate-theme';
import { StepIndicator } from './StepIndicator';

interface OnboardingHeaderProps {
    title: string;
    subtitle?: string;
    step?: number;
    stepLabel?: string;
    showBack?: boolean;
    onBack?: () => void;
    rightIcon?: keyof typeof Feather.glyphMap;
    onRightPress?: () => void;
}

export function OnboardingHeader({
    title,
    subtitle,
    step,
    stepLabel,
    showBack = true,
    onBack,
    rightIcon,
    onRightPress,
}: OnboardingHeaderProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
            <View style={styles.topRow}>
                {showBack ? (
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Feather name="arrow-left" size={18} color={SgateColors.t1} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backPlaceholder} />
                )}

                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && (
                        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                    )}
                </View>

                {rightIcon && onRightPress ? (
                    <TouchableOpacity
                        onPress={onRightPress}
                        style={styles.rightButton}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Feather name={rightIcon} size={18} color={SgateColors.t1} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.rightPlaceholder} />
                )}
            </View>

            {step != null && (
                <StepIndicator currentStep={step} label={stepLabel} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 14,
        ...SgateShadows.minimal,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: SgateColors.bg,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backPlaceholder: {
        width: 38,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontFamily: SgateFonts.extrabold,
        color: SgateColors.t1,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: SgateFonts.medium,
        color: SgateColors.gold,
        marginTop: 2,
    },
    rightButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: SgateColors.bg,
        borderWidth: 1,
        borderColor: SgateColors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightPlaceholder: {
        width: 38,
    },
});
