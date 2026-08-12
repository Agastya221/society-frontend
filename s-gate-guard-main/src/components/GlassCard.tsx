import { clsx } from 'clsx';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
}

/**
 * Glassmorphism card component with blur effect and gradient overlay
 * Matches the design from the resident portal
 */
export function GlassCard({ children, className, intensity = 80 }: GlassCardProps) {
    return (
        <View className={clsx("overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-sm", className)}>
            <BlurView intensity={intensity} tint="light" className="absolute inset-0" />
            <LinearGradient
                colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']}
                className="absolute inset-0"
            />
            {children}
        </View>
    );
}
