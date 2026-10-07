import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { SheetMeasureContext } from './SheetShell';

/** Matches the motion the sheet has always used. */
const SPRING_SMOOTH = { damping: 22, stiffness: 200, mass: 0.8 };

/** Forward enters from the right; back enters from the left, a little shallower. */
const ENTER_OFFSET = { forward: 0.06, back: -0.04 };
/** The outgoing step drifts the other way as it fades. */
const EXIT_OFFSET = { forward: -0.03, back: 0.03 };

/** The outgoing step clears quickly so the two are never both fully visible. */
const EXIT_DURATION = 130;
const ENTER_DELAY = 40;
const ENTER_FADE = 220;

export type StepDirection = 'forward' | 'back';

interface StepTransitionProps {
    /** Changing this runs the transition. */
    stepKey: string;
    direction: StepDirection;
    /**
     * Stretch to the parent's height. Only for steps that fill the sheet — a
     * step that sizes to its content must hug, or `flex: 1` collapses it to
     * nothing and the sheet has no height to measure.
     */
    stretch?: boolean;
    children: React.ReactNode;
}

interface LayerEntry {
    key: string;
    leaving: boolean;
    /** What the step last rendered — only used once it is leaving. */
    snapshot: React.ReactNode;
    /** False for the step the sheet opens on; the sheet's own entry covers it. */
    appear: boolean;
}

/**
 * Cross-fades and slides between steps.
 *
 * Every step is rendered as a keyed sibling in one list, so when a step starts
 * leaving it stays exactly where it is in the tree. The previous version moved
 * the outgoing step into a separate "leaving" slot, which React treats as a new
 * component: it remounted, so it flashed blank, reset its state (emptied forms,
 * "No contacts available"), collapsed its layout and replayed entry animations
 * while fading out — the stutter.
 *
 * Only the incoming step is in the layout, so the sheet measures the step it is
 * moving to and resizes while the slide runs. The outgoing step is pinned to
 * the bottom at the height it last had, so footers line up during the change.
 */
export function StepTransition({ stepKey, direction, stretch = false, children }: StepTransitionProps) {
    const [state, setState] = useState<{ key: string; layers: LayerEntry[] }>(() => ({
        key: stepKey,
        layers: [{ key: stepKey, leaving: false, snapshot: null, appear: false }],
    }));

    /** The children of the last render, captured when their step starts leaving. */
    const lastChildren = useRef(children);
    /** Each step's last in-layout height, so a leaving step keeps its size. */
    const heights = useRef<Record<string, number>>({});

    if (state.key !== stepKey) {
        // Derived-state update during render: React re-renders immediately,
        // before anything is committed, so no frame shows the old arrangement.
        const outgoing = lastChildren.current;
        setState({
            key: stepKey,
            layers: [
                ...state.layers
                    // Returning to a step that is still fading out takes it back.
                    .filter(l => l.key !== stepKey)
                    .map(l => (l.leaving ? l : { ...l, leaving: true, snapshot: outgoing })),
                { key: stepKey, leaving: false, snapshot: null, appear: true },
            ],
        });
    }
    // After commit, not during render: a render can run more than once before it
    // commits, and the snapshot must be what was actually on screen.
    useEffect(() => {
        lastChildren.current = children;
    });

    const removeLayer = (key: string) => {
        setState(prev => ({ ...prev, layers: prev.layers.filter(l => !(l.key === key && l.leaving)) }));
    };

    return (
        <>
            {state.layers.map(layer => (
                <Layer
                    key={layer.key}
                    layerKey={layer.key}
                    leaving={layer.leaving}
                    appear={layer.appear}
                    direction={direction}
                    stretch={stretch}
                    leavingHeight={heights.current[layer.key]}
                    onMeasure={h => { heights.current[layer.key] = h; }}
                    onExited={removeLayer}
                >
                    {/* The live step always renders from the current children, so
                        controlled inputs never see a stale value. */}
                    {layer.leaving ? layer.snapshot : children}
                </Layer>
            ))}
        </>
    );
}

interface LayerProps {
    layerKey: string;
    leaving: boolean;
    appear: boolean;
    direction: StepDirection;
    stretch: boolean;
    leavingHeight?: number;
    onMeasure: (height: number) => void;
    onExited: (key: string) => void;
    children: React.ReactNode;
}

function Layer({ layerKey, leaving, appear, direction, stretch, leavingHeight, onMeasure, onExited, children }: LayerProps) {
    const { width } = useWindowDimensions();

    const opacity = useSharedValue(appear ? 0 : 1);
    const x = useSharedValue(appear ? width * ENTER_OFFSET[direction] : 0);

    // Enter on mount, and again if the user comes back while it is fading out.
    useEffect(() => {
        if (leaving) {
            // Ease-out: the outgoing step drops most of its opacity immediately,
            // so its text is never legible on top of the incoming step's.
            opacity.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.out(Easing.cubic) }, finished => {
                if (finished) runOnJS(onExited)(layerKey);
            });
            x.value = withTiming(width * EXIT_OFFSET[direction], { duration: EXIT_DURATION });
            return;
        }
        if (opacity.value >= 1 && x.value === 0) return; // the opening step
        opacity.value = withDelay(ENTER_DELAY, withTiming(1, { duration: ENTER_FADE, easing: Easing.out(Easing.quad) }));
        x.value = withDelay(ENTER_DELAY, withSpring(0, SPRING_SMOOTH));
    // Only a change of role (entering ↔ leaving) should start an animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leaving]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateX: x.value }],
    }));

    const handleLayout = (e: LayoutChangeEvent) => {
        if (!leaving) onMeasure(e.nativeEvent.layout.height);
    };

    return (
        <Animated.View
            style={[
                leaving
                    ? [S.leaving, leavingHeight ? { height: leavingHeight } : S.leavingFill]
                    : stretch && S.fill,
                animatedStyle,
            ]}
            pointerEvents={leaving ? 'none' : 'auto'}
            onLayout={handleLayout}
        >
            {leaving ? (
                // A step on its way out must not resize the sheet.
                <SheetMeasureContext.Provider value={null}>{children}</SheetMeasureContext.Provider>
            ) : children}
        </Animated.View>
    );
}

const S = StyleSheet.create({
    /** Lets a `fill` step stretch inside the sheet. */
    fill: { flex: 1 },
    /**
     * Out of the layout, so only the incoming step drives the sheet's height.
     * Pinned to the bottom (where the footer is) at its own last height, so a
     * full-height step doesn't collapse to nothing while it fades.
     */
    leaving: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    leavingFill: { top: 0 },
});
