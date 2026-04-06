import { Stack } from 'expo-router';
import { SgateColors, SgateFonts } from '@/constants/Sgate-theme';

export default function MyHomeLayout() {
    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: SgateColors.card },
            headerShadowVisible: false,
            headerTintColor: SgateColors.t1,
            headerTitleStyle: { fontFamily: SgateFonts.bold, fontSize: 17 },
            contentStyle: { backgroundColor: SgateColors.bg },
            animation: 'slide_from_right',
        }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="my-passes" options={{ headerShown: false }} />
            <Stack.Screen name="dues" options={{ headerShown: false }} />
        </Stack>
    );
}
