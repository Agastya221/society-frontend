import { Stack } from 'expo-router';

export default function AdminLayout() {
    return (
        <Stack screenOptions={{
            headerStyle: { 
                backgroundColor: '#fff',
            },
            headerShadowVisible: false,
            headerTintColor: '#000',
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { 
                backgroundColor: '#f4f4f5'
            }
        }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="flats" options={{ title: 'Flats & Residents', headerShown: false }} />
            <Stack.Screen name="guards" options={{ title: 'Guard Management' }} />
            <Stack.Screen name="gate-points" options={{ title: 'Gate Points' }} />
            <Stack.Screen name="gate-passes" options={{ headerShown: false }} />
            <Stack.Screen name="complaints" options={{ headerShown: false }} />
            <Stack.Screen name="approval-requests" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen name="notices" options={{ title: 'Notices & Announcements' }} />
            <Stack.Screen name="payments" options={{ title: 'Payments' }} />
            <Stack.Screen name="residents" options={{ title: 'Resident Management' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding-requests" options={{ headerShown: false }} />
        </Stack>
    );
}
