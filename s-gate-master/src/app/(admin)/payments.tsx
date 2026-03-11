import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { ListItem } from '../../components/ListItem';
import { MOCK_PAYMENTS } from '../../data/mockData';

export default function PaymentsScreen() {
    const [payments, setPayments] = useState(MOCK_PAYMENTS);

    const stats = {
        collected: payments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0),
        pending: payments.filter(p => p.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0),
        overdue: payments.filter(p => p.status === 'Overdue').reduce((acc, curr) => acc + curr.amount, 0),
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-4">
            {/* Overview Cards */}
            <View className="flex-row gap-3 mb-6">
                <View className="flex-1 bg-green-500 p-4 rounded-xl shadow-sm">
                    <Text className="text-green-100 font-medium text-xs uppercase mb-1">Collected</Text>
                    <Text className="text-white text-xl font-bold">₹{stats.collected.toLocaleString()}</Text>
                </View>
                <View className="flex-1 bg-orange-500 p-4 rounded-xl shadow-sm">
                    <Text className="text-orange-100 font-medium text-xs uppercase mb-1">Pending</Text>
                    <Text className="text-white text-xl font-bold">₹{stats.pending.toLocaleString()}</Text>
                </View>
            </View>

            <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Recent Transactions</Text>
            <FlatList
                data={payments}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <ListItem
                        title={`Flat ${item.flatNumber}`}
                        subtitle={`Due: ${item.dueDate}`}
                        rightElement={
                            <View className="items-end">
                                <Text className="font-bold text-zinc-900 dark:text-white">₹{item.amount}</Text>
                                <Text className={`text-xs font-bold ${item.status === 'Paid' ? 'text-green-600' :
                                        item.status === 'Overdue' ? 'text-red-600' : 'text-orange-600'
                                    }`}>
                                    {item.status}
                                </Text>
                            </View>
                        }
                        showChevron={false}
                        className="mb-2 rounded-xl border-b-0"
                    />
                )}
            />
        </View>
    );
}
