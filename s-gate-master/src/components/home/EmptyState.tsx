import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface EmptyStateProps {
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    iconBg?: string;
    iconColor?: string;
    title: string;
    description: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
}

export default function EmptyState({
    iconName,
    iconBg = '#EEF0F4',
    iconColor = SgateColors.t3,
    title,
    description,
    ctaLabel,
    onCtaPress,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            {ctaLabel && onCtaPress && (
                <TouchableOpacity style={styles.ctaButton} onPress={onCtaPress} activeOpacity={0.8}>
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    iconWrapper: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        textAlign: 'center',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        textAlign: 'center',
        lineHeight: 18,
    },
    ctaButton: {
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: SgateColors.goldPale,
    },
    ctaText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.goldDeep,
    },
});
