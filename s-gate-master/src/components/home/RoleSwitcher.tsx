import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

import type { UserRole } from './homeToolsConfig';

interface RoleSwitcherProps {
    visible: boolean;
    currentRole: UserRole;
    onPress: () => void;
}

export function RoleSwitcher({ visible, currentRole, onPress }: RoleSwitcherProps) {
    if (!visible) return null;

    const label = currentRole === 'admin' ? 'Resident View' : 'Admin View';

    return (
        <TouchableOpacity style={styles.adminPill} onPress={onPress} activeOpacity={0.82}>
            <MaterialCommunityIcons name="shield-account-outline" size={21} color={SgateColors.t1} />
            <Text style={styles.adminPillText}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    adminPill: {
        height: 58,
        minWidth: 154,
        paddingHorizontal: 20,
        borderRadius: 29,
        backgroundColor: '#FFF7DF',
        borderWidth: 1,
        borderColor: '#F4E4B7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    adminPillText: {
        fontSize: 16,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
});
