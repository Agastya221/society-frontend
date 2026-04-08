'use no memo';
import React from 'react';
import { View } from 'react-native';
import Svg, {
    Defs,
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
                {/* Modern vibrant yellow/gold background */}
                <Rect width="40" height="40" rx="12" fill="url(#brandBgGrad)" />

                {/* S Letter mark - clean, modern, white, looks like an S/shield/gate hybrid */}
                <Path
                    d="M26 15 C26 12 23 11 20 11 C17 11 14 12 14 15 C14 19 26 19 26 23 C26 26 23 27 20 27 C17 27 14 26 14 23"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Subtle top right accent/badge */}
                <Rect x="26" y="8" width="6" height="6" rx="3" fill="#FFFFFF" opacity={0.9} />

                <Defs>
                    <SvgGradient id="brandBgGrad" x1="0" y1="0" x2="40" y2="40">
                        <Stop offset="0" stopColor="#FFD34E" />
                        <Stop offset="1" stopColor="#E5A500" />
                    </SvgGradient>
                </Defs>
            </Svg>
        </View>
    );
}
