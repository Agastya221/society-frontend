'use no memo';
import React from 'react';
import { View } from 'react-native';
import Svg, {
    Circle,
    Defs,
    Ellipse,
    LinearGradient as SvgGradient,
    Path,
    Rect,
    Stop,
} from 'react-native-svg';

interface SgateBrandMarkProps {
    size?: number;
}

export function SgateBrandMark({ size = 42 }: SgateBrandMarkProps) {
    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                {/* Black rounded background */}
                <Rect width="40" height="40" rx="12" fill="#0D0F14" />

                {/* Shield body with gradient */}
                <Path
                    d="M20 6C20 6 8 11 8 20C8 29 13 35 20 38C27 35 32 29 32 20C32 11 20 6 20 6Z"
                    fill="url(#brandShieldGrad)"
                    stroke="#FFB800"
                    strokeWidth={0.8}
                    opacity={0.9}
                />

                {/* Gold star badge on top */}
                <Circle cx="20" cy="13" r="3.5" fill="#FFB800" />
                {/* Star detail */}
                <Path
                    d="M20 10L20.8 12L23 12.2L21.3 13.8L21.7 16L20 14.8L18.3 16L18.7 13.8L17 12.2L19.2 12Z"
                    fill="#FFFFFF"
                    opacity={0.9}
                />

                {/* Left eye - white with dark pupil */}
                <Ellipse cx="15.5" cy="22.5" rx="2.5" ry="3" fill="#FFFFFF" />
                <Circle cx="15.5" cy="22" r="1.3" fill="#0D0F14" />
                {/* Left eye highlight */}
                <Circle cx="16.5" cy="21" r="0.7" fill="#FFFFFF" opacity={0.8} />

                {/* Right eye - white with dark pupil */}
                <Ellipse cx="24.5" cy="22.5" rx="2.5" ry="3" fill="#FFFFFF" />
                <Circle cx="24.5" cy="22" r="1.3" fill="#0D0F14" />
                {/* Right eye highlight */}
                <Circle cx="25.5" cy="21" r="0.7" fill="#FFFFFF" opacity={0.8} />

                {/* Smile */}
                <Path
                    d="M17 28C17 28 18.5 30 20 30C21.5 30 23 28 23 28"
                    stroke="#0D0F14"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Cheek blush */}
                <Circle cx="13" cy="26" r="1.5" fill="#FFB800" opacity={0.15} />
                <Circle cx="27" cy="26" r="1.5" fill="#FFB800" opacity={0.15} />

                <Defs>
                    <SvgGradient id="brandShieldGrad" x1="20" y1="6" x2="20" y2="38">
                        <Stop offset="0" stopColor="#282C38" />
                        <Stop offset="1" stopColor="#0D0F14" />
                    </SvgGradient>
                </Defs>
            </Svg>
        </View>
    );
}
