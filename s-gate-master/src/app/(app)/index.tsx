import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const systemColor = colorScheme === 'dark' ? '#000000' : '#ffffff';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: systemColor }}>
            <View className="flex-1 bg-white dark:bg-black p-6 justify-center items-center gap-6">
                <Text variant="h1">Home Screen</Text>
                <Text variant="body" className="text-center">
                    Welcome to your production-ready Expo app.
                </Text>

                <Button
                    title="Go to Profile"
                    onPress={() => router.push('/(app)/profile')}
                    className="w-full"
                />
            </View>
        </SafeAreaView>
    );
}
