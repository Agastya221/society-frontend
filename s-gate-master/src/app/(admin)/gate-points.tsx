import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Gate, MOCK_GATES, MOCK_GUARDS } from '../../data';

export default function GatePointsScreen() {
    const [gates, setGates] = useState<Gate[]>(MOCK_GATES);
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [gateName, setGateName] = useState('');
    const insets = useSafeAreaInsets();

    const toggleGate = (id: string) => {
        setGates(curr => curr.map(g => g.id === id ? { ...g, active: !g.active } : g));
    };

    // Derived state for guards count per gate
    // We recalculate this to support "Delete only if no guards assigned" check
    const getGuardCount = (gateId: string) => {
        // Mock logic: simply use the mocked count in data OR count from MOCK_GUARDS
        // Let's count from MOCK_GUARDS to be smarter
        return MOCK_GUARDS.filter(g => g.gateId === gateId).length; 
        // Note: MOCK_GATES in data has 'guardsAssigned', but dynamic is better.
    };

    const resetForm = () => {
        setGateName('');
        setEditingId(null);
    };

    const handleEdit = (gate: Gate) => {
        setGateName(gate.name);
        setEditingId(gate.id);
        setModalVisible(true);
    };

    const handleDelete = (gate: Gate) => {
        const guardCount = getGuardCount(gate.id);
        if (guardCount > 0) {
            Alert.alert('Cannot Delete', `This gate has ${guardCount} active guard(s). Reassign them first.`);
            return;
        }

        Alert.alert('Delete Gate', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => setGates(prev => prev.filter(g => g.id !== gate.id)) 
            }
        ]);
    };

    const handleSave = () => {
        if (!gateName.trim()) {
            Alert.alert('Error', 'Gate Name is required');
            return;
        }

        if (editingId) {
            setGates(prev => prev.map(g => g.id === editingId ? { ...g, name: gateName } : g));
        } else {
            const newGate: Gate = {
                id: Date.now().toString(),
                name: gateName,
                active: true,
                guardsAssigned: 0 // Initial
            };
            setGates([...gates, newGate]);
        }
        setModalVisible(false);
        resetForm();
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-4">
             <PrimaryButton 
                title="+ Add New Gate" 
                onPress={() => { resetForm(); setModalVisible(true); }}
                className="mb-4"
            />

            <FlatList
                data={gates}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
                renderItem={({ item }) => {
                    const guardCount = getGuardCount(item.id);
                    return (
                        <Card className="mb-3 p-5">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center gap-4">
                                    <View className={`p-3 rounded-full ${item.active ? 'bg-green-100' : 'bg-zinc-100'}`}>
                                        <Feather name="map-pin" size={24} color={item.active ? '#15803d' : '#a1a1aa'} />
                                    </View>
                                    <View>
                                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">{item.name}</Text>
                                        <Text className="text-zinc-500">{guardCount} Guards Assigned</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={item.active}
                                    onValueChange={() => toggleGate(item.id)}
                                    trackColor={{ false: '#767577', true: '#4f46e5' }}
                                    thumbColor={'#f4f3f4'}
                                />
                            </View>

                            <View className="flex-row justify-end gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                                <TouchableOpacity 
                                    className="flex-row items-center"
                                    onPress={() => handleEdit(item)}
                                >
                                    <Feather name="edit-2" size={16} color="#71717a" />
                                    <Text className="ml-1 text-zinc-600 dark:text-zinc-400 font-medium">Edit</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    className="flex-row items-center"
                                    onPress={() => handleDelete(item)}
                                >
                                    <Feather name="trash-2" size={16} color="#ef4444" />
                                    <Text className="ml-1 text-red-600 font-medium">Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    );
                }}
            />

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View 
                    style={{ paddingBottom: insets.bottom }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                            {editingId ? 'Edit Gate' : 'New Gate'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Feather name="x" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Gate Name</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 text-zinc-900 dark:text-white"
                            placeholder="e.g. Main Gate (Entry)"
                            value={gateName}
                            onChangeText={setGateName}
                            placeholderTextColor="#a1a1aa"
                        />
                        <PrimaryButton 
                            title={editingId ? "Update Gate" : "Add Gate"} 
                            onPress={handleSave} 
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
