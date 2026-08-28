import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { SafeBottomSheetSurface } from './SafeBottomSheetSurface';

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

    if (!mounted) return null;

    return (
        <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent={false}
            hardwareAccelerated
            onRequestClose={onClose}
        >
            <View style={S.root}>
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
                        minimumBottomPadding={minimumBottomPadding}
                    >
                        {children}
                    </SafeBottomSheetSurface>
                </Animated.View>
            </View>
        </Modal>
    );
}

const S = StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    sheetPosition: {
        width: '100%',
        maxHeight: '88%',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13,15,20,0.45)',
    },
});
