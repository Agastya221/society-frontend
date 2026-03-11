import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createEmergency, EmergencyType } from '../../../services/emergency';

const EMERGENCY_TYPES: { type: EmergencyType; label: string; icon: string; color: string }[] = [
    { type: 'MEDICAL', label: 'Medical Emergency', icon: 'medkit', color: 'bg-red-500' },
    { type: 'FIRE', label: 'Fire Alert', icon: 'flame', color: 'bg-orange-500' },
    { type: 'SECURITY', label: 'Security Threat', icon: 'shield', color: 'bg-slate-800' },
    { type: 'LIFT_STUCK', label: 'Lift Stuck', icon: 'warning', color: 'bg-yellow-500' },
    { type: 'ANIMAL_THREAT', label: 'Animal Threat', icon: 'paw', color: 'bg-brown-600' }, // Custom color handling needed or use approximation
    { type: 'OTHER', label: 'Other', icon: 'alert-circle', color: 'bg-gray-500' },
];

export default function CreateEmergencyScreen() {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [locationStatus, setLocationStatus] = useState<'fetching' | 'success' | 'error' | 'idle'>('idle');

    useEffect(() => {
        (async () => {
             setLocationStatus('fetching');
             try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    setLocationStatus('error');
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
                setLocationStatus('success');
             } catch (error) {
                 console.log('Error fetching location:', error);
                 setLocationStatus('error');
             }
        })();
    }, []);

    const handleSubmit = async () => {
        if (!selectedType) {
            Alert.alert('Selection Required', 'Please select an emergency type.');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Description Required', 'Please provide a brief description of the emergency.');
            return;
        }

        setIsLoading(true);

        try {
            await createEmergency({
                type: selectedType,
                description: description.trim(),
                location: location ? `${location.lat},${location.lng}` : undefined,
            });

            Alert.alert('🚨 Alert Sent!', 'Guards and Admins have been notified.', [
                { text: 'OK', onPress: () => router.replace('/(resident)/emergency') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to raise alert');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="close" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-red-600">Raise Emergency</Text>
            </View>

            <ScrollView className="flex-1 p-5">
                <Text className="text-gray-500 mb-6 text-center">
                    Select the type of emergency and provide details. This will immediately notify all on-duty guards.
                </Text>

                <Text className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider">
                    Emergency Type
                </Text>
                
                <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
                    {EMERGENCY_TYPES.map((item) => (
                        <TouchableOpacity
                            key={item.type}
                            onPress={() => setSelectedType(item.type)}
                            className={`w-[48%] p-4 rounded-xl border-2 items-center gap-3 ${
                                selectedType === item.type 
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                                    : 'border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800'
                            }`}
                        >
                            <View className={`h-12 w-12 rounded-full items-center justify-center ${item.color}`}>
                                <Ionicons name={item.icon as any} size={24} color="white" />
                            </View>
                            <Text className={`font-bold text-center ${
                                selectedType === item.type ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider">
                    Description / Situation
                </Text>
                <TextInput
                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-gray-900 dark:text-gray-100 min-h-[120px] text-lg"
                    placeholder="Describe the situation briefly..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />

                {/* Location Status Indicator */}
                <View className="flex-row items-center gap-2 mt-4 justify-center">
                    {locationStatus === 'fetching' && (
                        <>
                            <ActivityIndicator size="small" color="#6b7280" />
                            <Text className="text-xs text-gray-500">Fetching location...</Text>
                        </>
                    )}
                     {locationStatus === 'success' && (
                        <>
                            <Ionicons name="location" size={14} color="#16a34a" />
                            <Text className="text-xs text-green-600">Location attached</Text>
                        </>
                    )}
                     {locationStatus === 'error' && (
                        <>
                            <Ionicons name="location-outline" size={14} color="#dc2626" />
                            <Text className="text-xs text-red-500">Location unavailable</Text>
                        </>
                    )}
                </View>

            </ScrollView>

            <View className="p-5 border-t border-gray-100 dark:border-zinc-800">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    className={`nav-button-primary bg-red-600 py-4 rounded-2xl flex-row items-center justify-center gap-3 shadow-lg shadow-red-200 ${
                        isLoading ? 'opacity-70' : ''
                    }`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="warning" size={24} color="white" />
                             <Text className="text-white font-bold text-xl uppercase tracking-wider">
                                SEND ALERT
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
