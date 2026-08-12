import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { AdminTabBar } from '@/components/Sgate/AdminTabBar';
import { SgateColors } from '@/constants/Sgate-theme';

export default function AdminTabsLayout() {
    return (
        <Tabs
            tabBar={(props) => <AdminTabBar {...props} />}
            backBehavior="history"
            screenOptions={{
                headerShown: false,
                animation: 'none',
                sceneStyle: { backgroundColor: SgateColors.bg },
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

            {/* Hidden screens (escaped the tab bar UI, but maintain the bottom bar shell) */}
            <Tabs.Screen name="all-tools" options={{ href: null }} />
            <Tabs.Screen name="flats" options={{ href: null }} />
            <Tabs.Screen name="guards" options={{ href: null }} />
            <Tabs.Screen name="gate-points" options={{ href: null }} />
            <Tabs.Screen name="gate-pass" options={{ href: null }} />
            <Tabs.Screen name="complaints" options={{ href: null }} />
            <Tabs.Screen name="approval-requests" options={{ href: null }} />
            <Tabs.Screen name="notices" options={{ href: null }} />
            <Tabs.Screen name="payments" options={{ href: null }} />
            <Tabs.Screen name="residents" options={{ href: null }} />
            <Tabs.Screen name="settings" options={{ href: null }} />
            <Tabs.Screen name="onboarding-requests" options={{ href: null }} />
            <Tabs.Screen name="emergencies" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="community" options={{ href: null }} />
            <Tabs.Screen name="elections" options={{ href: null }} />
            <Tabs.Screen name="vehicles" options={{ href: null }} />
            <Tabs.Screen name="sos-create" options={{ href: null }} />
        </Tabs>
    );
}
