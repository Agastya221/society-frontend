import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

interface StepHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    right?: React.ReactNode;
}

/** The title row every step opens with — one definition, so steps can't drift. */
export function StepHeader({ title, subtitle, onBack, right }: StepHeaderProps) {
    return (
        <View style={S.row}>
            {onBack ? (
                <TouchableOpacity
                    onPress={onBack}
                    style={S.back}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={22} color={SgateColors.t2} />
                </TouchableOpacity>
            ) : null}

            <View style={S.text}>
                <Text style={S.title} numberOfLines={1}>{title}</Text>
                {subtitle ? <Text style={S.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>

            {right}
        </View>
    );
}

const S = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: SgateLayout.screenGutter,
        paddingTop: 6,
        paddingBottom: 12,
    },
    back: { width: 30, height: 30, alignItems: 'flex-start', justifyContent: 'center' },
    text: { flex: 1, minWidth: 0 },
    title: { fontSize: 21, fontFamily: SgateFonts.bold, color: SgateColors.t1, letterSpacing: -0.4 },
    subtitle: { marginTop: 1, fontSize: 13, fontFamily: SgateFonts.regular, color: SgateColors.t3 },
});
