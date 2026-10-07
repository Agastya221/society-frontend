import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateLayout, SgateSurfaces } from '@/constants/Sgate-theme';

interface SafeBottomSheetSurfaceProps extends ViewProps {
    showHandle?: boolean;
    /**
     * Space to leave below the content so nothing sits under the tab bar or the
     * gesture/navigation bar. AnimatedBottomSheetModal computes this; standalone
     * sheets can leave it unset and get a safe-area-based default.
     */
    bottomClearance?: number;
}

/**
 * The panel surface every bottom sheet sits on.
 *
 * Owns the sheet's padding so each screen doesn't invent its own:
 * horizontal gutter matches the screens behind it, and the bottom padding
 * always clears the system bars.
 */
export function SafeBottomSheetSurface({
    children,
    style,
    showHandle = false,
    bottomClearance,
    ...props
}: SafeBottomSheetSurfaceProps) {
    const insets = useSafeAreaInsets();
    const paddingBottom = bottomClearance
        ?? Math.max(insets.bottom, SgateLayout.screenGutter) + SgateLayout.screenGutter;

    return (
        <View style={[styles.surface, style, { paddingBottom }]} {...props}>
            {showHandle ? <View style={styles.handle} /> : null}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    surface: {
        ...SgateSurfaces.sheet,
        // Matches the screen gutter so sheet content lines up with the page behind it.
        paddingHorizontal: SgateLayout.screenGutter,
    },
    handle: {
        width: 40,
        height: 4,
        marginTop: 10,
        marginBottom: 14,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
        alignSelf: 'center',
    },
});
