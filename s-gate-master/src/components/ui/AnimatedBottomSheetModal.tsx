import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    BackHandler,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
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

import { SgateLayout } from '@/constants/Sgate-theme';

import { SafeBottomSheetSurface } from './SafeBottomSheetSurface';

// Motion values copied from the proven PreApproveSheet animation system.
const ENTER_SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
const EXIT_EASING = Easing.bezier(0.55, 0, 1, 0.45);
const SETTLE_EASING = Easing.bezier(0.16, 1, 0.3, 1);

/** Space left above the top of the screen so a tall sheet never fills it edge to edge. */
const TOP_BREATHING_ROOM = 64;

/** Drag handle plus its margins, as laid out by SafeBottomSheetSurface. */
const HANDLE_BLOCK_HEIGHT = 28;

interface AnimatedBottomSheetModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    surfaceStyle?: StyleProp<ViewStyle>;
    showHandle?: boolean;
    /**
     * Lift the sheet above the keyboard. Needed on Android too: with
     * edge-to-edge on, `adjustResize` no longer resizes the window, so the
     * keyboard covered inputs and Save buttons in sheets.
     * @default true
     */
    avoidKeyboard?: boolean;
}

/**
 * The app's one bottom sheet: dim backdrop, spring entry, timed reverse exit,
 * drag handle, swipe-to-dismiss and Android back support.
 *
 * Layout contract — every sheet gets the same treatment, so callers should not
 * pass their own padding:
 *   • horizontal gutter matches the screens behind it (SafeBottomSheetSurface)
 *   • bottom padding clears the tab bar AND the gesture/navigation bar
 *   • height is capped to the visible area, never a percentage of a shifted box
 */
export function AnimatedBottomSheetModal({
    visible,
    onClose,
    children,
    surfaceStyle,
    showHandle = true,
    avoidKeyboard = true,
}: AnimatedBottomSheetModalProps) {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    // Defined only inside a tab navigator. The tab bar is a sibling of the
    // screen rather than an overlay, so where it exists the sheet already
    // stops above it and must not pad for it again.
    const insideTabNavigator = useContext(BottomTabBarHeightContext) != null;

    const [mounted, setMounted] = useState(visible);
    /**
     * Height of the area the sheet is laid out in. Inside a tab screen that
     * ends above the tab bar, so capping by the window height let a tall sheet
     * run up under the status bar.
     */
    const [rootHeight, setRootHeight] = useState(0);
    /**
     * How far the keyboard overlaps this sheet's container. Not the keyboard
     * height: inside a tab screen the container already ends above the tab
     * bar, so lifting by the full height left a gap and cut the sheet off.
     */
    const [keyboardLift, setKeyboardLift] = useState(0);
    const rootRef = useRef<View>(null);
    const [sheetHeight, setSheetHeight] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);

    const sheetY = useSharedValue(1000);
    const backdropOpacity = useSharedValue(0);

    const openedRef = useRef(false);
    const isClosingRef = useRef(false);
    const onCloseRef = useRef(onClose);
    /**
     * What the sheet showed while it was open. While visible the sheet renders
     * its live children (inputs and handlers must see current state); once the
     * parent hides it, this keeps the content stable through the exit, so
     * clearing the selected item cannot shrink the sheet before it leaves.
     */
    const openChildrenRef = useRef(children);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    onCloseRef.current = onClose;
    if (visible) openChildrenRef.current = children;

    /**
     * Space below the sheet's content.
     *
     * On a tab screen the sheet's container already ends at the top of the tab
     * bar, so one gutter is all that's needed — padding for the bar as well just
     * leaves a dead strip. Elsewhere the sheet reaches the screen edge and has to
     * clear the gesture/navigation bar itself.
     */
    const bottomClearance = insideTabNavigator
        ? SgateLayout.screenGutter
        : insets.bottom + SgateLayout.screenGutter;

    /** Hard cap against the real visible area rather than a percentage of a shifted box. */
    const maxSheetHeight = Math.max(240, (rootHeight || windowHeight) - insets.top - TOP_BREATHING_ROOM - keyboardLift);

    /**
     * Room the content itself may occupy, once the handle and bottom clearance
     * are taken out of the cap. Used to decide whether the sheet has to scroll.
     */
    const maxContentHeight = maxSheetHeight - bottomClearance - (showHandle ? HANDLE_BLOCK_HEIGHT : 0);

    /**
     * The sheet hugs its content and only becomes scrollable once that content
     * genuinely cannot fit. Measured rather than declared, so a sheet behaves
     * correctly wherever it is reused and on any screen size.
     *
     * A child that scrolls itself is bounded by this same cap, so it reports a
     * height that fits and no second scroll view is introduced.
     */
    const needsScroll = contentHeight > 0 && contentHeight > maxContentHeight;

    // The sheet travels its own height plus the clearance it sits on.
    const travelDistance = sheetHeight + bottomClearance;

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

    useEffect(() => {
        clearCloseTimer();

        if (visible) {
            setSheetHeight(0);
            setContentHeight(0);
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
    // Only a change of visibility should open or close the sheet.
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
        if (!mounted || !avoidKeyboard) return;
        const show = Keyboard.addListener('keyboardDidShow', e => {
            const keyboardTop = e.endCoordinates.screenY;
            // measure(), not measureInWindow(): the latter is offset by the
            // status bar under edge-to-edge.
            rootRef.current?.measure((_x, _y, _w, height, _pageX, pageY) => {
                setKeyboardLift(Math.max(0, Math.round(pageY + height - keyboardTop)));
            });
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardLift(0));
        return () => { show.remove(); hide.remove(); };
    }, [avoidKeyboard, mounted]);

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

    const handleContentLayout = (event: LayoutChangeEvent) => {
        const next = Math.ceil(event.nativeEvent.layout.height);
        // Once scrolling, the wrapper reports the viewport height rather than the
        // natural content height — keep the larger reading so it cannot oscillate.
        setContentHeight(current => (next > current ? next : current));
    };

    const handleSheetLayout = (event: LayoutChangeEvent) => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setSheetHeight(current => current === nextHeight ? current : nextHeight);
    };

    if (!mounted) return null;

    const measuredContent = (
        <View onLayout={handleContentLayout}>
            {visible ? children : openChildrenRef.current}
        </View>
    );

    const content = needsScroll ? (
        <ScrollView
            style={{ maxHeight: maxContentHeight }}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {measuredContent}
        </ScrollView>
    ) : measuredContent;

    return (
        <View
            ref={rootRef}
            style={styles.root}
            pointerEvents="box-none"
            onLayout={e => {
                const h = Math.round(e.nativeEvent.layout.height);
                setRootHeight(current => (current === h ? current : h));
            }}
        >
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close panel"
                />
            </Animated.View>

            <View
                style={[styles.keyboardWrap, { paddingBottom: keyboardLift }]}
                pointerEvents="box-none"
            >
                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        onLayout={handleSheetLayout}
                        style={[styles.sheetPosition, { maxHeight: maxSheetHeight }, sheetStyle]}
                    >
                        <SafeBottomSheetSurface
                            style={surfaceStyle}
                            showHandle={showHandle}
                            bottomClearance={bottomClearance}
                        >
                            {content}
                        </SafeBottomSheetSurface>
                    </Animated.View>
                </GestureDetector>
            </View>
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
    keyboardWrap: {
        width: '100%',
        justifyContent: 'flex-end',
    },
    sheetPosition: {
        width: '100%',
        flexShrink: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
});
