import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AppLoader } from '@/components/ui/AppLoader';
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
                <AppLoader />
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
        <View className="flex-1 bg-white" style={{ paddingTop: 0 }}>
            <View className="px-5 py-4 flex-row items-center gap-3 border-b border-gray-100 bg-white">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora-Bold' }}>Alert Details</Text>
            </View>

            <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
                {/* Header Card */}
                <View className="bg-red-50 p-6 rounded-[32px] mb-8 border border-red-100 shadow-sm shadow-red-100">
                    <View className="flex-row justify-between items-start mb-6">
                        <View className="flex-row items-center gap-4">
                            <View className={`h-14 w-14 rounded-full items-center justify-center bg-red-500 shadow-md shadow-red-200`}>
                                <Ionicons name={
                                    emergency.type === 'MEDICAL' ? 'medkit' :
                                    emergency.type === 'FIRE' ? 'flame' :
                                    'warning'
                                } size={28} color="white" />
                            </View>
                            <View>
                                <Text className="font-bold text-xl text-red-900 uppercase tracking-tight" style={{ fontFamily: 'Sora-Bold' }}>
                                    {emergency.type.replace('_', ' ')}
                                </Text>
                                <Text className="text-[12px] font-bold text-red-600/60 uppercase tracking-widest mt-0.5">
                                    Type of Alert
                                </Text>
                            </View>
                        </View>
                    </View>
                    
                    <View className="bg-white/60 p-4 rounded-2xl border border-white/80">
                      <Text className="text-red-900 text-[15px] leading-6 font-medium">
                          {emergency.description || 'Instantly reported to gate security and emergency response teams.'}
                      </Text>
                    </View>
                </View>

                {/* Timeline / Updates */}
                <Text className="text-[12px] font-bold text-gray-400 mb-6 uppercase tracking-[3px] ml-1">
                    Alert Timeline
                </Text>

                <View className="ml-2 pl-8 pb-10 border-l border-gray-100 space-y-10">
                    {/* Created Step */}
                    <View className="relative">
                        <View className="absolute -left-[37px] top-1 h-4 w-4 rounded-full bg-red-500 border-4 border-white shadow-sm" />
                        <View className="flex-row justify-between items-center">
                          <Text className="font-bold text-gray-900 text-[16px]" style={{ fontFamily: 'Sora-Bold' }}>Alert Raised</Text>
                          <Text className="text-[11px] font-bold text-gray-400">{new Date(emergency.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <Text className="text-xs text-gray-500 mt-1 font-medium">
                            Sent from flat {emergency.sender.flat}
                        </Text>
                    </View>

                    {/* Response Step */}
                    {emergency.respondedBy ? (
                        <View className="relative">
                            <View className="absolute -left-[37px] top-1 h-4 w-4 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
                            <View className="flex-row justify-between items-center">
                              <Text className="font-bold text-gray-900 text-[16px]" style={{ fontFamily: 'Sora-Bold' }}>Security Acknowledged</Text>
                              <Text className="text-[11px] font-bold text-gray-400">Response Active</Text>
                            </View>
                            <Text className="text-xs text-gray-500 mt-1 font-medium">
                                Assigned to {emergency.respondedBy.name} ({emergency.respondedBy.role})
                            </Text>
                            {emergency.responseNote && (
                                <View className="mt-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <Text className="text-[13px] text-blue-800 font-bold">“{emergency.responseNote}”</Text>
                                </View>
                            )}
                        </View>
                    ): (
                        <View className="relative opacity-40">
                            <View className="absolute -left-[37px] top-1 h-4 w-4 rounded-full bg-gray-200 border-4 border-white shadow-sm" />
                            <Text className="font-bold text-gray-400 text-[16px]" style={{ fontFamily: 'Sora-Bold' }}>Awaiting Security...</Text>
                        </View>
                    )}

                    {/* Resolution Step */}
                    {(emergency.status === 'RESOLVED' || emergency.status === 'FALSE_ALARM') ? (
                        <View className="relative">
                            <View className={`absolute -left-[37px] top-1 h-4 w-4 rounded-full ${emergency.status === 'FALSE_ALARM' ? 'bg-orange-500' : 'bg-emerald-500'} border-4 border-white shadow-sm`} />
                            <View className="flex-row justify-between items-center">
                              <Text className="font-bold text-gray-900 text-[16px]" style={{ fontFamily: 'Sora-Bold' }}>
                                  {emergency.status === 'FALSE_ALARM' ? 'Closed (False Alarm)' : 'Resolved'}
                              </Text>
                              {emergency.resolvedAt && (
                                <Text className="text-[11px] font-bold text-gray-400">{new Date(emergency.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                              )}
                            </View>
                            {emergency.resolutionNote && (
                                <View className={`mt-3 p-4 rounded-2xl border ${emergency.status === 'FALSE_ALARM' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <Text className={`text-[13px] font-bold ${emergency.status === 'FALSE_ALARM' ? 'text-orange-800' : 'text-emerald-800'}`}>“{emergency.resolutionNote}”</Text>
                                </View>
                            )}
                        </View>
                    ) : null}
                </View>

            </ScrollView>
        </View>
    );
}
