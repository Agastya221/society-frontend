import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

interface PrimaryActionProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    /** Private invites use the violet treatment. */
    tone?: 'gold' | 'violet';
}

/** The sheet's footer button. Lives in SheetShell's fixed footer, so it never scrolls away. */
export function PrimaryAction({ label, onPress, loading = false, disabled = false, tone = 'gold' }: PrimaryActionProps) {
    const inactive = disabled || loading;
    return (
        <TouchableOpacity
            style={[S.btn, tone === 'violet' && S.violet, inactive && S.off]}
            onPress={onPress}
            disabled={inactive}
            activeOpacity={0.8}
            accessibilityRole="button"
        >
            {loading
                ? <ActivityIndicator color={tone === 'violet' ? SgateColors.card : SgateColors.t1} />
                : <Text style={[S.text, tone === 'violet' && S.violetText]}>{label}</Text>}
        </TouchableOpacity>
    );
}

const S = StyleSheet.create({
    btn: {
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SgateColors.gold,
    },
    violet: { backgroundColor: SgateColors.violet },
    off: { opacity: 0.5 },
    text: { fontSize: 16, fontFamily: SgateFonts.bold, color: SgateColors.t1 },
    violetText: { color: SgateColors.card },
});
