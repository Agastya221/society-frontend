import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface RoleSwitcherProps {
    currentRole: 'resident' | 'admin';
    onSwitch: () => void;
    disabled?: boolean;
}

export default function RoleSwitcher({
    currentRole,
    onSwitch,
    disabled = false,
}: RoleSwitcherProps) {
    const isAdminMode = currentRole === 'admin';

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSwitch();
    };

    return (
        <TouchableOpacity
            style={[
                styles.pill,
                isAdminMode ? styles.adminPill : styles.residentPill,
            ]}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            <MaterialCommunityIcons
                name={isAdminMode ? 'shield-account-outline' : 'home-outline'}
                size={16}
                color={isAdminMode ? SgateColors.goldDeep : SgateColors.t2}
                style={styles.icon}
            />
            <Text style={[styles.text, isAdminMode ? styles.adminText : styles.residentText]}>
                {isAdminMode ? 'Admin View' : 'Resident View'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
    },
    residentPill: {
        backgroundColor: '#FFF6DD',
        borderColor: '#FFE8A8',
    },
    adminPill: {
        backgroundColor: '#FFF6DD', // Premium light yellow for S-Gate identity
        borderColor: '#FFE8A8',
    },
    icon: {
        marginRight: 4,
    },
    text: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        letterSpacing: 0.2,
    },
    residentText: {
        color: SgateColors.t1,
    },
    adminText: {
        color: SgateColors.t1,
    },
});
