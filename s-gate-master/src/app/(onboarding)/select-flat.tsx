import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';

interface Block {
    id: string;
    name: string;
}

interface Flat {
    id: string;
    number: string;
    floor: number;
    type: string;
}

type ResidentType = 'OWNER' | 'TENANT';

export default function SelectFlatScreen() {
    const router = useRouter();
    const { societyId, societyName } = useLocalSearchParams<{ societyId: string; societyName: string }>();

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
    const [residentType, setResidentType] = useState<ResidentType | null>(null);
    const [loadingBlocks, setLoadingBlocks] = useState(true);
    const [loadingFlats, setLoadingFlats] = useState(false);

    useEffect(() => {
        fetchBlocks();
    }, []);

    useEffect(() => {
        if (selectedBlock) {
            setSelectedFlat(null);
            setResidentType(null);
            fetchFlats(selectedBlock.id);
        }
    }, [selectedBlock]);

    const fetchBlocks = async () => {
        try {
            const res = await api.get(`/resident/onboarding/societies/${societyId}/blocks`);
            setBlocks(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch blocks:', err);
        } finally {
            setLoadingBlocks(false);
        }
    };

    const fetchFlats = async (blockId: string) => {
        setLoadingFlats(true);
        try {
            const res = await api.get(`/resident/onboarding/societies/${societyId}/blocks/${blockId}/flats`);
            setFlats(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch flats:', err);
            setFlats([]);
        } finally {
            setLoadingFlats(false);
        }
    };

    const canContinue = selectedBlock && selectedFlat && residentType;

    const handleContinue = () => {
        if (!canContinue) return;
        router.push({
            pathname: '/(onboarding)/documents',
            params: {
                societyId: societyId!,
                blockId: selectedBlock!.id,
                flatId: selectedFlat!.id,
                residentType: residentType!,
                societyName: societyName!,
            },
        });
    };

    if (loadingBlocks) {
        return (
            <SafeAreaView edges={['top']} className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-xl">Select Your Flat</Text>
                        <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>{societyName}</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Step 1: Block Selection */}
                <View className="px-5 pt-5">
                    <View className="flex-row items-center gap-2 mb-3">
                        <View className="w-6 h-6 bg-indigo-600 rounded-full items-center justify-center">
                            <Text className="text-white text-xs font-bold">1</Text>
                        </View>
                        <Text className="text-gray-900 font-semibold text-base">Select Block / Tower</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {blocks.map((block) => (
                            <TouchableOpacity
                                key={block.id}
                                onPress={() => setSelectedBlock(block)}
                                className={`px-5 py-3 rounded-xl border-2 ${
                                    selectedBlock?.id === block.id
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <Text className={`font-bold text-sm ${
                                    selectedBlock?.id === block.id ? 'text-white' : 'text-gray-700'
                                }`}>
                                    {block.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {blocks.length === 0 && (
                        <Text className="text-gray-400 text-sm text-center py-6">No blocks found in this society.</Text>
                    )}
                </View>

                {/* Step 2: Flat Selection */}
                {selectedBlock && (
                    <View className="px-5 pt-6">
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="w-6 h-6 bg-indigo-600 rounded-full items-center justify-center">
                                <Text className="text-white text-xs font-bold">2</Text>
                            </View>
                            <Text className="text-gray-900 font-semibold text-base">Select Flat</Text>
                        </View>

                        {loadingFlats ? (
                            <View className="items-center py-8">
                                <ActivityIndicator size="small" color="#4f46e5" />
                            </View>
                        ) : flats.length === 0 ? (
                            <Text className="text-gray-400 text-sm text-center py-6">No flats available in this block.</Text>
                        ) : (
                            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                                {flats.map((flat) => (
                                    <TouchableOpacity
                                        key={flat.id}
                                        onPress={() => {
                                            setSelectedFlat(flat);
                                            setResidentType(null);
                                        }}
                                        className={`rounded-xl border-2 p-3 items-center ${
                                            selectedFlat?.id === flat.id
                                                ? 'bg-indigo-50 border-indigo-600'
                                                : 'bg-white border-gray-200'
                                        }`}
                                        style={{ width: '30%', minWidth: 90 }}
                                    >
                                        <Text className={`font-bold text-base ${
                                            selectedFlat?.id === flat.id ? 'text-indigo-700' : 'text-gray-900'
                                        }`}>
                                            {flat.number}
                                        </Text>
                                        <Text className="text-gray-400 text-xs mt-1">Floor {flat.floor}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Step 3: Resident Type */}
                {selectedFlat && (
                    <View className="px-5 pt-6">
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="w-6 h-6 bg-indigo-600 rounded-full items-center justify-center">
                                <Text className="text-white text-xs font-bold">3</Text>
                            </View>
                            <Text className="text-gray-900 font-semibold text-base">I am a...</Text>
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setResidentType('OWNER')}
                                className={`flex-1 rounded-2xl border-2 p-4 items-center ${
                                    residentType === 'OWNER'
                                        ? 'bg-indigo-50 border-indigo-600'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
                                    residentType === 'OWNER' ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                    <Feather name="key" size={22} color={residentType === 'OWNER' ? '#4f46e5' : '#9ca3af'} />
                                </View>
                                <Text className={`font-bold ${
                                    residentType === 'OWNER' ? 'text-indigo-700' : 'text-gray-700'
                                }`}>Owner</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setResidentType('TENANT')}
                                className={`flex-1 rounded-2xl border-2 p-4 items-center ${
                                    residentType === 'TENANT'
                                        ? 'bg-indigo-50 border-indigo-600'
                                        : 'bg-white border-gray-200'
                                }`}
                            >
                                <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${
                                    residentType === 'TENANT' ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}>
                                    <Feather name="file-text" size={22} color={residentType === 'TENANT' ? '#4f46e5' : '#9ca3af'} />
                                </View>
                                <Text className={`font-bold ${
                                    residentType === 'TENANT' ? 'text-indigo-700' : 'text-gray-700'
                                }`}>Tenant</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Continue Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 pb-8">
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!canContinue}
                    className={`rounded-2xl py-4 items-center ${canContinue ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    activeOpacity={0.8}
                >
                    <Text className={`font-bold text-base ${canContinue ? 'text-white' : 'text-gray-400'}`}>
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
