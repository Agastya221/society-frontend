import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { AdminTabBar } from '@/components/Sgate/AdminTabBar';

/**
 * Admin Tab Bar Layout
 * ────────────────────
 * This layout ONLY manages the 5 visible bottom tabs.
 * All other (internal) screens are handled by the parent Stack in (admin)/_layout.tsx.
 */
export default function AdminTabsLayout() {
    return (
        <Tabs
            tabBar={(props) => <AdminTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-outline" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="gate-passes"
                options={{
                    title: 'Passes',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="staff"
                options={{
                    title: 'Staff',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="briefcase-outline" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="broadcast"
                options={{
                    title: 'Alerts',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="bullhorn-outline" size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-outline" size={22} color={color} />,
                }}
            />
        </Tabs>
    );
}
