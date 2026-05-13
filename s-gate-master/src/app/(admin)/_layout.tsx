import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { AdminTabBar } from '@/components/Sgate/AdminTabBar';
import { SgateColors } from '@/constants/Sgate-theme';

/**
 * Admin Layout Architecture
 * ─────────────────────────
 * Root: Stack (manages all navigation history)
 *   ├── "(tabs)" group → Tabs navigator (5 visible tabs)
 *   │    ├── index (Home)
 *   │    ├── gate-passes (Passes)
 *   │    ├── staff (Staff)
 *   │    ├── broadcast (Alerts)
 *   │    └── profile (Profile)
 *   ├── flats/* (Stack screen)
 *   ├── guards/* (Stack screen)
 *   ├── payments (Stack screen)
 *   ├── ... (all other internal screens)
 *
 * WHY: Previously everything was a Tab screen (with hidden tabs using href:null).
 * Tabs don't maintain a navigation stack — pressing back from a hidden tab would
 * reset to the initial tab (Home) instead of returning to the previous screen.
 * Now, internal screens are pushed onto a Stack, preserving proper back navigation.
 */

export default function AdminLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            {/* The tab navigator is one screen in the stack */}
            <Stack.Screen name="(tabs)" />

            {/* All internal screens pushed onto the stack */}
            <Stack.Screen name="all-tools" />
            <Stack.Screen name="flats" />
            <Stack.Screen name="guards" />
            <Stack.Screen name="gate-points" />
            <Stack.Screen name="gate-pass" />
            <Stack.Screen name="complaints" />
            <Stack.Screen name="approval-requests" />
            <Stack.Screen name="notices" />
            <Stack.Screen name="payments" />
            <Stack.Screen name="residents" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="onboarding-requests" />
            <Stack.Screen name="my-home" />
            <Stack.Screen name="emergencies" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="community" />
            <Stack.Screen name="elections" />
            <Stack.Screen name="my-dues" />
            <Stack.Screen name="my-passes" />
            <Stack.Screen name="vehicles" />
            <Stack.Screen name="sos-create" />
        </Stack>
    );
}
