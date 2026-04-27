import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createGatePass } from '../../../services/gatePass';

// Mocking FLATS locally if not exported from data/index.tsx
const FLATS = [
    { id: '1', flatNumber: '101', block: 'A', ownerName: 'Rahul Sharma' },
    { id: '2', flatNumber: '102', block: 'A', ownerName: 'Priya Verma' },
    { id: '3', flatNumber: '201', block: 'B', ownerName: 'Amit Patel' },
    { id: '4', flatNumber: '305', block: 'C', ownerName: 'Suresh Raina' },
]; 

export default function CreateApprovalRequestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    // State
    const [type, setType] = useState<'Entry' | 'Gate_Pass' | 'Special_Access'>('Entry');
    const [flatNumber, setFlatNumber] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async () => {
        // ... validation ...

        // Create new request
        try {
            await createGatePass({
                type: type as any,
                title: title.trim(),
                description: description.trim(),
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                flatId: flatNumber,
            });

            Alert.alert(
                'Request Submitted',
                'Your approval request has been submitted and is now pending review.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to submit request');
        }
    };

    return (
        <View className="flex-1">
            <LinearGradient
                colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />

            {/* Header */}
             <Animated.View 
                entering={FadeInDown.delay(100).springify()} 
                className="px-6 pb-6 flex-row items-center gap-4 z-10"
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    zIndex: 10,
                    paddingTop: insets.top + 10,
                    backgroundColor: '#f8fafc', 
                    borderBottomWidth: 1,
                    borderBottomColor: '#f1f5f9'
                }}
            >
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 items-center justify-center active:scale-95"
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#64748b" />
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-bold text-slate-900 tracking-tight">New Request</Text>
                    <Text className="text-slate-500 text-xs font-medium">Create approval for entry/move-in</Text>
                </View>
            </Animated.View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ padding: 16, paddingTop: insets.top + 80, paddingBottom: 16 + insets.bottom }}
            >
                {/* Info Banner */}
                <View className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6 flex-row gap-3">
                    <MaterialCommunityIcons name="information-outline" size={20} className="text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <View className="flex-1">
                        <Text className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                            Compliance Notice
                        </Text>
                        <Text className="text-xs text-indigo-700 dark:text-indigo-300">
                            Admin-initiated requests follow the same approval lifecycle as guard requests. 
                            This ensures proper audit trail and accountability.
                        </Text>
                    </View>
                </View>

                {/* Request Type */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Request Type <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row gap-2">
                        {(['Entry', 'Gate_Pass', 'Special_Access'] as const).map(t => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setType(t)}
                                className={`flex-1 py-3 rounded-xl border-2 ${
                                    type === t
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                }`}
                            >
                                <Text className={`text-center text-sm font-semibold ${
                                    type === t
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-zinc-600 dark:text-zinc-400'
                                }`}>
                                    {t.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Flat Selection - Simple list */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Flat Number <Text className="text-red-500">*</Text>
                    </Text>
                    <ScrollView className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-40">
                        {FLATS.map((flat) => (
                            <TouchableOpacity
                                key={flat.id}
                                onPress={() => setFlatNumber(flat.flatNumber)}
                                className={`p-3 border-b border-zinc-100 dark:border-zinc-800 ${
                                    flatNumber === flat.flatNumber ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''
                                }`}
                            >
                                <Text className={`text-sm ${
                                    flatNumber === flat.flatNumber 
                                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold' 
                                        : 'text-zinc-900 dark:text-white'
                                }`}>
                                    {flat.block}-{flat.flatNumber} ({flat.ownerName})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Title <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white"
                        placeholder="e.g., Emergency Maintenance Access"
                        placeholderTextColor="#a1a1aa"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Description */}
                <View className="mb-6">
                    <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Description / Reason <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white h-32"
                        placeholder="Provide detailed reason for this request..."
                        placeholderTextColor="#a1a1aa"
                        multiline
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Min. 20 characters
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    className="bg-indigo-600 py-4 rounded-xl items-center shadow-sm"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-base">
                        Submit Request
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-zinc-200 dark:bg-zinc-800 py-4 rounded-xl items-center mt-3"
                    activeOpacity={0.8}
                >
                    <Text className="text-zinc-700 dark:text-zinc-300 font-semibold text-base">
                        Cancel
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
