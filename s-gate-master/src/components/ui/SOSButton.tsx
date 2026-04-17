import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
    Easing,
    cancelAnimation,
    interpolateColor,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { SgateFonts } from '../../constants/Sgate-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
    onTrigger: () => void;
    holdDuration?: number;
    disabled?: boolean;
};

const SIZE = 125;
const RING_SIZE = SIZE + 30; // 155
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SOSButton({ onTrigger, holdDuration = 2000, disabled = false }: Props) {
    const [state, setState] = useState<'idle' | 'pressing' | 'success'>('idle');

    // Animations
    const progress = useSharedValue(0); // 0 to 1
    const scale = useSharedValue(1);
    const ringOpacity = useSharedValue(0);

    // Timers
    const holdTimer = useRef<NodeJS.Timeout | null>(null);
    const hapticInterval = useRef<NodeJS.Timeout | null>(null);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (holdTimer.current) clearTimeout(holdTimer.current);
            if (hapticInterval.current) clearInterval(hapticInterval.current);
        };
    }, []);

    const handlePressIn = useCallback(() => {
        if (disabled || state === 'success') return;

        setState('pressing');

        // 1. Light vibration on start
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 2. Start Animations
        scale.value = withSpring(1.05, { damping: 15, stiffness: 200 });
        ringOpacity.value = withTiming(1, { duration: 150 });
        progress.value = withTiming(1, { duration: holdDuration, easing: Easing.linear });

        // 3. Start Haptic Pulses every 500ms
        hapticInterval.current = setInterval(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 500);

        // 4. Start Success Timer
        holdTimer.current = setTimeout(() => {
            if (hapticInterval.current) clearInterval(hapticInterval.current);
            handleSuccess();
        }, holdDuration);

    }, [disabled, state, holdDuration]);

    const handlePressOut = useCallback(() => {
        if (disabled || state === 'success') return;

        // Released early -> Cancel
        if (holdTimer.current) clearTimeout(holdTimer.current);
        if (hapticInterval.current) clearInterval(hapticInterval.current);

        setState('idle');

        // Cancel animations and revert
        cancelAnimation(progress);
        progress.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        ringOpacity.value = withTiming(0, { duration: 300 });

        // Cancel haptic vibration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, [disabled, state]);

    const handleSuccess = useCallback(() => {
        setState('success');

        // Strong vibration on success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Success animation
        scale.value = withSequence(
            withSpring(1.15),
            withSpring(1)
        );
        progress.value = 1;

        // Trigger action
        onTrigger();
    }, [onTrigger]);

    // Animated Styles
    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowColor: state === 'pressing' ? '#ef4444' : '#000',
        shadowOpacity: state === 'pressing' ? 0.6 : 0.3,
        shadowRadius: state === 'pressing' ? 20 : 10,
    }));

    const svgStyle = useAnimatedStyle(() => ({
        opacity: ringOpacity.value,
        transform: [{ rotate: '-90deg' }],
    }));

    const animatedRingProps = useAnimatedProps(() => {
        return {
            strokeDashoffset: CIRCUMFERENCE - progress.value * CIRCUMFERENCE,
            stroke: interpolateColor(progress.value, [0, 1], ['#ef4444', '#dc2626']),
        };
    });

    return (
        <View className="items-center justify-center relative w-[180px] h-[180px]">
            {/* SVG Progress Ring */}
            <Animated.View style={svgStyle} className="absolute">
                <Svg width={RING_SIZE} height={RING_SIZE}>
                    {/* Background Track (Subtle Red/Grey) */}
                    <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RADIUS}
                        stroke="#f3f4f6"
                        strokeWidth={STROKE_WIDTH}
                        fill="none"
                    />
                    <AnimatedCircle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={CIRCUMFERENCE}
                        animatedProps={animatedRingProps}
                        fill="none"
                        strokeLinecap="round"
                    />
                </Svg>
            </Animated.View>

            {/* Main Button */}
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                className="z-50 items-center justify-center relative"
                accessibilityLabel="Emergency SOS button"
                accessibilityHint={`Hold for ${holdDuration / 1000} seconds to send emergency alert`}
                accessibilityRole="button"
            >
                <Animated.View
                    style={[animatedButtonStyle]}
                    className="w-[125px] h-[125px] rounded-full bg-red-500 items-center justify-center border-[4px] border-white overflow-hidden shadow-2xl"
                >
                    <LinearGradient
                        colors={state === 'success' ? ['#ef4444', '#b91c1c'] : ['#ff6b6b', '#ef4444', '#b91c1c']}
                        className="absolute inset-0"
                    />

                    {/* Glass Gloss Overlay */}
                    <View className="absolute top-0 left-2 w-24 h-10 bg-white/20 rounded-full rotate-[-15deg] opacity-60" />

                    <Text
                        className="text-white text-3xl font-black tracking-widest leading-none mt-2"
                        style={{ fontFamily: SgateFonts.extrabold }}
                    >
                        SOS
                    </Text>
                    <Text
                        className="text-white/90 text-[9px] font-bold mt-1 uppercase tracking-wider"
                        style={{ fontFamily: SgateFonts.bold }}
                    >
                        {state === 'success' ? 'TRIGGERED' : state === 'pressing' ? 'HOLDING...' : 'HOLD 2 SEC'}
                    </Text>
                </Animated.View>
            </Pressable>
        </View>
    );
}
