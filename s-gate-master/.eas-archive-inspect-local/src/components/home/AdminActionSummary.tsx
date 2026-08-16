import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface AdminActionSummaryProps {
    pendingOnboardingCount: number;
    onOpenOnboarding: () => void;
}

export function AdminActionSummary({
    pendingOnboardingCount,
    onOpenOnboarding,
}: AdminActionSummaryProps) {
    if (pendingOnboardingCount <= 0) return null;

    return (
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
            <SectionHeader
                title="Onboarding Requests"
                rightPill={{
                    text: `${pendingOnboardingCount} Pending`,
                    color: SgateColors.violet,
                    bg: '#F5F0FF',
                }}
            />
            <TouchableOpacity style={styles.card} onPress={onOpenOnboarding} activeOpacity={0.86}>
                <View style={styles.iconWrap}>
                    <MaterialCommunityIcons name="clipboard-account-outline" size={28} color={SgateColors.violet} />
                </View>
                <View style={styles.copy}>
                    <Text style={styles.title}>Resident approvals need review</Text>
                    <Text style={styles.subtitle}>
                        {pendingOnboardingCount} request{pendingOnboardingCount > 1 ? 's are' : ' is'} waiting for admin action
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={SgateColors.t3} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    card: {
        minHeight: 96,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        ...Platform.select({
            ios: {
                shadowColor: '#101828',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.06,
                shadowRadius: 24,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    copy: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 14,
        lineHeight: 19,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
});
