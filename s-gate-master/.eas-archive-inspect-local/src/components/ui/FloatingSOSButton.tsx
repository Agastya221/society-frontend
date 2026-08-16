import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SgateFonts } from '@/constants/Sgate-theme';

interface FloatingSOSButtonProps {
    role: 'admin' | 'resident';
    bottomOffset?: number;
}

export function FloatingSOSButton({ role, bottomOffset = 20 }: FloatingSOSButtonProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handlePress = () => {
        if (role === 'admin') {
            router.push('/(admin)/sos-create' as any);
        } else {
            router.push('/(resident)/emergency/create' as any);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.sosFab, { bottom: insets.bottom + bottomOffset }]}
            onPress={handlePress}
            activeOpacity={0.85}
        >
            <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
            <Text style={styles.sosFabText}>SOS</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    sosFab: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ef4444',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 28,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 50,
    },
    sosFabText: {
        fontSize: 15,
        fontFamily: SgateFonts.bold,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
});
