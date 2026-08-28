import { Stack } from 'expo-router';

export default function FlatsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
