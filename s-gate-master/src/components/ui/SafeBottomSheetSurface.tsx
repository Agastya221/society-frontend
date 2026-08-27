import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateSurfaces } from '@/constants/Sgate-theme';

interface SafeBottomSheetSurfaceProps extends ViewProps {
    showHandle?: boolean;
    minimumBottomPadding?: number;
    respectBottomInset?: boolean;
}

/** Safe panel surface used by bottom sheets throughout the app. */
export function SafeBottomSheetSurface({
    children,
    style,
    showHandle = false,
    minimumBottomPadding = 16,
    respectBottomInset = true,
    ...props
}: SafeBottomSheetSurfaceProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.surface,
                style,
                {
                    paddingBottom: respectBottomInset
                        ? Math.max(insets.bottom, minimumBottomPadding)
                        : minimumBottomPadding,
                },
            ]}
            {...props}
        >
            {showHandle ? <View style={styles.handle} /> : null}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    surface: {
        ...SgateSurfaces.sheet,
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
