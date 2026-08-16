import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { EmergencyResponse } from '../../services/emergency';

interface EmergencyBannerProps {
    emergency: EmergencyResponse;
}

export function EmergencyBanner({ emergency }: EmergencyBannerProps) {
    const router = useRouter();

    return (
        <Animated.View 
            entering={FadeIn} 
            exiting={FadeOut}
            className="absolute top-0 left-0 right-0 z-50 px-4 pt-[50px] pb-4 bg-red-600 shadow-xl"
        >
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push(`/(resident)/emergency/${emergency.id}` as any)}
                className="flex-row items-center justify-between"
            >
                <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-white/20 h-10 w-10 rounded-full items-center justify-center animate-pulse">
                        <Ionicons name="warning" size={24} color="white" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base uppercase tracking-wider">
                            Emergency Active
                        </Text>
                        <Text className="text-red-100 text-xs font-medium" numberOfLines={1}>
                            {emergency.type} • Tap for status
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
        </Animated.View>
    );
}
