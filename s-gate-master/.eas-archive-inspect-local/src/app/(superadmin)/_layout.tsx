import { Stack } from 'expo-router';
export default function SuperAdminLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="requests/index" />
            <Stack.Screen name="requests/[id]" />
        </Stack>
    );
}
