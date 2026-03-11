import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Text } from "@/components/Text";
import { useAuthStore } from "@/store/useAuthStore";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
    const { user, logout } = useAuthStore();
    const { colorScheme } = useColorScheme();
    const systemColor = colorScheme === 'dark' ? '#000000' : '#ffffff';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: systemColor }}>
            <View className="flex-1 bg-gray-50 dark:bg-black p-6">
                <Text variant="h1" className="mb-6">Profile</Text>

                <Card className="mb-6">
                    <View className="gap-2">
                        <Text variant="h3">{user?.name}</Text>
                        <Text variant="body" className="text-gray-500">{user?.email}</Text>
                    </View>
                </Card>

                <Button title="Logout" variant="outline" onPress={logout} />
            </View>
        </SafeAreaView>
    );
}
