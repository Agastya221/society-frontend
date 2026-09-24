import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateFonts, SgateLayout } from '@/constants/Sgate-theme';

const ICON_BUTTON = 40;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ScreenHeaderProps {
    /** Screen title displayed after the back button. */
    title: string;
    /** Show the back arrow. Defaults to `true`. */
    showBack?: boolean;
    /** Optional element rendered on the right side of the header (icon button, badge, etc.). */
    rightAction?: React.ReactNode;
    /** Alias retained for screens using the earlier UI header. */
    rightElement?: React.ReactNode;
    /** Optional supporting line below the title. */
    subtitle?: string;
    /** Optional custom back handler. */
    onBack?: () => void;
    /**
     * Optional shared value (0 → 1) driven by scroll position.
     * Controls the animated bottom-border opacity for a premium "shadow on scroll" effect.
     * If not provided, a static subtle border is shown.
     */
    scrollProgress?: SharedValue<number>;
    /** Optional content rendered inside the header below the title row (filter chips, tabs, search). */
    children?: React.ReactNode;
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
    rightElement,
    subtitle,
    onBack,
    scrollProgress,
    children,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const trailingAction = rightAction ?? rightElement;
    const handleBack = () => {
        if (onBack) onBack();
        else if (router.canGoBack()) router.back();
    };

    // ── Animated border (appears on scroll) ──────────────────────────────
    const borderStyle = useAnimatedStyle(() => {
        if (!scrollProgress) return { opacity: 0.35 };
        return {
            opacity: Math.min(scrollProgress.value / 30, 1),
        };
    });

    return (
        <View style={[S.header, { paddingTop: insets.top + SgateLayout.headerTopGap }]}>
            {/* Row: back + title + right action */}
            <View style={S.row}>
                {showBack ? (
                    <Pressable
                        onPress={handleBack}
                        style={S.backButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                    >
                        <Feather name="arrow-left" size={22} color={SgateColors.t1} />
                    </Pressable>
                ) : (
                    <View style={S.backPlaceholder} />
                )}

                <View style={S.titleWrap}>
                    <Text style={S.title} numberOfLines={1}>{title}</Text>
                    {subtitle ? <Text style={S.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
                </View>

                {trailingAction ? (
                    <View>{trailingAction}</View>
                ) : (
                    /* Invisible spacer to balance the row when showBack is true */
                    showBack ? <View style={S.backPlaceholder} /> : null
                )}
            </View>

            {children ? <View style={S.below}>{children}</View> : null}

            {/* Animated bottom border */}
            <Animated.View style={[S.borderLine, borderStyle]} />
        </View>
    );
}

// ─── Header icon button ──────────────────────────────────────────────────────

export interface HeaderIconButtonProps {
    icon: React.ComponentProps<typeof Feather>['name'];
    onPress: () => void;
    accessibilityLabel: string;
    /** Small count badge (rendered in brand gold, like the Home bell). */
    badge?: number;
    color?: string;
}

/** Round 40px icon button with the same ring as the Home header's bell/SOS buttons. */
export function HeaderIconButton({ icon, onPress, accessibilityLabel, badge, color }: HeaderIconButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            style={S.iconButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
        >
            <Feather name={icon} size={20} color={color ?? SgateColors.t1} />
            {badge ? (
                <View style={S.badge}>
                    <Text style={S.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
            ) : null}
        </Pressable>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    header: {
        backgroundColor: SgateColors.card,
        paddingBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SgateLayout.screenGutter,
        gap: 10,
    },
    // Same 40px ring as the Home header's bell button
    iconButton: {
        width: ICON_BUTTON,
        height: ICON_BUTTON,
        borderRadius: ICON_BUTTON / 2,
        backgroundColor: SgateColors.card,
        borderWidth: 1,
        borderColor: SgateColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        width: ICON_BUTTON,
        height: ICON_BUTTON,
        borderRadius: ICON_BUTTON / 2,
        backgroundColor: SgateColors.card,
        borderWidth: 1,
        borderColor: SgateColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrap: { flex: 1, minWidth: 0 },
    below: { paddingTop: 12 },
    title: {
        fontSize: 20,
        lineHeight: 26,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
        letterSpacing: -0.4,
    },
    subtitle: {
        marginTop: 1,
        fontSize: 12,
        lineHeight: 16,
        fontFamily: SgateFonts.regular,
        color: SgateColors.t2,
    },
    backPlaceholder: {
        width: ICON_BUTTON,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -3,
        minWidth: 19,
        height: 19,
        borderRadius: 10,
        paddingHorizontal: 4,
        backgroundColor: SgateColors.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontFamily: SgateFonts.bold,
        color: SgateColors.t1,
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
