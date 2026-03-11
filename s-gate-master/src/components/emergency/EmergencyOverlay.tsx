import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EmergencyOverlayProps {
    onDismiss?: () => void;
}

export function EmergencyOverlay({ onDismiss }: EmergencyOverlayProps) {
    return (
        <Animated.View 
            entering={FadeIn.duration(300)} 
            exiting={FadeOut.duration(300)}
            style={[StyleSheet.absoluteFill, { zIndex: 9999, backgroundColor: '#B91C1C' }]}
        >
            <SafeAreaView className="flex-1 items-center justify-center p-8">
                <View className="bg-red-800 p-8 rounded-full border-4 border-red-400 mb-8 animate-pulse">
                    <Ionicons name="warning" size={80} color="white" />
                </View>
                
                <Text className="text-white font-extrabold text-4xl text-center mb-4 tracking-tighter shadow-lg">
                    EMERGENCY ACTIVE
                </Text>

                <View className="bg-red-900/50 p-6 rounded-2xl border border-red-400 w-full mb-8">
                     <Text className="text-white text-xl font-bold text-center mb-2">
                        Help is on the way.
                    </Text>
                     <Text className="text-red-100 text-lg text-center">
                        Security has been notified.
                    </Text>
                    <Text className="text-red-100 text-lg text-center mt-4 font-bold">
                        Please stay calm.
                    </Text>
                </View>

                <View className="flex-row items-center gap-2 opacity-80 mb-10">
                    <Ionicons name="shield-checkmark" size={24} color="#fecaca" />
                    <Text className="text-red-200 font-medium uppercase tracking-widest">Live Safety Protocol</Text>
                </View>

                {onDismiss && (
                    <TouchableOpacity 
                        onPress={onDismiss}
                        className="bg-white/20 px-6 py-3 rounded-full border border-white/30 active:bg-white/30"
                    >
                        <Text className="text-white font-bold text-sm">TEST: SOFT RESOLVE (STOPS ALERT)</Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </Animated.View>
    );
}
