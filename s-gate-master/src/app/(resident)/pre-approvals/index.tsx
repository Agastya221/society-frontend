import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui/Card';

// Mock data internal for now
const MOCK_PRE_APPROVALS = [
    { id: '1', name: 'Zomato Delivery', type: 'DELIVERY', validUntil: 'Today, 11:00 PM', isActive: true },
    { id: '2', name: 'Rahul (Friend)', type: 'GUEST', validUntil: 'Tomorrow, 8:00 PM', isActive: true },
    { id: '3', name: 'Amazon', type: 'DELIVERY', validUntil: 'Expired', isActive: false },
];

export default function PreApprovalsScreen() {
    const router = useRouter();
    const [items, setItems] = useState(MOCK_PRE_APPROVALS);

    const toggleSwitch = (id: string, currentValue: boolean) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, isActive: !currentValue } : item
        ));
    };

    const renderItem = ({ item }: { item: typeof MOCK_PRE_APPROVALS[0] }) => (
        <Card className="mb-3 p-4 flex-row items-center justify-between">
            <View className="flex-1">
                <Text className={`font-bold text-lg ${item.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                    {item.name}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-xs font-medium bg-gray-100 dark:bg-zinc-800 self-start px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                        {item.type}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-500">
                        • {item.validUntil}
                    </Text>
                </View>
            </View>
            <Switch
                trackColor={{ false: '#e4e4e7', true: '#c7d2fe' }}
                thumbColor={item.isActive ? '#4f46e5' : '#f4f4f5'}
                onValueChange={() => toggleSwitch(item.id, item.isActive)}
                value={item.isActive}
            />
        </Card>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                        <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Pre-Approvals</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(resident)/pre-approvals/create')} className="bg-indigo-600 h-9 w-9 rounded-full items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
                ListHeaderComponent={
                    <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4 px-1">
                        Pre-approved visitors can enter without calling you. You can toggle them off below.
                    </Text>
                }
            />
        </SafeAreaView>
    );
}
