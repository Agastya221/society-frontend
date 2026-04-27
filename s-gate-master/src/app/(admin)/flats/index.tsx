import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, SectionList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListItem } from '../../../components/ListItem';
import { PrimaryButton } from '../../../components/PrimaryButton';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';

interface Flat {
    id: string;
    number: string;
    block: string;
    floor: string;
    ownerName: string;
    residentsCount: number;
    vehiclesCount: number;
}

export default function FlatsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore(s => s.user);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [flatNumber, setFlatNumber] = useState('');
    const [block, setBlock] = useState('');
    const [floor, setFloor] = useState('');

    // Fetch flats from API using society blocks
    useEffect(() => {
        const societyId = user?.societyId;
        if (!societyId) return;

        const loadFlats = async () => {
            try {
                const blocksRes = await api.get(
                    `/resident/onboarding/societies/${societyId}/blocks`
                );
                const blocks: { id: string; name: string }[] =
                    blocksRes.data?.data ?? [];

                const allFlats: Flat[] = [];
                await Promise.all(
                    blocks.map(async block => {
                        try {
                            const flatsRes = await api.get(
                                `/resident/onboarding/societies/${societyId}/blocks/${block.id}/flats`
                            );
                            const blockFlats = (flatsRes.data?.data ?? []).map(
                                (f: { id: string; number: string; floor?: number }) => ({
                                    id: f.id,
                                    number: f.number,
                                    block: block.name,
                                    floor: String(f.floor ?? ''),
                                    ownerName: '',
                                    residentsCount: 0,
                                    vehiclesCount: 0,
                                })
                            );
                            allFlats.push(...blockFlats);
                        } catch {
                            // skip failed block
                        }
                    })
                );
                setFlats(allFlats);
            } catch (err) {
                console.error('Failed to fetch flats:', err);
            }
        };

        loadFlats();
    }, [user?.societyId]);

    const filteredFlats = useMemo(() => {
        return flats.filter(f =>
            f.number.includes(search) ||
            f.ownerName.toLowerCase().includes(search.toLowerCase()) ||
            f.block.toLowerCase().includes(search.toLowerCase())
        );
    }, [flats, search]);

    const sections = useMemo(() => {
        const groups: Record<string, Flat[]> = {};
        filteredFlats.forEach(f => {
            const b = f.block.toUpperCase();
            if (!groups[b]) groups[b] = [];
            groups[b].push(f);
        });

        return Object.keys(groups).sort().map(blockKey => ({
            title: `${blockKey}-Block`,
            data: groups[blockKey].sort((a, b) => a.number.localeCompare(b.number))
        }));
    }, [filteredFlats]);

    const resetForm = () => {
        setFlatNumber('');
        setBlock('');
        setFloor('');
        setEditingId(null);
    };

    const handleEdit = (flat: Flat) => {
        setFlatNumber(flat.number);
        setBlock(flat.block);
        setFloor(flat.floor);
        setEditingId(flat.id);
        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Flat', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => setFlats(prev => prev.filter(f => f.id !== id))
            }
        ]);
    };

    const handleSave = () => {
        if (!flatNumber || !block) {
            Alert.alert('Error', 'Flat Number and Block are required');
            return;
        }

        if (editingId) {
            setFlats(prev => prev.map(f => f.id === editingId ? {
                ...f, number: flatNumber, block, floor
            } : f));
        } else {
            const newFlat: Flat = {
                id: Date.now().toString(),
                number: flatNumber,
                block,
                floor,
                ownerName: 'Unassigned',
                residentsCount: 0,
                vehiclesCount: 0
            };
            setFlats([...flats, newFlat]);
        }
        setModalVisible(false);
        resetForm();
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
            <View className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
                    <MaterialCommunityIcons name="magnify" size={20} color="#71717a" />
                    <TextInput
                        className="flex-1 ml-2 text-base text-zinc-900 dark:text-zinc-100"
                        placeholder="Search flats, blocks or owners..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#a1a1aa"
                    />
                </View>
                <PrimaryButton
                    title="+ Add Flat"
                    onPress={() => { resetForm(); setModalVisible(true); }}
                    className="mt-4"
                />
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
                renderSectionHeader={({ section: { title } }) => (
                    <View className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2">
                        <Text className="font-bold text-zinc-600 dark:text-zinc-300 uppercase text-sm">{title}</Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <View className="flex-row items-center bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 pr-4">
                        <View className="flex-1">
                            <ListItem
                                title={`Flat ${item.number}`}
                                subtitle={item.ownerName}
                                onPress={() => router.push(`/(admin)/flats/${item.id}` as any)}
                                showChevron={false}
                                className="border-b-0"
                            />
                        </View>
                        <View className="flex-row gap-4">
                            <TouchableOpacity onPress={() => handleEdit(item)}>
                                <MaterialCommunityIcons name="pencil-outline" size={18} color="#71717a" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View
                    style={{ paddingBottom: insets.bottom }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-6"
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
                            {editingId ? 'Edit Flat' : 'New Flat'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={24} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Flat Number *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            placeholder="e.g. 101"
                            value={flatNumber}
                            onChangeText={setFlatNumber}
                            placeholderTextColor="#a1a1aa"
                            keyboardType="default"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Block *</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-900 dark:text-white"
                            placeholder="e.g. A"
                            value={block}
                            onChangeText={setBlock}
                            placeholderTextColor="#a1a1aa"
                        />

                        <Text className="font-medium mb-2 text-zinc-700 dark:text-zinc-300">Floor</Text>
                        <TextInput
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 text-zinc-900 dark:text-white"
                            placeholder="e.g. 1"
                            value={floor}
                            onChangeText={setFloor}
                            placeholderTextColor="#a1a1aa"
                            keyboardType="numeric"
                        />

                        <PrimaryButton
                            title={editingId ? "Update Flat" : "Add Flat"}
                            onPress={handleSave}
                        />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
