import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { MOCK_FAMILY } from '../../../mocks/family';

export default function FamilyScreen() {
    const router = useRouter();

    const handleInvite = async () => {
        try {
            await Share.share({
                message: 'Join our home on S-Gate App! Use invite code: 882910',
            });
        } catch (error) {
            console.log(error);
        }
    };

    const renderItem = ({ item }: { item: typeof MOCK_FAMILY[0] }) => (
        <Card className="mb-3 p-4 flex-row items-center gap-4">
             <View className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                 <Text className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{item.name[0]}</Text>
            </View>
            <View className="flex-1">
                <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.name}</Text>
                    {item.isPrimary && (
                        <View className="bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                            <Text className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Primary</Text>
                        </View>
                    )}
                </View>
                <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase mt-0.5">{item.role}</Text>
                <Text className="text-gray-400 text-xs mt-1">{item.phone}</Text>
            </View>
            <TouchableOpacity className="p-2">
                <Ionicons name="settings-outline" size={20} color="#9ca3af" />
            </TouchableOpacity>
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">My Family</Text>
                </View>
                <TouchableOpacity onPress={handleInvite} className="bg-indigo-600 h-9 w-9 rounded-full items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Ionicons name="person-add" size={20} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={MOCK_FAMILY}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
                ListFooterComponent={
                    <View className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-500/30">
                        <View className="flex-row gap-3 mb-2">
                            <Ionicons name="information-circle" size={24} className="text-indigo-600 dark:text-indigo-400" />
                            <Text className="font-bold text-indigo-900 dark:text-indigo-200 flex-1">Did you know?</Text>
                        </View>
                        <Text className="text-indigo-800 dark:text-indigo-300 text-sm leading-5">
                            Family members can approve gate entries and get notifications. Add them by tapping the + button above.
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}
