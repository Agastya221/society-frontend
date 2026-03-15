import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';

interface Society {
    id: string;
    name: string;
    address: string;
    city: string;
    totalFlats: number;
}

const CITIES = ['All Cities', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Other'];

export default function SocietySearchScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [city, setCity] = useState('All Cities');
    const [societies, setSocieties] = useState<Society[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchSocieties = useCallback(async (searchTerm: string, cityFilter: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (cityFilter && cityFilter !== 'All Cities') params.city = cityFilter;

            const res = await api.get('/api/v1/resident/onboarding/societies', { params });
            setSocieties(res.data?.data ?? []);
        } catch (err) {
            console.error('Failed to fetch societies:', err);
            setSocieties([]);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchSocieties('', 'All Cities');
    }, []);

    // Debounced search
    useEffect(() => {
        if (initialLoad) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSocieties(search, city);
        }, 500);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search, city]);

    const renderSocietyCard = ({ item }: { item: Society }) => (
        <TouchableOpacity
            onPress={() => router.push({
                pathname: '/(onboarding)/select-flat',
                params: { societyId: item.id, societyName: item.name },
            })}
            className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
            activeOpacity={0.7}
        >
            <View className="flex-row items-start gap-3">
                <View className="w-12 h-12 bg-indigo-100 rounded-xl items-center justify-center mt-0.5">
                    <Feather name="home" size={22} color="#4f46e5" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
                    <View className="flex-row items-center gap-1 mt-1">
                        <Feather name="map-pin" size={12} color="#9ca3af" />
                        <Text className="text-gray-500 text-sm flex-1" numberOfLines={1}>{item.address}</Text>
                    </View>
                    <View className="flex-row items-center gap-4 mt-2">
                        <View className="flex-row items-center gap-1">
                            <Feather name="map" size={12} color="#6366f1" />
                            <Text className="text-indigo-600 text-xs font-medium">{item.city}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Feather name="grid" size={12} color="#6366f1" />
                            <Text className="text-indigo-600 text-xs font-medium">{item.totalFlats} flats</Text>
                        </View>
                    </View>
                </View>
                <Feather name="chevron-right" size={20} color="#d1d5db" />
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => {
        if (loading || initialLoad) return null;
        return (
            <View className="items-center justify-center py-16 px-6">
                <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                    <Feather name="search" size={36} color="#d1d5db" />
                </View>
                <Text className="text-gray-700 font-semibold text-lg mb-2">No societies found</Text>
                <Text className="text-gray-400 text-center text-sm mb-6">
                    Try a different search term or city filter.
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/(onboarding)/register-society')}
                    className="bg-indigo-600 px-6 py-3 rounded-xl"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-sm">Register My Society</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
                <View className="flex-row items-center gap-3 mb-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-bold text-xl">Find Your Society</Text>
                        <Text className="text-gray-400 text-xs mt-0.5">Search by name or city</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1 flex-row items-center gap-2 mb-3">
                    <Feather name="search" size={18} color="#9ca3af" />
                    <TextInput
                        className="flex-1 text-gray-900 text-base"
                        placeholder="Search societies..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Feather name="x-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* City Filter Chips */}
                <FlatList
                    data={CITIES}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setCity(item)}
                            className={`px-4 py-2 rounded-full ${
                                city === item ? 'bg-indigo-600' : 'bg-gray-100'
                            }`}
                        >
                            <Text className={`text-sm font-medium ${
                                city === item ? 'text-white' : 'text-gray-600'
                            }`}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Results */}
            {initialLoad ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={societies}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSocietyCard}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        loading && !initialLoad ? (
                            <View className="items-center py-3">
                                <ActivityIndicator size="small" color="#4f46e5" />
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}
