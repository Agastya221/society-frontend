import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';

export default function CreatePreApprovalScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        date: new Date(),
        type: 'GUEST'
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSubmit = () => {
        router.back();
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="close" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">New Pre-Approval</Text>
            </View>

            <ScrollView className="flex-1 p-5">
                <Card className="p-5 gap-5 mb-6">
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visitor Name</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-gray-900 dark:text-white"
                            placeholder="e.g. Swiggy, Uber, or Friend's Name"
                            placeholderTextColor="#9ca3af"
                            value={formData.name}
                            onChangeText={t => setFormData({ ...formData, name: t })}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visitor Type</Text>
                        <View className="flex-row gap-2">
                            {['GUEST', 'DELIVERY', 'CAB'].map(type => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setFormData({ ...formData, type })}
                                    className={`px-4 py-2 rounded-lg border ${
                                        formData.type === type 
                                            ? 'bg-indigo-600 border-indigo-600' 
                                            : 'border-gray-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <Text className={`text-xs font-semibold ${
                                        formData.type === type ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    
                    <View>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Date</Text>
                        <TouchableOpacity 
                            onPress={() => setShowDatePicker(true)}
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 flex-row justify-between items-center"
                        >
                            <Text className="text-gray-900 dark:text-white">
                                {formData.date.toLocaleDateString()}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                        </TouchableOpacity>
                        
                        {/* 
                            Note: In a real app we'd use proper modal date picker handling for Android/iOS consistency.
                            For now, relying on standard behavior or fallback.
                        */}
                    </View>
                </Card>

                <PrimaryButton 
                    title="Add Pre-Approval" 
                    onPress={handleSubmit}
                    disabled={!formData.name.trim()}
                />
            </ScrollView>
        </SafeAreaView>
    );
}
