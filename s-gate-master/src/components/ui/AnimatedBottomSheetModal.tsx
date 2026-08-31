import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    BackHandler,
    Pressable,
    StyleSheet,
    View,
    type LayoutChangeEvent,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeBottomSheetSurface } from './SafeBottomSheetSurface';

// Motion values copied from the proven PreApproveSheet animation system.
const ENTER_SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
const EXIT_EASING = Easing.bezier(0.55, 0, 1, 0.45);
const SETTLE_EASING = Easing.bezier(0.16, 1, 0.3, 1);
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
 * Reusable action-sheet shell based on PreApproveSheet's presentation:
 * independent backdrop fade, full-height spring entry, timed reverse exit,
 * Android back support, and swipe-down dismissal.
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
    const [sheetHeight, setSheetHeight] = useState(0);
    const [displayedChildren, setDisplayedChildren] = useState(children);

    const sheetY = useSharedValue(1000);
    const backdropOpacity = useSharedValue(0);

    const openedRef = useRef(false);
    const isClosingRef = useRef(false);
    const onCloseRef = useRef(onClose);
    const childrenRef = useRef(children);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    onCloseRef.current = onClose;
    childrenRef.current = children;

    const travelDistance = sheetHeight + insets.bottom + TAB_BAR_SEAM_OVERLAP;

    const clearCloseTimer = useCallback(() => {
        if (!closeTimerRef.current) return;
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    }, []);

    const finishInternalClose = useCallback(() => {
        clearCloseTimer();
        openedRef.current = false;
        isClosingRef.current = false;
        setMounted(false);
        onCloseRef.current();
    }, [clearCloseTimer]);

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        sheetY.value = withTiming(travelDistance || 1000, {
            duration: 260,
            easing: EXIT_EASING,
        });
        backdropOpacity.value = withTiming(0, { duration: 220 });
        clearCloseTimer();
        closeTimerRef.current = setTimeout(finishInternalClose, 280);
    }, [backdropOpacity, clearCloseTimer, finishInternalClose, sheetY, travelDistance]);

    // Snapshot children only when opening. They remain stable during exit, so
    // clearing the selected pass cannot shrink the sheet before it leaves.
    useEffect(() => {
        clearCloseTimer();

        if (visible) {
            setDisplayedChildren(childrenRef.current);
            setSheetHeight(0);
            openedRef.current = false;
            isClosingRef.current = false;
            setMounted(true);
            return;
        }

        if (!mounted || isClosingRef.current) return;

        isClosingRef.current = true;
        sheetY.value = withTiming(travelDistance || 1000, {
            duration: 260,
            easing: EXIT_EASING,
        });
        backdropOpacity.value = withTiming(0, { duration: 220 });
        closeTimerRef.current = setTimeout(() => {
            openedRef.current = false;
            isClosingRef.current = false;
            setMounted(false);
        }, 280);

        return clearCloseTimer;
    // Children are intentionally read through a ref only on visibility change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
        if (!mounted || !visible || sheetHeight <= 0 || openedRef.current) return;

        openedRef.current = true;
        sheetY.value = travelDistance;
        backdropOpacity.value = 0;

        const frame = requestAnimationFrame(() => {
            sheetY.value = withSpring(0, ENTER_SPRING);
            backdropOpacity.value = withTiming(1, { duration: 280 });
        });

        return () => cancelAnimationFrame(frame);
    }, [backdropOpacity, mounted, sheetHeight, sheetY, travelDistance, visible]);

    useEffect(() => {
        if (!mounted) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            handleClose();
            return true;
        });
        return () => subscription.remove();
    }, [handleClose, mounted]);

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

    const panGesture = useMemo(() => Gesture.Pan()
        .failOffsetX([-20, 20])
        .activeOffsetY([-10, 10])
        .onUpdate(event => {
            if (event.translationY > 0) sheetY.value = event.translationY;
        })
        .onEnd(event => {
            if (event.translationY > 90 || event.velocityY > 500) {
                runOnJS(handleClose)();
            } else {
                sheetY.value = withTiming(0, { duration: 220, easing: SETTLE_EASING });
            }
        }), [handleClose, sheetY]);

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetY.value }],
    }));
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const handleSheetLayout = (event: LayoutChangeEvent) => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setSheetHeight(current => current === nextHeight ? current : nextHeight);
    };

    if (!mounted) return null;

    return (
        <View
            style={[styles.root, { bottom: -insets.bottom - TAB_BAR_SEAM_OVERLAP }]}
            pointerEvents="box-none"
        >
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close panel"
                />
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View
                    onLayout={handleSheetLayout}
                    style={[styles.sheetPosition, sheetStyle]}
                >
                    <SafeBottomSheetSurface
                        style={surfaceStyle}
                        showHandle={showHandle}
                        minimumBottomPadding={Math.max(
                            minimumBottomPadding,
                            insets.bottom + TAB_BAR_SEAM_OVERLAP + 12,
                        )}
                        respectBottomInset={false}
                    >
                        {displayedChildren}
                    </SafeBottomSheetSurface>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
});
