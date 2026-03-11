import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Card } from '../../../components/Card';
import { ListItem } from '../../../components/ListItem';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { MOCK_FLATS, MOCK_PAYMENTS, MOCK_RESIDENTS } from '../../../data';

export default function FlatDetailsScreen() {
    const { id } = useLocalSearchParams();
    const flat = MOCK_FLATS.find(f => f.id === id);
    const residents = MOCK_RESIDENTS.filter(r => r.flatId === id);
    const payment = MOCK_PAYMENTS.find(p => p.flatNumber === flat?.number);

    if (!flat) return <View className="flex-1 items-center justify-center"><Text>Flat not found</Text></View>;

    return (
        <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-4">
            <Card className="mb-6">
                <View className="flex-row justify-between items-start mb-4">
                    <View>
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Flat {flat.number}</Text>
                        <Text className="text-zinc-500">Block {flat.block}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-lg font-semibold text-zinc-900 dark:text-white">{flat.ownerName}</Text>
                        <Text className="text-purple-600 text-sm font-medium">Owner</Text>
                    </View>
                </View>

                <View className="flex-row gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <View className="flex-1">
                        <Text className="text-zinc-500 text-xs uppercase mb-1">Payment Status</Text>
                        <Text className={`font-bold ${payment?.status === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                            {payment?.status || 'N/A'}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-zinc-500 text-xs uppercase mb-1">Vehicles</Text>
                        <Text className="font-bold text-zinc-900 dark:text-white">{flat.vehiclesCount}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-zinc-500 text-xs uppercase mb-1">Residents</Text>
                        <Text className="font-bold text-zinc-900 dark:text-white">{flat.residentsCount}</Text>
                    </View>
                </View>
            </Card>

            <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Residents</Text>
            <View className="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden mb-6">
                {residents.map((resident, index) => (
                    <ListItem
                        key={resident.id}
                        title={resident.name}
                        subtitle={`${resident.type} • ${resident.mobile}`}
                        showChevron={false}
                        className={index === residents.length - 1 ? 'border-b-0' : ''}
                    />
                ))}
                {residents.length === 0 && <Text className="p-4 text-zinc-500 italic">No residents listed</Text>}
            </View>

            <PrimaryButton title="Invite New Resident" onPress={() => { }} className="mb-4" />
            <PrimaryButton title="View Entry History" variant="secondary" onPress={() => { }} />

        </ScrollView>
    );
}
