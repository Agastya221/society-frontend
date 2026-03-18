import clsx from 'clsx';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, View } from 'react-native';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
}

/**
 * Platform-aware glassmorphism card.
 * - iOS: Uses native BlurView (UIVisualEffectView) for real blur.
 * - Android: Falls back to semi-transparent white overlay to avoid
 *   "Software rendering doesn't support hardware bitmaps" crash.
 *   BlurView on Android forces software rendering which conflicts
 *   with any elevation/shadow in the view hierarchy.
 */
export function GlassCard({ children, className, intensity = 80 }: GlassCardProps) {
    return (
        <View className={clsx("overflow-hidden rounded-3xl border border-white/60 bg-white/40", className)}>
            {Platform.OS === 'ios' ? (
                <>
                    <BlurView intensity={intensity} tint="light" className="absolute inset-0" />
                    <LinearGradient
                        colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']}
                        className="absolute inset-0"
                    />
                </>
            ) : (
                <View
                    className="absolute inset-0 rounded-3xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.88)' }}
                />
            )}
            {children}
        </View>
    );
}
