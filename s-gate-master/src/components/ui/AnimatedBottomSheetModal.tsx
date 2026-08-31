import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    BackHandler,
    Easing,
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeBottomSheetSurface } from './SafeBottomSheetSurface';

const TAB_BAR_SEAM_OVERLAP = 12;

interface AnimatedBottomSheetModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    surfaceStyle?: StyleProp<ViewStyle>;
    showHandle?: boolean;
    minimumBottomPadding?: number;
}

/**
 * Bottom panel with independent animations: backdrop fades while only the
 * sheet translates. This avoids the black overlay sliding up with the panel.
 */
export function AnimatedBottomSheetModal({
    visible,
    onClose,
    children,
    surfaceStyle,
    showHandle = true,
    minimumBottomPadding = 16,
}: AnimatedBottomSheetModalProps) {
    const insets = useSafeAreaInsets();
    const [mounted, setMounted] = useState(visible);
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const sheetTranslateY = useRef(new Animated.Value(72)).current;

    useEffect(() => {
        if (visible) {
            setMounted(true);
            backdropOpacity.stopAnimation();
            sheetTranslateY.stopAnimation();
            backdropOpacity.setValue(0);
            sheetTranslateY.setValue(72);

            requestAnimationFrame(() => {
                Animated.parallel([
                    Animated.timing(backdropOpacity, {
                        toValue: 1,
                        duration: 180,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.spring(sheetTranslateY, {
                        toValue: 0,
                        damping: 24,
                        stiffness: 260,
                        mass: 0.9,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
            return;
        }

        if (mounted) {
            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 150,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(sheetTranslateY, {
                    toValue: 48,
                    duration: 170,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [backdropOpacity, mounted, sheetTranslateY, visible]);

    useEffect(() => {
        if (!mounted) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            return true;
        });
        return () => subscription.remove();
    }, [mounted, onClose]);

    if (!mounted) return null;

    return (
            <View
                style={[S.root, { bottom: -insets.bottom - TAB_BAR_SEAM_OVERLAP }]}
                pointerEvents="box-none"
            >
                <Animated.View style={[S.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close panel"
                    />
                </Animated.View>
                <Animated.View style={[S.sheetPosition, { transform: [{ translateY: sheetTranslateY }] }]}>
                    <SafeBottomSheetSurface
                        style={surfaceStyle}
                        showHandle={showHandle}
                        minimumBottomPadding={
                            Math.max(
                                minimumBottomPadding,
                                insets.bottom + TAB_BAR_SEAM_OVERLAP + 12,
                            )
                        }
                        respectBottomInset={false}
                    >
                        {children}
                    </SafeBottomSheetSurface>
                </Animated.View>
            </View>
    );
}

const S = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 1000,
        elevation: 100,
    },
    sheetPosition: {
        width: '100%',
        maxHeight: '88%',
        flexShrink: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13,15,20,0.45)',
    },
});
