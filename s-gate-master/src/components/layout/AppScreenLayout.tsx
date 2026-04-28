import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors } from '@/constants/Sgate-theme';

import { ScreenHeader, type ScreenHeaderProps } from './ScreenHeader';

// ─── Animated ScrollView ──────────────────────────────────────────────────────

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AppScreenLayoutProps extends ScreenHeaderProps {
    children: React.ReactNode;

    /**
     * Render content inside a ScrollView.
     * Set to `false` for screens that manage their own scrolling (e.g. FlatList).
     * @default true
     */
    scroll?: boolean;

    /**
     * Optional fixed element rendered at the bottom of the screen
     * (e.g. a CTA button). Respects safe area bottom inset.
     */
    bottomCTA?: React.ReactNode;

    /**
     * Extra content rendered between the header and the scrollable area.
     * Useful for filter chips, segmented controls, search bars, etc.
     * This section is NOT scrollable — it stays pinned below the header.
     */
    stickyContent?: React.ReactNode;

    /**
     * Background color override. Defaults to `SgateColors.bg`.
     */
    backgroundColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Production-ready layout shell for every screen in the app.
 *
 * Structure:
 * ```
 * ┌──────────────────────────┐
 * │  ScreenHeader            │  ← fixed, extends behind status bar
 * ├──────────────────────────┤
 * │  TopSpacer (6px)         │  ← fixed, never scrolls
 * ├──────────────────────────┤
 * │  stickyContent (optional)│  ← fixed (chips, tabs, etc.)
 * ├──────────────────────────┤
 * │                          │
 * │  Scrollable Content      │  ← ScrollView or plain View
 * │                          │
 * ├──────────────────────────┤
 * │  bottomCTA (optional)    │  ← fixed at bottom, safe-area-aware
 * └──────────────────────────┘
 * ```
 *
 * Usage:
 * ```tsx
 * <AppScreenLayout title="Deliveries" showBack>
 *   <Text>Screen content here</Text>
 * </AppScreenLayout>
 * ```
 */
export function AppScreenLayout({
    // Header props
    title,
    showBack = true,
    rightAction,
    // Layout props
    children,
    scroll = true,
    bottomCTA,
    stickyContent,
    backgroundColor,
}: AppScreenLayoutProps) {
    const insets = useSafeAreaInsets();
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const bg = backgroundColor ?? SgateColors.bg;

    return (
        <View style={[S.root, { backgroundColor: bg }]}>
            {/* ── Header ──────────────────────────────────────────────── */}
            <ScreenHeader
                title={title}
                showBack={showBack}
                rightAction={rightAction}
                scrollProgress={scrollY}
            />

            {/* ── Fixed spacer ────────────────────────────────────────── */}
            <View style={S.spacer} />

            {/* ── Sticky content (chips, tabs, etc.) ──────────────────── */}
            {stickyContent}

            {/* ── Content ─────────────────────────────────────────────── */}
            {scroll ? (
                <AnimatedScrollView
                    style={S.scroll}
                    contentContainerStyle={[
                        S.scrollContent,
                        { paddingBottom: bottomCTA ? 16 : 32 + insets.bottom },
                    ]}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </AnimatedScrollView>
            ) : (
                <View style={S.flex}>{children}</View>
            )}

            {/* ── Bottom CTA ──────────────────────────────────────────── */}
            {bottomCTA && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View
                        style={[
                            S.bottomBar,
                            { paddingBottom: Math.max(insets.bottom, 16) },
                        ]}
                    >
                        {bottomCTA}
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: {
        flex: 1,
    },
    spacer: {
        height: 6,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    flex: {
        flex: 1,
    },
    bottomBar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: SgateColors.card,
        borderTopWidth: 1,
        borderTopColor: SgateColors.borderSoft,
    },
});
