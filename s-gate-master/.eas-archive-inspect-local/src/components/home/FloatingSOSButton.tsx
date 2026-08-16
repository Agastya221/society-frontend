import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { SgateFonts } from '@/constants/Sgate-theme';

interface FloatingSOSButtonProps {
    bottomOffset: number;
    onPress: () => void;
}

export function FloatingSOSButton({ bottomOffset, onPress }: FloatingSOSButtonProps) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create SOS alert"
            style={[styles.button, { bottom: bottomOffset }]}
            onPress={onPress}
        >
            <MaterialCommunityIcons name="alert-circle" size={25} color="#FFFFFF" />
            <Text style={styles.label}>SOS</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        right: 22,
        height: 58,
        minWidth: 136,
        borderRadius: 29,
        backgroundColor: '#EF2F3B',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        zIndex: 30,
        ...Platform.select({
            ios: {
                shadowColor: '#EF2F3B',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 18,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    label: {
        fontSize: 20,
        fontFamily: SgateFonts.extrabold,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
});
