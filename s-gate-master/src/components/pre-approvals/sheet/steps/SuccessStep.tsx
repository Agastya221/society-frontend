import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

import { SheetShell } from '../SheetShell';
import { PrimaryAction } from '../parts/PrimaryAction';

interface SuccessStepProps {
    title?: string;
    message?: string;
    onDone: () => void;
    bottomClearance: number;
}

/**
 * Confirmation for a pass that has no QR to show (cab, delivery, service).
 *
 * Guest invites end on the QR carousel instead, which is full-bleed and brings
 * its own chrome, so it is rendered directly rather than through this step.
 */
export function SuccessStep({
    title = 'Pass Created!',
    message = 'Your gate pass has been successfully created and saved.',
    onDone,
    bottomClearance,
}: SuccessStepProps) {
    return (
        <SheetShell
            height="fit"
            bottomClearance={bottomClearance}
            contentContainerStyle={S.body}
            footer={<PrimaryAction label="Done" onPress={onDone} />}
        >
            <View style={S.circle}>
                <Feather name="check" size={40} color={SgateColors.green} />
            </View>
            <Text style={S.title}>{title}</Text>
            <Text style={S.message}>{message}</Text>
        </SheetShell>
    );
}

const S = StyleSheet.create({
    body: {
        alignItems: 'center',
        paddingHorizontal: SgateLayout.screenGutter,
        paddingTop: 18,
        paddingBottom: 10,
    },
    circle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SgateColors.greenBg,
    },
    title: {
        marginTop: 18,
        fontSize: 21,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
    },
    message: {
        marginTop: 6,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
    },
});
