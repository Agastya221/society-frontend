import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function SettingsScreen() {
    const [isLoading, setIsLoading] = useState(false);
    const [fee, setFee] = useState('5000');

    const handleSave = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            Alert.alert('Success', 'Settings saved successfully');
        }, 1000);
    };

    return (
        <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-4">
            <View className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6">
                <Text className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Society Information</Text>

                <View className="mb-4">
                    <Text className="text-sm font-medium text-zinc-500 mb-1">Society Name</Text>
                    <TextInput
                        value="Green Valley Heights"
                        editable={false}
                        className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl text-zinc-500 dark:text-zinc-400"
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-sm font-medium text-zinc-500 mb-1">Address</Text>
                    <TextInput
                        value="Sector 62, Noida, UP"
                        editable={false}
                        className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl text-zinc-500 dark:text-zinc-400"
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-1">Monthly Maintenance Fee (₹)</Text>
                    <TextInput
                        value={fee}
                        onChangeText={setFee}
                        keyboardType="numeric"
                        className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-4 rounded-xl text-zinc-900 dark:text-white font-bold"
                    />
                </View>

                <PrimaryButton title="Save Changes" onPress={handleSave} loading={isLoading} />
            </View>

            <Text className="text-center text-zinc-400 text-xs">App Version 1.0.0 (Build 42)</Text>
        </ScrollView>
    );
}
