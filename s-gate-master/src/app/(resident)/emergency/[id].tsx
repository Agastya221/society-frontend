import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmergencyResponse, getEmergencyById } from '../../../services/emergency';

export default function EmergencyDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [emergency, setEmergency] = useState<EmergencyResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadEmergency(id as string);
        }
    }, [id]);

    const loadEmergency = async (emergencyId: string) => {
        try {
            const data = await getEmergencyById(emergencyId);
            setEmergency(data);
        } catch (error) {
            console.error('Failed to load emergency details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#ef4444" />
            </SafeAreaView>
        );
    }

    if (!emergency) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-black items-center justify-center p-5">
                <Text className="text-gray-500">Emergency not found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-blue-500 font-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center gap-3 border-b border-gray-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800">
                    <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Emergency Details</Text>
            </View>

            <ScrollView className="flex-1 p-5">
                {/* Header Card */}
                <View className="bg-gray-50 dark:bg-zinc-800 p-5 rounded-2xl mb-6 border border-gray-100 dark:border-zinc-700">
                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-row items-center gap-3">
                            <View className={`h-12 w-12 rounded-full items-center justify-center ${
                                emergency.type === 'MEDICAL' ? 'bg-red-500' :
                                emergency.type === 'FIRE' ? 'bg-orange-500' :
                                'bg-gray-500'
                            }`}>
                                <Ionicons name={
                                    emergency.type === 'MEDICAL' ? 'medkit' :
                                    emergency.type === 'FIRE' ? 'flame' :
                                    'warning'
                                } size={24} color="white" />
                            </View>
                            <View>
                                <Text className="font-bold text-lg text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                                    {emergency.type.replace('_', ' ')}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                    {new Date(emergency.createdAt).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <StatusBadge status={emergency.status} />
                    </View>
                    
                    <Text className="text-gray-700 dark:text-gray-300 text-base leading-relaxed font-medium">
                        {emergency.description}
                    </Text>
                </View>

                {/* Timeline / Updates */}
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider ml-1">
                    Timeline & Response
                </Text>

                <View className="border-l-2 border-gray-100 dark:border-zinc-800 ml-4 pl-6 pb-2 space-y-8">
                    {/* Created Step */}
                    <View className="relative">
                        <View className="absolute -left-[33px] top-0 h-4 w-4 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-900" />
                        <Text className="font-bold text-gray-900 dark:text-gray-100 text-sm">Alert Raised</Text>
                        <Text className="text-xs text-gray-500 mt-1">
                            By {emergency.sender.name} ({emergency.sender.flat})
                        </Text>
                    </View>

                    {/* Response Step */}
                    {emergency.respondedBy ? (
                        <View className="relative">
                            <View className="absolute -left-[33px] top-0 h-4 w-4 rounded-full bg-yellow-500 border-2 border-white dark:border-zinc-900" />
                            <Text className="font-bold text-gray-900 dark:text-gray-100 text-sm">Responded</Text>
                            <Text className="text-xs text-gray-500 mt-1">
                                By {emergency.respondedBy.name} ({emergency.respondedBy.role})
                            </Text>
                            {emergency.responseNote && (
                                <View className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                    <Text className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">"{emergency.responseNote}"</Text>
                                </View>
                            )}
                        </View>
                    ): (
                        <View className="relative opacity-50">
                            <View className="absolute -left-[33px] top-0 h-4 w-4 rounded-full bg-gray-300 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900" />
                            <Text className="font-bold text-gray-400 text-sm">Awaiting Response...</Text>
                        </View>
                    )}

                    {/* Resolution Step */}
                    {emergency.status === 'RESOLVED' || emergency.status === 'FALSE_ALARM' ? (
                        <View className="relative">
                            <View className="absolute -left-[33px] top-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                            <Text className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                {emergency.status === 'FALSE_ALARM' ? 'Marked as False Alarm' : 'Resolved'}
                            </Text>
                            {emergency.resolvedAt && (
                                <Text className="text-xs text-gray-500 mt-1">
                                    at {new Date(emergency.resolvedAt).toLocaleTimeString()}
                                </Text>
                            )}
                            {emergency.resolutionNote && (
                                <View className="mt-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                                    <Text className="text-sm text-green-800 dark:text-green-200 font-medium">"{emergency.resolutionNote}"</Text>
                                </View>
                            )}
                        </View>
                    ) : null}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
