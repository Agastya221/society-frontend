import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ScreenHeaderProps {
    /** Screen title displayed after the back button. */
    title: string;
    /** Show the back arrow. Defaults to `true`. */
    showBack?: boolean;
    /** Optional element rendered on the right side of the header (icon button, badge, etc.). */
    rightAction?: React.ReactNode;
    /**
     * Optional shared value (0 → 1) driven by scroll position.
     * Controls the animated bottom-border opacity for a premium "shadow on scroll" effect.
     * If not provided, a static subtle border is shown.
     */
    scrollProgress?: SharedValue<number>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Standardized screen header matching the Deliveries screen pattern.
 *
 * Layout:
 *   [Back]  Title                     [RightAction]
 *
 * Extends behind the status bar via `useSafeAreaInsets`.
 * Uses Feather `arrow-left` at size 24 — the app-wide standard.
 */
export function ScreenHeader({
    title,
    showBack = true,
    rightAction,
    scrollProgress,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // ── Animated border (appears on scroll) ──────────────────────────────
    const borderStyle = useAnimatedStyle(() => {
        if (!scrollProgress) return { opacity: 0.35 };
        return {
            opacity: Math.min(scrollProgress.value / 30, 1),
        };
    });

    return (
        <View style={[S.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
            {/* Row: back + title + right action */}
            <View style={S.row}>
                {showBack ? (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Go back"
                    >
                        <Feather name="arrow-left" size={24} color={SgateColors.t1} />
                    </TouchableOpacity>
                ) : (
                    <View style={S.backPlaceholder} />
                )}

                <Text style={S.title} numberOfLines={1}>{title}</Text>

                {rightAction ? (
                    <View>{rightAction}</View>
                ) : (
                    /* Invisible spacer to balance the row when showBack is true */
                    showBack ? <View style={S.backPlaceholder} /> : null
                )}
            </View>

            {/* Animated bottom border */}
            <Animated.View style={[S.borderLine, borderStyle]} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    header: {
        backgroundColor: SgateColors.card,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 18,
        fontFamily: SgateFonts.semibold,
        color: SgateColors.t1,
        marginLeft: 12,
        flex: 1,
    },
    backPlaceholder: {
        width: 24,
    },
    borderLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: SgateColors.borderSoft,
    },
});
