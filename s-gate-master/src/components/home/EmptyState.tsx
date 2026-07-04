import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface EmptyStateProps {
    iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    iconBg?: string;
    iconColor?: string;
    title: string;
    description: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
}

export function EmptyState({
    iconName,
    iconBg = SgateColors.greenBg,
    iconColor = SgateColors.green,
    title,
    description,
    ctaLabel,
    onCtaPress,
}: EmptyStateProps) {
    return (
        <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySub}>{description}</Text>
            {ctaLabel && onCtaPress && (
                <TouchableOpacity style={styles.cta} onPress={onCtaPress} activeOpacity={0.84}>
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 96,
        paddingVertical: 20,
        paddingHorizontal: 12,
        gap: 8,
    },
    emptyIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    emptySub: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
    },
    cta: {
        marginTop: 4,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
    },
    ctaText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
});
