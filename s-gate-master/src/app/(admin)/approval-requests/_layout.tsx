import { Stack } from 'expo-router';

export default function ApprovalRequestsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="create" />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
