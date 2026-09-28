import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    BackHandler,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedKeyboard,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SgateColors, SgateRadius } from '@/constants/Sgate-theme';

import { SheetMeasureContext, type StepHeight } from './SheetShell';
import { StepTransition, type StepDirection } from './StepTransition';

const ENTER_SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
const EXIT_EASING = Easing.bezier(0.55, 0, 1, 0.45);
const SETTLE_EASING = Easing.bezier(0.16, 1, 0.3, 1);

/** Never cover the whole screen — the page behind stays visible as context. */
const TOP_BREATHING_ROOM = 72;

/** A full-size touch target for the drag handle. */
const HANDLE_BLOCK_HEIGHT = 44;

/**
 * The sheet renders inline in the screen rather than in a <Modal>, so the tab
 * bar stays visible underneath and the sheet reads as rising out of it. It also
 * means the sheet's bottom edge is already the top of the tab bar, so it needs
 * no padding for the bar itself.
 */

export interface StepSheetProps {
    visible: boolean;
    onClose: () => void;
    /** How the current step wants to be sized. */
    height: StepHeight;
    /** Bumped by the caller when the step changes, so the sheet re-measures. */
    stepKey: string;
    /** Which way the last move went, so steps slide the right way. */
    direction?: StepDirection;
    /**
     * Android back. Return true when the step handled it (moved back a step);
     * false lets the sheet close. Without it, back always closes the sheet.
     */
    onBackPress?: () => boolean;
    children: React.ReactNode;
}

/**
 * The container the pre-approval steps live in.
 *
 * Height comes from the step, not from a table of constants: a `fill` step takes
 * the maximum, a `fit` step is measured and the sheet springs to exactly that.
 * Because the measurement is live, a step that grows while open (adding guests)
 * grows with it instead of leaving a gap or clipping.
 */
export function StepSheet({ visible, onClose, height, stepKey, direction = 'forward', onBackPress, children }: StepSheetProps) {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const [mounted, setMounted] = useState(visible);
    /**
     * The height the current step asked for, tagged with the step it came from.
     * Tagging (rather than clearing the value when the step changes) matters:
     * a new step can report before the parent's effects run, and a clear that
     * lands after that report wiped it, leaving the sheet at the old height.
     */
    const [measured, setMeasured] = useState<{ step: string; height: number } | null>(null);
    const stepKeyRef = useRef(stepKey);
    stepKeyRef.current = stepKey;
    const contentHeight = measured && measured.step === stepKey ? measured.height : 0;
    const rootRef = useRef<View>(null);
    /** Live keyboard height, updated every frame on the UI thread. */
    const keyboard = useAnimatedKeyboard();
    /**
     * Distance from the sheet's bottom edge (the top of the tab bar) to the
     * bottom of the screen. The keyboard only covers the sheet by however much
     * it is taller than this.
     */
    const bottomGap = useSharedValue(0);

    const translateY = useSharedValue(windowHeight);
    const backdropOpacity = useSharedValue(0);
    const sheetHeight = useSharedValue(0);

    const closingRef = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const onBackPressRef = useRef(onBackPress);
    onBackPressRef.current = onBackPress;

    /**
     * The tallest the sheet may be right now. With the keyboard up the sheet is
     * lifted above it, so the cap drops by the same amount — otherwise a tall
     * step would be pushed off the top of the screen instead of scrolling.
     */
    const maxHeight = Math.max(240, windowHeight - insets.top - TOP_BREATHING_ROOM);

    /**
     * Steps always fill the sheet; `height` only decides what the sheet sizes
     * to. A `fit` step reports the height it would like (header + content +
     * footer, via SheetShell), capped by the screen — its body scrolls past
     * that. There is deliberately no switching of layout mode on measurement:
     * that fed back into the measurement and made tall steps flicker.
     */
    const effectiveHeight: StepHeight = height;

    /** Its content plus the sheet's own chrome (the drag handle above it). */
    const chromeHeight = HANDLE_BLOCK_HEIGHT;
    const targetHeight = useMemo(() => {
        if (effectiveHeight === 'fill') return maxHeight;
        if (!contentHeight) return 0;                     // not measured yet
        return Math.min(contentHeight + chromeHeight, maxHeight);
    }, [effectiveHeight, contentHeight, chromeHeight, maxHeight]);

    const reportHeight = useCallback((next: number) => {
        if (next <= 0) return;
        const step = stepKeyRef.current;
        setMeasured(current => (current && current.step === step && current.height === next
            ? current
            : { step, height: next }));
    }, []);

    const finishClose = useCallback(() => {
        closingRef.current = false;
        setMounted(false);
        onCloseRef.current();
    }, []);

    const close = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        translateY.value = withTiming(maxHeight, { duration: 260, easing: EXIT_EASING });
        backdropOpacity.value = withTiming(0, { duration: 220 });
        setTimeout(finishClose, 280);
    }, [backdropOpacity, finishClose, maxHeight, translateY]);

    // Open / close
    useEffect(() => {
        if (visible) {
            closingRef.current = false;
            translateY.value = maxHeight;
            backdropOpacity.value = 0;
            setMounted(true);
            return;
        }
        if (mounted && !closingRef.current) close();
    // `close` and `mounted` intentionally excluded: this reacts to `visible` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Enter once there is a height to animate to
    const enteredRef = useRef(false);
    useEffect(() => {
        if (!mounted) { enteredRef.current = false; return; }
        if (enteredRef.current || targetHeight <= 0) return;
        enteredRef.current = true;
        sheetHeight.value = targetHeight;
        translateY.value = withSpring(0, ENTER_SPRING);
        backdropOpacity.value = withTiming(1, { duration: 280 });
    }, [mounted, targetHeight, backdropOpacity, sheetHeight, translateY]);

    /**
     * Follow the step's height whenever it changes — switching step, or the same
     * step growing as content is added. This is what the old sheet lacked: it set
     * a height on transition and never revisited it.
     */
    useEffect(() => {
        if (!mounted || !enteredRef.current || targetHeight <= 0) return;
        if (Math.abs(sheetHeight.value - targetHeight) < 2) return;
        sheetHeight.value = withSpring(targetHeight, ENTER_SPRING);
    }, [mounted, targetHeight, sheetHeight]);


    // Android back steps back through the flow, and closes from the first step
    useEffect(() => {
        if (!mounted) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!onBackPressRef.current?.()) close();
            return true;
        });
        return () => sub.remove();
    }, [close, mounted]);

    const pan = useMemo(() => Gesture.Pan()
        .failOffsetX([-20, 20])
        .activeOffsetY([-10, 10])
        .onUpdate(e => { if (e.translationY > 0) translateY.value = e.translationY; })
        .onEnd(e => {
            if (e.translationY > 90 || e.velocityY > 500) runOnJS(close)();
            else translateY.value = withTiming(0, { duration: 220, easing: SETTLE_EASING });
        }), [close, translateY]);

    const sheetStyle = useAnimatedStyle(() => {
        /**
         * Keep the focused field above the keyboard, in step with it. The lift
         * and the height cap both follow the keyboard's live height frame by
         * frame; waiting for `keyboardDidShow` (all Android reports) made the
         * sheet jump after the keyboard had already slid in.
         */
        const lift = Math.max(0, keyboard.height.value - bottomGap.value);
        const cap = maxHeight - lift;
        return {
            /**
             * Until the step has been measured the sheet is left to size itself,
             * so its content can lay out and report a height. Pinning it to 0
             * first would deadlock: nothing to measure, so nothing ever opens.
             * The sheet is still off-screen then, so the auto-sized frame is unseen.
             */
            height: sheetHeight.value > 0 ? Math.min(sheetHeight.value, cap) : undefined,
            transform: [{ translateY: translateY.value - lift }],
        };
    });
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

    if (!mounted) return null;

    return (
        <View
            ref={rootRef}
            style={S.root}
            pointerEvents="box-none"
            onLayout={() => {
                // `measure`, not `measureInWindow`: on edge-to-edge Android the
                // latter is offset by the status bar, while the keyboard height
                // is measured from the bottom of the screen.
                rootRef.current?.measure((_x, _y, _w, h, _pageX, pageY) => {
                    bottomGap.value = Math.max(0, windowHeight - (pageY + h));
                });
            }}
        >
            <Animated.View style={[S.backdrop, backdropStyle]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={close}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                />
            </Animated.View>

            <View style={S.keyboardWrap} pointerEvents="box-none">
                <Animated.View style={[S.sheet, { maxHeight }, sheetStyle]}>
                        <View style={S.measureFill}>
                            <SheetMeasureContext.Provider value={reportHeight}>
                                <StepTransition stepKey={stepKey} direction={direction} stretch>
                                    {children}
                                </StepTransition>
                            </SheetMeasureContext.Provider>
                        </View>

                    {/* Drawn last so it sits over the content: while the sheet
                        grows, content that is briefly taller than the sheet
                        slides under the handle instead of over it. The dismiss
                        gesture lives here so scrolling a form or the QR
                        carousel cannot accidentally close the sheet. */}
                    <GestureDetector gesture={pan}>
                        <View style={S.dragRegion}>
                            <View style={S.handle} />
                        </View>
                    </GestureDetector>
                </Animated.View>
            </View>
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
    keyboardWrap: { width: '100%', justifyContent: 'flex-end' },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
    sheet: {
        width: '100%',
        /* Room for the handle strip, which is layered on top. */
        paddingTop: HANDLE_BLOCK_HEIGHT,
        /* Content is anchored to the bottom, where the action button is. While
           the sheet springs to a new step's height the footer stays put and the
           top edge moves, instead of a gap opening under the button. */
        justifyContent: 'flex-end',
        backgroundColor: SgateColors.card,
        borderTopLeftRadius: SgateRadius['2xl'],
        borderTopRightRadius: SgateRadius['2xl'],
        overflow: 'hidden',
    },
    dragRegion: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: SgateColors.card,
        height: HANDLE_BLOCK_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: SgateColors.border,
    },
    /** Lets a `fill` step stretch to the sheet's full height. */
    measureFill: { flex: 1 },
});
