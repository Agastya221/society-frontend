import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SgateColors, SgateFonts } from '../../../../constants/Sgate-theme';
import type { User } from '../../../../types/api';

// ─── Completion Calculation ───────────────────────────────────────────────────

interface CompletionContext {
    familyCount: number;
    vehicleCount: number;
}

const FIELDS = [
    { key: 'name',    weight: 20, check: (u: User) => !!u.name },
    { key: 'email',   weight: 15, check: (u: User) => !!u.email },
    { key: 'phone',   weight: 15, check: (u: User) => !!u.phone },
    { key: 'photo',   weight: 15, check: (u: User) => !!u.photoUrl },
    { key: 'flat',    weight: 15, check: (u: User) => !!u.flat?.number },
    { key: 'family',  weight: 10, check: (_: User, ctx: CompletionContext) => ctx.familyCount > 0 },
    { key: 'vehicle', weight: 10, check: (_: User, ctx: CompletionContext) => ctx.vehicleCount > 0 },
];

export function calcCompletion(user: User, ctx: CompletionContext): number {
    let total = 0;
    for (const f of FIELDS) {
        if (f.check(user, ctx)) total += f.weight;
    }
    return Math.min(total, 100);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileCompletionProps {
    percentage: number;
    onViewProfile: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileCompletion({ percentage, onViewProfile }: ProfileCompletionProps) {
    if (percentage >= 100) return null; // Fully complete — don't show banner

    return (
        <TouchableOpacity style={styles.container} onPress={onViewProfile} activeOpacity={0.7}>
            <View style={styles.left}>
                {/* Circular percentage */}
                <View style={styles.circle}>
                    <Text style={styles.circleText}>{percentage}%</Text>
                </View>

                <View style={styles.textWrap}>
                    <Text style={styles.title}>Let neighbours discover you!</Text>
                    <Text style={styles.subtitle}>Complete your profile</Text>
                </View>
            </View>

            <View style={styles.cta}>
                <Text style={styles.ctaText}>View Profile</Text>
                <Feather name="chevron-right" size={14} color={SgateColors.t1} />
            </View>
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: SgateColors.card,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2.5,
        borderColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    circleText: {
        fontSize: 12,
        fontFamily: SgateFonts.bold,
        color: SgateColors.gold,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontFamily: SgateFonts.medium,
        color: SgateColors.t1,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t3,
        marginTop: 1,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 13,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginRight: 2,
    },
});
